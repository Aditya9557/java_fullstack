"""
services/state_machine.py - Ticket State Machine and Transition Manager.

Enforces valid ticket lifecycles, persists transition audit history,
and dispatches notifications.
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from database import get_connection, execute_db

# Valid State Transition Graph
ALLOWED_TRANSITIONS = {
    "NEW": ["CLASSIFYING", "CLASSIFIED", "ROUTED", "REJECTED"],
    "CLASSIFYING": ["CLASSIFIED", "ROUTED", "REJECTED"],
    "CLASSIFIED": ["ROUTED", "ASSIGNED", "REJECTED"],
    "ROUTED": ["ASSIGNED", "IN_PROGRESS", "RESOLVED", "ESCALATED", "REJECTED"],
    "ASSIGNED": ["IN_PROGRESS", "WAITING_FOR_STUDENT", "RESOLVED", "ESCALATED", "REJECTED"],
    "IN_PROGRESS": ["WAITING_FOR_STUDENT", "WAITING_FOR_DEPARTMENT", "RESOLVED", "ESCALATED", "REJECTED"],
    "WAITING_FOR_STUDENT": ["IN_PROGRESS", "WAITING_FOR_DEPARTMENT", "RESOLVED", "CLOSED"],
    "WAITING_FOR_DEPARTMENT": ["IN_PROGRESS", "WAITING_FOR_STUDENT", "RESOLVED", "ESCALATED"],
    "RESOLVED": ["CLOSED", "REOPENED"],
    "CLOSED": ["REOPENED"],
    "ESCALATED": ["ASSIGNED", "IN_PROGRESS", "RESOLVED"],
    "REJECTED": ["REOPENED"],
    "REOPENED": ["ROUTED", "ASSIGNED", "IN_PROGRESS"]
}

class StateMachineError(Exception):
    """Raised when an invalid state transition is attempted."""
    pass

class TicketStateMachine:
    """Manages ticket states and transition auditing."""

    @staticmethod
    def transition(
        ticket_id: str,
        to_state: str,
        actor_id: Optional[str] = None,
        actor_name: str = "System",
        actor_role: str = "SYSTEM",
        note: str = ""
    ) -> Tuple[bool, str]:
        """
        Execute a state transition for a ticket.
        
        Args:
            ticket_id: The ticket ID.
            to_state: Target state (must be in VALID_STATES).
            actor_id: User ID who triggered transition.
            actor_name: Display name of actor.
            actor_role: Role of actor (STUDENT, DEPARTMENT_OFFICER, etc.).
            note: Explanation or audit note for transition.
            
        Returns:
            (success: bool, message: str)
        """
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT id, status, student_id, assigned_to, department_id, ticket_number FROM tickets WHERE id = ?", (ticket_id,))
            ticket = cur.fetchone()

            if not ticket:
                return False, f"Ticket '{ticket_id}' not found."

            from_state = ticket["status"]

            # Same state is a no-op
            if from_state == to_state:
                return True, f"Ticket is already in state {to_state}."

            # Verify allowed transition
            allowed = ALLOWED_TRANSITIONS.get(from_state, [])
            # Admin can override any state transition if needed
            if actor_role != "SUPER_ADMIN" and to_state not in allowed:
                return False, f"Invalid state transition from '{from_state}' to '{to_state}'. Allowed: {allowed}"

            now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

            # Update ticket state and timestamps
            if to_state == "RESOLVED":
                cur.execute("""
                    UPDATE tickets
                    SET status = ?, updated_at = ?, resolved_at = ?
                    WHERE id = ?
                """, (to_state, now, now, ticket_id))
            elif to_state == "CLOSED":
                cur.execute("""
                    UPDATE tickets
                    SET status = ?, updated_at = ?, closed_at = ?
                    WHERE id = ?
                """, (to_state, now, now, ticket_id))
            else:
                cur.execute("""
                    UPDATE tickets
                    SET status = ?, updated_at = ?
                    WHERE id = ?
                """, (to_state, now, ticket_id))

            # Record in Ticket History Audit Log
            cur.execute("""
                INSERT INTO ticket_history (ticket_id, from_state, to_state, actor_id, actor_name, actor_role, note, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (ticket_id, from_state, to_state, actor_id, actor_name, actor_role, note, now))

            conn.commit()

            # Trigger Notification
            from services.notification_service import notification_service
            notification_service.notify_state_change(
                ticket_id=ticket_id,
                ticket_number=ticket["ticket_number"],
                student_id=ticket["student_id"],
                assigned_to=ticket["assigned_to"],
                from_state=from_state,
                to_state=to_state,
                actor_name=actor_name,
                note=note
            )

            return True, f"Status transitioned from {from_state} to {to_state}."
        finally:
            conn.close()


ticket_state_machine = TicketStateMachine()

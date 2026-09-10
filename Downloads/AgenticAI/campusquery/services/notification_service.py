"""
services/notification_service.py - In-App Notification System.

Creates contextual notifications for students, officers, and administrators.
"""
from typing import Optional
from database import execute_db, get_connection

class NotificationService:
    """Service to record and dispatch user notifications."""

    def create_notification(
        self,
        user_id: str,
        ticket_id: Optional[str],
        title: str,
        message: str,
        notif_type: str = "info"
    ) -> int:
        """Insert a notification into the DB."""
        return execute_db("""
            INSERT INTO notifications (user_id, ticket_id, title, message, type, is_read)
            VALUES (?, ?, ?, ?, ?, 0)
        """, (user_id, ticket_id, title, message, notif_type))

    def notify_ticket_created(self, ticket_id: str, ticket_number: str, student_id: str, dept_name: str):
        """Notify student that ticket has been registered and routed."""
        self.create_notification(
            user_id=student_id,
            ticket_id=ticket_id,
            title="Query Submitted & Routed",
            message=f"Ticket #{ticket_number} has been routed to {dept_name}.",
            notif_type="success"
        )

    def notify_assigned(self, ticket_id: str, ticket_number: str, officer_id: str, student_id: str, officer_name: str):
        """Notify officer and student of assignment."""
        if officer_id:
            self.create_notification(
                user_id=officer_id,
                ticket_id=ticket_id,
                title="New Ticket Assigned",
                message=f"You have been assigned Ticket #{ticket_number}.",
                notif_type="info"
            )
        if student_id:
            self.create_notification(
                user_id=student_id,
                ticket_id=ticket_id,
                title="Officer Assigned",
                message=f"Officer {officer_name} is now reviewing Ticket #{ticket_number}.",
                notif_type="info"
            )

    def notify_message(self, ticket_id: str, ticket_number: str, recipient_id: str, sender_name: str, preview: str):
        """Notify recipient of a new reply in conversation."""
        snippet = preview[:80] + ("..." if len(preview) > 80 else "")
        self.create_notification(
            user_id=recipient_id,
            ticket_id=ticket_id,
            title=f"New Message on #{ticket_number}",
            message=f"{sender_name}: \"{snippet}\"",
            notif_type="info"
        )

    def notify_state_change(
        self,
        ticket_id: str,
        ticket_number: str,
        student_id: str,
        assigned_to: Optional[str],
        from_state: str,
        to_state: str,
        actor_name: str,
        note: str = ""
    ):
        """Dispatch notifications based on specific state milestones."""
        if to_state == "RESOLVED":
            self.create_notification(
                user_id=student_id,
                ticket_id=ticket_id,
                title=f"Ticket #{ticket_number} Resolved",
                message=f"{actor_name} marked your query as resolved. Please review and confirm closure.",
                notif_type="success"
            )
        elif to_state == "WAITING_FOR_STUDENT":
            self.create_notification(
                user_id=student_id,
                ticket_id=ticket_id,
                title=f"Action Required on #{ticket_number}",
                message=f"The department requested more information: {note or 'Please check query discussion.'}",
                notif_type="warning"
            )
        elif to_state == "CLOSED":
            self.create_notification(
                user_id=student_id,
                ticket_id=ticket_id,
                title=f"Ticket #{ticket_number} Closed",
                message="Thank you! Your query has been successfully closed.",
                notif_type="info"
            )
        elif to_state == "ESCALATED":
            if assigned_to:
                self.create_notification(
                    user_id=assigned_to,
                    ticket_id=ticket_id,
                    title=f"Ticket #{ticket_number} Escalated",
                    message=f"Attention: Query was escalated by {actor_name}. Reason: {note}",
                    notif_type="alert"
                )


notification_service = NotificationService()

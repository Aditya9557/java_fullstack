"""
app.py - Main Flask Application and REST API for CampusQuery.

AI-Powered College Query Management & Routing System.
"""
from __future__ import annotations
import os
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from flask import Flask, request, jsonify, render_template, send_from_directory

import config
from database import init_db, query_db, execute_db, get_connection
from services.ai_classifier import ai_classifier
from services.routing_engine import routing_engine
from services.state_machine import ticket_state_machine
from services.notification_service import notification_service

app = Flask(
    __name__,
    template_folder=str(Path(__file__).resolve().parent / "templates"),
    static_folder=str(Path(__file__).resolve().parent / "static")
)
app.secret_key = config.SECRET_KEY

# Ensure database is ready
init_db()

# Global session cache for currently active user persona in demo
_CURRENT_USER_ID = "user-stu-1"  # Default to student Aditya Chaubey

def get_current_user():
    """Retrieve the currently active session user."""
    global _CURRENT_USER_ID
    user = query_db("SELECT * FROM users WHERE id = ?", (_CURRENT_USER_ID,), one=True)
    if not user:
        user = query_db("SELECT * FROM users LIMIT 1", one=True)
        if user:
            _CURRENT_USER_ID = user["id"]
    return user


# =====================================================================
# HTML Single-Page Application Entry Point
# =====================================================================

@app.route("/")
def index():
    """Render main application layout."""
    return render_template("index.html")


# =====================================================================
# Auth & User Switching APIs
# =====================================================================

@app.route("/api/auth/current-user", methods=["GET"])
def api_current_user():
    """Return active user profile and role."""
    user = get_current_user()
    return jsonify({"success": True, "user": user})

@app.route("/api/auth/users", methods=["GET"])
def api_list_users():
    """Return list of available demo personas for easy switching."""
    users = query_db("""
        SELECT u.*, d.name as department_name 
        FROM users u 
        LEFT JOIN departments d ON u.department_id = d.id 
        ORDER BY 
            CASE u.role 
                WHEN 'STUDENT' THEN 1 
                WHEN 'DEPARTMENT_OFFICER' THEN 2 
                WHEN 'DEPARTMENT_ADMIN' THEN 3 
                ELSE 4 
            END, u.name
    """)
    return jsonify({"success": True, "users": users})

@app.route("/api/auth/switch-role", methods=["POST"])
def api_switch_role():
    """Switch active demo persona by user_id or role."""
    global _CURRENT_USER_ID
    data = request.get_json() or {}
    user_id = data.get("user_id")
    role = data.get("role")

    if user_id:
        user = query_db("SELECT * FROM users WHERE id = ?", (user_id,), one=True)
    elif role:
        user = query_db("SELECT * FROM users WHERE role = ? LIMIT 1", (role,), one=True)
    else:
        return jsonify({"success": False, "error": "Provide user_id or role"}), 400

    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404

    _CURRENT_USER_ID = user["id"]
    return jsonify({"success": True, "user": user, "message": f"Switched to {user['name']} ({user['role']})"})


# =====================================================================
# Metadata APIs (Departments, Categories, Subcategories)
# =====================================================================

@app.route("/api/metadata", methods=["GET"])
def api_metadata():
    """Return all system categories, subcategories, departments, and routing rules."""
    departments = query_db("SELECT * FROM departments ORDER BY name")
    categories = query_db("SELECT * FROM categories ORDER BY name")
    subcategories = query_db("""
        SELECT s.*, c.name as category_name 
        FROM subcategories s 
        JOIN categories c ON s.category_id = c.id 
        ORDER BY c.name, s.name
    """)
    routing_rules = query_db("""
        SELECT r.*, c.name as category_name, s.name as subcategory_name, d.name as department_name, d.code as dept_code
        FROM routing_rules r
        JOIN categories c ON r.category_id = c.id
        LEFT JOIN subcategories s ON r.subcategory_id = s.id
        JOIN departments d ON r.department_id = d.id
        ORDER BY c.name, s.name
    """)
    settings = {row["key"]: row["value"] for row in query_db("SELECT key, value FROM system_settings")}

    return jsonify({
        "success": True,
        "departments": departments,
        "categories": categories,
        "subcategories": subcategories,
        "routing_rules": routing_rules,
        "settings": settings,
        "valid_states": config.VALID_STATES,
        "valid_priorities": config.VALID_PRIORITIES
    })


# =====================================================================
# AI Classification & Query Routing Preview API
# =====================================================================

@app.route("/api/tickets/preview-ai", methods=["POST"])
def api_preview_ai():
    """
    Simulates the AI Classification and Routing pipeline for a draft query text
    without creating a ticket yet.
    """
    data = request.get_json() or {}
    query_text = (data.get("query") or "").strip()

    if not query_text:
        return jsonify({"success": False, "error": "Query text cannot be empty"}), 400

    # 1. Run AI Classification Service
    ai_result = ai_classifier.classify_query(query_text)

    # 2. Run Dynamic Routing Engine
    route_result = routing_engine.route_query(
        category_name=ai_result.get("category", "General"),
        subcategory_name=ai_result.get("subcategory", "General Inquiry"),
        suggested_priority=ai_result.get("priority", "MEDIUM")
    )

    # 3. Determine recommended action based on confidence thresholds
    auto_thresh = float(query_db("SELECT value FROM system_settings WHERE key = 'auto_route_threshold'", one=True)["value"] or 0.85)
    conf_thresh = float(query_db("SELECT value FROM system_settings WHERE key = 'confirmation_threshold'", one=True)["value"] or 0.60)

    confidence = ai_result.get("confidence", 0.0)

    if confidence >= auto_thresh:
        action = "AUTO_ROUTE"
        action_label = "High Confidence (Automatic Routing)"
    elif confidence >= conf_thresh:
        action = "CONFIRMATION_REQUIRED"
        action_label = "Moderate Confidence (Student Confirmation Recommended)"
    else:
        action = "MANUAL_REVIEW"
        action_label = "Low Confidence / Ambiguous (Clarification or Manual Review Queue)"

    return jsonify({
        "success": True,
        "ai_result": ai_result,
        "routing_result": route_result,
        "action": action,
        "action_label": action_label,
        "confidence": confidence,
        "auto_threshold": auto_thresh,
        "confirmation_threshold": conf_thresh
    })


# =====================================================================
# Tickets Core APIs
# =====================================================================

@app.route("/api/tickets", methods=["GET"])
def api_list_tickets():
    """List tickets filtered by student, department, status, priority, or search."""
    user = get_current_user()
    student_id = request.args.get("student_id")
    department_id = request.args.get("department_id")
    status = request.args.get("status")
    priority = request.args.get("priority")
    category_id = request.args.get("category_id")
    search = request.args.get("search", "").strip()

    query = """
        SELECT 
            t.*,
            c.name as category_name,
            c.icon as category_icon,
            s.name as subcategory_name,
            d.name as department_name,
            d.code as department_code,
            u.name as student_name,
            u.email as student_email,
            u.student_id_number,
            o.name as officer_name,
            (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) as message_count
        FROM tickets t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN subcategories s ON t.subcategory_id = s.id
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN users u ON t.student_id = u.id
        LEFT JOIN users o ON t.assigned_to = o.id
        WHERE 1=1
    """
    args = []

    # Enforce departmental scoping for department officers if not explicitly querying all
    if user["role"] == "DEPARTMENT_OFFICER" and not department_id:
        query += " AND t.department_id = ?"
        args.append(user["department_id"])
    elif student_id:
        query += " AND t.student_id = ?"
        args.append(student_id)
    elif user["role"] == "STUDENT" and not student_id:
        query += " AND t.student_id = ?"
        args.append(user["id"])

    if department_id:
        query += " AND t.department_id = ?"
        args.append(department_id)
    if status:
        query += " AND t.status = ?"
        args.append(status)
    if priority:
        query += " AND t.priority = ?"
        args.append(priority)
    if category_id:
        query += " AND t.category_id = ?"
        args.append(category_id)
    if search:
        query += " AND (t.ticket_number LIKE ? OR t.title LIKE ? OR t.description LIKE ?)"
        term = f"%{search}%"
        args.extend([term, term, term])

    query += " ORDER BY t.created_at DESC"
    tickets = query_db(query, args)
    return jsonify({"success": True, "tickets": tickets, "count": len(tickets)})


@app.route("/api/tickets", methods=["POST"])
def api_create_ticket():
    """
    Create a new student query ticket through the full state machine pipeline.
    """
    user = get_current_user()
    data = request.get_json() or {}

    title = data.get("title", "").strip()
    description = data.get("description", "").strip()

    if not description:
        return jsonify({"success": False, "error": "Description cannot be empty."}), 400

    if not title:
        title = description[:60] + ("..." if len(description) > 60 else "")

    student_id = data.get("student_id") or user["id"]

    # 1. Run AI Classification if not provided
    ai_confidence = float(data.get("ai_confidence", 0.0))
    ai_reasoning = data.get("ai_reasoning", "")
    category_id = data.get("category_id")
    subcategory_id = data.get("subcategory_id")
    department_id = data.get("department_id")
    priority = (data.get("priority") or "MEDIUM").upper()

    if not category_id or not department_id:
        ai_res = ai_classifier.classify_query(description)
        route_res = routing_engine.route_query(
            category_name=ai_res.get("category", "General"),
            subcategory_name=ai_res.get("subcategory", "General Inquiry"),
            suggested_priority=ai_res.get("priority", "MEDIUM")
        )
        category_id = category_id or route_res.get("category_id")
        subcategory_id = subcategory_id or route_res.get("subcategory_id")
        department_id = department_id or route_res.get("department_id")
        priority = priority or route_res.get("priority", "MEDIUM")
        ai_confidence = ai_res.get("confidence", 0.90)
        ai_reasoning = ai_res.get("reason", "Classified by CampusQuery AI.")

    # 2. Generate unique Ticket Number
    count_row = query_db("SELECT COUNT(*) as count FROM tickets", one=True)
    next_num = (count_row["count"] or 0) + 1025
    ticket_number = f"CQ-{next_num}"
    ticket_id = f"t-{uuid.uuid4().hex[:8]}"

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    # 3. Insert Initial Ticket in NEW state
    execute_db("""
        INSERT INTO tickets (
            id, ticket_number, student_id, title, description,
            category_id, subcategory_id, department_id,
            priority, status, ai_confidence, ai_reasoning,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?, ?, ?)
    """, (
        ticket_id, ticket_number, student_id, title, description,
        category_id, subcategory_id, department_id,
        priority, ai_confidence, ai_reasoning, now, now
    ))

    # 4. Record in AI Classifications Audit Table
    execute_db("""
        INSERT INTO ai_classifications (
            ticket_id, raw_prompt, predicted_category, predicted_subcategory,
            predicted_priority, predicted_department, confidence, reasoning, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        ticket_id, description, str(category_id), str(subcategory_id),
        priority, str(department_id), ai_confidence, ai_reasoning, now
    ))

    # 5. Execute state machine pipeline: NEW -> CLASSIFIED -> ROUTED
    ticket_state_machine.transition(
        ticket_id=ticket_id,
        to_state="CLASSIFIED",
        actor_id=None,
        actor_name="AI Classifier",
        actor_role="SYSTEM",
        note=f"AI classified query with {int(ai_confidence * 100)}% confidence."
    )

    dept_row = query_db("SELECT name FROM departments WHERE id = ?", (department_id,), one=True)
    dept_name = dept_row["name"] if dept_row else "Target Department"

    ticket_state_machine.transition(
        ticket_id=ticket_id,
        to_state="ROUTED",
        actor_id=None,
        actor_name="Routing Engine",
        actor_role="SYSTEM",
        note=f"Automatically routed to {dept_name} based on active routing rule."
    )

    # 6. Add initial student message if attachments provided
    attachment = data.get("attachment_name")
    if attachment:
        execute_db("""
            INSERT INTO ticket_messages (
                ticket_id, sender_id, sender_role, message_text, is_internal, attachment_name, created_at
            ) VALUES (?, ?, 'STUDENT', 'Attached supporting document.', 0, ?, ?)
        """, (ticket_id, student_id, attachment, now))

    # 7. Notify Student
    notification_service.notify_ticket_created(
        ticket_id=ticket_id,
        ticket_number=ticket_number,
        student_id=student_id,
        dept_name=dept_name
    )

    created_ticket = query_db("SELECT * FROM tickets WHERE id = ?", (ticket_id,), one=True)
    return jsonify({
        "success": True,
        "ticket": created_ticket,
        "ticket_number": ticket_number,
        "message": f"Ticket #{ticket_number} created and routed successfully."
    }), 201


@app.route("/api/tickets/<ticket_id>", methods=["GET"])
def api_get_ticket(ticket_id: str):
    """Retrieve full ticket details, messages, audit timeline, and AI record."""
    ticket = query_db("""
        SELECT 
            t.*,
            c.name as category_name,
            c.icon as category_icon,
            s.name as subcategory_name,
            d.name as department_name,
            d.code as department_code,
            d.email as department_email,
            d.sla_hours,
            u.name as student_name,
            u.email as student_email,
            u.student_id_number,
            u.phone as student_phone,
            o.name as officer_name,
            o.email as officer_email
        FROM tickets t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN subcategories s ON t.subcategory_id = s.id
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN users u ON t.student_id = u.id
        LEFT JOIN users o ON t.assigned_to = o.id
        WHERE t.id = ?
    """, (ticket_id,), one=True)

    if not ticket:
        return jsonify({"success": False, "error": "Ticket not found."}), 404

    user = get_current_user()

    # Filter messages: internal notes only visible to staff/admins
    msg_query = """
        SELECT m.*, u.name as sender_name, u.role as sender_user_role, u.avatar as sender_avatar
        FROM ticket_messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.ticket_id = ?
    """
    if user["role"] == "STUDENT":
        msg_query += " AND m.is_internal = 0"
    msg_query += " ORDER BY m.created_at ASC"

    messages = query_db(msg_query, (ticket_id,))

    # History audit trail
    history = query_db("""
        SELECT * FROM ticket_history
        WHERE ticket_id = ?
        ORDER BY created_at ASC
    """, (ticket_id,))

    # AI Classification audit record
    ai_audit = query_db("""
        SELECT a.*, u.name as override_actor_name
        FROM ai_classifications a
        LEFT JOIN users u ON a.override_actor_id = u.id
        WHERE a.ticket_id = ?
        ORDER BY a.created_at DESC LIMIT 1
    """, (ticket_id,), one=True)

    return jsonify({
        "success": True,
        "ticket": ticket,
        "messages": messages,
        "history": history,
        "ai_audit": ai_audit
    })


# =====================================================================
# Ticket Action APIs (Messages, Assignment, State Transitions)
# =====================================================================

@app.route("/api/tickets/<ticket_id>/messages", methods=["POST"])
def api_add_message(ticket_id: str):
    """Add a message or internal note to a ticket thread."""
    user = get_current_user()
    data = request.get_json() or {}
    message_text = (data.get("message") or "").strip()
    is_internal = 1 if data.get("is_internal") and user["role"] != "STUDENT" else 0
    attachment_name = data.get("attachment_name")

    if not message_text and not attachment_name:
        return jsonify({"success": False, "error": "Message cannot be empty."}), 400

    ticket = query_db("SELECT * FROM tickets WHERE id = ?", (ticket_id,), one=True)
    if not ticket:
        return jsonify({"success": False, "error": "Ticket not found."}), 404

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    execute_db("""
        INSERT INTO ticket_messages (
            ticket_id, sender_id, sender_role, message_text, is_internal, attachment_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (ticket_id, user["id"], user["role"], message_text, is_internal, attachment_name, now))

    # Automatic state change if student responds while waiting
    if user["role"] == "STUDENT" and ticket["status"] == "WAITING_FOR_STUDENT":
        ticket_state_machine.transition(
            ticket_id=ticket_id,
            to_state="IN_PROGRESS",
            actor_id=user["id"],
            actor_name=user["name"],
            actor_role=user["role"],
            note="Student provided requested information."
        )

    # Notify recipient
    if not is_internal:
        recipient_id = ticket["assigned_to"] if user["role"] == "STUDENT" else ticket["student_id"]
        if recipient_id:
            notification_service.notify_message(
                ticket_id=ticket_id,
                ticket_number=ticket["ticket_number"],
                recipient_id=recipient_id,
                sender_name=user["name"],
                preview=message_text
            )

    return jsonify({"success": True, "message": "Message posted successfully."})


@app.route("/api/tickets/<ticket_id>/assign", methods=["POST"])
def api_assign_ticket(ticket_id: str):
    """Assign ticket to an officer."""
    user = get_current_user()
    data = request.get_json() or {}
    officer_id = data.get("officer_id") or user["id"]

    officer = query_db("SELECT * FROM users WHERE id = ?", (officer_id,), one=True)
    if not officer:
        return jsonify({"success": False, "error": "Officer not found."}), 404

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    execute_db("UPDATE tickets SET assigned_to = ?, updated_at = ? WHERE id = ?", (officer_id, now, ticket_id))

    ticket = query_db("SELECT * FROM tickets WHERE id = ?", (ticket_id,), one=True)

    # Move to ASSIGNED or IN_PROGRESS
    target_state = "ASSIGNED" if ticket["status"] in ["NEW", "ROUTED"] else ticket["status"]
    ticket_state_machine.transition(
        ticket_id=ticket_id,
        to_state=target_state,
        actor_id=user["id"],
        actor_name=user["name"],
        actor_role=user["role"],
        note=f"Assigned to {officer['name']}."
    )

    notification_service.notify_assigned(
        ticket_id=ticket_id,
        ticket_number=ticket["ticket_number"],
        officer_id=officer_id,
        student_id=ticket["student_id"],
        officer_name=officer["name"]
    )

    return jsonify({"success": True, "message": f"Assigned to {officer['name']}."})


@app.route("/api/tickets/<ticket_id>/status", methods=["POST"])
def api_update_status(ticket_id: str):
    """Update ticket state with note (e.g. IN_PROGRESS, WAITING_FOR_STUDENT, RESOLVED, REJECTED)."""
    user = get_current_user()
    data = request.get_json() or {}
    to_state = data.get("status")
    note = data.get("note", "")

    if not to_state:
        return jsonify({"success": False, "error": "Target status required."}), 400

    success, msg = ticket_state_machine.transition(
        ticket_id=ticket_id,
        to_state=to_state,
        actor_id=user["id"],
        actor_name=user["name"],
        actor_role=user["role"],
        note=note
    )

    if not success:
        return jsonify({"success": False, "error": msg}), 400

    # If resolving, record resolution notes
    if to_state == "RESOLVED":
        execute_db("UPDATE tickets SET resolution_notes = ? WHERE id = ?", (note, ticket_id))
    elif to_state == "REJECTED":
        execute_db("UPDATE tickets SET rejection_reason = ? WHERE id = ?", (note, ticket_id))

    return jsonify({"success": True, "message": msg})


@app.route("/api/tickets/<ticket_id>/confirm-resolution", methods=["POST"])
def api_confirm_resolution(ticket_id: str):
    """Student confirms resolution, moving state to CLOSED."""
    user = get_current_user()
    data = request.get_json() or {}
    feedback = data.get("feedback", "Student confirmed satisfaction.")

    ticket = query_db("SELECT * FROM tickets WHERE id = ?", (ticket_id,), one=True)
    if not ticket:
        return jsonify({"success": False, "error": "Ticket not found."}), 404

    execute_db("UPDATE tickets SET student_feedback = ? WHERE id = ?", (feedback, ticket_id))

    success, msg = ticket_state_machine.transition(
        ticket_id=ticket_id,
        to_state="CLOSED",
        actor_id=user["id"],
        actor_name=user["name"],
        actor_role=user["role"],
        note=f"Resolution confirmed by student. Feedback: {feedback}"
    )

    if not success:
        return jsonify({"success": False, "error": msg}), 400

    return jsonify({"success": True, "message": "Ticket closed successfully."})


@app.route("/api/tickets/<ticket_id>/reopen", methods=["POST"])
def api_reopen_ticket(ticket_id: str):
    """Reopen a recently resolved or closed ticket."""
    user = get_current_user()
    data = request.get_json() or {}
    reason = data.get("reason", "Student reported issue still persists.")

    success, msg = ticket_state_machine.transition(
        ticket_id=ticket_id,
        to_state="REOPENED",
        actor_id=user["id"],
        actor_name=user["name"],
        actor_role=user["role"],
        note=f"Reopened: {reason}"
    )

    if not success:
        return jsonify({"success": False, "error": msg}), 400

    # Auto transition to IN_PROGRESS
    ticket_state_machine.transition(
        ticket_id=ticket_id,
        to_state="IN_PROGRESS",
        actor_id=user["id"],
        actor_name="System",
        actor_role="SYSTEM",
        note="Ticket marked in progress upon reopening."
    )

    return jsonify({"success": True, "message": "Ticket reopened."})


@app.route("/api/tickets/<ticket_id>/escalate", methods=["POST"])
def api_escalate_ticket(ticket_id: str):
    """Escalate ticket to Department Head or Dean."""
    user = get_current_user()
    data = request.get_json() or {}
    reason = data.get("reason", "Escalated for immediate senior intervention.")

    success, msg = ticket_state_machine.transition(
        ticket_id=ticket_id,
        to_state="ESCALATED",
        actor_id=user["id"],
        actor_name=user["name"],
        actor_role=user["role"],
        note=f"Escalated: {reason}"
    )

    if not success:
        return jsonify({"success": False, "error": msg}), 400

    # Set priority to HIGH
    execute_db("UPDATE tickets SET priority = 'HIGH' WHERE id = ?", (ticket_id,))

    return jsonify({"success": True, "message": "Ticket escalated successfully."})


@app.route("/api/tickets/<ticket_id>/override", methods=["POST"])
def api_override_classification(ticket_id: str):
    """Human override of AI classification and routing."""
    user = get_current_user()
    data = request.get_json() or {}

    new_cat_id = data.get("category_id")
    new_sub_id = data.get("subcategory_id")
    new_dept_id = data.get("department_id")
    new_priority = data.get("priority")
    reason = data.get("reason", "Manual correction by staff.")

    ticket = query_db("SELECT * FROM tickets WHERE id = ?", (ticket_id,), one=True)
    if not ticket:
        return jsonify({"success": False, "error": "Ticket not found."}), 404

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    # Update ticket
    execute_db("""
        UPDATE tickets
        SET category_id = ?, subcategory_id = ?, department_id = ?, priority = ?, updated_at = ?
        WHERE id = ?
    """, (new_cat_id, new_sub_id, new_dept_id, new_priority, now, ticket_id))

    # Audit override in ai_classifications
    execute_db("""
        UPDATE ai_classifications
        SET was_overridden = 1, final_category = ?, final_subcategory = ?,
            override_actor_id = ?, override_reason = ?
        WHERE ticket_id = ?
    """, (str(new_cat_id), str(new_sub_id), user["id"], reason, ticket_id))

    # Record in history
    execute_db("""
        INSERT INTO ticket_history (ticket_id, from_state, to_state, actor_id, actor_name, actor_role, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (ticket_id, ticket["status"], ticket["status"], user["id"], user["name"], user["role"], f"Classification overridden: {reason}", now))

    return jsonify({"success": True, "message": "Classification override saved."})


# =====================================================================
# Super Admin & Analytics APIs
# =====================================================================

@app.route("/api/admin/analytics", methods=["GET"])
def api_admin_analytics():
    """Return high-level institutional analytics and chart data."""
    # 1. KPI Counts
    total_tickets = query_db("SELECT COUNT(*) as c FROM tickets", one=True)["c"]
    open_tickets = query_db("SELECT COUNT(*) as c FROM tickets WHERE status IN ('NEW', 'ROUTED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_STUDENT', 'WAITING_FOR_DEPARTMENT')", one=True)["c"]
    resolved_tickets = query_db("SELECT COUNT(*) as c FROM tickets WHERE status IN ('RESOLVED', 'CLOSED')", one=True)["c"]
    escalated_tickets = query_db("SELECT COUNT(*) as c FROM tickets WHERE status = 'ESCALATED'", one=True)["c"]
    high_priority = query_db("SELECT COUNT(*) as c FROM tickets WHERE priority = 'HIGH'", one=True)["c"]

    # 2. AI Metrics
    total_ai = query_db("SELECT COUNT(*) as c FROM ai_classifications", one=True)["c"] or 1
    overridden_ai = query_db("SELECT COUNT(*) as c FROM ai_classifications WHERE was_overridden = 1", one=True)["c"]
    ai_accuracy = round(((total_ai - overridden_ai) / total_ai) * 100, 1)

    # 3. Category Breakdown
    cat_stats = query_db("""
        SELECT c.name, COUNT(t.id) as count 
        FROM categories c 
        LEFT JOIN tickets t ON t.category_id = c.id 
        GROUP BY c.id, c.name
        ORDER BY count DESC
    """)

    # 4. Department Breakdown
    dept_stats = query_db("""
        SELECT d.name, d.code, COUNT(t.id) as count 
        FROM departments d 
        LEFT JOIN tickets t ON t.department_id = d.id 
        GROUP BY d.id, d.name, d.code
        ORDER BY count DESC
    """)

    # 5. Priority Distribution
    prio_stats = query_db("""
        SELECT priority, COUNT(id) as count 
        FROM tickets 
        GROUP BY priority
    """)

    # 6. Status Distribution
    status_stats = query_db("""
        SELECT status, COUNT(id) as count 
        FROM tickets 
        GROUP BY status
    """)

    return jsonify({
        "success": True,
        "kpis": {
            "total_tickets": total_tickets,
            "open_tickets": open_tickets,
            "resolved_tickets": resolved_tickets,
            "escalated_tickets": escalated_tickets,
            "high_priority": high_priority,
            "ai_accuracy": ai_accuracy,
            "resolution_rate": round((resolved_tickets / max(1, total_tickets)) * 100, 1),
            "avg_resolution_hours": 14.2
        },
        "charts": {
            "categories": cat_stats,
            "departments": dept_stats,
            "priorities": prio_stats,
            "statuses": status_stats
        }
    })


@app.route("/api/admin/routing-rules", methods=["POST"])
def api_save_routing_rule():
    """Create or update a routing rule."""
    data = request.get_json() or {}
    category_id = data.get("category_id")
    subcategory_id = data.get("subcategory_id") or None
    department_id = data.get("department_id")
    priority = data.get("default_priority", "MEDIUM")
    sla_hours = int(data.get("sla_hours", 24))
    notes = data.get("notes", "")

    if not category_id or not department_id:
        return jsonify({"success": False, "error": "Category and Department required."}), 400

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    # Upsert rule
    rule_id = data.get("id")
    if not rule_id:
        existing = query_db("SELECT id FROM routing_rules WHERE category_id = ? AND subcategory_id = ?", (category_id, subcategory_id), one=True)
        if existing:
            rule_id = existing["id"]

    if rule_id:
        execute_db("""
            UPDATE routing_rules
            SET category_id = ?, subcategory_id = ?, department_id = ?, default_priority = ?, sla_hours = ?, notes = ?, updated_at = ?
            WHERE id = ?
        """, (category_id, subcategory_id, department_id, priority, sla_hours, notes, now, rule_id))
    else:
        execute_db("""
            INSERT INTO routing_rules (category_id, subcategory_id, department_id, default_priority, sla_hours, notes, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (category_id, subcategory_id, department_id, priority, sla_hours, notes, now))

    return jsonify({"success": True, "message": "Routing rule saved successfully."})


@app.route("/api/admin/routing-rules/<int:rule_id>", methods=["DELETE"])
def api_delete_routing_rule(rule_id: int):
    """Delete a routing rule."""
    execute_db("DELETE FROM routing_rules WHERE id = ?", (rule_id,))
    return jsonify({"success": True, "message": "Routing rule deleted."})


@app.route("/api/admin/ai-settings", methods=["POST"])
def api_update_ai_settings():
    """Update AI thresholds and active model."""
    data = request.get_json() or {}
    for k, v in data.items():
        execute_db("UPDATE system_settings SET value = ? WHERE key = ?", (str(v), k))
    return jsonify({"success": True, "message": "AI settings updated."})


# =====================================================================
# Notifications APIs
# =====================================================================

@app.route("/api/notifications", methods=["GET"])
def api_get_notifications():
    """Return notifications for active user."""
    user = get_current_user()
    notifs = query_db("""
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC LIMIT 20
    """, (user["id"],))
    unread = sum(1 for n in notifs if n["is_read"] == 0)
    return jsonify({"success": True, "notifications": notifs, "unread_count": unread})

@app.route("/api/notifications/mark-all-read", methods=["POST"])
def api_mark_all_notifications_read():
    """Mark all notifications as read."""
    user = get_current_user()
    execute_db("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (user["id"],))
    return jsonify({"success": True, "message": "All notifications marked as read."})


# =====================================================================
# Main Runner
# =====================================================================

if __name__ == "__main__":
    print(f"\n=======================================================")
    print(f"🎓 CampusQuery Web Application Running")
    print(f"   URL: http://localhost:{config.PORT}")
    print(f"   Mode: {'development' if config.DEBUG else 'production'}")
    print(f"=======================================================\n")
    app.run(host="0.0.0.0", port=config.PORT, debug=config.DEBUG)

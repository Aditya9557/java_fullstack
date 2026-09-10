"""
database.py - SQLite schema initialization and database utilities for CampusQuery.
"""
import sqlite3
import json
from datetime import datetime
from pathlib import Path
from config import DB_PATH

def get_connection():
    """Return a connection with foreign keys enabled and row_factory set to Row."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create tables and indexes if they do not exist."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    -- 1. Departments Table
    CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        email TEXT,
        sla_hours INTEGER DEFAULT 24,
        head_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Users Table
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL, -- STUDENT, DEPARTMENT_OFFICER, DEPARTMENT_ADMIN, SUPER_ADMIN
        department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
        student_id_number TEXT,
        phone TEXT,
        avatar TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Categories Table
    CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        icon TEXT DEFAULT 'folder',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Subcategories Table
    CREATE TABLE IF NOT EXISTS subcategories (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        default_priority TEXT DEFAULT 'MEDIUM',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category_id, name)
    );

    -- 5. Configurable Routing Rules Table
    CREATE TABLE IF NOT EXISTS routing_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        subcategory_id TEXT REFERENCES subcategories(id) ON DELETE CASCADE,
        department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        default_priority TEXT DEFAULT 'MEDIUM',
        sla_hours INTEGER DEFAULT 24,
        is_active INTEGER DEFAULT 1,
        notes TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category_id, subcategory_id)
    );

    -- 6. Tickets Table (Core entity)
    CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        ticket_number TEXT NOT NULL UNIQUE,
        student_id TEXT NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category_id TEXT REFERENCES categories(id),
        subcategory_id TEXT REFERENCES subcategories(id),
        department_id TEXT REFERENCES departments(id),
        assigned_to TEXT REFERENCES users(id),
        priority TEXT NOT NULL DEFAULT 'MEDIUM', -- HIGH, MEDIUM, LOW
        status TEXT NOT NULL DEFAULT 'NEW',     -- See config.VALID_STATES
        ai_confidence REAL DEFAULT 0.0,
        ai_reasoning TEXT,
        is_ambiguous INTEGER DEFAULT 0,
        clarification_question TEXT,
        student_feedback TEXT,
        resolution_notes TEXT,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        closed_at TIMESTAMP
    );

    -- 7. Ticket Messages Table (Conversation & Internal Notes)
    CREATE TABLE IF NOT EXISTS ticket_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES users(id),
        sender_role TEXT NOT NULL,
        message_text TEXT NOT NULL,
        is_internal INTEGER DEFAULT 0, -- 1 for staff internal notes
        attachment_name TEXT,
        attachment_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. Ticket State Audit History
    CREATE TABLE IF NOT EXISTS ticket_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        from_state TEXT,
        to_state TEXT NOT NULL,
        actor_id TEXT REFERENCES users(id),
        actor_name TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 9. Notifications Table
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ticket_id TEXT REFERENCES tickets(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info', -- info, alert, success, warning
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 10. AI Classifications & Audit Overrides
    CREATE TABLE IF NOT EXISTS ai_classifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        raw_prompt TEXT NOT NULL,
        predicted_category TEXT,
        predicted_subcategory TEXT,
        predicted_priority TEXT,
        predicted_department TEXT,
        confidence REAL,
        reasoning TEXT,
        was_overridden INTEGER DEFAULT 0,
        final_category TEXT,
        final_subcategory TEXT,
        override_actor_id TEXT REFERENCES users(id),
        override_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 11. System Settings Table
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_tickets_student ON tickets(student_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_dept ON tickets(department_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_history_ticket ON ticket_history(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_messages_ticket ON ticket_messages(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id, is_read);
    """)

    # Seed default system settings if empty
    cursor.execute("SELECT COUNT(*) FROM system_settings")
    if cursor.fetchone()[0] == 0:
        settings = [
            ("auto_route_threshold", "0.85", "Minimum AI confidence to automatically route tickets"),
            ("confirmation_threshold", "0.60", "Threshold between asking confirmation vs manual queue"),
            ("sla_warning_hours", "4", "Hours before SLA expiry to trigger warning alert"),
            ("active_llm_model", "llama-3.3-70b-versatile", "Currently active LLM model identifier"),
            ("ai_provider", "groq", "Active AI provider (groq/openai/local)")
        ]
        cursor.executemany("INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?)", settings)

    conn.commit()
    conn.close()

def query_db(query: str, args=(), one=False):
    """Execute a query and return rows as list of dicts (or single dict)."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(query, args)
        rv = cur.fetchall()
        if one:
            return dict(rv[0]) if rv else None
        return [dict(r) for r in rv]
    finally:
        conn.close()

def execute_db(query: str, args=(), commit=True):
    """Execute an insert/update/delete statement and return lastrowid or affected count."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(query, args)
        if commit:
            conn.commit()
        return cur.lastrowid
    finally:
        conn.close()

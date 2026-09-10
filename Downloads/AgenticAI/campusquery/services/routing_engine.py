"""
services/routing_engine.py - Configurable Dynamic Routing Engine.

Maps: Category + Subcategory -> Department, Priority & SLA
Driven entirely by database records in `routing_rules`.
"""
import logging
from typing import Dict, Any, Optional
from database import query_db, get_connection

logger = logging.getLogger(__name__)

class RoutingEngine:
    """Dynamic routing engine that resolves categories to departments based on live DB rules."""

    def route_query(self, category_name: str, subcategory_name: str, suggested_priority: str = "MEDIUM") -> Dict[str, Any]:
        """
        Determine target department, SLA, and final priority.
        
        Algorithm:
        1. Find matching category_id and subcategory_id in DB.
        2. Query `routing_rules` for an active rule matching (category_id, subcategory_id).
        3. If not found, look for rule with matching category_id and subcategory_id IS NULL.
        4. If still not found, fallback to 'Student Affairs' / General support.
        """
        conn = get_connection()
        try:
            cur = conn.cursor()

            # Lookup Category ID
            cur.execute("SELECT id, name FROM categories WHERE LOWER(name) = LOWER(?)", (category_name,))
            cat_row = cur.fetchone()
            category_id = cat_row["id"] if cat_row else None

            # Lookup Subcategory ID
            subcategory_id = None
            if category_id and subcategory_name:
                cur.execute(
                    "SELECT id, name, default_priority FROM subcategories WHERE category_id = ? AND LOWER(name) = LOWER(?)",
                    (category_id, subcategory_name)
                )
                sub_row = cur.fetchone()
                if sub_row:
                    subcategory_id = sub_row["id"]

            # Query Active Routing Rules
            rule = None
            if category_id and subcategory_id:
                cur.execute("""
                    SELECT r.*, d.name as department_name, d.sla_hours as dept_sla, d.email as dept_email
                    FROM routing_rules r
                    JOIN departments d ON r.department_id = d.id
                    WHERE r.category_id = ? AND r.subcategory_id = ? AND r.is_active = 1
                """, (category_id, subcategory_id))
                rule = cur.fetchone()

            # Category-level fallback rule if specific subcategory has no rule
            if not rule and category_id:
                cur.execute("""
                    SELECT r.*, d.name as department_name, d.sla_hours as dept_sla, d.email as dept_email
                    FROM routing_rules r
                    JOIN departments d ON r.department_id = d.id
                    WHERE r.category_id = ? AND r.subcategory_id IS NULL AND r.is_active = 1
                """, (category_id,))
                rule = cur.fetchone()

            # System Fallback Department (Student Affairs / General Queue)
            if not rule:
                cur.execute("SELECT id, name, sla_hours, email FROM departments WHERE code = 'SA' OR LOWER(name) LIKE '%student affairs%' LIMIT 1")
                fallback_dept = cur.fetchone()
                if not fallback_dept:
                    cur.execute("SELECT id, name, sla_hours, email FROM departments LIMIT 1")
                    fallback_dept = cur.fetchone()

                dept_id = fallback_dept["id"] if fallback_dept else "dept-sa"
                dept_name = fallback_dept["name"] if fallback_dept else "Student Affairs"
                sla = fallback_dept["sla_hours"] if fallback_dept else 48

                return {
                    "category_id": category_id,
                    "subcategory_id": subcategory_id,
                    "department_id": dept_id,
                    "department_name": dept_name,
                    "priority": suggested_priority,
                    "sla_hours": sla,
                    "is_fallback": True,
                    "routing_note": "Routed via default fallback queue."
                }

            # Return resolved department from rule
            final_priority = suggested_priority or rule["default_priority"] or "MEDIUM"
            return {
                "category_id": category_id,
                "subcategory_id": subcategory_id,
                "department_id": rule["department_id"],
                "department_name": rule["department_name"],
                "priority": final_priority,
                "sla_hours": rule["sla_hours"] or rule["dept_sla"] or 24,
                "is_fallback": False,
                "routing_note": f"Matched routing rule #{rule['id']} -> {rule['department_name']}"
            }
        finally:
            conn.close()


routing_engine = RoutingEngine()

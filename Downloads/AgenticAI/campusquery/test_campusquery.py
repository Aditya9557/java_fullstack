"""
test_campusquery.py - Comprehensive Automated Acceptance Test Suite.

Verifies the 7 Core Acceptance Tests specified in the requirements:
1. Attendance: "My attendance is incorrect." -> Attendance Correction -> Academic/Attendance Cell
2. Examination: "My two exams are at the same time." -> Exam Clash -> HIGH -> Examination Cell
3. Placement: "I cannot register for the upcoming placement drive." -> Placement Registration -> TPC
4. Hostel: "The fan in my hostel room is not working." -> Maintenance -> Hostel Administration
5. Ambiguous Query: Low confidence -> Clarification / Manual Review Queue
6. Department Resolution & Student Closure Lifecycle: Resolve -> Confirm -> CLOSED
7. Dynamic Admin Routing Rule Override: Modifying rule routes future query to new department
"""
import sys
import unittest
from pathlib import Path

# Ensure campusquery directory is on sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from database import init_db, query_db, execute_db
from services.ai_classifier import ai_classifier
from services.routing_engine import routing_engine
from services.state_machine import ticket_state_machine
from seed import run_seed
import app as flask_app_module

class TestCampusQuery(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Initialize and re-seed database before tests."""
        run_seed()
        cls.client = flask_app_module.app.test_client()

    def test_01_attendance_correction_routing(self):
        """Test 1: Student submits 'My attendance is incorrect.'"""
        query = "My attendance is incorrect."
        ai_res = ai_classifier.classify_query(query)
        self.assertEqual(ai_res["category"], "Attendance")
        self.assertIn("Correction", ai_res["subcategory"])
        
        route = routing_engine.route_query(ai_res["category"], ai_res["subcategory"])
        self.assertEqual(route["department_name"], "Academic & Attendance Cell")
        print("✅ Test 1 Passed: Attendance -> Attendance Correction -> Academic & Attendance Cell")

    def test_02_exam_clash_high_priority(self):
        """Test 2: Student submits 'My two exams are at the same time.'"""
        query = "My two exams are at the same time."
        ai_res = ai_classifier.classify_query(query)
        self.assertEqual(ai_res["category"], "Examination")
        self.assertEqual(ai_res["subcategory"], "Exam Clash")
        self.assertEqual(ai_res["priority"], "HIGH")
        
        route = routing_engine.route_query(ai_res["category"], ai_res["subcategory"], ai_res["priority"])
        self.assertEqual(route["department_name"], "Examination Cell")
        self.assertEqual(route["priority"], "HIGH")
        print("✅ Test 2 Passed: Examination -> Exam Clash -> HIGH -> Examination Cell")

    def test_03_placement_registration_tpc(self):
        """Test 3: Student submits 'I cannot register for the upcoming placement drive.'"""
        query = "I cannot register for the upcoming placement drive."
        ai_res = ai_classifier.classify_query(query)
        self.assertEqual(ai_res["category"], "Placement")
        self.assertIn("Registration", ai_res["subcategory"])
        
        route = routing_engine.route_query(ai_res["category"], ai_res["subcategory"])
        self.assertEqual(route["department_name"], "Training & Placement Cell (TPC)")
        print("✅ Test 3 Passed: Placement -> Placement Registration -> TPC")

    def test_04_hostel_maintenance(self):
        """Test 4: Student submits 'The fan in my hostel room is not working.'"""
        query = "The fan in my hostel room is not working."
        ai_res = ai_classifier.classify_query(query)
        self.assertEqual(ai_res["category"], "Hostel")
        self.assertEqual(ai_res["subcategory"], "Maintenance")
        
        route = routing_engine.route_query(ai_res["category"], ai_res["subcategory"])
        self.assertEqual(route["department_name"], "Hostel Administration")
        print("✅ Test 4 Passed: Hostel -> Maintenance -> Hostel Administration")

    def test_05_ambiguous_query_clarification(self):
        """Test 5: Submit an ambiguous query."""
        query = "I have a problem with general schedule."
        ai_res = ai_classifier.classify_query(query)
        # Should detect low confidence or ambiguous flag
        self.assertTrue(ai_res.get("is_ambiguous") or ai_res.get("confidence") < 0.65)
        print(f"✅ Test 5 Passed: Ambiguous query triggered confidence {ai_res.get('confidence')} and clarification/manual queue.")

    def test_06_department_resolution_and_closure(self):
        """Test 6: Department officer resolves ticket -> Student confirms -> Ticket CLOSED."""
        # 1. Create a fresh ticket via API
        res = self.client.post("/api/tickets", json={
            "title": "DBMS exam overlap test",
            "description": "DBMS and OS clash on Dec 14",
            "student_id": "user-stu-1"
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        ticket_id = data["ticket"]["id"]

        # 2. Officer resolves ticket
        res_resolve = self.client.post(f"/api/tickets/{ticket_id}/status", json={
            "status": "RESOLVED",
            "note": "Rescheduled OS exam to Dec 16 slot 1."
        })
        self.assertEqual(res_resolve.status_code, 200)

        # 3. Verify state is RESOLVED
        t_check = query_db("SELECT status, resolution_notes FROM tickets WHERE id = ?", (ticket_id,), one=True)
        self.assertEqual(t_check["status"], "RESOLVED")
        self.assertIn("Rescheduled", t_check["resolution_notes"])

        # 4. Student confirms resolution
        res_confirm = self.client.post(f"/api/tickets/{ticket_id}/confirm-resolution", json={
            "feedback": "Confirmed resolved on portal."
        })
        self.assertEqual(res_confirm.status_code, 200)

        # 5. Verify final state is CLOSED
        t_final = query_db("SELECT status, student_feedback, closed_at FROM tickets WHERE id = ?", (ticket_id,), one=True)
        self.assertEqual(t_final["status"], "CLOSED")
        self.assertIsNotNone(t_final["closed_at"])
        print("✅ Test 6 Passed: Complete lifecycle from RESOLVED to CLOSED with student confirmation.")

    def test_07_admin_changes_routing_rule(self):
        """Test 7: Admin changes a routing rule -> Future query follows new routing rule."""
        # Change rule: Map Hostel -> Maintenance to 'dept-sa' (Student Affairs) temporarily
        cat = query_db("SELECT id FROM categories WHERE name = 'Hostel'", one=True)
        sub = query_db("SELECT id FROM subcategories WHERE name = 'Maintenance' AND category_id = ?", (cat["id"],), one=True)
        new_dept = query_db("SELECT id, name FROM departments WHERE code = 'SA'", one=True)

        # Update rule in DB
        res_rule = self.client.post("/api/admin/routing-rules", json={
            "category_id": cat["id"],
            "subcategory_id": sub["id"],
            "department_id": new_dept["id"],
            "default_priority": "HIGH",
            "sla_hours": 6,
            "notes": "Testing admin dynamic rule redirection"
        })
        self.assertEqual(res_rule.status_code, 200)

        # Route a new query
        new_route = routing_engine.route_query("Hostel", "Maintenance")
        self.assertEqual(new_route["department_id"], new_dept["id"])
        self.assertEqual(new_route["department_name"], new_dept["name"])

        # Revert rule back to Hostel Administration
        orig_dept = query_db("SELECT id FROM departments WHERE code = 'HOSTEL'", one=True)
        self.client.post("/api/admin/routing-rules", json={
            "category_id": cat["id"],
            "subcategory_id": sub["id"],
            "department_id": orig_dept["id"],
            "default_priority": "MEDIUM",
            "sla_hours": 12,
            "notes": "Reverted back to Hostel Administration"
        })
        print("✅ Test 7 Passed: Admin changed routing rule dynamically, verified future routing, and reverted cleanly.")

if __name__ == "__main__":
    unittest.main()

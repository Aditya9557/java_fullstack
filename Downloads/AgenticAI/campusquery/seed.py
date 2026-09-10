"""
seed.py - Database Seed Script for CampusQuery.

Populates:
1. 6 Departments (Examination Cell, TPC, Academic Office, Hostel Admin, Accounts, Student Affairs)
2. Categories and Subcategories with icons and default priorities
3. Dynamic Routing Rules (Category + Subcategory -> Department)
4. 16 Realistic Users (Students, Department Officers, Department Admins, Super Admin)
5. 32 Realistic Tickets across all categories, priorities, and lifecycle states
6. Conversations, attachments, audit logs, and AI classification records
"""
import uuid
from datetime import datetime, timedelta
from database import init_db, get_connection

def run_seed():
    init_db()
    conn = get_connection()
    cur = conn.cursor()

    # Clear existing tables for fresh seed
    cur.execute("DELETE FROM notifications")
    cur.execute("DELETE FROM ai_classifications")
    cur.execute("DELETE FROM ticket_history")
    cur.execute("DELETE FROM ticket_messages")
    cur.execute("DELETE FROM tickets")
    cur.execute("DELETE FROM routing_rules")
    cur.execute("DELETE FROM subcategories")
    cur.execute("DELETE FROM categories")
    cur.execute("DELETE FROM users")
    cur.execute("DELETE FROM departments")

    now = datetime.now()

    # 1. Departments
    departments = [
        ("dept-exam", "Examination Cell", "EXAM", "Handles examination datesheets, clashing schedules, admit cards, hall tickets, and re-evaluation.", "examcell@campus.edu", 24, "Prof. Rajesh Sharma"),
        ("dept-tpc", "Training & Placement Cell (TPC)", "TPC", "Manages campus placement drives, company registrations, shortlist eligibility, and interview schedules.", "tpc@campus.edu", 12, "Dr. Sunita Verma"),
        ("dept-acad", "Academic & Attendance Cell", "ACAD", "Oversees student attendance records, medical leave reconciliations, course registrations, and timetable.", "academic@campus.edu", 24, "Prof. Anand Kulkarni"),
        ("dept-hostel", "Hostel Administration", "HOSTEL", "Supervises hostel accommodation, room maintenance, electrical/plumbing repairs, and mess catering.", "hosteladmin@campus.edu", 12, "Col. Virendra Singh (Retd.)"),
        ("dept-accounts", "Accounts & Finance Department", "ACCT", "Processes college tuition fees, hostel caution money refunds, scholarships, and payment challans.", "accounts@campus.edu", 48, "Mr. Ramesh Patil"),
        ("dept-sa", "Student Affairs & Welfare", "SA", "General student support, identity card issuance, transport bus passes, bonafide certificates, and grievance escalation.", "studentaffairs@campus.edu", 48, "Dr. Meenakshi Iyer")
    ]
    cur.executemany("""
        INSERT INTO departments (id, name, code, description, email, sla_hours, head_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, departments)

    # 2. Categories
    categories = [
        ("cat-exam", "Examination", "EXAM", "Inquiries regarding exam schedules, clashing papers, hall tickets, and marks.", "fa-file-alt"),
        ("cat-attend", "Attendance", "ATTEND", "Attendance percentage discrepancies, medical leaves, and minimum criteria.", "fa-user-check"),
        ("cat-place", "Placement", "PLACE", "Placement registrations, company drive queries, shortlisting, and TPC announcements.", "fa-briefcase"),
        ("cat-hostel", "Hostel", "HOSTEL", "Hostel room maintenance, electricity, plumbing, mess food, and room changes.", "fa-building"),
        ("cat-accts", "Accounts", "ACCTS", "College fee receipts, payment failures, scholarships, and dues.", "fa-credit-card"),
        ("cat-gen", "General", "GEN", "Identity cards, certificates, bus transport, and unclassified student queries.", "fa-info-circle")
    ]
    cur.executemany("""
        INSERT INTO categories (id, name, code, description, icon)
        VALUES (?, ?, ?, ?, ?)
    """, categories)

    # 3. Subcategories
    subcategories = [
        # Examination
        ("sub-exam-clash", "cat-exam", "Exam Clash", "EXAM_CLASH", "HIGH", "Two or more examinations scheduled simultaneously in the same slot."),
        ("sub-exam-sched", "cat-exam", "Exam Schedule", "EXAM_SCHED", "MEDIUM", "Datesheet clarifications or schedule publication queries."),
        ("sub-exam-admit", "cat-exam", "Admit Card", "EXAM_ADMIT", "HIGH", "Inability to download or errors printed on hall ticket."),
        ("sub-exam-form", "cat-exam", "Examination Form", "EXAM_FORM", "MEDIUM", "Issues filling out exam registration or elective forms."),
        ("sub-exam-res", "cat-exam", "Examination Result", "EXAM_RES", "MEDIUM", "Grade discrepancies, re-evaluations, and backlog clarifications."),
        
        # Attendance
        ("sub-att-corr", "cat-attend", "Attendance Correction", "ATT_CORR", "MEDIUM", "Present in lecture but marked absent in portal."),
        ("sub-att-med", "cat-attend", "Medical Leave", "ATT_MED", "MEDIUM", "Duty/medical leave submission for attendance reconciliation."),
        ("sub-att-short", "cat-attend", "Attendance Shortage", "ATT_SHORT", "HIGH", "Shortage warning or debarment list dispute."),
        ("sub-att-pol", "cat-attend", "Attendance Policy", "ATT_POL", "LOW", "General inquiry about attendance threshold guidelines."),

        # Placement
        ("sub-plc-reg", "cat-place", "Placement Registration", "PLC_REG", "HIGH", "Portal login or drive registration issues."),
        ("sub-plc-drv", "cat-place", "Company Drive", "PLC_DRV", "MEDIUM", "Inquiry regarding specific upcoming corporate drive."),
        ("sub-plc-sel", "cat-place", "Placement Selection", "PLC_SEL", "MEDIUM", "Reason for non-shortlisting or interview feedback."),
        ("sub-plc-elig", "cat-place", "Placement Eligibility", "PLC_ELIG", "LOW", "CGPA cutoff and backlogs eligibility rules."),

        # Hostel
        ("sub-hos-maint", "cat-hostel", "Maintenance", "HOS_MAINT", "MEDIUM", "Electrical, carpentry, plumbing, or AC repair."),
        ("sub-hos-room", "cat-hostel", "Room Allocation", "HOS_ROOM", "MEDIUM", "Room change, roommate disputes, or allotment queries."),
        ("sub-hos-fee", "cat-hostel", "Hostel Fees", "HOS_FEE", "MEDIUM", "Hostel room or mess charges payment verification."),
        ("sub-hos-mess", "cat-hostel", "Mess", "HOS_MESS", "LOW", "Mess hygiene, catering quality, or meal timing complaints."),

        # Accounts
        ("sub-act-fee", "cat-accts", "Fee Payment", "ACT_FEE", "HIGH", "Payment gateway debited but receipt not generated."),
        ("sub-act-sch", "cat-accts", "Scholarship", "ACT_SCH", "MEDIUM", "Govt or merit scholarship verification and disbursement."),

        # General
        ("sub-gen-id", "cat-gen", "ID Card", "GEN_ID", "MEDIUM", "Lost student ID card or barcode malfunction."),
        ("sub-gen-inq", "cat-gen", "General Inquiry", "GEN_INQ", "LOW", "Bonafide letters, bus passes, and student welfare.")
    ]
    cur.executemany("""
        INSERT INTO subcategories (id, category_id, name, code, default_priority, description)
        VALUES (?, ?, ?, ?, ?, ?)
    """, subcategories)

    # 4. Configurable Routing Rules (Category + Subcategory -> Department)
    routing_rules = [
        # Examination -> Examination Cell
        ("cat-exam", "sub-exam-clash", "dept-exam", "HIGH", 12, "Urgent review by timetable coordinator."),
        ("cat-exam", "sub-exam-sched", "dept-exam", "MEDIUM", 24, "Exam cell staff responds with latest date sheet."),
        ("cat-exam", "sub-exam-admit", "dept-exam", "HIGH", 12, "Critical access issue handled by IT/Exam Cell."),
        ("cat-exam", "sub-exam-form", "dept-exam", "MEDIUM", 24, "Handled by Examination registration desk."),
        ("cat-exam", "sub-exam-res", "dept-exam", "MEDIUM", 36, "Results and evaluation committee."),

        # Attendance -> Academic Cell
        ("cat-attend", "sub-att-corr", "dept-acad", "MEDIUM", 24, "Cross-verified with subject faculty roll sheet."),
        ("cat-attend", "sub-att-med", "dept-acad", "MEDIUM", 36, "Medical certificate verification."),
        ("cat-attend", "sub-att-short", "dept-acad", "HIGH", 12, "Debarment review committee."),
        ("cat-attend", "sub-att-pol", "dept-acad", "LOW", 48, "General academic rules reply."),

        # Placement -> TPC
        ("cat-place", "sub-plc-reg", "dept-tpc", "HIGH", 6, "Critical placement registration deadline support."),
        ("cat-place", "sub-plc-drv", "dept-tpc", "MEDIUM", 12, "Company relationship officer."),
        ("cat-place", "sub-plc-sel", "dept-tpc", "MEDIUM", 24, "Shortlisting review with company recruiter."),
        ("cat-place", "sub-plc-elig", "dept-tpc", "LOW", 24, "TPC student coordinators."),

        # Hostel -> Hostel Administration
        ("cat-hostel", "sub-hos-maint", "dept-hostel", "MEDIUM", 12, "Dispatched to hostel maintenance contractor."),
        ("cat-hostel", "sub-hos-room", "dept-hostel", "MEDIUM", 24, "Hostel chief warden review."),
        ("cat-hostel", "sub-hos-fee", "dept-hostel", "MEDIUM", 36, "Hostel fee accounts desk."),
        ("cat-hostel", "sub-hos-mess", "dept-hostel", "LOW", 24, "Hostel mess committee review."),

        # Accounts -> Accounts
        ("cat-accts", "sub-act-fee", "dept-accounts", "HIGH", 24, "Banking reconciliation team."),
        ("cat-accts", "sub-act-sch", "dept-accounts", "MEDIUM", 48, "Scholarship officer."),

        # General -> Student Affairs
        ("cat-gen", "sub-gen-id", "dept-sa", "MEDIUM", 24, "Security and identity card printing desk."),
        ("cat-gen", "sub-gen-inq", "dept-sa", "LOW", 48, "Student affairs general counselor.")
    ]
    cur.executemany("""
        INSERT INTO routing_rules (category_id, subcategory_id, department_id, default_priority, sla_hours, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    """, routing_rules)

    # 5. Users (Students, Officers, Admins)
    users = [
        # Students (10 students)
        ("user-stu-1", "Aditya Chaubey", "aditya.c@student.campus.edu", "STUDENT", None, "21BCSE1024", "9876543210", "👨‍🎓"),
        ("user-stu-2", "Rhea Sengupta", "rhea.s@student.campus.edu", "STUDENT", None, "21BCSE1045", "9876543211", "👩‍🎓"),
        ("user-stu-3", "Aman Sharma", "aman.sh@student.campus.edu", "STUDENT", None, "22BIT088", "9876543212", "👨‍🎓"),
        ("user-stu-4", "Pooja Hegde", "pooja.h@student.campus.edu", "STUDENT", None, "22BECE034", "9876543213", "👩‍🎓"),
        ("user-stu-5", "Kunal Nayyar", "kunal.n@student.campus.edu", "STUDENT", None, "20BMECH019", "9876543214", "👨‍🎓"),
        ("user-stu-6", "Sneha Kapoor", "sneha.k@student.campus.edu", "STUDENT", None, "21BCSE1102", "9876543215", "👩‍🎓"),
        ("user-stu-7", "Vikram Rathore", "vikram.r@student.campus.edu", "STUDENT", None, "23BCSE055", "9876543216", "👨‍🎓"),
        ("user-stu-8", "Ananya Deshmukh", "ananya.d@student.campus.edu", "STUDENT", None, "22BCSE211", "9876543217", "👩‍🎓"),
        ("user-stu-9", "Tanmay Bhatt", "tanmay.b@student.campus.edu", "STUDENT", None, "21BEE090", "9876543218", "👨‍🎓"),
        ("user-stu-10", "Zoya Akhtar", "zoya.a@student.campus.edu", "STUDENT", None, "23BIT012", "9876543219", "👩‍🎓"),

        # Department Officers
        ("user-off-exam", "Prof. Vikram Malhotra", "v.malhotra@campus.edu", "DEPARTMENT_OFFICER", "dept-exam", None, "9123456780", "👨‍🏫"),
        ("user-off-tpc", "Mr. Neeraj Joshi", "n.joshi@campus.edu", "DEPARTMENT_OFFICER", "dept-tpc", None, "9123456781", "💼"),
        ("user-off-acad", "Dr. Kavita Menon", "k.menon@campus.edu", "DEPARTMENT_OFFICER", "dept-acad", None, "9123456782", "📚"),
        ("user-off-hostel", "Warden Harish Chandra", "h.chandra@campus.edu", "DEPARTMENT_OFFICER", "dept-hostel", None, "9123456783", "🏢"),
        ("user-off-accts", "Mr. Santosh Gupta", "s.gupta@campus.edu", "DEPARTMENT_OFFICER", "dept-accounts", None, "9123456784", "💳"),
        
        # Super Admin
        ("user-admin", "Dean Office Super Admin", "dean.admin@campus.edu", "SUPER_ADMIN", None, None, "9999999999", "🛡️")
    ]
    cur.executemany("""
        INSERT INTO users (id, name, email, role, department_id, student_id_number, phone, avatar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, users)

    # 6. Realistic Tickets (32 demo tickets spanning all states, categories, and scenarios)
    tickets_data = [
        # Demo Scenario 1 (From Prompt: Exam Clash CQ-1024)
        {
            "id": "t-1024",
            "num": "CQ-1024",
            "student": "user-stu-1",
            "title": "DBMS and Operating Systems exams scheduled at the same time",
            "desc": "My exams for DBMS and Operating Systems are scheduled at the same time on Dec 14th slot 2. Please resolve this conflict.",
            "cat": "cat-exam",
            "sub": "sub-exam-clash",
            "dept": "dept-exam",
            "assigned": "user-off-exam",
            "priority": "HIGH",
            "status": "CLOSED",
            "conf": 0.96,
            "reason": "Student reports overlapping examination schedules.",
            "created_hours_ago": 6,
            "resolved_hours_ago": 1,
            "closed_hours_ago": 0.5,
            "messages": [
                ("user-off-exam", "DEPARTMENT_OFFICER", "Hello Aditya, please upload your examination schedule or admit card so we can verify the overlapping course codes.", 0, None),
                ("user-stu-1", "STUDENT", "Here is my admit card showing DBMS (CS401) and OS (CS402) both booked for Dec 14 at 10:00 AM.", 0, "admit_card_dec14.pdf"),
                ("user-off-exam", "DEPARTMENT_OFFICER", "Thank you. We have rescheduled the Operating Systems paper for Dec 16th, Slot 1. Updated admit card will reflect within 2 hours.", 0, None),
                ("user-stu-1", "STUDENT", "Received the updated schedule on the portal! Confirmed resolved, thank you so much.", 0, None)
            ],
            "history": [
                ("NEW", "Query submitted by student.", "user-stu-1", "Aditya Chaubey", "STUDENT"),
                ("CLASSIFYING", "AI classification in progress.", None, "AI Classifier", "SYSTEM"),
                ("CLASSIFIED", "Classified as Examination -> Exam Clash (96% confidence).", None, "AI Classifier", "SYSTEM"),
                ("ROUTED", "Routed automatically to Examination Cell.", None, "Routing Engine", "SYSTEM"),
                ("ASSIGNED", "Assigned to Prof. Vikram Malhotra.", "user-off-exam", "Prof. Vikram Malhotra", "DEPARTMENT_OFFICER"),
                ("WAITING_FOR_STUDENT", "Officer requested admit card copy.", "user-off-exam", "Prof. Vikram Malhotra", "DEPARTMENT_OFFICER"),
                ("IN_PROGRESS", "Student submitted required documentation.", "user-stu-1", "Aditya Chaubey", "STUDENT"),
                ("RESOLVED", "Exam rescheduled to Dec 16. Issue resolved.", "user-off-exam", "Prof. Vikram Malhotra", "DEPARTMENT_OFFICER"),
                ("CLOSED", "Student confirmed resolution.", "user-stu-1", "Aditya Chaubey", "STUDENT")
            ]
        },

        # Demo Scenario 2: Attendance Discrepancy
        {
            "id": "t-1025",
            "num": "CQ-1025",
            "student": "user-stu-2",
            "title": "Attendance discrepancy in CSE320 (marked 62% instead of 84%)",
            "desc": "My attendance in CSE320 is showing 62% but I attended most of the classes and have faculty signatures on physical attendance sheet.",
            "cat": "cat-attend",
            "sub": "sub-att-corr",
            "dept": "dept-acad",
            "assigned": "user-off-acad",
            "priority": "MEDIUM",
            "status": "IN_PROGRESS",
            "conf": 0.92,
            "reason": "Student reports discrepancy in recorded attendance percentage.",
            "created_hours_ago": 18,
            "resolved_hours_ago": None,
            "closed_hours_ago": None,
            "messages": [
                ("user-off-acad", "DEPARTMENT_OFFICER", "Hello Rhea, we have pulled the manual attendance registers from Dr. Rao for week 5 to 8. Verification is underway.", 0, None),
                ("user-off-acad", "DEPARTMENT_OFFICER", "Internal note: Dr. Rao confirmed lab sessions were not synced to ERP for Section B.", 1, None)
            ],
            "history": [
                ("NEW", "Query submitted by student.", "user-stu-2", "Rhea Sengupta", "STUDENT"),
                ("CLASSIFIED", "AI classified as Attendance -> Attendance Correction (92%).", None, "AI Classifier", "SYSTEM"),
                ("ROUTED", "Routed to Academic & Attendance Cell.", None, "Routing Engine", "SYSTEM"),
                ("ASSIGNED", "Assigned to Dr. Kavita Menon.", "user-off-acad", "Dr. Kavita Menon", "DEPARTMENT_OFFICER"),
                ("IN_PROGRESS", "Attendance sheet verification ongoing.", "user-off-acad", "Dr. Kavita Menon", "DEPARTMENT_OFFICER")
            ]
        },

        # Demo Scenario 3: Placement Registration issue
        {
            "id": "t-1026",
            "num": "CQ-1026",
            "student": "user-stu-3",
            "title": "Cannot register for Infosys placement drive deadline today",
            "desc": "I want to register for the upcoming Infosys placement drive but the TPC portal shows error 'Profile Incomplete' despite all grades updated.",
            "cat": "cat-place",
            "sub": "sub-plc-reg",
            "dept": "dept-tpc",
            "assigned": "user-off-tpc",
            "priority": "HIGH",
            "status": "WAITING_FOR_STUDENT",
            "conf": 0.94,
            "reason": "Student reports urgent barrier to placement drive registration.",
            "created_hours_ago": 3,
            "resolved_hours_ago": None,
            "closed_hours_ago": None,
            "messages": [
                ("user-off-tpc", "DEPARTMENT_OFFICER", "Aman, please upload a screenshot of your 5th semester mark sheet so we can manually unlock your TPC profile.", 0, None)
            ],
            "history": [
                ("NEW", "Query submitted by student.", "user-stu-3", "Aman Sharma", "STUDENT"),
                ("CLASSIFIED", "AI classified as Placement -> Placement Registration (94%).", None, "AI Classifier", "SYSTEM"),
                ("ROUTED", "Routed to TPC.", None, "Routing Engine", "SYSTEM"),
                ("ASSIGNED", "Assigned to Mr. Neeraj Joshi.", "user-off-tpc", "Mr. Neeraj Joshi", "DEPARTMENT_OFFICER"),
                ("WAITING_FOR_STUDENT", "Requested 5th semester mark sheet screenshot.", "user-off-tpc", "Mr. Neeraj Joshi", "DEPARTMENT_OFFICER")
            ]
        },

        # Demo Scenario 4: Hostel Maintenance
        {
            "id": "t-1027",
            "num": "CQ-1027",
            "student": "user-stu-4",
            "title": "Ceiling fan and electrical socket sparking in Room B-304",
            "desc": "The ceiling fan in my hostel room B-304 is completely stopped and the electrical socket is producing sparks.",
            "cat": "cat-hostel",
            "sub": "sub-hos-maint",
            "dept": "dept-hostel",
            "assigned": "user-off-hostel",
            "priority": "HIGH",
            "status": "IN_PROGRESS",
            "conf": 0.95,
            "reason": "Electrical sparking poses utility safety hazard.",
            "created_hours_ago": 5,
            "resolved_hours_ago": None,
            "closed_hours_ago": None,
            "messages": [
                ("user-off-hostel", "DEPARTMENT_OFFICER", "Electrician team has been dispatched to Block B 3rd floor. Please keep the main room switch off until they arrive.", 0, None)
            ],
            "history": [
                ("NEW", "Query submitted by student.", "user-stu-4", "Pooja Hegde", "STUDENT"),
                ("CLASSIFIED", "AI classified as Hostel -> Maintenance (95%).", None, "AI Classifier", "SYSTEM"),
                ("ROUTED", "Routed to Hostel Administration.", None, "Routing Engine", "SYSTEM"),
                ("ASSIGNED", "Assigned to Warden Harish Chandra.", "user-off-hostel", "Warden Harish Chandra", "DEPARTMENT_OFFICER"),
                ("IN_PROGRESS", "Electrician dispatched.", "user-off-hostel", "Warden Harish Chandra", "DEPARTMENT_OFFICER")
            ]
        },

        # Demo Scenario 5: Ambiguous Query (Manual Review Queue)
        {
            "id": "t-1028",
            "num": "CQ-1028",
            "student": "user-stu-5",
            "title": "I am facing problems with schedules and timing",
            "desc": "I am facing problems with schedules and timing.",
            "cat": "cat-gen",
            "sub": "sub-gen-inq",
            "dept": "dept-sa",
            "assigned": None,
            "priority": "LOW",
            "status": "ROUTED",
            "conf": 0.52,
            "reason": "Query is brief/ambiguous; routed to General Student Affairs review queue.",
            "created_hours_ago": 24,
            "resolved_hours_ago": None,
            "closed_hours_ago": None,
            "messages": [],
            "history": [
                ("NEW", "Query submitted.", "user-stu-5", "Kunal Nayyar", "STUDENT"),
                ("CLASSIFYING", "Low confidence detected (52%).", None, "AI Classifier", "SYSTEM"),
                ("ROUTED", "Sent to General Student Affairs review queue.", None, "Routing Engine", "SYSTEM")
            ]
        },

        # Additional 27 Diverse Demo Tickets to reach 32 total
        {
            "id": "t-1029", "num": "CQ-1029", "student": "user-stu-6",
            "title": "Admit card download error for End-Sem exams",
            "desc": "Portal displays 404 error when clicking 'Generate Hall Ticket' button.",
            "cat": "cat-exam", "sub": "sub-exam-admit", "dept": "dept-exam", "assigned": "user-off-exam",
            "priority": "HIGH", "status": "RESOLVED", "conf": 0.94, "reason": "Hall ticket download error.",
            "created_hours_ago": 12, "resolved_hours_ago": 2, "closed_hours_ago": None,
            "messages": [("user-off-exam", "DEPARTMENT_OFFICER", "Server cache cleared, please re-login and download now.", 0, None)],
            "history": [("NEW", "Created", "user-stu-6", "Sneha Kapoor", "STUDENT"), ("ROUTED", "Routed", None, "Routing Engine", "SYSTEM"), ("RESOLVED", "Cleared cache", "user-off-exam", "Prof. Vikram Malhotra", "DEPARTMENT_OFFICER")]
        },
        {
            "id": "t-1030", "num": "CQ-1030", "student": "user-stu-7",
            "title": "Medical leave approval for viral fever (5 days)",
            "desc": "Attached doctor's prescription and medical fitness certificate for missing classes from Nov 10 to Nov 15.",
            "cat": "cat-attend", "sub": "sub-att-med", "dept": "dept-acad", "assigned": "user-off-acad",
            "priority": "MEDIUM", "status": "RESOLVED", "conf": 0.93, "reason": "Medical leave application.",
            "created_hours_ago": 30, "resolved_hours_ago": 4, "closed_hours_ago": None,
            "messages": [("user-off-acad", "DEPARTMENT_OFFICER", "Approved and attendance credited for 15 missed hours.", 0, None)],
            "history": [("NEW", "Created", "user-stu-7", "Vikram Rathore", "STUDENT"), ("ROUTED", "Routed", None, "Routing Engine", "SYSTEM"), ("RESOLVED", "Medical leave credited", "user-off-acad", "Dr. Kavita Menon", "DEPARTMENT_OFFICER")]
        },
        {
            "id": "t-1031", "num": "CQ-1031", "student": "user-stu-8",
            "title": "Why was I not shortlisted for TCS Digital drive?",
            "desc": "My CGPA is 8.9 and zero backlogs, but name missing from shortlist for TCS Digital.",
            "cat": "cat-place", "sub": "sub-plc-sel", "dept": "dept-tpc", "assigned": "user-off-tpc",
            "priority": "MEDIUM", "status": "CLOSED", "conf": 0.93, "reason": "Placement shortlist clarification.",
            "created_hours_ago": 48, "resolved_hours_ago": 20, "closed_hours_ago": 18,
            "messages": [("user-off-tpc", "DEPARTMENT_OFFICER", "TCS required 12th board aggregate >= 75%. Your recorded 12th marks were 72.4%.", 0, None)],
            "history": [("NEW", "Created", "user-stu-8", "Ananya Deshmukh", "STUDENT"), ("RESOLVED", "Eligibility criteria clarified", "user-off-tpc", "Mr. Neeraj Joshi", "DEPARTMENT_OFFICER"), ("CLOSED", "Confirmed", "user-stu-8", "Ananya Deshmukh", "STUDENT")]
        },
        {
            "id": "t-1032", "num": "CQ-1032", "student": "user-stu-9",
            "title": "Geyser not working in Hostel Block C 2nd floor bathroom",
            "desc": "Hot water is not heating in bathrooms 201 to 206 for the past two days.",
            "cat": "cat-hostel", "sub": "sub-hos-maint", "dept": "dept-hostel", "assigned": "user-off-hostel",
            "priority": "MEDIUM", "status": "IN_PROGRESS", "conf": 0.94, "reason": "Hostel geyser repair request.",
            "created_hours_ago": 8, "resolved_hours_ago": None, "closed_hours_ago": None,
            "messages": [("user-off-hostel", "DEPARTMENT_OFFICER", "Plumber has purchased heating element; installation scheduled today at 4 PM.", 0, None)],
            "history": [("NEW", "Created", "user-stu-9", "Tanmay Bhatt", "STUDENT"), ("IN_PROGRESS", "Technician assigned", "user-off-hostel", "Warden Harish Chandra", "DEPARTMENT_OFFICER")]
        },
        {
            "id": "t-1033", "num": "CQ-1033", "student": "user-stu-10",
            "title": "Semester tuition fee double debited from SBI NetBanking",
            "desc": "Amount of INR 65,000 debited twice on Nov 2nd with Ref# 99882211 and 99882212.",
            "cat": "cat-accts", "sub": "sub-act-fee", "dept": "dept-accounts", "assigned": "user-off-accts",
            "priority": "HIGH", "status": "IN_PROGRESS", "conf": 0.91, "reason": "Double debit banking reconciliation.",
            "created_hours_ago": 14, "resolved_hours_ago": None, "closed_hours_ago": None,
            "messages": [("user-off-accts", "DEPARTMENT_OFFICER", "Chargeback initiated with SBI merchant gateway. Refund will reflect within 3 banking days.", 0, None)],
            "history": [("NEW", "Created", "user-stu-10", "Zoya Akhtar", "STUDENT"), ("IN_PROGRESS", "Reconciliation initiated", "user-off-accts", "Mr. Santosh Gupta", "DEPARTMENT_OFFICER")]
        },
        {
            "id": "t-1034", "num": "CQ-1034", "student": "user-stu-1",
            "title": "Lost University ID Card on college shuttle bus",
            "desc": "I misplaced my identity card with roll 21BCSE1024 yesterday afternoon.",
            "cat": "cat-gen", "sub": "sub-gen-id", "dept": "dept-sa", "assigned": None,
            "priority": "MEDIUM", "status": "ROUTED", "conf": 0.90, "reason": "ID Card replacement request.",
            "created_hours_ago": 16, "resolved_hours_ago": None, "closed_hours_ago": None,
            "messages": [],
            "history": [("NEW", "Created", "user-stu-1", "Aditya Chaubey", "STUDENT"), ("ROUTED", "Routed to Student Affairs", None, "Routing Engine", "SYSTEM")]
        },
        {
            "id": "t-1035", "num": "CQ-1035", "student": "user-stu-2",
            "title": "Exam schedule clash between Elective Cloud Computing and AI",
            "desc": "Both Cloud Computing and Artificial Intelligence are slotted on 18th Dec 2 PM.",
            "cat": "cat-exam", "sub": "sub-exam-clash", "dept": "dept-exam", "assigned": "user-off-exam",
            "priority": "HIGH", "status": "ESCALATED", "conf": 0.95, "reason": "Elective examination schedule conflict.",
            "created_hours_ago": 26, "resolved_hours_ago": None, "closed_hours_ago": None,
            "messages": [("user-off-exam", "DEPARTMENT_OFFICER", "Escalated to Academic Controller because 85 students share this elective pair.", 0, None)],
            "history": [("NEW", "Created", "user-stu-2", "Rhea Sengupta", "STUDENT"), ("ASSIGNED", "Assigned", "user-off-exam", "Prof. Vikram Malhotra", "DEPARTMENT_OFFICER"), ("ESCALATED", "Escalated to Controller of Examinations", "user-off-exam", "Prof. Vikram Malhotra", "DEPARTMENT_OFFICER")]
        },
        {
            "id": "t-1036", "num": "CQ-1036", "student": "user-stu-3",
            "title": "Minimum attendance required for semester examination eligibility",
            "desc": "Is the minimum threshold 75% overall or 75% individually in each practical lab?",
            "cat": "cat-attend", "sub": "sub-att-pol", "dept": "dept-acad", "assigned": "user-off-acad",
            "priority": "LOW", "status": "CLOSED", "conf": 0.91, "reason": "Attendance policy question.",
            "created_hours_ago": 72, "resolved_hours_ago": 40, "closed_hours_ago": 36,
            "messages": [("user-off-acad", "DEPARTMENT_OFFICER", "75% aggregate is required in theory, and mandatory 80% in practical sessions.", 0, None)],
            "history": [("NEW", "Created", "user-stu-3", "Aman Sharma", "STUDENT"), ("RESOLVED", "Policy answered", "user-off-acad", "Dr. Kavita Menon", "DEPARTMENT_OFFICER"), ("CLOSED", "Confirmed", "user-stu-3", "Aman Sharma", "STUDENT")]
        },
        {
            "id": "t-1037", "num": "CQ-1037", "student": "user-stu-4",
            "title": "Hostel room allocation transfer request from Block D to Block B",
            "desc": "Requesting room swap due to medical asthma; Block D has higher dampness.",
            "cat": "cat-hostel", "sub": "sub-hos-room", "dept": "dept-hostel", "assigned": "user-off-hostel",
            "priority": "MEDIUM", "status": "WAITING_FOR_STUDENT", "conf": 0.92, "reason": "Hostel transfer on medical grounds.",
            "created_hours_ago": 22, "resolved_hours_ago": None, "closed_hours_ago": None,
            "messages": [("user-off-hostel", "DEPARTMENT_OFFICER", "Please provide campus health center physician recommendation note.", 0, None)],
            "history": [("NEW", "Created", "user-stu-4", "Pooja Hegde", "STUDENT"), ("WAITING_FOR_STUDENT", "Requested doctor note", "user-off-hostel", "Warden Harish Chandra", "DEPARTMENT_OFFICER")]
        },
        {
            "id": "t-1038", "num": "CQ-1038", "student": "user-stu-5",
            "title": "Microsoft drive test link expired before slot start time",
            "desc": "Coding test link sent by TPC shows 'Session Closed' 15 minutes before 6 PM.",
            "cat": "cat-place", "sub": "sub-plc-drv", "dept": "dept-tpc", "assigned": "user-off-tpc",
            "priority": "HIGH", "status": "RESOLVED", "conf": 0.95, "reason": "Urgent technical test link failure.",
            "created_hours_ago": 5, "resolved_hours_ago": 1, "closed_hours_ago": None,
            "messages": [("user-off-tpc", "DEPARTMENT_OFFICER", "Microsoft re-generated candidate token link. Sent to your campus email.", 0, None)],
            "history": [("NEW", "Created", "user-stu-5", "Kunal Nayyar", "STUDENT"), ("RESOLVED", "Token reissued", "user-off-tpc", "Mr. Neeraj Joshi", "DEPARTMENT_OFFICER")]
        }
    ]

    # Add 20 more tickets programmatically to reach 32 realistic demo records
    extra_templates = [
        ("t-1039", "CQ-1039", "user-stu-6", "Re-evaluation status for Software Engineering Midterm", "Submitted fee receipt 3 weeks ago but grade not updated on portal.", "cat-exam", "sub-exam-res", "dept-exam", "user-off-exam", "MEDIUM", "IN_PROGRESS", 0.90, "Re-evaluation tracking."),
        ("t-1040", "CQ-1040", "user-stu-7", "Hostel mess food quality audit in Boys Hostel 1", "Stale bread and undercooked rice served on Sunday dinner.", "cat-hostel", "sub-hos-mess", "dept-hostel", "user-off-hostel", "LOW", "RESOLVED", 0.89, "Mess quality complaint."),
        ("t-1041", "CQ-1041", "user-stu-8", "NSP Post-Matric Scholarship document verification", "Need signature from accounts officer on Annexure IV for state scholarship portal.", "cat-accts", "sub-act-sch", "dept-accounts", "user-off-accts", "MEDIUM", "RESOLVED", 0.92, "Scholarship verification."),
        ("t-1042", "CQ-1042", "user-stu-9", "Attendance shortage warning letter received mistakenly", "Letter claims 64% in Mathematics but faculty portal records 78%.", "cat-attend", "sub-att-short", "dept-acad", "user-off-acad", "HIGH", "IN_PROGRESS", 0.94, "Attendance shortage contestation."),
        ("t-1043", "CQ-1043", "user-stu-10", "Eligibility for Capgemini drive with 1 active backlog", "Does company allow clearing backlog before joining in July 2027?", "cat-place", "sub-plc-elig", "dept-tpc", "user-off-tpc", "LOW", "CLOSED", 0.88, "Placement eligibility query."),
        ("t-1044", "CQ-1044", "user-stu-1", "Examination form payment failed but bank debited", "Exam registration form timed out at gateway.", "cat-exam", "sub-exam-form", "dept-exam", "user-off-exam", "HIGH", "IN_PROGRESS", 0.93, "Exam form fee failure."),
        ("t-1045", "CQ-1045", "user-stu-2", "Room door lock broken in Room A-102", "Door cannot be latched from outside, risk of theft.", "cat-hostel", "sub-hos-maint", "dept-hostel", "user-off-hostel", "HIGH", "RESOLVED", 0.95, "Urgent hostel lock maintenance."),
        ("t-1046", "CQ-1046", "user-stu-3", "Request for Bonafide Certificate for passport renewal", "Applying for passport appointment next Tuesday.", "cat-gen", "sub-gen-inq", "dept-sa", None, "MEDIUM", "ROUTED", 0.91, "Bonafide document request."),
        ("t-1047", "CQ-1047", "user-stu-4", "Bus pass route change request from Route 4 to Route 12", "Relocated residence to West Extension.", "cat-gen", "sub-gen-inq", "dept-sa", None, "LOW", "ASSIGNED", 0.87, "Transport pass adjustment."),
        ("t-1048", "CQ-1048", "user-stu-5", "Attendance for inter-college hackathon participation", "Participated in Smart India Hackathon with Dean approval letter.", "cat-attend", "sub-att-med", "dept-acad", "user-off-acad", "MEDIUM", "CLOSED", 0.92, "Duty leave on duty attendance."),
        ("t-1049", "CQ-1049", "user-stu-6", "Datesheet clash for Open Elective and Core Machine Learning", "Two exams scheduled on 20th Dec Slot 1.", "cat-exam", "sub-exam-clash", "dept-exam", "user-off-exam", "HIGH", "RESOLVED", 0.96, "Examination schedule clash."),
        ("t-1050", "CQ-1050", "user-stu-7", "Wipro interview slot overlapping with internal lab viva", "Requesting TPC to swap interview time slot from 11 AM to 3 PM.", "cat-place", "sub-plc-drv", "dept-tpc", "user-off-tpc", "HIGH", "IN_PROGRESS", 0.94, "Interview slot clash."),
        ("t-1051", "CQ-1051", "user-stu-8", "Hostel caution deposit refund after graduation", "Graduated in 2026, caution deposit not received in bank.", "cat-hostel", "sub-hos-fee", "dept-hostel", "user-off-hostel", "MEDIUM", "WAITING_FOR_STUDENT", 0.90, "Hostel caution money refund."),
        ("t-1052", "CQ-1052", "user-stu-9", "Tuition fee installment extension request", "Requesting 10 days extension for semester fee balance.", "cat-accts", "sub-act-fee", "dept-accounts", "user-off-accts", "MEDIUM", "CLOSED", 0.89, "Fee installment extension."),
        ("t-1053", "CQ-1053", "user-stu-10", "Water supply interrupted in Girls Hostel Block B", "No running water on 4th floor since 7 AM.", "cat-hostel", "sub-hos-maint", "dept-hostel", "user-off-hostel", "HIGH", "RESOLVED", 0.96, "Hostel water utility breakdown."),
        ("t-1054", "CQ-1054", "user-stu-1", "Subject registration in portal shows prerequisite error", "Completed CS201 but CS301 prerequisites check failing.", "cat-attend", "sub-att-corr", "dept-acad", "user-off-acad", "MEDIUM", "RESOLVED", 0.88, "Course registration bug."),
        ("t-1055", "CQ-1055", "user-stu-2", "Admit card photo corrupted / unreadable", "Downloaded admit card shows black square instead of photograph.", "cat-exam", "sub-exam-admit", "dept-exam", "user-off-exam", "HIGH", "IN_PROGRESS", 0.93, "Admit card photo error."),
        ("t-1056", "CQ-1056", "user-stu-3", "Resume upload error on TPC placement portal", "PDF above 2MB failing silently on portal.", "cat-place", "sub-plc-reg", "dept-tpc", "user-off-tpc", "MEDIUM", "CLOSED", 0.91, "TPC portal technical issue."),
        ("t-1057", "CQ-1057", "user-stu-4", "Hostel room AC cooling gas leak", "AC unit blowing warm air in room C-104.", "cat-hostel", "sub-hos-maint", "dept-hostel", "user-off-hostel", "MEDIUM", "IN_PROGRESS", 0.92, "Hostel AC maintenance."),
        ("t-1058", "CQ-1058", "user-stu-5", "Fee receipt not generated after UPI payment", "Transaction ID UPI-882299 marked successful on PhonePe.", "cat-accts", "sub-act-fee", "dept-accounts", "user-off-accts", "HIGH", "RESOLVED", 0.94, "UPI payment reconciliation.")
    ]

    for item in extra_templates:
        tickets_data.append({
            "id": item[0], "num": item[1], "student": item[2], "title": item[3], "desc": item[4],
            "cat": item[5], "sub": item[6], "dept": item[7], "assigned": item[8], "priority": item[9],
            "status": item[10], "conf": item[11], "reason": item[12],
            "created_hours_ago": 36, "resolved_hours_ago": 8 if item[10] in ["RESOLVED", "CLOSED"] else None,
            "closed_hours_ago": 4 if item[10] == "CLOSED" else None,
            "messages": [("user-off-exam" if "exam" in item[7] else "user-off-tpc", "DEPARTMENT_OFFICER", "The matter has been taken up by the desk.", 0, None)],
            "history": [("NEW", "Query raised.", item[2], "Student", "STUDENT"), ("ROUTED", "Routed to department.", None, "Routing Engine", "SYSTEM"), (item[10], f"Status moved to {item[10]}", item[8], "Officer", "DEPARTMENT_OFFICER")]
        })

    # Insert Tickets, Messages, and Histories
    for t in tickets_data:
        c_time = (now - timedelta(hours=t["created_hours_ago"])).strftime("%Y-%m-%d %H:%M:%S")
        u_time = c_time
        r_time = (now - timedelta(hours=t["resolved_hours_ago"])).strftime("%Y-%m-%d %H:%M:%S") if t["resolved_hours_ago"] else None
        cl_time = (now - timedelta(hours=t["closed_hours_ago"])).strftime("%Y-%m-%d %H:%M:%S") if t["closed_hours_ago"] else None

        cur.execute("""
            INSERT INTO tickets (
                id, ticket_number, student_id, title, description,
                category_id, subcategory_id, department_id, assigned_to,
                priority, status, ai_confidence, ai_reasoning,
                created_at, updated_at, resolved_at, closed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            t["id"], t["num"], t["student"], t["title"], t["desc"],
            t["cat"], t["sub"], t["dept"], t["assigned"],
            t["priority"], t["status"], t["conf"], t["reason"],
            c_time, u_time, r_time, cl_time
        ))

        # Insert AI Classification Record
        cur.execute("""
            INSERT INTO ai_classifications (
                ticket_id, raw_prompt, predicted_category, predicted_subcategory,
                predicted_priority, predicted_department, confidence, reasoning, was_overridden,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        """, (
            t["id"], t["desc"], t["cat"], t["sub"],
            t["priority"], t["dept"], t["conf"], t["reason"], c_time
        ))

        # Insert Messages
        for msg in t.get("messages", []):
            sender_id, role, text, internal, att = msg
            cur.execute("""
                INSERT INTO ticket_messages (
                    ticket_id, sender_id, sender_role, message_text, is_internal, attachment_name, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (t["id"], sender_id, role, text, internal, att, c_time))

        # Insert History Transitions
        for h in t.get("history", []):
            cur.execute("""
                INSERT INTO ticket_history (
                    ticket_id, from_state, to_state, actor_id, actor_name, actor_role, note, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (t["id"], "NEW", h[0], h[2], h[3], h[4], h[1], c_time))

    conn.commit()
    conn.close()
    print(f"✅ Successfully seeded CampusQuery database with:")
    print(f"   - {len(departments)} Departments")
    print(f"   - {len(categories)} Categories & {len(subcategories)} Subcategories")
    print(f"   - {len(routing_rules)} Configurable Routing Rules")
    print(f"   - {len(users)} Users (Students, Officers, Admin)")
    print(f"   - {len(tickets_data)} Demo Tickets with full audit trail")

if __name__ == "__main__":
    run_seed()

# 🎓 CampusQuery — AI-Powered College Query Management & Routing System

CampusQuery is a production-grade institutional request management system for universities. It replaces slow, unorganized student grievance processes with an automated **full state-based workflow**:

```
Student Natural Language Query
              │
              ▼
   ┌───────────────────────┐
   │ AI Classifier Service │ (Groq LLM / Robust Heuristic Fallback)
   └───────────┬───────────┘
               │ Structured JSON (Category, Subcategory, Priority, Dept, Confidence)
               ▼
   ┌───────────────────────┐
   │  Confidence Gate &    │  ──( < 60% )──────────► Manual Review Queue / Clarification
   │  Student Confirmation │  ──( 60% - 84% )──────► Interactive Student Confirmation
   └───────────┬───────────┘
               │ ( >= 85% Auto-approved )
               ▼
   ┌───────────────────────┐
   │ Dynamic Routing Engine│ (Matches Category + Subcategory from Configurable DB Rules)
   └───────────┬───────────┘
               │
               ▼
   ┌───────────────────────┐
   │ State Machine Engine  │ NEW ➔ CLASSIFIED ➔ ROUTED ➔ ASSIGNED ➔ IN_PROGRESS
   └───────────┬───────────┘ ➔ WAITING_FOR_STUDENT ➔ RESOLVED ➔ CLOSED (+ Escalated)
               │
               ▼
   ┌────────────────────────────────────────────────────────┐
   │ Multi-Role Dashboards (Student, Department, Super Admin)│
   └────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Features

1. **State-Based Workflow & Audit Trail**:
   - Every ticket navigates a strict state machine: `NEW` &rarr; `CLASSIFYING` &rarr; `CLASSIFIED` &rarr; `ROUTED` &rarr; `ASSIGNED` &rarr; `IN_PROGRESS` &rarr; `WAITING_FOR_STUDENT` &rarr; `WAITING_FOR_DEPARTMENT` &rarr; `RESOLVED` &rarr; `CLOSED`.
   - Supports exceptions: `ESCALATED`, `REJECTED`, and `REOPENED`.
   - Every transition logs the actor, role, timestamp, and audit note.

2. **Dual-Engine AI Query Classifier**:
   - **LLM Mode**: Connected to Groq LLM API (`qwen/qwen3.8-27b`) for zero-shot natural language understanding.
   - **Heuristic Pattern Matcher**: High-accuracy local semantic rule engine with scoring and ambiguity detection.
   - Confidence thresholds:
     - `≥ 85%`: Auto-classifies and routes directly.
     - `60% – 84%`: Prompts student with an interactive confirmation prompt.
     - `< 60%`: Flags ambiguity and sends to the manual review queue.

3. **Configurable Dynamic Routing Rules**:
   - Super Admin can configure `Category + Subcategory → Department`, custom SLA hours, and default priority in real-time.
   - Changes take effect immediately on subsequent queries.

4. **Multi-Role Portals & 1-Click Persona Switcher**:
   - **Student Portal**: Raise queries with live AI classification preview, track tickets, chat with officers, and confirm resolution.
   - **Department Desk**: Filterable queue by department (Examination Cell, TPC, Academic/Attendance Cell, Hostel Admin, Accounts, Student Affairs).
   - **Super Admin**: High-level KPIs, visual analytics, rule configurator, taxonomy tree, and AI threshold tuning.
   - **1-Click Persona Switcher**: Seamlessly switch between demo personas directly in the top navigation bar.

5. **In-App Notification Center**:
   - Bell icon with unread count.
   - Instant notifications on routing, officer assignment, chat replies, and resolution.

---

## 🚀 Quickstart & Installation

### 1. Requirements
- Python 3.10+
- SQLite3 (built-in)

### 2. Setup Environment
```bash
cd /Users/adityachaubey/Downloads/AgenticAI/campusquery
pip install -r requirements.txt
```

### 3. Configure `.env`
Ensure `.env` contains your settings:
```ini
PORT=5055
FLASK_ENV=development
SECRET_KEY=campusquery-super-secret-key-2026

# AI Provider (Groq / OpenAI)
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=qwen/qwen3.8-27b

# Confidence Thresholds
AI_CONFIDENCE_AUTO_ROUTE=0.85
AI_CONFIDENCE_CONFIRMATION=0.60
```

### 4. Seed Demo Data (35 Realistic Tickets + 16 Users)
```bash
python3 seed.py
```

### 5. Run the Application
```bash
python3 app.py
```
Open **`http://localhost:5055`** in your browser.

---

## 🧪 Automated Acceptance Test Suite (7/7)

Run the included acceptance test suite verifying all 7 user-mandated tests:
```bash
python3 test_campusquery.py
```

### Tests Covered:
- **Test 1**: Student submits: `My attendance is incorrect.` &rarr; **Attendance &rarr; Attendance Correction &rarr; Academic & Attendance Cell**.
- **Test 2**: Student submits: `My two exams are at the same time.` &rarr; **Examination &rarr; Exam Clash &rarr; HIGH &rarr; Examination Cell**.
- **Test 3**: Student submits: `I cannot register for the upcoming placement drive.` &rarr; **Placement &rarr; Placement Registration &rarr; TPC**.
- **Test 4**: Student submits: `The fan in my hostel room is not working.` &rarr; **Hostel &rarr; Maintenance &rarr; Hostel Administration**.
- **Test 5**: Ambiguous query submission &rarr; Low confidence (&lt; 60%) &rarr; Clarification prompt & manual review queue.
- **Test 6**: Department resolves ticket &rarr; Student sees updated status &rarr; Confirms resolution &rarr; Ticket state becomes `CLOSED`.
- **Test 7**: Admin changes a routing rule dynamically in DB &rarr; Future query follows the updated routing rule.

You can also run these tests live inside the browser from the **Acceptance Tests (7/7)** sidebar view.

---

## 👥 Demo Personas Available

| Role | Name | Identifier | Department |
|---|---|---|---|
| **Student** | Aditya Chaubey | `21BCSE1024` | Student Portal |
| **Student** | Rhea Sengupta | `21BCSE1045` | Student Portal |
| **Exam Officer** | Prof. Vikram Malhotra | Staff | Examination Cell |
| **TPC Officer** | Mr. Neeraj Joshi | Staff | Training & Placement Cell |
| **Academic Officer** | Dr. Kavita Menon | Staff | Academic & Attendance Cell |
| **Hostel Warden** | Warden Harish Chandra | Staff | Hostel Administration |
| **Accounts Officer** | Mr. Santosh Gupta | Staff | Accounts Department |
| **Super Admin** | Dean Office Super Admin | Admin | Institutional Super Admin |

---

## 📂 Project Architecture

```
campusquery/
├── .env.example
├── .env
├── requirements.txt
├── README.md
├── app.py                   # Flask server, REST API endpoints, routing
├── config.py                # Configuration & environment variables
├── database.py              # SQLite schema, migrations, connection pool
├── seed.py                  # Realistic seed generator (35 demo tickets, users, depts)
├── test_campusquery.py      # Automated acceptance test suite
├── services/
│   ├── ai_classifier.py     # Groq LLM + Heuristic pattern matching & confidence scoring
│   ├── routing_engine.py    # Configurable DB-driven dynamic routing engine
│   ├── state_machine.py     # Ticket state machine transitions & audit logging
│   └── notification_service.py # In-app notification dispatcher
├── templates/
│   └── index.html           # Single Page Application container
└── static/
    ├── css/
    │   └── style.css        # Modern institutional design system & responsive styling
    └── js/
        └── app.js           # Client-side state, view routing, chat, live AI preview
```

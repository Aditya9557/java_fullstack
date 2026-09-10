"""
services/ai_classifier.py - Dual-Engine AI Query Classification Service.

Features:
1. Groq / OpenAI LLM Inference with structured JSON schema.
2. Robust Heuristic Rule & Pattern Classifier as fallback (or offline/fast mode).
3. Ambiguity & Low Confidence Detection with clarification suggestions.
4. Priority Extraction (HIGH for exam clashes, deadlines today, urgent utility failures).
"""
import os
import re
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Core Knowledge Base for Rule-Based Classification
CATEGORY_KNOWLEDGE = {
    "Examination": {
        "department": "Examination Cell",
        "subcategories": {
            "Exam Clash": {
                "keywords": ["clash", "overlap", "same time", "same date", "two exams", "simultaneous"],
                "default_priority": "HIGH",
                "reason": "Student reports an examination schedule conflict/overlap."
            },
            "Exam Schedule": {
                "keywords": ["schedule", "timetable", "date sheet", "datesheet", "exam timing", "when is my exam"],
                "default_priority": "MEDIUM",
                "reason": "Student inquires about examination schedule or dates."
            },
            "Admit Card": {
                "keywords": ["admit card", "hall ticket", "download admit", "cannot download admit", "hallticket"],
                "default_priority": "HIGH",
                "reason": "Student is unable to download or access examination hall ticket/admit card."
            },
            "Examination Form": {
                "keywords": ["exam form", "examination form", "fill form", "registration for exam", "exam fee receipt"],
                "default_priority": "MEDIUM",
                "reason": "Student has an issue filling or submitting the examination form."
            },
            "Examination Result": {
                "keywords": ["result", "marksheet", "grade card", "cgpa", "sgpa", "re-evaluation", "rechecking", "backlog"],
                "default_priority": "MEDIUM",
                "reason": "Query pertains to examination results, grades, or re-evaluation."
            }
        },
        "general_keywords": ["exam", "examination", "semester exam", "mid-term", "end-term", "test clash", "marksheet"]
    },
    "Attendance": {
        "department": "Academic/Attendance Cell",
        "subcategories": {
            "Attendance Correction": {
                "keywords": ["correction", "marked absent", "showing incorrectly", "percentage is wrong", "attended most", "present but absent", "wrong attendance"],
                "default_priority": "MEDIUM",
                "reason": "Student reports a discrepancy in recorded attendance."
            },
            "Medical Leave": {
                "keywords": ["medical", "doctor certificate", "hospital", "sick leave", "duty leave", "medical leave not updated"],
                "default_priority": "MEDIUM",
                "reason": "Student requests attendance consideration for medical or approved leave."
            },
            "Attendance Shortage": {
                "keywords": ["shortage", "detained", "below 75", "low attendance", "below minimum", "debar"],
                "default_priority": "HIGH",
                "reason": "Student is flagged or worried about attendance shortage / debarment."
            },
            "Attendance Policy": {
                "keywords": ["minimum attendance", "policy", "rules", "attendance criteria", "how much attendance required"],
                "default_priority": "LOW",
                "reason": "Inquiry regarding official college attendance regulations."
            }
        },
        "general_keywords": ["attendance", "present", "absent", "percentage", "biometric", "class attendance"]
    },
    "Placement": {
        "department": "TPC",
        "subcategories": {
            "Placement Registration": {
                "keywords": ["register for placement", "placement registration", "tpc portal", "signup drive", "register for drive", "portal login"],
                "default_priority": "HIGH",
                "reason": "Student needs assistance registering for placement activities or portal."
            },
            "Company Drive": {
                "keywords": ["company drive", "infosys", "tcs", "google", "microsoft", "wipro", "upcoming drive", "recruiter", "interview round", "oa test"],
                "default_priority": "MEDIUM",
                "reason": "Query regarding a specific company recruitment drive or schedule."
            },
            "Placement Selection": {
                "keywords": ["shortlisted", "selected", "not shortlisted", "why was i not", "shortlist criteria", "rejected in round", "placement selection"],
                "default_priority": "MEDIUM",
                "reason": "Inquiry regarding shortlisting or selection status for a placement drive."
            },
            "Placement Eligibility": {
                "keywords": ["eligibility", "criteria", "cgpa cutoff", "backlog allowed", "eligible for placement"],
                "default_priority": "LOW",
                "reason": "Inquiry regarding placement eligibility criteria or requirements."
            }
        },
        "general_keywords": ["placement", "tpc", "training and placement", "job", "internship", "campus drive", "hiring", "recruit"]
    },
    "Hostel": {
        "department": "Hostel Administration",
        "subcategories": {
            "Maintenance": {
                "keywords": ["fan", "light", "water", "geyser", "tap", "bathroom", "cleaning", "plumber", "electrician", "ac not cooling", "broken bed", "maintenance"],
                "default_priority": "MEDIUM",
                "reason": "Student reports a facility, electrical, or plumbing maintenance issue in the hostel."
            },
            "Room Allocation": {
                "keywords": ["room allocation", "allotment", "change room", "roommate", "single room", "hostel transfer"],
                "default_priority": "MEDIUM",
                "reason": "Query regarding hostel room allotment, allocation, or exchange."
            },
            "Hostel Fees": {
                "keywords": ["hostel fee", "mess fee", "refund hostel", "dues hostel", "hostel caution money"],
                "default_priority": "MEDIUM",
                "reason": "Query regarding hostel accommodation or mess fee payments."
            },
            "Mess": {
                "keywords": ["mess food", "food quality", "mess timing", "breakfast", "dinner", "canteen", "diet"],
                "default_priority": "LOW",
                "reason": "Student query or complaint regarding hostel mess catering."
            }
        },
        "general_keywords": ["hostel", "room", "warden", "block", "hostel resident", "mess"]
    },
    "Accounts": {
        "department": "Accounts",
        "subcategories": {
            "Fee Payment": {
                "keywords": ["tuition fee", "college fee", "fee receipt", "challan", "payment gateway", "fee payment error", "double debited"],
                "default_priority": "HIGH",
                "reason": "Issue concerning college fee transaction, payment verification, or receipt."
            },
            "Scholarship": {
                "keywords": ["scholarship", "nsp", "merit scholarship", "financial aid", "fee concession", "fee waiver"],
                "default_priority": "MEDIUM",
                "reason": "Student inquiry regarding scholarships or financial concessions."
            }
        },
        "general_keywords": ["fee", "payment", "accounts", "dues", "challan", "scholarship", "refund"]
    },
    "General": {
        "department": "Student Affairs",
        "subcategories": {
            "ID Card": {
                "keywords": ["id card", "identity card", "lost id", "new id card", "smart card"],
                "default_priority": "MEDIUM",
                "reason": "Student reports lost ID card or requires a replacement identity badge."
            },
            "General Inquiry": {
                "keywords": ["help", "guidance", "contact", "transport", "bus pass", "bonafide", "certificate"],
                "default_priority": "LOW",
                "reason": "General student affairs inquiry or document request."
            }
        },
        "general_keywords": ["student affairs", "general", "bonafide", "bus", "library", "id card"]
    }
}


class AIClassifierService:
    """Intelligent classification service combining LLM and Heuristic Fallbacks."""

    def __init__(self):
        from config import GROQ_API_KEY, GROQ_MODEL, OPENAI_API_KEY, OPENAI_MODEL, AI_PROVIDER
        self.provider = AI_PROVIDER
        self.groq_api_key = GROQ_API_KEY
        self.groq_model = GROQ_MODEL
        self.openai_api_key = OPENAI_API_KEY
        self.openai_model = OPENAI_MODEL

    def classify_query(self, query_text: str) -> Dict[str, Any]:
        """
        Classify a student's natural language query into category, subcategory,
        priority, department, confidence, and reasoning.
        """
        clean_text = (query_text or "").strip()
        if not clean_text:
            return {
                "category": "General",
                "subcategory": "General Inquiry",
                "priority": "LOW",
                "department": "Student Affairs",
                "confidence": 0.0,
                "reason": "Query is empty.",
                "is_ambiguous": True,
                "clarification_question": "Please describe your issue in a few sentences so we can direct it properly."
            }

        # Check for obvious ambiguous phrases first
        if len(clean_text.split()) < 3 and not any(k in clean_text.lower() for k in ["exam", "hostel", "tpc", "fee", "fan"]):
            return {
                "category": "General",
                "subcategory": "General Inquiry",
                "priority": "LOW",
                "department": "Student Affairs",
                "confidence": 0.45,
                "reason": "Query is too brief or ambiguous to reliably classify.",
                "is_ambiguous": True,
                "clarification_question": "Could you provide more context? Is your problem related to Examinations, Attendance, Placement/TPC, or Hostel?"
            }

        # Try LLM classification first if API key is present
        if self.groq_api_key and self.groq_api_key.startswith("gsk_"):
            try:
                llm_result = self._classify_with_llm(clean_text)
                if llm_result and "category" in llm_result:
                    return llm_result
            except Exception as e:
                logger.warning(f"LLM classification failed: {e}. Falling back to heuristic rule engine.")

        # Heuristic Rule Engine Fallback
        return self._classify_with_heuristics(clean_text)

    def _classify_with_llm(self, query: str) -> Optional[Dict[str, Any]]:
        """Call Groq / OpenAI LLM for high-accuracy zero-shot reasoning."""
        try:
            from openai import OpenAI
            client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=self.groq_api_key
            )

            system_prompt = """You are an institutional AI Query Classifier for a university request management system called CampusQuery.
Your task is to analyze a student's natural language query and output structured JSON.

Allowed Categories and their primary Departments:
1. "Examination" -> "Examination Cell"
   Subcategories: "Exam Clash", "Exam Schedule", "Admit Card", "Examination Form", "Examination Result", "Other Examination Issue"
2. "Attendance" -> "Academic/Attendance Cell"
   Subcategories: "Attendance Correction", "Attendance Shortage", "Medical Leave", "Attendance Policy", "Other Attendance Issue"
3. "Placement" -> "TPC"
   Subcategories: "Placement Registration", "Company Drive", "Placement Selection", "Placement Eligibility", "Other Placement Issue"
4. "Hostel" -> "Hostel Administration"
   Subcategories: "Maintenance", "Room Allocation", "Hostel Fees", "Mess", "Electricity/Water", "Other Hostel Issue"
5. "Accounts" -> "Accounts"
   Subcategories: "Fee Payment", "Scholarship", "Other Accounts Issue"
6. "General" -> "Student Affairs"
   Subcategories: "ID Card", "General Inquiry"

Priorities:
- HIGH: Exam clashes, imminent deadlines, unable to access mandatory exam/admit card, critical hostel utility/safety breakdown (e.g. electrical/water emergency).
- MEDIUM: Attendance discrepancy, regular hostel maintenance, company drive inquiry, grade clarification.
- LOW: Policy queries, general information requests.

Confidence:
- Return a number between 0.0 and 1.0.
- If ambiguous, return confidence < 0.60, is_ambiguous = true, and provide a clarification_question.

Return strictly valid JSON with no markdown formatting:
{
  "category": string,
  "subcategory": string,
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "department": string,
  "confidence": float,
  "reason": string,
  "is_ambiguous": boolean,
  "clarification_question": string or null
}"""

            response = client.chat.completions.create(
                model=self.groq_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            parsed = json.loads(content)
            
            # Normalize priority to uppercase
            if "priority" in parsed:
                parsed["priority"] = str(parsed["priority"]).upper()
                if parsed["priority"] not in ["HIGH", "MEDIUM", "LOW"]:
                    parsed["priority"] = "MEDIUM"

            return parsed
        except Exception as err:
            logger.warning(f"Groq API call error: {err}")
            return None

    def _classify_with_heuristics(self, query: str) -> Dict[str, Any]:
        """Comprehensive semantic and keyword pattern matcher."""
        q_lower = query.lower()

        # Specific high-priority pattern matches
        if any(w in q_lower for w in ["two exams", "exam clash", "same time", "same slot", "scheduled at the same time", "clashing exam"]):
            return {
                "category": "Examination",
                "subcategory": "Exam Clash",
                "priority": "HIGH",
                "department": "Examination Cell",
                "confidence": 0.96,
                "reason": "Student reports overlapping examination schedules.",
                "is_ambiguous": False,
                "clarification_question": None
            }

        if any(w in q_lower for w in ["admit card", "hall ticket", "download admit"]):
            return {
                "category": "Examination",
                "subcategory": "Admit Card",
                "priority": "HIGH",
                "department": "Examination Cell",
                "confidence": 0.94,
                "reason": "Student cannot access or download examination admit card.",
                "is_ambiguous": False,
                "clarification_question": None
            }

        if any(w in q_lower for w in ["attendance", "present", "absent", "attendance percentage", "marked absent", "showing incorrectly"]):
            if any(w in q_lower for w in ["medical", "doctor", "hospital", "sick"]):
                return {
                    "category": "Attendance",
                    "subcategory": "Medical Leave",
                    "priority": "MEDIUM",
                    "department": "Academic/Attendance Cell",
                    "confidence": 0.93,
                    "reason": "Student requests medical leave attendance updating.",
                    "is_ambiguous": False,
                    "clarification_question": None
                }
            if any(w in q_lower for w in ["minimum", "policy", "criteria", "rule"]):
                return {
                    "category": "Attendance",
                    "subcategory": "Attendance Policy",
                    "priority": "LOW",
                    "department": "Academic/Attendance Cell",
                    "confidence": 0.91,
                    "reason": "Student inquires about official attendance threshold requirements.",
                    "is_ambiguous": False,
                    "clarification_question": None
                }
            return {
                "category": "Attendance",
                "subcategory": "Attendance Correction",
                "priority": "MEDIUM",
                "department": "Academic/Attendance Cell",
                "confidence": 0.92,
                "reason": "Student reports attendance recording discrepancy.",
                "is_ambiguous": False,
                "clarification_question": None
            }

        if any(w in q_lower for w in ["placement", "tpc", "shortlist", "drive", "infosys", "tcs", "recruitment", "interview round"]):
            if any(w in q_lower for w in ["register", "portal login", "registration", "sign up"]):
                return {
                    "category": "Placement",
                    "subcategory": "Placement Registration",
                    "priority": "HIGH" if "today" in q_lower or "deadline" in q_lower else "MEDIUM",
                    "department": "TPC",
                    "confidence": 0.94,
                    "reason": "Student has issue registering for placement activities.",
                    "is_ambiguous": False,
                    "clarification_question": None
                }
            if any(w in q_lower for w in ["shortlist", "selected", "not selected", "selection"]):
                return {
                    "category": "Placement",
                    "subcategory": "Placement Selection",
                    "priority": "MEDIUM",
                    "department": "TPC",
                    "confidence": 0.93,
                    "reason": "Student inquiries regarding placement selection / shortlist status.",
                    "is_ambiguous": False,
                    "clarification_question": None
                }
            return {
                "category": "Placement",
                "subcategory": "Company Drive",
                "priority": "MEDIUM",
                "department": "TPC",
                "confidence": 0.91,
                "reason": "Student query regarding placement recruitment drive.",
                "is_ambiguous": False,
                "clarification_question": None
            }

        if any(w in q_lower for w in ["hostel", "room", "fan", "light", "mess", "geyser", "tap", "warden"]):
            if any(w in q_lower for w in ["fan", "light", "water", "geyser", "tap", "repair", "not working", "broken"]):
                return {
                    "category": "Hostel",
                    "subcategory": "Maintenance",
                    "priority": "HIGH" if any(w in q_lower for w in ["fire", "spark", "electric shock", "flood"]) else "MEDIUM",
                    "department": "Hostel Administration",
                    "confidence": 0.95,
                    "reason": "Student reports a hostel maintenance / repair request.",
                    "is_ambiguous": False,
                    "clarification_question": None
                }
            if any(w in q_lower for w in ["allocation", "allotment", "change room"]):
                return {
                    "category": "Hostel",
                    "subcategory": "Room Allocation",
                    "priority": "MEDIUM",
                    "department": "Hostel Administration",
                    "confidence": 0.92,
                    "reason": "Student inquiry regarding hostel room allocation.",
                    "is_ambiguous": False,
                    "clarification_question": None
                }
            return {
                "category": "Hostel",
                "subcategory": "Maintenance",
                "priority": "MEDIUM",
                "department": "Hostel Administration",
                "confidence": 0.88,
                "reason": "Query belongs to hostel accommodation and facilities.",
                "is_ambiguous": False,
                "clarification_question": None
            }

        if any(w in q_lower for w in ["fee", "tuition", "payment", "scholarship", "challan"]):
            return {
                "category": "Accounts",
                "subcategory": "Fee Payment",
                "priority": "HIGH" if "double debited" in q_lower or "failed" in q_lower else "MEDIUM",
                "department": "Accounts",
                "confidence": 0.90,
                "reason": "Student inquiry regarding college fee payment or transaction.",
                "is_ambiguous": False,
                "clarification_question": None
            }

        if any(w in q_lower for w in ["id card", "identity", "lost id"]):
            return {
                "category": "General",
                "subcategory": "ID Card",
                "priority": "MEDIUM",
                "department": "Student Affairs",
                "confidence": 0.89,
                "reason": "Student reported lost ID card or requires replacement badge.",
                "is_ambiguous": False,
                "clarification_question": None
            }

        # Scoring Fallback across categories
        best_cat = "General"
        best_sub = "General Inquiry"
        best_score = 0
        best_dept = "Student Affairs"
        best_reason = "General student query routed to Student Affairs."

        for cat_name, cat_data in CATEGORY_KNOWLEDGE.items():
            cat_hits = sum(1 for kw in cat_data["general_keywords"] if kw in q_lower)
            for sub_name, sub_data in cat_data["subcategories"].items():
                sub_hits = sum(2 for kw in sub_data["keywords"] if kw in q_lower)
                total = cat_hits + sub_hits
                if total > best_score:
                    best_score = total
                    best_cat = cat_name
                    best_sub = sub_name
                    best_dept = cat_data["department"]
                    best_reason = sub_data["reason"]

        if best_score >= 2:
            confidence = min(0.92, 0.65 + (best_score * 0.08))
            return {
                "category": best_cat,
                "subcategory": best_sub,
                "priority": "MEDIUM",
                "department": best_dept,
                "confidence": round(confidence, 2),
                "reason": best_reason,
                "is_ambiguous": False,
                "clarification_question": None
            }

        # Truly ambiguous query
        return {
            "category": "General",
            "subcategory": "General Inquiry",
            "priority": "LOW",
            "department": "Student Affairs",
            "confidence": 0.52,
            "reason": "Unable to map terms with high certainty; manual review or student clarification required.",
            "is_ambiguous": True,
            "clarification_question": "Is your issue related to an examination schedule conflict, attendance, placement drive, or hostel maintenance?"
        }


# Global Singleton
ai_classifier = AIClassifierService()

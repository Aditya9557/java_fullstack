"""
config.py - Application configuration for CampusQuery
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# Server settings
PORT = int(os.getenv("PORT", 5055))
SECRET_KEY = os.getenv("SECRET_KEY", "campusquery-dev-secret-key")
DEBUG = os.getenv("FLASK_ENV", "development") == "development"

# Database
DB_PATH = BASE_DIR / "campusquery.db"

# AI Configuration
AI_PROVIDER = os.getenv("AI_PROVIDER", "groq")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Confidence thresholds
AI_CONFIDENCE_AUTO_ROUTE = float(os.getenv("AI_CONFIDENCE_AUTO_ROUTE", 0.85))
AI_CONFIDENCE_CONFIRMATION = float(os.getenv("AI_CONFIDENCE_CONFIRMATION", 0.60))

# States
VALID_STATES = [
    "NEW",
    "CLASSIFYING",
    "CLASSIFIED",
    "ROUTED",
    "ASSIGNED",
    "IN_PROGRESS",
    "WAITING_FOR_STUDENT",
    "WAITING_FOR_DEPARTMENT",
    "RESOLVED",
    "CLOSED",
    "ESCALATED",
    "REJECTED",
    "REOPENED"
]

# Priorities
VALID_PRIORITIES = ["HIGH", "MEDIUM", "LOW"]

# Roles
ROLES = ["STUDENT", "DEPARTMENT_OFFICER", "DEPARTMENT_ADMIN", "SUPER_ADMIN"]

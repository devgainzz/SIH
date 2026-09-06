"""
================================================================================
BidVerify AI — GeM Bid Compliance Verification (SIH26100)
Database Engine, Session Management & File Directory Configuration
================================================================================

Description:
    This module configures the database connection using SQLAlchemy ORM and SQLite.
    It manages:
    1. Directory paths for persistent storage (Database, Uploads, Generated PDF Reports).
    2. SQLAlchemy Engine with multi-threading support.
    3. SessionLocal factory for generating database transaction sessions.
    4. Dependency generator 'get_db()' for FastAPI route handlers.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# ------------------------------------------------------------------------------
# 1. Base Directory Paths Setup
# ------------------------------------------------------------------------------
# BACKEND_DIR: Absolute path to the /backend root folder
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# DATA_DIR: Stores the SQLite database file (bidverify.db)
DATA_DIR = os.path.join(BACKEND_DIR, "data")

# UPLOADS_DIR: Stores uploaded vendor bid documents (PDFs, DOCX, TXT, images)
UPLOADS_DIR = os.path.join(BACKEND_DIR, "uploads")

# REPORTS_DIR: Stores generated official GeM Compliance Audit PDF reports
REPORTS_DIR = os.path.join(BACKEND_DIR, "reports")

# Automatically ensure all required directories exist on disk
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

# ------------------------------------------------------------------------------
# 2. Database Connection URL & Engine Configuration
# ------------------------------------------------------------------------------
# SQLite is used for lightweight, self-contained, zero-configuration local deployment
DATABASE_URL = f"sqlite:///{os.path.join(DATA_DIR, 'bidverify.db')}"

# Create SQLAlchemy Database Engine
# connect_args={"check_same_thread": False} is required for SQLite to allow
# multiple asynchronous FastAPI request threads to access the database safely.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# ------------------------------------------------------------------------------
# 3. Session Factory & Declarative Base Model
# ------------------------------------------------------------------------------
# SessionLocal is a session maker factory used to create isolated database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all SQLAlchemy ORM models (Tender, Requirement, VendorBid, etc.)
Base = declarative_base()

# ------------------------------------------------------------------------------
# 4. Dependency Injection for FastAPI Endpoints
# ------------------------------------------------------------------------------
def get_db():
    """
    FastAPI Dependency that yields an active database session for an HTTP request
    and guarantees that the session is closed cleanly after the request completes.

    Yields:
        Session: An active SQLAlchemy database session instance.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

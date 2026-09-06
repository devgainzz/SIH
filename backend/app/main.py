"""
================================================================================
BidVerify AI — GeM Bid Compliance Verification (SIH26100)
FastAPI Main Application & Server Initialization
================================================================================

Description:
    This is the core entrypoint for the FastAPI application.
    It handles:
    1. Automatic SQLite database table creation via SQLAlchemy.
    2. Initial database seeding with realistic GeM sample tenders & vendor bids.
    3. CORS (Cross-Origin Resource Sharing) middleware setup.
    4. Registration of modular REST API routers (/api/tenders, /api/vendors, etc.).
    5. Serving the Single-Page Application (SPA) frontend static files.
    6. System health check endpoint (/api/health).
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.database import engine, Base, SessionLocal
from app.routers import tenders, vendors, compliance, settings
from app.services.sample_data_loader import seed_sample_database

# ------------------------------------------------------------------------------
# 1. Database Table Initialization & Pre-seeding
# ------------------------------------------------------------------------------
# Automatically create all database tables in bidverify.db if they do not exist
Base.metadata.create_all(bind=engine)

# Seed realistic demonstration data (GeM tenders, ISO/turnover certificates, sample bids)
try:
    db = SessionLocal()
    seed_sample_database(db)
    db.close()
except Exception as e:
    print(f"[Database Seed Notice] {str(e)}")

# ------------------------------------------------------------------------------
# 2. FastAPI Application Instance
# ------------------------------------------------------------------------------
app = FastAPI(
    title="BidVerify AI — GeM Bid Compliance Verification API",
    description="AI-powered explainable bid compliance verification engine for Government e-Marketplace (GeM) tenders (SIH26100).",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ------------------------------------------------------------------------------
# 3. CORS Middleware Configuration
# ------------------------------------------------------------------------------
# Enables cross-origin requests from any frontend origin during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# 4. Mount Modular API Routers
# ------------------------------------------------------------------------------
# /api/tenders    : Tender CRUD, requirement parsing, comparison matrices
# /api/vendors    : Vendor proposal submission, file uploads, AI verification trigger
# /api/compliance : Officer manual overrides, audit logging, PDF report export
# /api/settings   : Swappable AI Engine (Smart RAG, Gemini, OpenAI) and OCR settings
app.include_router(tenders.router)
app.include_router(vendors.router)
app.include_router(compliance.router)
app.include_router(settings.router)

# ------------------------------------------------------------------------------
# 5. Static Files & Frontend Web UI Mounting
# ------------------------------------------------------------------------------
# Absolute path to /backend/static containing index.html and app.js
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

# Mount the static directory to serve JavaScript and HTML assets
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ------------------------------------------------------------------------------
# 6. Core System Endpoints
# ------------------------------------------------------------------------------
@app.get("/api/health")
def health_check():
    """
    Health check endpoint to verify backend server status, version, and capabilities.
    """
    return {
        "status": "healthy",
        "system": "BidVerify AI (GeM SIH26100)",
        "version": "1.0.0",
        "description": "AI-Powered Explainable Bid Compliance Verification"
    }


@app.get("/")
def serve_index():
    """
    Serves the Single-Page Application (SPA) web interface (index.html).
    """
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "message": "BidVerify AI Backend is running. Open /docs for API documentation or place frontend in /static."
    }

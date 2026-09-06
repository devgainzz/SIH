"""
================================================================================
BidVerify AI — GeM Bid Compliance Verification & Audit Platform (SIH26100)
Main Application Launcher / Server Entrypoint
================================================================================

Description:
    This script initializes the environment and launches the high-performance
    FastAPI web server using Uvicorn. It hosts both the backend REST APIs
    and the single-page web interface on http://localhost:8000.

Usage:
    python run.py
"""

import sys
import os

# ------------------------------------------------------------------------------
# STEP 1: Configure Python Path
# ------------------------------------------------------------------------------
# Ensure the 'backend' directory is included in Python's module lookup path (sys.path).
# This allows modules inside 'backend/app' to import each other cleanly.
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

import uvicorn

# ------------------------------------------------------------------------------
# STEP 2: Main Execution Block
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 75)
    print("  🇮🇳 BidVerify AI — Government e-Marketplace (GeM) Verification Portal")
    print("  Smart India Hackathon (SIH26100) — Technical Evaluation System")
    print("  Server URL : http://localhost:8000")
    print("  API Docs   : http://localhost:8000/docs")
    print("=" * 75)

    # Launch the FastAPI application using Uvicorn ASGI server
    # - "app.main:app": Points to the 'app' FastAPI instance inside backend/app/main.py
    # - host="0.0.0.0": Listens on all network interfaces (accessible locally and on LAN)
    # - port=8000: Default HTTP port for the web portal
    # - reload=True: Enables hot-reloading during development when code changes
    # - app_dir=backend_path: Specifies the working root for application modules
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        app_dir=backend_path
    )

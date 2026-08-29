import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.database import engine, Base, SessionLocal
from app.routers import tenders, vendors, compliance, settings
from app.services.sample_data_loader import seed_sample_database

# Create tables
Base.metadata.create_all(bind=engine)

# Seed sample data
try:
    db = SessionLocal()
    seed_sample_database(db)
    db.close()
except Exception as e:
    print(f"[Database Seed Notice] {str(e)}")

app = FastAPI(
    title="BidVerify AI — GeM Bid Compliance Verification API",
    description="AI-powered bid compliance verification engine for Government e-Marketplace (GeM) tenders (SIH26100).",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(tenders.router)
app.include_router(vendors.router)
app.include_router(compliance.router)
app.include_router(settings.router)

# Mount Static Frontend
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "system": "BidVerify AI (GeM SIH26100)",
        "version": "1.0.0",
        "description": "AI-Powered Explainable Bid Compliance Verification"
    }

@app.get("/")
def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "BidVerify AI Backend is running. Open /docs for API documentation or place frontend in /static."}


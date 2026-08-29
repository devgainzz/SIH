import sys
import os

# Add backend to sys.path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

import uvicorn

if __name__ == "__main__":
    print("=" * 70)
    print("  BidVerify AI — GeM Bid Compliance Verification Platform")
    print("  Smart India Hackathon (SIH26100)")
    print("  Starting server on http://localhost:8000 ...")
    print("=" * 70)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, app_dir=backend_path)


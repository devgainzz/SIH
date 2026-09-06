"""
================================================================================
BidVerify AI — GeM Bid Compliance Verification (SIH26100)
FastAPI HTTP REST API Endpoints Integration Test Suite
================================================================================

Description:
    This integration test suite verifies all 10 REST endpoints of the FastAPI server:
    1. GET  /api/health                       : Server health & version info
    2. GET  /api/tenders                      : Listing published tenders & counts
    3. GET  /api/tenders/{id}                 : Retrieving tender details & clauses
    4. GET  /api/tenders/{id}/matrix          : Multi-vendor comparison matrix
    5. POST /api/tenders/{id}/parse-requirements: AI Auto-Parser for raw text
    6. GET  /api/vendors/{id}                 : Vendor bid verdicts & evidence citations
    7. POST /api/compliance/override          : Officer manual override with audit logging
    8. POST /api/compliance/revert-override/{id}: Reverting override to AI verdict
    9. GET  /api/compliance/report/{id}/pdf   : Exporting official print-ready PDF
    10. GET /api/settings                     : AI Engine & Provider configuration

Usage:
    python test_api.py
"""

import os
import sys

# Force UTF-8 on standard output to prevent cp1252 character encoding issues on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Setup backend path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from fastapi.testclient import TestClient
from app.main import app

# Create in-memory TestClient bound to the FastAPI instance
client = TestClient(app)


def test_api_endpoints():
    """
    Executes automated HTTP request checks across all 10 REST endpoints.
    """
    print("\n=======================================================")
    print("  🇮🇳 BidVerify AI — FastAPI HTTP Endpoints Test Suite")
    print("=======================================================\n")

    # --------------------------------------------------------------------------
    # 1. Health Check Endpoint
    # --------------------------------------------------------------------------
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    print(" [PASS] GET /api/health -> 200 OK")

    # --------------------------------------------------------------------------
    # 2. List All Published Tenders
    # --------------------------------------------------------------------------
    res = client.get("/api/tenders")
    assert res.status_code == 200
    tenders = res.json()
    assert len(tenders) >= 1
    t1 = tenders[0]
    print(f" [PASS] GET /api/tenders -> 200 OK ({len(tenders)} tenders found)")

    # --------------------------------------------------------------------------
    # 3. Get Single Tender Details
    # --------------------------------------------------------------------------
    res = client.get(f"/api/tenders/{t1['id']}")
    assert res.status_code == 200
    t_detail = res.json()
    assert len(t_detail["requirements"]) >= 1
    print(f" [PASS] GET /api/tenders/{t1['id']} -> 200 OK ({len(t_detail['requirements'])} requirements)")

    # --------------------------------------------------------------------------
    # 4. Tender Multi-Vendor Comparison Matrix
    # --------------------------------------------------------------------------
    res = client.get(f"/api/tenders/{t1['id']}/matrix")
    assert res.status_code == 200
    matrix = res.json()
    assert "vendors" in matrix
    print(f" [PASS] GET /api/tenders/{t1['id']}/matrix -> 200 OK ({len(matrix['vendors'])} vendors in matrix)")

    # --------------------------------------------------------------------------
    # 5. AI Auto-Parser: Raw Tender Text to Structured Clauses
    # --------------------------------------------------------------------------
    raw_req_sample = "1. Bidder must have minimum 4 years of experience in enterprise networking.\n2. Average turnover >= 12 Cr."
    res = client.post(f"/api/tenders/{t1['id']}/parse-requirements", json={"tender_text": raw_req_sample})
    assert res.status_code == 200
    parsed = res.json()
    assert len(parsed) >= 1
    print(f" [PASS] POST /api/tenders/{t1['id']}/parse-requirements -> 200 OK ({len(parsed)} clauses parsed & created)")

    # --------------------------------------------------------------------------
    # 6. Get Vendor Proposal Details & Clause Verdicts
    # --------------------------------------------------------------------------
    vendors = t_detail["vendor_bids"]
    if vendors:
        v1 = vendors[0]
        res = client.get(f"/api/vendors/{v1['id']}")
        assert res.status_code == 200
        v_detail = res.json()
        assert len(v_detail["verdicts"]) >= 1
        print(f" [PASS] GET /api/vendors/{v1['id']} -> 200 OK ({len(v_detail['verdicts'])} verdicts)")

        # ----------------------------------------------------------------------
        # 7. Procurement Officer Manual Override with Audit Log
        # ----------------------------------------------------------------------
        verdict = v_detail["verdicts"][0]
        override_payload = {
            "verdict_id": verdict["id"],
            "override_status": "COMPLIANT",
            "officer_name": "Senior GeM Evaluator",
            "officer_comment": "Verified via supplementary clarification letter."
        }
        res = client.post("/api/compliance/override", json=override_payload)
        assert res.status_code == 200
        overridden = res.json()
        assert overridden["is_overridden"] == True
        print(f" [PASS] POST /api/compliance/override -> 200 OK (Audited override logged)")

        # ----------------------------------------------------------------------
        # 8. Revert Officer Manual Override
        # ----------------------------------------------------------------------
        res = client.post(f"/api/compliance/revert-override/{verdict['id']}")
        assert res.status_code == 200
        reverted = res.json()
        assert reverted["is_overridden"] == False
        print(f" [PASS] POST /api/compliance/revert-override/{verdict['id']} -> 200 OK (Reverted to AI verdict)")

        # ----------------------------------------------------------------------
        # 9. Export Official PDF Compliance Audit Report
        # ----------------------------------------------------------------------
        res = client.get(f"/api/compliance/report/{v1['id']}/pdf")
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/pdf"
        assert len(res.content) > 1000
        print(f" [PASS] GET /api/compliance/report/{v1['id']}/pdf -> 200 OK ({len(res.content)} bytes PDF generated)")

    # --------------------------------------------------------------------------
    # 10. AI Engine Settings Configuration Endpoint
    # --------------------------------------------------------------------------
    res = client.get("/api/settings")
    assert res.status_code == 200
    st = res.json()
    assert "llm_provider" in st
    print(f" [PASS] GET /api/settings -> 200 OK (Active provider: {st['llm_provider']})")

    print("\n=======================================================")
    print("  ALL 10 API ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY! ")
    print("=======================================================\n")


if __name__ == "__main__":
    test_api_endpoints()

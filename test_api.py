import os
import sys

# Force UTF-8 on stdout for Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_endpoints():
    print("\n=======================================================")
    print("  BidVerify AI — FastAPI HTTP Endpoints Test Suite")
    print("=======================================================\n")

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    print(" [PASS] GET /api/health -> 200 OK")

    # 2. List tenders
    res = client.get("/api/tenders")
    assert res.status_code == 200
    tenders = res.json()
    assert len(tenders) >= 1
    t1 = tenders[0]
    print(f" [PASS] GET /api/tenders -> 200 OK ({len(tenders)} tenders found)")

    # 3. Get tender detail
    res = client.get(f"/api/tenders/{t1['id']}")
    assert res.status_code == 200
    t_detail = res.json()
    assert len(t_detail["requirements"]) >= 1
    print(f" [PASS] GET /api/tenders/{t1['id']} -> 200 OK ({len(t_detail['requirements'])} requirements)")

    # 4. Tender comparison matrix
    res = client.get(f"/api/tenders/{t1['id']}/matrix")
    assert res.status_code == 200
    matrix = res.json()
    assert "vendors" in matrix
    print(f" [PASS] GET /api/tenders/{t1['id']}/matrix -> 200 OK ({len(matrix['vendors'])} vendors in matrix)")

    # 5. Parse requirements endpoint
    raw_req_sample = "1. Bidder must have minimum 4 years of experience in enterprise networking.\n2. Average turnover >= 12 Cr."
    res = client.post(f"/api/tenders/{t1['id']}/parse-requirements", json={"tender_text": raw_req_sample})
    assert res.status_code == 200
    parsed = res.json()
    assert len(parsed) >= 1
    print(f" [PASS] POST /api/tenders/{t1['id']}/parse-requirements -> 200 OK ({len(parsed)} clauses parsed & created)")

    # 6. Get vendor detail & verdicts
    vendors = t_detail["vendor_bids"]
    if vendors:
        v1 = vendors[0]
        res = client.get(f"/api/vendors/{v1['id']}")
        assert res.status_code == 200
        v_detail = res.json()
        assert len(v_detail["verdicts"]) >= 1
        print(f" [PASS] GET /api/vendors/{v1['id']} -> 200 OK ({len(v_detail['verdicts'])} verdicts)")

        # 7. Officer Override endpoint
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

        # 8. Revert override
        res = client.post(f"/api/compliance/revert-override/{verdict['id']}")
        assert res.status_code == 200
        reverted = res.json()
        assert reverted["is_overridden"] == False
        print(f" [PASS] POST /api/compliance/revert-override/{verdict['id']} -> 200 OK (Reverted to AI verdict)")

        # 9. PDF Report Export
        res = client.get(f"/api/compliance/report/{v1['id']}/pdf")
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/pdf"
        assert len(res.content) > 1000
        print(f" [PASS] GET /api/compliance/report/{v1['id']}/pdf -> 200 OK ({len(res.content)} bytes PDF generated)")

    # 10. Settings endpoint
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


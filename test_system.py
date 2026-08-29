import os
import sys
import json

# Force UTF-8 on stdout for Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Setup backend path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.database import engine, Base, SessionLocal, REPORTS_DIR
from app.models import Tender, Requirement, VendorBid, Document, ComplianceVerdict
from app.services.sample_data_loader import seed_sample_database
from app.services.document_processor import DocumentProcessor
from app.services.compliance_engine import ComplianceEngine
from app.services.report_generator import ReportGenerator

def run_verification_tests():
    print("\n=======================================================")
    print("  BidVerify AI (SIH26100) — System Verification Suite")
    print("=======================================================\n")

    # 1. Database Init & Seeding
    print("[Test 1/5] Initializing Database & Seeding Sample GeM Data...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_sample_database(db)
    
    tenders = db.query(Tender).all()
    print(f" -> Found {len(tenders)} Tenders in database:")
    for t in tenders:
        req_count = db.query(Requirement).filter(Requirement.tender_id == t.id).count()
        ven_count = db.query(VendorBid).filter(VendorBid.tender_id == t.id).count()
        print(f"    * [{t.bid_number}] {t.title[:45]}... ({req_count} reqs, {ven_count} vendors)")
    assert len(tenders) >= 1, "Tenders must be seeded"
    print(" [PASS] Database Initialization & Seeding OK\n")

    # 2. Document Processor Verification
    print("[Test 2/5] Testing Document Text Chunking & Page Metadata Extraction...")
    sample_text = """M/S TEST BIDDER LTD
Average Turnover for 3 years: INR 22.50 Crores.
ISO 9001:2015 Certificate No: ISO/2024/9912, Valid until 10-Aug-2028.
GSTIN: 07AABCU1234F1Z8.
Experience of over 8 years in server deployments.
"""
    tmp_path = os.path.join(backend_path, "uploads", "test_doc.txt")
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(sample_text)

    pages, chunks, text = DocumentProcessor.process_file(tmp_path, "test_doc.txt")
    print(f" -> Processed file: pages={pages}, chunks={len(chunks)}")
    assert len(chunks) >= 1, "Chunks must be extracted"
    assert "22.50 Crores" in chunks[0]["text"], "Turnover must be in extracted text"
    print(" [PASS] Document Processing OK\n")

    # 3. AI Compliance Engine Verification
    print("[Test 3/5] Testing Compliance Engine on Criteria Clauses...")
    # Test Turnover requirement
    req_turnover = {
        "title": "Annual Financial Turnover",
        "description": "Minimum average annual turnover >= 10 Crores",
        "category": "FINANCIAL",
        "requirement_type": "NUMERIC_THRESHOLD",
        "threshold_value": "10.0"
    }
    verdict = ComplianceEngine._evaluate_with_smart_engine(req_turnover, chunks)
    print(f" -> Turnover Verdict: status={verdict['status']}, extracted={verdict['extracted_value']}, conf={verdict['confidence_score']}%")
    print(f"    Reasoning: {verdict['reasoning']}")
    assert verdict["status"] == "COMPLIANT", "22.50 Cr should satisfy >= 10 Cr"
    assert "22.50" in verdict["extracted_value"]

    # Test ISO Certificate requirement
    req_iso = {
        "title": "ISO 9001 Quality Certification",
        "description": "Valid ISO 9001:2015 accreditation certificate",
        "category": "CERTIFICATION",
        "requirement_type": "CERTIFICATE"
    }
    verdict_iso = ComplianceEngine._evaluate_with_smart_engine(req_iso, chunks)
    print(f" -> ISO Verdict: status={verdict_iso['status']}, extracted={verdict_iso['extracted_value']}")
    assert verdict_iso["status"] == "COMPLIANT", "Valid ISO until 2028 should be COMPLIANT"

    # Test Non-compliant scenario (below threshold)
    low_chunks = [{"document_name": "turnover.txt", "page_number": 1, "text": "Annual turnover is Rs 3.5 Crores."}]
    verdict_low = ComplianceEngine._evaluate_with_smart_engine(req_turnover, low_chunks)
    print(f" -> Deficient Turnover Verdict: status={verdict_low['status']}, extracted={verdict_low['extracted_value']}")
    assert verdict_low["status"] == "NON_COMPLIANT", "3.5 Cr should be NON_COMPLIANT for 10 Cr threshold"
    print(" [PASS] Compliance Matching & Threshold Logic OK\n")

    # 4. Multi-Vendor Evaluation & Officer Override
    print("[Test 4/5] Testing Vendor Audit Verdicts & Officer Manual Override...")
    vendor_alpha = db.query(VendorBid).filter(VendorBid.vendor_name.like("%AlphaTech%")).first()
    assert vendor_alpha is not None, "AlphaTech must exist"
    print(f" -> AlphaTech Status: {vendor_alpha.overall_status}, Score: {vendor_alpha.compliance_score}%, Compliant: {vendor_alpha.compliant_count}")

    # Test Officer Override on a verdict
    first_verdict = db.query(ComplianceVerdict).filter(ComplianceVerdict.vendor_bid_id == vendor_alpha.id).first()
    assert first_verdict is not None
    orig_status = first_verdict.status
    
    first_verdict.is_overridden = True
    first_verdict.officer_override_status = "NON_COMPLIANT"
    first_verdict.officer_name = "Chief Procurement Officer"
    first_verdict.officer_comment = "Audited: Clarification on clause 3.1 needed."
    db.commit()
    db.refresh(first_verdict)
    
    assert first_verdict.is_overridden == True
    assert first_verdict.officer_override_status == "NON_COMPLIANT"
    print(f" -> Manual Override recorded: [Overridden to {first_verdict.officer_override_status}] by {first_verdict.officer_name}")

    # Revert override
    first_verdict.is_overridden = False
    first_verdict.officer_override_status = None
    db.commit()
    print(" [PASS] Officer Override & Audit Trail OK\n")

    # 5. PDF Report Generation Verification
    print("[Test 5/5] Testing PDF Report Generation...")
    t1 = db.query(Tender).first()
    v1 = db.query(VendorBid).first()
    verdicts_v1 = db.query(ComplianceVerdict).filter(ComplianceVerdict.vendor_bid_id == v1.id).all()
    
    formatted_verdicts = []
    for v in verdicts_v1:
        req = db.query(Requirement).filter(Requirement.id == v.requirement_id).first()
        formatted_verdicts.append({
            "requirement": {"clause_no": req.clause_no, "title": req.title, "threshold_value": req.threshold_value},
            "status": v.status,
            "confidence_score": v.confidence_score,
            "evidence_snippet": v.evidence_snippet,
            "document_name": v.document_name,
            "page_number": v.page_number,
            "extracted_value": v.extracted_value,
            "required_value": v.required_value,
            "reasoning": v.reasoning,
            "is_overridden": v.is_overridden
        })

    pdf_out = os.path.join(REPORTS_DIR, "test_report.pdf")
    ReportGenerator.generate_pdf_report(
        tender={"bid_number": t1.bid_number, "title": t1.title, "organization": t1.organization, "category": t1.category},
        vendor_bid={"vendor_name": v1.vendor_name, "vendor_gstin": v1.vendor_gstin, "overall_status": v1.overall_status, "compliance_score": v1.compliance_score, "compliant_count": v1.compliant_count, "non_compliant_count": v1.non_compliant_count, "needs_verification_count": v1.needs_verification_count},
        verdicts=formatted_verdicts,
        output_path=pdf_out
    )
    assert os.path.exists(pdf_out), "PDF Report must be generated on disk"
    print(f" -> Generated PDF Report at: {pdf_out} ({os.path.getsize(pdf_out)} bytes)")
    print(" [PASS] PDF Generation OK\n")

    db.close()
    print("=======================================================")
    print("  ALL 5 VERIFICATION TESTS PASSED SUCCESSFULLY! ")
    print("=======================================================\n")

if __name__ == "__main__":
    run_verification_tests()


import os
import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db, REPORTS_DIR
from app.models import Tender, Requirement, VendorBid, ComplianceVerdict
from app.schemas import OfficerOverrideRequest, ComplianceVerdictOut
from app.services.report_generator import ReportGenerator

router = APIRouter(prefix="/api/compliance", tags=["Compliance & Audit"])


@router.post("/override", response_model=ComplianceVerdictOut)
def submit_officer_override(payload: OfficerOverrideRequest, db: Session = Depends(get_db)):
    """
    Allows a procurement officer to manually override any AI verdict with audit logging.
    """
    verdict = db.query(ComplianceVerdict).filter(ComplianceVerdict.id == payload.verdict_id).first()
    if not verdict:
        raise HTTPException(status_code=404, detail="Verdict record not found")

    if payload.override_status not in ["COMPLIANT", "NON_COMPLIANT", "NEEDS_VERIFICATION"]:
        raise HTTPException(status_code=400, detail="Invalid override status. Must be COMPLIANT, NON_COMPLIANT, or NEEDS_VERIFICATION")

    verdict.is_overridden = True
    verdict.officer_override_status = payload.override_status
    verdict.officer_name = payload.officer_name or "Procurement Officer (GeM)"
    verdict.officer_comment = payload.officer_comment
    verdict.officer_timestamp = datetime.datetime.utcnow()

    # Recalculate vendor bid overall status and counts
    vendor = db.query(VendorBid).filter(VendorBid.id == verdict.vendor_bid_id).first()
    if vendor:
        all_verdicts = db.query(ComplianceVerdict).filter(ComplianceVerdict.vendor_bid_id == vendor.id).all()
        comp = 0
        non_comp = 0
        needs_rev = 0
        total = len(all_verdicts)

        for v in all_verdicts:
            effective_status = v.officer_override_status if v.is_overridden else v.status
            if effective_status == "COMPLIANT":
                comp += 1
            elif effective_status == "NON_COMPLIANT":
                non_comp += 1
            else:
                needs_rev += 1

        vendor.compliant_count = comp
        vendor.non_compliant_count = non_comp
        vendor.needs_verification_count = needs_rev
        score = (comp / total * 100.0) if total > 0 else 0.0
        vendor.compliance_score = round(score, 1)

        if non_comp > 0:
            vendor.overall_status = "NON_COMPLIANT"
        elif needs_rev > 0:
            vendor.overall_status = "NEEDS_VERIFICATION"
        else:
            vendor.overall_status = "COMPLIANT"

    db.commit()
    db.refresh(verdict)
    return verdict


@router.post("/revert-override/{verdict_id}", response_model=ComplianceVerdictOut)
def revert_officer_override(verdict_id: int, db: Session = Depends(get_db)):
    """Reverts an officer override back to the original AI decision."""
    verdict = db.query(ComplianceVerdict).filter(ComplianceVerdict.id == verdict_id).first()
    if not verdict:
        raise HTTPException(status_code=404, detail="Verdict record not found")

    verdict.is_overridden = False
    verdict.officer_override_status = None
    verdict.officer_name = None
    verdict.officer_comment = None
    verdict.officer_timestamp = None

    # Recalculate vendor summary
    vendor = db.query(VendorBid).filter(VendorBid.id == verdict.vendor_bid_id).first()
    if vendor:
        all_verdicts = db.query(ComplianceVerdict).filter(ComplianceVerdict.vendor_bid_id == vendor.id).all()
        comp = 0
        non_comp = 0
        needs_rev = 0
        total = len(all_verdicts)

        for v in all_verdicts:
            effective_status = v.officer_override_status if v.is_overridden else v.status
            if effective_status == "COMPLIANT":
                comp += 1
            elif effective_status == "NON_COMPLIANT":
                non_comp += 1
            else:
                needs_rev += 1

        vendor.compliant_count = comp
        vendor.non_compliant_count = non_comp
        vendor.needs_verification_count = needs_rev
        score = (comp / total * 100.0) if total > 0 else 0.0
        vendor.compliance_score = round(score, 1)

        if non_comp > 0:
            vendor.overall_status = "NON_COMPLIANT"
        elif needs_rev > 0:
            vendor.overall_status = "NEEDS_VERIFICATION"
        else:
            vendor.overall_status = "COMPLIANT"

    db.commit()
    db.refresh(verdict)
    return verdict


@router.get("/report/{vendor_id}/pdf")
def download_pdf_report(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(VendorBid).filter(VendorBid.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor bid not found")

    tender = db.query(Tender).filter(Tender.id == vendor.tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    verdicts = db.query(ComplianceVerdict).filter(ComplianceVerdict.vendor_bid_id == vendor.id).all()
    
    # Format verdicts data with requirement details
    verdict_list = []
    for v in verdicts:
        req = db.query(Requirement).filter(Requirement.id == v.requirement_id).first()
        verdict_list.append({
            "requirement": {
                "clause_no": req.clause_no if req else "",
                "title": req.title if req else "Requirement",
                "threshold_value": req.threshold_value if req else ""
            },
            "status": v.status,
            "confidence_score": v.confidence_score,
            "evidence_snippet": v.evidence_snippet,
            "document_name": v.document_name,
            "page_number": v.page_number,
            "extracted_value": v.extracted_value,
            "required_value": v.required_value,
            "reasoning": v.reasoning,
            "is_overridden": v.is_overridden,
            "officer_override_status": v.officer_override_status,
            "officer_name": v.officer_name,
            "officer_comment": v.officer_comment
        })

    pdf_filename = f"GeM_Bid_Compliance_Report_{vendor.id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    pdf_path = os.path.join(REPORTS_DIR, pdf_filename)

    ReportGenerator.generate_pdf_report(
        tender={
            "bid_number": tender.bid_number,
            "title": tender.title,
            "organization": tender.organization,
            "category": tender.category
        },
        vendor_bid={
            "vendor_name": vendor.vendor_name,
            "vendor_gstin": vendor.vendor_gstin,
            "overall_status": vendor.overall_status,
            "compliance_score": vendor.compliance_score,
            "compliant_count": vendor.compliant_count,
            "non_compliant_count": vendor.non_compliant_count,
            "needs_verification_count": vendor.needs_verification_count
        },
        verdicts=verdict_list,
        output_path=pdf_path
    )

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=pdf_filename
    )


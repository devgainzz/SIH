import os
import json
import shutil
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db, UPLOADS_DIR
from app.models import Tender, Requirement, VendorBid, Document, ComplianceVerdict, SystemSetting
from app.schemas import VendorBidOut, VendorBidDetailOut, VendorBidCreate, DocumentOut
from app.services.document_processor import DocumentProcessor
from app.services.compliance_engine import ComplianceEngine

router = APIRouter(prefix="/api/vendors", tags=["Vendors"])


@router.post("/create", response_model=VendorBidOut)
def create_vendor_bid(payload: VendorBidCreate, db: Session = Depends(get_db)):
    tender = db.query(Tender).filter(Tender.id == payload.tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    vendor = VendorBid(
        tender_id=payload.tender_id,
        vendor_name=payload.vendor_name,
        vendor_gstin=payload.vendor_gstin,
        vendor_pan=payload.vendor_pan,
        contact_email=payload.contact_email
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.get("/{vendor_id}", response_model=VendorBidDetailOut)
def get_vendor_bid(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(VendorBid).filter(VendorBid.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor bid not found")
    return vendor


@router.delete("/{vendor_id}")
def delete_vendor_bid(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(VendorBid).filter(VendorBid.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor bid not found")
    db.delete(vendor)
    db.commit()
    return {"message": f"Vendor '{vendor.vendor_name}' deleted successfully."}


@router.post("/{vendor_id}/upload-documents", response_model=List[DocumentOut])
async def upload_vendor_documents(
    vendor_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    vendor = db.query(VendorBid).filter(VendorBid.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor bid not found")

    vendor_upload_dir = os.path.join(UPLOADS_DIR, f"vendor_{vendor_id}")
    os.makedirs(vendor_upload_dir, exist_ok=True)

    uploaded_docs = []
    for file in files:
        safe_filename = os.path.basename(file.filename or f"doc_{datetime.datetime.now().timestamp()}")
        file_path = os.path.join(vendor_upload_dir, safe_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)
        ext = os.path.splitext(safe_filename)[1].upper().replace(".", "") or "FILE"

        # Process document immediately
        try:
            page_count, chunks, _ = DocumentProcessor.process_file(file_path, safe_filename)
            doc_record = Document(
                vendor_bid_id=vendor.id,
                filename=safe_filename,
                file_path=file_path,
                file_type=ext,
                file_size_bytes=file_size,
                page_count=page_count,
                processing_status="PROCESSED",
                extracted_chunks_json=json.dumps(chunks)
            )
        except Exception as e:
            doc_record = Document(
                vendor_bid_id=vendor.id,
                filename=safe_filename,
                file_path=file_path,
                file_type=ext,
                file_size_bytes=file_size,
                page_count=1,
                processing_status="ERROR",
                error_message=str(e),
                extracted_chunks_json="[]"
            )

        db.add(doc_record)
        uploaded_docs.append(doc_record)

    db.commit()
    for d in uploaded_docs:
        db.refresh(d)

    return uploaded_docs


@router.post("/{vendor_id}/evaluate", response_model=VendorBidDetailOut)
async def evaluate_vendor_compliance(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(VendorBid).filter(VendorBid.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor bid not found")

    requirements = db.query(Requirement).filter(Requirement.tender_id == vendor.tender_id).all()
    if not requirements:
        raise HTTPException(status_code=400, detail="No requirements found for this tender. Add requirements first.")

    # Gather all document chunks
    documents = db.query(Document).filter(Document.vendor_bid_id == vendor.id).all()
    all_chunks = []
    for d in documents:
        if d.extracted_chunks_json:
            try:
                chunks = json.loads(d.extracted_chunks_json)
                all_chunks.extend(chunks)
            except Exception:
                pass

    # Read system settings for LLM provider
    settings_rows = db.query(SystemSetting).all()
    settings = {s.key: s.value for s in settings_rows}
    llm_provider = settings.get("llm_provider", "smart_mock")
    gemini_key = settings.get("gemini_api_key")
    openai_key = settings.get("openai_api_key")
    model_name = settings.get("model_name")

    api_key = gemini_key if llm_provider == "gemini" else openai_key

    # Delete existing verdicts
    db.query(ComplianceVerdict).filter(ComplianceVerdict.vendor_bid_id == vendor.id).delete()

    compliant_count = 0
    non_compliant_count = 0
    needs_review_count = 0
    total = len(requirements)

    for req in requirements:
        req_dict = {
            "id": req.id,
            "title": req.title,
            "description": req.description,
            "category": req.category,
            "requirement_type": req.requirement_type,
            "threshold_value": req.threshold_value,
            "threshold_unit": req.threshold_unit,
            "clause_no": req.clause_no
        }

        verdict_res = await ComplianceEngine.evaluate_requirement(
            requirement=req_dict,
            document_chunks=all_chunks,
            llm_provider=llm_provider,
            api_key=api_key,
            model_name=model_name
        )

        st = verdict_res.get("status", "NEEDS_VERIFICATION")
        if st == "COMPLIANT":
            compliant_count += 1
        elif st == "NON_COMPLIANT":
            non_compliant_count += 1
        else:
            needs_review_count += 1

        v = ComplianceVerdict(
            vendor_bid_id=vendor.id,
            requirement_id=req.id,
            status=st,
            confidence_score=verdict_res.get("confidence_score", 70.0),
            evidence_snippet=verdict_res.get("evidence_snippet"),
            document_name=verdict_res.get("document_name"),
            page_number=verdict_res.get("page_number", 1),
            extracted_value=verdict_res.get("extracted_value"),
            required_value=verdict_res.get("required_value"),
            reasoning=verdict_res.get("reasoning")
        )
        db.add(v)

    vendor.total_requirements = total
    vendor.compliant_count = compliant_count
    vendor.non_compliant_count = non_compliant_count
    vendor.needs_verification_count = needs_review_count
    score = (compliant_count / total * 100.0) if total > 0 else 0.0
    vendor.compliance_score = round(score, 1)

    if non_compliant_count > 0:
        vendor.overall_status = "NON_COMPLIANT"
    elif needs_review_count > 0:
        vendor.overall_status = "NEEDS_VERIFICATION"
    else:
        vendor.overall_status = "COMPLIANT"

    vendor.last_evaluated_at = datetime.datetime.utcnow()
    vendor.verification_summary = (
        f"AI Audit Complete: {compliant_count}/{total} Compliant ({score:.0f}%), "
        f"{non_compliant_count} Non-Compliant, {needs_review_count} Under Review."
    )

    db.commit()
    db.refresh(vendor)
    return vendor


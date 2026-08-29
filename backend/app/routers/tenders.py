import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Tender, Requirement, VendorBid, ComplianceVerdict
from app.schemas import (
    TenderOut, TenderDetailOut, TenderCreate,
    RequirementOut, RequirementCreate, RequirementParseRequest,
    TenderComparisonMatrix, VendorComparisonRow, ComparisonCell
)
from app.services.compliance_engine import ComplianceEngine

router = APIRouter(prefix="/api/tenders", tags=["Tenders"])


@router.get("", response_model=List[TenderOut])
def list_tenders(
    search: str = Query(None, description="Search by bid number or title"),
    status: str = Query(None, description="Filter by status"),
    db: Session = Depends(get_db)
):
    query = db.query(Tender)
    if search:
        query = query.filter(
            (Tender.bid_number.ilike(f"%{search}%")) |
            (Tender.title.ilike(f"%{search}%")) |
            (Tender.organization.ilike(f"%{search}%"))
        )
    if status:
        query = query.filter(Tender.status == status)

    tenders = query.order_by(Tender.created_at.desc()).all()
    
    result = []
    for t in tenders:
        req_count = db.query(Requirement).filter(Requirement.tender_id == t.id).count()
        ven_count = db.query(VendorBid).filter(VendorBid.tender_id == t.id).count()
        t_out = TenderOut.from_orm(t)
        t_out.requirements_count = req_count
        t_out.vendors_count = ven_count
        result.append(t_out)
    return result


@router.post("", response_model=TenderDetailOut)
def create_tender(payload: TenderCreate, db: Session = Depends(get_db)):
    # Check duplicate bid number
    existing = db.query(Tender).filter(Tender.bid_number == payload.bid_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Tender with Bid Number '{payload.bid_number}' already exists.")

    tender = Tender(
        bid_number=payload.bid_number,
        title=payload.title,
        organization=payload.organization,
        category=payload.category,
        estimated_value=payload.estimated_value,
        submission_deadline=payload.submission_deadline,
        status=payload.status
    )
    db.add(tender)
    db.flush()

    if payload.requirements:
        for r in payload.requirements:
            req_model = Requirement(
                tender_id=tender.id,
                clause_no=r.clause_no,
                title=r.title,
                description=r.description,
                category=r.category,
                requirement_type=r.requirement_type,
                threshold_value=r.threshold_value,
                threshold_unit=r.threshold_unit,
                is_mandatory=r.is_mandatory,
                scoring_weight=r.scoring_weight
            )
            db.add(req_model)

    db.commit()
    db.refresh(tender)
    return tender


@router.get("/{tender_id}", response_model=TenderDetailOut)
def get_tender(tender_id: int, db: Session = Depends(get_db)):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    return tender


@router.delete("/{tender_id}")
def delete_tender(tender_id: int, db: Session = Depends(get_db)):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    db.delete(tender)
    db.commit()
    return {"message": f"Tender {tender.bid_number} deleted successfully."}


@router.post("/{tender_id}/parse-requirements", response_model=List[RequirementOut])
def parse_and_add_requirements(
    tender_id: int,
    payload: RequirementParseRequest,
    db: Session = Depends(get_db)
):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    parsed_items = ComplianceEngine.parse_raw_tender_requirements(payload.tender_text)
    
    created_reqs = []
    for item in parsed_items:
        req = Requirement(
            tender_id=tender.id,
            clause_no=item.get("clause_no"),
            title=item.get("title", "Requirement"),
            description=item.get("description", ""),
            category=item.get("category", "TECHNICAL"),
            requirement_type=item.get("requirement_type", "TEXT"),
            threshold_value=item.get("threshold_value"),
            threshold_unit=item.get("threshold_unit"),
            is_mandatory=item.get("is_mandatory", True)
        )
        db.add(req)
        created_reqs.append(req)

    db.commit()
    for r in created_reqs:
        db.refresh(r)
    return created_reqs


@router.post("/{tender_id}/requirements", response_model=RequirementOut)
def add_single_requirement(
    tender_id: int,
    payload: RequirementCreate,
    db: Session = Depends(get_db)
):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    req = Requirement(
        tender_id=tender.id,
        clause_no=payload.clause_no,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        requirement_type=payload.requirement_type,
        threshold_value=payload.threshold_value,
        threshold_unit=payload.threshold_unit,
        is_mandatory=payload.is_mandatory,
        scoring_weight=payload.scoring_weight
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.delete("/{tender_id}/requirements/{req_id}")
def delete_requirement(tender_id: int, req_id: int, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == req_id, Requirement.tender_id == tender_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    db.delete(req)
    db.commit()
    return {"message": "Requirement deleted successfully."}


@router.get("/{tender_id}/matrix", response_model=TenderComparisonMatrix)
def get_tender_comparison_matrix(tender_id: int, db: Session = Depends(get_db)):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    requirements = db.query(Requirement).filter(Requirement.tender_id == tender_id).all()
    vendor_bids = db.query(VendorBid).filter(VendorBid.tender_id == tender_id).all()

    vendor_rows = []
    for v in vendor_bids:
        verdicts = db.query(ComplianceVerdict).filter(ComplianceVerdict.vendor_bid_id == v.id).all()
        verdict_map = {ver.requirement_id: ver for ver in verdicts}

        cell_map = {}
        for r in requirements:
            ver = verdict_map.get(r.id)
            if ver:
                eff_status = ver.officer_override_status if ver.is_overridden else ver.status
                cell_map[r.id] = ComparisonCell(
                    requirement_id=r.id,
                    clause_no=r.clause_no,
                    requirement_title=r.title,
                    status=eff_status,
                    confidence_score=ver.confidence_score,
                    evidence_snippet=ver.evidence_snippet,
                    extracted_value=ver.extracted_value,
                    is_overridden=ver.is_overridden
                )
            else:
                cell_map[r.id] = ComparisonCell(
                    requirement_id=r.id,
                    clause_no=r.clause_no,
                    requirement_title=r.title,
                    status="NOT_EVALUATED",
                    confidence_score=0.0,
                    evidence_snippet=None,
                    extracted_value=None,
                    is_overridden=False
                )

        vendor_rows.append(VendorComparisonRow(
            vendor_id=v.id,
            vendor_name=v.vendor_name,
            vendor_gstin=v.vendor_gstin,
            overall_status=v.overall_status,
            compliance_score=v.compliance_score,
            compliant_count=v.compliant_count,
            non_compliant_count=v.non_compliant_count,
            needs_verification_count=v.needs_verification_count,
            cell_evaluations=cell_map
        ))

    return TenderComparisonMatrix(
        tender_id=tender.id,
        tender_bid_number=tender.bid_number,
        tender_title=tender.title,
        requirements=[RequirementOut.from_orm(r) for r in requirements],
        vendors=vendor_rows
    )


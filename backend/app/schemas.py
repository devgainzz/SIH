import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

# --- Requirement Schemas ---
class RequirementBase(BaseModel):
    clause_no: Optional[str] = None
    title: str
    description: str
    category: str = "TECHNICAL"
    requirement_type: str = "TEXT"
    threshold_value: Optional[str] = None
    threshold_unit: Optional[str] = None
    is_mandatory: bool = True
    scoring_weight: float = 1.0

class RequirementCreate(RequirementBase):
    pass

class RequirementOut(RequirementBase):
    id: int
    tender_id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class RequirementParseRequest(BaseModel):
    tender_text: str

class ParsedRequirementItem(BaseModel):
    clause_no: Optional[str] = None
    title: str
    description: str
    category: str
    requirement_type: str
    threshold_value: Optional[str] = None
    threshold_unit: Optional[str] = None
    is_mandatory: bool = True

# --- Document Schemas ---
class DocumentOut(BaseModel):
    id: int
    vendor_bid_id: int
    filename: str
    file_type: str
    file_size_bytes: int
    page_count: int
    processing_status: str
    error_message: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Compliance Verdict Schemas ---
class ComplianceVerdictOut(BaseModel):
    id: int
    vendor_bid_id: int
    requirement_id: int
    status: str
    confidence_score: float
    evidence_snippet: Optional[str] = None
    document_name: Optional[str] = None
    page_number: Optional[int] = None
    extracted_value: Optional[str] = None
    required_value: Optional[str] = None
    reasoning: Optional[str] = None
    is_overridden: bool = False
    officer_override_status: Optional[str] = None
    officer_name: Optional[str] = None
    officer_comment: Optional[str] = None
    officer_timestamp: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    requirement: Optional[RequirementOut] = None

    class Config:
        from_attributes = True

class OfficerOverrideRequest(BaseModel):
    verdict_id: int
    override_status: str  # COMPLIANT, NON_COMPLIANT, NEEDS_VERIFICATION
    officer_name: str = "Procurement Officer (GeM)"
    officer_comment: str

# --- Vendor Bid Schemas ---
class VendorBidBase(BaseModel):
    vendor_name: str
    vendor_gstin: Optional[str] = None
    vendor_pan: Optional[str] = None
    contact_email: Optional[str] = None

class VendorBidCreate(VendorBidBase):
    tender_id: int

class VendorBidOut(VendorBidBase):
    id: int
    tender_id: int
    submission_date: datetime.datetime
    overall_status: str
    compliance_score: float
    total_requirements: int
    compliant_count: int
    non_compliant_count: int
    needs_verification_count: int
    verification_summary: Optional[str] = None
    last_evaluated_at: Optional[datetime.datetime] = None
    documents: List[DocumentOut] = []

    class Config:
        from_attributes = True

class VendorBidDetailOut(VendorBidOut):
    verdicts: List[ComplianceVerdictOut] = []

# --- Tender Schemas ---
class TenderBase(BaseModel):
    bid_number: str
    title: str
    organization: str
    category: str = "General Goods & Services"
    estimated_value: str = "₹ 10.00 Cr"
    submission_deadline: Optional[str] = None
    status: str = "ACTIVE"

class TenderCreate(TenderBase):
    requirements: Optional[List[RequirementCreate]] = []

class TenderOut(TenderBase):
    id: int
    created_at: datetime.datetime
    requirements_count: int = 0
    vendors_count: int = 0

    class Config:
        from_attributes = True

class TenderDetailOut(TenderBase):
    id: int
    created_at: datetime.datetime
    requirements: List[RequirementOut] = []
    vendor_bids: List[VendorBidOut] = []

    class Config:
        from_attributes = True

# --- Comparison Matrix & Report Schemas ---
class ComparisonCell(BaseModel):
    requirement_id: int
    clause_no: Optional[str] = None
    requirement_title: str
    status: str  # effective status (considering override)
    confidence_score: float
    evidence_snippet: Optional[str] = None
    extracted_value: Optional[str] = None
    is_overridden: bool = False

class VendorComparisonRow(BaseModel):
    vendor_id: int
    vendor_name: str
    vendor_gstin: Optional[str] = None
    overall_status: str
    compliance_score: float
    compliant_count: int
    non_compliant_count: int
    needs_verification_count: int
    cell_evaluations: Dict[int, ComparisonCell] = {}

class TenderComparisonMatrix(BaseModel):
    tender_id: int
    tender_bid_number: str
    tender_title: str
    requirements: List[RequirementOut]
    vendors: List[VendorComparisonRow]

class SettingsUpdate(BaseModel):
    llm_provider: str = "smart_mock"  # "smart_mock", "gemini", "openai"
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    model_name: Optional[str] = None
    ocr_mode: Optional[str] = "hybrid"  # "native", "ocr", "hybrid"


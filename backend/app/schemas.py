"""
================================================================================
BidVerify AI — GeM Bid Compliance Verification (SIH26100)
Pydantic Data Schemas for API Serialization & Request Validation
================================================================================

Description:
    This module defines the Pydantic data schemas used across the FastAPI REST APIs.
    These schemas validate incoming request payloads, format response JSON data,
    and enforce strict data typing across all tender, requirement, document,
    and compliance evaluation workflows.
"""

import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict


# ==============================================================================
# 1. Requirement & Criteria Schemas
# ==============================================================================

class RequirementBase(BaseModel):
    """Base fields for an eligibility criterion clause."""
    clause_no: Optional[str] = Field(None, description="Clause reference number (e.g. 'Clause 3.1')")
    title: str = Field(..., description="Concise requirement title (e.g. 'Annual Financial Turnover')")
    description: str = Field(..., description="Detailed description of the requirement")
    category: str = Field("TECHNICAL", description="Category: 'FINANCIAL', 'EXPERIENCE', 'CERTIFICATION', 'LEGAL', 'MII'")
    requirement_type: str = Field("TEXT", description="Type: 'NUMERIC_THRESHOLD', 'EXPERIENCE_YEARS', 'CERTIFICATE', 'BOOLEAN_DECLARATION'")
    threshold_value: Optional[str] = Field(None, description="Required threshold value (e.g. '10.0', '5', 'ISO 9001:2015')")
    threshold_unit: Optional[str] = Field(None, description="Unit of threshold (e.g. 'Crores INR', 'Years', '% Local Content')")
    is_mandatory: bool = Field(True, description="Whether non-compliance leads to automatic disqualification")
    scoring_weight: float = Field(1.0, description="Relative weighting score (default 1.0)")


class RequirementCreate(RequirementBase):
    """Payload schema for creating a new requirement manually."""
    pass


class RequirementOut(RequirementBase):
    """Response schema for returning requirement details."""
    id: int
    tender_id: int
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class RequirementParseRequest(BaseModel):
    """Payload for submitting unstructured raw tender text to the AI Auto-Parser."""
    tender_text: str = Field(..., description="Raw text of eligibility criteria from tender notice")


class ParsedRequirementItem(BaseModel):
    """A discrete requirement item extracted by the AI Auto-Parser."""
    clause_no: Optional[str] = None
    title: str
    description: str
    category: str
    requirement_type: str
    threshold_value: Optional[str] = None
    threshold_unit: Optional[str] = None
    is_mandatory: bool = True


# ==============================================================================
# 2. Document & Upload Schemas
# ==============================================================================

class DocumentOut(BaseModel):
    """Response schema for an uploaded document."""
    id: int
    vendor_bid_id: int
    filename: str
    file_type: str
    file_size_bytes: int
    page_count: int
    processing_status: str
    error_message: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# 3. Compliance Verdict & Officer Override Schemas
# ==============================================================================

class ComplianceVerdictOut(BaseModel):
    """
    Response schema for an explainable AI compliance verification verdict.
    Includes evidentiary snippets, source document citations, and officer override history.
    """
    id: int
    vendor_bid_id: int
    requirement_id: int
    status: str = Field(..., description="Status: 'COMPLIANT', 'NON_COMPLIANT', 'NEEDS_VERIFICATION'")
    confidence_score: float = Field(..., description="Confidence score from 0.0 to 100.0")
    evidence_snippet: Optional[str] = Field(None, description="Exact quoted text found in submitted document")
    document_name: Optional[str] = Field(None, description="Source document file name")
    page_number: Optional[int] = Field(None, description="Page number where evidence was located")
    extracted_value: Optional[str] = Field(None, description="Value found in document (e.g. '₹ 18.50 Cr')")
    required_value: Optional[str] = Field(None, description="Value required by tender (e.g. '≥ ₹ 10.00 Cr')")
    reasoning: Optional[str] = Field(None, description="Concise explainable justification from AI")
    is_overridden: bool = Field(False, description="True if an evaluation officer has overridden this verdict")
    officer_override_status: Optional[str] = Field(None, description="Overridden status decision")
    officer_name: Optional[str] = Field(None, description="Officer / Committee designation")
    officer_comment: Optional[str] = Field(None, description="Mandatory reason recorded in audit log")
    officer_timestamp: Optional[datetime.datetime] = Field(None, description="Timestamp of override")
    created_at: datetime.datetime
    requirement: Optional[RequirementOut] = None

    model_config = ConfigDict(from_attributes=True)


class OfficerOverrideRequest(BaseModel):
    """Payload schema for an officer submitting a manual override."""
    verdict_id: int = Field(..., description="ID of the ComplianceVerdict record to override")
    override_status: str = Field(..., description="New status: 'COMPLIANT', 'NON_COMPLIANT', or 'NEEDS_VERIFICATION'")
    officer_name: str = Field("Procurement Officer (GeM)", description="Name and title of overriding officer")
    officer_comment: str = Field(..., description="Mandatory official justification for audit logging")


# ==============================================================================
# 4. Vendor Bid Schemas
# ==============================================================================

class VendorBidBase(BaseModel):
    """Base fields for registering a vendor's proposal."""
    vendor_name: str = Field(..., description="Legal name of bidding entity")
    vendor_gstin: Optional[str] = Field(None, description="15-character GSTIN tax identification number")
    vendor_pan: Optional[str] = Field(None, description="10-character Permanent Account Number")
    contact_email: Optional[str] = Field(None, description="Authorized contact email")


class VendorBidCreate(VendorBidBase):
    """Payload schema for creating a new vendor bid."""
    tender_id: int = Field(..., description="ID of the Tender to associate this bid with")


class VendorBidOut(VendorBidBase):
    """Summary response schema for a vendor bid."""
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

    model_config = ConfigDict(from_attributes=True)


class VendorBidDetailOut(VendorBidOut):
    """Detailed response schema for a vendor bid including all requirement verdicts."""
    verdicts: List[ComplianceVerdictOut] = []


# ==============================================================================
# 5. Tender Schemas
# ==============================================================================

class TenderBase(BaseModel):
    """Base fields for a GeM Tender notice."""
    bid_number: str = Field(..., description="Unique GeM Bid Reference (e.g. 'GEM/2026/B/894120')")
    title: str = Field(..., description="Title/Scope of procurement")
    organization: str = Field(..., description="Procuring Ministry, Department or PSU")
    category: str = Field("General Goods & Services", description="Classification category")
    estimated_value: str = Field("₹ 10.00 Cr", description="Estimated contract budget")
    submission_deadline: Optional[str] = Field(None, description="Submission deadline string")
    status: str = Field("ACTIVE", description="Tender status: 'ACTIVE', 'EVALUATING', 'CLOSED'")


class TenderCreate(TenderBase):
    """Payload schema for creating a new tender with optional initial requirements."""
    requirements: Optional[List[RequirementCreate]] = []


class TenderOut(TenderBase):
    """Response schema for tender listing with aggregated counts."""
    id: int
    created_at: datetime.datetime
    requirements_count: int = 0
    vendors_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class TenderDetailOut(TenderBase):
    """Detailed response schema for a single tender including clauses and vendor bids."""
    id: int
    created_at: datetime.datetime
    requirements: List[RequirementOut] = []
    vendor_bids: List[VendorBidOut] = []

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# 6. Multi-Vendor Comparison Matrix Schemas
# ==============================================================================

class ComparisonCell(BaseModel):
    """A single cell in the multi-vendor comparison matrix table."""
    requirement_id: int
    clause_no: Optional[str] = None
    requirement_title: str
    status: str = Field(..., description="Effective status considering any officer override")
    confidence_score: float
    evidence_snippet: Optional[str] = None
    extracted_value: Optional[str] = None
    is_overridden: bool = False


class VendorComparisonRow(BaseModel):
    """A row in the multi-vendor comparison matrix representing one vendor."""
    vendor_id: int
    vendor_name: str
    vendor_gstin: Optional[str] = None
    overall_status: str
    compliance_score: float
    compliant_count: int
    non_compliant_count: int
    needs_verification_count: int
    cell_evaluations: Dict[int, ComparisonCell] = Field(default_factory=dict)


class TenderComparisonMatrix(BaseModel):
    """Full side-by-side comparison matrix for all bidders under a tender."""
    tender_id: int
    tender_bid_number: str
    tender_title: str
    requirements: List[RequirementOut]
    vendors: List[VendorComparisonRow]


# ==============================================================================
# 7. System & AI Engine Configuration Schemas
# ==============================================================================

class SettingsUpdate(BaseModel):
    """Payload schema for updating AI Engine and OCR configuration."""
    llm_provider: str = Field("smart_mock", description="AI Provider: 'smart_mock', 'gemini', 'openai'")
    gemini_api_key: Optional[str] = Field(None, description="Google Gemini API Key")
    openai_api_key: Optional[str] = Field(None, description="OpenAI API Key")
    model_name: Optional[str] = Field(None, description="Model identifier (e.g. 'gemini-1.5-flash', 'gpt-4o-mini')")
    ocr_mode: Optional[str] = Field("hybrid", description="OCR mode: 'hybrid', 'native', 'ocr'")

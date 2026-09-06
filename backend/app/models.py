"""
================================================================================
BidVerify AI — GeM Bid Compliance Verification (SIH26100)
SQLAlchemy ORM Relational Database Models
================================================================================

Description:
    This module defines the relational schema for the BidVerify AI platform:
    1. Tender: Government procurement tenders with bid numbers, deadlines & estimates.
    2. Requirement: Specific technical/financial/legal eligibility clauses.
    3. VendorBid: Bids submitted by vendors for a specific tender.
    4. Document: Uploaded supporting files (PDF, DOCX, TXT, OCR scans) and text chunks.
    5. ComplianceVerdict: AI-generated evaluation verdicts with citations & officer overrides.
    6. SystemSetting: Global configurations (active AI model, API keys, OCR mode).
"""

import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def get_utc_now():
    """Helper to return timezone-aware UTC datetime."""
    return datetime.datetime.now(datetime.timezone.utc)


class Tender(Base):
    """
    Represents an official GeM Tender / Request for Proposal (RFP).

    Attributes:
        id (int): Primary key.
        bid_number (str): Unique GeM Bid Reference (e.g. 'GEM/2026/B/894120').
        title (str): Title/Scope of procurement (e.g. 'Data Center Infrastructure Supply').
        organization (str): Procuring Ministry, Department or PSU (e.g. 'MeitY').
        category (str): Procurement classification (e.g. 'IT Hardware', 'Services').
        estimated_value (str): Estimated contract budget (e.g. '₹ 25.00 Cr').
        submission_deadline (str): Formatted deadline date-time string.
        status (str): Current tender state ('ACTIVE', 'EVALUATING', 'CLOSED').
        created_at (datetime): Timestamp when tender was published.
        requirements (List[Requirement]): Relationship to defined eligibility clauses.
        vendor_bids (List[VendorBid]): Relationship to vendor proposals submitted.
    """
    __tablename__ = "tenders"

    id = Column(Integer, primary_key=True, index=True)
    bid_number = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    organization = Column(String, nullable=False)
    category = Column(String, default="General Goods & Services")
    estimated_value = Column(String, default="₹ 10.00 Cr")
    submission_deadline = Column(String, nullable=True)
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=get_utc_now)

    # Cascading relationships: Deleting a tender removes its requirements and bids
    requirements = relationship("Requirement", back_populates="tender", cascade="all, delete-orphan")
    vendor_bids = relationship("VendorBid", back_populates="tender", cascade="all, delete-orphan")


class Requirement(Base):
    """
    Represents an individual checkable eligibility criterion or clause of a tender.

    Attributes:
        id (int): Primary key.
        tender_id (int): Foreign key to the parent Tender.
        clause_no (str): Clause identifier (e.g. 'Clause 3.1.1').
        title (str): Concise requirement name (e.g. 'Annual Financial Turnover').
        description (str): Full text description of the eligibility requirement.
        category (str): Category type ('FINANCIAL', 'EXPERIENCE', 'CERTIFICATION', 'LEGAL', 'MII').
        requirement_type (str): Evaluation type ('NUMERIC_THRESHOLD', 'EXPERIENCE_YEARS', 'CERTIFICATE', 'BOOLEAN_DECLARATION').
        threshold_value (str): Minimum required numeric value or standard (e.g. '10.0', '5', 'ISO 9001:2015').
        threshold_unit (str): Unit of measurement (e.g. 'Crores INR', 'Years', '% Local Content').
        is_mandatory (bool): True if disqualifying if not met.
        scoring_weight (float): Relative importance weight (default 1.0).
        created_at (datetime): Timestamp when clause was created.
        tender (Tender): Back-reference to the parent Tender.
        verdicts (List[ComplianceVerdict]): Evaluated verdicts across all submitted vendor bids.
    """
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False)
    clause_no = Column(String, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, default="TECHNICAL")
    requirement_type = Column(String, default="TEXT")
    threshold_value = Column(String, nullable=True)
    threshold_unit = Column(String, nullable=True)
    is_mandatory = Column(Boolean, default=True)
    scoring_weight = Column(Float, default=1.0)
    created_at = Column(DateTime, default=get_utc_now)

    tender = relationship("Tender", back_populates="requirements")
    verdicts = relationship("ComplianceVerdict", back_populates="requirement", cascade="all, delete-orphan")


class VendorBid(Base):
    """
    Represents a vendor's bid submission for a specific tender.

    Attributes:
        id (int): Primary key.
        tender_id (int): Foreign key to the parent Tender.
        vendor_name (str): Legal name of bidding entity.
        vendor_gstin (str): 15-character GSTIN tax identification number.
        vendor_pan (str): 10-character Permanent Account Number.
        contact_email (str): Authorized contact email.
        submission_date (datetime): Timestamp when bid was submitted.
        overall_status (str): Aggregated decision ('COMPLIANT', 'NON_COMPLIANT', 'NEEDS_VERIFICATION', 'PENDING').
        compliance_score (float): Percentage of compliant requirements (0.0 to 100.0).
        total_requirements (int): Total criteria count evaluated.
        compliant_count (int): Number of satisfied criteria.
        non_compliant_count (int): Number of failed/deficient criteria.
        needs_verification_count (int): Number of ambiguous/unverified criteria.
        verification_summary (str): Executive summary generated after evaluation.
        last_evaluated_at (datetime): Timestamp of latest AI evaluation run.
        tender (Tender): Back-reference to the parent Tender.
        documents (List[Document]): Uploaded supporting files.
        verdicts (List[ComplianceVerdict]): Requirement-by-requirement evaluation verdicts.
    """
    __tablename__ = "vendor_bids"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False)
    vendor_name = Column(String, nullable=False)
    vendor_gstin = Column(String, nullable=True)
    vendor_pan = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    submission_date = Column(DateTime, default=get_utc_now)
    overall_status = Column(String, default="PENDING")
    compliance_score = Column(Float, default=0.0)
    total_requirements = Column(Integer, default=0)
    compliant_count = Column(Integer, default=0)
    non_compliant_count = Column(Integer, default=0)
    needs_verification_count = Column(Integer, default=0)
    verification_summary = Column(Text, nullable=True)
    last_evaluated_at = Column(DateTime, nullable=True)

    tender = relationship("Tender", back_populates="vendor_bids")
    documents = relationship("Document", back_populates="vendor_bid", cascade="all, delete-orphan")
    verdicts = relationship("ComplianceVerdict", back_populates="vendor_bid", cascade="all, delete-orphan")


class Document(Base):
    """
    Represents an uploaded document file associated with a vendor's bid.

    Attributes:
        id (int): Primary key.
        vendor_bid_id (int): Foreign key to the parent VendorBid.
        filename (str): Original file name.
        file_path (str): Local storage path on disk.
        file_type (str): Extension type ('PDF', 'DOCX', 'TXT', 'IMAGE').
        file_size_bytes (int): File size in bytes.
        page_count (int): Detected total page count.
        processing_status (str): Parsing state ('UPLOADED', 'PROCESSING', 'PROCESSED', 'ERROR').
        error_message (str): Error details if extraction failed.
        extracted_chunks_json (str): JSON serialized list of text chunks with page number metadata.
        created_at (datetime): Upload timestamp.
        vendor_bid (VendorBid): Back-reference to the parent VendorBid.
    """
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    vendor_bid_id = Column(Integer, ForeignKey("vendor_bids.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size_bytes = Column(Integer, default=0)
    page_count = Column(Integer, default=1)
    processing_status = Column(String, default="UPLOADED")
    error_message = Column(Text, nullable=True)
    extracted_chunks_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

    vendor_bid = relationship("VendorBid", back_populates="documents")


class ComplianceVerdict(Base):
    """
    Represents the explainable compliance verification outcome for a single requirement.

    Attributes:
        id (int): Primary key.
        vendor_bid_id (int): Foreign key to the evaluated VendorBid.
        requirement_id (int): Foreign key to the evaluated Requirement.
        status (str): AI verdict ('COMPLIANT', 'NON_COMPLIANT', 'NEEDS_VERIFICATION').
        confidence_score (float): Reliability score from 0.0 to 100.0.
        evidence_snippet (str): Exact quoted text found in vendor's submitted document.
        document_name (str): Source document file name where evidence was found.
        page_number (int): Exact page number where evidence was extracted.
        extracted_value (str): Numeric or categorical value found (e.g. '₹ 18.50 Cr', '7 Years').
        required_value (str): Threshold required by the tender (e.g. '≥ ₹ 10.00 Cr', '≥ 5 Years').
        reasoning (str): 1-2 sentence explainable justification for the decision.
        is_overridden (bool): True if an evaluation officer has manually overridden this verdict.
        officer_override_status (str): The manual status chosen ('COMPLIANT', 'NON_COMPLIANT', 'NEEDS_VERIFICATION').
        officer_name (str): Identity/Designation of the overriding officer.
        officer_comment (str): Mandatory justification note recorded in the audit trail.
        officer_timestamp (datetime): Timestamp when override was recorded.
        created_at (datetime): Evaluation timestamp.
        vendor_bid (VendorBid): Back-reference to the parent VendorBid.
        requirement (Requirement): Back-reference to the evaluated Requirement.
    """
    __tablename__ = "compliance_verdicts"

    id = Column(Integer, primary_key=True, index=True)
    vendor_bid_id = Column(Integer, ForeignKey("vendor_bids.id"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("requirements.id"), nullable=False)
    
    # Core AI Outputs
    status = Column(String, nullable=False)
    confidence_score = Column(Float, default=0.0)
    evidence_snippet = Column(Text, nullable=True)
    document_name = Column(String, nullable=True)
    page_number = Column(Integer, nullable=True)
    extracted_value = Column(String, nullable=True)
    required_value = Column(String, nullable=True)
    reasoning = Column(Text, nullable=True)
    
    # Procurement Officer Manual Override & Audit Trail
    is_overridden = Column(Boolean, default=False)
    officer_override_status = Column(String, nullable=True)
    officer_name = Column(String, nullable=True)
    officer_comment = Column(Text, nullable=True)
    officer_timestamp = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=get_utc_now)

    vendor_bid = relationship("VendorBid", back_populates="verdicts")
    requirement = relationship("Requirement", back_populates="verdicts")


class SystemSetting(Base):
    """
    Key-Value store for global system configurations.

    Attributes:
        key (str): Setting identifier (e.g. 'llm_provider', 'gemini_api_key', 'ocr_mode').
        value (str): Stored setting value.
        updated_at (datetime): Timestamp of latest update.
    """
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

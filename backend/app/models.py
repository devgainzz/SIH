import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Tender(Base):
    __tablename__ = "tenders"

    id = Column(Integer, primary_key=True, index=True)
    bid_number = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    organization = Column(String, nullable=False)
    category = Column(String, default="General Goods & Services")
    estimated_value = Column(String, default="₹ 10.00 Cr")
    submission_deadline = Column(String, nullable=True)
    status = Column(String, default="ACTIVE")  # ACTIVE, EVALUATING, CLOSED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    requirements = relationship("Requirement", back_populates="tender", cascade="all, delete-orphan")
    vendor_bids = relationship("VendorBid", back_populates="tender", cascade="all, delete-orphan")


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False)
    clause_no = Column(String, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, default="TECHNICAL")  # FINANCIAL, TECHNICAL, CERTIFICATION, EXPERIENCE, LEGAL, MII
    requirement_type = Column(String, default="TEXT")  # NUMERIC_THRESHOLD, CERTIFICATE, EXPERIENCE_YEARS, BOOLEAN_DECLARATION, TEXT
    threshold_value = Column(String, nullable=True)
    threshold_unit = Column(String, nullable=True)
    is_mandatory = Column(Boolean, default=True)
    scoring_weight = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    tender = relationship("Tender", back_populates="requirements")
    verdicts = relationship("ComplianceVerdict", back_populates="requirement", cascade="all, delete-orphan")


class VendorBid(Base):
    __tablename__ = "vendor_bids"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False)
    vendor_name = Column(String, nullable=False)
    vendor_gstin = Column(String, nullable=True)
    vendor_pan = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    submission_date = Column(DateTime, default=datetime.datetime.utcnow)
    overall_status = Column(String, default="PENDING")  # PENDING, COMPLIANT, NON_COMPLIANT, NEEDS_VERIFICATION
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
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    vendor_bid_id = Column(Integer, ForeignKey("vendor_bids.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # PDF, DOCX, IMAGE, TXT
    file_size_bytes = Column(Integer, default=0)
    page_count = Column(Integer, default=1)
    processing_status = Column(String, default="UPLOADED")  # UPLOADED, PROCESSING, PROCESSED, ERROR
    error_message = Column(Text, nullable=True)
    extracted_chunks_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    vendor_bid = relationship("VendorBid", back_populates="documents")


class ComplianceVerdict(Base):
    __tablename__ = "compliance_verdicts"

    id = Column(Integer, primary_key=True, index=True)
    vendor_bid_id = Column(Integer, ForeignKey("vendor_bids.id"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("requirements.id"), nullable=False)
    
    # Core AI outputs
    status = Column(String, nullable=False)  # COMPLIANT, NON_COMPLIANT, NEEDS_VERIFICATION
    confidence_score = Column(Float, default=0.0)  # 0.0 to 100.0
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

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    vendor_bid = relationship("VendorBid", back_populates="verdicts")
    requirement = relationship("Requirement", back_populates="verdicts")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


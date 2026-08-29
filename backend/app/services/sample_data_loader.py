import os
import json
import datetime
from sqlalchemy.orm import Session
from app.models import Tender, Requirement, VendorBid, Document, ComplianceVerdict, SystemSetting
from app.services.document_processor import DocumentProcessor
from app.services.compliance_engine import ComplianceEngine
from app.database import UPLOADS_DIR

SAMPLE_DOCS_DIR = os.path.join(UPLOADS_DIR, "sample_vendors")
os.makedirs(SAMPLE_DOCS_DIR, exist_ok=True)

def generate_sample_file_content():
    """Creates realistic sample text and PDF documents for demonstration."""
    
    # 1. AlphaTech (Compliant) Documents
    alpha_dir = os.path.join(SAMPLE_DOCS_DIR, "AlphaTech_Solutions")
    os.makedirs(alpha_dir, exist_ok=True)

    alpha_financial_path = os.path.join(alpha_dir, "Audited_Financial_Statement_FY24.txt")
    with open(alpha_financial_path, "w", encoding="utf-8") as f:
        f.write("""M/S ALPHATECH SOLUTIONS PRIVATE LIMITED
CIN: U72200DL2017PTC319800
Registered Office: 402, Technology Tower, Okhla Phase-III, New Delhi - 110020

CHARTERED ACCOUNTANTS TURNOVER & NET WORTH CERTIFICATE
To whomsoever it may concern,

We have audited the books of accounts of M/s AlphaTech Solutions Private Limited. 
Based on our audit verification of financial statements, the annual financial turnover of the company for the preceding three financial years is as follows:

1. Financial Year 2021-2022: INR 16.20 Crores (₹ 16,20,00,000)
2. Financial Year 2022-2023: INR 18.80 Crores (₹ 18,80,00,000)
3. Financial Year 2023-2024: INR 20.50 Crores (₹ 20,50,00,000)

Average Annual Financial Turnover for the last three years: ₹ 18.50 Crores (Rupees Eighteen Crores and Fifty Lakhs Only).
Net Worth as on 31st March 2024: ₹ 9.40 Crores (Positive).

UDIN: 24089123AAAAAB4912
For Sharma & Associates, Chartered Accountants (FRN: 014291N)
CA Ramesh Sharma, Senior Partner (Membership No: 089123)
Date: 15-May-2024
Place: New Delhi
""")

    alpha_iso_path = os.path.join(alpha_dir, "ISO_9001_Quality_Certificate.txt")
    with open(alpha_iso_path, "w", encoding="utf-8") as f:
        f.write("""INTERNATIONAL ACCREDITATION SERVICES & CERTIFICATION BOARD
CERTIFICATE OF REGISTRATION
Quality Management System — ISO 9001:2015

This is to certify that the Quality Management System of:
ALPHATECH SOLUTIONS PRIVATE LIMITED
Plot No 402, Okhla Industrial Area Phase-III, New Delhi - 110020, India

Has been assessed and found to conform to the requirements of:
ISO 9001:2015 (Quality Management Systems)

Scope: Design, Engineering, Procurement, Supply, Installation, Cloud Hosting and 24x7 Enterprise Facility Maintenance of Data Center and IT Infrastructure.

Certificate No: QA/ISO9001/IND/2022/88219
Original Issue Date: 12-August-2022
Current Certificate Date: 10-August-2024
Expiry Date: 11-August-2027 (Valid and Active)
Accreditation Body: NABCB / IAF Member Body
""")

    alpha_experience_path = os.path.join(alpha_dir, "Experience_and_Client_Credentials.txt")
    with open(alpha_experience_path, "w", encoding="utf-8") as f:
        f.write("""ALPHATECH SOLUTIONS PRIVATE LIMITED
STATEMENT OF SIMILAR WORK EXPERIENCE AND CORPORATE STANDING

AlphaTech Solutions Pvt Ltd was established and incorporated in the year 2017. 
The bidder possesses over 7 years of experience in executing large-scale Enterprise Server Deployments, Cloud Computing and IT Hardware Infrastructure Supply for Government Ministries and State PSUs.

Past Executed Contracts in Last 5 Years:
1. Client: Indian Railway Catering and Tourism Corp (IRCTC)
   Project: Supply and Commissioning of Tier-III Data Center Storage & Compute Nodes.
   Contract Value: ₹ 12.40 Crores
   Completion Date: March 2023 (Satisfactory Performance Certificate Issued)

2. Client: Bharat Petroleum Corporation Limited (BPCL)
   Project: Enterprise IT Server Maintenance & Cloud Migration Services.
   Contract Value: ₹ 8.90 Crores
   Completion Date: November 2023 (Executed Successfully)

Authorized Signatory: Vikramaditya Verma (Managing Director)
""")

    alpha_legal_path = os.path.join(alpha_dir, "Statutory_GST_PAN_MII_Undertaking.txt")
    with open(alpha_legal_path, "w", encoding="utf-8") as f:
        f.write("""STATUTORY REGISTRATIONS AND MANDATORY DECLARATIONS
Bidder: AlphaTech Solutions Pvt Ltd

1. GST REGISTRATION:
   GSTIN: 07AABCA1234F1Z5
   Legal Name: AlphaTech Solutions Private Limited
   Taxpayer Type: Regular Taxpayer
   GST Status: Active (Verified on GST Portal)

2. PERMANENT ACCOUNT NUMBER (PAN):
   PAN: AABCA1234F

3. NON-BLACKLISTING SELF-DECLARATION & AFFIDAVIT:
   "We hereby solemnly declare and affirm that AlphaTech Solutions Private Limited, its directors, and promoters have NEVER been blacklisted, debarred, or banned by the Government of India, GeM Portal, State Governments, or any Public Sector Undertaking (PSU) as on date."

4. MAKE IN INDIA (MII) LOCAL CONTENT DECLARATION:
   "We hereby certify that our proposed supply and service contains 65% Local Content, qualifying us as a Class-I Local Supplier under the Public Procurement (Preference to Make in India) Order 2017 / DPIIT guidelines."

Authorized Signatory: Vikramaditya Verma
Stamp & Seal of Company
""")

    # 2. Bharat Digital (Non-Compliant: Turnover ₹4.2 Cr vs ₹10 Cr, ISO expired)
    bharat_dir = os.path.join(SAMPLE_DOCS_DIR, "Bharat_Digital_Networks")
    os.makedirs(bharat_dir, exist_ok=True)

    bharat_financial_path = os.path.join(bharat_dir, "Audited_Turnover_FY24.txt")
    with open(bharat_financial_path, "w", encoding="utf-8") as f:
        f.write("""BHARAT DIGITAL NETWORKS LIMITED
CIN: L72900MH2019PLC220199
Nariman Point, Mumbai - 400021

FINANCIAL TURNOVER SUMMARY
Certified by M/s K. Mehta & Co., Chartered Accountants

Annual Turnover:
- FY 2021-22: ₹ 3.80 Crores
- FY 2022-23: ₹ 4.10 Crores
- FY 2023-24: ₹ 4.70 Crores
Average Annual Financial Turnover over 3 Years: ₹ 4.20 Crores (Rupees Four Crores and Twenty Lakhs Only).
Net Worth: ₹ 1.80 Crores.
UDIN: 24055219BCDEFA1298
""")

    bharat_iso_path = os.path.join(bharat_dir, "ISO_Certification.txt")
    with open(bharat_iso_path, "w", encoding="utf-8") as f:
        f.write("""GLOBAL STANDARDS CERTIFICATION
Quality Management System — ISO 9001:2015
Certificate of Compliance

Issued to: BHARAT DIGITAL NETWORKS LIMITED, Mumbai
Standard: ISO 9001:2015 Quality Management

Certificate No: GSC/IND/2020/4102
Issue Date: 10-January-2020
Expiry Date: 09-January-2023 (EXPIRED CERTIFICATE - RE-AUDIT PENDING)
""")

    bharat_legal_path = os.path.join(bharat_dir, "GST_and_Experience.txt")
    with open(bharat_legal_path, "w", encoding="utf-8") as f:
        f.write("""BHARAT DIGITAL NETWORKS LIMITED
GSTIN: 27AABCB9876K1Z3
PAN: AABCB9876K
Bidder has 4 years of experience in network cabling and server installation.
Non-Blacklisting Declaration: Bidder confirms clean track record with no debarment history.
Make in India Local Content: 45% Local Content (Class-II Supplier).
""")

    # 3. CyberCore Systems (Needs Verification: Ambiguous Turnover stamp & experience duration)
    cyber_dir = os.path.join(SAMPLE_DOCS_DIR, "CyberCore_Systems")
    os.makedirs(cyber_dir, exist_ok=True)

    cyber_doc_path = os.path.join(cyber_dir, "Bidder_Consolidated_Bid_Folder.txt")
    with open(cyber_doc_path, "w", encoding="utf-8") as f:
        f.write("""CYBERCORE SYSTEMS LLP
Plot 88, Electronic City Phase-I, Bengaluru - 560100

1. CORPORATE PROFILE:
CyberCore Systems LLP operates in enterprise cloud management. We have executed contracts with state entities.
Experience: Operating actively since establishment. Team carries extensive experience in cloud architecture.

2. FINANCIAL HIGHLIGHTS:
Turnover in 2023-24 exceeded ₹ 11 Crores according to provisional ledger estimates. (Audited Balance Sheet submitted in Annexure B with pending CA verification stamp).

3. CERTIFICATIONS & TAX:
ISO 9001:2015 Registration in progress with TUV Nord.
GSTIN: 29AAHFC4411Q1ZP
PAN: AAHFC4411Q

4. UNDERTAKING:
We declare no active court blacklisting orders against CyberCore Systems LLP.
Make in India content: Declared 55% local value addition.
""")

    return {
        "alpha": [alpha_financial_path, alpha_iso_path, alpha_experience_path, alpha_legal_path],
        "bharat": [bharat_financial_path, bharat_iso_path, bharat_legal_path],
        "cyber": [cyber_doc_path]
    }


def seed_sample_database(db: Session):
    """Populates initial sample GeM tenders, requirements, and vendor bids with AI evaluations."""
    
    # Check if tender already exists
    existing = db.query(Tender).filter(Tender.bid_number == "GEM/2026/B/894120").first()
    if existing:
        return

    print("[Seed] Creating GeM Sample Tenders and Requirements...")

    # Tender 1: Cloud & IT Hardware Infrastructure
    tender1 = Tender(
        bid_number="GEM/2026/B/894120",
        title="Supply, Installation & Maintenance of Enterprise Cloud Infrastructure & Data Center Hardware",
        organization="Ministry of Electronics & Information Technology (MeitY)",
        category="IT Infrastructure & Data Center",
        estimated_value="₹ 25.00 Cr",
        submission_deadline="15-Oct-2026 15:00:00",
        status="ACTIVE"
    )
    db.add(tender1)
    db.flush()

    # Requirements for Tender 1
    reqs_t1 = [
        Requirement(
            tender_id=tender1.id,
            clause_no="Clause 3.1.1",
            title="Annual Financial Turnover",
            description="The average annual financial turnover of the bidder during the last 3 financial years (FY 2021-22, 2022-23, 2023-24) must be at least ₹10.00 Crores, duly certified by a Chartered Accountant with valid UDIN.",
            category="FINANCIAL",
            requirement_type="NUMERIC_THRESHOLD",
            threshold_value="10.0",
            threshold_unit="Crores INR",
            is_mandatory=True,
            scoring_weight=1.5
        ),
        Requirement(
            tender_id=tender1.id,
            clause_no="Clause 3.1.2",
            title="Years of Proven Experience",
            description="The bidder must have a minimum of 5 years of proven experience in supplying, deploying, or maintaining enterprise IT hardware / Data Center infrastructure.",
            category="EXPERIENCE",
            requirement_type="EXPERIENCE_YEARS",
            threshold_value="5",
            threshold_unit="Years",
            is_mandatory=True,
            scoring_weight=1.2
        ),
        Requirement(
            tender_id=tender1.id,
            clause_no="Clause 3.2.1",
            title="Quality Management System (ISO 9001:2015)",
            description="Bidder must possess a valid ISO 9001:2015 Quality Management System accreditation certificate issued by an accredited certification body (NABCB / IAF).",
            category="CERTIFICATION",
            requirement_type="CERTIFICATE",
            threshold_value="ISO 9001:2015",
            threshold_unit="Valid Certificate",
            is_mandatory=True,
            scoring_weight=1.0
        ),
        Requirement(
            tender_id=tender1.id,
            clause_no="Clause 3.3.1",
            title="Valid GST & PAN Statutory Registration",
            description="Bidder must submit copy of active GSTIN registration certificate and PAN card in the name of the bidding entity.",
            category="LEGAL",
            requirement_type="CERTIFICATE",
            threshold_value="Active GSTIN & PAN",
            threshold_unit="Government Tax ID",
            is_mandatory=True,
            scoring_weight=1.0
        ),
        Requirement(
            tender_id=tender1.id,
            clause_no="Clause 3.4.1",
            title="Non-Blacklisting & Clean Track Record Affidavit",
            description="Bidder must submit a notarized affidavit stating that the firm has never been blacklisted or debarred by any Central/State Government Ministry, PSU, or GeM.",
            category="LEGAL",
            requirement_type="BOOLEAN_DECLARATION",
            threshold_value="Clean Affidavit",
            threshold_unit="Notarized Declaration",
            is_mandatory=True,
            scoring_weight=1.0
        ),
        Requirement(
            tender_id=tender1.id,
            clause_no="Clause 3.5.1",
            title="Make in India (MII) Preference Local Content",
            description="Bidder must submit local content declaration in terms of DPIIT PPP-MII Order. Class-I Local Supplier (local content ≥ 50%) shall be granted purchase preference.",
            category="MII",
            requirement_type="NUMERIC_THRESHOLD",
            threshold_value="50",
            threshold_unit="% Local Content",
            is_mandatory=False,
            scoring_weight=0.8
        )
    ]
    for r in reqs_t1:
        db.add(r)
    db.flush()

    # Tender 2: Facility Management Services
    tender2 = Tender(
        bid_number="GEM/2026/B/771204",
        title="Comprehensive Annual Maintenance & Facility Management Services for Data Center Operations",
        organization="National Informatics Centre (NIC)",
        category="Facility Management & IT Support",
        estimated_value="₹ 8.50 Cr",
        submission_deadline="28-Nov-2026 14:00:00",
        status="ACTIVE"
    )
    db.add(tender2)
    db.flush()

    reqs_t2 = [
        Requirement(
            tender_id=tender2.id,
            clause_no="Clause 2.1",
            title="Annual Financial Turnover",
            description="Bidder must have average turnover ≥ ₹ 5.00 Crores over last 3 years.",
            category="FINANCIAL",
            requirement_type="NUMERIC_THRESHOLD",
            threshold_value="5.0",
            threshold_unit="Crores INR",
            is_mandatory=True
        ),
        Requirement(
            tender_id=tender2.id,
            clause_no="Clause 2.2",
            title="Relevant Service Experience",
            description="Minimum 3 years experience in IT facility management.",
            category="EXPERIENCE",
            requirement_type="EXPERIENCE_YEARS",
            threshold_value="3",
            threshold_unit="Years",
            is_mandatory=True
        ),
        Requirement(
            tender_id=tender2.id,
            clause_no="Clause 2.3",
            title="Active GSTIN Registration",
            description="Valid GSTIN certificate of the bidding entity.",
            category="LEGAL",
            requirement_type="CERTIFICATE",
            threshold_value="Active GSTIN",
            threshold_unit="Tax ID",
            is_mandatory=True
        )
    ]
    for r in reqs_t2:
        db.add(r)
    db.flush()

    # Generate sample documents on disk
    doc_paths = generate_sample_file_content()

    # Create Vendor 1: AlphaTech Solutions (Compliant)
    v1 = VendorBid(
        tender_id=tender1.id,
        vendor_name="AlphaTech Solutions Pvt Ltd",
        vendor_gstin="07AABCA1234F1Z5",
        vendor_pan="AABCA1234F",
        contact_email="bids@alphatech-solutions.com",
        submission_date=datetime.datetime.utcnow() - datetime.timedelta(days=2)
    )
    db.add(v1)
    db.flush()

    # Process and attach documents for Vendor 1
    v1_all_chunks = []
    for fpath in doc_paths["alpha"]:
        fname = os.path.basename(fpath)
        page_count, chunks, _ = DocumentProcessor.process_file(fpath, fname)
        v1_all_chunks.extend(chunks)
        d = Document(
            vendor_bid_id=v1.id,
            filename=fname,
            file_path=fpath,
            file_type="TXT",
            file_size_bytes=os.path.getsize(fpath),
            page_count=page_count,
            processing_status="PROCESSED",
            extracted_chunks_json=json.dumps(chunks)
        )
        db.add(d)
    db.flush()

    # Run Compliance Engine on Vendor 1
    _evaluate_and_record_verdicts(db, v1, reqs_t1, v1_all_chunks)

    # Create Vendor 2: Bharat Digital Networks (Non-Compliant)
    v2 = VendorBid(
        tender_id=tender1.id,
        vendor_name="Bharat Digital Networks Ltd",
        vendor_gstin="27AABCB9876K1Z3",
        vendor_pan="AABCB9876K",
        contact_email="tenders@bharatdigital.in",
        submission_date=datetime.datetime.utcnow() - datetime.timedelta(days=1)
    )
    db.add(v2)
    db.flush()

    v2_all_chunks = []
    for fpath in doc_paths["bharat"]:
        fname = os.path.basename(fpath)
        page_count, chunks, _ = DocumentProcessor.process_file(fpath, fname)
        v2_all_chunks.extend(chunks)
        d = Document(
            vendor_bid_id=v2.id,
            filename=fname,
            file_path=fpath,
            file_type="TXT",
            file_size_bytes=os.path.getsize(fpath),
            page_count=page_count,
            processing_status="PROCESSED",
            extracted_chunks_json=json.dumps(chunks)
        )
        db.add(d)
    db.flush()

    _evaluate_and_record_verdicts(db, v2, reqs_t1, v2_all_chunks)

    # Create Vendor 3: CyberCore Systems (Needs Verification)
    v3 = VendorBid(
        tender_id=tender1.id,
        vendor_name="CyberCore Systems LLP",
        vendor_gstin="29AAHFC4411Q1ZP",
        vendor_pan="AAHFC4411Q",
        contact_email="compliance@cybercore.io",
        submission_date=datetime.datetime.utcnow()
    )
    db.add(v3)
    db.flush()

    v3_all_chunks = []
    for fpath in doc_paths["cyber"]:
        fname = os.path.basename(fpath)
        page_count, chunks, _ = DocumentProcessor.process_file(fpath, fname)
        v3_all_chunks.extend(chunks)
        d = Document(
            vendor_bid_id=v3.id,
            filename=fname,
            file_path=fpath,
            file_type="TXT",
            file_size_bytes=os.path.getsize(fpath),
            page_count=page_count,
            processing_status="PROCESSED",
            extracted_chunks_json=json.dumps(chunks)
        )
        db.add(d)
    db.flush()

    _evaluate_and_record_verdicts(db, v3, reqs_t1, v3_all_chunks)

    # Add default system settings
    default_settings = [
        ("llm_provider", "smart_mock"),
        ("ocr_mode", "hybrid"),
        ("gemini_api_key", ""),
        ("openai_api_key", ""),
        ("model_name", "gemini-1.5-flash")
    ]
    for k, v in default_settings:
        db.add(SystemSetting(key=k, value=v))

    db.commit()
    print("[Seed] Sample GeM Tenders and Vendor Evaluations successfully seeded!")


def _evaluate_and_record_verdicts(db: Session, vendor: VendorBid, requirements: list, chunks: list):
    """Helper to evaluate and calculate vendor summary counts."""
    comp = 0
    non_comp = 0
    needs_rev = 0
    total = len(requirements)

    for req in requirements:
        res = ComplianceEngine._evaluate_with_smart_engine(
            requirement={
                "id": req.id,
                "title": req.title,
                "description": req.description,
                "category": req.category,
                "requirement_type": req.requirement_type,
                "threshold_value": req.threshold_value,
                "threshold_unit": req.threshold_unit,
                "clause_no": req.clause_no
            },
            relevant_chunks=ComplianceEngine._retrieve_relevant_chunks(
                requirement={"title": req.title, "description": req.description, "category": req.category},
                chunks=chunks
            )
        )

        st = res.get("status", "NEEDS_VERIFICATION")
        if st == "COMPLIANT":
            comp += 1
        elif st == "NON_COMPLIANT":
            non_comp += 1
        else:
            needs_rev += 1

        v = ComplianceVerdict(
            vendor_bid_id=vendor.id,
            requirement_id=req.id,
            status=st,
            confidence_score=res.get("confidence_score", 70.0),
            evidence_snippet=res.get("evidence_snippet"),
            document_name=res.get("document_name"),
            page_number=res.get("page_number", 1),
            extracted_value=res.get("extracted_value"),
            required_value=res.get("required_value"),
            reasoning=res.get("reasoning")
        )
        db.add(v)

    vendor.total_requirements = total
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

    vendor.last_evaluated_at = datetime.datetime.utcnow()
    vendor.verification_summary = f"AI Audit: {comp}/{total} Compliant, {non_comp} Non-Compliant, {needs_rev} Under Review."


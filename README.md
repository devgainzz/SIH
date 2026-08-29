# BidVerify AI — AI-Powered Bid Compliance Verification for GeM (SIH26100)

**BidVerify AI** is an intelligent, explainable bid compliance verification and audit system designed for **Government e-Marketplace (GeM)** tenders.

It empowers procurement officers and technical evaluation committees to rapidly verify vendor bid submissions against complex eligibility criteria clauses with 100% evidentiary traceability, automated threshold extraction, tamper-evident officer overrides, and exportable audit reports.

---

## 🌟 Key Features

1. **Tender & Requirement Management**
   - Pre-loaded with realistic GeM Tenders (Cloud Infrastructure, Facility Management).
   - **AI Requirement Auto-Parser**: Paste raw eligibility text from any GeM tender notice to instantly extract discrete checkable criteria with numeric thresholds, categories, and mandatory tags.

2. **Document Ingestion & Multi-Format OCR Pipeline**
   - Handles multi-file uploads: Native PDFs, Scanned Image PDFs, DOCX, TXT, and Images (JPG/PNG).
   - Extracts page-level chunks with exact page numbering so every citation can be traced back to its source document page.

3. **AI Compliance Matching Engine (RAG + Explainable Reasoning)**
   - **Dual AI Engine Modes**:
     - **Built-in Smart RAG Engine**: Zero API key needed! Evaluates numeric thresholds (e.g. Turnover $\ge$ ₹10 Cr, Experience $\ge$ 5 years), dates & validity (detects expired ISO certifications), GSTIN & PAN format validation, Make in India local content %, and clean track record declarations.
     - **Swappable LLMs**: Native support for **Google Gemini API** (`gemini-1.5-flash`) and **OpenAI** (`gpt-4o-mini`) via API key configuration in settings.
   - Outputs for every requirement:
     - `status`: `COMPLIANT` | `NON_COMPLIANT` | `NEEDS_VERIFICATION`
     - `confidence_score`: 0–100%
     - `evidence_snippet`: Exact text quotation from vendor document
     - `document_name` and `page_number`
     - `extracted_value` vs `required_value` comparison
     - `reasoning`: 1–2 sentence clear explanation

4. **Procurement Officer Manual Overrides & Audit Trail**
   - Procurement officers can manually override any AI verdict (Approve / Reject / Request Clarification).
   - Requires mandatory justification comment, recording officer name and ISO timestamp in an audit log.
   - Option to revert overrides back to original AI verdicts.

5. **Multi-Vendor Evaluation Matrix**
   - Side-by-side comparison table of all competing bidders for a tender.
   - Requirement-by-requirement status badges and overall compliance scores.

6. **Export to Official GeM PDF Report**
   - Download professional, print-ready compliance audit PDF reports with executive summary boxes, clause tables, citations, and digital officer sign-off stamps.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
python -m pip install -r backend/requirements.txt
```

### 2. Run the Application
```bash
python run.py
```
Open your browser and navigate to: **`http://localhost:8000`**

### 3. Run Automated System Tests
```bash
python test_system.py
```

---

## 📂 Pre-Loaded GeM Demo Data

1. **Tender**: `GEM/2026/B/894120` — *Enterprise Cloud Infrastructure & Data Center Hardware* (₹ 25.00 Cr, MeitY).
2. **Bidders**:
   - **AlphaTech Solutions Pvt Ltd**: **100% Compliant** (₹18.5 Cr turnover $\ge$ 10 Cr, 7 yrs experience $\ge$ 5 yrs, Valid ISO 9001:2015 till 2027, Active GSTIN, MII 65%).
   - **Bharat Digital Networks Ltd**: **Non-Compliant** (Turnover ₹4.2 Cr $<$ 10 Cr, Expired ISO 9001 certificate in 2023).
   - **CyberCore Systems LLP**: **Needs Verification** (Provisional turnover without CA UDIN stamp, ambiguous experience duration).

---

## 🏛️ System Architecture

```
+-----------------------------------------------------------------------------------+
|                           Frontend (React 18 + Tailwind)                          |
|  - GeM Themed Single-Page Application (FastAPI Static Mount)                      |
|  - Requirement Parser, Vendor Comparison Matrix, Explainable Report Cards         |
|  - Officer Override Modal with Audit Trail, Swappable AI Engine Settings          |
+------------------------------------------+----------------------------------------+
                                           | REST API (JSON)
+------------------------------------------v----------------------------------------+
|                           Backend (FastAPI + Python)                              |
|  - Routers: /api/tenders, /api/vendors, /api/compliance, /api/settings            |
|  - DocumentProcessor: PyMuPDF (fitz), python-docx, OCR fallback, Page Chunking    |
|  - ComplianceEngine: RAG Context Ranking, Gemini / OpenAI / Smart Rule Evaluator  |
|  - ReportGenerator: ReportLab PDF Generator with GeM Audit Sign-off               |
|  - Database: SQLite (bidverify.db) with SQLAlchemy Models                         |
+-----------------------------------------------------------------------------------+
```


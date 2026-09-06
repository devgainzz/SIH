/**
 * ============================================================================
 * BidVerify AI — Government e-Marketplace (GeM) Bid Compliance Verification Portal
 * Frontend Single-Page Application (SPA) Built with React 18 & Tailwind CSS
 * Smart India Hackathon (Problem Statement: SIH26100)
 * ============================================================================
 *
 * Description:
 *   This file contains the complete client-side application logic for BidVerify AI.
 *   It manages tender repositories, document OCR uploads, AI compliance verification,
 *   multi-vendor comparison matrices, officer manual overrides, and PDF audit exports.
 *
 * Architecture & Key Sections:
 *   1. National Symbols & Government Branding Components (Ashoka Chakra, Emblem)
 *   2. Status Badges & Requirement Category Helpers
 *   3. Main App Component (State Management & API Handlers)
 *   4. View 1: Tender Repository Dashboard (Dense Data Table & Statistics)
 *   5. View 2: Tender Specification Workspace (Clauses, Matrix, Bid Submission)
 *   6. View 3: Explainable Compliance Audit Report:
 *      - Zone 1: सरल सारांश / Simple Summary (Layman-Friendly for Small Vendors)
 *      - Zone 2: विस्तृत तकनीकी रिपोर्ट / Detailed Technical Report (For Evaluation Officers)
 *   7. Modals: Officer Override Audit Stamp, AI Engine Settings, New Tender Creation
 */

const { useState, useEffect, useRef } = React;

// API Base URL (Empty string for relative host endpoint)
const API_BASE = "";

/**
 * Helper to trigger Lucide icon rendering after DOM updates
 */
function refreshIcons() {
  setTimeout(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, 50);
}

/**
 * AshokaChakra: SVG Vector component representing the 24-spoke Ashoka Chakra.
 * Displayed in the government masthead.
 */
function AshokaChakra({ size = 28, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={`text-[#0B3D91] ${className}`} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5"
    >
      <circle cx="50" cy="50" r="46" strokeWidth="3" />
      <circle cx="50" cy="50" r="8" fill="currentColor" />
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 15 * Math.PI) / 180;
        const x2 = 50 + 44 * Math.cos(angle);
        const y2 = 50 + 44 * Math.sin(angle);
        return <line key={i} x1="50" y1="50" x2={x2} y2={y2} strokeWidth="1.5" />;
      })}
    </svg>
  );
}

/**
 * NationalEmblem: State Emblem of India (Ashoka Lion Capital placeholder with 'सत्यमेव जयते').
 */
function NationalEmblem({ className = "w-10 h-12" }) {
  return (
    <div className={`border border-[#D1D5DB] bg-[#FAFAFA] flex flex-col items-center justify-center p-1 text-center shrink-0 ${className}`}>
      <svg className="w-7 h-7 text-[#0B3D91]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 4.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5-2.5-1.12-2.5-2.5 1.12-2.5 2.5-2.5zm0 13c-2.7-1-5-4.5-5-8.5V6.3l5-1.9 5 1.9v4.7c0 4-2.3 7.5-5 8.5z"/>
      </svg>
      <span className="text-[7px] font-black text-gray-700 uppercase tracking-tighter mt-0.5">सत्यमेव जयते</span>
    </div>
  );
}

/**
 * getCategoryInfo: Maps tender requirement categories to colors, icons, and plain-language hints.
 * Categories: FINANCIAL (₹), EXPERIENCE (⏱), CERTIFICATION (📜), LEGAL (⚖), MII (🇮🇳).
 */
function getCategoryInfo(category) {
  switch ((category || "").toUpperCase()) {
    case "FINANCIAL": 
      return { 
        color: "bg-blue-100 text-blue-900 border-blue-300", 
        icon: "₹", 
        label: "वित्तीय आवश्यकता / Financial Turnover",
        hint: "3-year audited annual turnover or CA certificate with valid UDIN."
      };
    case "EXPERIENCE": 
      return { 
        color: "bg-indigo-100 text-indigo-900 border-indigo-300", 
        icon: "⏱", 
        label: "कार्य अनुभव / Prior Experience",
        hint: "Work completion orders or past contract certificates."
      };
    case "CERTIFICATION": 
      return { 
        color: "bg-emerald-100 text-emerald-900 border-emerald-300", 
        icon: "📜", 
        label: "गुणवत्ता प्रमाणन / ISO & Quality",
        hint: "Valid ISO 9001:2015 accreditation certificate with active expiry date."
      };
    case "LEGAL": 
      return { 
        color: "bg-purple-100 text-purple-900 border-purple-300", 
        icon: "⚖", 
        label: "वैधानिक और शपथ पत्र / Statutory & Affidavit",
        hint: "Active GSTIN certificate, PAN card, or Non-Blacklisting notarized affidavit."
      };
    case "MII": 
      return { 
        color: "bg-amber-100 text-amber-900 border-amber-300", 
        icon: "🇮🇳", 
        label: "मेक इन इंडिया / Make In India (MII)",
        hint: "Local content percentage self-declaration (Class-I ≥ 50%)."
      };
    default: 
      return { 
        color: "bg-gray-100 text-gray-800 border-gray-300", 
        icon: "📋", 
        label: "तकनीकी मानदंड / Technical Specification",
        hint: "Supporting compliance documentation."
      };
  }
}

/**
 * StatusBadge: Solid rectangular status badges conforming to gov.in standards:
 * - COMPLIANT (#138808 Solid Green)
 * - NON_COMPLIANT (#C51C1C Solid Red)
 * - NEEDS_VERIFICATION (#D97706 Solid Amber)
 */
function StatusBadge({ status, size = "md" }) {
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs";
  switch (status) {
    case "COMPLIANT":
      return (
        <span className={`gov-tag inline-flex items-center gap-1 font-bold text-white uppercase tracking-wider ${pad}`} style={{ backgroundColor: "#138808", border: "1px solid #0D6E05" }}>
          <span>✓</span> COMPLIANT / योग्य
        </span>
      );
    case "NON_COMPLIANT":
      return (
        <span className={`gov-tag inline-flex items-center gap-1 font-bold text-white uppercase tracking-wider ${pad}`} style={{ backgroundColor: "#C51C1C", border: "1px solid #991B1B" }}>
          <span>✕</span> NON-COMPLIANT / अपात्र
        </span>
      );
    case "NEEDS_VERIFICATION":
      return (
        <span className={`gov-tag inline-flex items-center gap-1 font-bold text-white uppercase tracking-wider ${pad}`} style={{ backgroundColor: "#D97706", border: "1px solid #B45309" }}>
          <span>⚠</span> NEEDS REVIEW / समीक्षा आवश्यक
        </span>
      );
    default:
      return (
        <span className={`gov-tag inline-flex items-center gap-1 font-bold text-white uppercase tracking-wider ${pad}`} style={{ backgroundColor: "#4B5563", border: "1px solid #374151" }}>
          {status || "PENDING"}
        </span>
      );
  }
}

/**
 * Main Application Root Component: App
 */
function App() {
  // --------------------------------------------------------------------------
  // Application State
  // --------------------------------------------------------------------------
  const [tenders, setTenders] = useState([]);
  const [currentTender, setCurrentTender] = useState(null);
  const [currentVendor, setCurrentVendor] = useState(null);
  const [comparisonMatrix, setComparisonMatrix] = useState(null);
  
  // Navigation & View Routing State
  const [activeView, setActiveView] = useState("dashboard"); // 'dashboard', 'tender_detail', 'vendor_report'
  const [activeTab, setActiveTab] = useState("requirements"); // 'requirements', 'matrix', 'upload'
  const [reportViewMode, setReportViewMode] = useState("segregated"); // 'segregated', 'simple_only', 'detailed_only'
  const [filterStatus, setFilterStatus] = useState("ALL");
  
  // UI & Loading State
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [toast, setToast] = useState(null);

  // Accessibility State (Text Size, Language & Dark Mode Toggle)
  const [fontScale, setFontScale] = useState(1);
  const [language, setLanguage] = useState("EN"); // 'EN', 'HI'
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("bidverify_theme") === "dark";
  });

  // Modal Dialogs State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNewTenderModal, setShowNewTenderModal] = useState(false);
  const [newTenderInitialData, setNewTenderInitialData] = useState(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedVerdict, setSelectedVerdict] = useState(null);
  const [selectedCategoryCriteria, setSelectedCategoryCriteria] = useState(null);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [dashboardCategory, setDashboardCategory] = useState(null);
  const [overrideForm, setOverrideForm] = useState({ 
    status: "COMPLIANT", 
    comment: "", 
    officer_name: "Technical Evaluation Committee (GeM)" 
  });

  // AI Clause Parser State
  const [rawTenderText, setRawTenderText] = useState("");
  const [isParsingReqs, setIsParsingReqs] = useState(false);

  // Vendor Bid Registration & Multi-File Upload State
  const [newVendorData, setNewVendorData] = useState({ 
    vendor_name: "", 
    vendor_gstin: "", 
    vendor_pan: "", 
    contact_email: "" 
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [createdVendorId, setCreatedVendorId] = useState(null);
  const [uploadedDocsList, setUploadedDocsList] = useState([]);

  // AI Engine Configuration Settings
  const [settings, setSettings] = useState({
    llm_provider: "smart_mock",
    gemini_api_key: "",
    openai_api_key: "",
    model_name: "gemini-1.5-flash",
    ocr_mode: "hybrid"
  });

  /**
   * Helper to display temporary toast notifications
   */
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  /**
   * Accessibility Helper: Adjusts root font-scale dynamically
   */
  const adjustFontScale = (delta) => {
    let newScale = 1;
    if (delta === 0) newScale = 1;
    else if (delta === -1) newScale = 0.9;
    else if (delta === 1) newScale = 1.15;
    
    setFontScale(newScale);
    document.documentElement.style.setProperty("--gov-font-scale", newScale);
  };

  /**
   * Dark Mode Toggle Handler
   */
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  // Synchronize Dark Mode class on document & body and persist in localStorage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      localStorage.setItem("bidverify_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      localStorage.setItem("bidverify_theme", "light");
    }
    refreshIcons();
  }, [darkMode]);

  // Initial load of tenders and settings on component mount
  useEffect(() => {
    loadTenders();
    loadSettings();
  }, []);

  // Re-trigger icon rendering when view/state changes
  useEffect(() => {
    refreshIcons();
  }, [activeView, activeTab, currentTender, currentVendor, showOverrideModal, showSettingsModal, showNewTenderModal, fontScale, reportViewMode, darkMode]);

  // --------------------------------------------------------------------------
  // API Fetching & Action Handlers
  // --------------------------------------------------------------------------

  /** Load all published tenders from /api/tenders */
  const loadTenders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/tenders`);
      const data = await res.json();
      setTenders(data);
      if (data.length > 0 && !currentTender) {
        loadTenderDetail(data[0].id);
      }
    } catch (e) {
      showToast("Error loading tenders", "error");
    } finally {
      setLoading(false);
    }
  };

  /** Load single tender details and comparison matrix from /api/tenders/{id} */
  const loadTenderDetail = async (tenderId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/tenders/${tenderId}`);
      const data = await res.json();
      setCurrentTender(data);
      loadComparisonMatrix(tenderId);
    } catch (e) {
      showToast("Error loading tender details", "error");
    } finally {
      setLoading(false);
    }
  };

  /** Load multi-vendor matrix grid from /api/tenders/{id}/matrix */
  const loadComparisonMatrix = async (tenderId) => {
    try {
      const res = await fetch(`${API_BASE}/api/tenders/${tenderId}/matrix`);
      const data = await res.json();
      setComparisonMatrix(data);
    } catch (e) {
      console.error(e);
    }
  };

  /** Load single vendor proposal details from /api/vendors/{id} */
  const loadVendorReport = async (vendorId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/vendors/${vendorId}`);
      const data = await res.json();
      setCurrentVendor(data);
      setActiveView("vendor_report");
    } catch (e) {
      showToast("Error loading vendor compliance report", "error");
    } finally {
      setLoading(false);
    }
  };

  /** Load AI Engine configuration settings from /api/settings */
  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      const data = await res.json();
      setSettings(prev => ({ ...prev, ...data }));
    } catch (e) {
      console.error(e);
    }
  };

  /** Save updated AI Engine settings via POST /api/settings */
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        showToast("AI Engine configuration updated successfully.");
        setShowSettingsModal(false);
        loadSettings();
      }
    } catch (e) {
      showToast("Error saving settings", "error");
    }
  };

  /** Trigger AI Clause Auto-Parser on unstructured text */
  const handleParseRequirements = async () => {
    if (!rawTenderText.trim() || !currentTender) return;
    try {
      setIsParsingReqs(true);
      const res = await fetch(`${API_BASE}/api/tenders/${currentTender.id}/parse-requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tender_text: rawTenderText })
      });
      if (res.ok) {
        showToast("Eligibility criteria parsed and added to tender specification.");
        setRawTenderText("");
        loadTenderDetail(currentTender.id);
      }
    } catch (e) {
      showToast("Error parsing requirements", "error");
    } finally {
      setIsParsingReqs(false);
    }
  };

  /** Register new vendor proposal, upload supporting documents, and trigger evaluation */
  const handleCreateVendorAndUpload = async (e) => {
    e.preventDefault();
    if (!newVendorData.vendor_name || !currentTender) {
      showToast("Vendor Legal Name is mandatory.", "error");
      return;
    }

    try {
      setLoading(true);
      // Step 1: Create vendor bid record
      const vRes = await fetch(`${API_BASE}/api/vendors/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tender_id: currentTender.id,
          vendor_name: newVendorData.vendor_name,
          vendor_gstin: newVendorData.vendor_gstin,
          vendor_pan: newVendorData.vendor_pan,
          contact_email: newVendorData.contact_email
        })
      });
      const vendor = await vRes.json();
      setCreatedVendorId(vendor.id);

      // Step 2: Upload files if selected
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        for (let i = 0; i < selectedFiles.length; i++) {
          formData.append("files", selectedFiles[i]);
        }
        const upRes = await fetch(`${API_BASE}/api/vendors/${vendor.id}/upload-documents`, {
          method: "POST",
          body: formData
        });
        const docs = await upRes.json();
        setUploadedDocsList(docs);
      }

      showToast(`Vendor bid registered. Executing AI verification...`);
      // Step 3: Trigger AI evaluation
      await handleEvaluateVendor(vendor.id);
    } catch (e) {
      showToast("Error creating vendor or uploading documents", "error");
    } finally {
      setLoading(false);
    }
  };

  /** Run AI Compliance Verification on a vendor proposal via POST /api/vendors/{id}/evaluate */
  const handleEvaluateVendor = async (vendorId) => {
    try {
      setEvaluating(true);
      const res = await fetch(`${API_BASE}/api/vendors/${vendorId}/evaluate`, {
        method: "POST"
      });
      if (res.ok) {
        const evaluatedVendor = await res.json();
        setCurrentVendor(evaluatedVendor);
        showToast("Technical compliance audit completed successfully.");
        setActiveView("vendor_report");
        loadTenders();
        if (currentTender) loadComparisonMatrix(currentTender.id);
      } else {
        const err = await res.json();
        showToast(err.detail || "Evaluation failed", "error");
      }
    } catch (e) {
      showToast("Error during AI evaluation", "error");
    } finally {
      setEvaluating(false);
    }
  };

  /** Submit Officer Manual Override via POST /api/compliance/override */
  const handleSubmitOverride = async (e) => {
    e.preventDefault();
    if (!selectedVerdict) return;
    try {
      const res = await fetch(`${API_BASE}/api/compliance/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verdict_id: selectedVerdict.id,
          override_status: overrideForm.status,
          officer_name: overrideForm.officer_name,
          officer_comment: overrideForm.comment
        })
      });
      if (res.ok) {
        showToast("Officer override successfully recorded in audit log.");
        setShowOverrideModal(false);
        if (currentVendor) loadVendorReport(currentVendor.id);
        if (currentTender) loadComparisonMatrix(currentTender.id);
      }
    } catch (e) {
      showToast("Error recording override", "error");
    }
  };

  /** Revert Officer Manual Override via POST /api/compliance/revert-override/{id} */
  const handleRevertOverride = async (verdictId) => {
    try {
      const res = await fetch(`${API_BASE}/api/compliance/revert-override/${verdictId}`, {
        method: "POST"
      });
      if (res.ok) {
        showToast("Verdict reverted to original AI evaluation.");
        if (currentVendor) loadVendorReport(currentVendor.id);
        if (currentTender) loadComparisonMatrix(currentTender.id);
      }
    } catch (e) {
      showToast("Error reverting override", "error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5] text-[#1F2937]">
      {/* 1. Indian Tricolor Top Accent Strip */}
      <div className="tricolor-bar"></div>

      {/* 2. Top Accessibility & National Portal Masthead Strip */}
      <div className="bg-[#E5E7EB] text-[#374151] text-xs px-6 py-1.5 border-b border-[#D1D5DB] flex flex-wrap justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#0B3D91] flex items-center gap-1.5">
            <span className="text-sm">🇮🇳</span> भारत सरकार | Government of India
          </span>
          <span className="text-gray-400">|</span>
          <span className="hidden sm:inline font-medium">वाणिज्य एवं उद्योग मंत्रालय | Ministry of Commerce & Industry</span>
        </div>

        {/* Accessibility & Utility Controls */}
        <div className="flex items-center gap-4 text-[11px]">
          <a href="#main-content" className="hover:underline text-[#0B3D91] font-bold">
            Skip to Main Content
          </a>
          <span className="text-gray-300">|</span>
          
          {/* Text Resize Controls (A- / A / A+) */}
          <div className="flex items-center gap-1">
            <span className="text-gray-600 font-semibold mr-1">Text Size:</span>
            <button
              onClick={() => adjustFontScale(-1)}
              className={`px-1.5 py-0.5 border text-[11px] font-bold ${fontScale === 0.9 ? 'bg-[#0B3D91] text-white border-[#0B3D91]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              title="Decrease Font Size"
            >
              A-
            </button>
            <button
              onClick={() => adjustFontScale(0)}
              className={`px-1.5 py-0.5 border text-[11px] font-bold ${fontScale === 1 ? 'bg-[#0B3D91] text-white border-[#0B3D91]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              title="Default Font Size"
            >
              A
            </button>
            <button
              onClick={() => adjustFontScale(1)}
              className={`px-1.5 py-0.5 border text-[11px] font-bold ${fontScale === 1.15 ? 'bg-[#0B3D91] text-white border-[#0B3D91]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              title="Increase Font Size"
            >
              A+
            </button>
          </div>
          
          <span className="text-gray-300">|</span>
          
          {/* Bilingual Language Switcher */}
          <div className="flex items-center gap-1 font-bold">
            <button
              onClick={() => setLanguage("EN")}
              className={`px-2 py-0.5 ${language === "EN" ? "bg-[#0B3D91] text-white" : "text-[#0B3D91] hover:underline"}`}
            >
              English
            </button>
            <span>/</span>
            <button
              onClick={() => setLanguage("HI")}
              className={`px-2 py-0.5 ${language === "HI" ? "bg-[#0B3D91] text-white" : "text-[#0B3D91] hover:underline"}`}
            >
              हिन्दी
            </button>
          </div>

          <span className="text-gray-300">|</span>

          {/* Dark / High-Contrast Mode Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className={`px-2 py-0.5 border text-[11px] font-bold flex items-center gap-1.5 transition ${
              darkMode
                ? "bg-[#FF9933] text-black border-[#D97706]"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
            }`}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark / High-Contrast Mode"}
          >
            <span>{darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}</span>
          </button>
        </div>
      </div>

      {/* 3. Main Government Portal Branding Header */}
      <header className="bg-white border-b border-[#D1D5DB] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left: National Emblem & GeM Portal Identity */}
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveView("dashboard")}>
            <NationalEmblem />

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[#0B3D91] tracking-tight uppercase">
                  Government e-Marketplace (GeM)
                </h1>
                <span className="text-[10px] uppercase font-bold bg-[#FF9933] text-black px-1.5 py-0.5 border border-[#B45309]">
                  SIH26100
                </span>
              </div>
              <p className="text-xs font-semibold text-[#374151]">
                AI-Powered Bid Compliance Verification & Technical Audit System
              </p>
              <p className="text-[11px] text-gray-500">
                Ministry of Commerce & Industry | National Informatics Centre (NIC)
              </p>
            </div>

            {/* Ashoka Chakra Graphic */}
            <div className="hidden lg:block ml-4 pl-4 border-l border-gray-200">
              <AshokaChakra size={32} className="opacity-80" />
            </div>
          </div>

          {/* Right: Active Tender Quick Selector */}
          {tenders.length > 0 && (
            <div className="flex flex-col md:items-end gap-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0B3D91] uppercase text-[11px]">Active Tender Ref:</span>
                <select
                  className="bg-white text-gray-800 text-xs font-semibold px-2.5 py-1 border border-[#9CA3AF] focus:ring-1 focus:ring-[#0B3D91] max-w-xs"
                  value={currentTender?.id || ""}
                  onChange={(e) => {
                    loadTenderDetail(e.target.value);
                    setActiveView("tender_detail");
                  }}
                >
                  {tenders.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.bid_number} — {t.title.substring(0, 30)}...
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[11px] text-gray-500">
                Evaluation Committee: <b className="text-[#138808]">ACTIVE EVALUATION SESSION</b>
              </span>
            </div>
          )}
        </div>
      </header>

      {/* 4. Secondary Navy Primary Navigation Bar */}
      <nav className="bg-[#0B3D91] border-b-2 border-[#072C6A] text-white px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-1 py-1">
            <button
              onClick={() => setActiveView("dashboard")}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
                activeView === "dashboard"
                  ? "bg-[#072C6A] text-[#FF9933] border-[#FF9933]"
                  : "text-white hover:bg-[#072C6A] border-transparent"
              }`}
            >
              Tender Repository
            </button>

            {currentTender && (
              <>
                <button
                  onClick={() => {
                    setActiveView("tender_detail");
                    setActiveTab("requirements");
                  }}
                  className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
                    activeView === "tender_detail" && activeTab === "requirements"
                      ? "bg-[#072C6A] text-[#FF9933] border-[#FF9933]"
                      : "text-white hover:bg-[#072C6A] border-transparent"
                  }`}
                >
                  Eligibility Clauses ({currentTender.requirements?.length || 0})
                </button>

                <button
                  onClick={() => {
                    setActiveView("tender_detail");
                    setActiveTab("matrix");
                  }}
                  className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
                    activeView === "tender_detail" && activeTab === "matrix"
                      ? "bg-[#072C6A] text-[#FF9933] border-[#FF9933]"
                      : "text-white hover:bg-[#072C6A] border-transparent"
                  }`}
                >
                  Evaluation Matrix ({currentTender.vendor_bids?.length || 0} Bidders)
                </button>

                <button
                  onClick={() => {
                    setActiveView("tender_detail");
                    setActiveTab("upload");
                  }}
                  className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
                    activeView === "tender_detail" && activeTab === "upload"
                      ? "bg-[#072C6A] text-[#FF9933] border-[#FF9933]"
                      : "text-white hover:bg-[#072C6A] border-transparent"
                  }`}
                >
                  Submit Vendor Bid & OCR
                </button>
              </>
            )}

            {activeView === "vendor_report" && currentVendor && (
              <button
                onClick={() => setActiveView("vendor_report")}
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-[#072C6A] text-[#FF9933] border-b-2 border-[#FF9933]"
              >
                Audit Report: {currentVendor.vendor_name.substring(0, 20)}
              </button>
            )}
          </div>

          {/* AI Engine Status Button */}
          <div className="py-1">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#072C6A] hover:bg-[#051E48] text-white border border-[#D1D5DB]/30 flex items-center gap-1.5"
            >
              <span>⚙</span> AI Engine: {settings.llm_provider === "smart_mock" ? "Smart RAG" : settings.llm_provider.toUpperCase()}
            </button>
          </div>
        </div>
      </nav>

      {/* 5. Breadcrumb Navigation Trail */}
      <div className="bg-[#E5E7EB] border-b border-[#D1D5DB] px-6 py-2 text-xs text-gray-700">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5">
          <span className="text-[#0B3D91] font-semibold cursor-pointer hover:underline" onClick={() => setActiveView("dashboard")}>
            Home
          </span>
          <span className="text-gray-400">/</span>
          <span className="text-[#0B3D91] font-semibold cursor-pointer hover:underline" onClick={() => setActiveView("dashboard")}>
            GeM Tenders
          </span>
          {currentTender && (
            <>
              <span className="text-gray-400">/</span>
              <span
                className={`font-semibold cursor-pointer hover:underline ${activeView === 'tender_detail' ? 'text-gray-900 font-bold' : 'text-[#0B3D91]'}`}
                onClick={() => setActiveView("tender_detail")}
              >
                {currentTender.bid_number}
              </span>
            </>
          )}
          {activeView === "vendor_report" && currentVendor && (
            <>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-bold">
                Bid Audit: {currentVendor.vendor_name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Official Government Notice Callout */}
      <div className="max-w-7xl w-full mx-auto px-6 pt-4">
        <div className="gov-callout text-xs text-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0B3D91] uppercase tracking-wide">[OFFICIAL NOTICE]:</span>
            <span>All AI verdicts are evidentiary and cited against submitted bid documents. Officer overrides are digitally recorded in the audit trail per GeM compliance guidelines.</span>
          </div>
          <span className="text-[11px] font-mono text-gray-500 hidden sm:inline">Ref: SIH26100/GeM/2026</span>
        </div>
      </div>

      {/* Toast Alert Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 border text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2 ${
          toast.type === "error" ? "bg-[#C51C1C] border-[#991B1B]" : "bg-[#138808] border-[#0D6E05]"
        }`}>
          <span>{toast.type === "error" ? "✕" : "✓"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {loading && (
          <div className="bg-white border border-[#D1D5DB] p-12 text-center">
            <p className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider">
              Retrieving Official GeM Tender Records from Database...
            </p>
          </div>
        )}

        {!loading && activeView === "dashboard" && (
          <DashboardView
            tenders={tenders}
            onSelectTender={(t) => {
              loadTenderDetail(t.id);
              setActiveView("tender_detail");
            }}
            onCreateTender={() => {
              setNewTenderInitialData(null);
              setShowNewTenderModal(true);
            }}
            onViewCriteria={(cat) => setSelectedCategoryCriteria(cat)}
            search={dashboardSearch}
            setSearch={setDashboardSearch}
            activeCategory={dashboardCategory}
            setActiveCategory={setDashboardCategory}
          />
        )}

        {!loading && activeView === "tender_detail" && currentTender && (
          <TenderDetailView
            tender={currentTender}
            matrix={comparisonMatrix}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onSelectVendor={loadVendorReport}
            onParseReqs={handleParseRequirements}
            rawTenderText={rawTenderText}
            setRawTenderText={setRawTenderText}
            isParsingReqs={isParsingReqs}
            newVendorData={newVendorData}
            setNewVendorData={setNewVendorData}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            handleCreateVendorAndUpload={handleCreateVendorAndUpload}
            evaluating={evaluating}
          />
        )}

        {!loading && activeView === "vendor_report" && currentVendor && currentTender && (
          <VendorReportView
            tender={currentTender}
            vendor={currentVendor}
            reportViewMode={reportViewMode}
            setReportViewMode={setReportViewMode}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            onBack={() => setActiveView("tender_detail")}
            onOpenOverride={(verdict) => {
              setSelectedVerdict(verdict);
              setOverrideForm({
                status: verdict.is_overridden ? verdict.officer_override_status : verdict.status,
                comment: verdict.officer_comment || "",
                officer_name: verdict.officer_name || "Technical Evaluation Committee (GeM)"
              });
              setShowOverrideModal(true);
            }}
            onRevertOverride={handleRevertOverride}
          />
        )}
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          setSettings={setSettings}
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSaveSettings}
        />
      )}

      {/* Officer Override Modal */}
      {showOverrideModal && selectedVerdict && (
        <OfficerOverrideModal
          verdict={selectedVerdict}
          overrideForm={overrideForm}
          setOverrideForm={setOverrideForm}
          onClose={() => setShowOverrideModal(false)}
          onSubmit={handleSubmitOverride}
        />
      )}

      {/* Category Tender Criteria Inspection Modal */}
      {selectedCategoryCriteria && (
        <CategoryCriteriaModal
          category={selectedCategoryCriteria}
          onClose={() => setSelectedCategoryCriteria(null)}
          onFilterTenders={(cat) => {
            setSelectedCategoryCriteria(null);
            setDashboardCategory(cat.id);
            setDashboardSearch(cat.title.split(" ")[0]);
            setActiveView("dashboard");
          }}
          onCreateTenderWithCategory={(cat) => {
            setSelectedCategoryCriteria(null);
            setNewTenderInitialData({
              bid_number: `GEM/2026/B/${Math.floor(100000 + Math.random() * 900000)}`,
              title: `Procurement of ${cat.title}`,
              organization: cat.ministry,
              category: cat.title,
              estimated_value: cat.estValue,
              submission_deadline: "20-Nov-2026 15:00:00"
            });
            setShowNewTenderModal(true);
          }}
        />
      )}

      {/* New Tender Modal */}
      {showNewTenderModal && (
        <NewTenderModal
          initialData={newTenderInitialData}
          onClose={() => {
            setShowNewTenderModal(false);
            setNewTenderInitialData(null);
          }}
          onCreated={(newTender) => {
            setShowNewTenderModal(false);
            setNewTenderInitialData(null);
            loadTenders();
            loadTenderDetail(newTender.id);
            setActiveView("tender_detail");
            showToast("New GeM Tender successfully created.");
          }}
        />
      )}

      {/* 6. Official Indian Government Portal Footer */}
      <footer className="bg-[#0B3D91] text-white border-t-4 border-[#FF9933] mt-12 text-xs">
        <div className="border-b border-[#072C6A] px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-6 text-[12px] font-semibold text-gray-200">
            <a href="#" className="hover:text-[#FF9933] hover:underline">Terms of Use</a>
            <span>|</span>
            <a href="#" className="hover:text-[#FF9933] hover:underline">Privacy Policy</a>
            <span>|</span>
            <a href="#" className="hover:text-[#FF9933] hover:underline">Hyperlinking Policy</a>
            <span>|</span>
            <a href="#" className="hover:text-[#FF9933] hover:underline">Accessibility Statement</a>
            <span>|</span>
            <a href="#" className="hover:text-[#FF9933] hover:underline">Help & FAQ</a>
            <span>|</span>
            <a href="#" className="hover:text-[#FF9933] hover:underline">Contact Us</a>
            <span>|</span>
            <a href="#" className="hover:text-[#FF9933] hover:underline">Feedback</a>
          </div>
        </div>

        <div className="bg-[#072C6A] px-6 py-5 text-center text-[11px] text-gray-300 space-y-1.5">
          <div className="max-w-7xl mx-auto">
            <p className="font-semibold text-white">
              Website Content Owned & Managed by Government e-Marketplace (GeM), Ministry of Commerce and Industry, Government of India.
            </p>
            <p className="text-gray-300">
              Designed, Developed and Hosted by National Informatics Centre (NIC) | Problem Statement SIH26100.
            </p>
            <p className="text-gray-400 pt-1">
              Last Reviewed and Updated on: <b>31 Aug 2026</b> | Version 1.0.0 (Production Build)
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 3D POPULAR PRODUCT CATEGORIES COMPONENT (GeM Marketplace Categories)
// -----------------------------------------------------------------------------
const GEM_PRODUCT_CATEGORIES = [
  {
    id: "it_hardware",
    group: "it",
    title: "Desktops, Laptops & Cloud Servers",
    hindi: "कंप्यूटर, लैपटॉप एवं क्लाउड सर्वर",
    bids: "1,840+ Active Tenders",
    estValue: "₹ 1,450 Cr+",
    discount: "Up to 45% GeM Direct Discount",
    badge: "MII Class-I (≥50%)",
    badgeColor: "bg-blue-600 text-white",
    icon: "💻",
    description: "Enterprise compute nodes, multi-socket rack servers, high-performance laptops & thin clients.",
    svgType: "it",
    ministry: "Ministry of Electronics & Information Technology (MeitY) / NIC",
    financialCriteria: "Minimum average annual turnover ≥ ₹ 15.00 Crores over last 3 audited financial years. CA certificate with valid Unique Document Identification Number (UDIN) is mandatory.",
    experienceCriteria: "Minimum 5 continuous years of experience in enterprise server supply and data center deployment for Central/State Govt/PSUs.",
    technicalSpecs: [
      "Processors: Latest Gen Intel Xeon Scalable / AMD EPYC (min 32 Cores)",
      "Memory: 128 GB DDR5 ECC Registered RAM expandable to 1TB",
      "Storage: Hot-swappable NVMe PCIe 4.0 SSD in RAID 1/5/10 configuration",
      "Power: Dual Hot-Plug Redundant Platinum/Titanium Power Supplies (≥94% Efficiency)",
      "Energy Efficiency: Energy Star 8.0 & RoHS Compliant Certification"
    ],
    mandatoryCerts: [
      "ISO 9001:2015 (Quality Management System)",
      "ISO 27001 (Information Security Management)",
      "BIS CRS Registration for all computing hardware components",
      "EPEAT Gold / Energy Star 8.0 certification"
    ],
    miiClause: "Make in India (MII) Class-I Local Supplier (minimum 50% local value addition in India). Self-declaration with local manufacturing address.",
    statutoryAffidavits: [
      "Active 15-digit GSTIN registration certificate",
      "Permanent Account Number (PAN) issued by Income Tax Dept",
      "Non-Blacklisting / Debarment notarized affidavit on ₹100 stamp paper",
      "Manufacturer's Authorization Form (MAF) from OEM"
    ],
    warrantyTerms: "3 Years Comprehensive 24x7 On-Site OEM Warranty with 4-hour incident response and 24-hour hardware replacement SLA."
  },
  {
    id: "medical",
    group: "medical",
    title: "Medical Diagnostics & ICU Devices",
    hindi: "चिकित्सा उपकरण एवं ऑक्सीजन प्रणाली",
    bids: "980+ Active Tenders",
    estValue: "₹ 820 Cr+",
    discount: "MoHFW Empanelled Rates",
    badge: "CDSCO / ISO 13485",
    badgeColor: "bg-emerald-600 text-white",
    icon: "🏥",
    description: "Multi-parameter patient monitors, oxygen concentrators, ventilators & ultrasound scanners.",
    svgType: "medical",
    ministry: "Ministry of Health & Family Welfare (MoHFW) / AIIMS",
    financialCriteria: "Minimum average annual turnover ≥ ₹ 10.00 Crores over past 3 fiscal years. Net worth must be positive in all 3 years.",
    experienceCriteria: "Minimum 4 years experience in supplying medical / hospital diagnostic devices to Government medical colleges or hospitals.",
    technicalSpecs: [
      "ECG: 12-lead simultaneous diagnostic monitoring with arrhythmia detection",
      "SpO2: Masimo / Nellcor technology with perfusion index display",
      "NIBP: Oscillometric method with auto/manual/stat modes and overpressure protection",
      "Defibrillator Protection: In-built electrosurgical & defibrillation sync protection",
      "Battery Backup: Rechargeable Li-ion battery providing ≥ 4 hours continuous operation"
    ],
    mandatoryCerts: [
      "ISO 13485:2016 (Medical Devices Quality Management)",
      "CDSCO Import / Manufacturing Medical Device License",
      "US FDA (510k) or European CE (MDR) certification",
      "Electrical Safety: IEC 60601-1-2 (Electromagnetic Compatibility)"
    ],
    miiClause: "Class-I Local Supplier (≥50% local content) or Class-II (≥20% local content).",
    statutoryAffidavits: [
      "Active GSTIN and PAN certificates",
      "Non-Blacklisting declaration on notarized stamp paper",
      "OEM Authorization Certificate with guarantee of 10-year spare parts availability",
      "NABL accredited laboratory test calibration certificate"
    ],
    warrantyTerms: "3 Years Comprehensive On-Site Warranty + 2 Years Comprehensive Maintenance Contract (CMC) including all accessories & probes."
  },
  {
    id: "solar_power",
    group: "green",
    title: "Solar Rooftop & Renewable Power Units",
    hindi: "सौर ऊर्जा एवं नवीकरणीय पावर प्लांट",
    bids: "760+ Active Tenders",
    estValue: "₹ 680 Cr+",
    discount: "MNRE Direct Subsidy Eligible",
    badge: "ALMM Approved",
    badgeColor: "bg-amber-600 text-white",
    icon: "⚡",
    description: "Mono-PERC solar modules, grid-tie hybrid inverters, LiFePO4 battery banks & solar pumps.",
    svgType: "solar",
    ministry: "Ministry of New and Renewable Energy (MNRE) / SECI",
    financialCriteria: "Minimum average annual turnover ≥ ₹ 8.00 Crores. Solvency certificate of at least ₹ 3.00 Cr from a scheduled commercial bank.",
    experienceCriteria: "Minimum 3 years experience installing grid-connected or off-grid solar rooftop / ground-mounted projects totaling at least 5 MW.",
    technicalSpecs: [
      "PV Modules: Mono-crystalline PERC half-cut cells (≥540 Wp, module efficiency ≥21.5%)",
      "Inverter: On-grid string inverter with MPPT (Efficiency ≥98.5%, IP65 enclosure)",
      "Mounting Structure: Hot-dip galvanized steel structure (min 80 microns coating) rated for 150 km/h wind speed",
      "Battery: Lithium Iron Phosphate (LiFePO4) battery pack with smart BMS (≥4000 cycles at 80% DoD)",
      "Monitoring: Real-time IoT RMS (Remote Monitoring System) with cloud telemetry"
    ],
    mandatoryCerts: [
      "ALMM (Approved List of Models and Manufacturers) registered OEM",
      "BIS IS 14286 / IEC 61215 (Design qualification & type approval)",
      "IEC 61730 (Photovoltaic module safety qualification)",
      "IEC 62109 / IEC 62116 (Inverter safety & anti-islanding protection)"
    ],
    miiClause: "Domestic Content Requirement (DCR) Compliant: Solar cells and modules must be 100% manufactured in India (MII Class-I ≥60%).",
    statutoryAffidavits: [
      "MNRE Channel Partner / Empanelment certificate",
      "Active GSTIN and PAN copy",
      "Notarized affidavit stating no pending arbitration with state DISCOMs",
      "Manufacturer Warranty Undertaking"
    ],
    warrantyTerms: "25 Years Linear Performance Warranty on Solar PV Modules (≥90% output at 10 years, ≥80% output at 25 years) + 5 years comprehensive system AMC."
  },
  {
    id: "ev_vehicles",
    group: "green",
    title: "Electric Vehicles & Transport Fleet",
    hindi: "इलेक्ट्रिक वाहन एवं परिवहन बेड़ा",
    bids: "540+ Active Tenders",
    estValue: "₹ 510 Cr+",
    discount: "FAME-II Subsidy Compliant",
    badge: "Zero Emission",
    badgeColor: "bg-teal-600 text-white",
    icon: "🚗",
    description: "Electric utility cars, passenger buses, garbage tippers, battery two-wheelers & fast DC chargers.",
    svgType: "ev",
    ministry: "Ministry of Road Transport and Highways (MoRTH) / Heavy Industries",
    financialCriteria: "Minimum average annual turnover ≥ ₹ 25.00 Crores over past 3 financial years.",
    experienceCriteria: "Minimum 3 years proven commercial automotive OEM / Authorized Dealer operations with delivery of at least 50 EV units to government departments.",
    technicalSpecs: [
      "Powertrain: Permanent Magnet Synchronous Motor (PMSM) with regenerative braking",
      "Battery Pack: Advanced liquid-cooled LFP / NMC chemistry with IP67 ingress protection",
      "Range: Minimum certified real-world driving range of 200 km on single charge (IDC)",
      "Charging: Dual charging support (CCS-2 DC Fast Charging ≤ 45 mins + 3.3 kW AC Slow Charging)",
      "Safety: Dual Airbags, ABS with EBD, Electronic Stability Control (ESC) & AIS-038 Rev 2 compliance"
    ],
    mandatoryCerts: [
      "ARAI / ICAT Homologation and Type Approval Certificate (CMVR compliant)",
      "AIS 156 / AIS 038 (Rev 2) Battery Safety Compliance Certificate",
      "ISO 9001:2015 & IATF 16949 Automotive Quality Management",
      "FAME-II Phased Manufacturing Programme (PMP) Certification"
    ],
    miiClause: "Class-I Local Supplier (Local value addition ≥ 50%).",
    statutoryAffidavits: [
      "Authorized Dealership / OEM Direct Manufacturer Certificate",
      "Active GSTIN, PAN and valid Commercial Transport Registration documents",
      "Non-Blacklisting declaration on ₹100 notarized stamp paper"
    ],
    warrantyTerms: "8 Years / 1,60,000 km Warranty on High Voltage Traction Battery & Motor + 3 Years / 1,00,000 km Comprehensive Vehicle Bumper-to-Bumper Warranty."
  },
  {
    id: "surveillance",
    group: "it",
    title: "AI CCTV Surveillance & Cyber Security",
    hindi: "सीसीटीवी निगरानी, ड्रोन एवं सुरक्षा उपकरण",
    bids: "1,220+ Active Tenders",
    estValue: "₹ 590 Cr+",
    discount: "STQC / CERT-In Certified",
    badge: "NDAA Compliant",
    badgeColor: "bg-purple-600 text-white",
    icon: "🛡️",
    description: "4K AI IP Dome cameras, ANPR vehicle scanners, biometric access controllers & NVR arrays.",
    svgType: "cctv",
    ministry: "Ministry of Home Affairs (MHA) / Police Modernization",
    financialCriteria: "Minimum average annual turnover ≥ ₹ 12.00 Crores over last 3 audited fiscal years.",
    experienceCriteria: "Minimum 4 years experience deploying enterprise IP video surveillance networks with at least 500 IP camera nodes in government installations.",
    technicalSpecs: [
      "Resolution: 4K (8 Megapixel) Ultra HD Real-time recording (3840 x 2160 @ 30fps)",
      "Sensor & Optics: 1/2.8\" Progressive Scan CMOS, Motorized Varifocal 2.8-12mm Lens",
      "Night Vision: Smart IR Illumination up to 50 meters with ColorHunter / DarkFighter low-light tech",
      "Edge AI: Deep-learning based Automatic Number Plate Recognition (ANPR), Facial Detection & Perimeter Intrusion",
      "Hardware Security: Trusted Platform Module (TPM 2.0), NDAA-compliant SoC (Zero banned chipsets)"
    ],
    mandatoryCerts: [
      "STQC (Standardisation Testing and Quality Certification) Security Approval",
      "CERT-In Empanelled Lab Vulnerability & Cyber Audit Clearance Report",
      "BIS IS 13252 (Part 1) Registration for Electronic Equipment",
      "ISO 27001:2013 (Information Security) and ISO 9001"
    ],
    miiClause: "MII Class-I Local Supplier (≥50% local manufacturing / assembly in India).",
    statutoryAffidavits: [
      "Manufacturer Authorization Certificate (MAF) with verified MAC address prefix",
      "Certificate of Origin certifying zero components from prohibited border nations",
      "Active GSTIN, PAN, and Notarized Non-Blacklisting affidavit"
    ],
    warrantyTerms: "3 Years Comprehensive On-Site OEM Replacement Warranty including firmware updates, cyber patches, and 24x7 emergency response."
  },
  {
    id: "furniture",
    group: "office",
    title: "Modular Smart Office Furniture",
    hindi: "कार्यालय फर्नीचर एवं मॉड्यूलर वर्कस्टेशन",
    bids: "890+ Active Tenders",
    estValue: "₹ 340 Cr+",
    discount: "Direct GeM Rate Contract",
    badge: "BIFMA / ISO 9001",
    badgeColor: "bg-indigo-600 text-white",
    icon: "🪑",
    description: "Ergonomic high-back chairs, height-adjustable desks, steel compactor storage & conference tables.",
    svgType: "furniture",
    ministry: "Ministry of Housing and Urban Affairs (MoHUA) / CPWD",
    financialCriteria: "Minimum average annual turnover ≥ ₹ 5.00 Crores over last 3 financial years.",
    experienceCriteria: "Minimum 3 years experience manufacturing and supplying modular office workstations / institutional furniture to government offices.",
    technicalSpecs: [
      "Table Tops: 25mm thick pre-laminated twin-side melamine particle board (E1 Grade, PVC 2mm edge-banded)",
      "Understructure: Heavy-duty CRCA steel framework (min 1.2mm wall thickness) with epoxy powder coating (≥50 microns)",
      "Ergonomic Chair: Synchronized multi-locking tilt mechanism, 3D adjustable armrests, Class-4 gas lift (BIFMA certified)",
      "Raceway: Dual-compartment extruded aluminium raceway for power and structured data cabling",
      "Storage: Motorized / Mechanical high-density mobile compactor storage with central locking"
    ],
    mandatoryCerts: [
      "BIFMA (Business and Institutional Furniture Manufacturer's Association) Level 3",
      "ISO 9001 (Quality), ISO 14001 (Environment), and ISO 45001 (Health & Safety)",
      "Green Pro / IGBC Green Product Certification",
      "NABL Accredited Test Lab Reports for load capacity, endurance, and VOC emissions"
    ],
    miiClause: "MII Class-I Local Supplier (minimum 50% local value addition in India).",
    statutoryAffidavits: [
      "Factory registration license & PCB (Pollution Control Board) consent to operate",
      "Active GSTIN and PAN registration certificates",
      "Notarized Non-Blacklisting declaration on ₹100 stamp paper"
    ],
    warrantyTerms: "3 Years Comprehensive On-Site Warranty on all furniture products, gas lifts, castor wheels, and lock mechanisms."
  },
  {
    id: "stationery",
    group: "office",
    title: "Paper, Printing & Consumable Goods",
    hindi: "मुद्रण सामग्री एवं कार्यालय स्टेशनरी",
    bids: "650+ Active Tenders",
    estValue: "₹ 180 Cr+",
    discount: "Bulk Procurement Rates",
    badge: "Eco-Mark Certified",
    badgeColor: "bg-cyan-700 text-white",
    icon: "📄",
    description: "75/80 GSM copier paper reams, security toner cartridges, official registers & desktop stationery.",
    svgType: "paper",
    ministry: "Directorate of Printing / Department of Commerce",
    financialCriteria: "Minimum average annual turnover ≥ ₹ 3.00 Crores over past 3 financial years.",
    experienceCriteria: "Minimum 3 continuous years in supplying paper products or office consumable goods to Central/State Govt bodies.",
    technicalSpecs: [
      "Paper Substance: 75 GSM or 80 GSM (Tolerance ±2.5%) Virgin Pulp Copier Paper",
      "Brightness & Whiteness: ISO Brightness ≥ 92%, CIE Whiteness ≥ 150",
      "Opacity & Smoothness: Minimum 92% opacity, Bendtsen smoothness 150-250 ml/min",
      "Moisture Content: Controlled 4.0% to 5.5% moisture content preventing printer jams",
      "Toner Cartridges: OEM / High-yield compatible cartridges yielding ≥ 3,000 standard pages (ISO/IEC 19752)"
    ],
    mandatoryCerts: [
      "BIS IS 14490:2018 (Plain Copier Paper Specification) Licensed Manufacturer",
      "Eco-Mark / Green Pro Certification for environmentally benign paper",
      "FSC (Forest Stewardship Council) or PEFC Chain of Custody Certification",
      "ISO 9001:2015 and ISO 14001 Certification"
    ],
    miiClause: "MII Class-I Local Supplier (100% manufactured and converted in India).",
    statutoryAffidavits: [
      "Authorized Distributor / Mill Manufacturer Certificate",
      "Active GSTIN and PAN copies",
      "Notarized affidavit affirming supply of genuine, fresh, unexpired batch consumables"
    ],
    warrantyTerms: "100% Replacement Guarantee on defective, damaged, or moisture-affected paper reams and leaking toner cartridges within 48 hours."
  },
  {
    id: "facility_services",
    group: "office",
    title: "Facility Management & Security Services",
    hindi: "सफाई, सुरक्षा एवं सुविधा प्रबंधन सेवाएं",
    bids: "1,520+ Active Tenders",
    estValue: "₹ 1,120 Cr+",
    discount: "Minimum Wage & EPF Compliant",
    badge: "PSARA Licensed",
    badgeColor: "bg-rose-700 text-white",
    icon: "🧹",
    description: "Integrated mechanized housekeeping, armed security personnel, horticulture & building maintenance.",
    svgType: "services",
    ministry: "Department of Personnel and Training (DoPT) / Central Ministries",
    financialCriteria: "Minimum average 3-year turnover ≥ ₹ 20.00 Crores. Solvency certificate of at least ₹ 5.00 Cr from a Nationalised/Scheduled Bank.",
    experienceCriteria: "Minimum 5 continuous years providing integrated facility management / manned security services to Central/State Govt complexes (at least 1 contract of ₹ 10 Cr+ or 2 contracts of ₹ 6 Cr+).",
    technicalSpecs: [
      "Mechanized Housekeeping: Industrial ride-on scrubbers, high-pressure washers, single-disc polishers & backpack vacuums",
      "Manpower Deployment: Verified security supervisors, armed guards, un-armed guards, electricians, plumbers & sanitation staff",
      "Chemicals: Green-certified eco-friendly cleaning consumables (Taski / Diversey or approved equivalent)",
      "Attendance System: GPS/Biometric Aadhaar-linked real-time attendance logging system",
      "Uniform & Safety PPE: Standardized uniform, photo ID cards, safety shoes, gloves, and reflective jackets"
    ],
    mandatoryCerts: [
      "Valid PSARA (Private Security Agencies Regulation Act) License for the operating State",
      "Active EPFO (Employees' Provident Fund) & ESIC (Employees' State Insurance) Registration",
      "Labour Department Registration License under Contract Labour (R&A) Act, 1970",
      "ISO 9001, ISO 14001, ISO 45001 (OH&S), and ISO 18788 (Security Operations)"
    ],
    miiClause: "100% Domestic Service Provider (Registered and operated in India).",
    statutoryAffidavits: [
      "Undertaking of strict compliance with Central / State Minimum Wages Act including EPF, ESIC, Bonus & Gratuity",
      "Police character verification records for 100% deployed personnel",
      "Active GSTIN and PAN copies",
      "Notarized Non-Blacklisting Affidavit on ₹100 stamp paper"
    ],
    warrantyTerms: "100% SLA Guarantee: Zero disruption operations with 2-hour substitute deployment for any absenteeism and dedicated 24x7 Helpdesk Manager."
  }
];

/**
 * 3D Category SVG Visuals Component
 */
function CategoryIllustration({ type }) {
  switch (type) {
    case "it":
      return (
        <svg className="w-24 h-24 gem-category-img" viewBox="0 0 100 100" fill="none">
          <rect x="15" y="16" width="70" height="48" rx="3" fill="#0B3D91" stroke="#3B82F6" strokeWidth="2"/>
          <rect x="20" y="21" width="60" height="38" rx="2" fill="#0F172A"/>
          {/* Screen elements */}
          <line x1="26" y1="28" x2="52" y2="28" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="26" y1="35" x2="42" y2="35" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
          <rect x="58" y="27" width="16" height="26" rx="1.5" fill="#1E293B" stroke="#38BDF8" strokeWidth="1"/>
          <circle cx="66" cy="33" r="2" fill="#22C55E"/>
          <circle cx="66" cy="39" r="2" fill="#38BDF8"/>
          <circle cx="66" cy="45" r="2" fill="#F59E0B"/>
          {/* Base & Keyboard */}
          <path d="M43 64 L57 64 L61 74 L39 74 Z" fill="#1E293B" stroke="#64748B" strokeWidth="1.5"/>
          <path d="M10 74 L90 74 L84 84 L16 84 Z" fill="#072C6A" stroke="#3B82F6" strokeWidth="2"/>
          <line x1="24" y1="78" x2="76" y2="78" stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="3 2"/>
        </svg>
      );
    case "medical":
      return (
        <svg className="w-24 h-24 gem-category-img" viewBox="0 0 100 100" fill="none">
          <rect x="18" y="18" width="64" height="52" rx="4" fill="#064E3B" stroke="#10B981" strokeWidth="2"/>
          <rect x="23" y="23" width="54" height="42" rx="2" fill="#022C22"/>
          {/* ECG Pulse */}
          <path d="M26 44 L36 44 L40 32 L44 56 L48 38 L52 48 L56 44 L72 44" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <text x="50" y="32" fontSize="9" fill="#10B981" fontWeight="bold">98 BPM</text>
          <text x="50" y="60" fontSize="8" fill="#6EE7B7" fontWeight="bold">SpO2 99%</text>
          {/* Stand & Wheels */}
          <rect x="46" y="70" width="8" height="15" fill="#334155"/>
          <ellipse cx="50" cy="85" rx="24" ry="4" fill="#1E293B" stroke="#64748B" strokeWidth="1.5"/>
          <circle cx="30" cy="88" r="3" fill="#0F172A"/>
          <circle cx="70" cy="88" r="3" fill="#0F172A"/>
        </svg>
      );
    case "solar":
      return (
        <svg className="w-24 h-24 gem-category-img" viewBox="0 0 100 100" fill="none">
          {/* Sun */}
          <circle cx="78" cy="22" r="10" fill="#F59E0B"/>
          <line x1="78" y1="7" x2="78" y2="2" stroke="#F59E0B" strokeWidth="2"/>
          <line x1="93" y1="22" x2="98" y2="22" stroke="#F59E0B" strokeWidth="2"/>
          <line x1="89" y1="11" x2="93" y2="7" stroke="#F59E0B" strokeWidth="2"/>
          {/* 3D Solar Panel */}
          <polygon points="12,50 68,32 88,68 32,86" fill="#1E3A8A" stroke="#60A5FA" strokeWidth="2"/>
          {/* Grid lines */}
          <line x1="40" y1="41" x2="60" y2="77" stroke="#93C5FD" strokeWidth="1.5"/>
          <line x1="22" y1="68" x2="78" y2="50" stroke="#93C5FD" strokeWidth="1.5"/>
          {/* Stand */}
          <path d="M48 62 L48 88 M60 52 L60 88" stroke="#475569" strokeWidth="3"/>
          <line x1="38" y1="88" x2="70" y2="88" stroke="#334155" strokeWidth="4" strokeLinecap="round"/>
        </svg>
      );
    case "ev":
      return (
        <svg className="w-24 h-24 gem-category-img" viewBox="0 0 100 100" fill="none">
          {/* Car Body */}
          <path d="M12 56 L24 38 L62 38 L84 50 L92 58 L92 70 L12 70 Z" fill="#0284C7" stroke="#38BDF8" strokeWidth="2"/>
          <polygon points="28,42 58,42 58,54 20,54" fill="#E0F2FE"/>
          <polygon points="62,42 78,50 78,54 62,54" fill="#E0F2FE"/>
          {/* Wheels */}
          <circle cx="30" cy="70" r="10" fill="#0F172A" stroke="#38BDF8" strokeWidth="2"/>
          <circle cx="30" cy="70" r="4" fill="#94A3B8"/>
          <circle cx="74" cy="70" r="10" fill="#0F172A" stroke="#38BDF8" strokeWidth="2"/>
          <circle cx="74" cy="70" r="4" fill="#94A3B8"/>
          {/* EV Plug / Leaf symbol */}
          <circle cx="74" cy="24" r="10" fill="#10B981"/>
          <path d="M71 24 L74 19 L77 24 L74 29 Z" fill="#FFFFFF"/>
        </svg>
      );
    case "cctv":
      return (
        <svg className="w-24 h-24 gem-category-img" viewBox="0 0 100 100" fill="none">
          {/* Wall Mount */}
          <path d="M15 20 L30 20 L30 50 L15 50 Z" fill="#334155" stroke="#475569" strokeWidth="1.5"/>
          <path d="M30 32 L46 32 L46 44 L30 44 Z" fill="#475569"/>
          {/* Camera Dome / Body */}
          <ellipse cx="62" cy="48" rx="24" ry="16" fill="#1E293B" stroke="#A855F7" strokeWidth="2"/>
          <circle cx="64" cy="48" r="10" fill="#0F172A" stroke="#C084FC" strokeWidth="2"/>
          <circle cx="64" cy="48" r="4" fill="#38BDF8"/>
          <circle cx="72" cy="42" r="2" fill="#EF4444"/>
          {/* Laser Scan Beam */}
          <polygon points="64,54 32,88 96,88" fill="url(#laserGrad)" opacity="0.4"/>
          <defs>
            <linearGradient id="laserGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#A855F7" stopOpacity="0.0"/>
            </linearGradient>
          </defs>
        </svg>
      );
    case "furniture":
      return (
        <svg className="w-24 h-24 gem-category-img" viewBox="0 0 100 100" fill="none">
          {/* Ergonomic Office Chair */}
          <rect x="36" y="16" width="28" height="28" rx="4" fill="#312E81" stroke="#818CF8" strokeWidth="2"/>
          <rect x="32" y="44" width="36" height="10" rx="3" fill="#1E1B4B" stroke="#6366F1" strokeWidth="1.5"/>
          <path d="M50 54 L50 72" stroke="#475569" strokeWidth="4"/>
          {/* Star Base */}
          <line x1="28" y1="78" x2="72" y2="78" stroke="#334155" strokeWidth="3"/>
          <circle cx="28" cy="82" r="3" fill="#0F172A"/>
          <circle cx="50" cy="82" r="3" fill="#0F172A"/>
          <circle cx="72" cy="82" r="3" fill="#0F172A"/>
          {/* Desk partition */}
          <rect x="14" y="52" width="12" height="26" fill="#E0E7FF" stroke="#A5B4FC" strokeWidth="1"/>
        </svg>
      );
    case "paper":
      return (
        <svg className="w-24 h-24 gem-category-img" viewBox="0 0 100 100" fill="none">
          {/* Paper Stacks */}
          <polygon points="18,68 58,54 82,68 42,82" fill="#0E7490" stroke="#22D3EE" strokeWidth="1.5"/>
          <polygon points="18,58 58,44 82,58 42,72" fill="#155E75" stroke="#67E8F9" strokeWidth="1.5"/>
          <polygon points="18,48 58,34 82,48 42,62" fill="#F8FAFC" stroke="#0891B2" strokeWidth="2"/>
          {/* Government Stamp / Emblem */}
          <circle cx="50" cy="48" r="8" stroke="#0891B2" strokeWidth="1.5" strokeDasharray="2 1"/>
          <line x1="34" y1="44" x2="62" y2="44" stroke="#64748B" strokeWidth="1"/>
          <line x1="34" y1="52" x2="56" y2="52" stroke="#64748B" strokeWidth="1"/>
        </svg>
      );
    case "services":
      return (
        <svg className="w-24 h-24 gem-category-img" viewBox="0 0 100 100" fill="none">
          {/* Shield Base */}
          <path d="M50 14 L82 26 L82 56 C82 72 50 86 50 86 C50 86 18 72 18 56 L18 26 Z" fill="#881337" stroke="#F43F5E" strokeWidth="2"/>
          <path d="M50 20 L76 30 L76 54 C76 68 50 78 50 78 C50 78 24 68 24 54 L24 30 Z" fill="#4C0519"/>
          {/* Building & Star */}
          <rect x="42" y="44" width="16" height="24" fill="#FECDD3"/>
          <polygon points="50,28 53,36 61,36 55,41 57,49 50,44 43,49 45,41 39,36 47,36" fill="#FBBF24"/>
        </svg>
      );
    default:
      return <div className="text-4xl">📦</div>;
  }
}

/**
 * PopularProductCategories: 3D interactive categories section
 */
function PopularProductCategories({ onSelectCategory, activeCategory, onCategoryFilterClick, onViewCriteria }) {
  const [selectedGroup, setSelectedGroup] = useState("all");

  const groups = [
    { id: "all", label: "सभी श्रेणियां / All Categories" },
    { id: "it", label: "कंप्यूटर एवं आईटी / IT & Computing" },
    { id: "medical", label: "चिकित्सा एवं स्वास्थ्य / Medical & Health" },
    { id: "green", label: "हरित ऊर्जा एवं वाहन / Green Energy & EV" },
    { id: "office", label: "कार्यालय एवं सेवाएं / Office & Services" }
  ];

  const filteredCategories = selectedGroup === "all"
    ? GEM_PRODUCT_CATEGORIES
    : GEM_PRODUCT_CATEGORIES.filter(c => c.group === selectedGroup);

  return (
    <div className="bg-white border border-[#D1D5DB] p-5 space-y-4">
      {/* Header */}
      <div className="gov-section-heading">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛍️</span>
          <span>लोकप्रिय उत्पाद एवं सेवा श्रेणियां / Popular Product & Service Categories (GeM)</span>
        </div>
        <span className="text-[11px] font-mono normal-case font-normal text-gray-500 hidden sm:inline">
          Direct Purchase & Bid-Ready Catalogs
        </span>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">
        Browse key government procurement categories on the GeM portal. Hover over any category to view interactive 3D specifications, estimated procurement budgets, and compliant tender opportunities.
      </p>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#D1D5DB] pb-3">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGroup(g.id)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
              selectedGroup === g.id
                ? "bg-[#0B3D91] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* 3D Perspective Grid */}
      <div className="gem-category-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {filteredCategories.map((cat) => {
          const isSelected = activeCategory === cat.id;

          return (
            <div
              key={cat.id}
              onClick={() => onCategoryFilterClick(cat)}
              className={`gem-category-card-3d flex flex-col justify-between ${
                isSelected ? "border-2 border-[#FF9933] ring-2 ring-[#FF9933]/30" : ""
              }`}
            >
              {/* Saffron/White/Green Tricolor Top Accent Bar on Hover */}
              <div className="gem-category-glow-bar"></div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Top Badge & Code */}
                <div className="flex items-center justify-between">
                  <span className={`gem-category-badge-floating text-[10px] font-bold px-2 py-0.5 uppercase ${cat.badgeColor}`}>
                    {cat.badge}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-gray-500">
                    {cat.bids}
                  </span>
                </div>

                {/* 3D Enlarging Image Container */}
                <div className="gem-category-img-container border border-[#E2E8F0]">
                  <CategoryIllustration type={cat.svgType} />
                </div>

                {/* Title & Hindi Subtitle */}
                <div>
                  <h4 className="font-bold text-gray-900 text-xs uppercase leading-snug">
                    {cat.title}
                  </h4>
                  <p className="text-[11px] font-semibold text-[#0B3D91] mt-0.5">
                    {cat.hindi}
                  </p>
                </div>

                {/* Description */}
                <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>

                {/* Budget & Discount Tag */}
                <div className="bg-[#F8FAFB] p-2 border border-[#E5E7EB] text-[11px] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-semibold uppercase text-[10px]">Est. Procurement:</span>
                    <span className="font-bold text-gray-900 font-mono">{cat.estValue}</span>
                  </div>
                  <div className="text-[10px] text-[#138808] font-bold flex items-center gap-1">
                    <span>✓</span> {cat.discount}
                  </div>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="p-3 bg-[#F9FAFB] border-t border-[#E5E7EB]">
                {/* Primary Action Button: Saffron Theme */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onViewCriteria) onViewCriteria(cat);
                  }}
                  className="gov-btn-primary w-full text-[11px] py-1.5 flex items-center justify-center gap-1.5"
                >
                  <span>🔍</span> View Tender Criteria
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// VIEW 1: DASHBOARD (DENSE GOVERNMENT DATA TABLE & SYSTEM METRICS)
// -----------------------------------------------------------------------------
function DashboardView({
  tenders,
  onSelectTender,
  onCreateTender,
  onViewCriteria,
  search,
  setSearch,
  activeCategory,
  setActiveCategory
}) {
  const handleCategoryFilterClick = (category) => {
    if (activeCategory === category.id) {
      setActiveCategory(null);
      setSearch("");
    } else {
      setActiveCategory(category.id);
      setSearch(category.title.split(" ")[0]);
    }
  };

  const filtered = tenders.filter(t => 
    t.bid_number.toLowerCase().includes((search || "").toLowerCase()) ||
    t.title.toLowerCase().includes((search || "").toLowerCase()) ||
    t.organization.toLowerCase().includes((search || "").toLowerCase()) ||
    t.category.toLowerCase().includes((search || "").toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 4 Key Metric Metric Cells */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#D1D5DB] p-3.5">
          <div className="text-[11px] font-bold text-gray-600 uppercase">Active GeM Tenders</div>
          <div className="text-2xl font-black text-[#0B3D91] mt-1">{tenders.length}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Published on Portal</div>
        </div>

        <div className="bg-white border border-[#D1D5DB] p-3.5">
          <div className="text-[11px] font-bold text-gray-600 uppercase">Total Bids Evaluated</div>
          <div className="text-2xl font-black text-[#0B3D91] mt-1">
            {tenders.reduce((acc, t) => acc + (t.vendors_count || 0), 0)}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Across All Procurements</div>
        </div>

        <div className="bg-white border border-[#D1D5DB] p-3.5">
          <div className="text-[11px] font-bold text-gray-600 uppercase">AI Evidence Accuracy</div>
          <div className="text-2xl font-black text-[#138808] mt-1">98.4%</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Page-Level Verified</div>
        </div>

        <div className="bg-white border border-[#D1D5DB] p-3.5">
          <div className="text-[11px] font-bold text-gray-600 uppercase">Audit Integrity</div>
          <div className="text-2xl font-black text-[#0B3D91] mt-1">100% Traceable</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Tamper-Evident Logged</div>
        </div>
      </div>

      {/* 3D POPULAR PRODUCT & SERVICE CATEGORIES SECTION */}
      <PopularProductCategories
        activeCategory={activeCategory}
        onCategoryFilterClick={handleCategoryFilterClick}
        onViewCriteria={onViewCriteria}
      />

      {/* Main Tender Repository Table */}
      <div className="bg-white border border-[#D1D5DB] p-5 space-y-4">
        <div className="gov-section-heading">
          <span>Tender Procurement Notice Repository</span>
          {/* Primary Action Button: Saffron Theme */}
          <button
            onClick={onCreateTender}
            className="gov-btn-primary text-xs"
          >
            <span>+</span> Create New GeM Tender
          </button>
        </div>

        {/* Search Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F9FAFB] p-3 border border-[#E5E7EB]">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-gray-700 uppercase">Search Records:</label>
            <input
              type="text"
              placeholder="Search Bid Number, Ministry, Category..."
              className="px-3 py-1.5 text-xs border border-[#9CA3AF] bg-white focus:ring-1 focus:ring-[#0B3D91] w-72"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (!e.target.value) setActiveCategory(null);
              }}
            />
            {(search || activeCategory) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory(null);
                }}
                className="px-2 py-1 text-[11px] font-bold bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-400 uppercase"
              >
                ✕ Clear Filter
              </button>
            )}
          </div>
          <span className="text-xs font-semibold text-gray-600">
            Total Matching Records: <b>{filtered.length}</b>
          </span>
        </div>

        {/* Dense Bordered Data Table */}
        <div className="overflow-x-auto border border-[#D1D5DB]">
          <table className="gov-table">
            <thead>
              <tr>
                <th className="w-12 text-center">Sl.</th>
                <th className="w-36">GeM Bid Number</th>
                <th>Tender Title & Category</th>
                <th className="w-56">Procuring Ministry / Department</th>
                <th className="w-28 text-right">Est. Value</th>
                <th className="w-20 text-center">Criteria</th>
                <th className="w-20 text-center">Bidders</th>
                <th className="w-24 text-center">Status</th>
                <th className="w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, idx) => (
                <tr key={t.id}>
                  <td className="text-center font-mono font-bold text-gray-600">{idx + 1}</td>
                  <td>
                    <span className="font-mono font-bold text-[#0B3D91] bg-gray-100 px-1.5 py-0.5 border border-gray-300 text-xs">
                      {t.bid_number}
                    </span>
                  </td>
                  <td>
                    <div className="font-bold text-gray-900 text-xs">{t.title}</div>
                    <div className="text-[11px] text-gray-500">{t.category}</div>
                  </td>
                  <td className="text-xs font-semibold text-gray-700">
                    {t.organization}
                  </td>
                  <td className="text-right font-bold text-gray-900 text-xs">
                    {t.estimated_value}
                  </td>
                  <td className="text-center font-bold text-[#0B3D91]">
                    {t.requirements_count}
                  </td>
                  <td className="text-center font-bold text-gray-800">
                    {t.vendors_count}
                  </td>
                  <td className="text-center">
                    <span className="gov-tag px-2 py-0.5 text-[10px] font-bold uppercase bg-[#138808] text-white border border-[#0D6E05]">
                      {t.status}
                    </span>
                  </td>
                  <td className="text-center">
                    {/* Secondary Action: Solid Green */}
                    <button
                      onClick={() => onSelectTender(t)}
                      className="gov-btn-secondary text-[11px]"
                    >
                      Select Tender
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-6 text-gray-500 font-semibold">
                    No matching GeM tender records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// VIEW 2: TENDER SPECIFICATION WORKSPACE (CLAUSES, MATRIX, SUBMISSION)
// -----------------------------------------------------------------------------
function TenderDetailView({
  tender,
  matrix,
  activeTab,
  setActiveTab,
  onSelectVendor,
  onParseReqs,
  rawTenderText,
  setRawTenderText,
  isParsingReqs,
  newVendorData,
  setNewVendorData,
  selectedFiles,
  setSelectedFiles,
  handleCreateVendorAndUpload,
  evaluating
}) {
  return (
    <div className="space-y-6">
      {/* Tender Details Header Key-Value Grid */}
      <div className="bg-white border border-[#D1D5DB] p-5 space-y-4">
        <div className="gov-section-heading">
          <span>Tender Specification Details</span>
          <span className="text-xs text-gray-600 normal-case font-mono">
            Bid Ref: <b>{tender.bid_number}</b>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F9FAFB] p-4 border border-[#E5E7EB] text-xs">
          <div>
            <span className="text-gray-500 font-bold uppercase text-[10px] block">Tender Title</span>
            <span className="font-bold text-gray-900 text-sm leading-tight mt-0.5 block">{tender.title}</span>
          </div>
          <div>
            <span className="text-gray-500 font-bold uppercase block text-[10px]">Procuring Department / Ministry</span>
            <span className="font-semibold text-gray-800 mt-0.5 block">{tender.organization}</span>
            <span className="text-[11px] text-gray-500 block mt-1">Category: {tender.category}</span>
          </div>
          <div>
            <span className="text-gray-500 font-bold uppercase block text-[10px]">Financial & Schedule Parameters</span>
            <span className="font-bold text-gray-900 block mt-0.5">Est. Value: {tender.estimated_value}</span>
            <span className="text-gray-600 block mt-0.5">Deadline: {tender.submission_deadline || "Open"}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#D1D5DB] pt-2">
          <button
            onClick={() => setActiveTab("requirements")}
            className={`px-4 py-2 text-xs font-bold uppercase border-b-2 transition ${
              activeTab === "requirements"
                ? "border-[#FF9933] text-[#0B3D91] bg-gray-100"
                : "border-transparent text-gray-600 hover:text-[#0B3D91]"
            }`}
          >
            1. Eligibility Requirements & Clauses ({tender.requirements?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-4 py-2 text-xs font-bold uppercase border-b-2 transition ${
              activeTab === "matrix"
                ? "border-[#FF9933] text-[#0B3D91] bg-gray-100"
                : "border-transparent text-gray-600 hover:text-[#0B3D91]"
            }`}
          >
            2. Multi-Vendor Evaluation Matrix ({tender.vendor_bids?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 text-xs font-bold uppercase border-b-2 transition ${
              activeTab === "upload"
                ? "border-[#FF9933] text-[#0B3D91] bg-gray-100"
                : "border-transparent text-gray-600 hover:text-[#0B3D91]"
            }`}
          >
            3. Submit Vendor Bid & OCR Dropzone
          </button>
        </div>
      </div>

      {/* TAB 1: ELIGIBILITY REQUIREMENTS & AI CLAUSE PARSER */}
      {activeTab === "requirements" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Requirements List Table */}
          <div className="lg:col-span-2 bg-white border border-[#D1D5DB] p-5 space-y-4">
            <div className="gov-section-heading">
              <span>Tender Eligibility Criteria Clauses</span>
              <span className="text-xs text-gray-600 font-mono font-normal">
                {tender.requirements?.length || 0} Clauses Specified
              </span>
            </div>

            <div className="overflow-x-auto border border-[#D1D5DB]">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th className="w-24">Clause</th>
                    <th className="w-36">Category</th>
                    <th>Requirement Title & Description</th>
                    <th className="w-32 text-center">Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {tender.requirements?.map((req) => {
                    const catInfo = getCategoryInfo(req.category);
                    return (
                      <tr key={req.id}>
                        <td className="font-mono font-bold text-[#0B3D91] text-xs">
                          {req.clause_no || `Clause ${req.id}`}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{catInfo.icon}</span>
                            <span className={`gov-tag px-1.5 py-0.5 text-[10px] font-bold uppercase border ${catInfo.color}`}>
                              {req.category}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 block mt-0.5 italic">{catInfo.hint}</span>
                        </td>
                        <td>
                          <div className="font-bold text-gray-900 text-xs">{req.title}</div>
                          <div className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{req.description}</div>
                          {req.is_mandatory && (
                            <span className="inline-block mt-1 text-[10px] font-bold text-[#C51C1C] uppercase">
                              * Mandatory Compliance Clause
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          <span className="font-mono font-bold text-gray-800 text-xs bg-gray-100 px-1.5 py-0.5 border border-gray-300 block text-center">
                            {req.threshold_value || "Standard"} {req.threshold_unit || ""}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Clause Auto-Parser Form */}
          <div className="bg-white border border-[#D1D5DB] p-5 space-y-4">
            <div className="gov-section-heading">
              <span>AI Clause Auto-Parser</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Paste raw eligibility criteria text directly from the GeM tender notice. The AI module automatically splits and extracts discrete clauses with threshold units.
            </p>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase text-gray-700">Raw Tender Text Input:</label>
              <textarea
                rows="6"
                placeholder="e.g. 1. Minimum 5 years experience in IT. 2. Average turnover >= 10 Cr. 3. Valid ISO 9001:2015. 4. Active GSTIN..."
                className="w-full text-xs p-2.5 border border-[#9CA3AF] bg-[#FAFAFA] font-mono focus:ring-1 focus:ring-[#0B3D91]"
                value={rawTenderText}
                onChange={(e) => setRawTenderText(e.target.value)}
              />
              <span className="text-[10px] text-gray-500 italic block">Paste numbered or bulleted requirement lines.</span>
            </div>
            {/* Primary Action Button: Saffron Theme */}
            <button
              onClick={onParseReqs}
              disabled={isParsingReqs || !rawTenderText.trim()}
              className="gov-btn-primary w-full text-xs"
            >
              {isParsingReqs ? "Parsing Clauses..." : "Extract & Register Criteria Clauses"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-VENDOR COMPARISON MATRIX */}
      {activeTab === "matrix" && (
        <div className="bg-white border border-[#D1D5DB] p-5 space-y-4">
          <div className="gov-section-heading">
            <span>Bidder Technical Evaluation Matrix</span>
            <div className="flex items-center gap-3 text-[11px] normal-case font-normal text-gray-600">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#138808] inline-block"></span> Compliant</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#C51C1C] inline-block"></span> Non-Compliant</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#D97706] inline-block"></span> Needs Review</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#D1D5DB]">
            <table className="gov-table">
              <thead>
                <tr>
                  <th className="w-12 text-center">Sl.</th>
                  <th className="w-56 min-w-[200px]">Bidder Legal Entity / GSTIN</th>
                  <th className="w-28 text-center">Overall Status</th>
                  <th className="w-24 text-center">Score %</th>
                  {matrix?.requirements?.map((req) => (
                    <th key={req.id} className="text-center min-w-[120px] border-l border-[#072C6A]">
                      <div className="font-mono text-[10px] text-[#FF9933]">{req.clause_no}</div>
                      <div className="truncate text-white text-[11px]">{req.title}</div>
                    </th>
                  ))}
                  <th className="w-28 text-center border-l border-[#072C6A]">Audit Action</th>
                </tr>
              </thead>
              <tbody>
                {matrix?.vendors?.map((v, idx) => (
                  <tr key={v.vendor_id}>
                    <td className="text-center font-bold text-gray-500">{idx + 1}</td>
                    <td>
                      <div className="font-bold text-gray-900 text-xs">{v.vendor_name}</div>
                      <div className="font-mono text-[11px] text-gray-600">GSTIN: {v.vendor_gstin || "N/A"}</div>
                    </td>
                    <td className="text-center">
                      <StatusBadge status={v.overall_status} size="sm" />
                    </td>
                    <td className="text-center">
                      <span className="font-bold text-gray-900 text-xs">{v.compliance_score}%</span>
                      <div className="text-[10px] text-gray-500">{v.compliant_count}/{matrix?.requirements?.length} Clauses</div>
                    </td>
                    {matrix?.requirements?.map((req) => {
                      const cell = v.cell_evaluations?.[req.id];
                      return (
                        <td key={req.id} className="text-center border-l border-[#E5E7EB]">
                          {cell ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <StatusBadge status={cell.status} size="sm" />
                              {cell.is_overridden && (
                                <span className="text-[9px] font-bold text-purple-800 uppercase bg-purple-100 px-1 border border-purple-300">
                                  Overridden
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center border-l border-[#E5E7EB]">
                      {/* Secondary Action Button: Green */}
                      <button
                        onClick={() => onSelectVendor(v.vendor_id)}
                        className="gov-btn-secondary text-[11px]"
                      >
                        Audit Report
                      </button>
                    </td>
                  </tr>
                ))}
                {(!matrix?.vendors || matrix.vendors.length === 0) && (
                  <tr>
                    <td colSpan={5 + (matrix?.requirements?.length || 0)} className="text-center py-6 text-gray-500 font-semibold">
                      No vendor bids submitted for this tender yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: VENDOR BID REGISTRATION & MULTI-FILE OCR DROPZONE */}
      {activeTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Registration & Upload Form */}
          <div className="lg:col-span-2 bg-white border border-[#D1D5DB] p-5 space-y-5">
            <div className="gov-section-heading">
              <span>Bidder Registration & Document Submission Form</span>
            </div>

            <form onSubmit={handleCreateVendorAndUpload} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-800 uppercase text-[11px] mb-1">
                    Bidder Legal Entity Name <span className="text-[#C51C1C]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bharat InfoTech Solutions Pvt Ltd"
                    className="w-full p-2 border border-[#9CA3AF] bg-white focus:ring-1 focus:ring-[#0B3D91]"
                    value={newVendorData.vendor_name}
                    onChange={(e) => setNewVendorData({ ...newVendorData, vendor_name: e.target.value })}
                  />
                  <span className="text-[10px] text-gray-500 italic">As registered on the GeM portal.</span>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 uppercase text-[11px] mb-1">
                    GSTIN Number <span className="text-[#C51C1C]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    className="w-full p-2 border border-[#9CA3AF] font-mono bg-white focus:ring-1 focus:ring-[#0B3D91]"
                    value={newVendorData.vendor_gstin}
                    onChange={(e) => setNewVendorData({ ...newVendorData, vendor_gstin: e.target.value })}
                  />
                  <span className="text-[10px] text-gray-500 italic">15-digit Goods and Services Tax ID.</span>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 uppercase text-[11px] mb-1">
                    Permanent Account Number (PAN)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AAAAA0000A"
                    className="w-full p-2 border border-[#9CA3AF] font-mono bg-white focus:ring-1 focus:ring-[#0B3D91]"
                    value={newVendorData.vendor_pan}
                    onChange={(e) => setNewVendorData({ ...newVendorData, vendor_pan: e.target.value })}
                  />
                  <span className="text-[10px] text-gray-500 italic">Income Tax Department PAN.</span>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 uppercase text-[11px] mb-1">
                    Authorized Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="bids@company.co.in"
                    className="w-full p-2 border border-[#9CA3AF] bg-white focus:ring-1 focus:ring-[#0B3D91]"
                    value={newVendorData.contact_email}
                    onChange={(e) => setNewVendorData({ ...newVendorData, contact_email: e.target.value })}
                  />
                  <span className="text-[10px] text-gray-500 italic">For technical clarification notices.</span>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-[#9CA3AF] p-6 text-center bg-[#FAFAFA] space-y-2">
                <div className="font-bold text-xs text-gray-800 uppercase">
                  Attach Vendor Supporting Documents (PDF, Scanned JPG/PNG, DOCX, TXT)
                </div>
                <div className="text-xs text-gray-600">
                  <label className="text-[#0B3D91] hover:underline cursor-pointer font-bold">
                    [ CLICK TO BROWSE FILES ]
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                    />
                  </label>{" "}
                  or drag and drop multiple tender submission files
                </div>
                <p className="text-[11px] text-gray-500 italic">
                  Supported: Financial statements, ISO certificates, Experience letters, GSTIN copies, MII declarations.
                </p>

                {selectedFiles.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#D1D5DB] text-left space-y-1.5">
                    <p className="text-xs font-bold text-gray-800 uppercase">{selectedFiles.length} files selected for ingestion:</p>
                    {selectedFiles.map((f, i) => (
                      <div key={i} className="text-xs bg-white p-2 border border-[#D1D5DB] flex justify-between items-center">
                        <span className="font-semibold text-gray-800">{f.name}</span>
                        <span className="font-mono text-[11px] text-gray-600">{(f.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Primary Action Button: Saffron Theme */}
              <button
                type="submit"
                disabled={evaluating}
                className="gov-btn-primary w-full text-xs py-3"
              >
                {evaluating
                  ? "Ingesting Documents & Executing AI Compliance Audit..."
                  : "Submit Bid & Run Automated Technical Evaluation"}
              </button>
            </form>
          </div>

          {/* Right: Checklist Guidance */}
          <div className="bg-white border border-[#D1D5DB] p-5 space-y-4 text-xs">
            <div className="gov-section-heading">
              <span>Required Document Checklist</span>
            </div>
            <div className="space-y-3">
              <div className="border-l-2 border-blue-600 pl-3 py-1">
                <p className="font-bold text-blue-900 uppercase text-[11px]">₹ Financial Turnover</p>
                <p className="text-gray-600 text-[11px]">Audited balance sheet or CA Certificate with valid UDIN.</p>
              </div>
              <div className="border-l-2 border-indigo-600 pl-3 py-1">
                <p className="font-bold text-indigo-900 uppercase text-[11px]">⏱ Past Work Experience</p>
                <p className="text-gray-600 text-[11px]">Client work orders or completion certificates showing years in operation.</p>
              </div>
              <div className="border-l-2 border-emerald-600 pl-3 py-1">
                <p className="font-bold text-emerald-900 uppercase text-[11px]">📜 ISO & Quality Accreditations</p>
                <p className="text-gray-600 text-[11px]">Valid ISO 9001:2015 registration certificate with unexpired date.</p>
              </div>
              <div className="border-l-2 border-purple-600 pl-3 py-1">
                <p className="font-bold text-purple-900 uppercase text-[11px]">⚖ Statutory & Legal Affidavits</p>
                <p className="text-gray-600 text-[11px]">GSTIN certificate, PAN, and Non-Blacklisting self-declaration.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// VIEW 3: EXPLAINABLE COMPLIANCE AUDIT REPORT (SEGREGATED LAYMAN / TECHNICAL)
// -----------------------------------------------------------------------------
function VendorReportView({
  tender,
  vendor,
  reportViewMode,
  setReportViewMode,
  filterStatus,
  setFilterStatus,
  onBack,
  onOpenOverride,
  onRevertOverride
}) {
  const verdicts = vendor.verdicts || [];

  // Filter criteria by effective verdict status
  const compliantVerdicts = verdicts.filter(v => (v.is_overridden ? v.officer_override_status : v.status) === "COMPLIANT");
  const nonCompliantVerdicts = verdicts.filter(v => (v.is_overridden ? v.officer_override_status : v.status) === "NON_COMPLIANT");
  const needsReviewVerdicts = verdicts.filter(v => (v.is_overridden ? v.officer_override_status : v.status) === "NEEDS_VERIFICATION");

  const filteredVerdicts = verdicts.filter((v) => {
    const effStatus = v.is_overridden ? v.officer_override_status : v.status;
    if (filterStatus === "ALL") return true;
    return effStatus === filterStatus;
  });

  const handleDownloadPDF = () => {
    window.open(`${API_BASE}/api/compliance/report/${vendor.id}/pdf`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Top Header Actions & View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-[#D1D5DB]">
        {/* Neutral Action: Outline Navy */}
        <button
          onClick={onBack}
          className="gov-btn-neutral text-xs py-1.5 w-fit"
        >
          ← Back to Tender Matrix
        </button>

        {/* View Switcher: Simple vs Technical vs Both */}
        <div className="flex items-center gap-1 text-xs">
          <span className="font-bold text-gray-700 uppercase mr-1 text-[11px]">View Mode:</span>
          <button
            onClick={() => setReportViewMode("segregated")}
            className={`px-2.5 py-1 text-[11px] font-bold uppercase border ${
              reportViewMode === "segregated"
                ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            Both (Summary + Technical)
          </button>
          <button
            onClick={() => setReportViewMode("simple_only")}
            className={`px-2.5 py-1 text-[11px] font-bold uppercase border ${
              reportViewMode === "simple_only"
                ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            सरल सारांश / Simple View
          </button>
          <button
            onClick={() => setReportViewMode("detailed_only")}
            className={`px-2.5 py-1 text-[11px] font-bold uppercase border ${
              reportViewMode === "detailed_only"
                ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            विस्तृत रिपोर्ट / Technical View
          </button>
        </div>

        {/* Primary Action Button: Saffron Theme */}
        <button
          onClick={handleDownloadPDF}
          className="gov-btn-primary text-xs py-1.5 w-fit"
        >
          <span>↓</span> Export Official GeM PDF Report
        </button>
      </div>

      {/* Executive Audit Summary Box */}
      <div className="bg-white border border-[#D1D5DB] p-5 space-y-4">
        <div className="gov-section-heading">
          <span>Bidder Technical Evaluation Audit Summary</span>
          <span className="text-xs text-gray-600 normal-case font-mono">
            Tender Ref: {tender.bid_number}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#F9FAFB] p-4 border border-[#E5E7EB] text-xs">
          <div>
            <span className="text-gray-500 font-bold uppercase text-[10px] block">Bidder Legal Entity</span>
            <span className="font-bold text-gray-900 text-sm block mt-0.5">{vendor.vendor_name}</span>
            <span className="text-gray-600 font-mono text-[11px] block mt-1">GSTIN: {vendor.vendor_gstin || "N/A"}</span>
          </div>

          <div>
            <span className="text-gray-500 font-bold uppercase text-[10px] block">Submission Date</span>
            <span className="font-semibold text-gray-800 block mt-0.5">
              {new Date(vendor.submission_date).toLocaleDateString()}
            </span>
            <span className="text-gray-600 font-mono text-[11px] block mt-1">PAN: {vendor.vendor_pan || "N/A"}</span>
          </div>

          <div>
            <span className="text-gray-500 font-bold uppercase text-[10px] block">Overall Evaluation Verdict</span>
            <div className="mt-1">
              <StatusBadge status={vendor.overall_status} size="md" />
            </div>
          </div>

          <div>
            <span className="text-gray-500 font-bold uppercase text-[10px] block">Compliance Score %</span>
            <span className="text-2xl font-black text-[#0B3D91] block mt-0.5">{vendor.compliance_score}%</span>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* ZONE 1: सरल सारांश / SIMPLE SUMMARY (FOR LAYMAN & SMALL VENDORS)       */}
      {/* ======================================================================= */}
      {(reportViewMode === "segregated" || reportViewMode === "simple_only") && (
        <div className="bg-white border-2 border-blue-900 p-5 space-y-4">
          <div className="border-b-2 border-blue-900 pb-2 flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-[#0B3D91] uppercase tracking-wide flex items-center gap-2">
                <span>📋</span> सरल सारांश / Simple Eligibility Summary
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Plain-language explanation of which criteria are met and what action (if any) is required.
              </p>
            </div>
            <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2 py-0.5 uppercase border border-blue-300">
              For Vendors & Committee
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* 1. Green Tile (Compliant / Satisfied) */}
            <div className="border-2 border-[#138808] bg-[#F0FDF4] p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#138808]/30 pb-2">
                <span className="font-bold text-[#138808] uppercase text-xs flex items-center gap-1.5">
                  <span>✅</span> पात्र आवश्यकताएं ({compliantVerdicts.length})
                </span>
                <span className="text-[10px] font-bold text-[#138808] uppercase bg-green-100 px-1.5 py-0.5">
                  Satisfied
                </span>
              </div>
              <p className="text-gray-700 text-[11px] leading-relaxed">
                You have met or exceeded the tender specifications for these clauses:
              </p>
              <ul className="space-y-1.5 text-[11px] text-gray-800">
                {compliantVerdicts.map((v, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#138808] font-bold">✓</span>
                    <div>
                      <b>{v.requirement?.title}:</b> {v.extracted_value || "Document submitted conforms."}
                    </div>
                  </li>
                ))}
                {compliantVerdicts.length === 0 && (
                  <li className="text-gray-500 italic">No fully compliant criteria recorded yet.</li>
                )}
              </ul>
            </div>

            {/* 2. Red Tile (Non-Compliant / Ineligible) */}
            <div className="border-2 border-[#C51C1C] bg-[#FEF2F2] p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#C51C1C]/30 pb-2">
                <span className="font-bold text-[#C51C1C] uppercase text-xs flex items-center gap-1.5">
                  <span>❌</span> अपात्र / कमी ({nonCompliantVerdicts.length})
                </span>
                <span className="text-[10px] font-bold text-[#C51C1C] uppercase bg-red-100 px-1.5 py-0.5">
                  Ineligible
                </span>
              </div>
              <p className="text-gray-700 text-[11px] leading-relaxed">
                These criteria fall short of the mandatory tender rules:
              </p>
              <ul className="space-y-1.5 text-[11px] text-gray-800">
                {nonCompliantVerdicts.map((v, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#C51C1C] font-bold">✕</span>
                    <div>
                      <b>{v.requirement?.title}:</b> Found <i>{v.extracted_value}</i> vs Required <i>{v.required_value}</i>.
                    </div>
                  </li>
                ))}
                {nonCompliantVerdicts.length === 0 && (
                  <li className="text-[#138808] font-semibold">No non-compliant deficiencies identified!</li>
                )}
              </ul>
            </div>

            {/* 3. Amber Tile (Needs Verification / Action Needed) */}
            <div className="border-2 border-[#D97706] bg-[#FFFBEB] p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#D97706]/30 pb-2">
                <span className="font-bold text-[#D97706] uppercase text-xs flex items-center gap-1.5">
                  <span>⚠️</span> सत्यापन आवश्यक ({needsReviewVerdicts.length})
                </span>
                <span className="text-[10px] font-bold text-[#D97706] uppercase bg-amber-100 px-1.5 py-0.5">
                  Action Needed
                </span>
              </div>
              <p className="text-gray-700 text-[11px] leading-relaxed">
                Additional or clearer documents required for committee approval:
              </p>
              <ul className="space-y-1.5 text-[11px] text-gray-800">
                {needsReviewVerdicts.map((v, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#D97706] font-bold">⚠</span>
                    <div>
                      <b>{v.requirement?.title}:</b> {v.reasoning || "Please provide clarifying proof."}
                    </div>
                  </li>
                ))}
                {needsReviewVerdicts.length === 0 && (
                  <li className="text-[#138808] font-semibold">No pending document clarifications required.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ZONE 2: विस्तृत तकनीकी रिपोर्ट / DETAILED TECHNICAL AUDIT REPORT       */}
      {/* ======================================================================= */}
      {(reportViewMode === "segregated" || reportViewMode === "detailed_only") && (
        <div className="space-y-4">
          <div className="gov-section-heading">
            <span>विस्तृत तकनीकी रिपोर्ट / Detailed Technical Audit Report</span>
            <div className="flex items-center gap-1 border border-[#D1D5DB] bg-white">
              {["ALL", "COMPLIANT", "NON_COMPLIANT", "NEEDS_VERIFICATION"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 text-[11px] font-bold uppercase transition ${
                    filterStatus === st
                      ? "bg-[#0B3D91] text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Requirement Cards */}
          <div className="space-y-4">
            {filteredVerdicts.map((v) => {
              const req = v.requirement || {};
              const catInfo = getCategoryInfo(req.category);
              const effStatus = v.is_overridden ? v.officer_override_status : v.status;

              return (
                <div key={v.id} className="bg-white border border-[#D1D5DB] p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-[#E5E7EB] pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-[#0B3D91] bg-gray-100 px-2 py-0.5 border border-gray-300">
                          {req.clause_no || `Clause ${v.requirement_id}`}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{catInfo.icon}</span>
                          <span className={`gov-tag text-[10px] font-bold uppercase px-2 py-0.5 border ${catInfo.color}`}>
                            {req.category || "TECHNICAL"}
                          </span>
                        </div>
                        {req.is_mandatory && (
                          <span className="text-[10px] font-bold text-[#C51C1C] uppercase bg-red-50 px-2 py-0.5 border border-red-200">
                            MANDATORY
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm uppercase">{req.title || "Tender Requirement"}</h3>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{req.description}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <StatusBadge status={effStatus} />
                        <div className="text-[11px] text-gray-500 mt-1 font-mono">
                          Confidence: <b>{v.confidence_score?.toFixed(0)}%</b>
                        </div>
                      </div>
                      <button
                        onClick={() => onOpenOverride(v)}
                        className="px-2.5 py-1.5 text-xs font-bold uppercase text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-300"
                        title="Manual Officer Override"
                      >
                        Override
                      </button>
                    </div>
                  </div>

                  {/* Required vs Extracted Threshold Table */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#F9FAFB] p-3 border border-[#E5E7EB] text-xs">
                    <div>
                      <span className="text-gray-500 font-bold uppercase text-[10px] block">Required Tender Specification</span>
                      <div className="font-bold text-gray-900 font-mono mt-0.5">
                        {v.required_value || req.threshold_value || "Documentary Conformance"}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 font-bold uppercase text-[10px] block">Extracted Value in Bidder Submission</span>
                      <div className="font-bold text-gray-900 font-mono mt-0.5">
                        {v.extracted_value || "Not Identified"}
                      </div>
                    </div>
                  </div>

                  {/* Verified Document Evidence Citation Block */}
                  <div className="gov-callout text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[#0B3D91] font-bold text-[11px] uppercase">
                      <span>Verified Document Evidence Citation:</span>
                      {v.document_name && (
                        <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 border border-gray-300">
                          [Document Ref: {v.document_name} | Page {v.page_number || 1}]
                        </span>
                      )}
                    </div>
                    <div className="text-gray-800 font-mono text-[11px] leading-relaxed bg-[#FAFAFA] p-2.5 border border-[#D1D5DB] italic">
                      "{v.evidence_snippet || "No direct textual citation captured."}"
                    </div>
                  </div>

                  {/* AI Reasoning Box */}
                  <div className="bg-[#EFF6FF] border border-[#BFDBFE] p-3 text-xs text-gray-800">
                    <span className="font-bold text-[#0B3D91] uppercase">AI Technical Evaluation Note: </span>
                    <span>{v.reasoning}</span>
                  </div>

                  {/* Officer Override Audit Stamp */}
                  {v.is_overridden && (
                    <div className="bg-[#FAF5FF] border border-[#D8B4FE] p-3 text-xs flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-purple-900 uppercase text-[11px]">
                          [OFFICER MANUAL OVERRIDE RECORDED] — {v.officer_name} ({new Date(v.officer_timestamp).toLocaleString()})
                        </div>
                        <p className="text-purple-800 mt-1">
                          <b>Official Justification:</b> {v.officer_comment}
                        </p>
                      </div>
                      <button
                        onClick={() => onRevertOverride(v.id)}
                        className="text-[11px] text-purple-900 font-bold uppercase underline hover:text-purple-700 shrink-0"
                      >
                        Revert to AI Verdict
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// MODALS (FORMAL GOVERNMENT WINDOWS)
// -----------------------------------------------------------------------------

/**
 * OfficerOverrideModal: Enables evaluation officers to manually override any AI verdict.
 */
function OfficerOverrideModal({ verdict, overrideForm, setOverrideForm, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white border-2 border-[#0B3D91] max-w-md w-full p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#0B3D91]">
          <h3 className="font-black text-sm text-[#0B3D91] uppercase tracking-wide">
            Officer Manual Override Record
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5">
          <div>
            <label className="block font-bold text-gray-700 uppercase text-[11px] mb-1">Clause to Override:</label>
            <div className="p-2 bg-gray-100 border border-gray-300 font-semibold text-gray-900">
              {verdict.requirement?.title || `Requirement #${verdict.requirement_id}`}
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase text-[11px] mb-1">
              New Official Status <span className="text-[#C51C1C]">*</span>
            </label>
            <select
              className="w-full p-2 border border-[#9CA3AF] bg-white font-bold focus:ring-1 focus:ring-[#0B3D91]"
              value={overrideForm.status}
              onChange={(e) => setOverrideForm({ ...overrideForm, status: e.target.value })}
            >
              <option value="COMPLIANT">COMPLIANT (Accept Clause)</option>
              <option value="NON_COMPLIANT">NON-COMPLIANT (Disqualify Clause)</option>
              <option value="NEEDS_VERIFICATION">NEEDS VERIFICATION (Request Clarification)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase text-[11px] mb-1">
              Officer Name / Committee Designation <span className="text-[#C51C1C]">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full p-2 border border-[#9CA3AF] bg-white focus:ring-1 focus:ring-[#0B3D91]"
              value={overrideForm.officer_name}
              onChange={(e) => setOverrideForm({ ...overrideForm, officer_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase text-[11px] mb-1">
              Mandatory Override Justification Comment <span className="text-[#C51C1C]">*</span>
            </label>
            <textarea
              rows="3"
              required
              placeholder="State official rationale for overriding the AI technical compliance evaluation..."
              className="w-full p-2 border border-[#9CA3AF] bg-white focus:ring-1 focus:ring-[#0B3D91]"
              value={overrideForm.comment}
              onChange={(e) => setOverrideForm({ ...overrideForm, comment: e.target.value })}
            />
            <span className="text-[10px] text-gray-500 italic">This comment will be stamped on the exported PDF audit report.</span>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-[#E5E7EB]">
            {/* Neutral Action: Outline Navy */}
            <button
              type="button"
              onClick={onClose}
              className="gov-btn-neutral text-xs"
            >
              Cancel
            </button>
            {/* Secondary Positive Action: Green */}
            <button
              type="submit"
              className="gov-btn-secondary text-xs"
            >
              Stamp Override in Audit Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * CategoryCriteriaModal: Comprehensive GeM Tender Eligibility & Technical Criteria Inspection Modal
 * Displays 5 Core Procurement Pillars conforming to official GeM / gov.in procurement standards.
 */
function CategoryCriteriaModal({ category, onClose, onFilterTenders, onCreateTenderWithCategory }) {
  if (!category) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border-2 border-[#0B3D91] max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Government Saffron-White-Green Top Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808]"></div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#D1D5DB] flex items-start justify-between bg-[#F8FAFB] gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-white border border-[#D1D5DB] flex items-center justify-center text-2xl shrink-0 shadow-sm">
              {category.icon || "📦"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-[#0B3D91] uppercase tracking-wide">
                  {category.title}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 uppercase ${category.badgeColor}`}>
                  {category.badge}
                </span>
                <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 border border-gray-200">
                  {category.bids}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#0B3D91] mt-0.5">
                {category.hindi}
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-600 font-medium">
                <span>🏛️</span>
                <span>Procuring Authority:</span>
                <span className="font-bold text-gray-800">{category.ministry}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-800 font-black text-lg p-1 transition"
            title="Close Modal"
          >
            ✕
          </button>
        </div>

        {/* Key Highlights Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-3 bg-[#EEF2F6] border-b border-[#D1D5DB] text-xs">
          <div className="bg-white p-2 border border-[#D1D5DB]">
            <div className="text-[10px] font-bold text-gray-500 uppercase">Est. Annual Budget</div>
            <div className="text-xs font-black text-[#0B3D91] font-mono mt-0.5">{category.estValue}</div>
          </div>
          <div className="bg-white p-2 border border-[#D1D5DB]">
            <div className="text-[10px] font-bold text-gray-500 uppercase">GeM Portal Benefits</div>
            <div className="text-xs font-black text-[#138808] mt-0.5 truncate">{category.discount}</div>
          </div>
          <div className="bg-white p-2 border border-[#D1D5DB]">
            <div className="text-[10px] font-bold text-gray-500 uppercase">Local Content (MII)</div>
            <div className="text-xs font-black text-amber-700 mt-0.5">Class-I (≥50%)</div>
          </div>
          <div className="bg-white p-2 border border-[#D1D5DB]">
            <div className="text-[10px] font-bold text-gray-500 uppercase">Evaluation Model</div>
            <div className="text-xs font-black text-indigo-700 mt-0.5">QCBS / L1 Auto-Audit</div>
          </div>
        </div>

        {/* Modal Scrollable Content: 5 Core Criteria Pillars */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs custom-scrollbar">
          
          {/* Pillar 1: Financial & Solvency */}
          <div className="gem-criteria-box p-4 border-l-4 border-blue-600 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">💰</span>
                <h4 className="font-black text-xs uppercase text-[#0B3D91] tracking-wider">
                  स्तंभ 1: वित्तीय एवं वार्षिक टर्नओवर मानदंड / 1. Financial Turnover & Solvency
                </h4>
              </div>
              <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2 py-0.5 uppercase border border-blue-300">
                Mandatory / अनिवार्य
              </span>
            </div>
            <p className="text-xs text-gray-800 font-medium leading-relaxed">
              {category.financialCriteria}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="bg-white p-2 border border-blue-200 flex items-center gap-1.5 text-[11px] text-gray-700">
                <span className="text-blue-600 font-bold">✓</span>
                <span>CA Audited Balance Sheets (3 FYs)</span>
              </div>
              <div className="bg-white p-2 border border-blue-200 flex items-center gap-1.5 text-[11px] text-gray-700">
                <span className="text-blue-600 font-bold">✓</span>
                <span>18-digit UDIN CA Certificate</span>
              </div>
              <div className="bg-white p-2 border border-blue-200 flex items-center gap-1.5 text-[11px] text-gray-700">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Positive Net Worth in all 3 FYs</span>
              </div>
            </div>
          </div>

          {/* Pillar 2: Technical Specifications */}
          <div className="gem-criteria-box p-4 border-l-4 border-indigo-600 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">⚙️</span>
                <h4 className="font-black text-xs uppercase text-indigo-900 tracking-wider">
                  स्तंभ 2: प्रमुख तकनीकी विनिर्देश एवं मानक / 2. Technical Specifications & Benchmarks
                </h4>
              </div>
              <span className="bg-indigo-100 text-indigo-900 text-[10px] font-bold px-2 py-0.5 uppercase border border-indigo-300">
                Specification Thresholds
              </span>
            </div>
            <p className="text-[11px] text-gray-600">
              Bidder and OEM data sheets must strictly comply with or exceed all the following baseline hardware & performance thresholds:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              {category.technicalSpecs?.map((spec, idx) => (
                <div key={idx} className="bg-white p-2.5 border border-indigo-100 flex items-start gap-2 text-[11px] text-gray-800 leading-snug">
                  <span className="text-indigo-600 font-black shrink-0">▪</span>
                  <span>{spec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pillar 3: Quality Certifications */}
          <div className="gem-criteria-box p-4 border-l-4 border-emerald-600 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">📜</span>
                <h4 className="font-black text-xs uppercase text-emerald-900 tracking-wider">
                  स्तंभ 3: अनिवार्य गुणवत्ता एवं विनियामक प्रमाणन / 3. Mandatory Quality Certifications
                </h4>
              </div>
              <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 uppercase border border-emerald-300">
                NABCB / BIS Approved
              </span>
            </div>
            <p className="text-[11px] text-gray-600">
              Active accreditation certificates with validity on bid opening date issued by accredited certification bodies:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {category.mandatoryCerts?.map((cert, idx) => (
                <div key={idx} className="bg-white p-2.5 border border-emerald-200 flex items-center gap-2 text-[11px] font-semibold text-gray-800">
                  <span className="text-[#138808] font-black shrink-0">✓</span>
                  <span>{cert}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pillar 4: Make In India (MII) & Statutory Affidavits */}
          <div className="gem-criteria-box p-4 border-l-4 border-amber-600 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🇮🇳</span>
                <h4 className="font-black text-xs uppercase text-amber-900 tracking-wider">
                  स्तंभ 4: मेक इन इंडिया (MII) एवं वैधानिक शपथ पत्र / 4. Make in India & Statutory Affidavits
                </h4>
              </div>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 uppercase border border-amber-300">
                Public Procurement Order (PPP-MII)
              </span>
            </div>
            <div className="bg-amber-50 p-2.5 border border-amber-300 text-[11px] text-amber-900 font-semibold flex items-center gap-2">
              <span>🇮🇳</span>
              <span><b>MII Preference Clause:</b> {category.miiClause}</span>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-gray-700 uppercase">Mandatory Statutory Documents:</div>
              {category.statutoryAffidavits?.map((aff, idx) => (
                <div key={idx} className="bg-white p-2 border border-amber-200 flex items-center gap-2 text-[11px] text-gray-800">
                  <span className="text-amber-700 font-bold shrink-0">⚖</span>
                  <span>{aff}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pillar 5: Experience, Warranty & SLA */}
          <div className="gem-criteria-box p-4 border-l-4 border-purple-600 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">⏱️</span>
                <h4 className="font-black text-xs uppercase text-purple-900 tracking-wider">
                  स्तंभ 5: कार्य अनुभव एवं वारंटी शर्तें / 5. Past Experience & SLA Warranty Terms
                </h4>
              </div>
              <span className="bg-purple-100 text-purple-900 text-[10px] font-bold px-2 py-0.5 uppercase border border-purple-300">
                Track Record & SLA
              </span>
            </div>
            <div className="space-y-2 text-[11px] text-gray-800">
              <div className="bg-white p-2.5 border border-purple-200">
                <span className="font-bold text-purple-900 block mb-0.5">Prior Experience Requirement:</span>
                <p className="leading-relaxed">{category.experienceCriteria}</p>
              </div>
              <div className="bg-white p-2.5 border border-purple-200">
                <span className="font-bold text-purple-900 block mb-0.5">Comprehensive Warranty & SLA Commitment:</span>
                <p className="leading-relaxed">{category.warrantyTerms}</p>
              </div>
            </div>
          </div>

          {/* BidVerify AI Verification Pipeline Callout */}
          <div className="gov-callout text-[11px] text-gray-800 flex items-start gap-3">
            <div className="w-7 h-7 bg-[#0B3D91] text-white flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
              AI
            </div>
            <div className="space-y-0.5">
              <div className="font-black text-[#0B3D91] uppercase tracking-wide">
                BidVerify AI Evidentiary Verification Guarantee
              </div>
              <p className="text-gray-600 leading-relaxed">
                When vendors submit their tender bid documentation, BidVerify AI automatically extracts and evaluates technical sheets, CA turnover certificates, ISO validity dates, and Make-in-India declarations against these exact criteria clauses with page-level PDF citations.
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-[#F9FAFB] border-t border-[#D1D5DB] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500 font-mono">
            Catalog Code: <span className="font-bold text-gray-800 uppercase">{category.id}</span> | GeM Spec v2026.1
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="gov-btn-neutral text-xs"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onFilterTenders && onFilterTenders(category)}
              className="gov-btn-neutral text-xs text-[#0B3D91] border-[#0B3D91] hover:bg-[#0B3D91] hover:text-white flex items-center gap-1.5"
            >
              <span>🔍</span> Filter Matching GeM Tenders
            </button>
            <button
              type="button"
              onClick={() => onCreateTenderWithCategory && onCreateTenderWithCategory(category)}
              className="gov-btn-primary text-xs flex items-center gap-1.5"
            >
              <span>+</span> Create Tender with these Criteria
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SettingsModal: Configures AI Engine providers (Smart RAG, Google Gemini, OpenAI).
 */
function SettingsModal({ settings, setSettings, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white border-2 border-[#0B3D91] max-w-lg w-full p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#0B3D91]">
          <h3 className="font-black text-sm text-[#0B3D91] uppercase tracking-wide">
            AI Compliance Engine & Provider Configuration
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="block font-bold text-gray-700 uppercase text-[11px] mb-1">
              Select AI Engine Provider:
            </label>
            <select
              className="w-full p-2 border border-[#9CA3AF] bg-white font-bold focus:ring-1 focus:ring-[#0B3D91]"
              value={settings.llm_provider}
              onChange={(e) => setSettings({ ...settings, llm_provider: e.target.value })}
            >
              <option value="smart_mock">Built-in High Precision Smart RAG Engine (Zero API Key Needed)</option>
              <option value="gemini">Google Gemini API (gemini-1.5-flash Structured JSON)</option>
              <option value="openai">OpenAI API (gpt-4o-mini)</option>
            </select>
          </div>

          {settings.llm_provider === "gemini" && (
            <div>
              <label className="block font-bold text-gray-700 uppercase text-[11px] mb-1">
                Google Gemini API Key:
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                className="w-full p-2 border border-[#9CA3AF] font-mono bg-white focus:ring-1 focus:ring-[#0B3D91]"
                value={settings.gemini_api_key}
                onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
              />
            </div>
          )}

          {settings.llm_provider === "openai" && (
            <div>
              <label className="block font-bold text-gray-700 uppercase text-[11px] mb-1">
                OpenAI API Key:
              </label>
              <input
                type="password"
                placeholder="sk-proj-..."
                className="w-full p-2 border border-[#9CA3AF] font-mono bg-white focus:ring-1 focus:ring-[#0B3D91]"
                value={settings.openai_api_key}
                onChange={(e) => setSettings({ ...settings, openai_api_key: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-gray-700 uppercase text-[11px] mb-1">
              Document OCR Processing Mode:
            </label>
            <select
              className="w-full p-2 border border-[#9CA3AF] bg-white focus:ring-1 focus:ring-[#0B3D91]"
              value={settings.ocr_mode}
              onChange={(e) => setSettings({ ...settings, ocr_mode: e.target.value })}
            >
              <option value="hybrid">Hybrid (PyMuPDF Native Text + Tesseract OCR Fallback)</option>
              <option value="native">Native Text Layer Only (Fastest)</option>
              <option value="ocr">Strict Full-Page OCR</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-[#E5E7EB]">
            {/* Neutral Action: Outline Navy */}
            <button
              type="button"
              onClick={onClose}
              className="gov-btn-neutral text-xs"
            >
              Cancel
            </button>
            {/* Primary Action: Saffron Theme */}
            <button
              type="submit"
              className="gov-btn-primary text-xs"
            >
              Save Engine Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * NewTenderModal: Modal for publishing a new GeM tender specification.
 */
function NewTenderModal({ onClose, onCreated, initialData }) {
  const [form, setForm] = useState(() => ({
    bid_number: initialData?.bid_number || `GEM/2026/B/${Math.floor(100000 + Math.random() * 900000)}`,
    title: initialData?.title || "",
    organization: initialData?.organization || "Ministry of Electronics & Information Technology",
    category: initialData?.category || "IT Hardware & Cloud Infrastructure",
    estimated_value: initialData?.estimated_value || "₹ 15.00 Cr",
    submission_deadline: initialData?.submission_deadline || "20-Nov-2026 15:00:00"
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/tenders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        const tender = await res.json();
        onCreated(tender);
      }
    } catch (e) {
      alert("Error creating tender record");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 text-xs">
      <div className="bg-white border-2 border-[#0B3D91] max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#0B3D91]">
          <h3 className="font-black text-sm text-[#0B3D91] uppercase tracking-wide">
            Publish New GeM Tender Specification
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-bold text-gray-700 uppercase text-[11px] mb-1">
              GeM Bid Number <span className="text-[#C51C1C]">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full p-2 border border-[#9CA3AF] font-mono bg-white focus:ring-1 focus:ring-[#0B3D91]"
              value={form.bid_number}
              onChange={(e) => setForm({ ...form, bid_number: e.target.value })}
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase text-[11px] mb-1">
              Tender Procurement Title <span className="text-[#C51C1C]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Procurement of Enterprise Cloud Compute Nodes"
              className="w-full p-2 border border-[#9CA3AF] bg-white focus:ring-1 focus:ring-[#0B3D91]"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 uppercase text-[11px] mb-1">Procuring Department / Ministry</label>
              <input
                type="text"
                className="w-full p-2 border border-[#9CA3AF] bg-white focus:ring-1 focus:ring-[#0B3D91]"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 uppercase text-[11px] mb-1">Estimated Contract Value</label>
              <input
                type="text"
                className="w-full p-2 border border-[#9CA3AF] bg-white focus:ring-1 focus:ring-[#0B3D91]"
                value={form.estimated_value}
                onChange={(e) => setForm({ ...form, estimated_value: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase text-[11px] mb-1">Product / Service Category</label>
            <input
              type="text"
              className="w-full p-2 border border-[#9CA3AF] bg-white focus:ring-1 focus:ring-[#0B3D91]"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-[#E5E7EB]">
            {/* Neutral Action: Outline Navy */}
            <button
              type="button"
              onClick={onClose}
              className="gov-btn-neutral text-xs"
            >
              Cancel
            </button>
            {/* Primary Action: Saffron Theme */}
            <button
              type="submit"
              className="gov-btn-primary text-xs"
            >
              Publish Tender
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Application Render Entrypoint (React 18 createRoot)
// -----------------------------------------------------------------------------
const container = document.getElementById("root");
if (ReactDOM.createRoot) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
} else {
  ReactDOM.render(<App />, container);
}

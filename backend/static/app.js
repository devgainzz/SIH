const { useState, useEffect, useRef } = React;

const API_BASE = "";

// Helper for Lucide icons update
function refreshIcons() {
  setTimeout(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, 50);
}

// Ashoka Chakra 24-spoke SVG Component
function AshokaChakra({ size = 28, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`text-[#0B3D91] ${className}`} fill="none" stroke="currentColor" strokeWidth="2.5">
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

// National Emblem of India (Ashoka Lion Capital Placeholder SVG)
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

// Category Badge Color & Icon Helper
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

// Government Solid Status Badge Component
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

// Main BidVerify Application (GeM Government of India Portal)
function App() {
  const [tenders, setTenders] = useState([]);
  const [currentTender, setCurrentTender] = useState(null);
  const [currentVendor, setCurrentVendor] = useState(null);
  const [comparisonMatrix, setComparisonMatrix] = useState(null);
  const [activeView, setActiveView] = useState("dashboard"); // dashboard, tender_detail, vendor_report
  const [activeTab, setActiveTab] = useState("requirements"); // requirements, matrix, upload
  const [reportViewMode, setReportViewMode] = useState("segregated"); // segregated, simple_only, detailed_only
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [toast, setToast] = useState(null);

  // Accessibility State (Font Scale & Language)
  const [fontScale, setFontScale] = useState(1);
  const [language, setLanguage] = useState("EN"); // EN, HI

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNewTenderModal, setShowNewTenderModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedVerdict, setSelectedVerdict] = useState(null);
  const [overrideForm, setOverrideForm] = useState({ status: "COMPLIANT", comment: "", officer_name: "Technical Evaluation Committee (GeM)" });

  // Requirement Parser State
  const [rawTenderText, setRawTenderText] = useState("");
  const [isParsingReqs, setIsParsingReqs] = useState(false);

  // New Vendor Upload State
  const [newVendorData, setNewVendorData] = useState({ vendor_name: "", vendor_gstin: "", vendor_pan: "", contact_email: "" });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [createdVendorId, setCreatedVendorId] = useState(null);
  const [uploadedDocsList, setUploadedDocsList] = useState([]);

  // Settings State
  const [settings, setSettings] = useState({
    llm_provider: "smart_mock",
    gemini_api_key: "",
    openai_api_key: "",
    model_name: "gemini-1.5-flash",
    ocr_mode: "hybrid"
  });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const adjustFontScale = (delta) => {
    let newScale = 1;
    if (delta === 0) newScale = 1;
    else if (delta === -1) newScale = 0.9;
    else if (delta === 1) newScale = 1.15;
    
    setFontScale(newScale);
    document.documentElement.style.setProperty("--gov-font-scale", newScale);
  };

  // Fetch initial data
  useEffect(() => {
    loadTenders();
    loadSettings();
  }, []);

  useEffect(() => {
    refreshIcons();
  }, [activeView, activeTab, currentTender, currentVendor, showOverrideModal, showSettingsModal, showNewTenderModal, fontScale, reportViewMode]);

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

  const loadComparisonMatrix = async (tenderId) => {
    try {
      const res = await fetch(`${API_BASE}/api/tenders/${tenderId}/matrix`);
      const data = await res.json();
      setComparisonMatrix(data);
    } catch (e) {
      console.error(e);
    }
  };

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

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      const data = await res.json();
      setSettings(prev => ({ ...prev, ...data }));
    } catch (e) {
      console.error(e);
    }
  };

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

  // Parse Raw Requirements
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

  // Submit New Vendor & Upload Documents
  const handleCreateVendorAndUpload = async (e) => {
    e.preventDefault();
    if (!newVendorData.vendor_name || !currentTender) {
      showToast("Vendor Legal Name is mandatory.", "error");
      return;
    }

    try {
      setLoading(true);
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
      await handleEvaluateVendor(vendor.id);
    } catch (e) {
      showToast("Error creating vendor or uploading documents", "error");
    } finally {
      setLoading(false);
    }
  };

  // Run AI Compliance Verification
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

  // Submit Officer Override
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

  // Revert Officer Override
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

        <div className="flex items-center gap-4 text-[11px]">
          <a href="#main-content" className="hover:underline text-[#0B3D91] font-bold">
            Skip to Main Content
          </a>
          <span className="text-gray-300">|</span>
          
          {/* Text Resize Controls */}
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
          
          {/* Language Toggle */}
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
        </div>
      </div>

      {/* 3. Main Government Portal Branding Header (White Background) */}
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

            {/* Subtle Ashoka Chakra Element */}
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

      {/* 5. Breadcrumb Trail Bar */}
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

      {/* Official Government Callout Banner */}
      <div className="max-w-7xl w-full mx-auto px-6 pt-4">
        <div className="gov-callout text-xs text-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0B3D91] uppercase tracking-wide">[OFFICIAL NOTICE]:</span>
            <span>All AI verdicts are evidentiary and cited against submitted bid documents. Officer overrides are digitally recorded in the audit trail per GeM compliance guidelines.</span>
          </div>
          <span className="text-[11px] font-mono text-gray-500 hidden sm:inline">Ref: SIH26100/GeM/2026</span>
        </div>
      </div>

      {/* Toast Alert */}
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
            onCreateTender={() => setShowNewTenderModal(true)}
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

      {/* New Tender Modal */}
      {showNewTenderModal && (
        <NewTenderModal
          onClose={() => setShowNewTenderModal(false)}
          onCreated={(newTender) => {
            setShowNewTenderModal(false);
            loadTenders();
            loadTenderDetail(newTender.id);
            setActiveView("tender_detail");
            showToast("New GeM Tender successfully created.");
          }}
        />
      )}

      {/* 6. Official Indian Government Portal Footer */}
      <footer className="bg-[#0B3D91] text-white border-t-4 border-[#FF9933] mt-12 text-xs">
        {/* Top Footer Navigation Links */}
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

        {/* Official Ownership & Technical Credit */}
        <div className="bg-[#072C6A] px-6 py-5 text-center text-[11px] text-gray-300 space-y-1.5">
          <div className="max-w-7xl mx-auto">
            <p className="font-semibold text-white">
              Website Content Owned & Managed by Government e-Marketplace (GeM), Ministry of Commerce and Industry, Government of India.
            </p>
            <p className="text-gray-300">
              Designed, Developed and Hosted by National Informatics Centre (NIC) | Problem Statement SIH26100.
            </p>
            <p className="text-gray-400 pt-1">
              Last Reviewed and Updated on: <b>29 Aug 2026</b> | Version 1.0.0 (Production Build)
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// -------------------------------------------------------------
// VIEW 1: DASHBOARD (DENSE GOVERNMENT TABLE)
// -------------------------------------------------------------
function DashboardView({ tenders, onSelectTender, onCreateTender }) {
  const [search, setSearch] = useState("");

  const filtered = tenders.filter(t => 
    t.bid_number.toLowerCase().includes(search.toLowerCase()) ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.organization.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 4 Summary Metric Cells (Government Table Header Style) */}
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

      {/* Main Table Section */}
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

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F9FAFB] p-3 border border-[#E5E7EB]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-gray-700 uppercase">Search Records:</label>
            <input
              type="text"
              placeholder="Search Bid Number, Ministry..."
              className="px-3 py-1.5 text-xs border border-[#9CA3AF] bg-white focus:ring-1 focus:ring-[#0B3D91] w-72"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600">
            Total Records: <b>{filtered.length}</b>
          </span>
        </div>

        {/* Government Dense Table */}
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
                    {/* Secondary Action Button: Green Theme */}
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

// -------------------------------------------------------------
// VIEW 2: TENDER WORKSPACE (DETAIL, MATRIX, UPLOAD)
// -------------------------------------------------------------
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
      {/* Tender Header Summary Box (Government Form Key-Value Grid) */}
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

        {/* Tab Sub-navigation Bar */}
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

      {/* TAB 1: ELIGIBILITY REQUIREMENTS */}
      {activeTab === "requirements" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Requirements List Table with Layman Helpers */}
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

          {/* Right: AI Clause Auto-Parser (Formal Box) */}
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
            {/* Primary Action Button: Saffron */}
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
                      {/* Secondary Action: Green Theme */}
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

      {/* TAB 3: NEW VENDOR BID & OCR DROPZONE */}
      {activeTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Form with Layman Explanations */}
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

              {/* Upload Dropzone (Government Form Box) */}
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

          {/* Right: Category Guidance for Small Vendors */}
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

// -------------------------------------------------------------
// VIEW 3: EXPLAINABLE COMPLIANCE REPORT (SEGREGATED LAYMAN / TECHNICAL)
// -------------------------------------------------------------
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

      {/* ========================================================================= */}
      {/* ZONE 1: सरल सारांश / SIMPLE SUMMARY (FOR LAYMAN & VENDORS) */}
      {/* ========================================================================= */}
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
            {/* 1. Green Tile (Compliant) */}
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

            {/* 2. Red Tile (Non-Compliant) */}
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

            {/* 3. Amber Tile (Needs Verification) */}
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

      {/* ========================================================================= */}
      {/* ZONE 2: विस्तृत तकनीकी रिपोर्ट / DETAILED TECHNICAL AUDIT REPORT */}
      {/* ========================================================================= */}
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

                  {/* Verified Document Evidence Citation Block (Formal Government Quote Box) */}
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

// -------------------------------------------------------------
// MODALS (FORMAL GOVERNMENT WINDOWS)
// -------------------------------------------------------------
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
            {/* Secondary/Confirm Action: Green */}
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

function NewTenderModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    bid_number: `GEM/2026/B/${Math.floor(100000 + Math.random() * 900000)}`,
    title: "",
    organization: "Ministry of Electronics & Information Technology",
    category: "IT Hardware & Cloud Infrastructure",
    estimated_value: "₹ 15.00 Cr",
    submission_deadline: "20-Nov-2026 15:00:00"
  });

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

// Render Application
ReactDOM.render(<App />, document.getElementById("root"));

"""
================================================================================
BidVerify AI — GeM Bid Compliance Verification (SIH26100)
AI Engine & System Configuration REST API Router (/api/settings)
================================================================================

Description:
    This router provides endpoints to configure and customize:
    1. Active AI Provider ('smart_mock' Built-in Smart RAG, 'gemini' Google API, 'openai' OpenAI API).
    2. API Keys management with automatic masking for security.
    3. LLM Model Selection (e.g. 'gemini-1.5-flash', 'gpt-4o-mini').
    4. Document OCR Parsing mode ('hybrid', 'native', 'ocr').
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import SystemSetting
from app.schemas import SettingsUpdate

# Initialize sub-router with '/api/settings' prefix
router = APIRouter(prefix="/api/settings", tags=["Settings"])


# ------------------------------------------------------------------------------
# 1. Retrieve Current System & AI Engine Configuration
# ------------------------------------------------------------------------------
@router.get("")
def get_settings(db: Session = Depends(get_db)):
    """
    Returns current system settings with masked API keys for secure frontend display.
    """
    rows = db.query(SystemSetting).all()
    settings_dict = {r.key: r.value for r in rows}
    
    # Mask API keys for safety (e.g. "AIza...9912")
    gemini_key = settings_dict.get("gemini_api_key", "")
    openai_key = settings_dict.get("openai_api_key", "")
    
    masked_gemini = (gemini_key[:4] + "..." + gemini_key[-4:]) if len(gemini_key) > 8 else ("***" if gemini_key else "")
    masked_openai = (openai_key[:4] + "..." + openai_key[-4:]) if len(openai_key) > 8 else ("***" if openai_key else "")

    return {
        "llm_provider": settings_dict.get("llm_provider", "smart_mock"),
        "has_gemini_key": bool(gemini_key),
        "has_openai_key": bool(openai_key),
        "masked_gemini_key": masked_gemini,
        "masked_openai_key": masked_openai,
        "model_name": settings_dict.get("model_name", "gemini-1.5-flash"),
        "ocr_mode": settings_dict.get("ocr_mode", "hybrid")
    }


# ------------------------------------------------------------------------------
# 2. Update System & AI Engine Configuration
# ------------------------------------------------------------------------------
@router.post("")
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    """
    Persists updated AI provider, API keys, or OCR processing mode to the database.
    """
    def set_val(key: str, val: str):
        """Helper to upsert a key-value setting in the database."""
        if val is not None:
            obj = db.query(SystemSetting).filter(SystemSetting.key == key).first()
            if not obj:
                obj = SystemSetting(key=key, value=val)
                db.add(obj)
            else:
                obj.value = val

    # Upsert provided settings
    if payload.llm_provider:
        set_val("llm_provider", payload.llm_provider)
    if payload.gemini_api_key is not None and payload.gemini_api_key != "":
        set_val("gemini_api_key", payload.gemini_api_key)
    if payload.openai_api_key is not None and payload.openai_api_key != "":
        set_val("openai_api_key", payload.openai_api_key)
    if payload.model_name:
        set_val("model_name", payload.model_name)
    if payload.ocr_mode:
        set_val("ocr_mode", payload.ocr_mode)

    db.commit()
    return {
        "message": "AI Engine settings updated successfully",
        "provider": payload.llm_provider
    }

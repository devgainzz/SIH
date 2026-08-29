from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import SystemSetting
from app.schemas import SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(SystemSetting).all()
    settings_dict = {r.key: r.value for r in rows}
    
    # Mask API keys for safety
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


@router.post("")
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    def set_val(key: str, val: str):
        if val is not None:
            obj = db.query(SystemSetting).filter(SystemSetting.key == key).first()
            if not obj:
                obj = SystemSetting(key=key, value=val)
                db.add(obj)
            else:
                obj.value = val

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
    return {"message": "Settings updated successfully", "provider": payload.llm_provider}


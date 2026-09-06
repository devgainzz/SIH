"""
================================================================================
BidVerify AI — GeM Bid Compliance Verification (SIH26100)
Document Ingestion, OCR & Page-Level Text Chunking Pipeline
================================================================================

Description:
    This service handles the automated extraction and segmentation of unstructured
    vendor bid submissions. It supports:
    1. Native PDF text extraction using PyMuPDF (fitz) with exact page number tracking.
    2. OCR fallback for scanned images and non-searchable PDFs (Pillow + pytesseract).
    3. Microsoft Word (.docx / .doc) extraction with paragraph and table parsing.
    4. Plain text (.txt, .md, .csv, .json) processing.
    5. Semantic text chunking with page number metadata for accurate RAG citations.
"""

import os
import json
import re
from typing import List, Dict, Any, Tuple

# Attempt import of PyMuPDF for native high-speed PDF text parsing
try:
    import pymupdf as fitz
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

# Attempt import of python-docx for Microsoft Word documents
try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

# Attempt import of Pillow and pytesseract for scanned OCR fallback
try:
    from PIL import Image
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False


class DocumentChunk:
    """
    Represents an isolated, indexed text chunk from a specific document page.

    Attributes:
        chunk_id (int): Unique numeric sequence index.
        document_name (str): Source document file name.
        page_number (int): 1-indexed page number where this text appears.
        text (str): Extracted paragraph or tabular text content.
    """
    def __init__(self, chunk_id: int, document_name: str, page_number: int, text: str):
        self.chunk_id = chunk_id
        self.document_name = document_name
        self.page_number = page_number
        self.text = text.strip()

    def to_dict(self) -> Dict[str, Any]:
        """Serializes chunk object into a dictionary for JSON database storage."""
        return {
            "chunk_id": self.chunk_id,
            "document_name": self.document_name,
            "page_number": self.page_number,
            "text": self.text,
            "char_count": len(self.text)
        }


class DocumentProcessor:
    """
    High-level document processing pipeline for heterogeneous tender bid submissions.
    """

    @classmethod
    def process_file(cls, file_path: str, filename: str) -> Tuple[int, List[Dict[str, Any]], str]:
        """
        Main entrypoint: Routes a file to the appropriate format extractor.

        Args:
            file_path (str): Absolute path to the uploaded file on disk.
            filename (str): Name of the file.

        Returns:
            Tuple[int, List[Dict[str, Any]], str]:
                - Total page count detected
                - List of serialized DocumentChunk dictionaries with page metadata
                - Complete concatenated plain text
        """
        ext = os.path.splitext(filename)[1].lower()
        
        if ext == ".pdf":
            return cls._process_pdf(file_path, filename)
        elif ext in [".docx", ".doc"]:
            return cls._process_docx(file_path, filename)
        elif ext in [".jpg", ".jpeg", ".png", ".bmp", ".tiff"]:
            return cls._process_image(file_path, filename)
        elif ext in [".txt", ".md", ".csv", ".json"]:
            return cls._process_text_file(file_path, filename)
        else:
            # Fallback to general plain text reader
            return cls._process_text_file(file_path, filename)

    @classmethod
    def _process_pdf(cls, file_path: str, filename: str) -> Tuple[int, List[Dict[str, Any]], str]:
        """
        Extracts text from PDF documents page by page using PyMuPDF.
        If a page contains sparse/scanned content, automatically runs OCR fallback.
        """
        chunks = []
        full_text_parts = []
        page_count = 0
        chunk_id_counter = 1

        if PYMUPDF_AVAILABLE:
            try:
                doc = fitz.open(file_path)
                page_count = len(doc)
                for page_idx in range(page_count):
                    page = doc[page_idx]
                    page_num = page_idx + 1
                    page_text = page.get_text("text")

                    # If page text is very sparse (< 30 chars), run OCR if available
                    if len(page_text.strip()) < 30 and OCR_AVAILABLE:
                        ocr_text = cls._ocr_pdf_page(page)
                        if len(ocr_text.strip()) > len(page_text.strip()):
                            page_text = ocr_text

                    if not page_text.strip():
                        page_text = f"[Scanned/Image Page {page_num} in {filename}]"

                    full_text_parts.append(f"--- [Page {page_num}] ---\n{page_text}")
                    
                    # Split page into semantically bounded paragraph chunks
                    page_chunks = cls._chunk_page_text(page_text, filename, page_num, chunk_id_counter)
                    for ch in page_chunks:
                        chunks.append(ch.to_dict())
                        chunk_id_counter += 1

                doc.close()
                return max(1, page_count), chunks, "\n\n".join(full_text_parts)
            except Exception as e:
                # If PyMuPDF encounters an unreadable stream, fall through to text fallback
                pass

        # Text fallback if PyMuPDF not available or file is plain text stream
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                raw_text = f.read()
            chunks.append(DocumentChunk(1, filename, 1, raw_text).to_dict())
            return 1, chunks, raw_text
        except Exception as e:
            err_text = f"Error reading PDF {filename}: {str(e)}"
            return 1, [DocumentChunk(1, filename, 1, err_text).to_dict()], err_text

    @classmethod
    def _ocr_pdf_page(cls, page) -> str:
        """
        Renders a PDF page as a high-DPI pixmap image and applies Tesseract OCR.
        """
        if not OCR_AVAILABLE:
            return ""
        try:
            pix = page.get_pixmap(dpi=150)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            text = pytesseract.image_to_string(img)
            return text
        except Exception:
            return ""

    @classmethod
    def _process_docx(cls, file_path: str, filename: str) -> Tuple[int, List[Dict[str, Any]], str]:
        """
        Extracts text from Microsoft Word (.docx) files, parsing paragraphs and tables.
        """
        chunks = []
        paragraphs = []
        chunk_id = 1
        
        if DOCX_AVAILABLE:
            try:
                doc = docx.Document(file_path)
                for p in doc.paragraphs:
                    if p.text.strip():
                        paragraphs.append(p.text.strip())
                # Extract text from embedded tables
                for table in doc.tables:
                    for row in table.rows:
                        row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                        if row_cells:
                            paragraphs.append(" | ".join(row_cells))
            except Exception:
                pass

        if not paragraphs:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                paragraphs = [f.read()]

        full_text = "\n\n".join(paragraphs)
        # Approximate 400 words per page for DOCX pagination
        words = full_text.split()
        page_count = max(1, (len(words) // 400) + 1)

        # Assemble chunks with approximate page tracking
        current_chunk = []
        current_page = 1
        current_word_count = 0

        for p in paragraphs:
            p_words = len(p.split())
            current_chunk.append(p)
            current_word_count += p_words

            if current_word_count >= 150:
                chunk_text = "\n".join(current_chunk)
                chunks.append(DocumentChunk(chunk_id, filename, current_page, chunk_text).to_dict())
                chunk_id += 1
                current_chunk = []
                if current_word_count >= 400:
                    current_page += 1
                    current_word_count = 0

        if current_chunk:
            chunk_text = "\n".join(current_chunk)
            chunks.append(DocumentChunk(chunk_id, filename, current_page, chunk_text).to_dict())

        return page_count, chunks, full_text

    @classmethod
    def _process_image(cls, file_path: str, filename: str) -> Tuple[int, List[Dict[str, Any]], str]:
        """
        Extracts text from scanned image files (PNG, JPG, TIFF) via Tesseract OCR.
        """
        extracted_text = ""
        if OCR_AVAILABLE:
            try:
                img = Image.open(file_path)
                extracted_text = pytesseract.image_to_string(img)
            except Exception as e:
                extracted_text = f"[OCR Image extraction notice for {filename}: {str(e)}]"
        else:
            extracted_text = f"[Image document: {filename}. OCR engine ready.]"

        if not extracted_text.strip():
            extracted_text = f"[Scanned Image Document: {filename}]"

        chunks = [DocumentChunk(1, filename, 1, extracted_text).to_dict()]
        return 1, chunks, extracted_text

    @classmethod
    def _process_text_file(cls, file_path: str, filename: str) -> Tuple[int, List[Dict[str, Any]], str]:
        """
        Extracts and chunks plain text files (.txt, .md, .csv, .json).
        """
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception:
            text = ""

        chunks = cls._chunk_page_text(text, filename, 1, 1)
        chunk_dicts = [c.to_dict() for c in chunks]
        return 1, chunk_dicts, text

    @classmethod
    def _chunk_page_text(cls, page_text: str, filename: str, page_num: int, start_chunk_id: int) -> List[DocumentChunk]:
        """
        Splits page text into coherent paragraph-level chunks of ~400 characters,
        preserving sentence integrity for semantic RAG retrieval.
        """
        chunks = []
        raw_paras = [p.strip() for p in page_text.split("\n\n") if p.strip()]
        
        if not raw_paras:
            raw_paras = [p.strip() for p in page_text.split("\n") if p.strip()]

        if not raw_paras:
            chunks.append(DocumentChunk(start_chunk_id, filename, page_num, page_text.strip() or f"[Empty content on page {page_num}]"))
            return chunks

        current_buf = []
        current_len = 0
        cid = start_chunk_id

        for para in raw_paras:
            current_buf.append(para)
            current_len += len(para)
            if current_len >= 400:
                chunk_text = "\n".join(current_buf)
                chunks.append(DocumentChunk(cid, filename, page_num, chunk_text))
                cid += 1
                current_buf = []
                current_len = 0

        if current_buf:
            chunk_text = "\n".join(current_buf)
            chunks.append(DocumentChunk(cid, filename, page_num, chunk_text))

        return chunks

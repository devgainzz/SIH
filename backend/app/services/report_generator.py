import os
import io
import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfgen import canvas

class ReportGenerator:
    """
    Generates official GeM Compliance Verification PDF Reports.
    """

    @classmethod
    def generate_pdf_report(
        cls,
        tender: Dict[str, Any],
        vendor_bid: Dict[str, Any],
        verdicts: List[Dict[str, Any]],
        output_path: str
    ) -> str:
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom styles
        header_title_style = ParagraphStyle(
            'HeaderTitle',
            parent=styles['Heading1'],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0F172A"),
            fontName="Helvetica-Bold"
        )
        subtitle_style = ParagraphStyle(
            'Subtitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#475569")
        )
        section_title_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#1E293B"),
            fontName="Helvetica-Bold"
        )
        table_cell_style = ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#1E293B")
        )
        table_cell_bold = ParagraphStyle(
            'TableCellBold',
            parent=styles['Normal'],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#0F172A"),
            fontName="Helvetica-Bold"
        )
        badge_compliant = ParagraphStyle(
            'BadgeCompliant',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#065F46"),
            fontName="Helvetica-Bold"
        )
        badge_non_compliant = ParagraphStyle(
            'BadgeNonCompliant',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#991B1B"),
            fontName="Helvetica-Bold"
        )
        badge_needs_review = ParagraphStyle(
            'BadgeNeedsReview',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#92400E"),
            fontName="Helvetica-Bold"
        )

        story = []

        # --- Header ---
        story.append(Paragraph("GOVERNMENT e-MARKETPLACE (GeM)", subtitle_style))
        story.append(Paragraph("AI Bid Compliance Verification Report", header_title_style))
        story.append(Paragraph(f"Tender Bid Number: <b>{tender.get('bid_number')}</b> | Generated: {datetime.datetime.now().strftime('%d-%b-%Y %H:%M')}", subtitle_style))
        story.append(Spacer(1, 12))

        # --- Summary Box ---
        status = vendor_bid.get("overall_status", "EVALUATING")
        status_color = "#059669" if status == "COMPLIANT" else ("#DC2626" if status == "NON_COMPLIANT" else "#D97706")

        summary_data = [
            [
                Paragraph("<b>Vendor Name:</b>", table_cell_bold),
                Paragraph(vendor_bid.get("vendor_name", "N/A"), table_cell_style),
                Paragraph("<b>Overall AI Verdict:</b>", table_cell_bold),
                Paragraph(f"<font color='{status_color}'><b>{status}</b></font>", table_cell_bold)
            ],
            [
                Paragraph("<b>Tender Title:</b>", table_cell_bold),
                Paragraph(tender.get("title", "N/A"), table_cell_style),
                Paragraph("<b>Compliance Score:</b>", table_cell_bold),
                Paragraph(f"<b>{vendor_bid.get('compliance_score', 0):.1f}%</b>", table_cell_style)
            ],
            [
                Paragraph("<b>GSTIN:</b>", table_cell_bold),
                Paragraph(vendor_bid.get("vendor_gstin", "N/A"), table_cell_style),
                Paragraph("<b>Reqs Breakdown:</b>", table_cell_bold),
                Paragraph(
                    f"Compliant: <b>{vendor_bid.get('compliant_count', 0)}</b> | "
                    f"Deficient: <b>{vendor_bid.get('non_compliant_count', 0)}</b> | "
                    f"Review: <b>{vendor_bid.get('needs_verification_count', 0)}</b>",
                    table_cell_style
                )
            ]
        ]

        summary_table = Table(summary_data, colWidths=[90, 180, 100, 150])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 16))

        # --- Detailed Requirement Verdicts ---
        story.append(Paragraph("Detailed Compliance Audit by Requirement Clause", section_title_style))
        story.append(Spacer(1, 6))

        verdict_rows = [
            [
                Paragraph("<b>Clause & Title</b>", table_cell_bold),
                Paragraph("<b>Required vs Extracted</b>", table_cell_bold),
                Paragraph("<b>Status</b>", table_cell_bold),
                Paragraph("<b>Evidence Citation & Page</b>", table_cell_bold),
                Paragraph("<b>Reasoning / Override</b>", table_cell_bold)
            ]
        ]

        for v in verdicts:
            req = v.get("requirement", {})
            clause_title = f"<b>{req.get('clause_no', 'Req')}: {req.get('title', '')}</b>"
            
            v_status = v.get("officer_override_status") if v.get("is_overridden") else v.get("status", "NEEDS_VERIFICATION")
            if v_status == "COMPLIANT":
                status_p = Paragraph("COMPLIANT", badge_compliant)
            elif v_status == "NON_COMPLIANT":
                status_p = Paragraph("NON-COMPLIANT", badge_non_compliant)
            else:
                status_p = Paragraph("NEEDS REVIEW", badge_needs_review)

            req_vs_ext = (
                f"Req: <b>{v.get('required_value', req.get('threshold_value', 'Standard'))}</b><br/>"
                f"Found: <b>{v.get('extracted_value', 'N/A')}</b>"
            )

            citation = (
                f"<i>\"{v.get('evidence_snippet', 'No direct quote available')}\"</i><br/>"
                f"<b>Doc:</b> {v.get('document_name', 'N/A')} (p.{v.get('page_number', 1)})"
            )

            reason_str = v.get("reasoning", "")
            if v.get("is_overridden"):
                reason_str += f"<br/><font color='#7C3AED'><b>[Officer Override by {v.get('officer_name')}]:</b> {v.get('officer_comment')}</font>"

            verdict_rows.append([
                Paragraph(clause_title, table_cell_style),
                Paragraph(req_vs_ext, table_cell_style),
                status_p,
                Paragraph(citation, table_cell_style),
                Paragraph(reason_str, table_cell_style)
            ])

        verdict_table = Table(verdict_rows, colWidths=[110, 95, 75, 125, 115])
        verdict_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#94A3B8")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(verdict_table)
        story.append(Spacer(1, 16))

        # --- Officer Audit Sign-off ---
        story.append(Paragraph("Procurement Officer Audit Trail & Verification Stamp", section_title_style))
        story.append(Spacer(1, 4))
        audit_note = (
            "This report is generated by BidVerify AI (SIH26100) and represents an automated, explainable "
            "compliance audit. All findings are traceable to source documents. Manual officer overrides, if any, "
            "are digitally logged with reason and timestamp for administrative integrity."
        )
        story.append(Paragraph(audit_note, subtitle_style))

        doc.build(story)
        return output_path


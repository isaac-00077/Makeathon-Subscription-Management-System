import io
from decimal import Decimal
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.invoice import Invoice


class PDFService:
    @staticmethod
    def generate_invoice_pdf(invoice: Invoice) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        normal_style = styles["Normal"]
        
        title_style = ParagraphStyle(
            "InvoiceTitle",
            parent=styles["Heading1"],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=6
        )

        subtitle_style = ParagraphStyle(
            "InvoiceSubtitle",
            parent=normal_style,
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#64748b")
        )

        header_label_style = ParagraphStyle(
            "HeaderLabel",
            parent=normal_style,
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#475569")
        )

        elements = []

        # Company Header & Invoice #
        elements.append(Paragraph("<b>BRIGHTLOOP SOFTWARE</b>", title_style))
        elements.append(Paragraph("Cloud Subscription & Software Solutions | Billing Statement", subtitle_style))
        elements.append(Spacer(1, 12))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceAfter=15))

        # Invoice Meta Information (2 columns: Bill To vs Invoice Details)
        customer_name = invoice.customer.full_name if invoice.customer else f"Customer #{invoice.customer_id}"
        customer_email = invoice.customer.email if invoice.customer else "N/A"
        customer_company = getattr(invoice.customer, "company_name", "") or ""

        bill_to_text = f"<b>BILL TO:</b><br/>{customer_name}<br/>{customer_email}"
        if customer_company:
            bill_to_text += f"<br/>{customer_company}"

        status_display = invoice.status.value.upper()
        meta_text = (
            f"<b>Invoice #:</b> {invoice.invoice_number}<br/>"
            f"<b>Issue Date:</b> {invoice.issue_date.strftime('%d %b %Y')}<br/>"
            f"<b>Due Date:</b> {invoice.due_date.strftime('%d %b %Y')}<br/>"
            f"<b>Status:</b> <b>{status_display}</b>"
        )

        meta_table = Table(
            [[Paragraph(bill_to_text, header_label_style), Paragraph(meta_text, header_label_style)]],
            colWidths=[270, 270]
        )
        meta_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("PADDING", (0, 0), (-1, -1), 8),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 15))

        # Line Items Table
        items_data = [
            ["Description", "Qty", "Unit Price", "Tax", "Discount", "Total"]
        ]

        for item in invoice.items:
            items_data.append([
                Paragraph(item.description, normal_style),
                str(item.quantity),
                f"₹{item.unit_price:.2f}",
                f"₹{item.tax_amount:.2f}",
                f"₹{item.discount_amount:.2f}",
                f"₹{item.total_price:.2f}"
            ])

        items_table = Table(items_data, colWidths=[200, 45, 75, 70, 70, 80])
        items_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 15))

        # Totals Summary
        totals_data = [
            ["Subtotal:", f"₹{invoice.subtotal:.2f}"],
            ["Discount:", f"-₹{invoice.discount_amount:.2f}"],
            ["Taxes:", f"+₹{invoice.tax_amount:.2f}"],
            ["Grand Total:", f"₹{invoice.grand_total:.2f}"],
            ["Amount Paid:", f"₹{invoice.amount_paid:.2f}"],
            ["Balance Due:", f"₹{invoice.balance:.2f}"],
        ]

        totals_table = Table(totals_data, colWidths=[120, 100], hAlign="RIGHT")
        totals_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
            ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"),
            ("FONTNAME", (0, 5), (-1, 5), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 5), (-1, 5), colors.HexColor("#dc2626") if invoice.balance > 0 else colors.HexColor("#16a34a")),
            ("LINEABOVE", (0, 3), (-1, 3), 1, colors.HexColor("#cbd5e1")),
            ("LINEABOVE", (0, 5), (-1, 5), 1, colors.HexColor("#cbd5e1")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(totals_table)
        elements.append(Spacer(1, 20))

        # Notes and footer
        if invoice.notes:
            elements.append(Paragraph(f"<b>Notes:</b> {invoice.notes}", normal_style))
            elements.append(Spacer(1, 10))

        footer_text = "Thank you for partnering with Brightloop Software. For payment inquiries, contact billing@brightloop.com."
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceBefore=10, spaceAfter=8))
        elements.append(Paragraph(footer_text, subtitle_style))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

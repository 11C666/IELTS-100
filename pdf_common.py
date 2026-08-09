from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, HRFlowable

font_path = Path(r"C:\Windows\Fonts\msyh.ttc")
pdfmetrics.registerFont(TTFont("CJK", str(font_path), subfontIndex=0))
FONT = "CJK"
latin_path = Path(r"C:\Windows\Fonts\arial.ttf")
pdfmetrics.registerFont(TTFont("Latin", str(latin_path)))
LATIN = "Latin"

NAVY = colors.HexColor("#17324D")
BLUE = colors.HexColor("#2A6F97")
TEAL = colors.HexColor("#2A9D8F")
PALE = colors.HexColor("#EDF6F9")
GOLD = colors.HexColor("#E9C46A")
INK = colors.HexColor("#23303B")
MUTED = colors.HexColor("#60717F")
RULE = colors.HexColor("#CBD8E2")

styles = getSampleStyleSheet()
def ps(name, parent="Normal", **kw):
    color = kw.pop("textColor", INK)
    return ParagraphStyle(name, parent=styles[parent], fontName=FONT, textColor=color,
                          leading=kw.pop("leading", 15), **kw)
S = {
    "title": ps("title", fontSize=24, leading=31, alignment=TA_CENTER, textColor=NAVY, spaceAfter=10),
    "subtitle": ps("subtitle", fontSize=10.5, leading=16, alignment=TA_CENTER, textColor=MUTED),
    "h1": ps("h1", fontSize=18, leading=24, textColor=NAVY, spaceBefore=8, spaceAfter=10),
    "h2": ps("h2", fontSize=13.5, leading=19, textColor=BLUE, spaceBefore=8, spaceAfter=6),
    "h3": ps("h3", fontSize=11.2, leading=16, textColor=TEAL, spaceBefore=5, spaceAfter=4),
    "body": ps("body", fontSize=9.4, leading=14.5, spaceAfter=6),
    "small": ps("small", fontSize=8.2, leading=12.5, textColor=MUTED, spaceAfter=4),
    "question": ps("question", fontSize=10, leading=15, textColor=NAVY, spaceBefore=5, spaceAfter=4),
    "callout": ps("callout", fontSize=9.2, leading=14, borderColor=TEAL, borderWidth=1,
                  borderPadding=8, backColor=PALE, spaceBefore=5, spaceAfter=8),
    "vocab": ps("vocab", fontSize=9, leading=14, borderColor=RULE, borderWidth=0.5,
                borderPadding=8, backColor=colors.HexColor("#FAFCFD"), spaceAfter=7),
}
def P(text, style="body"):
    return Paragraph(text, S[style])

def footer(canvas, doc):
    canvas.saveState(); w, _ = A4
    canvas.setStrokeColor(RULE); canvas.line(18*mm, 14*mm, w-18*mm, 14*mm)
    canvas.setFont(FONT, 7.5); canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 9*mm, "IELTS Daily Practice · Day 2 · Saudi date 2026-08-09")
    canvas.drawRightString(w-18*mm, 9*mm, f"Page {doc.page}"); canvas.restoreState()

class Doc(BaseDocTemplate):
    def __init__(self, path, **kw):
        super().__init__(str(path), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm,
                         topMargin=18*mm, bottomMargin=19*mm, **kw)
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="main")
        self.addPageTemplates(PageTemplate(id="standard", frames=[frame], onPage=footer))

def cover(title, kicker, details):
    return [Spacer(1, 30*mm), P(kicker.upper(), "subtitle"), Spacer(1, 5*mm),
            P(title, "title"), HRFlowable(width="35%", thickness=2, color=GOLD,
            spaceBefore=8, spaceAfter=15), P(details, "subtitle"), Spacer(1, 18*mm),
            P("原创模拟 · 依据IELTS官方公开题型与格式设计", "callout"),
            Spacer(1, 48*mm), P("Prepared for focused daily practice", "subtitle"), PageBreak()]

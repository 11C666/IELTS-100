from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Spacer, Table, TableStyle, KeepTogether
import make_day1_pdfs as m

OUT = Path(__file__).resolve().parent / "output" / "pdf" / "Reading"
OUT.mkdir(parents=True, exist_ok=True)

def footer2(canvas, doc):
    canvas.saveState(); w, _ = A4
    canvas.setStrokeColor(m.RULE); canvas.line(18*mm, 14*mm, w-18*mm, 14*mm)
    canvas.setFont(m.FONT, 7.5); canvas.setFillColor(m.MUTED)
    canvas.drawString(18*mm, 9*mm, "IELTS Daily Practice · Day 2 · Saudi date 2026-08-07")
    canvas.drawRightString(w-18*mm, 9*mm, f"Page {doc.page}"); canvas.restoreState()
m.footer = footer2

PASSAGE = [
("A", "For centuries, historians reconstructed ancient trade mainly from surviving documents, coins and the remains of ports. These sources are valuable but incomplete. Written records often reflect the priorities of governments or wealthy merchants, while everyday transactions may never have been recorded. Shipwrecks offer a different kind of archive. A vessel that sank with its cargo can preserve a single commercial journey in remarkable detail, including objects that would normally have been reused, consumed or discarded."),
("B", "The first challenge is establishing whether a group of objects genuinely belongs to one wreck. Ocean currents can move light material, fishing equipment may disturb a site, and several vessels may sink in the same hazardous channel over hundreds of years. Archaeologists therefore map the precise position of every find before removal. Objects lying in a consistent pattern beneath a layer of sediment are more likely to form a single assemblage than items scattered across the seabed. Timber from the hull can also be dated, helping researchers distinguish the original cargo from later contamination."),
("C", "Cargo containers are particularly informative. Amphorae - ceramic jars used widely around the Mediterranean - carried wine, olive oil, fish sauce and other products. Their shapes changed over time and varied between manufacturing regions. Specialists compare the rim, handles and base of a jar with established typologies to estimate where and when it was made. Chemical analysis of residue inside a container may then reveal what it held. Neither method is perfect, but together they can connect a product with both a place of origin and an approximate date."),
("D", "For many years, researchers tended to count containers and assume that the most numerous type represented the ship's principal cargo. This approach remains useful, but it can be misleading. Large jars survive better than baskets, textiles and wooden boxes, which decay rapidly in seawater. A shipment dominated by grain or cloth might therefore leave fewer visible traces than a smaller quantity of wine stored in pottery. Modern studies increasingly account for this preservation bias when estimating the economic importance of different goods."),
("E", "The distribution of cargo within a vessel can also reveal how ancient crews managed risk. Heavy containers were commonly placed low in the hold to stabilise the ship, while fragile or valuable goods might be stored higher up or in protected compartments. In some wrecks, jars from different regions occur in separate clusters. This may indicate that they were loaded at successive ports, although it could also reflect an attempt to balance the vessel. Archaeologists must test several explanations rather than treating the first plausible pattern as proof of a particular route."),
("F", "Scientific techniques have expanded the range of questions that can be asked. Isotope analysis can sometimes identify the geological environment in which a plant or animal product developed. Ancient DNA may distinguish closely related species of fish or crops. Even pollen trapped in sealing material can provide clues about where a container was packed. Such evidence is strongest when multiple methods point to the same conclusion; an isolated laboratory result rarely justifies rewriting an entire trade map."),
("G", "Shipwreck evidence has challenged the traditional picture of commerce as a system controlled only by large states and major ports. Some vessels carried mixed loads in relatively small quantities, suggesting flexible networks of regional traders. A ship might transport local pottery on one stage of a voyage, collect agricultural products at another port, and finally deliver luxury goods to a distant market. These changing combinations imply that captains and merchants responded to opportunities rather than following a single fixed circuit."),
("H", "Nevertheless, a wreck records failure, not an average journey. Ships that reached their destinations left no equivalent deposit on the seabed, and vessels lost in storms may not represent normal routes or seasons. The locations investigated by archaeologists are also uneven: accessible coastal waters are studied more intensively than deep or politically restricted areas. Consequently, shipwrecks should be compared with harbour excavations, inscriptions and environmental data. Their greatest value lies not in replacing written history, but in exposing movements of ordinary goods that texts frequently ignored."),
]

def build():
    path = OUT / "IELTS_Day_002_Reading_2026-08-07.pdf"
    st = m.cover("Academic Reading · Part 2", "IELTS Daily Practice · Day 2",
                 "Shipwreck Cargo and the Reconstruction of Ancient Trade · 13 questions")
    st += [m.P("1 · Reading Passage", "h1"),
           m.P("Shipwreck Cargo and the Reconstruction of Ancient Trade", "h2"),
           m.P("Suggested time: 20 minutes. Complete all questions before checking the answer section.", "callout")]
    for label, text in PASSAGE:
        st += [m.P(label, "h3"), m.P(text, "body")]

    st += [PageBreak(), m.P("2 · Questions", "h1"),
           m.P("Questions 1-5 · Matching Headings", "h2"),
           m.P("Choose the correct heading for Sections B-F from the list below.", "small"),
           m.P("i. Evidence of flexible commercial behaviour<br/>ii. Identifying material from one disaster<br/>iii. Why the largest category may give a false impression<br/>iv. Locating the ship's final destination<br/>v. Combining form and chemistry to identify containers<br/>vi. The need for agreement between scientific tests<br/>vii. How the arrangement of goods may be interpreted<br/>viii. The disappearance of written commercial records", "callout")]
    for q in ["1. Section B", "2. Section C", "3. Section D", "4. Section E", "5. Section F"]:
        st.append(m.P(q, "question"))

    st += [m.P("Questions 6-9 · Matching Information", "h2"),
           m.P("Which section contains the following information? Write the correct letter A-H. You may use any letter more than once.", "small")]
    for q in [
        "6. a warning that archaeological coverage differs according to location",
        "7. an explanation of why some cargoes leave fewer remains",
        "8. examples of information that may survive in substances attached to containers",
        "9. a description of trade involving several changes of cargo"]:
        st.append(m.P(q, "question"))

    st += [m.P("Questions 10-13 · Sentence Completion", "h2"),
           m.P("Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.", "small"),
           m.P("10. Archaeologists record each object's exact location before it is ________.<br/>"
               "11. Wood from the ship may help separate the original goods from later ________.<br/>"
               "12. Heavy jars were generally positioned low in the hold to ________ the ship.<br/>"
               "13. The author recommends comparing wrecks with inscriptions and ________.", "callout")]

    answers = [("1","ii"),("2","v"),("3","iii"),("4","vii"),("5","vi"),
               ("6","H"),("7","D"),("8","F"),("9","G"),("10","removal"),
        ("11","contamination"),("12","stabilise"),("13","environmental data")]
    st += [PageBreak(), m.P("3 · Answer Key", "h1")]
    table = Table(answers, colWidths=[22*mm, 60*mm])
    table.setStyle(TableStyle([("FONTNAME",(0,0),(-1,-1),m.FONT),("FONTSIZE",(0,0),(-1,-1),9),
                               ("GRID",(0,0),(-1,-1),0.4,m.RULE),("BACKGROUND",(0,0),(0,-1),m.PALE),
                               ("PADDING",(0,0),(-1,-1),5)]))
    st += [table, Spacer(1,5*mm), m.P("4 · Detailed Explanations", "h1")]
    explanations = [
        ("1 · ii", "定位B段。整段先说明海流、捕鱼和多次沉船会混杂材料，再介绍精确测绘与木材测年，主旨是确认哪些物品属于同一次事故。易错：不要只抓到dating就选时间相关标题。"),
        ("2 · v", "定位C段。器形typologies用于判断产地和年代，residue的化学分析用于判断内容物；两种方法结合，对应form and chemistry。"),
        ("3 · iii", "定位D段。数量最多的陶罐可能只是保存得更好，篮子、纺织物和木箱会腐烂，因此最大类别可能造成错误印象。"),
        ("4 · vii", "定位E段。货物位置可能反映装船港口顺序，也可能用于船体平衡，核心是如何解释货物排列。"),
        ("5 · vi", "定位F段。最后一句强调multiple methods point to the same conclusion，孤立结果不足以改写贸易图景。"),
        ("6 · H", "定位H段accessible coastal waters与deep or politically restricted areas的对比，说明不同地点的研究覆盖不均。"),
        ("7 · D", "定位D段。grain或cloth因容器易腐而留下较少visible traces。题干fewer remains替换fewer visible traces。"),
        ("8 · F", "定位F段。sealing material中的pollen可说明容器在哪里包装；同段还提到isotope与DNA。"),
        ("9 · G", "定位G段。船只可先运本地陶器，再收农产品，最后运奢侈品，体现多阶段更换货物。"),
        ("10 · removal", "定位B段map the precise position of every find before removal。题干exact location替换precise position。答案必须使用原文名词。"),
        ("11 · contamination", "定位B段distinguish the original cargo from later contamination。separate...from对应distinguish...from。"),
        ("12 · stabilise", "定位E段Heavy containers were commonly placed low in the hold to stabilise the ship。题干Heavy jars替换Heavy containers，其余结构对应。"),
        ("13 · environmental data", "定位H段compare with harbour excavations, inscriptions and environmental data。符合两词限制。")]
    for h, b in explanations:
        st += [m.P(h, "h3"), m.P(b, "body")]

    st += [KeepTogether([m.P("Sources & Material Status", "h2"),
                         m.P("Official format references: IELTS Academic Reading test format and IELTS Academic sample test questions, accessed 2026-08-07. This passage and all questions are original simulation material; official sources were used only to calibrate task types and difficulty.", "small")]),
           PageBreak(), m.P("5 · Key Vocabulary｜重点词汇", "h1"),
           m.P("All words below appear in today's passage.", "small")]
    vocab = [
        ("reconstruct", "/ˌriːkənˈstrʌkt/", "重建；还原"),
        ("assemblage", "/əˈsemblɪdʒ/", "组合物；成套遗存"),
        ("residue", "/ˈrezɪdjuː/", "残留物"),
        ("approximate", "/əˈprɒksɪmət/", "大约的；近似的"),
        ("preservation", "/ˌprezəˈveɪʃən/", "保存；保护"),
        ("plausible", "/ˈplɔːzəbəl/", "看似合理的"),
        ("isotope", "/ˈaɪsətəʊp/", "同位素"),
        ("equivalent", "/ɪˈkwɪvələnt/", "对应物；等同的")]
    for term, ipa, zh in vocab:
        st.append(m.P(f"<b>{term}</b> <font name='{m.LATIN}' color='#60717F'>{ipa}</font><br/>{zh}", "vocab"))
    m.Doc(path, title="IELTS Day 2 Reading").build(st)
    return path

if __name__ == "__main__":
    print(build())

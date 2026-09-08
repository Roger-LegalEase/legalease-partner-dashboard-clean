"""Readable, complete guide layouts for author review only; not a new court form.
The actual family Markdown remains authoritative input. All text and source URLs
are retained; wrapping and page breaks are measured through complete page images.
"""
from pathlib import Path
import hashlib,json,re,html
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib.enums import TA_LEFT
import fitz
ROOT=Path(__file__).resolve().parents[3]
E=ROOT/'data/rcap-grade-a/chat-parallel-2026-09-07/chat9-build/mi-correction-20260907'
OUT=E/'guide-review';OUT.mkdir(exist_ok=True)
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='GuideBody',fontName='Helvetica',fontSize=10,leading=13,spaceAfter=8,splitLongWords=True,allowWidows=0,allowOrphans=0))
styles.add(ParagraphStyle(name='GuideSource',fontName='Helvetica',fontSize=9,leading=11,spaceAfter=6,splitLongWords=True))
styles.add(ParagraphStyle(name='GuideTitle',fontName='Helvetica-Bold',fontSize=16,leading=19,spaceAfter=13))
styles.add(ParagraphStyle(name='GuideHeading',fontName='Helvetica-Bold',fontSize=11,leading=14,spaceBefore=9,spaceAfter=6,keepWithNext=True))
sha=lambda b:hashlib.sha256(b).hexdigest()
def inline(t):
 t=html.escape(t);return re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',t)
def footer(c,d):
 c.setFont('Helvetica',8);c.drawString(42,24,'Synthetic guide layout for author review. Not proof of filing, service or judicial action.');c.drawRightString(570,24,str(d.page))
allpages=[];unique={};guides=[]
for stem in ['mi-setaside-application-set','mi-setaside-first-owi-set']:
 folder=ROOT/f'data/rcap-all50/overlays/census-v1/mi/{stem}--official-pdf-fill'
 for md in sorted(folder.glob('*-next-steps.md')):
  text=md.read_text();story=[];sources=False
  for block in re.split(r'\n\s*\n',text.strip()):
   if block.startswith('# '):story.append(Paragraph(inline(block[2:]),styles['GuideTitle']))
   elif block.startswith('## '):
    sources=block.startswith('## Official sources')
    if sources:story.append(PageBreak())
    story.append(Paragraph(inline(block[3:]),styles['GuideHeading']))
   elif block.startswith('- '):
    for line in block.splitlines():story.append(Paragraph(inline(line[2:]),styles['GuideBody'],bulletText='•'))
   else:story.append(Paragraph(inline(block).replace('\n','<br/>'),styles['GuideSource' if sources else 'GuideBody']))
  name=stem+'--'+md.stem;pdf=OUT/(name+'.pdf')
  SimpleDocTemplate(str(pdf),pagesize=(612,792),rightMargin=42,leftMargin=42,topMargin=40,bottomMargin=42,invariant=1,title='Synthetic Michigan participant guide review',author='').build(story,onFirstPage=footer,onLaterPages=footer)
  d=fitz.open(pdf);guide={'source':str(md.relative_to(ROOT)),'sourceSha256':sha(md.read_bytes()),'reviewPdf':str(pdf.relative_to(ROOT)),'sha256':sha(pdf.read_bytes()),'pages':[]}
  for n,p in enumerate(d):
   pix=p.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False);h=sha(pix.samples);png=OUT/(h[:20]+'.png')
   if h not in unique:pix.save(png);unique[h]={'png':str(png.relative_to(ROOT)),'pixelSha256':h,'pngSha256':sha(png.read_bytes()),'aliases':[]}
   unique[h]['aliases'].append({'guide':name,'page':n+1});guide['pages'].append(h)
   # Every text span must remain inside the full visible page margins.
   for b in p.get_text('dict')['blocks']:
    for l in b.get('lines',[]):
     for s in l['spans']:
      r=fitz.Rect(s['bbox']);assert r.x0>=35 and r.x1<=578 and r.y0>=25 and r.y1<=776,(name,n+1,s)
  guides.append(guide)
(OUT/'index.json').write_text(json.dumps({'authorQAOnly':True,'guides':guides,'uniquePages':list(unique.values()),'pageInstances':sum(len(g['pages'])for g in guides)},indent=2)+'\n')
print(json.dumps({'guides':len(guides),'pages':sum(len(g['pages'])for g in guides),'uniquePages':len(unique)}))

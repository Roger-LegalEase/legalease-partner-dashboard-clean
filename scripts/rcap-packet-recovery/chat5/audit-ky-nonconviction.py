#!/usr/bin/env python3
"""Actual complete Kentucky PDF author QA. No independent/raster admission writes."""
import argparse,hashlib,json,pathlib,re,tempfile
import fitz,numpy as np
OUT='data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill'
SRC='reference/chat-parallel-2026-09-07/chat5'
def h(b):return hashlib.sha256(b).hexdigest()
def rect(r):return fitz.Rect(r['x'],792-r['y']-r['height'],r['x']+r['width'],792-r['y'])
def norm(s):return re.sub(r'\s+','',s)
def px(p,annots=True):
 b=p.get_pixmap(matrix=fitz.Matrix(2,2),colorspace=fitz.csGRAY,alpha=False,annots=annots);return np.frombuffer(b.samples,dtype=np.uint8).reshape(b.height,b.width)
def chars(p):return [{'char':chr(c[0]),'bbox':fitz.Rect(c[3])} for s in p.get_texttrace() if s['font']=='Helvetica' for c in s['chars']]
def audit(root,p,report,censuses,sources):
 d=fitz.open(p);errors=[];written=[];boxes=[];protections=[]
 if len(d)!=report['output']['pageCount']:errors.append('complete page count mismatch')
 for comp in report['componentPages']:
  sid=comp['documentId']
  if sid not in sources:continue
  for local in range(comp['pageCount']):
   n=comp['firstPage']-1+local
   if n>=len(d):errors.append('missing official component page');continue
   page=d[n];text=chars(page);allwrites=[w for w in report['writes']if w['documentId']==sid]
   allowed=[]
   for w in allwrites:
    for wi in w['widgets']:
     if wi['page']!=local+1:continue
     r=rect(wi['rect']);allowed.append(r)
     if w['kind']=='held_text':
      ts=[c for c in text if r.contains(fitz.Point((c['bbox'].x0+c['bbox'].x1)/2,(c['bbox'].y0+c['bbox'].y1)/2))]
      actual=''.join(c['char']for c in ts);good=norm(actual)==norm(w['value'])
      written.append({'document':sid,'page':local+1,'field':w['field'],'expected':w['value'],'actual':actual,'pass':good})
      if not good:errors.append('glyph mismatch '+sid+' '+w['field'])
   outside=[c for c in text if c['char'].strip()and not any((r+(-.6,-.6,.6,.6)).contains(c['bbox'])for r in allowed)]
   if outside:errors.append('glyph outside write rectangle '+sid+' p'+str(local+1)+' '+str(len(outside)))
   src=px(sources[sid][local]);out=px(page)
   # Unwritten multiline widgets in the held order mask the issuer's five
   # printed rule lines. Flattening exposes those native static lines; they
   # are not execution ink. Compare protected areas to the static source.
   static_source=px(sources[sid][local],annots=False)
   selections={w['field']for w in allwrites if w['kind']=='explicit_selection'}
   for field in censuses[sid]:
    if field['type']!='PDFCheckBox':continue
    for wi in field['widgets']:
     if wi['page']!=local+1:continue
     r=rect(wi['rect']);a,b,c,e=[round(x*2)for x in r];added=int(((out[b:e,a:c]<100)&(src[b:e,a:c]>180)).sum())
     good=added>=8 if field['field']in selections else added==0
     boxes.append({'document':sid,'page':local+1,'field':field['field'],'selected':field['field']in selections,'addedDarkPixels':added,'pass':good})
     if not good:errors.append('visible checkbox mismatch '+sid+' '+field['field']+' '+str(added))
   # Executed signatures/certifications have no widgets in these sources.
   zones=[]
   if sid=='AOC-497.2' and local==1:zones=[('participant signature/date',fitz.Rect(40,142,570,179)),('notary/clerk execution',fitz.Rect(37,257,575,365)),('clerk certificate',fitz.Rect(37,617,575,758))]
   if sid=='AOC-497' and local==1:zones=[('judge execution',fitz.Rect(39,419,571,449)),('agency certification',fitz.Rect(47,517,562,629))]
   if sid=='AOC-497' and local==0:zones=[('other findings',fitz.Rect(61.7482,681.04,564.629,766.442))]
   for name,r in zones:
    a,b,c,e=[round(x*2)for x in r];added=int(((out[b:e,a:c]<90)&(static_source[b:e,a:c]>200)).sum());protections.append({'document':sid,'page':local+1,'region':name,'addedDarkPixels':added})
    if added:errors.append('protected ink '+sid+' '+name+' '+str(added))
 for i,page in enumerate(d):
  if list(page.widgets()or[]):errors.append('interactive widgets remain')
  if list(page.annots()or[]):errors.append('unexpected annotation')
  for s in page.get_texttrace():
   for c in s['chars']:
    if chr(c[0]).strip()and not(page.rect+(-.5,-.5,.5,.5)).contains(fitz.Rect(c[3])):errors.append('glyph outside complete page '+str(i+1));break
 # The actual filed attachment must contain every known charge, not merely a reference.
 factspath=root/OUT/'fixtures'/f"{report['fixture']}.facts.json"
 f=json.loads(factspath.read_text());schedule=''.join(d[i].get_text()for c in report['componentPages']if c['documentId']=='charge-agency-schedule'for i in range(c['firstPage']-1,min(c['firstPage']-1+c['pageCount'],len(d))))
 for charge in f['charges']:
  if norm(charge['description'])not in norm(schedule):errors.append('charge omitted from actual filing attachment '+charge['count'])
 for agency in f['agencies']:
  for key in ['name','address']:
   if agency.get(key)and norm(agency[key])not in norm(schedule):errors.append('agency data omitted from actual attachment')
 return {'fixture':report['fixture'],'sha256':h(p.read_bytes()),'pageCount':len(d),'actualTextWrites':written,'visibleCheckboxes':boxes,'protectedRegions':protections,'errors':errors,'passed':not errors}
def main():
 a=argparse.ArgumentParser();a.add_argument('--root',default='.');a.add_argument('--evidence',required=True);o=a.parse_args();root=pathlib.Path(o.root).resolve();dest=pathlib.Path(o.evidence);dest.mkdir(parents=True,exist_ok=True);pd=dest/'pages';pd.mkdir(exist_ok=True)
 index=json.loads((root/OUT/'reports/rendered-artifacts.json').read_text());censuses=json.loads((root/OUT/'official-field-census.json').read_text());sources={i:fitz.open(root/SRC/(i+'.pdf'))for i in censuses};measured=[];pages=[];seen={}
 for rec in index['pdfs']:
  p=root/rec['file'];assert h(p.read_bytes())==rec['sha256'];r=json.loads((root/OUT/'reports'/f"{rec['fixture']}.json").read_text());measured.append(audit(root,p,r,censuses,sources));d=fitz.open(p)
  for i,page in enumerate(d):
   png=page.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).tobytes('png');digest=h(png);name=rec['fixture'].replace('/','--')+f'-p{i+1:02d}.png'
   if digest not in seen:(pd/name).write_bytes(png);seen[digest]=name
   pages.append({'fixture':rec['fixture'],'page':i+1,'pngSha256':digest,'pixelEquivalentRepresentative':seen[digest]})
 negative=[];p=root/OUT/'fixtures/selectable/no_indictment-with-order.pdf';r=json.loads((root/OUT/'reports/selectable/no_indictment-with-order.json').read_text())
 with tempfile.TemporaryDirectory(prefix='ky-defect-')as tmp:
  for name in ['missing_petition_page','signature_ink','judge_ink','clerk_service_ink','false_selection','missing_charge_attachment']:
   d=fitz.open(p)
   if name=='missing_petition_page':d.delete_page(1)
   elif name=='signature_ink':d[1].insert_text((325,160),'SIGNED',fontsize=10)
   elif name=='judge_ink':d[4].insert_text((330,438),'GRANTED',fontsize=10)
   elif name=='clerk_service_ink':d[1].insert_text((300,700),'MAILED TODAY',fontsize=10)
   elif name=='false_selection':d[0].draw_line((40,444),(46,451),color=(0,0,0),width=2)
   elif name=='missing_charge_attachment':d[2].add_redact_annot(fitz.Rect(40,120,574,175),fill=(1,1,1));d[2].apply_redactions()
   target=pathlib.Path(tmp)/(name+'.pdf');d.save(target);m=audit(root,target,r,censuses,sources);negative.append({'name':name,'detected':bool(m['errors']),'errors':m['errors']})
 result={'familyId':'ky_nonconviction_expungement-set','kind':'AUTHOR_QA_NOT_INDEPENDENT_REVIEW','pdfs':len(measured),'pages':len(pages),'distinctFullPageImages':len(seen),'measurements':measured,'completeOutputDefectControls':negative,'passed':all(x['passed']for x in measured)and all(x['detected']for x in negative)}
 (dest/'byte-audit.json').write_text(json.dumps(result,indent=2)+'\n');(dest/'page-inventory.json').write_text(json.dumps(pages,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items()if k!='measurements'}|{'measurementErrors':[{x['fixture']:x['errors']}for x in measured if x['errors']]},indent=2));raise SystemExit(0 if result['passed']else 1)
if __name__=='__main__':main()

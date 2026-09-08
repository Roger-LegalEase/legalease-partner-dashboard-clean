#!/usr/bin/env python3
"""Read every complete Form3 or Form4 output using its own measured source map."""
import argparse,hashlib,json,subprocess,tempfile,copy
from pathlib import Path
from collections import Counter
import fitz
import numpy as np

def sha(b):return hashlib.sha256(b).hexdigest()
def box(w):
 r=w['rect'];return fitz.Rect(r['x'],792-r['y']-r['height'],r['x']+r['width'],792-r['y'])
def chars(p):return [c for b in p.get_text('rawdict')['blocks'] for l in b.get('lines',[]) for s in l['spans'] for c in s['chars'] if c['c'].strip()]
def key(c):return(c['c'],*(round(v,2) for v in c['origin']))
def ink(p,r):
 x=p.get_pixmap(matrix=fitz.Matrix(3,3),clip=r,colorspace=fitz.csGRAY,alpha=False,annots=False)
 return np.frombuffer(x.samples,np.uint8).astype(int)
def validate(raw,report,src,number):
 d=fitz.open(stream=raw,filetype='pdf');expected=sum(c['pages'] for c in report['components'])
 assert len(d)==expected,'complete page count';assert all(not list(p.widgets() or []) for p in d),'unflattened fields'
 assert f'Form {number}' in d[0].get_text(),'wrong official form'
 alltext=' '.join(' '.join(p.get_text() for p in d).split())
 assert 'Sources and official assistance' in alltext,'missing instructions'
 assert 'Payment of court debt is not a precondition' in alltext,'missing debt distinction'
 assert 'SYNTHETIC EXAMPLE - DO NOT FILE' in alltext,'missing fixture disclaimer'
 if number==4:assert 'Item 1 is deliberately unchecked' in alltext,'manual subsection election missing'
 writes=[];blankproof=[];outside=0;added_count=0
 for i in range(2):
  original=Counter(key(c) for c in chars(src[i]) if c['bbox'][1]>=20)
  added=[]
  for c in chars(d[i]):
   if original[key(c)]:original[key(c)]-=1
   else:added.append(c)
  assert not any(original.values()),'official body characters dropped or moved'
  added_count+=len(added)
  allowed=[box(w)+(-.65,-.65,.65,.65) for r in report['actualWrites'] if r['type'] in ('PDFTextField','printed_text') for w in r['widgets'] if w['page']==i+1]
  for c in added:
   r=fitz.Rect(c['bbox']);x,y=c['origin']
   # Source glyph metrics can extend above a widget; baseline and horizontal
   # extent remain in it. Full visual raster is still a separate obligation.
   if not any(b.x0<=r.x0 and r.x1<=b.x1 and b.y0<=y<=b.y1 for b in allowed):outside+=1
  for row in report['actualWrites']:
   for w in row['widgets']:
    if w['page']!=i+1:continue
    b=box(w)
    if row['type'] in ('PDFTextField','printed_text'):
     content=''.join(c['c'] for c in added if b.x0-.65<=c['origin'][0]<=b.x1+.65 and b.y0-.65<=c['origin'][1]<=b.y1+.65)
     assert content==''.join(str(row['value']).split()),(row['fieldId'],content,row['value'])
     assert row['fit']['fontSize']>=8,'font floor'
     writes.append({'fieldId':row['fieldId'],'value':row['value'],'matched':True,'glyphs':len(content)})
    else:
     inner=b+(1.5,1.5,-1.5,-1.5);a=ink(src[i],inner);z=ink(d[i],inner);assert a.shape==z.shape
     count=int(np.count_nonzero((z<90)&(a-z>50)));assert count>0,'missing selection ink'
     writes.append({'fieldId':row['fieldId'],'value':row['value'],'addedDarkPixels':count,'dpi':216})
  for row in report['blanks']:
   if row['type']=='PDFButton':continue
   for w in row['widgets']:
    if w['page']!=i+1:continue
    inner=box(w)+(1,1,-1,-1);a=ink(src[i],inner);z=ink(d[i],inner);assert a.shape==z.shape
    count=int(np.count_nonzero((z<90)&(a-z>50)));assert count==0,(row['fieldId'],'unexpected blank ink',count)
    blankproof.append({'fieldId':row['fieldId'],'page':i+1,'addedDarkPixels':count,'dpi':216,'disposition':row['completenessDisposition']})
 assert outside==0,('glyphs outside measured areas',outside)
 for p in d:
  for b in p.get_text('dict')['blocks']:
   if 'lines' in b:assert (p.rect+(-.5,-.5,.5,.5)).contains(fitz.Rect(b['bbox'])),'text outside page'
 return {'sha256':sha(raw),'pages':len(d),'writes':writes,'blankInk':blankproof,'addedGlyphs':added_count,'outsideGlyphs':outside}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--form',type=int,choices=[3,4],required=True);ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[3]);ap.add_argument('--evidence',type=Path,required=True);ap.add_argument('--family-dir',type=Path);ap.add_argument('--measure-only',action='store_true');a=ap.parse_args()
 fid=f'ia-1234{6 if a.form==3 else 7}-set';out=a.root/'data/rcap-all50/overlays/census-v1/ia'/f'{fid}--official-pdf-fill';out=a.family_dir or out;sourcepath=a.root/f'reference/chat-parallel-2026-09-07/chat8/ia-rule-2-86-form-{a.form}-2024-08.pdf';src=fitz.open(sourcepath)
 e=a.evidence;e.mkdir(parents=True,exist_ok=True);(e/'pages').mkdir(exist_ok=True);(e/'poppler').mkdir(exist_ok=True)
 rows=[];images=[];seen={}
 for entry in json.loads((out/'reports/rendered-artifacts.json').read_text())['packets']:
  fixture=entry['fixture'];p=out/entry['relativePath'];raw=p.read_bytes();assert sha(raw)==entry['sha256'];r=json.loads((out/f'reports/{fixture}.json').read_text());result=validate(raw,r,src,a.form)
  d=fitz.open(p)
  for i,page in ([] if a.measure_only else enumerate(d)):
   b=page.get_pixmap(matrix=fitz.Matrix(1.75,1.75)).tobytes('png');h=sha(b);n=f'pages/{fixture}-{i+1:02}.png';(e/n).write_bytes(b);images.append({'fixture':fixture,'page':i+1,'file':n,'sha256':h,'identicalTo':seen.get(h)});seen.setdefault(h,n)
  t=subprocess.run(['pdftotext','-layout',str(p),'-'],capture_output=True,text=True);assert t.returncode==0;assert r['assessment']['facts']['name'] in t.stdout
  z=None
  if not a.measure_only:
   z=subprocess.run(['pdftoppm','-r','96','-png',str(p),str(e/'poppler'/fixture)],capture_output=True,text=True);assert z.returncode==0,z.stderr
  result.update(fixture=fixture,popplerTextExit=t.returncode,popplerRasterExit=z.returncode if z else None);rows.append(result)
 if a.measure_only:
  result={'familyId':fid,'sourceSha256':sha(sourcepath.read_bytes()),'sourcePages':2,'actualCompletePages':sum(r['pages'] for r in rows),'fixtures':rows,'mode':'read-only-complete-PDF-measurement','authorQAOnly':True}
  (e/'pdf-verification.json').write_text(json.dumps(result,indent=2)+'\n');return
 # Corrupt real complete PDFs in memory; never overwrite original artifacts.
 r=json.loads((out/'reports/canonical.json').read_text());original=(out/'fixtures/canonical.pdf').read_bytes();controls=[]
 def reject(name,d):
  b=d.tobytes()
  try:validate(b,r,src,a.form)
  except (AssertionError,ValueError,RuntimeError) as err:controls.append({'name':name,'rejected':True,'error':str(err),'sha256':sha(b)})
  else:raise AssertionError('defective whole PDF accepted: '+name)
 d=fitz.open(stream=original,filetype='pdf');target=next(x for x in r['actualWrites'] if x['fieldId'].endswith('cap.03'));d[0].add_redact_annot(box(target['widgets'][0]),fill=(1,1,1));d[0].apply_redactions();reject('erase known defendant',d)
 d=fitz.open(stream=original,filetype='pdf');d[1].insert_text((320,207),'FORGED SIGNATURE',fontsize=10);reject('invent participant execution',d)
 d=fitz.open(stream=original,filetype='pdf');d[1].insert_text((367,643),'September',fontsize=9);reject('invent actual service date',d)
 d=fitz.open(stream=original,filetype='pdf');d.delete_page(len(d)-1);reject('omit final instructions page',d)
 d=fitz.open(stream=original,filetype='pdf');d[0].insert_text((555,400),'EXTRA',fontsize=9);reject('out of mapped area ink',d)
 if a.form==4:
  d=fitz.open(stream=original,filetype='pdf');d[0].draw_line((92,391),(98,397),width=1);reject('automate reserved item1',d)
 result={'familyId':fid,'sourceSha256':sha(sourcepath.read_bytes()),'sourcePages':2,'actualCompletePages':len(images),'distinctImages':len(seen),'fixtures':rows,'images':images,'negativeWholePdfControls':controls,'authorQAOnly':True,'independentReview':'PENDING_CHAT10','centralRaster':'PENDING_CHAT_A'}
 (e/'pdf-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'familyId':fid,'fixtures':len(rows),'pages':len(images),'distinctImages':len(seen),'negativeWholePdfControlsRejected':len(controls)}))
if __name__=='__main__':main()

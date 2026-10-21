#!/usr/bin/env python3
"""Full 072D candidate byte/pixel audit. Reuses existing owned source-byte audit.
Actual PDF mutants, no copied predicate, no OCR and no independent-approval claim.
"""
import argparse, hashlib, importlib.util, json, pathlib, tempfile
import fitz
from PIL import Image,ImageDraw
SPEC=importlib.util.spec_from_file_location('md_source_audit',pathlib.Path(__file__).with_name('audit-md-conviction.py'))
shared=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(shared)
OUT='data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill'
def main():
 p=argparse.ArgumentParser();p.add_argument('--root',default='.');p.add_argument('--out');p.add_argument('--evidence',required=True);a=p.parse_args();root=pathlib.Path(a.root).resolve();out=pathlib.Path(a.out) if a.out else root/OUT;e=pathlib.Path(a.evidence);e.mkdir(parents=True,exist_ok=True)
 census=json.loads((out/'official-field-census.json').read_text());receipt=json.loads((out/'source-receipt.json').read_text());sources={k:fitz.open(root/v['path']) for k,v in receipt['sourceCatalog'].items()}
 for k,v in receipt['sourceCatalog'].items():assert shared.digest((root/v['path']).read_bytes())==v['sha256']
 ix=json.loads((out/'reports/rendered-artifacts.json').read_text())['pdfs'];results=[];inventory=[];seen={};pages=e/'pages';pages.mkdir(exist_ok=True)
 for row in ix:
  pdf=out/'fixtures'/(row['fixture']+'.pdf');r=json.loads((out/'reports'/(row['fixture']+'.json')).read_text());assert shared.digest(pdf.read_bytes())==row['sha256'];m=shared.inspect(pdf,r,census,sources);m['fixture']=row['fixture'];results.append(m)
  for i,page in enumerate(fitz.open(pdf)):
   image=page.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).tobytes('png');h=shared.digest(image);name=row['fixture'].replace('/','--')+f'-p{i+1:02}.png'
   if h not in seen:(pages/name).write_bytes(image);seen[h]=name
   inventory.append({'fixture':row['fixture'],'page':i+1,'pngSha256':h,'representative':seen[h]})
 negatives=[]
 with tempfile.TemporaryDirectory() as td:
  for name in ['erase_name','signature','wrong_basis','missing_petition','wrong_page_order','missing_waiver_order','missing_notice','judicial_grant','paid_has_waiver','out_of_bounds','missing_predicate_disclosure']:
   fixture='selectable/possession-waiver' if name in ['wrong_page_order','missing_waiver_order','missing_notice','judicial_grant'] else 'diagnostic/missing-completion' if name=='missing_predicate_disclosure' else 'canonical'
   report=json.loads((out/'reports'/(fixture+'.json')).read_text());d=fitz.open(out/'fixtures'/(fixture+'.pdf'))
   if name=='erase_name':d[0].add_redact_annot(fitz.Rect(342,112,502,126),fill=(1,1,1));d[0].apply_redactions()
   elif name=='signature':d[0].insert_text((329,516),'SIGNED',fontsize=10)
   elif name=='wrong_basis':d[0].draw_line((66,381),(71,386),color=(0,0,0),width=2)
   elif name=='missing_petition':d.delete_page(0)
   elif name=='wrong_page_order':d.move_page(1,0)
   elif name=='missing_waiver_order':d.delete_page(3)
   elif name=='missing_notice':d.delete_page(4)
   elif name=='judicial_grant':d[3].insert_text((155,550),'GRANTED',fontsize=10)
   elif name=='paid_has_waiver':d.insert_pdf(sources['CC-DC-089'])
   elif name=='out_of_bounds':d[0].insert_text((4,12),'INVALID',fontsize=10)
   elif name=='missing_predicate_disclosure':
    removed=False
    for page in d:
     for rect in page.search_for('Actual sentence completion date'):
      page.add_redact_annot(rect,fill=(1,1,1));removed=True
     page.apply_redactions()
    assert removed
   f=pathlib.Path(td)/(name+'.pdf');d.save(f);m=shared.inspect(f,report,census,sources);negatives.append({'name':name,'detected':bool(m['errors']),'errors':m['errors'],'sha256':shared.digest(f.read_bytes())})
 # Two complete pages per review image, never cropped or thumbnail grids.
 pairs=e/'review-pairs';pairs.mkdir(exist_ok=True);names=list(seen.values())
 for j in range(0,len(names),2):
  ims=[Image.open(pages/n).convert('RGB') for n in names[j:j+2]];sheet=Image.new('RGB',(sum(i.width for i in ims),max(i.height for i in ims)+26),'white');dr=ImageDraw.Draw(sheet);x=0
  for n,im in zip(names[j:j+2],ims):sheet.paste(im,(x,26));dr.text((x+4,5),n,fill='black');x+=im.width
  sheet.save(pairs/f'pair-{j//2+1:02}.png')
 result={'familyId':'md_cannabis_petition-set','scope':'AUTHOR_SOURCE_BYTE_QA_ONLY','pdfs':len(results),'pages':len(inventory),'distinctPages':len(seen),'measurements':results,'negativeControls':negatives,'passed':all(m['passed'] for m in results) and all(n['detected'] for n in negatives)}
 (e/'byte-audit.json').write_text(json.dumps(result,indent=2)+'\n');(e/'page-inventory.json').write_text(json.dumps(inventory,indent=2)+'\n');print(json.dumps({'passed':result['passed'],'pdfs':len(results),'pages':len(inventory),'distinct':len(seen),'errors':{m['fixture']:m['errors'] for m in results if m['errors']},'negativeControls':negatives},indent=2));raise SystemExit(0 if result['passed'] else 1)
if __name__=='__main__':main()

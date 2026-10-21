#!/usr/bin/env python3
"""Verify and package only the owner-requested MS layout repair; grants no approval."""
import argparse, difflib, hashlib, html, json, pathlib, subprocess, tempfile, xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'data/rcap-grade-a/ms-misd-addl-layout-repair-20260914'
PDFROOT='data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading'
PRIOR='data/rcap-grade-a/artifact-rereview-20260914/ms-misd-addl-set'
BASE='d4bcf80dbecfd5e1c7e0f2939d4b3528b12cd215'
BUILDER='scripts/build-census-v1-ms-misd-addl-set.mjs'
DECISION='data/rcap-grade-a/legal-decisions/OWNER_ARTIFACT_REJECTION_MS_ADDITIONAL_MISDEMEANOR_2026-09-14.json'
PINS={'canonical':'3c7588be6f1734cab76c30035cb9eb404dc6e0d78eeb9e3971415ed2cedf1399','boundary':'e2b8cebcb089a20777cfb31bcd5b70340729690bf5232894e7e8adf81fcada36'}
NOTE="(The findings, the date of entry, the judge's signature and the prosecuting authority's approval as to form are all left blank.)"
def sha(b): return hashlib.sha256(b).hexdigest()
def read(p): return (ROOT/p).read_bytes()
def run(*a): return subprocess.check_output(a,cwd=ROOT)
def normalize(t): return ' '.join(t.split())
def verify_order(pages):
 assert len(pages)==7,'repair must remove the isolated note/trailer page'
 order=normalize(pages[2]); assert NOTE in order,'complete explanation must be on proposed-order page 3'
 assert order.index('JUDGE') < order.index('APPROVED AS TO FORM:') < order.index('Prosecuting authority') < order.index(NOTE) < order.index('Route:'),'signature/note/trailer association changed'
 assert 'The Court FINDS' in order and 'SO ORDERED AND ADJUDGED' in order
 assert NOTE not in normalize(' '.join(pages[:2]+pages[3:])),'explanation duplicated or orphaned'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--check',action='store_true');ap.add_argument('--render',action='store_true');args=ap.parse_args()
 assert not(args.check and args.render)
 OUT.mkdir(parents=True,exist_ok=True)
 source=run('git','rev-parse','HEAD').decode().strip()
 if args.check: source=json.loads((OUT/'package.json').read_text())['sourceSha']
 artifacts=[]; products={}; mutations=0
 parts=['<!doctype html><html lang="en"><meta charset="utf-8"><title>MS additional misdemeanor — repaired pair</title><style>body{font:16px system-ui;max-width:1500px;margin:24px auto;padding:16px}img{width:100%}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}code{overflow-wrap:anywhere}.note{background:#fff3cf;padding:16px}pre{white-space:pre-wrap}@media(max-width:700px){.pair{grid-template-columns:1fr}}</style><h1>Mississippi additional misdemeanor: layout-only repair</h1><p class="note">NEW PAIR — OWNER APPROVAL PENDING. Prior pair rejected. No inherited approval, runtime promotion, publication or Production authorization.</p><p>Only the proposed order uses 13pt leading instead of 14.5pt, with the same 11pt font and one-inch margins. All wording is preserved. The explanation is immediately below the prosecuting-authority signature block on page 3. Each packet is now seven pages.</p>']
 with tempfile.TemporaryDirectory(prefix='ms-layout-check-',dir='/tmp') as tmp:
  for fixture,oldhash in PINS.items():
   path=f'{PDFROOT}/fixtures/{fixture}.pdf'; pdf=ROOT/path
   old=read(f'{PRIOR}/reviewed-pdfs/{fixture}.pdf'); assert sha(old)==oldhash
   previous=pathlib.Path(tmp)/f'{fixture}.pdf'; previous.write_bytes(old)
   oldtext=run('pdftotext','-layout',str(previous),'-').decode()
   newtext=run('pdftotext','-layout',str(pdf),'-').decode()
   assert normalize(oldtext)==normalize(newtext),'wording, facts, route identifiers or protected blank text changed'
   pages=newtext.split('\f'); pages=pages[:-1] if not pages[-1].strip() else pages
   verify_order(pages)
   # Regression: an orphaned note and an altered judicial-ownership explanation must fail.
   for bad in [pages[:2]+[pages[2].replace(NOTE.split(',')[0],'REMOVED')]+pages[3:], pages[:3]+[NOTE]+pages[3:]]:
    try: verify_order(bad)
    except AssertionError: mutations+=1
    else: raise AssertionError('regression did not catch changed/orphaned explanation')
   bbox=ET.fromstring(run('pdftotext','-bbox',str(pdf),'-'))
   words=[e for e in bbox.iter() if e.tag.endswith('}word')]
   assert words and all(float(w.attrib['xMin'])>=0 and float(w.attrib['xMax'])<=612 and float(w.attrib['yMin'])>=0 and float(w.attrib['yMax'])<=792 for w in words),'text clipped beyond paper'
   priorbbox=ET.fromstring(run('pdftotext','-bbox',str(previous),'-'))
   priorwords=[e for e in priorbbox.iter() if e.tag.endswith('}word')]
   assert [(w.text,w.attrib['xMin'],w.attrib['xMax']) for w in words]==[(w.text,w.attrib['xMin'],w.attrib['xMax']) for w in priorwords],'horizontal layout or word sequence changed'
   dest=OUT/'images'/fixture;dest.mkdir(parents=True,exist_ok=True)
   if args.render: subprocess.run(['pdftoppm','-r','110','-png','-cropbox',str(pdf),str(dest/'page')],check=True,capture_output=True)
   images=[]
   for page in range(1,8):
    image=dest/f'page-{page}.png'; images.append({'page':page,'path':str(image.relative_to(ROOT)),'sha256':sha(image.read_bytes())})
   unchanged=[]
   for current,prior in [(1,1),(2,2),(4,5),(5,6),(6,7),(7,8)]:
    assert images[current-1]['sha256']==sha(read(f'{PRIOR}/images/{fixture}/current/page-{prior:02}.png')),f'{fixture}: non-order page changed'
    unchanged.append({'currentPage':current,'previousPage':prior,'identicalRaster':True})
   diff=''.join(difflib.unified_diff(oldtext.splitlines(True),newtext.splitlines(True),fromfile='rejected/'+fixture,tofile='repaired/'+fixture))
   products[f'{fixture}.text.diff']=diff.encode()
   artifacts.append({'fixture':fixture,'path':path,'sha256':sha(pdf.read_bytes()),'byteLength':pdf.stat().st_size,'pageCount':7,'rejectedSha256':oldhash,'rejectedSnapshotPath':f'{PRIOR}/reviewed-pdfs/{fixture}.pdf','normalizedTextIdentical':True,'noteOnSignaturePage':3,'unchangedOtherPages':unchanged,'images':images})
   parts+=['<h2>'+fixture.title()+'</h2><p><a href="../../../'+path+'">Open repaired PDF</a><br>SHA-256: <code>'+sha(pdf.read_bytes())+'</code></p><h3>Order comparison</h3><div class="pair"><figure><figcaption>Rejected: page 3 (note detached onto page 4)</figcaption><img src="../artifact-rereview-20260914/ms-misd-addl-set/images/'+fixture+'/current/page-03.png"></figure><figure><figcaption>Repaired: complete order and explanation on page 3</figcaption><a href="images/'+fixture+'/page-3.png"><img src="images/'+fixture+'/page-3.png"></a></figure></div><h3>Every repaired page</h3>']
   for i in images: parts+=['<figure><figcaption>Page '+str(i['page'])+'</figcaption><a href="images/'+fixture+'/page-'+str(i['page'])+'.png"><img loading="lazy" src="images/'+fixture+'/page-'+str(i['page'])+'.png"></a></figure>']
   parts+=['<details><summary>Exact text-layout diff (normalized words identical)</summary><pre>'+html.escape(diff)+'</pre></details>']
 receipt={'schemaVersion':'rcap-layout-only-rereview/v1','sourceSha':source,'familyId':'ms-misd-addl-set','status':'OWNER_RE_REVIEW_REQUIRED','approvalCreated':False,'ownerDecisionDate':'2026-09-14','rejectedPairsPreserved':True,'ownerLayoutDecision':{'path':DECISION,'sha256':sha(read(DECISION))},'builderPath':BUILDER,'builderSha256':sha(read(BUILDER)),'generatorPath':str(pathlib.Path(__file__).relative_to(ROOT)),'generatorSha256':sha(pathlib.Path(__file__).read_bytes()),'rasterCommand':'pdftoppm -r 110 -png -cropbox <exact PDF> <images/fixture/page>','rasterizer':subprocess.run(['pdftoppm','-v'],capture_output=True,text=True,check=True).stderr.splitlines()[0],'artifacts':artifacts,'checks':{'normalizedWordsIdenticalBothFixtures':True,'allNonOrderPagesIdenticalRaster':True,'wordsWithinPageBounds':True,'signatureAndExplanationSamePage':True,'orphanedOrAlteredNoteMutationsCaught':mutations},'limitations':['Local text/raster verification is not owner approval or central raster acceptance.','The exact repaired pair requires a new owner approval.'],'candidateFreezeBlocked':True,'finalSuccessorPublicationBlocked':True,'productionAuthorized':False}
 inspection=OUT/'independent-review.json'
 if inspection.exists(): receipt['independentReview']={'path':str(inspection.relative_to(ROOT)),'sha256':sha(inspection.read_bytes())}
 products['package.json']=(json.dumps(receipt,indent=2)+'\n').encode()
 products['review.html']='\n'.join(parts+['</html>']).encode()
 products['README.md']=('# Mississippi additional misdemeanor — repaired pair\n\n**Owner approval pending.** [Open every page and the order comparison](review.html).\n\n'+''.join(f"- {a['fixture']}: [{a['path']}](../../../{a['path']}) — `{a['sha256']}`; seven pages.\n" for a in artifacts)+'\nOnly the proposed-order leading changed (14.5pt to 13pt). Unchanged wording, font size, margins, facts, blanks and routes. Note now immediately follows the prosecuting-authority signature block on page 3. All other component pages render identically. No approval inherited.\n\n[Checks and exact evidence](package.json).\n').encode()
 for name,data in products.items():
  target=OUT/name
  if args.check: assert target.read_bytes()==data,f'{name} stale'
  else: target.write_bytes(data)
 print(f'Both fixtures: text/bounds/signature association PASS; 12 unchanged component-page rasters; {mutations}/4 negative controls caught; package '+('converges' if args.check else 'generated')+'; owner approval pending.')
if __name__=='__main__':main()

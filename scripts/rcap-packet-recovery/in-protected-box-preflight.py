import json,hashlib,pymupdf,numpy as np,sys
from pathlib import Path
base=Path('data/rcap-all50/overlays/census-v1/in/rcap-in-custom-pleading--custom-pleading')
source_path=Path('private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/IN/02_PACKET_FORMS/IN__FORM__CCA-SECTION1-PETITION-ORDER__coalition-for-court-access-section-1-non-conviction-expungement-petition-and-order-bundle__SOURCE-2021__EN.pdf')
raw=source_path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='b04f2941c91f903e8b8a1718ff4f9bd9120f3744c97354fd810c296f89d041c5'
source=pymupdf.open(source_path);report=json.load(open(base/'reports/rendered-artifacts.json'));controls_by_page={1:['Check Box1','Check Box2','Check Box3','Check Box4'],2:['Check Box6','Check Box7'],7:['Check Box13','Check Box14']}; source_controls=[]; results=[]
for page_number,names in controls_by_page.items():
 widgets={w.field_name:w for w in source[page_number-1].widgets() or []}
 for name in names:
  w=widgets[name];assert w.field_type_string=='CheckBox';source_controls.append((page_number,name,pymupdf.Rect(w.rect)+(-1,-1,1,1)))
for artifact in report['artifacts']:
 packet_path=Path(artifact['file']);binary=packet_path.read_bytes();assert hashlib.sha256(binary).hexdigest()==artifact['sha256'];packet=pymupdf.open(packet_path)
 mapping={r['sourcePage']:r['packetPage'] for r in artifact['pageManifest'] if r.get('sourceSha256')==hashlib.sha256(raw).hexdigest()}
 if not all(p in mapping for p in [1,2,7]):continue
 controls=[]
 for source_page,field_name,clip in source_controls:
  packet_page=mapping[source_page];a=source[source_page-1];b=packet[packet_page-1];matrix=pymupdf.Matrix(200/72,200/72)
  x=a.get_pixmap(matrix=matrix,clip=clip,colorspace=pymupdf.csGRAY,alpha=False,annots=False);y=b.get_pixmap(matrix=matrix,clip=clip,colorspace=pymupdf.csGRAY,alpha=False,annots=False);assert (x.width,x.height)==(y.width,y.height)
  u=np.frombuffer(x.samples,dtype=np.uint8).astype(int);v=np.frombuffer(y.samples,dtype=np.uint8).astype(int);added=int(np.count_nonzero(u-v>32));removed=int(np.count_nonzero(v-u>32));controls.append(dict(sourceField=field_name,sourcePage=source_page,packetPage=packet_page,rectangleTopLeft=list(clip),addedDarkPixels=added,removedDarkPixels=removed,passed=added==0 and removed==0))
 results.append(dict(path=str(packet_path),sha256=hashlib.sha256(binary).hexdigest(),byteLength=len(binary),controls=controls,passed=all(c['passed'] for c in controls)))
assert results
out={'sourcePath':str(source_path),'sourceSha256':hashlib.sha256(raw).hexdigest(),'method':'PyMuPDF in-memory grayscale at200dpi,32level directional threshold,annotations excluded,source rectangle padded1point','artifacts':results,'passed':all(r['passed'] for r in results),'finalAcceptance':False,'scope':'Only eight previously defective unselected widget regions; excludes substantive and independent original-page acceptance.'}
Path(sys.argv[1]).write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'passed':out['passed'],'artifacts':len(results),'controls':sum(len(r['controls']) for r in results),'failed':sum(not c['passed'] for r in results for c in r['controls'])}));sys.exit(0 if out['passed'] else 1)

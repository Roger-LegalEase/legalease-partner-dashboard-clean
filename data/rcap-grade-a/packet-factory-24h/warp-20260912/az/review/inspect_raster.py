#!/usr/bin/env python3
import json,zipfile,hashlib,sys,io,math
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path.cwd();OUT=ROOT/'data/rcap-grade-a/packet-factory-24h/warp-20260912/az/review'
def sha(b):return hashlib.sha256(b).hexdigest()
def binding(p):return {'path':str(p.relative_to(ROOT)),'sha256':sha(p.read_bytes()),'byteLength':p.stat().st_size}
run,family=sys.argv[1:3];r=ROOT/'data/rcap-grade-a/packet-factory-24h/raster-runs'/run
safe=family.replace(':','_');vpath=r/(safe+'.verdict.json');v=json.loads(vpath.read_text());zpath=r/(safe+'.zip');proof=r/'ORIGINAL_EVIDENCE_VERIFIED.json';pr=json.loads(proof.read_text());pf=next(x for x in pr['families'] if x['familyId']==family)
assert sha(zpath.read_bytes())==pf['archiveSha256'];assert v['verdict']=='RASTER_PASS';assert v['coversTheWholeFamily']
rows=[];sheets=[]
with zipfile.ZipFile(zpath) as z:
 verdict_bytes=z.read(safe+'.verdict.json');assert json.loads(verdict_bytes)==v
 for d in v['documentsRendered']:assert sha((ROOT/d['path']).read_bytes())==d['pinned']
 for row in v['measurements']:
  bs=z.read(row['png']);assert sha(bs)==row['pngSha256'];assert len(bs)==row['bytes'];im=Image.open(io.BytesIO(bs));paper=row['paper'];assert 0<=paper['x0']<=paper['x1']<im.width and 0<=paper['y0']<=paper['y1']<im.height;assert paper['width']==row['pngWidth'] and paper['height']==row['pngHeight'];row={**row,'actualEncodedPngWidth':im.width,'actualEncodedPngHeight':im.height}
  p=OUT/'originals'/run/row['png'];p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(bs);rows.append({**row,'extractedPath':str(p.relative_to(ROOT))})
 for start in range(0,len(rows),6):
  group=rows[start:start+6];canvas=Image.new('RGB',(1224,822*math.ceil(len(group)/2)),'#eeeeee');draw=ImageDraw.Draw(canvas)
  for i,row in enumerate(group):
   im=Image.open(ROOT/row['extractedPath']).convert('RGB');paper=row['paper'];im=im.crop((paper['x0'],paper['y0'],paper['x1']+1,paper['y1']+1));im.thumbnail((612,792));x=i%2*612;y=i//2*822;canvas.paste(im,(x,y+30));draw.text((x+8,y+7),f"{row.get('kind')} {row.get('document')} p{row['page']}",fill='black')
  p=OUT/(family.replace(':','_')+'-'+run+'-sheet-'+str(start//6+1)+'.png');canvas.save(p);sheets.append(binding(p))
record={'schemaVersion':'rcap-independent-original-raster-inspection/v1','familyId':family,'workflowRunId':run,'packetCommit':v['packetCommitSha'],'archive':binding(zpath),'verdict':binding(vpath),'captainOriginalCustodyProof':binding(proof),'currentPdfHashesMatch':True,'archiveDigestMatches':True,'embeddedVerdictMatches':True,'allPngHashesAndLengthsIndependentlyVerified':True,'encodedDimensionsMeasuredAndPaperBoundsVerified':True,'dimensionSemantics':'Native pngWidth/pngHeight are calibrated paper extents inside the original browser screenshot; encoded PNG dimensions independently recorded on every row. Contact sheets crop only to native paper bounds; originals remain byte-for-byte.','pages':rows,'sheetsPreparedForVisualReview':sheets,'visualReviewCompleted':False}
p=OUT/(family.replace(':','_')+'-'+run+'-original-raster-measurements.json');p.write_text(json.dumps(record,indent=2)+'\n');print(p);print('verified',len(rows),'PNG originals;',len(sheets),'sheets')

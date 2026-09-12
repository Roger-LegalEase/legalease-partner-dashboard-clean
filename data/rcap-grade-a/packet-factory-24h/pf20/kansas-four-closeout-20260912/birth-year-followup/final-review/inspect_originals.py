from pathlib import Path
import json,hashlib,zipfile,io,subprocess
from PIL import Image,ImageDraw
BASE=Path('data/rcap-grade-a/packet-factory-24h/pf20/kansas-four-closeout-20260912/birth-year-followup/final-review');RUN='34669691683';R=Path('data/rcap-grade-a/packet-factory-24h/raster-runs')/RUN;TMP=Path('/tmp/rcap-ks-final-34669691683');TMP.mkdir(exist_ok=True)
proof=json.loads((R/'ORIGINAL_EVIDENCE_VERIFIED.json').read_text());sem=json.loads((BASE.parent/'semantic-review/semantic-preflight.json').read_text());commit=proof['inputs']['commit_sha']
def bind(p):
 p=Path(p);b=p.read_bytes();return {'path':str(p),'sha256':hashlib.sha256(b).hexdigest(),'byteLength':len(b)}
assert proof['conclusion']=='success' and not proof['partialRunAdmission']
for rec in proof['families']:
 f=rec['familyId'];s=next(x for x in sem['rows'] if x['familyId']==f);zpath=R/(f+'.zip');vpath=R/(f+'.verdict.json');v=json.loads(vpath.read_text());z=zipfile.ZipFile(zpath)
 assert rec['verdict']=='RASTER_PASS' and v['verdict']=='RASTER_PASS' and v['packetCommitSha']==commit and v['coversTheWholeFamily'] is True
 assert bind(zpath)['sha256']==rec['archiveSha256']==rec['artifact']['digest'].split(':')[1]
 rawv=json.loads(z.read(next(x for x in z.namelist() if x.endswith('.json') and x!='PAGE_IMAGES_SHA256.json')));assert rawv==v
 docs=v['documentsRendered'];assert len(docs)==2 and len(v['measurements'])==40 and len([p for p in z.namelist() if p.endswith('.png') and not p.endswith('page-calibration.png')])==40
 for d in docs:
  assert bind(d['path'])['sha256']==d['pinned']
  assert hashlib.sha256(subprocess.check_output(['git','show',commit+':'+d['path']])).hexdigest()==d['pinned']
 for inp in s['inputs']:
  assert bind(inp['path'])['sha256']==inp['sha256'],inp['path']
 pages=[];sheets=[]
 for fixture in ['canonical','boundary']:
  pp=sorted([p for p in v['measurements'] if p['kind']==fixture],key=lambda x:x['page']);assert [p['page'] for p in pp]==list(range(1,21))
  for p in pp:
   b=z.read(p['png']);assert len(b)==p['bytes'] and hashlib.sha256(b).hexdigest()==p['pngSha256']
   im=Image.open(io.BytesIO(b));assert im.size[0]>=p['paper']['x1'] and im.size[1]>=p['paper']['y1']
   dest=TMP/'originals'/p['png'];dest.parent.mkdir(parents=True,exist_ok=True)
   if dest.exists():assert dest.read_bytes()==b
   else:dest.write_bytes(b)
   pages.append({**p,'extractedPath':str(dest),'encodedDimensions':list(im.size)})
  for start in range(0,20,4):
   canvas=Image.new('RGB',(2040,2750),'#ddd');dr=ImageDraw.Draw(canvas)
   for i,p in enumerate(pp[start:start+4]):
    im=Image.open(TMP/'originals'/p['png']);box=p['paper'];im=im.crop((box['x0'],box['y0'],box['x1']+1,box['y1']+1));im.thumbnail((1000,1300))
    x=(i%2)*1020;y=(i//2)*1375;canvas.paste(im,(x,y+35));dr.text((x+10,y+8),f'{f} / {fixture} / page {p["page"]}',fill='black')
   path=TMP/(f+'-'+fixture+'-'+str(start+1).zfill(2)+'-'+str(start+4).zfill(2)+'.png');canvas.save(path);sheets.append(str(path))
 out={'familyId':f,'run':RUN,'packetCommit':commit,'archive':bind(zpath),'verdict':bind(vpath),'custodyProof':bind(R/'ORIGINAL_EVIDENCE_VERIFIED.json'),'semanticPreflight':bind(BASE.parent/'semantic-review/semantic-preflight.json'),'documents':[bind(d['path']) for d in docs],'wholeRunPassed':True,'familyJobPassed':True,'rawWholeFamilyFlag':v['coversTheWholeFamily'],'actualCompleteFamilyCoverage':True,'coverageBasis':'Two exact current native documents with all 20 sequential pages each; current hashes match immutable packet commit and original central verdict. All current semantic inputs hash-identical to independent preflight.','pages':pages,'sheets':sheets,'allHashesLengthsAndDimensionsVerified':True,'visualReviewCompleted':False}
 (BASE/(f+'-original-measurements.json')).write_text(json.dumps(out,indent=2)+'\n');print(f,len(pages),'pages',len(sheets),'sheets')

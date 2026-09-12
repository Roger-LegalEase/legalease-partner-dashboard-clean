from pathlib import Path
import json,hashlib,zipfile,io,subprocess
from PIL import Image,ImageDraw
BASE=Path(__file__).resolve().parent.relative_to(Path.cwd());RUN='34666647205';R=Path('data/rcap-grade-a/packet-factory-24h/raster-runs')/RUN
prep=json.loads((BASE.parent/'independent-review-preparation.json').read_text());proof=json.loads((R/'ORIGINAL_FAMILY_RESULTS_VERIFIED.json').read_text())
def bind(p):
 p=Path(p);b=p.read_bytes();return {'path':str(p),'sha256':hashlib.sha256(b).hexdigest(),'byteLength':len(b)}
for fam in prep['rows'][:3]:
 f=fam['familyId'];rec=next(x for x in proof['successfulFamilies'] if x['familyId']==f);zpath=R/(f+'.zip');vpath=R/(f+'.verdict.json');v=json.loads(vpath.read_text());z=zipfile.ZipFile(zpath)
 assert rec['jobConclusion']=='success' and v['verdict']=='RASTER_PASS' and v['packetCommitSha']==prep['packetCommitSha']
 assert bind(zpath)['sha256']==rec['archiveSha256']==rec['artifact']['digest'].split(':')[1]
 rawv=json.loads(z.read(next(x for x in z.namelist() if x.endswith('.json') and x!='PAGE_IMAGES_SHA256.json')));assert rawv==v
 docs=v['documentsRendered'];assert len(docs)==2 and len(v['measurements'])==40 and len([p for p in z.namelist() if p.endswith('.png') and not p.endswith('page-calibration.png')])==40
 for d in fam['documents']:
  assert bind(d['path'])['sha256']==d['sha256'] and bind(d['path'])['byteLength']==d['byteLength']
  assert hashlib.sha256(subprocess.check_output(['git','show',prep['packetCommitSha']+':'+d['path']])).hexdigest()==d['sha256']
  assert next(x for x in docs if x['path']==d['path'])['pinned']==d['sha256']
 pages=[];sheets=[]
 for fixture in ['canonical','boundary']:
  pp=sorted([p for p in v['measurements'] if p['kind']==fixture],key=lambda x:x['page']);assert [p['page'] for p in pp]==list(range(1,21))
  for p in pp:
   b=z.read(p['png']);assert len(b)==p['bytes'] and hashlib.sha256(b).hexdigest()==p['pngSha256']
   im=Image.open(io.BytesIO(b));assert im.size[0]>=p['paper']['x1'] and im.size[1]>=p['paper']['y1']
   dest=BASE/'originals'/RUN/p['png'];dest.parent.mkdir(parents=True,exist_ok=True)
   if dest.exists():assert dest.read_bytes()==b
   else:dest.write_bytes(b)
   pages.append({**p,'extractedPath':str(dest),'encodedDimensions':list(im.size)})
  # Four full-resolution-readable page grids per fixture; original detail available separately.
  for start in range(0,20,4):
   canvas=Image.new('RGB',(2040,2750),'#ddd');dr=ImageDraw.Draw(canvas)
   for i,p in enumerate(pp[start:start+4]):
    im=Image.open(BASE/'originals'/RUN/p['png']);box=p['paper'];im=im.crop((box['x0'],box['y0'],box['x1']+1,box['y1']+1));im.thumbnail((1000,1300))
    x=(i%2)*1020;y=(i//2)*1375;canvas.paste(im,(x,y+35));dr.text((x+10,y+8),f'{f} / {fixture} / page {p["page"]}',fill='black')
   path=BASE/'originals'/(f+'-'+fixture+'-'+str(start+1).zfill(2)+'-'+str(start+4).zfill(2)+'.png');canvas.save(path);sheets.append(str(path))
 out={'familyId':f,'run':RUN,'packetCommit':prep['packetCommitSha'],'archive':bind(zpath),'verdict':bind(vpath),'custodyProof':bind(R/'ORIGINAL_FAMILY_RESULTS_VERIFIED.json'),'documents':fam['documents'],'wholeRunPassed':False,'familyJobPassed':True,'rawWholeFamilyFlag':v['coversTheWholeFamily'],'actualCompleteFamilyCoverage':True,'coverageBasis':'Two exact current native documents with all 20 sequential pages each; hashes match immutable packet commit and central original verdict. Raw null flag preserved. Failed specialty-court job excluded.','pages':pages,'sheets':sheets,'allHashesLengthsAndDimensionsVerified':True,'visualReviewCompleted':False}
 (BASE/(f+'-original-measurements.json')).write_text(json.dumps(out,indent=2)+'\n');print(f,len(pages),'pages',len(sheets),'sheets')

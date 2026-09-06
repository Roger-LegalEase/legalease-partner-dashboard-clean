import os,json,pathlib,subprocess,hashlib
from PIL import Image,ImageDraw
os.sched_setaffinity(0,{min(os.sched_getaffinity(0))});os.nice(10)
s=pathlib.Path('/tmp/codex-fix87-20260906');rows=[]
for track in json.load(open(s/'current-requirements.json')):
 family=track+'-set';d=pathlib.Path('data/rcap-all50/overlays/census-v1/va')/(family.replace('_','-')+'--official-pdf-fill');art=json.load(open(d/'reports/rendered-artifacts.json'))
 for a in art['artifacts']:
  first=min(p['packetPage'] for p in a['pageManifest'] if p['component']!='primary_filing');out=s/'images'/family/a['fixture'];out.mkdir(parents=True,exist_ok=True)
  cmd=['pdftoppm','-f',str(first),'-l',str(a['pageCount']),'-r','300','-png',a['file'],str(out/'page')];p=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);assert p.returncode==0,p.stderr
  for pm in a['pageManifest']:
   if pm['packetPage']<first:continue
   img=out/f"page-{pm['packetPage']:02}.png";assert img.exists(),img
   rows.append({'familyId':family,'fixture':a['fixture'],'packetSha256':a['sha256'],**pm,'image':str(img),'sha256':hashlib.sha256(img.read_bytes()).hexdigest(),'dpi':300,'command':cmd,'exitCode':p.returncode})
  print(f"rendered {family} {a['fixture']} {a['pageCount']-first+1} pages",flush=True)
seen={};unique=[]
for r in rows:
 if r['sha256'] in seen:r['identicalTo']=seen[r['sha256']]
 else:seen[r['sha256']]=r['image'];unique.append(r)
for i in range(0,len(unique),2):
 pair=unique[i:i+2];sheet=Image.new('RGB',(2400,1620),'#e8e8e8');draw=ImageDraw.Draw(sheet)
 for j,r in enumerate(pair):
  im=Image.open(r['image']).convert('RGB');im.thumbnail((1190,1540));sheet.paste(im,(j*1200,70));draw.text((j*1200+12,10),r['familyId']+' '+r['fixture'],fill='black');draw.text((j*1200+12,32),'page '+str(r['packetPage'])+' '+r['component'],fill='black')
 path=s/'images'/f'contact-{i//2+1:02}.png';sheet.save(path);print(path,flush=True)
(s/'visual-manifest.json').write_text(json.dumps({'rows':rows,'uniquePages':len(unique),'contactSheets':(len(unique)+1)//2},indent=2)+'\n')

import pathlib,json,subprocess,hashlib,shutil
from PIL import Image,ImageOps,ImageDraw
root=pathlib.Path('/tmp/fix85-fix89-current');meta=json.load(open(root/'selected.json'));commands=[]
for f in meta:
 d=pathlib.Path(f['directory']);f['renderReport']=json.load(open(d/'reports/rendered-artifacts.json'))
 for a in f['fixtures']:
  p=pathlib.Path(a['path']);info=subprocess.run(['pdfinfo',str(p)],capture_output=True,text=True);assert info.returncode==0
  pages=int(next(x.split(':')[1] for x in info.stdout.splitlines() if x.startswith('Pages:')))
  o=root/f['familyId']/p.stem;o.mkdir(parents=True,exist_ok=True);a.update(sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size,pages=pages,outDir=str(o))
  for cmd in [['pdftoppm','-r','300','-png',str(p),str(o/'page')],['pdftotext','-bbox',str(p),str(o/'bbox.html')],['pdftotext','-layout',str(p),str(o/'text.txt')]]:
   q=subprocess.run(cmd,capture_output=True,text=True);commands.append(dict(command=cmd,exitCode=q.returncode,stderr=q.stderr));assert q.returncode==0
  print(f['familyId'],a['name'],pages,'pages',flush=True)
 ims=[]
 for a in f['fixtures']:
  for p in sorted(pathlib.Path(a['outDir']).glob('page-*.png'),key=lambda p:int(p.stem.split('-')[-1])):
   im=Image.open(p).convert('RGB');im.thumbnail((510,660));panel=Image.new('RGB',(550,710),'#ddd');panel.paste(im,((550-im.width)//2,35));ImageDraw.Draw(panel).text((10,10),a['name']+' / '+p.stem,fill='black');ims.append(panel)
 for n in range(0,len(ims),6):
  chunk=ims[n:n+6];sheet=Image.new('RGB',(1650,710*((len(chunk)+2)//3)),'white')
  for i,im in enumerate(chunk):sheet.paste(im,((i%3)*550,(i//3)*710))
  sheet.save(root/f['familyId']/f'contact-{n//6+1}.jpg',quality=90)
(root/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n');(root/'raster-command-results.json').write_text(json.dumps(commands,indent=2)+'\n')
if not (root/'source-images').exists():(root/'source-images').symlink_to('/tmp/vf01-four/source-images',target_is_directory=True)
s=pathlib.Path('/tmp/vf01-four/measure.py').read_text().replace("root=pathlib.Path('/tmp/vf01-four')","root=pathlib.Path('/tmp/fix85-fix89-current')");(root/'measure.py').write_text(s)
print('ALL_RENDERED',sum(a['pages'] for f in meta for a in f['fixtures']),'WARNINGS',len([c for c in commands if c['stderr']]),flush=True)

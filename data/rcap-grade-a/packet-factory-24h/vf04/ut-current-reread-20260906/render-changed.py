from pathlib import Path
import os,json,subprocess,hashlib
os.sched_setaffinity(0,{min(os.sched_getaffinity(0))})
out=Path('/tmp/codex-captain-20260906/ut-current-reread');rows=json.loads((out/'scope-comparison.json').read_text())['families'];results=[]
for row in rows:
 p=Path(row['directory']);family=p.name.removesuffix('--official-pdf-fill');target=out/'images'/family;target.mkdir(parents=True,exist_ok=True)
 for file in row['changed']:
  if not file.startswith('raster/'):continue
  fixture=Path(file).parts[1];page=int(Path(file).stem.split('-')[1]);image=target/f'{fixture}-p{page:02d}'
  cmd=['pdftoppm','-f',str(page),'-l',str(page),'-r','300','-png','-singlefile',str(p/'fixtures'/f'{fixture}.pdf'),str(image)]
  r=subprocess.run(cmd,capture_output=True,text=True);assert r.returncode==0,r.stderr
  item={'family':family,'fixture':fixture,'packetPage':page,'command':cmd,'exitCode':r.returncode,'path':str(image)+'.png','sha256':hashlib.sha256(Path(str(image)+'.png').read_bytes()).hexdigest()};results.append(item);print(f'{family} {fixture} {page} exit0',flush=True)
for source,page in [('Expungement-Application.pdf',2),('1000EX.pdf',1),('1020EX.pdf',1),('1020EX.pdf',2)]:
 image=out/'source-images'/f'{Path(source).stem}-p{page}';cmd=['pdftoppm','-f',str(page),'-l',str(page),'-r','300','-png','-singlefile','/tmp/codex-captain-20260906/vf04/sources/'+source,str(image)];r=subprocess.run(cmd,capture_output=True,text=True);assert r.returncode==0,r.stderr
 results.append({'source':source,'page':page,'command':cmd,'exitCode':r.returncode,'path':str(image)+'.png','sha256':hashlib.sha256(Path(str(image)+'.png').read_bytes()).hexdigest()})
(out/'raster-results.json').write_text(json.dumps(results,indent=2)+'\n');print('20 changed fixture pages +3 additional source pages rendered at300dpi.',flush=True)

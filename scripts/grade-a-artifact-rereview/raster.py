#!/usr/bin/env python3
"""Fresh forensic page images; never rewrites the shipping PDFs."""
import pathlib,json,subprocess,tempfile,hashlib,shutil
ROOT=pathlib.Path(__file__).resolve().parents[2]
BASE=ROOT/'data/rcap-grade-a/artifact-rereview-20260914'
sha=lambda b:hashlib.sha256(b).hexdigest()
version=subprocess.run(['pdftoppm','-v'],capture_output=True,text=True,check=True).stderr.splitlines()[0]
for family in ['il-prostitution-j-vacate-set','ms-misd-addl-set']:
 folder=BASE/family; package=json.loads((folder/'package.json').read_text()); rows=[]
 with tempfile.TemporaryDirectory(prefix='grade-a-review-raster-',dir='/tmp') as tmp:
  for artifact in package['artifacts']:
   for kind in ['current','approved']:
    expected=artifact if kind=='current' else artifact['historicalApproved']
    data=(ROOT/artifact['path']).read_bytes() if kind=='current' else subprocess.check_output(['git','show',f"{expected['sourceSha']}:{expected['path']}"],cwd=ROOT)
    assert sha(data)==expected['sha256'],'PDF digest moved'
    source=pathlib.Path(tmp)/'input.pdf';source.write_bytes(data)
    dest=folder/'images'/artifact['fixture']/kind;dest.mkdir(parents=True,exist_ok=True)
    scratch=pathlib.Path(tmp)/f"{artifact['fixture']}-{kind}";scratch.mkdir()
    subprocess.run(['pdftoppm','-r','110','-png','-cropbox',str(source),str(scratch/'page')],check=True,capture_output=True)
    pages=sorted(scratch.glob('page-*.png'),key=lambda p:int(p.stem.split('-')[-1]));assert len(pages)==expected['pageCount']
    images=[]
    for i,p in enumerate(pages,1):
     target=dest/f'page-{i:02}.png';shutil.copyfile(p,target)
     images.append({'page':i,'path':str(target.relative_to(ROOT)),'sha256':sha(target.read_bytes()),'byteLength':target.stat().st_size})
    rows.append({'fixture':artifact['fixture'],'version':kind,'pdfSha256':expected['sha256'],'pageCount':len(images),'images':images})
 receipt={'schemaVersion':'rcap-exact-rereview-rasters/v1','generatedBy':'scripts/grade-a-artifact-rereview/raster.py','generatorSha256':sha(pathlib.Path(__file__).read_bytes()),'rasterizer':version,'command':'pdftoppm -r 110 -png -cropbox <exact PDF> <scratch/page>','familyId':family,'status':'GENERATED_FOR_OWNER_REVIEW','approvalCreated':False,'artifacts':rows}
 (folder/'rasters.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print(f'{family}: {sum(r["pageCount"] for r in rows)} fresh current/prior page images')

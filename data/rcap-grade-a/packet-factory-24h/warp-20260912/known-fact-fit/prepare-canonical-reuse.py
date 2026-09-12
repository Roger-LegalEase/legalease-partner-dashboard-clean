"""Select only unchanged canonical PDFs from verified original Actions custody."""
import hashlib,json,pathlib,zipfile
BASE=pathlib.Path('data/rcap-grade-a/packet-factory-24h')
HERE=BASE/'warp-20260912/known-fact-fit'
ASSIGNMENTS={'nm_conviction-set':'34660850664','nm_identity_theft-set':'34659428344','nm_release_without_conviction-set':'34659428344','co_motion_seal_conviction-set':'34660023738'}
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(pathlib.Path(p).read_text())
def ref(p):
 b=pathlib.Path(p).read_bytes();return {'path':str(p),'sha256':sha(b),'byteLength':len(b)}
rows=[]
for family,run in ASSIGNMENTS.items():
 root=BASE/'raster-runs'/run;cp=root/'ORIGINAL_EVIDENCE_VERIFIED.json'
 if not cp.exists():continue
 proof=read(cp);c=next(x for x in proof['families'] if x['familyId']==family)
 vp=pathlib.Path(c['verdictPath']);v=read(vp);doc=next(x for x in v['documentsRendered'] if x['role']=='canonical')
 assert sha(pathlib.Path(doc['path']).read_bytes())==doc['pinned'],'canonical changed; never reuse old images'
 ms=[m for m in v['measurements'] if m['document']==doc['document']]
 assert sorted(m['page'] for m in ms)==list(range(1,len(ms)+1))
 inventory=root/(family+'.PAGE_IMAGES_SHA256.json');images=read(inventory)
 image_root=HERE/'original-canonical'/run
 archive=pathlib.Path(c['archivePath']);assert sha(archive.read_bytes())==c['archiveSha256']
 with zipfile.ZipFile(archive) as z:
  for m in ms:
   entry=next(i for i in images if i['member']==m['png']);b=z.read(m['png']);assert sha(b)==m['pngSha256']==entry['sha256']
   dest=image_root/m['png'];assert dest.resolve().is_relative_to(image_root.resolve())
   if dest.exists():assert dest.read_bytes()==b,'do not overwrite any existing evidence'
   else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(b)
 descriptor={'policyId':'HELD-FACT-FIT-20260912','originalRunId':run,'originalPacketCommitSha':v['packetCommitSha'],'documentSha256':doc['pinned']}
 rows.append({'familyId':family,'descriptor':descriptor,'document':{'name':doc['document'],'path':doc['path'],'sha256':doc['pinned'],'pageCount':len(ms)},'verdict':ref(vp),'custody':ref(cp),'inventory':ref(inventory),'jobs':ref(root/'jobs.json'),'jobLog':ref(root/(family+'.job.log')),'archive':ref(archive),'imageRoot':str(image_root),'authority':'Raster evidence reuse only. Prior independent failures remain; only unchanged canonical bytes reuse these original images. Changed boundary PDFs require fresh central rendering and whole-family review.'})
(HERE/'canonical-reuse.json').write_text(json.dumps({'schemaVersion':'rcap-exact-canonical-reuse/v1','rows':rows},indent=2)+'\n')
print({'familiesReady':len(rows),'canonicalPagesRetained':sum(r['document']['pageCount'] for r in rows)})

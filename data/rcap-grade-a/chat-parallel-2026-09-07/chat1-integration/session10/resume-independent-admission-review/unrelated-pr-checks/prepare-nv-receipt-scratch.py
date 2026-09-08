#!/usr/bin/env python3
import copy,difflib,hashlib,json,pathlib,shutil,subprocess,tempfile,time
ROOT=pathlib.Path.cwd();OUT=pathlib.Path(__file__).resolve().parent;sha=lambda b:hashlib.sha256(b).hexdigest();canonical=lambda o:json.dumps(o,sort_keys=True,separators=(',',':')).encode()
family='data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading';receiptPath=family+'/source-receipt.json';sourcePath='data/record-clearing/legal-design-track-registry.json'
before=(ROOT/receiptPath).read_bytes();receipt=json.loads(before);original=copy.deepcopy(receipt);pin=next(r for r in receipt['committedRecords']if r['pathInRepository']==sourcePath);oldAnnotation=copy.deepcopy(pin['identityRefresh']);oldPin=dict(sha256=pin['sha256'],byteLength=pin['byteLength'])
source=(ROOT/sourcePath).read_bytes();current=json.loads(source);ids=['nv_seal_decrim','nv_seal_multi','nv_seal_pardon','nv_seal_conviction','nv_seal_nonconviction','nv_seal_reentry'];comparisons=[]
for ref,expected in [('206fe34917cea147e3bf9b62e63a9872fc8cc238',oldAnnotation['was']['sha256']),('75647c8901618ee8aca94e6dc971cd769331e991^',oldPin['sha256'])]:
 commit=subprocess.check_output(['git','rev-parse',ref],text=True).strip();b=subprocess.check_output(['git','show',commit+':'+sourcePath]);assert sha(b)==expected;prior=json.loads(b)
 anchors=[]
 for ident in ids:
  a=next(x for x in prior['tracks']if x['jurisdiction']=='NV'and x['trackId']==ident);c=next(x for x in current['tracks']if x['jurisdiction']=='NV'and x['trackId']==ident);assert a==c;anchors.append(dict(trackId=ident,completeObjectIdentical=True,objectSha256=sha(canonical(c))))
 assert {k:v for k,v in prior.items()if k!='tracks'}=={k:v for k,v in current.items()if k!='tracks'}
 comparisons.append(dict(historicalCommit=commit,historicalSha256=sha(b),historicalBytes=len(b),anchors=anchors,globalMetadataIdentical=True))
evidence=dict(schemaVersion='rcap-nv-source-identity-successor-comparison/v1',reviewer='/root/session10_admission_review',sourcePath=sourcePath,currentSha256=sha(source),currentBytes=len(source),comparisons=comparisons,scope='Independent full-object source comparison only. No new packet, visual, legal, runtime, central or production approval. Both the originally annotated873d3d21 source and its prior9fe5d0cc target have identical complete bound NV tracks and global metadata to the currentbaa26b2e source.',sourceBytesModified=False)
evidencePath=OUT/'nv-source-identity-successor-comparison.json';evidencePath.write_text(json.dumps(evidence,indent=2)+'\n')
pin['sha256']=sha(source);pin['byteLength']=len(source)
pin['identityRefresh']={
 'refreshedOn':'2026-09-08','was':copy.deepcopy(oldAnnotation['was']),
 'why':'The original source comparison is retained verbatim below. The successor reviewer independently recovered both the original873d3d21 source and the previous9fe5d0cc target, then compared all six complete bound Nevada track objects and the registry global metadata with currentbaa26b2e bytes. Both comparisons are identical. This updates only the source identity; it grants no packet, runtime or production approval.',
 'anchorsCompared':6,'anchorsIdentical':6,'previousPinLastSeenAtCommit':oldAnnotation['previousPinLastSeenAtCommit'],
 'reviewer':'/root/session10_admission_review','previousTargetIdentity':oldPin,
 'previousIdentityRefresh':oldAnnotation,
 'successorEvidence':{'path':str(evidencePath.relative_to(ROOT)),'sha256':sha(evidencePath.read_bytes()),'byteLength':evidencePath.stat().st_size},
}
assert pin['identityRefresh']['previousIdentityRefresh']==original['committedRecords'][0]['identityRefresh']
after=(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n').encode();(OUT/'proposed-nv-source-receipt.json').write_bytes(after)
patch=''.join(difflib.unified_diff(before.decode().splitlines(keepends=True),after.decode().splitlines(keepends=True),fromfile='a/'+receiptPath,tofile='b/'+receiptPath));patchPath=OUT/'nv-source-receipt-preservation.patch';patchPath.write_text(patch)
started=time.monotonic();scratch=pathlib.Path(tempfile.mkdtemp(prefix='session10-nv-receipt-',dir='/tmp'));tracked=subprocess.check_output(['git','ls-files','--',family],text=True).splitlines()
scripts=['scripts/build-census-v1-rcap-nv-custom-pleading.mjs','scripts/rcap-packet-recovery/nv-special-routes.mjs','scripts/rcap-packet-recovery/test-nv-special-routes.mjs','scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs','scripts/rcap-official-forms/rcap-deterministic-pdf-date.mjs','scripts/rcap-packet-completeness/completeness-contract.mjs','scripts/rcap-packet-completeness/identity-refresh.mjs']
inputs=tracked+scripts+[r['pathInRepository']for r in receipt['committedRecords']]
for relative in inputs:
 dest=scratch/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/relative,dest)
(scratch/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
# Only minimal NV inputs and files are copied; no repository/dependency tree.
with (OUT/'nv-scratch-patch-check.log').open('wb')as log:
 r=subprocess.run(['git','apply','--check',str(patchPath)],cwd=scratch,stdout=log,stderr=subprocess.STDOUT);assert r.returncode==0
with (OUT/'nv-scratch-patch-apply.log').open('wb')as log:
 r=subprocess.run(['git','apply',str(patchPath)],cwd=scratch,stdout=log,stderr=subprocess.STDOUT);assert r.returncode==0
assert (scratch/receiptPath).read_bytes()==after
baseline=scratch/'expected-family';shutil.copytree(scratch/family,baseline)
manifest=dict(scratch=str(scratch),baseline=str(baseline),family=family,receiptPath=receiptPath,preparationSeconds=round(time.monotonic()-started,3),dependenciesInstalled=False,minimalScratchOnly=True,baselineFiles=[dict(path=p,sha256=sha((scratch/p).read_bytes()))for p in tracked],guardedLiveInputs=[dict(path=p,sha256=sha((ROOT/p).read_bytes()))for p in inputs],proposedReceiptSha256=sha(after),patchSha256=sha(patch.encode()),liveFilesEdited=False)
(OUT/'nv-scratch-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(dict(scratch=str(scratch),copiedFiles=len(inputs),trackedFamilyFiles=len(tracked),preparationSeconds=manifest['preparationSeconds'],patchSha256=manifest['patchSha256'],liveFilesEdited=False)))

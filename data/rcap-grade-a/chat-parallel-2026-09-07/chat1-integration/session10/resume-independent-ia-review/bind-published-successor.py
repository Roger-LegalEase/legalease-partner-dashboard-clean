#!/usr/bin/env python3
"""Bind the retained independent Iowa composition only to verified publication."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess

OUT=Path(__file__).resolve().parent
COMMIT='1c6d648f6721de0de0f1a57d25dc37e1ff51a62f'
BRANCH='refs/heads/chatgpt/launch-recovery-20260906'
sha=lambda b:hashlib.sha256(b).hexdigest()
remote=subprocess.check_output(['git','ls-remote','origin',BRANCH],text=True).split()[0]
assert remote==COMMIT, 'Re-evaluate actual remote publication before binding'
draft_path=OUT/'candidate-successor-draft.json'
draft=json.loads(draft_path.read_text())
closure=json.loads((OUT/'supplemental-publication-closure.json').read_text())
row=draft['proposedReview']['rows'][0]
guard_path=Path(row['candidateGuard']['path'])
assert sha(guard_path.read_bytes())==row['candidateGuard']['sha256']
guard=json.loads(guard_path.read_text())
checks=[]
for scope,entries in [('supplemental',closure['recommendedPublicationFiles']),('guarded',guard['files'])]:
    for entry in entries:
        current=Path(entry['path']).read_bytes()
        published=subprocess.check_output(['git','show',COMMIT+':'+entry['path']])
        check=dict(scope=scope,path=entry['path'],expectedSha256=entry['sha256'],currentSha256=sha(current),
            publishedSha256=sha(published),byteLength=len(published),matched=sha(current)==sha(published)==entry['sha256'])
        checks.append(check)
        assert check['matched'],entry['path']

# These exact output bytes were already parsed/reviewed. Parse the retained
# PDFs again only to bind the published five-document/26-page identity here.
pdf_script="""import fs from 'node:fs';import{PDFDocument}from'pdf-lib';const rows=JSON.parse(fs.readFileSync(process.argv[1])).proposedReview.rows[0].allWholeOutputs;const out=[];for(const r of rows){const p=await PDFDocument.load(fs.readFileSync(r.file),{updateMetadata:false});out.push({file:r.file,pages:p.getPageCount()});}process.stdout.write(JSON.stringify(out));"""
page_counts=json.loads(subprocess.check_output(['node','--input-type=module','-e',pdf_script,str(draft_path)]))
for whole,count in zip(row['allWholeOutputs'],page_counts):
    assert whole['file']==count['file'] and whole['pages']==count['pages']
    assert sha(Path(whole['file']).read_bytes())==whole['sha256']
assert len(page_counts)==5 and sum(x['pages'] for x in page_counts)==26

publication=dict(schemaVersion='rcap-independent-published-review-inputs/v1',reviewer='/root/session10_admission_review',
    publicationCommit=COMMIT,remoteHead=remote,remoteBranch=BRANCH,checks=checks,
    supplementalMatched=sum(x['scope']=='supplemental' and x['matched'] for x in checks),
    guardedMatched=sum(x['scope']=='guarded' and x['matched'] for x in checks),
    pageCounts=page_counts,originalReviewRelabeled=False,newVisualInspection=False,sharedFilesEdited=False,
    reviewScope='Existing fifteen-obligation composition plus actual immutable source/code/output publication binding; no central raster or runtime approval.')
publication_path=OUT/'published-input-verification.json'
publication_path.write_text(json.dumps(publication,indent=2)+'\n')

doc=copy.deepcopy(draft['proposedReview'])
doc['sessionIdentity']='session10-independent-ia-published-successor-2026-09-08'
doc['publicationRequiredInputs']=[{k:x[k] for k in ['path','sha256']} for x in closure['recommendedPublicationFiles']]
doc['retainedDraft']={'path':str(draft_path.relative_to(Path.cwd())),'sha256':sha(draft_path.read_bytes()),'draftEdited':False}
doc['independence']=draft['independence']
r=doc['rows'][0]
r['verifiedAtBase']=COMMIT
r['reviewBaseSource']='Actual remote recovery head independently verified; all 39 supplemental inputs and 65 original guarded candidate files hash-match this immutable publication and current installed bytes.'
r['firstPacketPublicationCommit']=r['packetPublicationCommit']
r['packetPublicationCommit']=COMMIT
r['publishedInputVerification']={'path':str(publication_path.relative_to(Path.cwd())),'sha256':sha(publication_path.read_bytes())}
r['proofObligations']['ARTIFACTS']['finding']='All 65 guarded files remain byte-identical to their original publication and this complete reviewed input publication. All 39 supplemental source/code/review dependencies are now independently hash-matched to remote commit '+COMMIT+'. Five whole output identities and 5/5/6/5/5 page counts remain bound below.'
host_path=OUT/'host-hook-accounting.json'
host_ref={'path':str(host_path.relative_to(Path.cwd())),'sha256':sha(host_path.read_bytes()),'reviewer':'/root/session10_admission_review','scope':'Actual read-only integrated host measurement on exactly published unchanged code; historical importer measurements retained separately.'}
for obligation in ['KNOWN_PREFILLS','REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','REPEATING_ROWS','ARTIFACTS']:
    r['proofObligations'][obligation]['evidence'].append(host_ref)
r['nineCounters']['historicalMeasurementPath']=r['nineCounters']['measurementPath']
r['nineCounters']['historicalMeasurementSha256']=r['nineCounters']['measurementSha256']
r['nineCounters']['measurementPath']=host_ref['path']
r['nineCounters']['measurementSha256']=host_ref['sha256']
r['expectedOutcomeAccounting']['integratedHostMeasurement']=host_ref
r['historicalExternalReviewTransport']=closure['historicalExternalReviewTransport']
r['remainingCentralRequirement']='Existing shared integrity/canary/provenance and complete five-document/26-page raster acceptance remain separate; this static independent review creates no central receipt, filing permission or runtime authority.'
successor_path=OUT/'ia-901c2-published-independent-successor.json'
assert not successor_path.exists(), 'Do not overwrite an independently issued successor'
successor_path.write_text(json.dumps(doc,indent=2)+'\n')
print(json.dumps(dict(publicationCommit=COMMIT,supplementalMatched=publication['supplementalMatched'],guardedMatched=publication['guardedMatched'],documents=5,pages=26,successorPath=str(successor_path.relative_to(Path.cwd())),successorSha256=sha(successor_path.read_bytes()))))

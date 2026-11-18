import hashlib, json, pathlib, subprocess

root = pathlib.Path('/tmp/expai-signup-authority-successor-20261006')
out = pathlib.Path('/workspaces/legalease-partner-dashboard-clean/artifacts/signup-hotfix-successor-20261005')
source = 'e3ac438da981c84987bd3172751e1a09e3f42309'
product = ['src/components/expungement-ai/ConsumerSignInForm.tsx', 'src/lib/expungement-ai/localization.ts', 'scripts/test-consumer-signup-next-steps.mjs', 'scripts/verify-expungement-auth-locale-conversion-hotfix.mjs']
def git(*args):
    return subprocess.check_output(['git', *args], cwd=root)
def sha(b):
    return hashlib.sha256(b).hexdigest()
changed = git('diff', '--name-only').decode().splitlines()
diff = git('diff', '--binary')
(out/'authority-successor-draft-20261006.patch').write_bytes(diff)
frozen = {p: {'sourceSha256': sha(git('show', source+':'+p)), 'workingSha256': sha((root/p).read_bytes())} for p in product}
assert all(v['sourceSha256']==v['workingSha256'] for v in frozen.values())
assert changed == ['data/rcap-grade-a/fulfillment-authority-projection.json', 'data/rcap-grade-a/fulfillment-authority-registry.json', 'data/rcap-grade-a/fulfillment-observation-snapshot.json', 'data/rcap-render/worker-publication-evidence.json']
old = json.loads(git('show', source+':data/rcap-grade-a/fulfillment-authority-registry.json'))
new = json.loads((root/'data/rcap-grade-a/fulfillment-authority-registry.json').read_bytes())
appended = []
for a,b in zip(old['records'],new['records']):
    assert b['history'][:len(a['history'])] == a['history']
    if len(b['history'])>len(a['history']):
        appended.append({'pathwayId':b.get('pathwayId'), 'newHistory':b['history'][len(a['history']):]})
report = {
 'outcome':'BLOCKED BEFORE ACTIVATION',
 'draftWorktree':str(root), 'draftParent':source, 'successorApplicationCommit':None,
 'captainRelease':'f04c7779322f1dc9df56db1dbf62f98ae820fb3e',
 'workerSource':source, 'workerDigest':'sha256:be3d579fe808b8f0c806fed303f358edfe7a3bb6112866f4484d15ca7de4382a',
 'workerFingerprint':'sha256:82d31e68a0edb0557bc9c2f9fce041e6760dd771ab02dc3b385e77235f99f867',
 'changedPaths':changed, 'frozenProductHashes':frozen, 'appendOnlyHistoriesVerified':True,
 'newHistoryEntries':appended, 'draftPatchSha256':sha(diff),
 'canonicalWorkerInputs':'All four changed paths are outside the existing canonical input set. worker-static-authority.json, all src, scripts/lib, Dockerfile, lockfile and copied worker data remain unchanged. No successor commit exists to run a two-commit planner comparison against.',
 'generatorCheckAfter':'PASS: 13 current records, six commercially eligible, seven incomplete; projection versions only. Check mode does not validate truthfulness of the newly appended MS history description.',
 'independentReview':'REJECTED: /root/control_review found MS successor history falsely describes a new owner approval and packet-content change, dated 2026-09-20. Generator line1263 unconditionally reuses the historical approval reason. historicalImmutableRegistryDigest also now names the new digest, not predecessor.',
 'blockers':[
  {'control':'Authority successor history', 'finding':'Canonical generation adds a false new owner/packet-change claim to the MS nonconviction version16 history. Per explicit user STOP instruction, no commit, integration or push was performed. Needs a bounded generator/history correction before regeneration can be approved; manual JSON editing is disallowed.'},
  {'control':'Release admission', 'finding':'Current accepted pinned-source binding remains held. verifyPinnedBinding does not expose hosted/admission advancement or distinct successor application identity. Older post-publication generation path requires publication workflow source==image source and cannot validate actual e0d tooling/e3 image identities unchanged. No truthful current successor application/admission record can be frozen until the draft and supported forward lifecycle are reconciled.'},
  {'control':'Worker rollback identity', 'finding':'Newest inspector remains run37393401639, captured 2026-10-06T00:20:52.944Z. Machine d8de5e4f759278 was started, source5e04eafd7eaed7e71722862e651fb787ebbd296d, Fly image registry.fly.io/legalease-rcap-render-worker@sha256:490576906cba2f4f710372c39f81cdff0cfaabc684eb25e9a738b680957d34ea. Fresh machine state and Fly/GHCR immutable config equivalence/rollback executability not proven. Existing GHCR predecessor availability proof remains valid. No alternate local Fly/Actions-write session exists; previous dispatch403 not retried.'},
  {'control':'Production-equivalent application staging', 'finding':'Final successor source and admission are not approved. Safe existing REST path requires target production plus autoAssignCustomDomains:false. Connector cannot express that safety field; no local Vercel session/token. Authenticated runner exists but current Actions integration lacks dispatch permission. No production request or materially different Preview substitution attempted.'}
 ],
 'productionApplicationReadback':{'deployment':'dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc','source':'e312a5efa7b4882e0fbf61a5ff0ae7891ac23226','state':'READY','rollback':'dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc'},
 'productionAuthorized':False, 'productionWrites':False, 'workerBuildPublicationAcceptanceRepeated':False,
 'baselineFailures':'Three original verifier failures remain failed, baseline-proven and unwaived; no new gate was disabled.',
 'realProductionEmailDelivery':'UNVERIFIED', 'operatorActionRequested':None
}
(out/'authority-successor-closure-20261006.json').write_text(json.dumps(report,indent=2)+'\n')
print('Preserved rejected authority draft, frozen product hashes, append-only history proof, and all four remaining closure constraints.')

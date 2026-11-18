"""Read-only native-evidence validation and continuation handoff; no dispatch."""
import pathlib
import json
import hashlib
import subprocess
import datetime

OUT = pathlib.Path(__file__).resolve().parent
ROOT = pathlib.Path('/tmp/expai-signup-successor-controls-20261005')
REPO = 'Roger-LegalEase/legalease-partner-dashboard-clean'
SOURCE = 'e3ac438da981c84987bd3172751e1a09e3f42309'
TIP = 'e0d5adb502542c6cf8309abfe886a2dd27f37fed'
TOOLS = 'bede772e9cf55b8ae2730a461f93e5ee8ae0a60b'
NATIVE = OUT / 'fly-identity-37393401639'

run = json.loads((NATIVE / 'run.json').read_text())
jobs = json.loads((NATIVE / 'jobs.json').read_text())
artifact = json.loads((NATIVE / 'artifacts.json').read_text())['artifacts'][0]
identity = json.loads((NATIVE / 'identity.json').read_text())
assert run['id'] == 37393401639 and run['head_sha'] == TIP
assert run['event'] == 'push' and run['status'] == 'completed' and run['conclusion'] == 'success'
assert run['path'] == '.github/workflows/rcap-worker-identity-readonly.yml'
assert len(jobs['jobs']) == 1
job = jobs['jobs'][0]
assert job['id'] == 112043548700 and job['run_id'] == run['id']
assert job['conclusion'] == 'success'
assert all(s['status'] == 'completed' and s['conclusion'] == 'success' for s in job['steps'])
assert artifact['id'] == 11381688723 and artifact['workflow_run']['head_sha'] == TIP
assert artifact['name'] == 'rcap-worker-readonly-identity-37393401639' and not artifact['expired']
assert identity['app'] == 'legalease-rcap-render-worker' and identity['readOnly']
assert identity['secretValuesIncluded'] is False and len(identity['machines']) == 1
machine = identity['machines'][0]
assert machine['id'] == 'd8de5e4f759278' and machine['state'] == 'started'
assert machine['imageReference'].endswith('@' + machine['imageDigest'])
assert machine['ociRevision'] == '5e04eafd7eaed7e71722862e651fb787ebbd296d'
assert machine['acceptedDigest'] == 'sha256:6b6a60fc5b2d0060028526013ce37c69f748e2cccb4cfb10943f2af6cf26cfe1'

def git(*args, cwd=ROOT):
    return subprocess.check_output(['git', *args], cwd=cwd).decode().strip()

assert git('status', '--porcelain') == '' and git('rev-parse', 'HEAD') == TIP
subprocess.run(['git', 'merge-base', '--is-ancestor', SOURCE, TIP], cwd=ROOT, check=True)
assert git('rev-list', '--parents', '-n', '1', SOURCE) == SOURCE + ' e312a5efa7b4882e0fbf61a5ff0ae7891ac23226'
assert git('status', '--porcelain', cwd=pathlib.Path('/tmp/expai-signup-production-20261005')) == ''
assert git('diff', '--name-only', SOURCE, TIP, '--', 'src', 'public', 'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts') == ''

report = {
    'status': 'BLOCKED BEFORE PUBLICATION: GitHub Actions dispatch denied',
    'capturedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'continues': 'control-preparation-result.json; preserved unchanged',
    'settingsEvidence': 'dashboard-push-safety-20261006.json (operator screenshot-derived, not API; no local images claimed)',
    'pushSafety': {
        'A_nativeAutomaticProductionDeployment': 'No: screenshot shows Production tracks main, not captain-release. Auto-assign production domains remains enabled and unchanged.',
        'B_previewCustomOrExplicitDeployment': 'Preview branch tracking displayed Disabled. Explicit manual/API deployment remains possible; none invoked by the exact matching repository push path. No matching custom environment shown in supplied evidence. No deployment command dispatched by this task.',
        'C_productionMutation': 'Only matching push workflow is reviewed GET-only Fly inspector; actual native steps succeeded. No workflow_run/deployment_status/repository_dispatch subscribers on default main or reviewed release tip. Effective package build next build, no root lifecycle hooks or repository Vercel override. Prior static generator/config inspection reused; no build executed to discover effects.',
        'dashboardChecks': 'No dashboard checks configured does not waive repository controls or baseline failures.'
    },
    'remote': {'repository': REPO, 'captainReleaseSha': TIP, 'previousSha': '121c889e15ac872e8dfbdeff18256551d15642aa',
               'update': 'Successful normal forward-only push; no main push, merge into application, or force push.',
               'originalSourceContained': True},
    'applicationSha': SOURCE, 'applicationParent': 'e312a5efa7b4882e0fbf61a5ff0ae7891ac23226',
    'workerSourceSha': SOURCE, 'workerDigest': None,
    'workerInputFingerprint': 'sha256:82d31e68a0edb0557bc9c2f9fce041e6760dd771ab02dc3b385e77235f99f867',
    'reviewedControlSha': TOOLS, 'workflowExecutionRef': TIP, 'releaseRecordSha': TIP,
    'mergeSha': 'cea24d73becc8c1d96485ad708b9411df8855a80',
    'binding': 'Verified pending binding, current:false, productionAuthorized:false, digest:null; records unchanged. All 39 canonical inputs equal unchanged source; only the two reviewed signup runtime paths differ from accepted worker. Completed tests/browser/control review reused.',
    'publication': {'dispatchAttemptedOnce': True, 'workflow': 'publish-rcap-render-worker.yml', 'ref': TIP,
        'inputs': {'integration_sha': SOURCE, 'tag_replacement_authorization': ''},
        'error': 'HTTP 403: Resource not accessible by integration (https://api.github.com/repos/Roger-LegalEase/legalease-partner-dashboard-clean/actions/workflows/332410995/dispatches)',
        'exitCode': 1, 'nativeRunId': None, 'buildStarted': False, 'imagePublished': False, 'retries': 0,
        'existingRunCheck': 'Checked before dispatch; latest publication remains historical run 36440421128 for 5e04eafd. Checked after denial; no new publication run exists.',
        'alternateConnectedCapability': 'Available GitHub app capabilities are GET/read and rerun; no workflow-dispatch alternative is exposed. No workaround workflow, auth change, or new credential requested.'},
    'imageAcceptance': {'executed': False, 'reason': 'No actual successor publication/digest exists; predecessor acceptance not copied.'},
    'materials': {'resolvedSuccessorMaterials': 'Not measured: no build started.', 'baseTag': 'node:22-slim (mutable)',
        'dockerfileLockfileWorkerLogicRuntimeDataChanged': False, 'dependencyUpgradeApproved': False},
    'flyReadback': {'runId': 37393401639, 'jobId': job['id'], 'artifactId': artifact['id'],
        'nativeRunConclusion': 'success', 'nativeSource': TIP, 'evidence': str(NATIVE), 'machine': machine,
        'rollbackImageIdentity': machine['imageReference'], 'rollbackMachineIdentity': machine['id'],
        'rollbackStatus': 'Current machine and immutable Fly image reference verified by actual GET. Registry pullability and Fly↔GHCR image-config/rootfs equivalence remain unverified; do not infer them from OCI label or acceptedDigest environment field.',
        'mappingInspection': 'Existing immutable config-ID comparison in scripts/rcap-production-worker-readiness.mjs and readWorkerImageProof in scripts/rcap-production-packet-canary-contract.mjs inspected. No matching native proof found in preserved current production artifact JSONs. No old production authorization reused and no deployment workflow invoked.'},
    'productionApplication': json.loads((OUT / 'production-readback-20261006.json').read_text()),
    'applicationRollbackTarget': 'dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc (still READY/current); rollback not used',
    'allRemainingActivationRequirements': [
        'Actions-write-authorized operator must dispatch existing publication exactly once at the recorded tooling ref, with fixed integration_sha and empty tag replacement authorization. Check existing run state first to avoid duplicates.',
        'Actual successful immutable publication, native evidence and resolved base/dependency-material comparison; any material drift requires disposition without implicitly approving an upgrade.',
        'Actual isolated image acceptance against returned digest, and evidence-driven advancement/verification of exact bindings.',
        'Fly/GHCR immutable config/rootfs mapping and pullable worker rollback target verification; re-read current application AND worker immediately before any later activation.',
        'Application/runtime publication/provider authority compatibility: fixed application retains historical publication/authority bytes; grade-a-admission.ts binds provider digest and exact publication hash. Any necessary authority transition is separately reviewed/authorized, not rewritten here.',
        'Existing hosted/production caller source/digest pins and CURRENT admission require a separately reviewed successor release stage; preparation binding intentionally remains non-dispatchable.',
        'Fresh exact tuple activation authorization and required hosted/release checks; never replay consumed historical authorization.',
        'Three original signup verifier failures remain baseline FAIL and unwaived. Three older control-fixture failures also reproduce on untouched tooling. No inspected publication/acceptance workflow enforces the original three; any controlling later gate still must be satisfied.'
    ],
    'smallestRequiredOperatorAction': ['gh', 'workflow', 'run', 'publish-rcap-render-worker.yml', '--repo', REPO, '--ref', TIP,
        '-f', 'integration_sha=' + SOURCE, '-f', 'tag_replacement_authorization='],
    'authorizationNeededNow': 'No new production authorization requested; the existing preparation authorization covers this exact dispatch. An operator with Actions write permission must perform it or provide an already-authorized execution path; no credential values in chat.',
    'productionActivation': False, 'workerDeployment': False, 'productionConfigurationOrCustomerDataChanged': False,
    'realProductionEmailDelivery': 'UNVERIFIED; no production authentication/email submission.'
}
(OUT / 'preparation-continuation-20261006.json').write_text(json.dumps(report, indent=2) + '\n')
paths = [OUT / 'preparation-continuation-20261006.json', OUT / 'dashboard-push-safety-20261006.json',
         OUT / 'production-readback-20261006.json', *sorted(NATIVE.iterdir())]
(OUT / 'CONTINUATION_SHA256_20261006.json').write_text(json.dumps({str(p.relative_to(OUT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths if p.is_file()}, indent=2) + '\n')
print('Native GET inspector evidence, remote containment, unchanged application, and exact remaining dispatch blocker recorded.')

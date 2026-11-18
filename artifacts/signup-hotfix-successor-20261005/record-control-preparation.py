"""Record completed local preparation; never publish, accept, or activate."""
import json
import pathlib
import subprocess
import hashlib
import datetime

ROOT = pathlib.Path('/tmp/expai-signup-successor-controls-20261005')
OUT = pathlib.Path(__file__).resolve().parent
BASE = '121c889e15ac872e8dfbdeff18256551d15642aa'
SOURCE = 'e3ac438da981c84987bd3172751e1a09e3f42309'
MERGE = 'cea24d73becc8c1d96485ad708b9411df8855a80'
CONTROL = 'bede772e9cf55b8ae2730a461f93e5ee8ae0a60b'
RECORD = 'e0d5adb502542c6cf8309abfe886a2dd27f37fed'

def git(*args, cwd=ROOT):
    return subprocess.check_output(['git', *args], cwd=cwd).decode().strip()

for name, before, after in [('integrated-reviewed-source.patch', BASE, MERGE),
                            ('reviewed-control.patch', MERGE, CONTROL),
                            ('pending-records.patch', CONTROL, RECORD)]:
    (OUT / name).write_bytes(subprocess.check_output(['git', 'diff', '--binary', before, after], cwd=ROOT))

binding = json.loads((OUT / 'final-local-binding.json').read_text())
assert binding['testedRecordRevision'] == RECORD
assert binding['binding']['bindingVerified'] and not binding['binding']['current']
assert binding['dispatchRefused'] and binding['controlsEquivalent']
assert git('status', '--porcelain') == ''
app_root = pathlib.Path('/tmp/expai-signup-production-20261005')
assert git('rev-parse', 'HEAD', cwd=app_root) == SOURCE
assert git('status', '--porcelain', cwd=app_root) == ''
assert git('rev-list', '--parents', '-n', '1', SOURCE) == SOURCE + ' e312a5efa7b4882e0fbf61a5ff0ae7891ac23226'
assert git('diff', '--name-only', SOURCE, RECORD, '--', 'src', 'public', 'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts') == ''
summary = {
    'status': 'BLOCKED BEFORE PUBLICATION',
    'capturedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'applicationSha': SOURCE, 'applicationParent': 'e312a5efa7b4882e0fbf61a5ff0ae7891ac23226',
    'workerSourceSha': SOURCE, 'workerDigest': None,
    'workerInputFingerprint': binding['sourceFingerprint'],
    'toolingBaseSha': BASE, 'mergeSha': MERGE, 'reviewedToolsSha': CONTROL,
    'releaseRecordSha': RECORD, 'localBranch': git('branch', '--show-current'),
    'worktree': str(ROOT), 'worktreeClean': True, 'applicationWorktreeCleanAndUnchanged': True,
    'changedPathsFromRemoteToolingBase': git('diff', '--name-only', BASE, RECORD).splitlines(),
    'controlPaths': git('diff', '--name-only', MERGE, CONTROL).splitlines(),
    'releaseRecordPaths': git('diff', '--name-only', CONTROL, RECORD).splitlines(),
    'containment': {'sourceIsAncestorOfLocalReleaseTip': subprocess.run(['git', 'merge-base', '--is-ancestor', SOURCE, RECORD], cwd=ROOT).returncode == 0,
                    'remoteCaptainReleaseLastRead': BASE, 'remoteMainLastRead': 'a3d4587b0fbbbfa887c78372afbfdb8824906333',
                    'remoteUpdated': False, 'allowlistAndAncestryGuardUnchanged': True,
                    'tagOverwriteGuardsUnchanged': True, 'dispatchIntegrationSha': SOURCE,
                    'tagReplacementAuthorization': ''},
    'tests': {'focusedControlSuite': {'passed': 4, 'failed': 0, 'syntheticNegativeRefusals': 57,
                'log': 'focused-pinned-lifecycle-final.log'},
              'originalCommittedPredecessorOwnContext': 'PASS, including original CURRENT release validator',
              'untouchedToolingHistoricalSuite': {'passed': 2, 'failed': 3,
                'log': 'historical-unmodified-control-baseline.log',
                'disposition': 'Three older af638 fixtures already fail STALE_APPLICATION_INPUTS on untouched 121c tooling; not repaired or waived. Current-generation positive and mutation tests pass.'},
              'historicalFixtureRerunNote': 'historical-pending-fixtures-corrected.log is retained from the running collector; despite its filename the temporary edits were reverted before that rerun. Tests are unchanged from 121c. Both old pending fixtures fail as on the baseline.',
              'scopedLint': 'exit 0: 0 errors, 3 warnings (2 unused imports in new test; 1 pre-existing unused import)',
              'syntaxAndWorkflowYaml': 'PASS', 'diffCheck': 'PASS', 'actualCommittedBinding': 'PASS, held; requireCurrentReleaseCandidate refused'},
    'review': {'kind': 'Independent read-only agent review', 'reviewer': '/root/control_review',
              'outcome': 'Approved nine-file controls, normal merge, GET-only trigger and three held pending records.',
              'executionLimit': 'Reviewer identity tests passed; reviewer Git subprocess tests hit EPERM. Final privileged local test runner results were provided separately; review is independent, test execution is primary-agent run.'},
    'publication': {'attempted': False, 'nativeRunId': None, 'digest': None},
    'imageAcceptance': {'attempted': False, 'nativeRunId': None, 'accepted': False},
    'materials': {'dockerfileAndLockfileChanged': False, 'base': 'node:22-slim (mutable)',
                  'resolvedSuccessorMaterials': 'UNMEASURED; no build attempted', 'driftDisposition': 'UNKNOWN; no upgrade approved'},
    'productionApplication': {'hostnameRead': 'expungement.ai', 'deploymentId': 'dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc',
               'applicationSha': 'e312a5efa7b4882e0fbf61a5ff0ae7891ac23226', 'state': 'READY',
               'rollbackTarget': 'dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc', 'rollbackUsed': False},
    'productionWorker': {'app': 'legalease-rcap-render-worker', 'actualIdentity': 'UNKNOWN', 'rollbackTarget': 'UNKNOWN',
                'inspection': 'Reviewed GET-only runner workflow prepared, not pushed/executed. Local Fly token/CLI absent; GitHub secret-name listing returned HTTP 403 Resource not accessible by integration; no retry.'},
    'pushSafety': {'githubWorkflowResult': 'No existing push workflow matches exact captain-release update; new identity workflow performs only fixed GET and artifact upload.',
              'vercelRawReadAccess': {'vercelExecutable': None, 'localVercelBinary': False, 'existingToken': False, 'existingCliAuthFiles': False, 'npxCache': False},
              'connectedRepository': 'Roger-LegalEase/legalease-partner-dashboard-clean (connector and operator readback)',
              'productionBranch': 'UNKNOWN', 'gitDeploymentSettings': 'UNKNOWN', 'automaticDomainAssignment': 'UNKNOWN',
              'projectBuildInstallIgnoredBuildOverrides': 'UNKNOWN',
              'repositoryBuildInspection': 'package build is next build; no root install/prebuild/postbuild/prepare hooks. Next config authority tracing and static footer pages use local filesystem reads. Content prerender helpers select published content; mutation helpers exist separately and are not called by inspected static generators. No build executed.',
              'canCreateOrPromoteProduction': 'UNKNOWN; cannot push', 'canBuildPreviewOrCustomEnvironment': 'UNKNOWN',
              'canWriteProduction': 'Repository push workflows do not; project override/environment/build effects remain UNKNOWN',
              'smallestRequiredReadback': 'Settings → Environments → Production → Branch Tracking screenshot, plus Git automatic-deployment/domain-assignment and Build & Deployment build/install/ignored-build overrides, with sensitive values redacted.'},
    'remainingActivationRequirements': [
        'Establish Vercel push-safety settings before remote history update; no permission replay or assumption from omitted fields/live:false.',
        'Forward-only remote containment update, actual one-image publication, native artifact/run/source/digest evidence and resolved material comparison.',
        'Actual isolated acceptance against returned digest with reviewed control/run identities and immutable evidence.',
        'Live Fly machine identity and immutable Fly↔GHCR config/rootfs mapping; verified distinct worker rollback target.',
        'Application/runtime publication and fulfillment/provider authority compatibility: src/lib/rcap/fulfillment/grade-a-admission.ts binds image/source/provider digest and publication-evidence hash. Fixed application retains historical bytes; successor tooling evidence differs. Any separate authority transition needs explicit review/authorization, not altered approvals here.',
        'Existing hosted/production workflow accepted-source/digest pins and requireCurrentReleaseCandidate admission must be reconciled through separately reviewed successor authority. Current preparation deliberately remains non-CURRENT/non-dispatchable.',
        'Fresh exact tuple authorization, hosted/release checks and immediately current application AND worker rollback readbacks; consumed historical authorization cannot replay.',
        'Three original signup baseline verifier failures remain failed and unwaived. No inspected publication/image acceptance workflow enforces them; if a later controlling gate requires them it remains a blocker.'
    ],
    'signupEvidenceReused': '/workspaces/legalease-partner-dashboard-clean/artifacts/signup-hotfix-production-20261005/verification.txt (same fixed source, 12 tests and four actual mocked-auth browser runs/screenshots)',
    'realProductionEmailDelivery': 'UNVERIFIED; no production authentication/email submission occurred',
    'remoteWrites': False, 'productionMutation': False, 'priorProductionAuthorizationUsed': False,
    'smallestNextAction': 'Provide the specific redacted Vercel settings readback. Existing preparation authorization remains sufficient after safety is established; no activation authorization is requested.'
}
(OUT / 'control-preparation-result.json').write_text(json.dumps(summary, indent=2) + '\n')
files = ['control-preparation-result.json', 'final-local-binding.json', 'focused-pinned-lifecycle-final.log',
         'historical-unmodified-control-baseline.log', 'historical-pending-fixtures-corrected.log',
         'integrated-reviewed-source.patch', 'reviewed-control.patch', 'pending-records.patch']
(OUT / 'CONTROL_PREPARATION_SHA256.json').write_text(json.dumps({f: hashlib.sha256((OUT/f).read_bytes()).hexdigest() for f in files}, indent=2) + '\n')
print(json.dumps({'status': summary['status'], 'applicationSha': SOURCE, 'toolsSha': CONTROL, 'recordsSha': RECORD,
                  'record': str(OUT / 'control-preparation-result.json')}, indent=2))

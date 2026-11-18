"""Local only. Synthetic lifecycle fixtures are not native release evidence."""
import json
import pathlib
import subprocess
import tempfile
import shutil

ROOT = pathlib.Path('/tmp/expai-signup-successor-controls-20261005')
OUT = pathlib.Path(__file__).resolve().parent
BASE = '121c889e15ac872e8dfbdeff18256551d15642aa'

def run(name, argv, cwd):
    result = subprocess.run(argv, cwd=cwd, capture_output=True, text=True)
    (OUT / (name + '.log')).write_text(result.stdout + result.stderr)
    return {'name': name, 'exitCode': result.returncode, 'command': argv,
            'cwd': str(cwd), 'log': str(OUT / (name + '.log'))}

results = []
with tempfile.TemporaryDirectory(prefix='rcap-control-baseline-') as directory:
    baseline = pathlib.Path(directory)
    subprocess.run(['git', 'clone', '--quiet', '--shared', '--no-checkout', str(ROOT), directory], check=True)
    subprocess.run(['git', 'checkout', '--quiet', '--detach', BASE], cwd=baseline, check=True)
    (baseline / 'node_modules').symlink_to((ROOT / 'node_modules').resolve())
    results.append(run('historical-unmodified-control-baseline', ['node', '--test',
        'scripts/grade-a-launch-control/verify-pending-worker-successor.test.mjs',
        'scripts/grade-a-launch-control/accepted-successor-binding.test.mjs'], baseline))
results.append(run('focused-pinned-lifecycle-final', ['node', '--test',
    'scripts/grade-a-launch-control/verify-pinned-worker-successor.test.mjs',
    'scripts/rcap-worker-identity-readonly.test.mjs'], ROOT))
(OUT / 'control-check-results.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results, indent=2))
if any(r['exitCode'] for r in results if r['name'] != 'historical-unmodified-control-baseline'):
    raise SystemExit(1)

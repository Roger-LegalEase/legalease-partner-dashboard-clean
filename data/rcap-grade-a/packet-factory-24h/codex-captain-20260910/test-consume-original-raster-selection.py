"""Exercise the actual selection guard without executing network or custody writes."""
import ast, copy, pathlib
source = pathlib.Path(__file__).with_name('consume-original-raster.py')
tree = ast.parse(source.read_text())
fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'validate_selection')
namespace = {}
exec(compile(ast.Module(body=[fn], type_ignores=[]), str(source), 'exec'), namespace)
validate = namespace['validate_selection']
controls = ['Synthetic canary and live negative controls', 'Plan the family matrix']
run = {'path': '.github/workflows/rcap-packet-raster-acceptance-batch.yml', 'status': 'in_progress', 'conclusion': None}
jobs = {'total_count': 4, 'jobs': [{'name': n, 'status': 'completed', 'conclusion': 'success'} for n in controls + ['A', 'B']]}
jobs['jobs'][-1].update(status='in_progress', conclusion=None)
checks = []
def check(name, expected, mutate=lambda r,j: None, selected=None, partial=True):
    r,j = copy.deepcopy(run),copy.deepcopy(jobs)
    mutate(r,j)
    try:
        validate(r,j,['A','B'], ['A'] if selected is None else selected, partial)
        passed = True
    except AssertionError:
        passed = False
    assert passed == expected, name
    checks.append(name)
check('passed selected sibling while other renders', True)
check('whole run cannot admit while rendering', False, selected=['A','B'], partial=False)
check('selected job still rendering', False, selected=['B'])
check('selected failure refused', False, lambda r,j:j['jobs'][2].update(conclusion='failure'))
check('selected cancelled refused', False, lambda r,j:j['jobs'][2].update(conclusion='cancelled'))
check('canary failure refused', False, lambda r,j:j['jobs'][0].update(conclusion='failure'))
check('matrix incomplete refused', False, lambda r,j:j['jobs'][1].update(status='in_progress', conclusion=None))
check('missing canary refused', False, lambda r,j:j['jobs'].pop(0))
check('unknown selected family refused', False, selected=['C'])
check('duplicate selected family refused', False, selected=['A','A'])
check('empty selection refused', False, selected=[])
check('different workflow refused', False, lambda r,j:r.update(path='untrusted.yml'))
check('duplicate job name refused', False, lambda r,j:j['jobs'][-1].update(name='A'))
check('missing matrix member refused', False, lambda r,j:(j['jobs'].pop(),j.update(total_count=3)))
check('passed sibling survives unrelated packet failure', True, lambda r,j:(r.update(status='completed',conclusion='failure'),j['jobs'][-1].update(status='completed',conclusion='failure')))
check('whole failed batch refused', False, lambda r,j:(r.update(status='completed',conclusion='failure'),j['jobs'][-1].update(status='completed',conclusion='failure')), selected=['A','B'], partial=False)
check('whole completed pass accepted', True, lambda r,j:(r.update(status='completed',conclusion='success'),j['jobs'][-1].update(status='completed',conclusion='success')), selected=['A','B'], partial=False)
check('queued run refused', False, lambda r,j:r.update(status='queued'))
print(f'PASS {len(checks)} actual selection guard controls; PDF, artifact, job-log and PNG verification unchanged')

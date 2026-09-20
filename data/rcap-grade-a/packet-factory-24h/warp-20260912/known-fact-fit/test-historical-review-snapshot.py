"""A copied historical FAIL cannot silently change its old-byte identity."""
import contextlib, io, json, pathlib, runpy, sys
from unittest.mock import patch

script='data/rcap-grade-a/packet-factory-24h/seven-cleared-20260911/verify-closure.py'
target=pathlib.Path('data/rcap-grade-a/packet-factory-24h/warp-20260912/known-fact-fit/review/historical-lineage-nm_conviction-set.json')
original=pathlib.Path.read_text
body=original(target)
mutant=json.loads(body)
mutant['previousRowPreserved']['artifactsRead'][1]['sha256']='0'*64

def read_text(self,*args,**kwargs):
    return json.dumps(mutant) if self==target else original(self,*args,**kwargs)

output=io.StringIO()
with patch.object(pathlib.Path,'read_text',read_text), patch.object(sys,'argv',[script,'--require-terminal']), contextlib.redirect_stdout(output):
    try:
        runpy.run_path(script,run_name='__main__')
    except SystemExit as exc:
        assert exc.code==1,exc.code
    else:
        raise AssertionError('Altered historical snapshot admitted')
result=json.loads(output.getvalue())
assert 'historical FAIL snapshot differs from its native return' in result['failures']
assert 'historical PDF differs at review commit' in result['failures']
assert original(target)==body
print(json.dumps({'status':'PASS','negativeControls':1,'failedForBothRequiredReasons':True,'repositoryBytesWritten':0},indent=2))

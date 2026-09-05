#!/usr/bin/env python3
import hashlib,json,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]; OUT=ROOT/'data/rcap-grade-a/codex-max/source-and-candidate/src-x7'
for p in list(OUT.rglob('*.json')): json.loads(p.read_text())
r=json.loads((OUT/'source-relationship-rows.json').read_text()); assert r['attempted']==15 and len(r['rows'])==15
u=json.loads((OUT/'corroborated-urls.json').read_text())['urls']
assert len({x['normalizedUrl'] for x in u})==len(u)
for x in u: assert int.from_bytes(hashlib.sha256(x['normalizedUrl'].encode()).digest()[:8],'big')%8==6
m=json.loads((OUT/'candidates/nj_disorderly_persons-set/binary-manifest.json').read_text())
with tempfile.TemporaryDirectory() as td:
 for a in m['artifacts']:
  inp=OUT/'candidates/nj_disorderly_persons-set'/a['input']; one=Path(td)/('1-'+a['kind']+'.pdf'); two=Path(td)/('2-'+a['kind']+'.pdf')
  for dest in (one,two): subprocess.run([str(ROOT/m['generator']),str(inp),str(dest)],check=True,stdout=subprocess.DEVNULL)
  b=one.read_bytes(); assert b==two.read_bytes() and len(b)==a['expectedByteLength'] and hashlib.sha256(b).hexdigest()==a['expectedSha256']
assert not list(OUT.rglob('*.pdf'))
print('SRC_X7_VERIFY_PASS')

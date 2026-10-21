from pathlib import Path
import json,hashlib,subprocess
root=Path('/tmp/codex-fix83-20260906');base=json.loads((root/'baseline-hashes.json').read_text());rows=[];granted={'ut_pet_dismissed_with_prejudice-set','ut_pet_no_charges-set','ut_pet_limitations-set','ut_pet_dismissed_without_prejudice-set'}
for name,old in base.items():
 p=Path(name);now={str(f.relative_to(p)):hashlib.sha256(f.read_bytes()).hexdigest() for f in p.rglob('*') if f.is_file()};changed=[k for k in sorted(set(old)|set(now)) if old.get(k)!=now.get(k)];rows.append({'directory':name,'changed':changed,'before':old,'after':now})
 if any(x in name for x in ['acquittal','conviction','traffic']):assert not changed
 for protected in ['source-receipt.json','field-census.census-v1.json','product-wiring.json','approval-request.json','build-status.json']:assert old[protected]==now[protected],protected
wave='data/rcap-grade-a/wave-2/p1-ut-petition-expunge-completeness/rows.json';before=json.loads(subprocess.check_output(['git','show','f8ecf9321:'+wave]));after=json.loads(Path(wave).read_text());a={r['itemId']:r for r in before['rows']};b={r['itemId']:r for r in after['rows']};changed=[k for k in set(a)|set(b) if a.get(k)!=b.get(k)];assert {k:v for k,v in before.items() if k!='rows'}=={k:v for k,v in after.items() if k!='rows'};assert set(changed)==granted
(root/'scope-comparison.json').write_text(json.dumps({'families':rows,'legacyGeneratorRowsChanged':sorted(changed),'legacyTopLevelMetadataUnchanged':True},indent=2)+'\n');print('All three ungranted siblings and protected inputs unchanged; default generator rows changed exactly four granted families.')

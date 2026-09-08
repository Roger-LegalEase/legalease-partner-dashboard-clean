#!/usr/bin/env python3
"""Two complete family CLI builds; byte equality of every generated family file.
No global queues or shared status files are written. Not independent acceptance.
"""
import argparse,hashlib,json,pathlib,subprocess,time
ROOT=pathlib.Path(__file__).resolve().parents[3]
FAMILY='mo-575-120-identity-theft-correction-set'
OUT=ROOT/'data/rcap-all50/overlays/census-v1/mo'/f'{FAMILY}--official-pdf-fill'
EVIDENCE=ROOT/'data/rcap-grade-a/chat-parallel-2026-09-07/chat7-build'/FAMILY

def inventory():
    return {str(p.relative_to(OUT)):{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in sorted(OUT.rglob('*')) if p.is_file()}

def main():
    EVIDENCE.mkdir(parents=True,exist_ok=True)
    cmd=['node',f'scripts/build-census-v1-{FAMILY}.mjs','--no-raster']
    parser=argparse.ArgumentParser();parser.add_argument("--run",type=int,choices=[1,2]);args=parser.parse_args()
    runs=[]
    for i in ([args.run-1] if args.run else range(2)):
        start=time.monotonic();run=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=180)
        (EVIDENCE/f'full-build-{i+1}.stdout.log').write_text(run.stdout)
        (EVIDENCE/f'full-build-{i+1}.stderr.log').write_text(run.stderr)
        if run.returncode:raise RuntimeError(f'full build {i+1} failed: {run.returncode}: {run.stderr}')
        record={'command':cmd,'exitCode':run.returncode,'elapsedSeconds':round(time.monotonic()-start,3),'files':inventory()}
        (EVIDENCE/f'full-build-{i+1}.inventory.json').write_text(json.dumps(record,indent=2)+'\n')
        runs.append(record)
        time.sleep(1.2)
    if args.run==1:
        print(json.dumps({"run":1,"exitCode":runs[0]["exitCode"],"files":len(runs[0]["files"])}));return
    if args.run==2:
        runs=[json.loads((EVIDENCE/"full-build-1.inventory.json").read_text()),runs[0]]
    mismatch=[name for name in sorted(set(runs[0]['files'])|set(runs[1]['files'])) if runs[0]['files'].get(name)!=runs[1]['files'].get(name)]
    result={'familyId':FAMILY,'method':'Two actual complete CLI renders with separate fresh component caches, native complete-PDF inspections and shared auditFamily; exact file names and SHA-256 comparisons.','runs':runs,'fileCount':len(runs[1]['files']),'identical':not mismatch,'mismatches':mismatch,'independentApproval':False}
    (EVIDENCE/'reproducibility.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'fileCount':result['fileCount'],'identical':result['identical'],'mismatches':mismatch,'exits':[r['exitCode'] for r in runs]}))
    if mismatch:raise SystemExit(1)
if __name__=='__main__':main()

#!/usr/bin/env python3
"""Install only checksum-bound Chat7 mistaken-identity candidate files.
Checks the entire plan before writing. Identical committed files are skipped;
only an absent path or the exact recorded amendment bytes can be replaced.
This is publication transport, not a renderer or approval mechanism.
"""
import argparse, hashlib, json, os, tempfile
from pathlib import Path, PurePosixPath

FAMILY='data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/'
PREFIXES=(FAMILY,'scripts/rcap-packet-recovery/chat7/','data/rcap-grade-a/chat-parallel-2026-09-07/chat7-build/','docs/rcap/grade-a/chat-parallel-2026-09-07/chat7-build/')
SOURCES={f'reference/chat-parallel-2026-09-07/chat7/{n}.pdf' for n in ('CR301','CR311','FI-05')}
WRAPPER='scripts/build-census-v1-mo-610-145-mistaken-identity-set.mjs'
def sha(data): return hashlib.sha256(data).hexdigest()
def check_path(name):
    p=PurePosixPath(name)
    if p.is_absolute() or '..' in p.parts or '\\' in name or not (name in SOURCES or name==WRAPPER or any(name.startswith(x) for x in PREFIXES)):
        raise ValueError(f'OUTSIDE_OWNERSHIP: {name}')
    return p

def install(bundle, target, apply=False):
    bundle=Path(bundle).resolve(); target=Path(target).resolve()
    manifest=json.loads((bundle/'PUBLICATION-MANIFEST.json').read_text())
    if manifest.get('familyId')!='mo-610-145-mistaken-identity-set': raise ValueError('WRONG_FAMILY')
    plan=[];seen=set()
    for item in manifest['entries']:
        name=item['path'];check_path(name)
        if name in seen: raise ValueError('DUPLICATE_PATH')
        seen.add(name);src=bundle/'payload'/name;dest=target/name
        for path,root in ((src,bundle),(dest,target)):
            cursor=path
            while cursor!=root:
                if cursor.is_symlink(): raise ValueError(f'SYMLINK_REFUSED: {name}')
                cursor=cursor.parent
        data=src.read_bytes()
        if sha(data)!=item['sha256'] or len(data)!=item['bytes']: raise ValueError(f'PAYLOAD_MISMATCH: {name}')
        current=sha(dest.read_bytes()) if dest.is_file() else None
        if current==item['sha256']: disposition='SKIP_IDENTICAL'
        elif current is None: disposition='CREATE'
        elif current in item.get('acceptedBeforeSha256',[]): disposition='REPLACE_EXACT_AMENDMENT'
        else: raise ValueError(f'CONFLICT_NO_FILES_WRITTEN: {name}')
        plan.append((item,dest,data,disposition))
    if apply:
        for item,dest,data,action in plan:
            if action=='SKIP_IDENTICAL': continue
            dest.parent.mkdir(parents=True,exist_ok=True)
            fd,tmp=tempfile.mkstemp(prefix='.chat7-install-',dir=dest.parent)
            try:
                with os.fdopen(fd,'wb') as f:f.write(data)
                os.replace(tmp,dest)
            finally:
                if os.path.exists(tmp):os.unlink(tmp)
        for item,dest,_,_ in plan:
            if sha(dest.read_bytes())!=item['sha256']:raise ValueError(f'READBACK_MISMATCH: {item["path"]}')
    result={'mode':'APPLIED_AND_HASH_VERIFIED' if apply else 'CHECK_ONLY','files':len(plan),'counts':{s:sum(x[3]==s for x in plan) for s in ('SKIP_IDENTICAL','CREATE','REPLACE_EXACT_AMENDMENT')},'approval':False}
    return result
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--target',type=Path,required=True);p.add_argument('--apply',action='store_true');a=p.parse_args()
    print(json.dumps(install(a.bundle,a.target,a.apply),indent=2))

#!/usr/bin/env python3
"""Exact-byte Chat7 identity-theft publication, never rendering or admission.
Validate the complete payload and read-only prerequisites before any write.
Skip identical committed files; refuse every unrecognized existing version.
"""
import argparse,hashlib,json,os,tempfile
from pathlib import Path,PurePosixPath
FAMILY='mo-575-120-identity-theft-correction-set'
OUT=f'data/rcap-all50/overlays/census-v1/mo/{FAMILY}--official-pdf-fill/'
E=f'data/rcap-grade-a/chat-parallel-2026-09-07/chat7-build/{FAMILY}/'
D=f'docs/rcap/grade-a/chat-parallel-2026-09-07/chat7-build/{FAMILY}/'
L='scripts/rcap-packet-recovery/chat7/'
S='reference/chat-parallel-2026-09-07/chat7/'
SOURCE_NAMES={'CR300.pdf','CR310.pdf','FI-05.pdf','GN10.docx','GN10-derived.pdf','GN10-conversion.json'}
def sha(b):return hashlib.sha256(b).hexdigest()
def lexical(name):
    p=PurePosixPath(name)
    if not name or p.is_absolute() or '..' in p.parts or '\\' in name or str(p)!=name:raise ValueError('UNSAFE_PATH: '+name)
    return p

def allowed(name):
    lexical(name)
    return name.startswith((OUT,E,D)) or name==f'scripts/build-census-v1-{FAMILY}.mjs' or (name.startswith(L) and '/' not in name[len(L):] and (name[len(L):].startswith('identity-theft') or name[len(L):]=='install-identity-theft.py')) or name in {S+n for n in SOURCE_NAMES}

def safe(root,name):
    p=root/lexical(name)
    cursor=p
    while cursor!=root:
        if cursor.is_symlink():raise ValueError('SYMLINK_REFUSED: '+name)
        cursor=cursor.parent
    return p

def install(bundle,target,apply=False):
    bundle=Path(bundle).resolve();target=Path(target).resolve();m=json.loads((bundle/'PUBLICATION-MANIFEST.json').read_text())
    if m.get('familyId')!=FAMILY:raise ValueError('WRONG_FAMILY')
    for item in m.get('prerequisites',[]):
        p=safe(target,item['path'])
        if not p.is_file() or sha(p.read_bytes())!=item['sha256']:raise ValueError('PREREQUISITE_MISMATCH: '+item['path'])
    seen=set();plan=[]
    for item in m['entries']:
        name=item['path']
        if not allowed(name):raise ValueError('OUTSIDE_OWNERSHIP: '+name)
        if name in seen:raise ValueError('DUPLICATE_PATH: '+name)
        seen.add(name);src=safe(bundle/'payload',name);dest=safe(target,name);data=src.read_bytes()
        if len(data)!=item['bytes'] or sha(data)!=item['sha256']:raise ValueError('PAYLOAD_MISMATCH: '+name)
        if dest.exists() and not dest.is_file():raise ValueError('NOT_A_FILE: '+name)
        before=sha(dest.read_bytes()) if dest.is_file() else None
        if before==item['sha256']:action='SKIP_IDENTICAL'
        elif before is None:action='CREATE'
        else:raise ValueError('CONFLICT_NO_WRITES: '+name)
        plan.append((item,dest,data,before,action))
    if apply:
        for item,dest,data,before,action in plan:
            safe(target,item['path'])
            now=sha(dest.read_bytes()) if dest.is_file() else None
            if now!=before:raise ValueError('CONCURRENT_CHANGE: '+item['path'])
            if action=='SKIP_IDENTICAL':continue
            dest.parent.mkdir(parents=True,exist_ok=True);fd,tmp=tempfile.mkstemp(prefix='.chat7-',dir=dest.parent)
            try:
                with os.fdopen(fd,'wb')as stream:stream.write(data)
                os.replace(tmp,dest)
            finally:
                if os.path.exists(tmp):os.unlink(tmp)
        for item,dest,_,_,_ in plan:
            if sha(dest.read_bytes())!=item['sha256']:raise ValueError('READBACK_MISMATCH: '+item['path'])
    return {'mode':'APPLIED_AND_REHASHED'if apply else'CHECK_ONLY','files':len(plan),'create':sum(r[4]=='CREATE'for r in plan),'skipIdentical':sum(r[4]=='SKIP_IDENTICAL'for r in plan),'prerequisites':len(m.get('prerequisites',[])),'approval':False}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--target',type=Path,required=True);p.add_argument('--apply',action='store_true');a=p.parse_args();print(json.dumps(install(a.bundle,a.target,a.apply),indent=2))

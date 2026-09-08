#!/usr/bin/env python3
"""Refresh whole-registry identities only after every explicitly bound track is unchanged."""
import argparse, copy, hashlib, json, pathlib, re, subprocess
REGISTRY = 'data/record-clearing/legal-design-track-registry.json'
SHA = lambda b: hashlib.sha256(b).hexdigest()

def refresh(receipt, family, before_bytes, after_bytes, before_commit):
    if family.get('state') != 'COMPLETE_PACKET_PROVEN':
        raise ValueError('Only previously proven, unchanged families may use this identity refresh')
    if receipt.get('familyId') != family.get('familyId'):
        raise ValueError('Receipt/family mismatch')
    if sorted(receipt.get('routeKeys', [])) != sorted(family.get('routeKeys', [])) or not family.get('routeKeys'):
        raise ValueError('Missing or different route scope')
    before, after = json.loads(before_bytes), json.loads(after_bytes)
    if {k:v for k,v in before.items() if k != 'tracks'} != {k:v for k,v in after.items() if k != 'tracks'}:
        raise ValueError('Global registry metadata changed')
    def index(doc):
        rows = doc['tracks']; out = {r['trackId']: r for r in rows}
        if len(out) != len(rows): raise ValueError('Duplicate registry track')
        return out
    old, new = index(before), index(after)
    records = [r for r in receipt.get('committedRecords', []) if r.get('pathInRepository') == REGISTRY]
    if len(records) != 1: raise ValueError('Expected one explicit committed registry binding')
    rec = records[0]
    if rec.get('sha256') != SHA(before_bytes) or rec.get('byteLength') != len(before_bytes):
        raise ValueError('Existing receipt does not match recovered historical registry bytes')
    matched = re.fullmatch(r'(?:legal-design-track-registry|track-registry):([^:]+)', str(rec.get('recordId', '')))
    if not matched: raise ValueError('No explicit track identity')
    ids = matched.group(1).split('+')
    if not ids or len(ids) != len(set(ids)): raise ValueError('Ambiguous track identity')
    for route in family['routeKeys']:
        if not any(':'+track+':' in route or route.endswith(':'+track) for track in ids):
            raise ValueError('Route not covered by declared track anchors')
    for track in ids:
        if track not in old or track not in new or old[track] != new[track]:
            raise ValueError('Bound track missing or changed: '+track)
    result = copy.deepcopy(receipt)
    target = next(r for r in result['committedRecords'] if r.get('pathInRepository') == REGISTRY)
    anchors = {key: SHA(json.dumps(old[key], sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()) for key in ids}
    target['identityRefresh'] = {
        'refreshedOn': '2026-09-07',
        'was': {'sha256': rec['sha256'], 'byteLength': rec['byteLength']},
        'recoveredFromCommit': before_commit,
        'previousIdentityRefresh': copy.deepcopy(rec.get('identityRefresh')),
        'anchorsCompared': len(ids), 'anchorsIdentical': len(ids),
        'trackIds': ids, 'identicalTrackSha256': anchors,
        'why': 'Every explicitly bound full track object was compared with the exact historical registry bytes and is unchanged. Only the unrelated whole-file identity is refreshed; packet, source selection and review disposition are untouched.'
    }
    target['sha256'] = SHA(after_bytes); target['byteLength'] = len(after_bytes)
    return result

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--base', required=True);ap.add_argument('--out', required=True);a=ap.parse_args()
    if not re.fullmatch('[0-9a-f]{40}', a.base): raise ValueError('An immutable base commit is required')
    root=pathlib.Path(subprocess.check_output(['git','rev-parse','--show-toplevel'],text=True).strip())
    show=lambda p:subprocess.check_output(['git','show',a.base+':'+p],cwd=root)
    before_bytes=show(REGISTRY);after_bytes=(root/REGISTRY).read_bytes()
    if before_bytes==after_bytes: raise ValueError('No registry identity change to reconcile')
    master=json.loads(show('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json'))
    pending=[]
    for family in master['families']:
        if family['state']!='COMPLETE_PACKET_PROVEN':continue
        rel=family['directory']+'/source-receipt.json';p=root/rel
        if not p.exists():continue
        raw=p.read_bytes();receipt=json.loads(raw)
        records=[r for r in receipt.get('committedRecords',[]) if r.get('pathInRepository')==REGISTRY]
        if not records:continue
        if raw!=show(rel):raise ValueError('Current receipt differs from baseline: '+rel)
        dirty=subprocess.check_output(['git','diff','--name-only',a.base,'--',family['directory'],family.get('buildScript') or family['directory']],cwd=root,text=True)
        if dirty.strip(): raise ValueError('Family inputs changed: '+dirty)
        result=refresh(receipt,family,before_bytes,after_bytes,a.base)
        encoded=(json.dumps(result,indent=2,ensure_ascii=False)+'\n').encode()
        pending.append((rel,raw,encoded,result))
    if len(pending)!=15: raise ValueError('Expected precisely the fifteen measured affected receipts; got '+str(len(pending)))
    # Validate every receipt first. No partially validated refresh is written.
    rows=[]
    for rel,raw,encoded,result in pending:
        (root/rel).write_bytes(encoded)
        rec=next(r for r in result['committedRecords'] if r.get('pathInRepository')==REGISTRY)
        rows.append({'path':rel,'beforeSha256':SHA(raw),'afterSha256':SHA(encoded),'trackIds':rec['identityRefresh']['trackIds'],'anchorsCompared':rec['identityRefresh']['anchorsCompared']})
    out=pathlib.Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps({'status':'PASS','baselineCommit':a.base,'registryBeforeSha256':SHA(before_bytes),'registryAfterSha256':SHA(after_bytes),'receipts':rows,'packetBytesChanged':False,'newApproval':False},indent=2)+'\n')
    print('Refreshed exactly 15 whole-registry identities after comparing unchanged full track anchors; no new approval.')
if __name__=='__main__':main()

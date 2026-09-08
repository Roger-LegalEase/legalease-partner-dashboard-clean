#!/usr/bin/env python3
"""Consume specific measured completion evidence; never create packet approval."""
from __future__ import annotations
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys

BASE = 'cd32cb7b846e99bd19d3172467d81f566a420d12'
MANIFEST = 'data/record-clearing/legal-design-packet-set-manifests.json'
HOLD_FILE = 'data/rcap-grade-a/legal-decisions/LEGAL_HOLD_RECLASSIFICATION_2026-09-04.json'
OUT = Path('data/rcap-grade-a/completion-pass-2026-09-07')
NC = 'nc_146_dismissal_petition-set'
TARGETS = {
    'ak-mistaken-identity-set': 'ak/ak-mistaken-identity-set--official-pdf-fill',
    'ar-nonconviction-seal-set': 'ar/ar-nonconviction-seal-set--official-pdf-fill',
    'nc_145_5_felony-set': 'nc/nc-145-5-felony-set--official-pdf-fill',
    'nc_146_acquittal_petition-set': 'nc/nc-146-acquittal-petition-set--official-pdf-fill',
}

def require(condition, message):
    if not condition: raise RuntimeError(message)

def sha(data): return hashlib.sha256(data).hexdigest()
def encode(value): return (json.dumps(value, indent=2, ensure_ascii=False)+'\n').encode()
def git_bytes(path): return subprocess.check_output(['git','show',f'{BASE}:{path}'])

def exact_entry(document, family):
    rows = [r for r in document['packetSets'] if r['packetSetId'] == family]
    require(len(rows) == 1, f'Missing/ambiguous family anchor: {family}')
    return rows[0]

def compare_anchor(before, after, family):
    a, b = exact_entry(before, family), exact_entry(after, family)
    require(a == b, f'The actual bound family object changed: {family}')
    return sha(json.dumps(a,sort_keys=True,separators=(',',':')).encode())

def refresh_receipts():
    old_bytes, current_bytes = git_bytes(MANIFEST), Path(MANIFEST).read_bytes()
    old, current = json.loads(old_bytes), json.loads(current_bytes)
    changes, audit = {}, []
    for family, rel in TARGETS.items():
        directory = Path('data/rcap-all50/overlays/census-v1')/rel
        path = directory/'source-receipt.json'
        before, after = json.loads(git_bytes(path)), json.loads(path.read_bytes())
        anchor_hash = compare_anchor(old, current, family)
        old_pins = [r for r in before['committedRecords'] if r.get('pathInRepository') == MANIFEST]
        new_pins = [r for r in after['committedRecords'] if r.get('pathInRepository') == MANIFEST]
        require(len(old_pins) == len(new_pins) == 1, 'Unexpected receipt pin multiplicity')
        previous, pin = old_pins[0], new_pins[0]
        require(previous['sha256'] == sha(old_bytes), 'Old receipt does not pin comparison source')
        require(pin['sha256'] == sha(current_bytes) and pin['byteLength'] == len(current_bytes), 'Current receipt is not exact')
        # No other source, field, role, attachment, or wording change is exempted.
        normalized = []
        for doc in (before, after):
            doc = copy.deepcopy(doc)
            for rec in doc['committedRecords']:
                if rec.get('pathInRepository') == MANIFEST:
                    for key in ['sha256','byteLength','identityRefresh']: rec.pop(key,None)
            normalized.append(doc)
        require(normalized[0] == normalized[1], f'Non-refresh receipt content changed: {family}')
        current_files = subprocess.check_output(['git','ls-files','-z','--',str(directory)]).decode().split('\0')
        checked = 0
        for name in current_files:
            if not name or Path(name).name in {'source-receipt.json','product-wiring.json'}: continue
            require(Path(name).read_bytes() == git_bytes(name), f'Family output changed: {name}')
            checked += 1
        pin['identityRefresh'] = {
            'refreshedOn':'2026-09-07',
            'was':{'sha256':sha(old_bytes),'byteLength':len(old_bytes)},
            'why':'The NC dismissal integration changed a shared manifest. This exact family object and every non-bookkeeping family file were recomputed and remain identical. Repair the refresh metadata to the existing anchorsCompared/anchorsIdentical contract; no source or packet is re-bound.',
            'anchorsCompared':1, 'anchorsIdentical':1,
            'previousPinLastSeenAtCommit':BASE,
            'exactFamilyObjectSha256':anchor_hash,
        }
        changes[path] = encode(after)
        audit.append(dict(familyId=family,anchorsCompared=1,anchorsIdentical=1,exactFamilyObjectSha256=anchor_hash,unchangedFamilyFiles=checked))
    # Prove that the very NC entry that DID change cannot use this exemption.
    try: compare_anchor(old,current,NC)
    except RuntimeError: pass
    else: raise RuntimeError('The changed NC family incorrectly qualified for identity-refresh exemption')
    for family in TARGETS:
        changed = copy.deepcopy(current);exact_entry(changed,family)['version'] += '-MUTATED'
        try: compare_anchor(old,changed,family)
        except RuntimeError: continue
        raise RuntimeError('A changed source anchor was accepted')
    return changes, dict(comparisonBase=BASE,manifestPath=MANIFEST,beforeSha256=sha(old_bytes),afterSha256=sha(current_bytes),families=audit,changedAnchorNegativeControlsCaught=5,noNewIndependentApproval=True)

def stage_nc_reread():
    owner_path='data/record-clearing/legal-decisions/2026-09-06-owner-relayed-research-batch-04.json'
    owner=json.loads(Path(owner_path).read_text()); entry=next(r for r in owner['entries'] if r['family']==NC)
    require('AOC-G-106' in entry['applied'] and 'independent' in entry['stillOwed'], 'Owner research contract missing')
    held=Path('reference/north-carolina/AOC-G-106-2024-11.pdf')
    require(sha(held.read_bytes())=='0fe2360719b3b7c05554c686189026ef9a3a99c347d22e653aa1c8c3255a83fd','G-106 custody mismatch')
    directory='data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill'
    report=json.loads(Path(directory+'/reports/rendered-artifacts.json').read_text())
    require(len(report['pdfs'])==10,'Missing NC diagnostic/branch outputs')
    for pdf in report['pdfs']: require(sha(Path(pdf['file']).read_bytes())==pdf['sha256'],'NC output drift')
    record={
        'familyId':NC,'disposition':'POST_REPAIR_REREAD_REQUIRED',
        'priorLegalBasis':'LANE_RETURN_BLOCKED_LEGAL_INPUT',
        'recordedBy':'ChatGPT completion integration; implementation of the existing owner-relayed contract, not a new owner/counsel decision',
        'legalInputAnsweredBy':{'decisionRecord':owner_path,'recordId':owner['recordId'],'relayedBy':'Roger Roman, 2026-09-06','isCounselApproval':False},
        'repairCommit':'00d2425ca20f03468523b5d3bfa00ada59d7d6c8',
        'repairEvidence':{'directory':directory,'officialSource':str(held),'sourceSha256':sha(held.read_bytes()),'renderedArtifacts':directory+'/reports/rendered-artifacts.json','regressionLog':'data/rcap-grade-a/completion-pass-2026-09-07/nc-regressions.log','passedChecks':19,'executedRun':'34112045004'},
        'priorIndependentVerdict':{'lane':'vf06','verdict':'BLOCKED_LEGAL_INPUT','evidencePath':'data/rcap-grade-a/packet-factory-24h/vf06/rows.json','failedRequirement':'AOC-CV-226 was incorrectly presented as the operative expunction indigency petition'},
        'nextState':'VERIFY_PENDING',
        'whyNotPass':'The exact AOC-G-106 is now held and delivered by the selected branch, satisfying the existing missing-instrument repair direction. The former VF06 finding remains in history and is NOT replaced with PASS. Current outputs must pass full central raster and a fresh independent fifteen-obligation reread. Fee-bearing deferred/conditional cases still stop for participant-specific legal review; no eligibility, indigency, execution, or delivery authority is inferred.',
    }
    target=Path(HOLD_FILE); data=json.loads(target.read_text()); found=[r for r in data['families'] if r['familyId']==NC]
    require(not found or found==[record],'Another NC disposition already exists')
    if not found:data['families'].append(record)
    return {target:encode(data)}

def main():
    changes, audit=refresh_receipts(); changes.update(stage_nc_reread())
    changes[OUT/'receipt-refresh-proof.json']=encode(audit)
    check='--check' in sys.argv
    for path, body in changes.items():
        if check: require(path.exists() and path.read_bytes()==body,f'Needs refresh: {path}')
        else: path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(body)
    print(json.dumps(dict(identityOnlyFamilies=4,changedAnchorControlsCaught=5,ncStatus='POST_REPAIR_REREAD_REQUIRED',newApprovals=0,checkOnly=check)))
if __name__=='__main__':main()

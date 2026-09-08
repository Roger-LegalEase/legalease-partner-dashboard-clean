#!/usr/bin/env python3
"""Exercise native byte-report controls against preserved complete candidates.
All mutations are isolated. No family builder, shared-reader write, or acceptance.
"""
from pathlib import Path
import argparse, collections, contextlib, copy, importlib.util, json, os
import shutil, subprocess, sys, tempfile
import fitz

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('mn_native', HERE / 'report-mn15218.py')
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


def snapshot(path):
    return {str(p.relative_to(path)): native.digest(p.read_bytes()) for p in sorted(path.rglob('*')) if p.is_file()}


def dump(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def reassemble(family, variant):
    """Rehash all real components and the whole packet; never accept a stale-hash refusal."""
    inv = native.load(family / 'packet-inventory.json')
    row = next(r for r in inv['outputs'] if r['variant'] == variant)
    whole = fitz.open(); start = 1
    for part in row['components']:
        data = (family / 'components' / variant / (part['code'] + '.pdf')).read_bytes()
        with fitz.open(stream=data, filetype='pdf') as doc:
            part.update(sha256=native.digest(data), bytes=len(data), pages=len(doc), firstPage=start, lastPage=start+len(doc)-1)
            whole.insert_pdf(doc); start += len(doc)
    data = whole.tobytes(garbage=0, deflate=True)
    row.update(sha256=native.digest(data), bytes=len(data), pages=len(whole)); whole.close()
    (family / (variant + '.pdf')).write_bytes(data)
    (family / 'fixtures' / (variant + '.pdf')).write_bytes(data)
    dump(family / (variant + '.components.json'), row['components'])
    dump(family / 'packet-inventory.json', inv)
    return row


def main():
    args = argparse.ArgumentParser(); args.add_argument('--root', default=str(HERE.parents[2])); args.add_argument('--out', required=True)
    a = args.parse_args(); root = Path(a.root).resolve(); family = root / native.REL; out = Path(a.out).resolve(); out.mkdir(parents=True, exist_ok=True)
    guarded = root / 'data/rcap-all50/overlays/census-v1'; before = snapshot(guarded)
    results = []; observations = []

    def check(name, fn):
        fn(); results.append({'case': name, 'result': 'PASS'})

    def refuses(name, fn, reason):
        try:
            fn()
        except (ValueError, FileNotFoundError) as exc:
            assert reason in str(exc), (name, str(exc), reason)
            results.append({'case': name, 'result': 'EXPECTED_REFUSAL', 'reason': str(exc)[:250]})
        else:
            raise AssertionError('defect accepted: ' + name)

    @contextlib.contextmanager
    def scratch():
        with tempfile.TemporaryDirectory(prefix='mn15218-native-control-') as tmp:
            dest = Path(tmp) / 'family'; shutil.copytree(family, dest); yield dest

    inv = native.preflight(root, family)
    docs, arts, rows, identities = native.measured_writes(family, inv)
    check('all seven actual variant identities', lambda: native.need(len(arts) == 7, 'variant count'))
    check('all actual history and household rows', lambda: native.need(len(rows) == 19 and collections.Counter(r['table'] for r in rows) == {'EXP102.Q7': 14, 'FEE102.Q5': 5}, 'row counts'))
    check('all repeated captions and contact fields', lambda: native.need(len(identities) == 202, 'identity count'))
    check('continuation glyph ink actually read', lambda: native.need(sum(a['continuationGlyphBoxesWithInk'] for a in arts) == 2123, 'glyph count'))
    check('public assistance skips absent annual income', lambda: native.need('annual' not in native.load(family/'fee-public-assistance.fixture.json')['fee'] and next(a for a in arts if a['fixture']=='fee-public-assistance')['preparationStatus']=='PREPARED_NOT_EXECUTED', 'assistance skip'))
    check('unknown spouse income stays diagnostic', lambda: native.need(next(a for a in arts if a['fixture']=='fee-spouse-unknown')['preparationStatus']=='DIAGNOSTIC_NOT_FILING_POSITIVE', 'unknown income'))
    check('not one candidate self-authorizes filing', lambda: native.need(all(a['fileable'] is False for a in arts), 'fileable'))

    for name, change, expected in [
        ('missing variant', lambda x: x['outputs'].pop(), 'variant'),
        ('duplicate variant', lambda x: x['outputs'].append(copy.deepcopy(x['outputs'][0])), 'variant'),
        ('wrong family', lambda x: x.update(familyId='mn_petition_609a02_subd3-set'), 'wrong family'),
        ('wrong proposed order', lambda x: x['outputs'][0]['components'][-1].update(code='EXP105'), 'selected component'),
        ('optional fee form made mandatory', lambda x: x['outputs'][0]['components'].append({'code':'FEE102'}), 'selected component'),
        ('missing selected fee form', lambda x: x['outputs'][3]['components'].pop(), 'selected component'),
    ]:
        with scratch() as f:
            x = native.load(f/'packet-inventory.json'); change(x); dump(f/'packet-inventory.json',x)
            refuses(name, lambda: native.preflight(root,f), expected)

    with scratch() as f:
        x = native.load(f/'packet-inventory.json'); x['outputs'][0]['components'][2]['firstPage'] += 1
        dump(f/'packet-inventory.json',x); dump(f/'canonical.components.json',x['outputs'][0]['components'])
        refuses('page gap survives coherent metadata copy', lambda: native.preflight(root,f), 'page gap')
    with scratch() as f:
        (f/'fixtures/canonical.pdf').write_bytes(b'%PDF wrong alias')
        refuses('stale fixture alias', lambda: native.preflight(root,f), 'alias mismatch')
    with scratch() as f:
        x = native.load(f/'canonical.map.json'); x['serviceSet'].append('FEE102'); dump(f/'canonical.map.json',x)
        refuses('review bundle improperly sent as service set', lambda: native.preflight(root,f), 'service set')
    with scratch() as f:
        x = native.load(f/'canonical.map.json'); x['sourceBoundComponents'][0]['sourceSha256']='0'*64; dump(f/'canonical.map.json',x)
        refuses('wrong source map binding', lambda: native.preflight(root,f), 'map source')
    with tempfile.TemporaryDirectory(prefix='mn-native-source-control-') as tmp:
        r = Path(tmp); shutil.copytree(root/native.SOURCE, r/native.SOURCE)
        p = r/native.SOURCE/'EXP106.pdf'; p.write_bytes(p.read_bytes()+b'\nmutated source')
        refuses('changed held source bytes', lambda: native.preflight(r,family), 'source bytes changed')

    for name, var, change, reason in [
        ('participant identity drift', 'canonical', lambda x: x['person'].update(first='Different'), 'identity mismatch'),
        ('repeated case drift', 'canonical', lambda x: x['case'].update(number='62-CR-20-9999'), 'identity mismatch'),
        ('table history value omitted', 'canonical', lambda x: x['history'][0].update(charge='Different charge'), 'history cell missing'),
        ('appendix history value omitted', 'boundary', lambda x: x['history'][0].update(caseNumber='Different case'), 'continuation drops'),
        ('household member drift', 'fee-low-income', lambda x: x['fee']['members'][0].update(age=9), 'household cell missing'),
        ('unknown middle falsely filled', 'canonical', lambda x: x['person'].update(middle=None), 'identity'),
    ]:
        with scratch() as f:
            x = native.load(f/(var+'.fixture.json')); change(x); dump(f/(var+'.fixture.json'),x)
            refuses(name, lambda: native.measured_writes(f, native.preflight(root,f)), reason)

    # Disjoint shard combination is itself checked, not trusted from an advertised total.
    shards = [{'variants':copy.deepcopy(inv['outputs'][:3]),'pageInstances':sum(r['pages'] for r in inv['outputs'][:3])}, {'variants':copy.deepcopy(inv['outputs'][3:]),'pageInstances':sum(r['pages'] for r in inv['outputs'][3:])}]
    check('complete disjoint shard inventory', lambda: native.join_audits(inv,shards))
    bad=copy.deepcopy(shards);bad[1]['variants'].pop()
    refuses('missing audited variant',lambda:native.join_audits(inv,bad),'incomplete or overlap')
    bad=copy.deepcopy(shards);bad[1]['variants'].append(bad[0]['variants'][0])
    refuses('overlapping audited variant',lambda:native.join_audits(inv,bad),'incomplete or overlap')
    bad=copy.deepcopy(shards);bad[1]['variants'][0]['sha256']='0'*64
    refuses('stale audited PDF identity',lambda:native.join_audits(inv,bad),'stale audit')
    bad=copy.deepcopy(shards);bad[0]['pageInstances']-=1
    refuses('incomplete audited page coverage',lambda:native.join_audits(inv,bad),'page count')

    with tempfile.TemporaryDirectory(prefix='mn-native-auditor-control-') as tmp:
        r=Path(tmp); p=r/'scripts/rcap-packet-recovery/chat9/audit-mn15218.py'; p.parent.mkdir(parents=True); p.write_text('# silently changed auditor\n')
        refuses('unexpected auditor dependency preimage',lambda:native.checked_auditor(r),'unexpected existing auditor preimage')

    # Actual reader behavior over a physical missing component, not a mocked PASS.
    with scratch() as f:
        (f/'components/canonical/EXP106.pdf').unlink()
        relative=os.path.relpath(f,root)
        command=['node','--input-type=module','-e',"import {auditFamily} from './scripts/rcap-packet-completeness/verify-packet-completeness.mjs'; console.log(JSON.stringify(auditFamily(process.argv[1], 'mn_petition_15218-set')));",relative]
        run=subprocess.run(command,cwd=root,capture_output=True,text=True,timeout=30)
        assert run.returncode==0,run.stderr
        raw=json.loads(run.stdout); dump(out/'existing-reader-missing-component.json',raw)
        observations.append({'case':'physical missing EXP106 with retained metadata','readerExit':run.returncode,'readerResult':raw['result'],'readerRowsInspected':raw['totals']['rowsInspected'],'notPacketApproval':True})
        refuses('missing real component rejected natively',lambda:native.preflight(root,f),'EXP106.pdf')

    for name in ['intact-recombined','continuation-covered-but-extractable','judicial-ink']:
        with scratch() as f:
            var='boundary' if name=='continuation-covered-but-extractable' else 'canonical'
            if name!='intact-recombined':
                code='EXP102' if name.startswith('continuation') else 'EXP106'; p=f/'components'/var/(code+'.pdf')
                doc=fitz.open(p)
                if code=='EXP102':
                    m=next(m for m in native.load(f/(var+'.map.json'))['sourceBoundComponents'] if m['code']=='EXP102')
                    w=next(w for w in m['writes'] if w['fieldId']=='Q7 complete criminal history')
                    page=doc[w['page']-1]; spans=[s for b in page.get_text('dict')['blocks'] for ln in b.get('lines',[]) for s in ln['spans']]
                    span=next(s for s in spans if native.norm(s['text'])==native.norm(w['value']) and abs(s['origin'][0]-w['x'])<.2)
                    page.draw_rect(fitz.Rect(span['bbox']),color=None,fill=(1,1,1),overlay=True)
                    assert w['value'].strip() in page.get_text(), 'control text was removed, not visually covered'
                else:
                    doc[1].insert_text((90,100),'Court grants relief',fontsize=10)
                data=doc.tobytes(garbage=0,deflate=True);doc.close();p.write_bytes(data)
            row=reassemble(f,var)
            native.preflight(root,f)
            command=[sys.executable,str(HERE/'audit-mn15218.py'),'--root',str(root),'--family-dir',str(f),'--variants',var,'--out',str(f.parent/'audit')]
            run=subprocess.run(command,capture_output=True,text=True,timeout=90)
            (out/(name+'.log')).write_text(run.stdout+run.stderr)
            observations.append({'case':name,'componentAndWholeHashesRefreshed':True,'wholePdfSha256':row['sha256'],'pages':row['pages'],'existingAuditorExit':run.returncode})
            if name=='judicial-ink':
                assert run.returncode!=0 and 'protected ink changed' in run.stderr,run.stderr
                results.append({'case':'rehashed judicial-ink complete bundle','result':'EXPECTED_REFUSAL'})
            elif name.startswith('continuation'):
                assert run.returncode==0,'existing baseline changed; record new behavior before changing expectations: '+run.stderr
                refuses('covered appendix in complete rehashed bundle',lambda:native.measured_writes(f,native.preflight(root,f)),'no visible glyph ink')
            else:
                assert run.returncode==0,run.stderr
                check('intact full rehashed packet',lambda:native.measured_writes(f,native.preflight(root,f)))

    assert snapshot(guarded)==before,'a control changed a preserved family file'
    report={'authorOnly':True,'tests':len(results),'positive':sum(r['result']=='PASS' for r in results),'negative':sum(r['result']=='EXPECTED_REFUSAL' for r in results),'failures':0,'cases':results,'actualLegacyBehavior':observations,'preservedFamilyFiles':len(before),'allPreservedFamilyHashes':before,'fullRendererCalls':0,'independentAcceptance':False}
    dump(out/'results.json',report)
    print(json.dumps({k:report[k] for k in ('tests','positive','negative','failures','preservedFamilyFiles','fullRendererCalls')}))

if __name__=='__main__':
    main()

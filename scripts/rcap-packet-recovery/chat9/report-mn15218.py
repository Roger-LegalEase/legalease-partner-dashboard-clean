#!/usr/bin/env python3
"""MN15218 native byte evidence. Uses the existing MN auditor, never edits a PDF.
The standard reader's summary is not a substitute for this all-variant proof.
This is author mechanical QA, not source freshness, independent review or filing approval.
"""
from pathlib import Path
import argparse, collections, hashlib, json, subprocess, sys, tempfile
import fitz
import numpy as np

FAMILY = 'mn_petition_15218-set'
REL = 'data/rcap-all50/overlays/census-v1/mn/mn-petition-15218-set--official-pdf-fill'
VARIANTS = ('canonical', 'boundary', 'optional-service-known-hearing', 'fee-public-assistance', 'fee-low-income', 'fee-hardship', 'fee-spouse-unknown')
SOURCE = 'reference/chat-parallel-2026-09-07/chat9'
AUDITOR_SHA256 = '7e1220f9115edea7711cd0b71c0f95b1e40363bf90c570ef010bf991dc734dd7'
SOURCE_PAGES = {'EXP102': 6, 'EXP104': 2, 'EXP106': 3, 'FEE102': 6}
EXPECTED = {
    'EXP101': '0ccdc99ec3cbb86300b00f5d93bf724d795541d426709f4e97708119d1b1c5de',
    'EXP102': 'c98430f1a9c7a6d399b7d01de1ef2eee0df5f0a1a07e89a703b307977d7bf541',
    'EXP104': '0e776a93b61f28f38fc6b318a9f59b78de4e0cbec102236364cf59ab061b423c',
    'EXP106': 'da7080f9c0b0135a79b537545e5448da438b63ae0de5d69c25e2513f1170bd85',
    'FEE102': 'b8415cddaa06a9c76cf2c4949aee36efe22e3b0ba98783a74063094150c72da8',
}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def load(path):
    return json.loads(path.read_text())

def norm(value):
    return ' '.join(str(value).split())

def need(condition, message):
    if not condition:
        raise ValueError(message)

def preflight(root, family):
    """Check all advertised bytes and exact component/page coverage, not names alone."""
    inv = load(family / 'packet-inventory.json')
    need(inv.get('familyId') == FAMILY, 'wrong family')
    rows = inv.get('outputs', [])
    need(collections.Counter(r['variant'] for r in rows) == collections.Counter(VARIANTS), 'missing, duplicate or extra variant')
    for code, sha in EXPECTED.items():
        need(digest((root / SOURCE / (code + '.pdf')).read_bytes()) == sha, 'source bytes changed: ' + code)
    for row in rows:
        var = row['variant']; fixture = load(family / (var + '.fixture.json'))
        need(fixture.get('familyId') == FAMILY and fixture.get('synthetic') is True, 'wrong fixture identity')
        wanted = ['GUIDE', 'EXP101', 'EXP102', 'EXP104', 'EXP106'] + (['FEE102'] if fixture['fee'] is not None else [])
        need([p['code'] for p in row['components']] == wanted, 'wrong or missing selected component: ' + var)
        maps = load(family / (var + '.map.json'))
        need(maps.get('serviceSet') == ['EXP102', 'EXP106'], 'review bundle is not the service set')
        need([m['code'] for m in maps['sourceBoundComponents']] == ['EXP102', 'EXP104', 'EXP106'] + (['FEE102'] if fixture['fee'] is not None else []), 'missing component map')
        need(load(family / (var + '.components.json')) == row['components'], 'standalone component manifest mismatch')
        whole = (family / (var + '.pdf')).read_bytes()
        need(digest(whole) == row['sha256'] and len(whole) == row['bytes'], 'whole PDF hash/length mismatch')
        need((family / 'fixtures' / (var + '.pdf')).read_bytes() == whole, 'fixture PDF alias mismatch')
        page = 1
        with fitz.open(stream=whole, filetype='pdf') as d:
            need(len(d) == row['pages'], 'whole PDF page count mismatch')
        for part in row['components']:
            data = (family / 'components' / var / (part['code'] + '.pdf')).read_bytes()
            need(digest(data) == part['sha256'] and len(data) == part['bytes'], 'component hash/length mismatch')
            with fitz.open(stream=data, filetype='pdf') as d:
                need(len(d) == part['pages'], 'component page count mismatch')
            need(part['firstPage'] == page and part['lastPage'] == page + part['pages'] - 1, 'component page gap or overlap')
            page = part['lastPage'] + 1
        need(page == row['pages'] + 1, 'incomplete bundle page coverage')
        for m in maps['sourceBoundComponents']:
            need(m['sourceSha256'] == EXPECTED[m['code']], 'map source binding mismatch')
    return inv

def join_audits(inv, shards):
    covered = [r['variant'] for a in shards for r in a['variants']]
    need(collections.Counter(covered) == collections.Counter(VARIANTS), 'auditor shards are incomplete or overlap')
    by_name = {r['variant']: r for r in inv['outputs']}
    for a in shards:
        for r in a['variants']:
            old = by_name[r['variant']]
            need((r['sha256'], r['pages'], r['components']) == (old['sha256'], old['pages'], old['components']), 'stale audit input')
    need(sum(a['pageInstances'] for a in shards) == sum(r['pages'] for r in inv['outputs']), 'audited page count mismatch')


def check_identity(fixture, documents):
    """Bind repeated captions/contact fields to supplied identity, not just the map."""
    person = fixture['person']
    name = ' '.join(person[k] for k in ('first', 'middle', 'last') if person.get(k))
    dob = person['dob'][5:7] + '/' + person['dob'][8:10] + '/' + person['dob'][:4]
    checks = []
    for doc in documents:
        code = doc['code']
        expected = {'caption.county': fixture['court']['county'], 'caption.district': fixture['court']['district'], 'caption.case': fixture['case']['number']}
        expected['caption.defendant' if code in ('EXP102', 'FEE102') else 'caption.name'] = name
        if code == 'EXP106':
            expected['caption.DOB'] = dob
        if code == 'EXP102':
            expected.update({'person.first': person['first'], 'person.middle': person.get('middle'), 'person.last': person['last'], 'person.DOB': dob, 'person.street': person['street'], 'person.cityStateZip': person['cityStateZip']})
        if code in ('EXP102', 'FEE102'):
            prefix = 'signatureBlock' if code == 'EXP102' else 'contact'
            expected.update({prefix + '.' + k: v for k, v in {'name': name, 'address': person['street'], 'cityStateZip': person['cityStateZip'], 'phone': person.get('phone'), 'email': person.get('email')}.items()})
        for field, value in expected.items():
            found = [w for w in doc['actualWrites'] if w['fieldId'] == field]
            if value is None or value == '':
                need(not found, 'unknown or absent optional identity was invented: ' + field)
                continue
            need(len(found) == 1 and norm(found[0].get('drawnText')) == norm(value), 'repeated identity mismatch: ' + field)
            checks.append({'documentId': doc['documentId'], 'field': field, 'expected': value, 'drawnText': found[0]['drawnText']})
    return checks


def continuation_visibility(page, span, cache):
    """Check extracted glyph boxes against actual rendered ink on appended pages.

    This catches white-overpaint leaving extractable text. It is a bounded
    per-glyph ink-presence control, not OCR or a general adversarial PDF proof.
    """
    if page.number not in cache:
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), colorspace=fitz.csGRAY, alpha=False)
        raster = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width)
        raw = [s for b in page.get_text('rawdict')['blocks'] for line in b.get('lines', []) for s in line['spans']]
        cache[page.number] = (raster, raw)
    raster, raw = cache[page.number]
    matches = [r for r in raw if norm(''.join(c['c'] for c in r['chars'])) == norm(span['text']) and max(abs(r['origin'][j] - span['origin'][j]) for j in (0, 1)) < .1]
    need(len(matches) == 1, 'continuation glyph span ambiguous')
    count = 0
    for char in matches[0]['chars']:
        if char['c'].isspace():
            continue
        x0, y0, x1, y1 = char['bbox']
        crop = raster[max(0, int(np.floor(y0*2))):min(raster.shape[0], int(np.ceil(y1*2))), max(0, int(np.floor(x0*2))):min(raster.shape[1], int(np.ceil(x1*2)))]
        need(crop.size and np.any(crop < 180), 'continuation text has no visible glyph ink: ' + span['text'])
        count += 1
    return count


def measured_writes(family, inv):
    documents = []; artifacts = []; rows = []; identity_checks = []
    for item in inv['outputs']:
        var = item['variant']; fixture = load(family / (var + '.fixture.json'))
        maps = load(family / (var + '.map.json'))['sourceBoundComponents']
        current = []; glyphs = 0; marks = 0; continuation_glyphs = 0
        for m in maps:
            piece = next(p for p in item['components'] if p['code'] == m['code'])
            actual = []; visibility_cache = {}
            with fitz.open(family / 'components' / var / (m['code'] + '.pdf')) as d:
                spans = [[s for b in p.get_text('dict')['blocks'] for ln in b.get('lines', []) for s in ln['spans']] for p in d]
                for w in m['writes']:
                    if w['type'] == 'text':
                        matches = [s for s in spans[w['page']-1] if norm(s['text']) == norm(w['value']) and abs(s['origin'][0]-w['x']) < .2 and abs(d[w['page']-1].rect.height-s['origin'][1]-w['y']) < .2]
                        need(len(matches) == 1, 'text has no unique artifact span: ' + w['fieldId'])
                        drawn = matches[0]['text']; glyphs += sum(not ch.isspace() for ch in drawn)
                        proof = {'drawnText': drawn, 'visibleInArtifactBytes': True, 'visibilityBasis': 'matched span plus successful complete-PDF ink auditor'}
                        if w['page'] > SOURCE_PAGES[m['code']]:
                            count = continuation_visibility(d[w['page']-1], matches[0], visibility_cache)
                            continuation_glyphs += count
                            proof.update({'continuationGlyphBoxesWithInk': count, 'visibilityBasis': 'matched raw glyph boxes with rendered ink on continuation page'})
                    else:
                        need(w['type'] == 'checkbox' and w['value'] is True, 'unknown write type')
                        marks += 1; proof = {'pixelMarkVerified': True, 'visibilityBasis': 'exact-source checkbox crop in complete-PDF auditor'}
                    actual.append({**w, 'expected': w['value'], **proof})
            doc = {'documentId': var + ':' + m['code'], 'fixture': var, 'code': m['code'], 'sourceSha256': m['sourceSha256'], 'artifactSha256': piece['sha256'], 'actualWrites': actual, 'blankGroups': m['blanks']}
            documents.append(doc); current.append(doc)
        identity_checks.extend(check_identity(fixture, current))
        petition = next(d for d in current if d['code'] == 'EXP102')['actualWrites']
        continuation = norm(' '.join(w['drawnText'] for w in petition if w['fieldId'] == 'Q7 complete criminal history'))
        for i, r in enumerate(fixture['history']):
            date = lambda v: v[5:7] + '/' + v[8:10] + '/' + v[:4]
            values = [r['caseNumber'], r['jurisdiction'], r['charge'], date(r['offenseDate']), 'Yes' if r['convicted'] else 'No', date(r['convictionDate']) if r['convictionDate'] else None]
            cells = []
            if continuation:
                text = f"{i+1}. Case {r['caseNumber']}; {r['jurisdiction']}; {r['charge']}; offense {date(r['offenseDate'])}; convicted: " + ('Yes, ' + date(r['convictionDate']) if r['convicted'] else 'No') + f"; {r['status']}."
                need(norm(text) in continuation, 'history continuation drops a row or known value')
            for j, v in enumerate(values):
                match = [w for w in petition if w['fieldId'] == f'Q7.history.{i}.{j}']
                if not continuation and v is not None:
                    need(len(match) == 1 and norm(match[0]['drawnText']) == norm(v), 'history cell missing')
                if not continuation and v is None:
                    need(not match, 'invented conviction date in a nonconviction row')
                cells.append({'column': j, 'expected': v, 'disposition': 'NOT_APPLICABLE_NO_CONVICTION' if v is None else 'BYTE_VERIFIED_CONTINUATION' if continuation else 'BYTE_VERIFIED_CELL'})
            rows.append({'fixture': var, 'table': 'EXP102.Q7', 'row': i, 'cells': cells, 'continuation': bool(continuation)})
        for i, member in enumerate((fixture.get('fee') or {}).get('members', [])):
            fee = next(d for d in current if d['code'] == 'FEE102')['actualWrites']; cells = []
            for j, v in enumerate([member['name'], str(member['age']), member['relationship']]):
                found = [w for w in fee if w['fieldId'] == f'Q5.member.{i}.{j}']
                need(len(found) == 1 and norm(found[0]['drawnText']) == norm(v), 'household cell missing')
                cells.append({'column': j, 'expected': v, 'disposition': 'BYTE_VERIFIED_CELL'})
            rows.append({'fixture': var, 'table': 'FEE102.Q5', 'row': i, 'cells': cells, 'continuation': False})
        pending = [{'code': d['code'], 'field': b['fieldId'], 'classification': b['classification'], 'reason': b['reason']} for d in current for b in d['blankGroups']]
        diagnostic = any(b['classification'] in ['UNKNOWN_REQUIRED_BEFORE_FILING', 'UNKNOWN_REQUIRED_BEFORE_SERVICE'] or b['field'] == 'Q9.income' for b in pending)
        # The explicit financial-unknown branch remains diagnostic even if source-group labels differ.
        diagnostic = diagnostic or (fixture['fee'] is not None and fixture['fee']['basis'] != 'public-assistance' and fixture['fee']['annual'] is None)
        artifacts.append({'fixture': var, 'path': REL + '/' + var + '.pdf', 'sha256': item['sha256'], 'pages': item['pages'], 'valuesReportedByFinalizer': sum(len(d['actualWrites']) for d in current), 'addedGlyphsReadFromOutputBytes': glyphs, 'flattenedWidgetAppearancesReadFromOutputBytes': 0, 'checkboxMarksVerifiedFromPixels': marks, 'continuationGlyphBoxesWithInk': continuation_glyphs, 'refusedFieldsWithInk': [], 'protectedCheckScope': 'Only source-bound regions explicitly listed in the maps; not an exhaustive enumeration of every printed blank', 'preparationStatus': 'DIAGNOSTIC_NOT_FILING_POSITIVE' if diagnostic else 'PREPARED_NOT_EXECUTED', 'fileable': False, 'pendingCompletion': pending})
    return documents, artifacts, rows, identity_checks


def checked_inputs(family):
    # Reports produced here are additive outputs, not their own recursively hashed inputs.
    return {str(p.relative_to(family)): digest(p.read_bytes()) for p in sorted(family.rglob('*')) if p.is_file() and not p.name.startswith('byte-derived-')}


def checked_auditor(root):
    auditor = root / 'scripts/rcap-packet-recovery/chat9/audit-mn15218.py'
    need(digest(auditor.read_bytes()) == AUDITOR_SHA256, 'unexpected existing auditor preimage; reconcile rather than substituting')
    return auditor


def build_reports(root, family):
    inputs = checked_inputs(family)
    inv = preflight(root, family)
    auditor = checked_auditor(root)
    shards = []
    with tempfile.TemporaryDirectory(prefix='mn15218-native-') as tmp:
        for i, variants in enumerate([VARIANTS[:3], VARIANTS[3:]]):
            output = Path(tmp) / str(i)
            cmd = [sys.executable, str(auditor), '--root', str(root), '--family-dir', str(family), '--variants', ','.join(variants), '--out', str(output)]
            run = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
            need(run.returncode == 0, 'complete-PDF auditor failed: ' + run.stdout[-1500:] + run.stderr[-1500:])
            shards.append(load(output / 'audit.json'))
    join_audits(inv, shards)
    documents, artifacts, rows, identities = measured_writes(family, inv)
    need(checked_inputs(family) == inputs, 'candidate inputs changed during native measurement')
    need(checked_auditor(root) == auditor, 'auditor identity changed during measurement')
    for code, sha in EXPECTED.items():
        need(digest((root / SOURCE / (code + '.pdf')).read_bytes()) == sha, 'source changed during native measurement: ' + code)
    report = {'schemaVersion': 'chat9-mn15218-native-byte-report/v1', 'familyId': FAMILY, 'derivedFromArtifactBytes': True, 'authorOnly': True, 'scope': 'Complete existing candidate; not source freshness, independent acceptance, filing readiness or runtime-intake proof. Grouped blank declarations are not expanded into invented field counts.', 'auditorSha256': digest(auditor.read_bytes()), 'inputSha256': inputs, 'sources': EXPECTED, 'artifacts': artifacts, 'documents': documents, 'repeatingRows': rows, 'identityChecks': identities, 'audit': {'variantCount': len(VARIANTS), 'pageInstances': sum(a['pageInstances'] for a in shards), 'textWriteChecks': sum(a['textWriteChecks'] for a in shards), 'protectedPixelChecks': sum(a['protectedPixelChecks'] for a in shards), 'declaredBlankGroups': sum(len(d['blankGroups']) for d in documents), 'sourceFontBoundingBoxAdvisories': [v for a in shards for v in a['potentialStaticTextCollisions']], 'humanPageReview': 'No new PDF bytes or page layout. Retained exact-candidate full-page review remains separate.', 'sharedReaderRepeatingRowsInspected': 0, 'nativeRepeatingRowsInspected': len(rows), 'repeatedIdentityFieldsInspected': len(identities), 'continuationGlyphBoxesWithInk': sum(a['continuationGlyphBoxesWithInk'] for a in artifacts)}, 'independentAcceptance': False, 'runtimeSelectable': False}
    rendered = {'familyId': FAMILY, 'schemaVersion': 'chat9-mn15218-rendered-byte-report/v1', 'derivedFromArtifactBytes': True, 'artifacts': [{'fixture': r['fixture'], 'path': r['path'], 'sha256': r['sha256'], 'pages': r['pages'], 'preparationStatus': r['preparationStatus'], 'fileable': False} for r in artifacts], 'packets': [{**p, 'documents': [{**c, 'documentId': p['variant'] + ':' + c['code']} for c in p['components']]} for p in inv['outputs']]}
    return report, rendered


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--root', default=str(Path(__file__).resolve().parents[3])); parser.add_argument('--family-dir'); parser.add_argument('--out', required=True)
    args = parser.parse_args(); root = Path(args.root).resolve(); family = Path(args.family_dir).resolve() if args.family_dir else root / REL
    report, rendered = build_reports(root, family)
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    # Separate filenames preserve the original renderer declarations for provenance.
    for name, value in [('byte-derived-actual-writes.json', report), ('byte-derived-rendered-artifacts.json', rendered)]:
        (out / name).write_text(json.dumps(value, indent=2) + '\n')
    print(json.dumps({'family': FAMILY, 'variants': len(report['artifacts']), 'pages': report['audit']['pageInstances'], 'nativeRowsInspected': len(report['repeatingRows']), 'pdfsWritten': 0, 'independentAcceptance': False}))

if __name__ == '__main__':
    main()

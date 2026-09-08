#!/usr/bin/env python3
"""Read-only RI source/capacity and existing-raster integrity checks.

This is not a packet builder, legal engine, OCR tool or independent PASS.
The original complete packet PDFs are not supplied by the raster ZIP. Their
hashes below remain receipt-reported; page.pdf intermediates are not substitutes.
Requires PyMuPDF. Example inputs are retained blank PDFs and artifact 9997205154.
"""
import argparse
import copy
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path, PurePosixPath
import re
import stat
import zipfile
import fitz

PINS = {
    'DC-33': ('342337451d61e363e03febb384431dba2f9bb08b44ee46380b94fc91901e9908', 77),
    'Superior-55': ('e5805c5482e61ef39a88d8b50ea5a3556b5ffc40d3abb2200973016af4a9afca', 74),
}
ZIP_PIN = '67588e5da427c4a57a73dbc5496d0dc2876225e47b0c1395efa7b8bba153272c'
FAMILY = 'ri_multiple_misdemeanors-set'
PAGE_NAME = re.compile(r'^ri_multiple_misdemeanors-set/(canonical|boundary)/page-(\d{3})\.png$')
ROW_NAME = re.compile(r'^[123] (?:Counts|Charges|Dispositions) [1-4]$')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def require_pin(data, expected):
    if sha(data) != expected:
        raise ValueError('wrong exact input digest')


def row_catalog(widgets):
    rows = [w for w in widgets if ROW_NAME.fullmatch(w['name'])]
    expected = {f'{c} {label} {r}' for c, label in [(1, 'Counts'), (2, 'Charges'), (3, 'Dispositions')] for r in range(1, 5)}
    if len(rows) != 12 or {w['name'] for w in rows} != expected:
        raise ValueError('missing or duplicate row-field identity')
    for r in range(1, 5):
        group = sorted([w for w in rows if w['name'].endswith(f' {r}')], key=lambda w: w['name'])
        if any(w['page'] != 2 for w in group):
            raise ValueError('wrong source page for charge-table cell')
        if max(w['rectTopLeft'][1] for w in group) - min(w['rectTopLeft'][1] for w in group) > 0.1:
            raise ValueError('row columns no longer aligned')
        if not group[0]['rectTopLeft'][0] < group[1]['rectTopLeft'][0] < group[2]['rectTopLeft'][0]:
            raise ValueError('count/charge/disposition columns reordered')
    return rows


def source(path, doc_id):
    raw = path.read_bytes()
    require_pin(raw, PINS[doc_id][0])
    with fitz.open(stream=raw, filetype='pdf') as pdf:
        if len(pdf) != 4:
            raise ValueError('wrong complete blank-source page count')
        widgets = []
        for i, page in enumerate(pdf):
            for w in page.widgets():
                if str(w.field_value or '').strip() not in ('', 'Off'):
                    raise ValueError('source contains a meaningful prefill')
                widgets.append({'name': w.field_name, 'page': i + 1, 'type': w.field_type_string,
                                'rectTopLeft': [round(v, 5) for v in w.rect]})
        names = Counter(w['name'] for w in widgets)
        if len(names) != PINS[doc_id][1]:
            raise ValueError('unexpected source field census')
        rows = row_catalog(widgets)
        return {'documentId': doc_id, 'sha256Measured': sha(raw), 'bytesMeasured': len(raw),
                'pagesMeasured': 4, 'widgetInstances': len(widgets), 'uniqueFieldNames': len(names),
                'multiWidgetFields': {k: v for k, v in names.items() if v > 1},
                'meaningfulSourcePrefills': 0, 'chargeRowCapacityMeasured': 4,
                'chargeTableCellsMeasured': rows,
                'fieldCatalog': widgets}


def page_inventory(names):
    numeric = [n for n in names if PAGE_NAME.fullmatch(n)]
    expected = {f'{FAMILY}/{f}/page-{p:03}.png' for f in ('canonical', 'boundary') for p in range(1, 14)}
    if len(numeric) != 26 or set(numeric) != expected:
        raise ValueError('missing/duplicate numeric page instance')
    return sorted(numeric)


def raster(path):
    raw = path.read_bytes()
    require_pin(raw, ZIP_PIN)
    with zipfile.ZipFile(path) as z:
        for item in z.infolist():
            p = PurePosixPath(item.filename)
            if p.is_absolute() or '..' in p.parts or stat.S_ISLNK(item.external_attr >> 16):
                raise ValueError('unsafe archive path')
        page_names = page_inventory(z.namelist())
        verdict_raw = z.read(f'{FAMILY}.verdict.json')
        verdict = json.loads(verdict_raw)
        if verdict['familyId'] != FAMILY or verdict['packetCommitSha'] != '027fa2d9a6056b114286757ff34809cef711e3ab':
            raise ValueError('wrong central receipt identity')
        if {m['png'] for m in verdict['measurements']} != set(page_names):
            raise ValueError('receipt/page-inventory mismatch')
        aliases = defaultdict(list)
        for n in page_names:
            aliases[sha(z.read(n))].append(n)
        intermediates = []
        for n in z.namelist():
            if n.endswith('/page.pdf'):
                b = z.read(n)
                with fitz.open(stream=b, filetype='pdf') as p:
                    intermediates.append({'path': n, 'pages': len(p), 'sha256Measured': sha(b), 'wholePacket': False})
        return {'artifactId': 9997205154, 'workflowRunId': verdict['workflowRunId'],
                'packetCommitReported': verdict['packetCommitSha'], 'zipBytesMeasured': len(raw),
                'zipSha256Measured': sha(raw), 'verdictSha256Measured': sha(verdict_raw),
                'numericPageInstances': len(page_names), 'uniqueNumericPagePngs': len(aliases),
                'exactPngAliasesBeyondFirst': len(page_names) - len(aliases),
                'excludedCalibrationPngs': [n for n in z.namelist() if n.endswith('page-calibration.png')],
                'wholePdfHashesReportedByReceiptNotRemeasured': verdict['hashesBound'],
                'pagePngHashAliasesMeasured': dict(sorted(aliases.items())), 'pagePdfIntermediates': intermediates}, page_names


def controls(rows, names):
    results = []
    def check(label, fn, accepted):
        try:
            fn()
            actual = True
        except ValueError:
            actual = False
        if actual != accepted:
            raise AssertionError(label)
        results.append({'case': label, 'accepted': actual, 'expected': accepted})
    check('exact_row_catalog', lambda: row_catalog(rows), True)
    check('missing_charge_cell', lambda: row_catalog(rows[:-1]), False)
    check('duplicate_charge_cell', lambda: row_catalog(rows + [rows[0]]), False)
    moved = copy.deepcopy(rows); moved[0]['rectTopLeft'][1] += 2
    check('moved_column_in_row', lambda: row_catalog(moved), False)
    wrong_page = copy.deepcopy(rows); wrong_page[0]['page'] = 1
    check('wrong_table_page', lambda: row_catalog(wrong_page), False)
    check('complete_numeric_page_census', lambda: page_inventory(names), True)
    check('missing_last_page', lambda: page_inventory(names[:-1]), False)
    check('duplicated_numeric_page', lambda: page_inventory(names + [names[0]]), False)
    check('calibration_not_counted_as_packet_page', lambda: page_inventory(names + [f'{FAMILY}/canonical/page-calibration.png']), True)
    check('matching_digest', lambda: require_pin(b'control', sha(b'control')), True)
    check('one_byte_corruption', lambda: require_pin(b'controL', sha(b'control')), False)
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dc-source', type=Path, required=True)
    parser.add_argument('--superior-source', type=Path, required=True)
    parser.add_argument('--raster-zip', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    inputs = [args.dc_source, args.superior_source, args.raster_zip]
    before = [sha(p.read_bytes()) for p in inputs]
    sources = [source(args.dc_source, 'DC-33'), source(args.superior_source, 'Superior-55')]
    ras, names = raster(args.raster_zip)
    result = {'schemaVersion': 'chatb-ri-source-raster-audit/v1', 'pymupdfVersion': fitz.VersionBind,
              'scope': 'Measured retained-source widget census, four-row physical capacity and existing-raster integrity; no packet rebuild, legal-engine test, OCR, automatic visual judgment or complete independent PASS.',
              'sources': sources, 'raster': ras,
              'controls': controls(sources[0]['chargeTableCellsMeasured'], names),
              'rendererExecutions': 0, 'originalWholePacketPdfsRehashed': 0,
              'recordBearingOverflowFixturesExecuted': 0, 'visualInspectionClaimedByScript': False}
    after = [sha(p.read_bytes()) for p in inputs]
    if before != after:
        raise AssertionError('read-only input changed')
    result['readInputsUnchanged'] = len(inputs)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2, ensure_ascii=True) + '\n', encoding='utf-8')
    print(json.dumps({'sources': len(sources), 'sourcePages': 8, 'numericRasterPages': ras['numericPageInstances'],
                      'uniquePagePngs': ras['uniqueNumericPagePngs'], 'controls': len(result['controls']),
                      'inputsUnchanged': len(inputs)}))

if __name__ == '__main__':
    main()

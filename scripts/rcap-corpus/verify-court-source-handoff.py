#!/usr/bin/env python3
"""Read-only verification of the four owner-supplied NY/VA source candidates.

Requires PyMuPDF and the private PDFs. No production mapping, legal approval,
source-currentness or participant delivery is inferred from successful checks.
"""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import subprocess
import zipfile
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
DIRECTORY = 'data/rcap-grade-a/source-custody/court-source-handoff-20261013'
MAPS = {'cc1473.pdf': 'va-cc1473-mapping-link.json',
        'cc1474a.pdf': 'va-cc1474a-access-mapping.json',
        'cpl160.59sealingapplication.pdf': 'ny-2026-08-paper-mapping.json',
        'cpl160.59sealingapplication-fillable.pdf': 'ny-2026-08-fillable-mapping.json'}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def verify_bytes(raw, row):
    require(len(raw) == row['bytes'], row['filename'] + ': source length mismatch')
    require(digest(raw) == row['sha256'], row['filename'] + ': source SHA-256 mismatch')


def actual_widgets(document):
    return [{'page': page.number + 1, 'ordinal': ordinal, 'field': widget.field_name,
             'type': widget.field_type_string, 'rect': [round(v, 3) for v in widget.rect],
             'buttonStates': widget.button_states() if widget.field_type_string in ['RadioButton', 'CheckBox'] else None}
            for page in document for ordinal, widget in enumerate(page.widgets() or [], 1)]


def verify_mapping(raw, row, mapping):
    verify_bytes(raw, row)
    require(mapping['sourceFile'] == row['filename'] and mapping['sourceSha256'] == row['sha256'], 'mapping/source identity mismatch')
    require(all(mapping[k] is False for k in ['generationAllowed', 'runtimeSelectable', 'commercialAuthority']), 'source intake cannot grant production authority')
    require(mapping['qualifiedApproval'] is None, 'source intake cannot manufacture qualified approval')
    document = pymupdf.open(stream=raw, filetype='pdf')
    measured = actual_widgets(document)
    require(len(document) == row['pages'], 'source page count mismatch')
    require(len(measured) == row['interactiveWidgetCount'], 'widget count mismatch')
    require(len({w['field'] for w in measured}) == row['distinctWidgetNames'], 'distinct field names mismatch')
    if row['filename'] == 'cc1473.pdf':
        require(mapping['procedure'] == 'ordinary_acquittal_dismissal_19.2-392.2(A)', 'CC-1473 mechanism changed')
        require('absolute_pardon' in mapping['notApplicableTo'], 'CC-1473 must not resolve absolute pardon')
        return measured
    require(mapping['pageSizes'] == [[p.rect.width, p.rect.height] for p in document], 'page dimensions changed')
    require([{k: w[k] for k in ['page', 'ordinal', 'field', 'type', 'rect', 'buttonStates']} for w in mapping['fields']] == measured, 'exact widget identity/geometry changed')
    require(all(w['writeAllowed'] is False and w.get('actor') and w.get('stage') for w in mapping['fields']), 'draft widget actor/stage/write guard missing')
    for row_anchor in mapping.get('paperAnchors', []):
        found = [[round(v, 3) for v in rect] for rect in document[row_anchor['page'] - 1].search_for(row_anchor['label'])]
        require(found and found == row_anchor['textRects'] and row_anchor['writeAllowed'] is False, 'paper anchor drift or unapproved write')
    for obligation in mapping['nonWidgetObligations']:
        require(obligation['writeAllowed'] is False and document[obligation['page'] - 1].search_for(obligation['label']), 'printed non-widget actor obligation missing')
    if row['state'] == 'NY':
        require([(x['page'], x['actor']) for x in mapping['nonWidgetObligations']] == [(12, 'applicant_personally'), (13, 'actual_server'), (14, 'applicant_personally')], 'NY actual-execution obligations changed')
        if row['interactiveWidgetCount']:
            require(all(w['stage'] == 'actual_execution' and w['candidateBinding'] is None for w in mapping['fields'] if 'Affirmation' in w['field']), 'shared date fields cannot infer executed affirmations')
            require([w['page'] for w in measured if w['field'] == 'ApplicantAffirmationDay'] == [12, 14], 'main/additional execution collision lost')
        else:
            require(len(mapping['paperAnchors']) == 45, 'separate paper anchor coverage changed')
    else:
        require(mapping['procedure'] == 'access_already_expunged_record_19.2-392.3' and 'absolute_pardon' in mapping['notApplicableTo'], 'CC-1474A is not an initial/pardon expungement')
        require(any(o['label'] == 'ORDER' and o['actor'] == 'court_judge' for o in mapping['nonWidgetObligations']), 'non-widget court order must remain court owned')
    return measured


def verify(root=ROOT, archive=None):
    directory = root / DIRECTORY
    receipt = json.loads((directory / 'source-receipt.json').read_text())
    require(len(receipt['sources']) == 4, 'four-source intake scope changed')
    require(all(receipt[k] is False for k in ['generationAllowed', 'runtimeSelectable', 'commercialAuthority']) and receipt['qualifiedApproval'] is None, 'custody cannot grant approval')
    for relative, expected in receipt['preservedInputs'].items():
        require(digest((root / relative).read_bytes()) == expected, 'preserved historical/adoption input drift: ' + relative)
    original = json.loads((root / 'data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/source-receipt.json').read_text())
    require(receipt['historicalNewYorkSources'] == original['documents'], 'historical NY identities must remain distinct')
    csv_bytes = (directory / 'pdf_widgets.csv').read_bytes()
    require(digest(csv_bytes) == receipt['archiveMetadataHashes']['pdf_widgets.csv'], 'owner widget inventory changed')
    inventory = list(csv.DictReader(io.StringIO(csv_bytes.decode())))
    sources = []
    for row in receipt['sources']:
        target = root / row['heldCorpusPath']
        require(target.resolve().is_relative_to((root / 'private').resolve()) and not any(p.is_symlink() for p in [target, *target.parents] if p != root), 'unsafe source custody path')
        require(subprocess.run(['git', 'check-ignore', '-q', '--', row['heldCorpusPath']], cwd=root).returncode == 0, 'source must remain ignored')
        require(not subprocess.check_output(['git', 'ls-files', '--', row['heldCorpusPath']], cwd=root), 'source must not be tracked')
        raw = target.read_bytes()
        mapping = json.loads((directory / MAPS[row['filename']]).read_text())
        measured = verify_mapping(raw, row, mapping)
        expected = [x for x in inventory if x['filename'] == row['filename']]
        require(len(expected) == len(measured), 'owner inventory scope mismatch')
        for widget, supplied in zip(measured, expected):
            require((widget['page'], widget['ordinal'], widget['field'], widget['type']) == (int(supplied['page']), int(supplied['widget_ordinal_on_page']), supplied['field_name'], supplied['field_type']), 'owner inventory identity mismatch')
            require(widget['rect'] == [float(supplied[k]) for k in ['rect_left', 'rect_top', 'rect_right', 'rect_bottom']], 'owner inventory geometry mismatch')
        if row['filename'] == 'cc1473.pdf':
            old_map = json.loads((root / mapping['existingFieldMap']).read_text())['maps'][0]
            require(digest((root / mapping['existingFieldMap']).read_bytes()) == mapping['existingFieldMapSha256'], 'VA retained map changed')
            mapped = old_map['canonicalWrites'] + old_map['canonicalRefusals'] + old_map['selectionControls']
            doc = pymupdf.open(stream=raw, filetype='pdf')
            for w in measured:
                x0, y0, x1, y1 = w['rect']; rect = [x0, doc[w['page'] - 1].rect.height - y1, x1 - x0, y1 - y0]
                require(any(v.get('acroFieldName') == w['field'] and v.get('page') == w['page'] and all(abs(actual - v['rect'][key]) < .03 for actual, key in zip(rect, ['x', 'y', 'width', 'height'])) for v in mapped), 'existing CC-1473 mapping lost a source widget')
        sources.append({'file': row['filename'], 'sha256': digest(raw), 'bytes': len(raw), 'pages': row['pages'], 'widgets': len(measured), 'status': 'PASS'})
    if archive:
        raw = Path(archive).read_bytes()
        require(len(raw) == receipt['archive']['archiveBytes'] and digest(raw) == receipt['archive']['archiveSha256'], 'court handoff archive differs')
        with zipfile.ZipFile(io.BytesIO(raw)) as zipped:
            require(len(zipped.namelist()) == len(set(zipped.namelist())), 'duplicate archive member')
            for row in receipt['sources']:
                verify_bytes(zipped.read(row['archivePath']), row)
            for name, expected in receipt['archiveMetadataHashes'].items():
                require(digest(zipped.read(name)) == expected, 'archive metadata differs')
    return {'status': 'PASS', 'sources': sources, 'sourceWidgetsVerified': 151, 'paperAnchorsVerified': 45,
            'historicalInputsUnchanged': len(receipt['preservedInputs']), 'qualifiedApproval': None,
            'generationAllowed': False, 'limits': ['Candidate custody/mapping only; no legal, current-source, render, visual-delivery or commercial acceptance']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', help='optional exact original court-source handoff ZIP')
    args = parser.parse_args()
    print(json.dumps(verify(archive=args.archive), indent=2))

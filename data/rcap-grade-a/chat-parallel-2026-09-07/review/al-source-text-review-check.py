#!/usr/bin/env python3
"""Read-only positional source-text check; never an approval of form semantics.
Requires PyMuPDF. --candidate is the extracted Chat3 archive root.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import fitz

FAMILIES = ('al-felony-dwop-set', 'al-felony-nonconviction-90-set')
SOURCES = (
    ('CR-65', 'CODEX-CS1-SRC2__CR-65__c2e0c7bd7abc.pdf', 0, 8,
     'c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39'),
    ('C-10-CRIMINAL', 'AL__FORM__C-10-CRIMINAL__affidavit-of-substantial-hardship-and-order__REV-2024-05__EN.pdf', 8, 3,
     '527d4cfdde5bea564a8729e6425f1042627b03435ec634509fe32fdb80a5c6f8'),
)
PINS = (
    ('d6d1c877ff6d2024182726aae7bca40c376a869256e6ae220673699457f61543',
     'e4600e924c120bbc1821b41a500ce4f968d2293a1cd198b83fdff49a18cf726e'),
    ('e472186921ffc2c56765b30ed426e4d8ffd163e97100f781c127ada4a7966924',
     'ef61fac20c9966ef28d8192315bc0be9aacc5ebd6912ee5c0fda7a192eb89a05'),
)

def characters(page):
    return [c for b in page.get_text('rawdict')['blocks'] if b['type'] == 0
            for line in b['lines'] for span in line['spans'] for c in span['chars']
            if not c['c'].isspace()]


def match(source, target):
    buckets = collections.defaultdict(list)
    for index, char in enumerate(target):
        buckets[char['c']].append(index)
    used, good = set(), 0
    for char in source:
        candidates = [i for i in buckets[char['c']] if i not in used and
                      max(abs(a-b) for a,b in zip(char['bbox'], target[i]['bbox'])) <= .25]
        if candidates:
            used.add(candidates[0])
            good += 1
    return good, len(source) - good


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate', required=True, type=Path)
    parser.add_argument('--sources', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Refusing to overwrite evidence')
    before = {}
    def read_pinned(path, pin):
        data = path.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        if digest != pin:
            raise ValueError(f'Unreviewed input bytes: {path.name}')
        before[path] = digest
        return data
    sources = [(name, read_pinned(args.sources / file, pin), offset, count)
               for name, file, offset, count, pin in SOURCES]
    rows = []
    for family, pins in zip(FAMILIES, PINS):
        for fixture, pin in zip(('canonical', 'boundary'), pins):
            path = args.candidate / f'data/rcap-all50/overlays/census-v1/al/{family}--official-pdf-fill/fixtures/{fixture}.pdf'
            with fitz.open(stream=read_pinned(path, pin), filetype='pdf') as packet:
                if len(packet) != 11:
                    raise ValueError('Complete candidate page count differs')
                for name, raw, offset, count in sources:
                    with fitz.open(stream=raw, filetype='pdf') as source:
                        if len(source) != count:
                            raise ValueError('Source page count differs')
                        for i, page in enumerate(source):
                            good, missing = match(characters(page), characters(packet[offset+i]))
                            equal_size = tuple(page.rect) == tuple(packet[offset+i].rect)
                            rows.append(dict(family=family, fixture=fixture, document=name,
                                sourcePage=i+1, packetPage=offset+i+1, sourceCharacters=good+missing,
                                matched=good, unmatched=missing, pageDimensionsMatch=equal_size))
                            if missing or not equal_size:
                                raise ValueError('Source text-position or page-dimension mismatch')
    for path, digest in before.items():
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError('Input changed during read-only check')
    result = dict(scope='Held-source character/position preservation, not visual, legal or delivery approval',
        pymupdfVersion=fitz.VersionBind, tolerancePoints=.25, comparisons=rows,
        summary=dict(pagesCompared=len(rows), sourceCharactersMatched=sum(x['matched'] for x in rows),
                     unmatched=0, readInputsUnchanged=len(before), packetBuilderExecutions=0))
    with args.output.open('x', encoding='utf-8') as handle:
        json.dump(result, handle, indent=2)
        handle.write('\n')
    print(json.dumps(result['summary'], sort_keys=True))

if __name__ == '__main__':
    main()

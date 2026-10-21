#!/usr/bin/env python3
"""Retain a fixed, completed central raster without semantic/release approval.

Usage: retain-nv-central-receipt.py ZIP RUN_JSON JOBS_JSON
The raster archive holds measured page images, not copies of whole input PDFs.
Whole PDF bytes are therefore read from the exact repository paths AND the
immutable packet commit, then matched to the completed verdict's input pins.
"""
from __future__ import annotations
import copy
import hashlib
import json
import math
from pathlib import Path
import re
import struct
import subprocess
import sys
import zipfile

FAMILY = 'rcap-nv-custom-pleading'
PACKET_COMMIT = '3794a1a1ace8ad3e85423122afd380cabcd58140'
RUN_ID, ARTIFACT_ID = 34101879269, 10011501772
ZIP_SHA = '6fde1c5ee037702ebca44bd7a05071825ed32119086f457226e5afe69f58e3e4'
DOCUMENTS_DIGEST = '3e4e54e12fdd0bcbc969df9e5f97d1a40d363d787f4489ece1a60e69c9e876fd'
EXPECTED = {
    'canonical': '1d72131dcf8adefe7142cb2241aa97811b4c90892342d1422d3441b649e293bf',
    'boundary': '5274a3d33329f447612a9736ac31442a760dc24b4aa2acdc01d7061175578596',
}
PDF_DIR = Path('data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading/fixtures')
OUT = Path('data/rcap-grade-a/nv-completion-2026-09-07/central-raster')
REQUIRED_JOBS = {'Synthetic canary and live negative controls', 'Plan the family matrix', FAMILY}

def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def validate_provenance(run: dict, jobs: list) -> None:
    require(run.get('id') == RUN_ID and run.get('status') == 'completed' and run.get('conclusion') == 'success', 'Central run not successful')
    require(run.get('path') == '.github/workflows/rcap-packet-raster-acceptance-batch.yml', 'Unexpected workflow')
    for name in REQUIRED_JOBS:
        matches = [job for job in jobs if job.get('name') == name]
        require(len(matches) == 1, f'Missing/duplicate central job: {name}')
        job = matches[0]
        require(job.get('run_id') == RUN_ID and job.get('status') == 'completed' and job.get('conclusion') == 'success', f'Central job not passed: {name}')

def validate_verdict(v: dict, images: dict[str, bytes]) -> list[dict]:
    require(v.get('schemaVersion') == 'rcap-raster-family-verdict/v1', 'Unexpected verdict schema')
    require(v.get('familyId') == FAMILY and v.get('verdict') == 'RASTER_PASS', 'Wrong family or verdict')
    require(v.get('packetCommitSha') == PACKET_COMMIT and str(v.get('workflowRunId')) == str(RUN_ID), 'Wrong packet commit or run')
    require(v.get('documentsDigest') == DOCUMENTS_DIGEST, 'Wrong document-set digest')
    require(v.get('coversTheWholeFamily') is True and v.get('packetPdfsModified') == 0, 'Incomplete or modified packet')
    require(v.get('problems') == [] and v.get('environmentProblems') == [], 'Raster problems')
    expected_docs = [dict(role=role, document=f'{role}.pdf', path=str(PDF_DIR/f'{role}.pdf'), pinned=value) for role, value in EXPECTED.items()]
    require(v.get('documentsRendered') == expected_docs, 'Wrong input documents')
    require(v.get('hashesBound') == {r: dict(path=str(PDF_DIR/f'{r}.pdf'), pinned=s) for r, s in EXPECTED.items()}, 'Wrong whole-PDF pins')
    measurements = v.get('measurements', [])
    require(len(measurements) == 88 and v.get('pagesMeasured') == 88, 'Incomplete page count')
    required_pages = {(role, page) for role in EXPECTED for page in range(1, 45)}
    observed, names, retained = set(), set(), []
    for p in measurements:
        role, number = p.get('kind'), p.get('page')
        key = (role, number)
        require(type(number) is int and key in required_pages and key not in observed, 'Wrong/duplicate page')
        observed.add(key)
        name = f'{FAMILY}/{role}/page-{number:03d}.png'
        require(p.get('png') == name and p.get('document') == f'{role}.pdf', 'Wrong image binding')
        require(p.get('nonblank') is True and p.get('croppedToThePage') is True, 'Blank/uncropped page')
        residual = p.get('calibrationResidualPx')
        require(type(residual) in (int, float) and math.isfinite(residual) and 0 <= residual <= 2, 'Bad calibration')
        require(p.get('pageWidthPt') == 612 and p.get('pageHeightPt') == 792, 'Wrong page geometry')
        body = images.get(name, b'')
        require(len(body) == p.get('bytes') and body[:8] == b'\x89PNG\r\n\x1a\n' and len(body) >= 24, 'Missing/truncated page image')
        require(body[12:16] == b'IHDR' and struct.unpack('>II', body[16:24]) == (2448, 3168), 'Wrong PNG geometry')
        names.add(name)
        retained.append(dict(path=name, sha256=sha(body), byteLength=len(body)))
    require(observed == required_pages and set(images) == names, 'Missing/extra measured page images')
    return retained

def negative_controls(verdict: dict, images: dict[str, bytes], run: dict, jobs: list) -> int:
    # In-memory admission controls, not new renderer runs or semantic reviews.
    mutations = [
        lambda v: v.update(verdict='RASTER_FAIL'),
        lambda v: v.update(packetCommitSha='0'*40),
        lambda v: v.update(workflowRunId='0'),
        lambda v: v.update(documentsDigest='0'*64),
        lambda v: v['documentsRendered'].pop(),
        lambda v: v['hashesBound']['canonical'].update(pinned='0'*64),
        lambda v: v['measurements'].pop(),
        lambda v: v['measurements'][1].update(page=1),
        lambda v: v['measurements'][0].update(nonblank=False),
        lambda v: v['measurements'][0].update(calibrationResidualPx=3),
        lambda v: v.update(problems=['clipped']),
        lambda v: v.update(environmentProblems=['missing renderer']),
    ]
    tests = []
    for mutate in mutations:
        changed = copy.deepcopy(verdict); mutate(changed)
        tests.append(lambda changed=changed: validate_verdict(changed, images))
    missing = dict(images); missing.pop(next(iter(missing)))
    corrupt = dict(images); key = next(iter(corrupt)); corrupt[key] = b'broken'
    tests.extend([lambda: validate_verdict(verdict, missing), lambda: validate_verdict(verdict, corrupt),
                  lambda: validate_provenance(dict(run, conclusion='failure'), jobs),
                  lambda: validate_provenance(run, [j for j in jobs if j.get('name') != FAMILY])])
    caught = 0
    for test in tests:
        try: test()
        except RuntimeError: caught += 1
        else: raise RuntimeError('An injected invalid receipt was accepted')
    return caught

def write_once(path: Path, data: bytes) -> None:
    if path.exists():
        require(path.read_bytes() == data, f'Different retained evidence already exists: {path}')
    else:
        path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(data)

def main() -> None:
    require(len(sys.argv) == 4, 'Expected ZIP, RUN_JSON, JOBS_JSON')
    archive, run_path, jobs_path = map(Path, sys.argv[1:])
    run, jobs = json.loads(run_path.read_text()), json.loads(jobs_path.read_text())['jobs']
    validate_provenance(run, jobs)
    require(sha(archive.read_bytes()) == ZIP_SHA, 'Artifact ZIP digest mismatch')
    subprocess.run(['git', 'merge-base', '--is-ancestor', PACKET_COMMIT, 'HEAD'], check=True)
    verdict_name = f'{FAMILY}.verdict.json'
    with zipfile.ZipFile(archive) as z:
        require(len(z.namelist()) == len(set(z.namelist())), 'Duplicate archive names')
        require(sum(i.file_size for i in z.infolist()) < 250_000_000, 'Unexpected archive expansion')
        require(z.namelist().count(verdict_name) == 1, 'Missing exact family verdict')
        verdict = json.loads(z.read(verdict_name))
        images = {n: z.read(n) for n in z.namelist() if re.fullmatch(r'rcap-nv-custom-pleading/(canonical|boundary)/page-\d+\.png', n)}
    page_receipts = validate_verdict(verdict, images)
    current = {}
    for role, expected in EXPECTED.items():
        path = PDF_DIR/f'{role}.pdf'
        body = path.read_bytes()
        original = subprocess.check_output(['git', 'show', f'{PACKET_COMMIT}:{path}'])
        require(body.startswith(b'%PDF-') and sha(body) == expected and sha(original) == expected, f'Current/immutable whole-PDF mismatch: {role}')
        current[role] = dict(path=str(path), sha256=expected)
    caught = negative_controls(verdict, images, run, jobs)
    record = dict(schemaVersion='rcap-nv-central-raster-receipt/v2', familyId=FAMILY,
                  packetCommit=PACKET_COMMIT, workflowRunId=RUN_ID, artifactId=ARTIFACT_ID,
                  artifactZipSha256=ZIP_SHA, downloadedZipDigestVerified=True,
                  workflowConclusion='success', requiredJobsVerified=sorted(REQUIRED_JOBS),
                  rasterVerdict='RASTER_PASS', verdictArchivePath=verdict_name,
                  currentRepositoryPdfs=current, immutableRepositoryPdfsMatch=True,
                  measuredPageImages=page_receipts, pagesMeasured=88,
                  admissionNegativeControlsCaught=caught,
                  currentPacketBytesMatchRaster=True, independentSemanticApprovalGranted=False,
                  newTerminalPromotions=0, productionTouched=False, commercialRoutesOpened=0,
                  qualification='The exact raster artifact contains page images and calibration/temporary page PDFs, not complete input PDFs. Whole inputs were verified at their exact current and immutable Git paths against the verdict pins. This is raster admission only, not semantic review or runtime/fulfillment approval.')
    encode = lambda obj: (json.dumps(obj, indent=2, sort_keys=True)+'\n').encode()
    write_once(OUT/f'{FAMILY}.verdict.json', encode(verdict))
    write_once(OUT/'verified-receipt.json', encode(record))
    print(json.dumps(dict(familyId=FAMILY, rasterVerdict='RASTER_PASS', pagesMeasured=88,
                         admissionNegativeControlsCaught=caught, bothCurrentPdfsMatch=True,
                         newTerminalPromotions=0)))

if __name__ == '__main__':
    main()

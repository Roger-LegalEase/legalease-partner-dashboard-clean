#!/usr/bin/env python3
"""Retain the completed Nevada raster, without creating semantic/release approval.

Usage: python3 scripts/rcap-packet-recovery/retain-nv-central-receipt.py ZIP RUN_JSON JOBS_JSON
The caller obtains these fixed GitHub artifacts using an authorized Actions token.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import zipfile

FAMILY = 'rcap-nv-custom-pleading'
PACKET_COMMIT = '3794a1a1ace8ad3e85423122afd380cabcd58140'
RUN_ID = 34101879269
ARTIFACT_ID = 10011501772
ZIP_SHA = '6fde1c5ee037702ebca44bd7a05071825ed32119086f457226e5afe69f58e3e4'
EXPECTED = {
    'canonical': '1d72131dcf8adefe7142cb2241aa97811b4c90892342d1422d3441b649e293bf',
    'boundary': '5274a3d33329f447612a9736ac31442a760dc24b4aa2acdc01d7061175578596',
}
OUT = Path('data/rcap-grade-a/nv-completion-2026-09-07/central-raster')

def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)

def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for child in value.values():
            yield from strings(child)
    elif isinstance(value, list):
        for child in value:
            yield from strings(child)

def digest(path: Path) -> str:
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def write_once(path: Path, data: bytes) -> None:
    if path.exists():
        require(path.read_bytes() == data, f'Refusing to overwrite different retained evidence: {path}')
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

def main() -> None:
    require(len(sys.argv) == 4, 'Expected ZIP, run JSON and jobs JSON paths')
    archive, run_path, jobs_path = map(Path, sys.argv[1:])
    run = json.loads(run_path.read_text())
    jobs = json.loads(jobs_path.read_text())['jobs']
    require(run['id'] == RUN_ID and run['status'] == 'completed' and run['conclusion'] == 'success', 'Central run is not the recorded successful run')
    require(run['path'] == '.github/workflows/rcap-packet-raster-acceptance-batch.yml', 'Unexpected central workflow')
    required_jobs = {'Synthetic canary and live negative controls', 'Plan the family matrix', FAMILY}
    by_name = {job['name']: job for job in jobs}
    require(required_jobs.issubset(by_name), 'Missing required central jobs')
    for name in required_jobs:
        require(by_name[name]['status'] == 'completed' and by_name[name]['conclusion'] == 'success', f'Central job did not pass: {name}')
    require(digest(archive) == ZIP_SHA, 'Downloaded artifact ZIP digest mismatch')
    subprocess.run(['git', 'merge-base', '--is-ancestor', PACKET_COMMIT, 'HEAD'], check=True)
    found = {}
    verdicts = []
    with zipfile.ZipFile(archive) as z:
        require(sum(i.file_size for i in z.infolist()) < 250_000_000, 'Unexpected artifact expansion size')
        for info in z.infolist():
            if info.filename.lower().endswith('.pdf'):
                sha = hashlib.sha256(z.read(info)).hexdigest()
                for fixture, expected in EXPECTED.items():
                    if sha == expected:
                        found[fixture] = {'archivePath': info.filename, 'sha256': sha}
            elif info.filename.lower().endswith('.json') and 'verdict' in info.filename.lower():
                body = z.read(info)
                document = json.loads(body)
                values = set(strings(document))
                if FAMILY in values and 'RASTER_PASS' in values and PACKET_COMMIT in values:
                    require(set(EXPECTED.values()).issubset(values), 'Verdict does not bind both expected PDF hashes')
                    verdicts.append((info.filename, document))
    require(set(found) == set(EXPECTED), 'Artifact lacks one or both exact packet PDFs')
    require(len(verdicts) == 1, 'Expected exactly one hash-bound family RASTER_PASS verdict')
    current = {}
    tracked = subprocess.check_output(['git', 'ls-files', '-z', '--', '*.pdf']).decode().split('\0')
    for name in tracked:
        if not name:
            continue
        file = Path(name)
        if not file.is_file():
            continue
        sha = digest(file)
        for fixture, expected in EXPECTED.items():
            if sha == expected:
                current[fixture] = {'path': name, 'sha256': sha}
        if set(current) == set(EXPECTED):
            break
    require(set(current) == set(EXPECTED), 'Current branch packet bytes do not match the completed central raster')
    verdict_name, verdict = verdicts[0]
    record = {
        'schemaVersion': 'rcap-nv-central-raster-receipt/v1',
        'familyId': FAMILY, 'packetCommit': PACKET_COMMIT,
        'workflowRunId': RUN_ID, 'artifactId': ARTIFACT_ID,
        'artifactZipSha256': ZIP_SHA, 'downloadedZipDigestVerified': True,
        'workflowConclusion': 'success', 'requiredJobsVerified': sorted(required_jobs),
        'rasterVerdict': 'RASTER_PASS', 'verdictArchivePath': verdict_name,
        'artifactPdfs': found, 'currentRepositoryPdfs': current,
        'currentPacketBytesMatchRaster': True,
        'independentSemanticApprovalGranted': False, 'newTerminalPromotions': 0,
        'productionTouched': False, 'commercialRoutesOpened': 0,
        'qualification': 'Completed central raster evidence only. This record does not replace independent semantic review, operational ledger reconciliation, or runtime/fulfillment proof.',
    }
    encode = lambda obj: (json.dumps(obj, indent=2, sort_keys=True) + '\n').encode()
    write_once(OUT / 'rcap-nv-custom-pleading.verdict.json', encode(verdict))
    write_once(OUT / 'verified-receipt.json', encode(record))
    print(json.dumps({'familyId': FAMILY, 'rasterVerdict': 'RASTER_PASS', 'bothCurrentPdfsMatch': True, 'newTerminalPromotions': 0}))

if __name__ == '__main__':
    main()

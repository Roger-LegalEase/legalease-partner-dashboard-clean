#!/usr/bin/env python3
"""Verify three exact Chat6 transports; optionally install only their four blank PDFs.
No registry, packet, entitlement, or approval writes. Requires Python 3.10+ only.
Run in a dedicated destination worktree, never another worker's active worktree.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import stat
import sys
import zipfile

PREFIX = 'reference/chat-parallel-2026-09-07/chat6/'
TRANSPORTS = {
 'ut': ('chat6-ut-special-source-handoff-20260907.zip', 205453,
        'b2b753287df6857cf3a7904c0de8ca4e28836770b2a74104a6835fc69ea99427', {
  PREFIX+'ut-special/1001EX-Revised-2023-04-10.pdf': (112139, '0f575aa4c08f9ce0001ea386177f08ed707ff72b55c0036d07d024693dbca1ed'),
  PREFIX+'ut-special/1021EX-Revised-2025-04-14.pdf': (104276, '2b730d0a34f91a69f0316ac8a8e9ce78f559e554c564a9ebcc271533daefc174')}),
 'me': ('chat6-maine-jv043-source-handoff-20260907.zip', 159341,
        '6c232414288a3c19b39bfb605c57060882884d4efd91ea99d636fcfd208431f1', {
  PREFIX+'me/JV-043-Rev-12-21.pdf': (173449, '79d0e40df56d060a4bd51f9f022cc95b444b5791f486c3e7c92640d76ed095e7'),
  'data/rcap-grade-a/chat-parallel-2026-09-07/chat6-source-legal/me-jv043-source-receipt.json': (1745, '90f08d10afcd34e0baf54dc9e731900e8fedded8183fb537e807e3f35ffdb1ce')}),
 'il': ('chat6-il-denying-original-20260907.zip', 755443,
        '6c2e85c70f928145ba73252dcdc84be7402598199489cf7b58e7a77fe0108e06', {
  PREFIX+'il-orders/ATJ2906.6-06-26-original.pdf': (782948, '2d3039fa873801bc58bf425a2c73f489951bb82de33b11af031e8bf62df3ffa8'),
  PREFIX+'il-orders/SOURCE_RECEIPT.json': (2764, '27cc3437b3dc2d0560e2089e2f38894b4afe39db08c4c71f087fc056b36f9c96')})
}

def digest(data: bytes) -> str:
 return hashlib.sha256(data).hexdigest()

def verified_members(path: Path, key: str) -> dict[str, bytes]:
 _, size, sha, expected = TRANSPORTS[key]
 data = path.read_bytes()
 if len(data) != size or digest(data) != sha:
  raise ValueError(f'{key}: transport length or SHA256 differs')
 with zipfile.ZipFile(path) as z:
  entries = z.infolist()
  if len(entries) != len(expected) or {i.filename for i in entries} != set(expected):
   raise ValueError(f'{key}: duplicate, missing or unexpected member')
  if z.testzip() is not None:
   raise ValueError(f'{key}: CRC failure')
  out = {}
  for i in entries:
   p = PurePosixPath(i.filename)
   if p.is_absolute() or '..' in p.parts or stat.S_ISLNK(i.external_attr >> 16):
    raise ValueError(f'{key}: unsafe member')
   content = z.read(i)
   if (len(content), digest(content)) != expected[i.filename]:
    raise ValueError(f'{key}: member length or SHA256 differs: {i.filename}')
   out[i.filename] = content
 return out

def install_blanks(root: Path, members: dict[str, bytes]) -> list[dict]:
 """Preflight all destinations, refuse symlinks/different existing bytes; exclusive create.
 This is idempotent, not an atomic multi-file transaction. An OS failure may leave
 a verified subset installed; a retry verifies that subset rather than overwriting.
 """
 root = root.resolve(strict=True)
 targets = []
 for rel, data in members.items():
  if not rel.startswith(PREFIX) or not rel.endswith('.pdf'):
   continue  # source receipts are verified but not installed over evidence files
  dest = root / rel
  for p in [dest, *list(dest.parents)]:
   if p == root:
    break
   if p.is_symlink():
    raise ValueError(f'symlink destination refused: {rel}')
  if not dest.resolve().is_relative_to(root):
   raise ValueError(f'outside destination root: {rel}')
  if dest.exists() and (not dest.is_file() or dest.read_bytes() != data):
   raise ValueError(f'preexisting nonmatching destination refused: {rel}')
  targets.append((rel, dest, data, dest.exists()))
 results = []
 for rel, dest, data, existed in targets:
  dest.parent.mkdir(parents=True, exist_ok=True)
  if not existed:
   with dest.open('xb') as f:
    f.write(data)
  if dest.read_bytes() != data:
   raise ValueError(f'installed-byte readback mismatch: {rel}')
  results.append({'path':rel,'sha256':digest(data),'bytes':len(data),
                  'status':'already_identical' if existed else 'installed_and_read_back'})
 return results

def main() -> int:
 p = argparse.ArgumentParser(description=__doc__)
 p.add_argument('--downloads', required=True, type=Path)
 p.add_argument('--only', choices=TRANSPORTS, action='append')
 p.add_argument('--install-root', type=Path)
 a = p.parse_args()
 members = {}
 checks = []
 for key in (a.only or list(TRANSPORTS)):
  name, size, sha, _ = TRANSPORTS[key]
  members.update(verified_members(a.downloads / name, key))
  checks.append({'transport':key,'file':name,'bytes':size,'sha256':sha,'verified':True})
 installed = install_blanks(a.install_root,members) if a.install_root else []
 print(json.dumps({'transports':checks,'sourceFiles':installed,
  'destinationInstallationMeasured':bool(a.install_root),
  'destination':str(a.install_root.resolve()) if a.install_root else None,
  'registryWrites':False,'packetApproval':False,'freshIssuerDownload':False},indent=2))
 return 0

if __name__ == '__main__':
 try:
  raise SystemExit(main())
 except (OSError, ValueError, zipfile.BadZipFile) as e:
  print(json.dumps({'error':str(e),'packetApproval':False}),file=sys.stderr)
  raise SystemExit(1)

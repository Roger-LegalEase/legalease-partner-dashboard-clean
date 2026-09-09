#!/usr/bin/env python3
"""Apply only the two discovery edits to the exact observed shared reader.
Does not execute the reader, write its matrix, or grant any state.
"""
import argparse, hashlib, pathlib, sys

PATH = pathlib.Path('scripts/rcap-packet-completeness/verify-packet-completeness.mjs')
BASE_GIT_BLOB = '95f695c83c6d6a0cb110d82075b4abf5b49452a4'
IMPORT_OLD = 'import fs from "node:fs";\n'
IMPORT_NEW = IMPORT_OLD + 'import { hasDeclaredMoPacketSet } from "./mo-declared-packet-discovery.mjs";\n'
OLD = '''const looksBuilt = (dir) => {
  const fixtures = path.join(ROOT, dir, "fixtures");
  if (!fs.existsSync(path.join(ROOT, dir, "production-field-map.json"))) return false;
  if (!fs.existsSync(fixtures)) return false;
  return fs.readdirSync(fixtures, { recursive: true }).some((f) => String(f).endsWith(".pdf"));
};'''
NEW = OLD.replace('if (!fs.existsSync(fixtures)) return false;',
                  'if (!fs.existsSync(fixtures)) return hasDeclaredMoPacketSet(ROOT, dir);')

def blob(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()

def transform(data):
    text = data.decode('utf-8')
    if text.count(IMPORT_OLD) != 1 or text.count(OLD) != 1:
        raise ValueError('Expected import/discovery preimage not found exactly once')
    return text.replace(IMPORT_OLD, IMPORT_NEW, 1).replace(OLD, NEW, 1).encode()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=pathlib.Path)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    root = args.root.resolve(strict=True)
    file = root / PATH
    at = root
    for segment in PATH.parts:
        at /= segment
        if at.is_symlink():
            raise ValueError('Refusing symlink in reader path')
    before = file.read_bytes()
    if blob(before) != BASE_GIT_BLOB:
        # Recognize ONLY this transformation of the exact original, not a marker.
        text = before.decode('utf-8')
        if text.count(IMPORT_NEW) == 1 and text.count(NEW) == 1:
            original = text.replace(IMPORT_NEW, IMPORT_OLD, 1).replace(NEW, OLD, 1).encode()
            if blob(original) == BASE_GIT_BLOB:
                print('ALREADY_APPLIED: exact two-edit successor; no write')
                return
        raise ValueError('Reader changed since the reviewed anchor; reconcile rather than overwrite')
    after = transform(before)
    # Verify reversible, exclusive changes before any target write.
    restored = after.decode().replace(IMPORT_NEW, IMPORT_OLD, 1).replace(NEW, OLD, 1).encode()
    if restored != before:
        raise ValueError('Transformation changed bytes outside intended edits')
    helper = root / 'scripts/rcap-packet-completeness/mo-declared-packet-discovery.mjs'
    if not helper.is_file() or helper.is_symlink():
        raise ValueError('Install and verify supplied helper before enabling its import')
    if hashlib.sha256(helper.read_bytes()).hexdigest() != 'd191540ad145e9b0aad1c4fabcb41de0c25141e95c4a14aad6eb20fa37d69c2e':
        raise ValueError('Supplied helper hash does not match executed discovery tests')
    if args.apply:
        # Exclusive adjacent temporary file + recheck; refuse concurrent changes.
        temp = file.with_name(file.name + '.mo-discovery-new')
        try:
            with temp.open('xb') as stream:
                stream.write(after)
            temp.chmod(file.stat().st_mode & 0o777)
            if file.read_bytes() != before:
                raise ValueError('Concurrent reader change detected')
            temp.replace(file)
        finally:
            if temp.exists():
                temp.unlink()
    print(('APPLIED' if args.apply else 'CHECK_OK') + ': ' + str(PATH))
    print('before_git_blob=' + blob(before))
    print('after_git_blob=' + blob(after))
    print('after_sha256=' + hashlib.sha256(after).hexdigest())

if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, UnicodeError) as error:
        print('REFUSED: ' + str(error), file=sys.stderr)
        raise SystemExit(2)

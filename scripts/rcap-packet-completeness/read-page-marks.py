#!/usr/bin/env python3
"""The ink a page places, as positions rather than words.

pdftotext reports glyphs. A tick on a route-election form is two diagonal path
strokes and carries no glyph at all, so text extraction reads two different
filings as one document. This prints the page and rounded position of every
path-placing operator, which is what tells one tick position from another.

Rounding is to 0.1pt: a tick is a deliberate mark at a deliberate place, and
rounding stops a float printed as 130.50000000000001 reading as a difference.
"""
import re, sys
import pikepdf

OP = re.compile(rb'([-\d.]+)\s+([-\d.]+)\s+(?:[-\d.]+\s+[-\d.]+\s+)?(re|m|l)\b')

def main(path):
    marks = []
    with pikepdf.open(path) as pdf:
        for n, page in enumerate(pdf.pages, 1):
            try:
                cs = page.Contents
                body = b''.join(bytes(s.read_bytes()) for s in (cs if isinstance(cs, pikepdf.Array) else [cs]))
            except Exception:
                continue
            for m in OP.finditer(body):
                try:
                    x = round(float(m.group(1)), 1)
                    y = round(float(m.group(2)), 1)
                except ValueError:
                    continue
                marks.append(f"{n}:{m.group(3).decode()}:{x},{y}")
    marks.sort()
    sys.stdout.write("|".join(marks))
    return 0

if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1]))

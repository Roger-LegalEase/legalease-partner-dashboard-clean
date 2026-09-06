#!/usr/bin/env python3
"""Generate byte-stable review-only PDFs; never writes into the repository by default."""
import argparse, hashlib, json
from pathlib import Path

def esc(s): return s.replace("\\","\\\\").replace("(","\\(").replace(")","\\)")
def pdf(lines):
    y=760; ops=["BT /F1 10 Tf"]
    for line in lines:
        ops.append(f"1 0 0 1 54 {y} Tm ({esc(line[:95])}) Tj"); y-=15
        if y<45: break
    ops.append("ET"); stream="\n".join(ops).encode()
    objs=[b"<< /Type /Catalog /Pages 2 0 R >>",b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
      b"<< /Length "+str(len(stream)).encode()+b" >>\nstream\n"+stream+b"\nendstream",
      b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    out=bytearray(b"%PDF-1.4\n%SRC-X7\n"); offsets=[0]
    for i,o in enumerate(objs,1): offsets.append(len(out)); out+=f"{i} 0 obj\n".encode()+o+b"\nendobj\n"
    x=len(out); out+=f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n".encode()
    for n in offsets[1:]: out+=f"{n:010d} 00000 n \n".encode()
    out+=f"trailer << /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{x}\n%%EOF\n".encode(); return bytes(out)

p=argparse.ArgumentParser(); p.add_argument("input"); p.add_argument("output"); a=p.parse_args()
d=json.loads(Path(a.input).read_text()); lines=[d["title"],"REVIEW CANDIDATE — NOT FOR FILING",""]
for k,v in d["fields"].items(): lines.append(f"{k}: {v}")
b=pdf(lines); Path(a.output).write_bytes(b)
print(json.dumps({"path":a.output,"byteLength":len(b),"sha256":hashlib.sha256(b).hexdigest()},sort_keys=True))

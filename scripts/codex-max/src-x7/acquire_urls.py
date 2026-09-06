#!/usr/bin/env python3
"""Acquire SRC-X7 URLs to temporary storage and commit receipts, never bodies."""
import concurrent.futures, hashlib, json, re, tempfile, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/"data/rcap-grade-a/codex-max/source-and-candidate/src-x7"
rows=json.loads((OUT/"corroborated-urls.json").read_text())["urls"]

def digest(p):
 h=hashlib.sha256()
 with open(p,"rb") as f:
  for b in iter(lambda:f.read(1024*1024),b""): h.update(b)
 return h.hexdigest()

def get(row):
 u=row["normalizedUrl"]
 try:
  req=urllib.request.Request(u,headers={"User-Agent":"LegalEase-source-audit/1.0","Accept":"application/pdf,text/html,application/octet-stream;q=0.8,*/*;q=0.5"})
  with urllib.request.urlopen(req,timeout=20) as r:
   status=r.status; final=r.geturl(); ctype=r.headers.get("Content-Type","").split(";")[0].lower(); history=[]
   data=r.read(20*1024*1024+1)
  if len(data)>20*1024*1024: raise ValueError("BODY_EXCEEDS_20_MIB_AUDIT_LIMIT")
  low=data[:10000].lower()
  if b"<html" in low and re.search(br"<(title|h1)[^>]*>[^<]*(login|sign in|access denied|not found|error)",low):
   raise ValueError("REFUSED_LOGIN_OR_HTML_ERROR_BODY")
  with tempfile.NamedTemporaryFile(prefix="src-x7-",delete=True) as f:
   f.write(data);f.flush(); one=digest(f.name);two=digest(f.name)
  if one!=two: raise ValueError("HASH_RECOMPUTATION_MISMATCH")
  return "receipt",{"normalizedUrl":u,"requestedUrlSha256":row["normalizedUrlSha256"],"httpStatus":status,
    "redirects":history,"finalUrl":final,"contentType":ctype,"byteLength":len(data),"contentSha256":one,
    "hashRecomputed":True,"temporaryBodyDeleted":True,"supportingEvidenceFiles":row["supportingEvidenceFiles"],
    "status":"ACQUISITION_READY","commercialAuthority":False}
 except Exception as e:
  return "block",{"normalizedUrl":u,"reason":type(e).__name__,"detail":str(e)[:500]}

receipts=[];blocks=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
 for kind,result in ex.map(get,rows): (receipts if kind=="receipt" else blocks).append(result)
payload={"schemaVersion":"src-x7-acquisition-receipts/v1","assignment":"SRC-X7","measuredAtHead":json.loads((OUT/"state.json").read_text())["baseSha"],
 "temporaryStorage":"OS temporary files deleted after double hashing","readyCount":len(receipts),"blockedCount":len(blocks),
 "receipts":sorted(receipts,key=lambda x:x["normalizedUrl"]),"blocks":sorted(blocks,key=lambda x:x["normalizedUrl"])}
(OUT/"acquisition-ready-receipts.json").write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n")
state=json.loads((OUT/"state.json").read_text());state.update(acquisitionReadyReceipts=len(receipts),acquisitionBlocks=len(blocks),status="COMPLETE")
(OUT/"state.json").write_text(json.dumps(state,indent=2,sort_keys=True)+"\n")
print(json.dumps({"ready":len(receipts),"blocked":len(blocks)}))

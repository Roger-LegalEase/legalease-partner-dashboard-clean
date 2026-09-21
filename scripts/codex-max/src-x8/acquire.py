#!/usr/bin/env python3
"""Acquire SRC-X8 URLs into /tmp only and write metadata-only receipt payloads."""
import concurrent.futures,hashlib,json,re,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]; OUT=ROOT/'data/rcap-grade-a/codex-max/source-and-candidate/src-x8'
data=json.load(open(OUT/'corroborated-urls.json'))
todo=[x for x in data['urls'] if not x['existingReceiptEvidence']]
tmp=Path(tempfile.gettempdir())/'legalease-src-x8'; tmp.mkdir(exist_ok=True)
def one(x):
 u=x['normalizedUrl']; key=x['normalizedUrlSha256']; body=tmp/(key+'.body'); hdr=tmp/(key+'.headers')
 cp=subprocess.run(['curl','--silent','--show-error','--location','--max-redirs','8','--connect-timeout','8','--max-time','20','--output',str(body),'--dump-header',str(hdr),'--write-out','%{http_code}\n%{url_effective}\n%{content_type}\n%{num_redirects}\n',u],text=True,capture_output=True)
 vals=cp.stdout.splitlines(); status=int(vals[0]) if vals and vals[0].isdigit() else 0
 raw=body.read_bytes() if body.exists() else b''; ctype=vals[2] if len(vals)>2 else ''
 redirects=[]
 if hdr.exists():
  blocks=re.split(rb'\r?\n\r?\n',hdr.read_bytes())
  redirects=[b.splitlines()[0].decode(errors='replace') for b in blocks if b.startswith(b'HTTP/')]
 low=raw[:4096].lower(); login=(b'<html' in low or b'<!doctype html' in low) and any(w in low for w in (b'login',b'sign in',b'access denied',b'not found',b'error 404'))
 accepted=cp.returncode==0 and 200<=status<300 and len(raw)>0 and not login
 rec={'normalizedUrl':u,'normalizedUrlSha256':key,'supportingEvidenceFiles':x['supportingEvidenceFiles'],'httpStatus':status,'redirectChainStatusLines':redirects,'finalUrl':vals[1] if len(vals)>1 else None,'contentType':ctype or None,'byteLength':len(raw),'sha256':hashlib.sha256(raw).hexdigest() if raw else None,'hashRecomputed':bool(raw),'temporaryBodyPath':str(body),'status':'ACQUISITION_READY' if accepted else 'ACQUISITION_BLOCKED','block':None if accepted else ('REFUSED_LOGIN_OR_HTML_ERROR_BODY' if login else (cp.stderr.strip() or 'HTTP_OR_EMPTY_BODY_BLOCK'))}
 return rec
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex: results=list(ex.map(one,todo))
ready=[x for x in results if x['status']=='ACQUISITION_READY']; blocks=[x for x in results if x['status']!='ACQUISITION_READY']
# Paths document gitignored temporary locations only; no body is copied into the repository.
payload={'schemaVersion':'src-x8-acquisition-ready-receipts/v1','acquiredToTemporaryGitignoredStorage':str(tmp),'receiptsReady':ready,'blocks':blocks,'sourceBodiesCommitted':0}
(OUT/'acquisition-ready-receipts.json').write_text(json.dumps(payload,indent=2,sort_keys=True)+'\n')
state=json.load(open(OUT/'state.json')); state['counts']['acquisitionReadyReceipts']=len(ready); state['counts']['acquisitionBlocks']=len(blocks); (OUT/'state.json').write_text(json.dumps(state,indent=2,sort_keys=True)+'\n')
print(json.dumps({'attempted':len(results),'ready':len(ready),'blocked':len(blocks)}))

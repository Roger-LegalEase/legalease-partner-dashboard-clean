"""Bounded saved-byte regression checks for VFMO1 findings; not final acceptance."""
import hashlib,json,re,sys
from pathlib import Path
import pymupdf
EVIDENCE=Path('data/rcap-grade-a/packet-factory-24h/warp-20260912/mo-610-140-two/independent-semantic-review/semantic-findings.json')
assert hashlib.sha256(EVIDENCE.read_bytes()).hexdigest()=='67c903de9be7e2309c5f901c9160419bbcc0c0667c886009dfaefcd538b1199b', 'Prior independent findings changed'
prior=json.loads(EVIDENCE.read_text());results=[]
def norm(s):return re.sub(r'[^a-z0-9]','',s.lower())
for family in prior['families']:
 family_id=family['familyId'];base=Path(f'data/rcap-all50/overlays/census-v1/mo/{family_id}--official-pdf-fill');report=json.loads((base/'reports/rendered-artifacts.json').read_text());checks=[];bindings=[]
 def check(fixture,name,passed,detail):checks.append(dict(fixture=fixture,check=name,passed=bool(passed),detail=detail))
 packets={p['fixture']:p for p in report['packets']};assert set(packets)=={'canonical','boundary'}
 for fixture,packet in packets.items():
  p=base/packet['file'];raw=p.read_bytes();pdf=pymupdf.open(stream=raw,filetype='pdf');bindings.append(dict(path=str(p),sha256=hashlib.sha256(raw).hexdigest(),byteLength=len(raw),pageCount=len(pdf)))
  check(fixture,'saved_packet_binding',hashlib.sha256(raw).hexdigest()==packet['sha256'] and len(pdf)==packet['pageCount'],'Current combined bytes compared to the render report.')
  components={d['documentId']:d for d in packet['documents'] if d.get('firstPage') is not None}
  for omitted in family['knownOmissions']:
   if omitted['fixture']!=fixture:continue
   component=omitted['component'];expected=omitted['heldValue'];readings=[]
   if component=='FI-05':
    c=components[component]
    # Find the actual filer-contact page by its source caption. FI-05
    # repeats party pages, while its trailing source pages appear once.
    for index in range(c['firstPage']-1,c['firstPage']-1+c['pageCount']):
     if 'submittedby' not in norm(pdf[index].get_text()):continue
     clip=pymupdf.Rect(omitted['sourceRectTopLeft']);text=pdf[index].get_text(clip=clip);readings.append({'page':index+1,'text':text.strip(),'rectangle':list(clip)})
   elif component=='CR370':
    c=components[component];index=c['firstPage']-1
    clip=pymupdf.Rect(330,284,580,312) if omitted['field']=='Municipal Police Dept. name' else pymupdf.Rect(330,322,580,375)
    readings.append({'page':index+1,'text':pdf[index].get_text(clip=clip).strip(),'rectangle':list(clip)})
   else:
    assert component=='CR370/continuation'
    for name in ['CR370','continuation']:
     if name not in components:continue
     c=components[name]
     for index in range(c['firstPage']-1,c['firstPage']-1+c['pageCount']):readings.append({'page':index+1,'text':pdf[index].get_text()})
   passed=bool(readings) and (all(norm(expected) in norm(r['text']) for r in readings) if component=='FI-05' else any(norm(expected) in norm(r['text']) for r in readings))
   check(fixture,'known_omission:'+omitted['field']+(':'+str(omitted['caseRow']) if 'caseRow' in omitted else ''),passed,{'expected':expected,'caseNumber':omitted.get('caseNumber'),'readings':readings if component!='CR370/continuation' else [{'page':r['page'],'valueFound':norm(expected) in norm(r['text'])} for r in readings]})
  if 'GN10' in components:
   c=components['GN10'];text=pdf[c['firstPage']-1].get_text();check(fixture,'GN10_date_file_stamp_caption',c['pageCount']==1 and 'datefilestamp' in norm(text),'Preserve the held one-page source caption; no invented second order page.')
  if family_id=='mo-610-140-arrest-set':
   c=components.get('continuation');text='' if not c else '\n'.join(pdf[i].get_text() for i in range(c['firstPage']-1,c['firstPage']-1+c['pageCount']))
   check(fixture,'continuation_signature_and_date_handback',re.search(r'\bsignature\b',text,re.I) and re.search(r'\bdate\b',text,re.I),'Presence of personal signature/date handback labels only; blanks and geometry require independent review.')
  pdf.close()
 results.append(dict(familyId=family_id,passed=all(c['passed'] for c in checks),artifactsRead=bindings,checks=checks))
out=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/mo-current-saved-byte-preflight-result.json');result=dict(schemaVersion='rcap-focused-saved-byte-preflight/v1',priorFindingsPath=str(EVIDENCE),priorFindingsSha256=hashlib.sha256(EVIDENCE.read_bytes()).hexdigest(),independentAcceptance=False,visualAcceptance=False,families=results,passed=all(r['passed'] for r in results),limits='Measures the 23 prior known omissions in current combined PDFs, each caption-identified FI-05 filer block, GN10 caption and arrest signature/date label presence. Does not certify geography, eligibility, row association, signatures remaining blank, service, complete instructions or visual acceptance.');out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'passed':result['passed'],'families':[{'familyId':r['familyId'],'checks':len(r['checks']),'failed':sum(not c['passed'] for c in r['checks'])} for r in results]},indent=2));sys.exit(0 if result['passed'] else 1)

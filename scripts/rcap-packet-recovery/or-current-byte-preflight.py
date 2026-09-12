"""Focused OR saved-byte regression checks; never substitutes independent acceptance."""
import hashlib,json,re,sys,unicodedata
from collections import Counter
from pathlib import Path
import pymupdf
BASE=Path('data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill')
EVIDENCE=Path('data/rcap-grade-a/packet-factory-24h/warp-20260912/or-current-review/semantic-findings.json')
prior=json.loads(EVIDENCE.read_text()); report=json.loads((BASE/'reports/rendered-artifacts.json').read_text())
def norm(s):
 return re.sub(r'[^a-z0-9]', '',unicodedata.normalize('NFKC',s).lower().replace('oregon','or'))
census=json.loads(Path('data/rcap-all50/overlays/lane-c-candidates/oregon/or-osp-set-aside-criminal-history-request-and-instructions/field-census.json').read_text())
osp_fields={f['name']:f for f in census['fields']}
osp_labels={'NAME':'NAME','DATE OF BIRTH':'DATE OF BIRTH','MAILING ADDRESS':'Street, City, State, Zip code','CIRCUIT OR MUNICIPAL COURT row1':'1'}
source_rows=prior['sourceBindings']
sources={}
for source in source_rows:
 raw=Path(source['path']).read_bytes();assert hashlib.sha256(raw).hexdigest()==source['sha256'] and len(raw)==source['byteLength'];sources[source['sha256']]=pymupdf.open(stream=raw,filetype='pdf')
def glyphs(page):
 return Counter((c['c'],tuple(round(x,1) for x in c['bbox'])) for b in page.get_text('rawdict')['blocks'] if b['type']==0 for line in b['lines'] for span in line['spans'] for c in span['chars'] if not c['c'].isspace())
checks=[];bindings=[]
def check(fixture,name,passed,detail): checks.append(dict(fixture=fixture,check=name,passed=bool(passed),detail=detail))
expected_fixtures={'canonical--arrest-no-charges','boundary--arrest-no-charges','canonical--dismissed-charge','boundary--dismissed-charge'}
assert len(report['artifacts'])==4 and {a['fixture'] for a in report['artifacts']}==expected_fixtures,'All four route/role assemblies are mandatory'
for artifact in report['artifacts']:
 fixture=artifact['fixture'];opened=[];located=[];texts=[]
 handoff=artifact.get('agencyHandoff')
 check(fixture,'separate_agency_delivery',bool(handoff) and handoff.get('deliveryRole')=='separate_agency_handoff' and 'criminal_history_request' not in artifact['components'],'OSP is separately addressed and excluded from court-filing components.')
 for delivery in [artifact]+([handoff] if handoff else []):
  p=Path(delivery['file']);raw=p.read_bytes();h=hashlib.sha256(raw).hexdigest();pdf=pymupdf.open(stream=raw,filetype='pdf');opened.append(pdf)
  bindings.append(dict(path=str(p),sha256=h,byteLength=len(raw),pageCount=len(pdf)))
  check(fixture,'saved_artifact_binding:'+p.name,h==delivery['sha256'] and len(raw)==delivery['byteLength'] and len(pdf)==delivery['pageCount'],'Report compared against actual saved PDF bytes.')
  texts.append('\n'.join(page.get_text() for page in pdf))
  for entry in delivery['pageManifest']:
   page=pdf[entry['packetPage']-1];located.append((entry,page,p))
   source=sources.get(entry.get('sourceSha256'))
   if source is None:continue
   original=glyphs(source[entry['sourcePage']-1]);delivered=glyphs(page);missing=original-delivered
   check(fixture,'source_glyph_preservation:'+p.name+':p'+str(entry['packetPage']),not missing,{'sourceSha256':entry['sourceSha256'],'sourcePage':entry['sourcePage'],'originalGlyphOccurrences':sum(original.values()),'missingGlyphOccurrences':sum(missing.values())})
 source_page_keys=[(e.get('sourceSha256'),e.get('sourcePage')) for e,_,_ in located if e.get('sourceSha256') in sources]
 expected_source_pages={(h,i+1) for h,d in sources.items() for i in range(len(d))}
 check(fixture,'complete_official_source_page_coverage',len(source_page_keys)==len(expected_source_pages) and set(source_page_keys)==expected_source_pages,'Every exact held OJD and OSP source page occurs once across court and separate agency deliveries.')
 for omitted in prior['measurements']['knownFactOmissions']:
  if omitted['fixture']!=fixture:continue
  certificate=omitted['field'].startswith('Defendant Name')
  candidates=[(e,page,p) for e,page,p in located if e.get('sourcePage')==(5 if certificate else 1) and e.get('component')==('motion_and_declaration' if certificate else 'criminal_history_request')]
  check(fixture,'located_component:'+omitted['field'],len(candidates)==1,'Locate original source page by current delivery manifests.')
  if len(candidates)!=1:continue
  _,page,p=candidates[0]
  if certificate:clip=pymupdf.Rect(280,645,580,683)
  else:
   rect=osp_fields[osp_labels[omitted['field']]]['widgets'][0]['rect'];clip=pymupdf.Rect(rect['x']-1,792-rect['y']-rect['height']-1,rect['x']+rect['width']+1,792-rect['y']+1)
  actual=page.get_text(clip=clip);expected=omitted['value']
  if omitted['field']=='DATE OF BIRTH':
   year,month,day=expected.split('-');expected=f'{month}/{day}/{year}'
  check(fixture,'neutral_prefill:'+omitted['field'],norm(expected) in norm(actual),{'path':str(p),'expected':expected,'readText':actual.strip(),'rectangle':list(clip)})
 text='\n'.join(texts)
 check(fixture,'no_internal_route_identifiers',not re.search(r'obligation:track-only|rcap-or-official-pdf-fill|sha[- ]?256|canonical--|boundary--',text,re.I),'Search actual delivered PDF text, not author report.')
 for name,pattern in [('firearm_stop',r'firearm'),('immigration_stop',r'immigration'),('traffic_scope',r'traffic'),('county_scope',r'(multiple|different|separate|each).{0,80}count'),('overflow_handback',r'(additional|more|continuation).{0,100}(offen[cs]e|page|attach)')]:
  check(fixture,name,re.search(pattern,text,re.I|re.S),'Scope/handback presence only; independent reviewer must accept meaning.')
 for pdf in opened:pdf.close()
result=dict(schemaVersion='rcap-focused-saved-byte-preflight/v1',familyId='rcap-or-official-pdf-fill',independentAcceptance=False,visualAcceptance=False,priorFindingsPath=str(EVIDENCE),priorFindingsSha256=hashlib.sha256(EVIDENCE.read_bytes()).hexdigest(),artifactsRead=bindings,checks=checks,passed=all(c['passed'] for c in checks),limits='Checks known neutral omissions, internal identifiers and required scope text. Does not certify all eight finding classes, protected fields, agency sequencing, checkbox geometry, fee semantics, complete source drawing fidelity or original visual acceptance.')
out=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/or-current-saved-byte-preflight-result.json');out.write_text(json.dumps(result,indent=2)+'\n')
failed=[c for c in checks if not c['passed']];print(json.dumps({'passed':result['passed'],'checks':len(checks),'failed':len(failed),'failures':[{'fixture':c['fixture'],'check':c['check']} for c in failed],'output':str(out)},indent=2));sys.exit(0 if result['passed'] else 1)

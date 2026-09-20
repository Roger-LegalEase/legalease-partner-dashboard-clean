from pathlib import Path
import json,hashlib,collections
import pymupdf as pm
B=Path('data/rcap-grade-a/packet-factory-24h/pf20/kansas-four-closeout-20260912/birth-year-followup');S=B/'semantic-review';F=B/'final-review';sem=json.loads((S/'semantic-preflight.json').read_text())
def pin(p):
 p=Path(p);b=p.read_bytes();return dict(path=str(p),sha256=hashlib.sha256(b).hexdigest(),byteLength=len(b))
def glyphs(p):
 return [(c[0],tuple(round(v,3) for v in c[3]),c[2]) for t in p.get_texttrace() for c in t['chars']]
def key(g):return (g[0],g[1])
fields={'NamePrint':'participant.full_legal_name','Address 1':'participant.street_address','City State Zip':'participant.city_state_zip','Telephone':'participant.phone','Email Address':'participant.email'}
rows=[]
for sr in sem['rows']:
 fam=sr['familyId'];mp=next(x['path'] for x in sr['inputs'] if x['path'].endswith('production-field-map.json'));m=json.loads(Path(mp).read_text());fp=next(x['path'] for x in sr['inputs'] if x['path'].endswith('participant-facts.json'));facts=json.loads(Path(fp).read_text())['fixtures'];miss=[];submitted=[];sweep=[]
 for inp in sr['inputs']:assert pin(inp['path'])['sha256']==inp['sha256']
 for i,x in enumerate(m['refusals']):
  lbl=x.get('effectiveLabel','');own=lbl.startswith('Submitted by');docidx=next(j for j,v in enumerate(m['maps']) if v['documentId']==x['documentId']);srcpin=sr['sources'][docidx];source=pm.open(srcpin['path']);page=source[x['page']-1]
  sw=next(w for w in page.widgets() if w.field_name==x['field']);rect=sw.rect
  if own:
   role='PARTICIPANT_NEUTRAL_KNOWN' if x['field'] in fields else ('ATTORNEY_ONLY_NOT_APPLICABLE_PRO_SE' if x['field']=='Supreme Court Number' else 'OPTIONAL_PARTICIPANT_CONTENT_UNKNOWN')
   submitted.append(dict(mapPointer=f'/refusals/{i}',source=srcpin,sourcePage=x['page'],field=x['field'],sourceRect=list(rect),printedBlock='Submitted by: Signature of Defendant/Defendant’s Attorney',currentClass=x['completenessClass'],correctActor=role))
   if x['field'] in fields:
    packetpage=14 if docidx==4 else 16
    for fx in sr['fixtures']:
     pdf=pm.open(fx['pdf']['path']);op=pdf[packetpage-1];sc=collections.Counter(key(g) for g in glyphs(page));added=[]
     for g in glyphs(op):
      if sc[key(g)]:sc[key(g)]-=1
      else:added.append(g)
     inrect=[g for g in added if rect.contains(pm.Point((g[1][0]+g[1][2])/2,(g[1][1]+g[1][3])/2))]
     assert not inrect,(fam,x['field'],inrect)
     miss.append(dict(fixture=fx['fixture'],pdf=fx['pdf'],packetPage=packetpage,source=srcpin,sourcePage=x['page'],field=x['field'],rect=list(rect),mapPointer=f'/refusals/{i}',factId=fields[x['field']],expected=facts[fx['fixture']][fields[x['field']]],addedGlyphsInField=[],actualValue='',currentDisposition=x['completenessDisposition'],correctDisposition='KNOWN_PARTICIPANT_PREFILL'))
  else:role='NO_ADDITIONAL_KNOWN_PARTICIPANT_VALUE_IN_HELD_FACTS'
  sweep.append(dict(mapPointer=f'/refusals/{i}',documentId=x['documentId'],sourcePage=x['page'],field=x['field'],printedRole=lbl,reviewConclusion=role))
 assert len(miss)==20
 out=dict(schemaVersion='rcap-independent-current-submitted-by-measurement/v1',familyId=fam,packetCommit='f6fc009ffc3a94b1a4bc9db84888db3a081f9f01',inputs=[pin(x['path']) for x in sr['inputs']],sources=sr['sources'],sourceOwnershipBasis='The two held forms label a separate Submitted by block Signature of Defendant/Defendant’s Attorney, distinct from judge signature and prosecutor Approved by. These are unsigned proposed forms; location below IT IS SO ORDERED does not change the printed actor.',submittedFields=submitted,missingKnownOccurrences=miss,missingKnownOccurrenceCount=20,allRefusalsSwept=sweep,refusalSweepCount=len(sweep),sweepLimits='No arrest date is inferred from offence date; no alias, race, sex, officer, DL/SSN, historical discharge/conviction details, or prosecutor identity is invented. District ordinal and filing county are not treated as an independently held historical diverting authority. Court findings/appearance/service remain judicial/clerk acts. Supreme Court Number is attorney-only; optional second address/fax are not new required facts.',signatureTreatment='Source flat Submitted-by signature belongs to defendant or their attorney and must remain unfilled, with participant handback. This review does not establish mandatory signing timing or invent a requirement to sign both orders before filing.',priorPreflightCorrection='Earlier preflight wrongly accepted inherited court-owned classification for the Submitted-by block and checked that its fields were empty. That was insufficient: the known-write enumeration did not include known neutral values hidden by an incorrect actor label. New semantic review must assert source actors for every refusal as well as verify requested writes.',status='FAIL_REPAIR_REQUIRED')
 path=F/(fam+'-submitted-by-findings.json');path.write_text(json.dumps(out,indent=2)+'\n');rows.append(pin(path));print(fam,len(miss),'missing known values;',len(sweep),'refusals swept')
summary=dict(schemaVersion='rcap-independent-additional-final-review-finding/v1',reviewer='GPT-6 Astra /root/seven_independent_review',status='FAIL_REPAIR_REQUIRED',findingId='KS-SUBMITTED-BY-PARTICIPANT-NEUTRAL-FIELDS',currentRun='34669691683',rows=rows,missingKnownOccurrences=80,governingContract=pin('docs/PRODUCT_CONTRACT.md'),contractRule='Known screening facts prefill the packet workflow; never make the participant answer the same question again because the second screen uses different wording.',earlierPreflight=pin(S/'semantic-preflight.json'),earlierPreflightDisposition='Preserved unchanged as dispatch history, explicitly disproven for complete known-prefill and actor classification by this current-source finding. No terminal acceptance was granted.',currentPdfBytesPreserved=True,implementationModified=False)
(F/'additional-submitted-by-findings.json').write_text(json.dumps(summary,indent=2)+'\n')
print(pin(F/'additional-submitted-by-findings.json'))

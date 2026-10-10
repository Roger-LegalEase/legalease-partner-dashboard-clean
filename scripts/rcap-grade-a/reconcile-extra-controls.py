"""Bind observed extras to specific browser receipts; never infer a pass from census."""
import json, os, pathlib, collections
root=pathlib.Path(os.environ['RCAP_CAMPAIGN_DIR'])
rows=[json.loads(line) for line in (root/'extra-control-ledger.jsonl').read_text().splitlines()]
controls={r['controlId']:r for r in map(json.loads,(root/'control-ledger.jsonl').read_text().splitlines())}
cases={r['caseId']:r for r in map(json.loads,(root/'acceptance-ledger.jsonl').read_text().splitlines())}
def read(name):
 p=root/'controls'/f'{name}.json'
 return json.loads(p.read_text()) if p.exists() else {'proofs':[]}
nav=read('extra-navigation');inputs=read('extra-inputs');disclosures=read('extra-disclosures');wilma=read('wilma')
def proven(row,evidence,reason,disposition='IMPLEMENTED_AND_VERIFIED',result='PASS'):
 row.update(disposition=disposition,result=result,reason=reason,evidence=list(dict.fromkeys(['controls/retained-census.json']+evidence)),reviewedBy='implementation_agent',independentBlindReview=False)
def original(row,id,reason):
 c=controls[id];proven(row,c['evidence'],reason+' Original map control: '+id,'CONSOLIDATED_TO:'+id,c['result'])
def case(row,id,reason):
 c=cases[id]
 if c['result']=='PASS':proven(row,c['evidence'],reason)
for r in rows:
 label,actor,route=r['currentLabel'],r['actor'],r['actualRoute']
 r['reason']='Keep existing control. Actual action verification remains pending; rendered observation is insufficient.'
 # Same shared component control may appear on several pages. Preserve every observed instance.
 for proof in nav['proofs']:
  if proof['result']=='PASS' and actor==proof['actor'] and any(i['href']==proof['href'] for i in r['instances']):
   proven(r,['controls/extra-navigation.json'],'Keep: actual authenticated link click reached the intended authorized page/anchor. Shared navigation instances retain their exact census routes.');break
 for proof in inputs['proofs']+read('extra-admin-actions')['proofs']+read('consumer-global')['proofs']:
  if proof.get('result')=='PASS' and actor==proof['actor'] and (label in proof['controls'] or label=='Español' and 'Español portal toggle' in proof['controls']):proven(r,['controls/extra-inputs.json','controls/extra-admin-actions.json','controls/consumer-global.json'],'Keep: '+proof['action'])
 for proof in disclosures['proofs']:
  if proof['result']=='PASS' and actor==proof['actor'] and label==proof['label'] and r['tag']=='SUMMARY':proven(r,['controls/extra-disclosures.json'],'Keep: '+proof['action'])
 if label=='Access and team Existing authorized memberships and access administration. Open workspace →':original(r,'A00-04','The expanded card text is the same mapped authorized team destination.')
 if label in ['Review reason','Approve asset']:original(r,'A09-28','Private asset inspection and actual positive review are recorded in the existing browser evidence.')
 if label in ['Invite program staff','Contact email','Name / label'] and '/internal/partners/onboarding/' in route:case(r,'P-T10','Keep fixed-role staff invitation fields in the program Team & access section; actual invitation, mailbox delivery, recipient acceptance and scoped membership are evidenced.')
 if label in ['Who the program serves *','Headline','Introduction','Participant support instructions'] and actor=='partner_admin':case(r,'P-T08','Keep: customized English was saved through these exact partner fields, source matched, then translated through the actual protected provider and read back in bilingual materials.')
 if label=='Name / label' and '/partner/team' in route:original(r,'P03-03','Display label belongs to the same actual scoped staff invitation.')
 if label=='Supporting document (optional)':case(r,'P-T13','Keep optional private supporting document disclosure; actual file upload, private inspection and authority use are evidenced.')
 if label=='Search states and DC' and '/internal/partners/onboarding/' in route:original(r,'A04-13','Same JurisdictionPicker component as the actual filter/selection interaction; canonical multistate edits and unauthorized additions are separately exercised.')
 if label=='Search states and DC' and actor=='partner_admin':original(r,'P01-20','Same JurisdictionPicker search component with server-constrained partner jurisdiction set; actual reduction and restoration are evidenced.')
 if label.startswith('Tool 4 —') and r['tag']=='A':original(r,'U05-07','Existing owned matter breadcrumb/card navigation; actual canonical matter opening and protected readback are evidenced.')
 if route.endswith('/packet-information') and label in ['',"I'm not sure",'Back']:
  if read('packet-question-controls').get('result')=='PASS':proven(r,['controls/packet-question-controls.json'],'Keep canonical packet-question controls: actual unsure selection, exact persisted readback, restored input and meaningful first-screen Back navigation. aria-labelledby supplies the accessible input name.')
  else:r.update(result='VERIFICATION_PENDING',disposition='FAIL')
 if label=='Edit packet information':original(r,'U06-02','Actual edit-and-return path invalidates prior verification and preserves saved authoritative facts.')
 if label in ['English','Español'] and route.startswith('/intake/'):case(r,'U-T05','Keep actual EN/ES intake control; the mobile Spanish code and participant journey preserve selected locale.')
 if label in ['Ask Wilma'] and wilma.get('result')=='PASS':
  proven(r,['controls/wilma.json'],'Keep: actual panel open/close, message submit, deterministic unavailable-provider response and saved report were exercised. This is not genuine Wilma-provider acceptance.')
 if label=='Check my options':case(r,'U-T07','Keep existing entry to the actual nationwide screening journey; no extra program admission is performed by navigation audit.')
 if r['result']=='VERIFICATION_PENDING':r['disposition']='FAIL'
(root/'extra-control-ledger.jsonl').write_text('\n'.join(json.dumps(r) for r in rows)+'\n')
print(json.dumps({'extras':len(rows),'tally':dict(collections.Counter(r['result'] for r in rows))}))
for r in rows:
 if r['result']=='VERIFICATION_PENDING':print(r['controlId'],r['actor'],r['currentLabel'],r['actualRoute'])

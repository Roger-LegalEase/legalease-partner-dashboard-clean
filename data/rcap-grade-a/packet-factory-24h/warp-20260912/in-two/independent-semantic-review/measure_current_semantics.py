import pathlib,json,hashlib,re,collections,json5,pymupdf,shutil
ROOT=pathlib.Path('.'); O=ROOT/'data/rcap-grade-a/packet-factory-24h/warp-20260912/in-two/independent-semantic-review'; S=O/'snapshot'; BASE=pathlib.Path('data/rcap-all50/overlays/census-v1/in'); SRC=pathlib.Path('private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/IN/02_PACKET_FORMS')
def pin(p):
 b=p.read_bytes();return {'path':str(p),'sha256':hashlib.sha256(b).hexdigest(),'byteLength':len(b)}
def dump(p,x):p.write_text(json.dumps(x,indent=2,ensure_ascii=False)+'\n')
def clean(x):return re.sub(r'[^a-z0-9]','',x.lower())
source={}; docs={}; widgets={}
for key,pat in [('bundle','*CCA-SECTION1-PETITION-ORDER*'),('insert','*CCA-SECTION1-INSERTS*')]:
 p=next(SRC.glob(pat)); source[key]=pin(p);docs[key]=pymupdf.open(p);widgets[key]=json.load(open('/tmp/rcap-in-semantic/'+key+'-widgets.json'))
 shutil.copyfile('/tmp/rcap-in-semantic/'+key+'-source.txt',O/(key+'-source-text.txt'));shutil.copyfile('/tmp/rcap-in-semantic/'+key+'-widgets.json',O/(key+'-source-widgets.json'))
summary=[]
for fam in ['in_arrest_no_charges-set','in_section1_petition-set']:
 d=BASE/(fam.replace('_','-')+'--official-pdf-fill');bpath=pathlib.Path('scripts')/('build-census-v1-'+fam+'.mjs');b=(S/bpath).read_text(); c=json5.loads(re.search(r'const CANONICAL = (\{.*?\n\});',b,re.S)[1]);bc=re.search(r'const BOUNDARY = (\{.*?\n\});',b,re.S)[1].replace('...CANONICAL,','');bf={**c,**json5.loads(bc)};facts={'canonical':c,'boundary':bf};dump(O/(fam+'-fixture-facts.json'),{'extractedFrom':pin(S/bpath),'method':'Parse literal constants as JSON5; builder never executed','fixtures':facts})
 m=json.load(open(S/d/'production-field-map.json')); artifact=[]; allrows=[]; missing=[]; partial=[]; unresolved=[]
 for v,f in facts.items():
  for key,stem in [('bundle','packet'),('insert','inserts')]:
   rel=d/'fixtures'/f'{stem}-{v}-filled.pdf';p=S/rel;pdf=pymupdf.open(p);text='\n'.join(page.get_text() for page in pdf); pages=[{'page':i+1,'width':page.rect.width,'height':page.rect.height,'textSha256':hashlib.sha256(page.get_text().encode()).hexdigest(),'textCharacters':len(page.get_text()),'liveWidgets':len(list(page.widgets() or []))} for i,page in enumerate(pdf)]
   ar={**pin(p),'deliveredPath':str(rel),'fixture':v,'sourceKey':key,'pageCount':len(pdf),'pages':pages};artifact.append(ar)
   fm={x['field']:x for x in m['documents'][0 if key=='bundle' else 1]['fields']}
   for i,w in enumerate(widgets[key]):
    field=w['field'];page=w['page'];box=pymupdf.Rect(w['rect']);read=pdf[page-1].get_textbox(box);baseline=docs[key][page-1].get_textbox(box);expected=None;factid=None;actor='PARTICIPANT_UNKNOWN_OR_CONDITIONAL';why='Source role and branch determine handback; map is not authority.'
    if key=='bundle':
     known={'cap-COUNTY':'matter.county','cap-PetitionerFullName':'participant.full_legal_name','Phone':'participant.phone','Email':'participant.email','Address':'participant.street_address'}
     if field in known:factid=known[field];expected=f[factid];actor='NEUTRAL_KNOWN_IDENTITY_OR_CONTACT'
     if field=='Address':expected=f['participant.street_address']+', '+f['participant.city_state_zip'];factid='participant.street_address + participant.city_state_zip';why='Printed current address and distribution address require held postal locality as well as street.'
     if field=='PetDOB':expected='04/17/1991';factid='participant.date_of_birth';actor='NEUTRAL_KNOWN_IDENTITY';why='p3 petition and p9 identity recital do not grant relief; shared field name is no basis to suppress p3.'
     if re.fullmatch('County[1-6]',field):expected=f['matter.county'];factid='matter.county';actor='NEUTRAL_SERVICE_RECIPIENT_IDENTITY';why='County recipient is known; prefill does not assert date, method, signature or completed service.'
     if field=='RelatedCriminalCauseNumbers':
      actor='NEUTRAL_RECORD_IDENTIFIERS';why='Source tooltip asks ALL criminal cause numbers addressed by this petition, most recent first, not only other unrelated cases.'
      if fam=='in_section1_petition-set':expected='\n'.join(x['case_number'] for x in reversed(f['matter.charges']));factid='matter.charges[*].case_number'
     if field in ['PetFullSSN','PetSSN-Last4']:actor='SENSITIVE_PARTICIPANT_HAND_COMPLETION';why='No SSN held; do not invent or persist full SSN.'
     if field=='DD-cap-CourtType':actor='COURT_IDENTITY_REQUIRES_VALID_FACT';why='Held generic District Court is not a supported Indiana circuit/superior caption. Correct fixture/collect exact court; do not guess.'
     if field in ['Fax','AdditionalInformation']:actor='OPTIONAL_OR_CONDITIONAL_PARTICIPANT_CONTENT'
     if page>=9 and expected is None and field!='RelatedCriminalCauseNumbers':actor='COURT_DECISION_OR_CONDITIONAL_AGENCY_HANDOFF'
     if field in ['PetitionerAliases','PetDLorStateID#']:actor='UNKNOWN_PARTICIPANT_IDENTITY';why='Current real name is not an alias; no ID value held.'
    else:
     if page==3:actor='COURT_FINDING_CONTROL' if w['type']=='CheckBox' else 'NEUTRAL_RECORD_RECITAL_IN_PROPOSED_FINDINGS';why='Judicial decisions remain blank; neutral facts may be supplied separately from judicial findings under per-occurrence treatment.'
     if field in ['cap-PetitionerFullName','PetDOB'] and page==4:
      factid='participant.full_legal_name' if field.startswith('cap-') else 'participant.date_of_birth';expected=f[factid] if field.startswith('cap-') else '04/17/1991';actor='NEUTRAL_EXHIBIT_IDENTITY';why='Exhibit A PETITIONER IDENTIFICATION INFORMATION; this field occurs only on p4, not shared with p3.'
     if field=='ArrestDate' and page in [1,4]:factid='matter.arrest_date';expected='03/08/2019';actor='PARTICIPANT_KNOWN_ARREST_FACT';why='Participant facts p1 and Exhibit A p4; shared court p3 occurrence can remain separately protected.'
     if field=='DD-ArrestOrSummons' and page==1:factid='matter.arrest_date and route';expected='arrested';actor='PARTICIPANT_KNOWN_RECORD_TYPE'
     if field=='County' and page==1 and box.y0<80:expected=f['matter.county'];factid='matter.county';actor='PARTICIPANT_KNOWN_ARREST_COUNTY';why='Current fixtures have one held county; route-consistent fixtures must distinguish arrest county when different.'
     if field=='CountyCityArrest' and page==4:expected=f['matter.county'];factid='matter.county';actor='NEUTRAL_RECORD_LOCATION'
     if field in ['CauseNumber','Criminal Cause Number'] and page in [1,4] and fam=='in_section1_petition-set':expected=f['matter.case_number'];factid='matter.case_number';actor='NEUTRAL_RECORD_IDENTIFIER'
     if field=='OffenseDescript-Ct1' and page in [1,4] and fam=='in_section1_petition-set':expected=f['matter.charge'];factid='matter.charge';actor='PARTICIPANT_KNOWN_CHARGE_DESCRIPTION'
     if field=='Date of Dismissal' and page==4 and fam=='in_section1_petition-set':expected='01/15/2020';factid='matter.disposition_date';actor='NEUTRAL_RECORD_DISPOSITION_DATE';why='Printed label Date of Decision; do not instruct all branches to supply a dismissal date.'
     if field in ['NameArrestingOfficer','ArrestingAgency','LEACaseNumber'] and page!=3:actor='OPTIONAL_IF_KNOWN_OR_AVAILABLE';why=w['label']
     if field in ['DateChargesFiled','DateChargesDismissed','DateAcquittal','AppellateCauseNumber','DateAppellateDecFinal'] and page!=3:actor='PARTICIPANT_BRANCH_CONDITIONAL';why='No charges / dismissed / acquitted / vacated alternatives are not cumulative mandatory fields.'
     if page==1 and w['type']=='CheckBox':actor='PARTICIPANT_LEGAL_ELECTION';why='Only supported route/date assertions may be marked; preserve unanswered prosecutor-declined assertion.'
     if field=='PetFullSSN':actor='SENSITIVE_PARTICIPANT_HAND_COMPLETION'
    row={'fixture':v,'sourceKey':key,'sourceWidgetIndex':i,'field':field,'page':page,'rect':w['rect'],'sourceLabel':w['label'],'sourceType':w['type'],'printedReadback':read,'sourceReadback':baseline,'independentActor':actor,'actorReason':why,'mapDecision':fm.get(field,{}).get('decision'),'mapRoleClass':fm.get(field,{}).get('buildRoleClass'),'mapRequiredBeforeFiling':fm.get(field,{}).get('requiredBeforeFiling'),'expectedFactId':factid,'expectedValue':expected}
    if expected is not None:
     variants=[expected]
     if factid=='participant.date_of_birth':variants+=['1991-04-17','April 17, 1991']
     if factid=='matter.arrest_date':variants+=['2019-03-08','March 8, 2019']
     if factid=='matter.disposition_date':variants+=['2020-01-15','January 15, 2020']
     present=any(clean(e) in clean(read) for e in variants);row['knownValuePresent']=present
     if not present:
      if field=='Address' and clean(f['participant.street_address']) in clean(read):row['failure']='PARTIAL_POSTAL_ADDRESS';partial.append(row)
      else:row['failure']='KNOWN_VALUE_OMITTED';missing.append(row)
    allrows.append(row)
   pdf.close()
 selections=[{'fixture':r['fixture'],'field':r['field'],'page':r['page'],'readback':r['printedReadback'],'markedGlyphReadback':'\x14' in r['printedReadback']} for r in allrows if r['sourceKey']=='insert' and r['sourceType']=='CheckBox']
 info={'schemaVersion':'independent-semantic-measurements/v1','familyId':fam,'reviewScope':'Pre-raster semantic inspection only; no visual acceptance','sources':source,'map':pin(S/d/'production-field-map.json'),'guide':pin(S/d/'participant-instructions.md'),'builder':pin(S/bpath),'artifacts':artifact,'sourceWidgetOccurrencesInspected':len(allrows),'allOccurrenceActorAudit':allrows,'knownFactsMissingMeasuredOccurrences':len(missing),'partialPostalAddresses':len(partial),'missingKnownOccurrences':missing,'partialAddressOccurrences':partial,'selectedControls':selections,'factsEvidence':pin(O/(fam+'-fixture-facts.json')),'scopeLimits':'Counts cover explicitly resolved held facts in these frozen fixtures. Route-inconsistent fixture data and uncollected branches cannot be promoted by drawing speculative values. Neutral record fields on court p3 and some conditional recipient/record slots require actor-aware repair; no visual counters are inferred.'}
 dump(O/(fam+'-measurements.json'),info);summary.append({'family':fam,'pages':sum(x['pageCount'] for x in artifact),'widgetOccurrences':len(allrows),'missingKnown':len(missing),'partialAddresses':len(partial),'missingByField':dict(collections.Counter(x['field'] for x in missing))})
dump(O/'measurement-summary.json',summary);print(json.dumps(summary,indent=2))

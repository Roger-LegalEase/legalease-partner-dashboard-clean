#!/usr/bin/env python3
"""Chat 7 CR301/CR311/FI-05 report adapter. It reads actual complete PDFs.
No renderer, shared registry or global completeness matrix is implemented here.
The existing JavaScript auditFamily function computes the nine counters separately.
"""
from pathlib import Path
from collections import Counter
import hashlib,json,re
import fitz
from PIL import Image
from mistaken_identity_completion_lists import emit_completion_lists
_PIXELS={}
_TEXT={}
ROOT=Path(__file__).resolve().parents[3]
FAMILY='mo-610-145-mistaken-identity-set'
OUT=ROOT/'data/rcap-all50/overlays/census-v1/mo'/f'{FAMILY}--official-pdf-fill'
SRC=ROOT/'reference/chat-parallel-2026-09-07/chat7'
LANE=ROOT/'scripts/rcap-packet-recovery/chat7'
def sha(b): return hashlib.sha256(b).hexdigest()
def read(p): return json.loads(p.read_text())
def write(p,v): p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,indent=2)+'\n')
def norm(t): return re.sub(r'\s+',' ',str(t)).strip()
def inactive(reason): return dict(completenessDisposition='NOT_APPLICABLE_ON_THIS_ROUTE',routeConditionThatMakesItInapplicable=reason,reason=reason)
def protected(reason,actor='court'):
    return dict(completenessDisposition='PROTECTED_FIELD',refusalClass='signature_or_date_participant_completion' if actor=='participant' else 'court_prosecutor_clerk_or_agency_owned',reason=reason,completionActor=actor)
def needed(reason): return dict(completenessDisposition='REQUIRED_BEFORE_FILING',requiredBeforeFiling=True,reason=reason,completionActor='participant from records before filing')
pmap={'Circuit Number':'court.circuit','County Name':'court.county','Petitioner':'participant.fullName','Petitioners full name':'participant.fullName','Race':'participant.race','Date of birth':'participant.dateOfBirth','Social Security Number':'participant.ssn','Drivers License Number':'participant.driversLicense','Address at time of arrest':'arrest.address','Offense charged':'arrest.offense','Date of arrest':'arrest.date','Arrest Citation Number if known':'arrest.citationNumber','Date of dismissal/acquittal':'dispositionDate','County and/or municipality where arrest occurred':'arrest.countyMunicipality','Arresting_Agency':'arrest.agency','Case Number':'court.originalCaseNumber','Case number':'filing.assignedCaseNumber','Division':'court.division','PETITIONER_ADDRESS':'participant.address','CITY_ST_ZIP':'participant.cityStateZip'}
plabel={'Arresting_Agency':'Name of Arresting Agency','PETITIONER_ADDRESS':"Petitioner's Address",'CITY_ST_ZIP':'City, State, ZIP','Date of birth':'Date of Birth','Petitioners full name':"Petitioner's Full Name"}
fmap={'Name if a person Last':'lastName','First':'firstName','Middle':'middleName','DOBDOD':'dateOfBirth','SSN':'ssn','Address':'address','City':'city','State':'state','Zip':'zip','Contact Telephone Number':'phone','Email Address':'email','Organization if nonperson':'organization'}
flabel={'Text1':'Style of Case','CountyCity of St Louis':'County/City of St. Louis','DOBDOD':'DOB/DOD','Name if a person Last':'Name (if a person): Last'}
def parties(f): return [{'kind':'person',**f['participant']}]+f['respondents']
def detail(form,field,r,f,sheet=0):
    """Field identity and obligation derive from source face and selected party, not regex excuses."""
    label=plabel.get(field,field) if form=='CR301' else flabel.get(field,field)
    result=dict(effectiveLabel=label,printedLabel=label,completenessClass=None)
    if form=='CR301':
        result['factId']=pmap.get(field)
        if field=='Case number' and not f['opensNewCase']:result['factId']='court.originalCaseNumber'
        if field in ['Judge or Division','Court ORI number','Offense Cycle Number'] or (field=='Case number' and f['opensNewCase']):
            result.update(protected('Assigned or confirmed by the receiving court when this filing is accepted. Not an original-case fact.'))
        elif r['type']=='CheckBox':
            result.update(inactive('This is the unselected alternative to the supplied identity basis, court level, sex or named-record-holder selection; the selected alternative is printed. No check is a sworn assertion of an unknown fact.'))
        elif field in ['Division of Circuit Court','Division of Associate Court','Division of Municipal Court',"County Sheriff's Department",'Municipal Police Department name','Missouri State Highway Patrol Troop','County of Prosecuting Attorney','Municipality of the Municipal Prosecuting Attorney','Other_Agencies_Names']:
            result.update(inactive('This record-holder category is absent from the supplied respondent list; its associated checkbox is not selected.'))
        elif field=='Arrest Citation Number if known':
            result.update(dict(completenessDisposition='OPTIONAL_PARTICIPANT_CONTENT',reason='The printed field expressly says if known; no citation number was supplied. Optional participant-authored identifier.'))
        else: result.update(needed('Obtain or confirm this exact personal/case detail from the participant and underlying record before filing; do not substitute a guessed identifier.'))
    elif form=='FI-05':
        if r['page']==2:
            if field.startswith('Redacted Information'):
                result.update(inactive('No redacted document or redaction entry is supplied in this candidate. No unredacted attachment is claimed. Check any court-required redaction before filing.'))
            elif field in ['Bar ID required if attorney']:
                result.update(inactive('The submitted-by party is self-represented, with no attorney bar identifier.'))
            elif field in ['Address if not shown above','City_4','State_4','Zip_4']:
                result.update(inactive('The submitter is the participant whose mailing address is already printed on the first confidential party page; these fields apply only if not shown above.'))
            else:
                key={'Submitted by':'fullName','Phone':'phone','Email Address_4':'email'}.get(field,field)
                result['factId']='participant.'+key
                result.update(needed('Ask the participant for this contact detail before filing, or confirm with the clerk that an unavailable contact method is not required.'))
        elif field=='Filing Date':
            result.update(protected('The actual filing date is completed when filing occurs, not dated by the preparer in advance.','participant'))
        elif field=='The unredacted document is attached to this filing sheet in':
            result.update(inactive('No separate unredacted document is attached in this candidate. Do not certify a nonexistent attachment.'))
        elif field in ['Case Type Code','Case Type Description']:
            result['factId']='filing.'+('caseTypeCode' if field.endswith('Code') else 'caseTypeDescription')
            result.update(needed('Confirm the receiving court case type/code against the enclosed official code list; the case may be filed in a different division from the original criminal case.'))
        elif r['rect'][1]>=193 and r['rect'][1]<584:
            slot=0 if r['rect'][1]<323 else 1 if r['rect'][1]<453 else 2
            absolute=sheet*3+slot
            ps=parties(f); party=ps[absolute] if absolute<len(ps) else None
            rootfield=re.sub(r'_[23456]$','',field)
            role='participant' if absolute==0 else f'respondents.{absolute-1}'
            result['partyIndex']=absolute
            result['printedLabel']=flabel.get(rootfield,rootfield)
            result['effectiveLabel']=f"Party slot {slot+1}: {result['printedLabel']}"
            result['factId']=role+'.'+fmap.get(rootfield,rootfield)
            if party is None: result.update(inactive('This extra party slot is unused: all supplied parties are already identified on the preceding filled slots.'));result['factId']=None
            elif 'Attorney Name' in field or field.startswith('Bar ID') or field in ['Party Type Code_2','Party Type Code_4','Party Type Code_6']:
                result.update(inactive('No attorney appears for this party in the supplied record; the attorney name, bar number and attorney party-code block do not apply.'));result['factId']=None
            elif party.get('kind')!='person' and (rootfield in ['Name if a person Last','First','Middle','DOBDOD','SSN'] or field.startswith('Check Box')):
                result.update(inactive('This party is an organization, not a person; personal name, birth/death, gender and Social Security fields do not apply.'));result['factId']=None
            elif party.get('kind')=='person' and rootfield=='Organization if nonperson':
                result.update(inactive('This party is a person, not an organization.'));result['factId']=None
            elif field.startswith('Check Box'):
                result.update(inactive('The other gender checkbox is selected from the participant-supplied gender; do not check both.'));result['factId']=None
                result['printedLabel']='Gender: '+('Male' if int(field.split('Box')[1])%2==0 else 'Female');result['effectiveLabel']=f"Party slot {slot+1}: {result['printedLabel']}"
            else:
                result.update(needed('Supply this party detail or confirm its applicability with the clerk before filing. For a person, full SSN is required only when reasonably available; last four digits are not substituted.'))
        else:
            result['factId']={'Text1':'case.style','CountyCity of St Louis':'court.county'}.get(field)
            result.update(needed('Supply this identified filing detail from the participant or receiving clerk before filing.'))
    return result

def pixel_delta(a,b,rect):
    q=fitz.Rect(rect)
    def cached(page):
        key=(page.parent.name,page.number)
        if key not in _PIXELS:
            pm=page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
            _PIXELS[key]=Image.frombytes('RGB',(pm.width,pm.height),pm.samples)
        return _PIXELS[key]
    box=tuple(round(v*2) for v in q)
    return cached(a).crop(box).tobytes()!=cached(b).crop(box).tobytes()
def visible(page,source,row,m):
    rect=fitz.Rect(row['rect'])
    if m.get('checked'):
        inner=fitz.Rect(rect.x0+2,rect.y0+2,rect.x1-2,rect.y1-2)
        return pixel_delta(source,page,inner),None,0
    value=norm(m.get('value',''))
    expanded=fitz.Rect(rect.x0-1,rect.y0-1,rect.x1+1,rect.y1+1)
    key=(page.parent.name,page.number)
    if key not in _TEXT:_TEXT[key]=(page,page.get_textpage())
    obtained=norm(_TEXT[key][0].get_textbox(expanded,textpage=_TEXT[key][1]))
    ok=value in obtained
    return ok,obtained,len(value.replace(' ','')) if ok else 0

def generate():
    manifest=read(OUT/'packet-manifest.json');contract=read(LANE/'mistaken-identity-packet-contract.json')
    write(OUT/'packet-set-manifest.json',contract)
    census={};docs={}
    for filename in ['CR301.pdf','FI-05.pdf','CR311.pdf']:
        doc=fitz.open(SRC/filename);docs[filename]=doc
        census[filename]=[dict(field=w.field_name,page=i+1,type=w.field_type_string,rect=list(w.rect)) for i,p in enumerate(doc) for w in p.widgets() or []]
    writes=[];blanks=[];actual=[];artifacts=[];packets=[];required=set()
    bindings={n:dict(formNumber=n[:-4],path=str((SRC/n).relative_to(ROOT)),sha256=sha((SRC/n).read_bytes()),pages=len(docs[n])) for n in docs}
    for variant in manifest['variants']:
        pdf=fitz.open(OUT/variant['packet']); measured=sha((OUT/variant['packet']).read_bytes())
        assert measured==variant['sha256'] and len(pdf)==variant['pages']
        fixture=variant['id'].split('.')[0]; packetdocs=[];metrics=dict(fixture=variant['id'],sha256=measured,valuesReportedByFinalizer=0,addedGlyphsReadFromOutputBytes=0,flattenedWidgetAppearancesReadFromOutputBytes=0,nonWhitespaceGlyphsOutsideMeasuredWriteBoxes=0,refusedFieldsWithInk=[])
        if variant['id']=='automatic-on-notice':
            assert len(pdf)==2 and all(c['component']=='instructions' for c in variant['components'])
        else:
            facts=read(OUT/(fixture+'.fixture.json'));facts['opensNewCase']='.new-case.' in variant['id']
            coverage=read(OUT/(variant['id']+'.coverage.json'))
            for c in coverage:
                form=c['component']; start=c['firstPage']-1
                if form=='instructions':packetdocs.append({'formNumber':'instructions','firstPage':start+1,'pageCount':c['pages']});continue
                source=docs[form+'.pdf']; audit=c['audit']
                occurrences=[]
                if form=='FI-05':
                    for sheet,a in enumerate(audit['fills']):
                        occurrences.append((sheet+1,1,start+sheet,a['mapped'],sheet))
                    occurrences.append((len(audit['fills'])+1,2,start+len(audit['fills']),audit['fills'][-1]['mapped'],0))
                else: occurrences=[(1,1,start,audit['mapped'],0)]
                for occurrence,sourcepage,outputpage,mapped,sheet in occurrences:
                    docid=f"{variant['id']}/{form}/page-{occurrence}"
                    packetdocs.append(dict(documentId=docid,formNumber=form,sourcePage=sourcepage,packetPage=outputpage+1))
                    mapped_by={m['field']:m for m in mapped}
                    proof=[]
                    native=[r for r in census[form+'.pdf'] if r['page']==sourcepage]
                    if form=='CR311':
                        # Complete caption/checkbox inventory plus the protected judicial blanks.
                        native=[]
                        for m in mapped:
                            rect=m.get('rect')
                            if rect: x,y,w,h=rect;rr=[x,y,x+w,y+h]
                            else:
                                slots={'circuit':[44.5,166.5],'associate':[44.5,184],'municipal':[44.5,201],'sheriff':[233,166.5],'police':[233,184],'mhp':[233,201],'repository':[233,218],'countyProsecutor':[44.5,267.5],'municipalProsecutor':[44.5,285]}
                                x,y=slots[m['field'].split(':')[1]];rr=[x-6,y-8,x+6,y+8]
                            native.append(dict(field=m['field'],page=1,type='CheckBox' if m.get('checked') else 'Text',rect=rr))
                        static=[('Judge or Division',[36,68,280,105]),('Court ORI Number',[292,105,460,123]),('Date File Stamp',[470,65,565,121]),('Judicial finding: Case Number',[90,347,320,372]),('Judicial correction directives',[36,459,570,491]),('Judge signature',[315,614,575,649]),('Judgment date',[33,615,251,649])]
                        if facts['opensNewCase']: static.append(('Assigned Case Number (clerk)',[290,68,460,103]))
                        for label,rect in static:native.append(dict(field=label,page=1,type='static',rect=rect,protected=True))
                        # Unselected named record-holder categories, their labels and Other caption.
                        slots={'circuit':[44.5,166.5],'associate':[44.5,184],'municipal':[44.5,201],'sheriff':[233,166.5],'police':[233,184],'mhp':[233,201],'repository':[233,218],'countyProsecutor':[44.5,267.5],'municipalProsecutor':[44.5,285]}
                        for kind,(x,y) in slots.items():
                            if not any(r['kind']==kind for r in facts['respondents']):
                                native.append(dict(field='unselected respondent:'+kind,page=1,type='CheckBox',rect=[x-6,y-8,x+6,y+8],inactive=True))
                        # Each unselected caption text slot is separate from its checkbox.
                        textslots={'circuit':[166,159,56],'associate':[181,176,41],'municipal':[180,193,42],'sheriff':[374,159,106],'police':[376,176,104],'mhp':[391,193,80],'countyProsecutor':[100,260,130],'municipalProsecutor':[110,277,120]}
                        for kind,(x,y,w) in textslots.items():
                            if not any(t['kind']==kind for t in facts['respondents']):
                                native.append(dict(field='unselected respondent label:'+kind,page=1,type='Text',rect=[x,y,x+w,y+12],inactive=True))
                        if not any(r['kind']=='other' for r in facts['respondents']):native.append(dict(field='Other: agency name and address',page=1,type='Text',rect=[246,247,571,298],inactive=True))
                    for r in native:
                        field=r['field'];mid=f'{docid}/{field}'
                        row=dict(fieldId=mid,fieldName=field,documentId=docid,formNumber=form,sourceSha256=bindings[form+'.pdf']['sha256'],page=outputpage+1,sourcePage=sourcepage,rect=r['rect'],isSelectionControl=r['type']=='CheckBox',fixture=variant['id'])
                        row.update(detail(form,field,r,facts,sheet) if form!='CR311' else dict(effectiveLabel=field,printedLabel=field,completenessClass=None))
                        fact=row.get('factId')
                        if fact:row['factId']=fixture+':'+fact
                        if field in mapped_by:
                            m=mapped_by[field];ok,drawn,glyphs=visible(pdf[outputpage],source[sourcepage-1],r,m)
                            row.update(value=m.get('value','X' if m.get('checked') else ''),decision='write')
                            for k in ['completenessDisposition','requiredBeforeFiling','reason','refusalClass','routeConditionThatMakesItInapplicable']:row.pop(k,None)
                            writes.append(row)
                            proof.append(dict(field=field,factId=row.get('factId'),expected=m.get('value','X'),drawnText=m.get('value','X') if ok else drawn,visibleInArtifactBytes=ok,everyWidgetVisibleInArtifactBytes=ok,rect=r['rect'],page=outputpage+1,measurement='PyMuPDF text read from the exact field rectangle; checked controls also compared to the blank source pixels'))
                            metrics['valuesReportedByFinalizer']+=1;metrics['addedGlyphsReadFromOutputBytes']+=glyphs
                            if m.get('checked') and ok:metrics['flattenedWidgetAppearancesReadFromOutputBytes']+=1
                            if not ok:metrics['nonWhitespaceGlyphsOutsideMeasuredWriteBoxes']+=1
                        else:
                            if form=='CR311':row.update(protected('The judicial finding, correction directive, assigned caption, date or signature belongs to the court.') if r.get('protected') else inactive('This record-holder category is not selected from the supplied respondent list.'))
                            if row.get('requiredBeforeFiling'):required.add((form,row['effectiveLabel']))
                            row['decision']='refuse';blanks.append(row)
                    if form=='FI-05':
                        blanks.append(dict(fieldId=docid+'/court-assigned-case-number',fieldName='Case Number (For Court Use Only)',documentId=docid,formNumber=form,effectiveLabel='Case Number (For Court Use Only)',printedLabel='Case Number (For Court Use Only)',page=outputpage+1,sourcePage=sourcepage,fixture=variant['id'],**protected('The printed source explicitly reserves this assigned-case header to the court.')))
                    actual.append(dict(fixture=variant['id'],documentId=docid,formNumber=form,sourceSha256=bindings[form+'.pdf']['sha256'],actualWrites=proof))
                # Static execution blanks are not omitted just because they lack widgets.
                if form=='CR301':
                    for field,rect in [("Petitioner's Signature",[344,623,558,654]),('Date File Stamp (clerk)',[450,48,579,120])]:
                        blanks.append(dict(fieldId=f'{variant["id"]}/CR301/{field}',fieldName=field,documentId=f'{variant["id"]}/CR301/page-1',formNumber=form,effectiveLabel=field,printedLabel=field,page=start+1,sourcePage=1,rect=rect,fixture=variant['id'],**protected('Personal signature or court filing execution, not a held case fact.','participant' if 'Signature' in field else 'court')))
                protected_rects={'CR301':[[344,623,558,654]],'CR311':[[34,319,578,669]]}.get(form,[])
                for rect in protected_rects:
                    if pixel_delta(source[0],pdf[start],rect): metrics['refusedFieldsWithInk'].append({'fieldId':f'{form}:protected-execution','rect':rect})
        # Page bounds and flattening are measured independently of producer declarations.
        for page in pdf:
            assert not list(page.widgets() or []),'unflattened field'
            assert not list(page.annots() or []),'remaining annotation'
            for w in page.get_text('words'):
                if w[0]<0 or w[1]<0 or w[2]>page.rect.width+.1 or w[3]>page.rect.height+.1:metrics['nonWhitespaceGlyphsOutsideMeasuredWriteBoxes']+=1
        artifacts.append(dict(fixture=variant['id'],file=str((OUT/variant['packet']).relative_to(ROOT)),sha256=measured,pageCount=len(pdf),pageManifest=variant['components'],**{k:v for k,v in metrics.items() if k not in ['fixture','sha256']}))
        packets.append(dict(fixture=variant['id'],file=str((OUT/variant['packet']).relative_to(ROOT)),sha256=measured,pages=len(pdf),documents=packetdocs or [{'formNumber':'instructions','pageCount':len(pdf)}]))
    source_census=[dict(formNumber=n[:-4],sourceSha256=bindings[n]['sha256'],fields=rows) for n,rows in census.items()]
    write(OUT/'field-census.census-v1.json',dict(schemaVersion=1,familyId=FAMILY,documents=source_census,staticFieldsAlsoEnumeratedInProductionMap=True))
    write(OUT/'source-receipt.json',dict(schemaVersion=1,familyId=FAMILY,allSourcesExact=all(sha((ROOT/b['path']).read_bytes())==b['sha256'] for b in bindings.values()),documents=list(bindings.values()),scope='Exact held source bytes, NOT independent edition acceptance',sourceEditionApproval='PENDING'))
    write(OUT/'production-field-map.json',dict(schemaVersion=1,familyId=FAMILY,writes=writes,refusals=blanks,fixtureScope='All selectable variants; field facts are fixture-qualified to avoid conflating different synthetic participants',packetSetContract=contract['source'],requiredBeforeFiling=[dict(document=a,field=b) for a,b in sorted(required)]))
    write(OUT/'reports/actual-writes.json',dict(schemaVersion=1,familyId=FAMILY,derivedFromArtifactBytes=True,method='Independent readback of each complete PDF by PyMuPDF, not renderer self-report',artifacts=artifacts,documents=actual))
    write(OUT/'reports/rendered-artifacts.json',dict(schemaVersion=1,familyId=FAMILY,artifacts=artifacts,packets=packets))
    write(OUT/'approval-request.json',dict(schemaVersion=1,familyId=FAMILY,status='BUILT_CANDIDATE_REVIEW_PENDING',independentReview='PENDING_CHAT10',raster='PENDING_CHAT_A',noAdmissionGranted=True))
    emit_completion_lists(OUT,manifest,blanks)
    print(json.dumps(dict(variants=len(packets),pages=sum(p['pages'] for p in packets),writes=len(writes),blanks=len(blanks),sourceWidgets={n:len(r) for n,r in census.items()},fieldRectangleReadbackFailures=sum(a['nonWhitespaceGlyphsOutsideMeasuredWriteBoxes'] for a in artifacts),protectedRegionChanges=sum(len(a['refusedFieldsWithInk']) for a in artifacts))))
if __name__=='__main__':generate()

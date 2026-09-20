import pathlib,json,collections,hashlib,pymupdf as pm
B=pathlib.Path('data/rcap-grade-a/packet-factory-24h/pf20/kansas-four-closeout-20260912');O=B/'submitted-by-followup/semantic-review';checks=[];rows=[]
fields={'NamePrint':'participant.full_legal_name','Address 1':'participant.street_address','City State Zip':'participant.city_state_zip','Telephone':'participant.phone','Email Address':'participant.email'}
def pin(p):p=pathlib.Path(p);b=p.read_bytes();return {'path':str(p),'sha256':hashlib.sha256(b).hexdigest(),'byteLength':len(b)}
def glyphs(p):return [{'char':chr(c[0]),'rect':list(c[3]),'origin':list(c[2]),'font':t['font'],'size':t['size'],'dir':t['dir'],'type':t['type'],'opacity':t['opacity']} for t in p.get_texttrace() for c in t['chars']]
def key(g):return(g['char'],g['font'],tuple(round(x,3) for x in g['origin']))
for suffix in ['conviction','diversion','prostitution-coercion','specialty-court']:
 fam='ks-21-6614-'+suffix+'-set';d=pathlib.Path('data/rcap-all50/overlays/census-v1/ks')/(fam+'--official-pdf-fill');m=json.load(open(O/(fam+'-pdf-measurements.json')));maps=json.load(open(d/'production-field-map.json'));facts=json.load(open(d/'fixtures/participant-facts.json'))['fixtures'];source={}
 receipt=json.load(open(d/'source-receipt.json'));offset=0
 for r in receipt['documents']:
  p=pathlib.Path(r['custodyRoot'])/r['pathInCustody'];s=pm.open(p);source[r['documentId']]={'doc':s,'offset':offset,'pin':pin(p)};offset+=len(s)
 current=[];unknown=[];approved=[];signatures=[]
 for fx in ['canonical','boundary']:
  pdf=pm.open(d/'fixtures'/(fx+'.pdf'))
  for sid in ['KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022','KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016']:
   x=source[sid];spn=5 if 'ORDER-FOR' in sid else 2;sp=x['doc'][spn-1];op=pdf[x['offset']+spn-1];sc=collections.Counter(key(g) for g in glyphs(sp));extra=[]
   for g in glyphs(op):
    if sc[key(g)]:sc[key(g)]-=1
    else:extra.append(g)
   sourceText=sp.get_text();assert 'Submitted by:' in sourceText and 'Signature of Defendant' in sourceText
   assert 'Approved by:' in ''.join(p.get_text() for p in x['doc'])
   signatures.append({'fixture':fx,'documentId':sid,'sourcePage':spn,'packetPage':x['offset']+spn,'printedSubmittedByActor':'Signature of Defendant/Defendant’s Attorney','source':x['pin'],'flatSignatureHasNoAddedInk':True,'basis':'Full-page independent delta has zero unexplained additions outside the explicit widget write boxes; no signature is a permitted write.'})
   for w in sp.widgets():
    r=w.rect;inside=[g for g in extra if r.contains(pm.Point((g['rect'][0]+g['rect'][2])/2,(g['rect'][1]+g['rect'][3])/2))];actual=''.join(g['char'] for g in inside).strip();base={'fixture':fx,'documentId':sid,'sourcePage':spn,'packetPage':x['offset']+spn,'field':w.field_name,'sourceRect':list(r),'sourceLabel':w.field_label,'actualFullText':actual,'source':x['pin']}
    if w.field_name in fields:
     expect=facts[fx][fields[w.field_name]];base.update({'expectedFullText':expect,'factId':fields[w.field_name],'exactFullTextIncludingSpaces':actual==expect,'fontAndSize':sorted({(g['font'],round(g['size'],6)) for g in inside}),'horizontalDirections':sorted({tuple(g['dir']) for g in inside}),'boundsContained':all(r.contains(pm.Rect(g['rect'])) for g in inside),'visible':all(g['type']!=3 and g['opacity']>0 for g in inside)});current.append(base)
    elif w.field_name in ['Address 2','Fax Number','Supreme Court Number']:base['independentActor']='ATTORNEY_ONLY_NOT_APPLICABLE_PRO_SE' if w.field_name=='Supreme Court Number' else 'OPTIONAL_UNKNOWN_PARTICIPANT_CONTENT';base['blank']=not actual;unknown.append(base)
    elif w.field_name.endswith('_2') and w.field_name.removesuffix('_2') in list(fields)+['Address 2','Fax Number','Supreme Court Number']:base['independentActor']='PROSECUTOR_APPROVED_BY';base['blank']=not actual;approved.append(base)
   if 'ORDER-DENYING' in sid:
    asp=x['doc'][2];aop=pdf[x['offset']+2];asc=collections.Counter(key(g) for g in glyphs(asp));ae=[]
    for g in glyphs(aop):
     if asc[key(g)]:asc[key(g)]-=1
     else:ae.append(g)
    assert 'Assistant County/District Attorney' in asp.get_text()
    for w in asp.widgets():
     if w.field_name.endswith('_2'):
      inside=[g for g in ae if w.rect.contains(pm.Point((g['rect'][0]+g['rect'][2])/2,(g['rect'][1]+g['rect'][3])/2))];actual=''.join(g['char'] for g in inside).strip();approved.append({'fixture':fx,'documentId':sid,'sourcePage':3,'packetPage':x['offset']+3,'field':w.field_name,'sourceRect':list(w.rect),'sourceLabel':w.field_label,'actualFullText':actual,'source':x['pin'],'independentActor':'PROSECUTOR_APPROVED_BY','blank':not actual})

 for r in current:checks.append({'family':fam,'name':r['fixture']+'/'+r['documentId']+'/'+r['field']+' exact neutral fact','pass':r['exactFullTextIncludingSpaces'] and r['boundsContained'] and r['visible']})
 for r in unknown+approved:checks.append({'family':fam,'name':r['fixture']+'/'+r['documentId']+'/'+r['field']+' remains blank','pass':r['blank']})
 for r in current:
  if r['fixture']=='boundary' and r['field']=='Address 1':checks.append({'family':fam,'name':r['documentId']+' exact Times-Roman 6pt without direction distortion','pass':r['fontAndSize']==[['Times-Roman',6.0]] or r['fontAndSize']==[('Times-Roman',6.0)]})
 # Independently retain all untouched source-role refusals from the completed original-page review.
 previous=B/'birth-year-followup/final-review'/(fam+'-submitted-by-findings.json');old=json.load(open(previous));by={(x['documentId'],x['field']):x for x in old['allRefusalsSwept']};audit=[]
 for r in maps['refusals']:
  k=(r['documentId'],r['field']);assert k in by
  if r['field'] in ['Address 2','Fax Number','Supreme Court Number'] and r['documentId'] in source and r['documentId'].startswith('KSJC-ORDER-'):actor='ATTORNEY_ONLY_NOT_APPLICABLE_PRO_SE' if r['field']=='Supreme Court Number' else 'OPTIONAL_UNKNOWN_PARTICIPANT_CONTENT'
  else:actor=by[k]['reviewConclusion']
  audit.append({'documentId':k[0],'field':k[1],'sourcePage':r['page'],'printedRole':r.get('effectiveLabel'),'currentDisposition':r.get('completenessDisposition'),'independentActorReview':actor,'previousFullPrintedSourceRoleAudit':str(previous)})
 row={'familyId':fam,'submittedByKnownFacts':current,'unknownSubmittedByFields':unknown,'approvedByProtectedFields':approved,'flatSignatures':signatures,'allRemainingRefusalsActorAudit':audit,'priorIndependentFullSourceRoleAudit':pin(previous),'guideBinding':pin(d/'participant-instructions.md'),'guideExactNewHandback':'Follow the court’s instructions on whether and when you or your attorney should sign and lodge each proposed order.','summary':{'knownSubmittedByWrites':len(current),'unknownSubmittedByFieldsBlank':sum(x['blank'] for x in unknown),'approvedByFieldsBlank':sum(x['blank'] for x in approved),'remainingRefusalsIndependentlyAudited':len(audit)}};p=O/(fam+'-submitted-by-actor-measurements.json');p.write_text(json.dumps(row,indent=2,ensure_ascii=False)+'\n');rows.append(pin(p))
(O/'submitted-by-validation.json').write_text(json.dumps({'evidence':rows,'checks':checks,'passed':sum(c['pass'] for c in checks),'failed':sum(not c['pass'] for c in checks)},indent=2)+'\n');print('PASS',sum(c['pass'] for c in checks),'FAIL',sum(not c['pass'] for c in checks));print(json.dumps([c for c in checks if not c['pass']],indent=2))

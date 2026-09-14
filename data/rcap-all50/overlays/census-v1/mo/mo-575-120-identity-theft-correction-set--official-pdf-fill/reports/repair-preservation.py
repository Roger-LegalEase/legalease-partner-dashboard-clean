import fitz,json,pathlib,subprocess,hashlib
root=pathlib.Path.cwd();rel='data/rcap-all50/overlays/census-v1/mo/mo-575-120-identity-theft-correction-set--official-pdf-fill';out=root/rel;oldcommit='1fc8e81144966dd1b0b205a3804c713a49e7cc37';checks=[]
def old(path):return subprocess.check_output(['git','show',oldcommit+':'+rel+'/'+path])
def check(name,passed,detail=None):checks.append({'check':name,'passed':bool(passed),'detail':detail})
receipt=json.loads((out/'source-receipt.json').read_text());sources={s['formNumber']:s for s in receipt['documents']}
for fixture in ['canonical','boundary']:
 for comp,fields in [('CR300',['Offense Cycle Number','Petitioner Address']),('FI-05',['Case Type Code','Case Type Description'])]:
  filename=fixture+'.'+comp+'.pdf';before=fitz.open(stream=old(filename),filetype='pdf');after=fitz.open(out/filename);source=fitz.open(pathlib.Path('/workspaces/legalease-partner-dashboard-clean')/sources[comp]['path']);rects=[fitz.Rect(w.rect)+(-2,-2,2,2) for w in source[0].widgets() if w.field_name in fields];check(fixture+':'+comp+':mask_source_fields',len(rects)==2)
  for i in range(len(before)):
   allowed=rects if comp=='CR300' or i<len(before)-3 else [];bounds=before[i].rect;xs=sorted(set([0,bounds.width]+[max(0,min(bounds.width,v)) for r in allowed for v in [r.x0,r.x1]]));ys=sorted(set([0,bounds.height]+[max(0,min(bounds.height,v)) for r in allowed for v in [r.y0,r.y1]]));parts=[]
   for x0,x1 in zip(xs,xs[1:]):
    for y0,y1 in zip(ys,ys[1:]):
     mid=fitz.Point((x0+x1)/2,(y0+y1)/2)
     if any(mid in r for r in allowed):continue
     r=fitz.Rect(x0,y0,x1,y1);parts.append(before[i].get_pixmap(clip=r,alpha=False).samples==after[i].get_pixmap(clip=r,alpha=False).samples)
   check(fixture+':'+comp+':outside_repair_masks_page'+str(i+1),all(parts),{'comparedRegions':len(parts)})
 for comp in ['CR310']+(['GN10'] if fixture=='boundary' else []):check(fixture+':'+comp+':unchanged_bytes',old(fixture+'.'+comp+'.pdf')==(out/(fixture+'.'+comp+'.pdf')).read_bytes())
 oldfacts=json.loads(old(fixture+'.fixture.json'));newfacts=json.loads((out/(fixture+'.fixture.json')).read_text());check(fixture+':participant_and_arrest_record_preserved',oldfacts['participant']==newfacts['participant'] and {k:v for k,v in oldfacts['arrest'].items() if k!='ocn'}==newfacts['arrest']);check(fixture+':respondents_preserved',oldfacts['respondents']==newfacts['respondents']);check(fixture+':no_substantial_factors_finding_collected','substantialFalseFactorsConfirmed' not in newfacts);check(fixture+':actual_supplied_facts_collected',all(k in newfacts for k in ['impersonationAccount','identifyingFactorsUsed','impersonatorRelationship','policeReportFiled']))
 for name in ['impersonationAccount','identifyingFactorsUsed','impersonatorRelationship','policeReportFiled']:check(fixture+':new_required_fact:'+name,newfacts[name] is not None)
 check(fixture+':native_alias_exact',(out/'fixtures'/(fixture+'.pdf')).read_bytes()==(out/(fixture+'.packet.pdf')).read_bytes())
result={'schemaVersion':'rcap-author-bounded-repair-preservation/v1','familyId':'mo-575-120-identity-theft-correction-set','oldCandidateCommit':oldcommit,'failureReturn':'data/rcap-grade-a/packet-factory-24h/vfmo575sem1/rows-vfmo575sem1-mo-identity-semantic-fail-20260914.json','repairs':['MO575-SEM-01','MO575-SEM-02','MO575-SEM-03','MO575-SEM-04'],'passed':all(c['passed'] for c in checks),'checks':checks,'scope':'Only FI05 clerk-code fields and CR300 clerk OCN/participant execution-address fields changed on original forms; CR310/GN10 exact bytes; explicit account/factor continuation and dependent instructions/metadata updated. Same two fixtures and21pages.'};(out/'reports/repair-preservation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'passed':result['passed'],'checks':len(checks),'failures':[c for c in checks if not c['passed']]},indent=2));raise SystemExit(0 if result['passed'] else 1)

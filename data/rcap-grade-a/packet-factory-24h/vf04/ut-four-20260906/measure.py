import json,pathlib,hashlib,re,subprocess
base=pathlib.Path('/workspaces/legalease-captain'); out=pathlib.Path('/tmp/codex-captain-20260906/vf04'); sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
ident=json.loads((out/'identities.json').read_text()); tracks={x['trackId']:x for x in json.loads((base/'data/record-clearing/legal-design-track-registry.json').read_text())['tracks']}
sources={sha(p):p for p in (out/'sources').glob('*.pdf')}; norm=lambda s:re.sub(r'\s+','',s).casefold(); rows=[]
for fam in ident:
 fid=fam['familyId']; p=base/pathlib.Path(fam['fixtures']['canonical']['path']).parent.parent
 receipt=json.loads((p/'source-receipt.json').read_text()); guide=(p/'participant-instructions.md').read_text(); track=tracks[fid.removesuffix('-set')]; report=json.loads((p/'reports/actual-writes.json').read_text()); checks=[]
 for d in receipt['documents']:
  src=sources.get(d['sha256']); assert src and src.stat().st_size==d['byteLength'];checks.append({'formNumber':d['formNumber'],'source':src.name,'sha256':sha(src),'bytes':src.stat().st_size,'exact':True})
 writes=[]
 for fix,meta in fam['fixtures'].items():
  pdf=base/meta['path']; assert sha(pdf)==meta['sha256']
  text=subprocess.run(['pdftotext','-layout',str(pdf),'-'],capture_output=True,text=True,check=True).stdout; pages=text.split('\f')
  a=next(a for a in report['artifacts'] if a['fixture']==fix)
  for w in a['actualWrites']:
   value=w.get('textReadFromOutputBytes',''); page=w['packetPage']; present=bool(value) and norm(value) in norm(pages[page-1]);writes.append({'fixture':fix,'formNumber':w['formNumber'],'fieldId':w['fieldId'],'page':page,'value':value,'presentOnDeclaredPage':present})
 stops=[{'condition':s,'present':norm(s) in norm(guide)} for s in track['selfHelpStopConditions']]
 rows.append({'familyId':fid,'sourceChecks':checks,'artifactHashesMatch':True,'writeReadbacks':writes,'writeReadbackMissing':[w for w in writes if not w['presentOnDeclaredPage']],'selfHelpStops':stops,'thirtyDayPrerequisitePresent':bool(re.search(r'30\s+days[^\n]*(arrest)|arrest[^\n]*30\s+days',guide,re.I)),'trackWaitingPeriods':track['waitingPeriods'],'trackVenue':track['venue'],'guideSha256':sha(p/'participant-instructions.md')})
(out/'measurements.json').write_text(json.dumps(rows,indent=2)+'\n')
for r in rows:print(r['familyId'],'sources',len(r['sourceChecks']),'writes',len(r['writeReadbacks']),'missing',len(r['writeReadbackMissing']),'stops',sum(x['present'] for x in r['selfHelpStops']),'/',len(r['selfHelpStops']),'30day',r['thirtyDayPrerequisitePresent'])

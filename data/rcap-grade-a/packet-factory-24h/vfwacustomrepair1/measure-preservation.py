import json,subprocess,pathlib,hashlib,re
B=pathlib.Path('data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill');O=pathlib.Path('data/rcap-grade-a/packet-factory-24h/vfwacustomrepair1');old='095812f37c';read=lambda p:json.loads(pathlib.Path(p).read_text())
def prior(p):return subprocess.check_output(['git','show',old+':'+str(p)])
def text(b):return [p for p in subprocess.check_output(['pdftotext','-layout','-','-'],input=b).decode().split('\f') if p.strip()]
def tokens(pages,manifest,component):
 selected=[pages[m['packetPage']-1] for m in manifest if m['component']==component];out=[]
 for i,p in enumerate(selected):
  lines=p.splitlines()
  if i>0 and len(lines)>4 and lines[3].startswith("Original cause number:"):
   lines=lines[5:];lines=[s for s in lines if not s.strip().endswith('(continued)')]
  out.extend(' '.join(lines).split())
 return out
oldm=json.loads(prior(B/'reports/rendered-artifacts.json'));cur=read(B/'reports/rendered-artifacts.json');res=[]
for a in cur['artifacts']:
 before=next(x for x in oldm['artifacts'] if x['fixture']==a['fixture']);pp=text(prior(a['file']));cc=text(pathlib.Path(a['file']).read_bytes());checks=[]
 for component in dict.fromkeys(x['component'] for x in a['pageManifest']):
  x=tokens(pp,before['pageManifest'],component);y=tokens(cc,a['pageManifest'],component);assert x==y,(component,a['fixture']);checks.append(dict(component=component,exactOrderedWordAndControlTokensPreserved=True,tokenCount=len(y)))
 p4=cc[3];label='Exhibit identifiers and descriptions:';segment=p4.split(label)[1].split('I declare under penalty')[0];assert segment.count('.'*80)==2;assert all(x in p4 for x in ['Declaration signing city and state:','Declaration signing date:','Applicant declaration signature:']);assert label not in cc[2]
 res.append(dict(fixture=a['fixture'],beforePages=len(pp),afterPages=len(cc),componentComparisons=checks,exhibitLabelDescriptionBothLinesAndExecutionOnPage=4,orphanExhibitLineAbsent=True,page4Text=p4))
strategy=read('data/rcap-grade-a/source-wave-integration/WA_HOMICIDE_CUSTOM_SOURCE_STRATEGY_2026-09-13.json');projection=read('data/rcap-grade-a/packet-factory-24h/vfwacustom1/scoped-native-source-adoption.json')['projection'];assert strategy['reconciliation']==projection;assert hashlib.sha256(pathlib.Path(strategy['decisionRecord']).read_bytes()).hexdigest()==strategy['decisionRecordSha256']
report=dict(result='PASS_SCOPED_SEMANTIC_PRESERVATION',priorSemanticCandidate=old,currentRepairCandidate='60c2aceb79521b8f37acfb3419c4756540df9664',fixtures=res,additiveNativeStrategyEqualsReviewedProjection=True,adoptedDecisionHashVerified=True,visualMeasured=False,requiresNewOriginalRasterReview=True);(O/'repair-preservation.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS: all 12 component streams preserve exact ordered words/control tokens; both exhibit blocks complete on page 4')

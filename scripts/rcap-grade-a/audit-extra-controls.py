import json,re,hashlib,pathlib
import os
root=pathlib.Path(os.environ['RCAP_CAMPAIGN_DIR'])
rows=[json.loads(l) for l in (root/'control-ledger.jsonl').read_text().splitlines() if not json.loads(l)['controlId'].startswith('EXTRA-')]
census=json.loads((root/'controls/retained-census.json').read_text())
pages=[dict(page, censusEvidence='controls/retained-census.json', sourceIdentity=census['sourceIdentity']) for page in census['pages']]
expanded=root/'controls/wilma-expanded-census.json'
if expanded.exists():
 observed=json.loads(expanded.read_text())
 pages.extend(dict(page, censusEvidence='controls/wilma-expanded-census.json', sourceIdentity=observed['sourceIdentity']) for page in observed['pages'])
# These conditional controls appeared only after expanding the panel or receiving a
# reply. The retained actual-action receipt proves their presence and interaction.
wilma=root/'controls/wilma.json'
if wilma.exists():
 receipt=json.loads(wilma.read_text())
 proven={label for proof in receipt.get('proofs',[]) if proof.get('result')=='PASS' for label in proof['controls']}
 conditional=[]
 if 'Collapse chat' in proven:conditional.append({'tag':'BUTTON','type':'button','name':'Collapse chat','href':None,'disabled':False})
 if 'Report a Wilma issue' in proven:conditional.append({'tag':'A','type':None,'name':'Report a Wilma issue','href':'/expungement-ai/support?category=wilma','disabled':False})
 pages.append({'role':'participant','route':'/briefcase/settings','controls':conditional,'censusEvidence':'controls/wilma.json','sourceIdentity':receipt['sourceIdentity']})
def norm(s):return re.sub(r'[^a-z0-9]+',' ',s.lower()).strip()
def family(route):
 route=re.sub(r'[0-9a-f]{8}-[0-9a-f-]{27,36}','[id]',route)
 route=re.sub(r'/(?:grade-a|integrated|review|launch|index|referral|operating-rights|spanish|practice|journey|exposure)-[^/?#]*','/[program]',route)
 route=re.sub(r'([?&]partner=)[^&#]*',r'\1[program]',route)
 return route
aliases={'Program operator':'A02-01','Organization website (optional)':'A02-07','Review program':'A02-13','Contract or delegation expiration':'A09-03','I reviewed the evidence and authorize this administrative action.':'A09-04','Record executed agreement':'A09-26','Executed agreement type':'A09-26','Signed PDF or DOCX':'A09-26','Agreement effective date':'A09-26','Agreement review basis':'A09-26','Record privacy or procurement evidence':'A09-27','Evidence type':'A09-27','Evidence status':'A09-27','Required for this arrangement':'A09-27','Reviewed document':'A09-27','Effective date':'A09-27','Evidence or policy basis':'A09-27','Save agreement evidence':'A09-27','Desktop':'A06-08','Mobile':'A06-08','Copy event link':'C02-05','Send partner staff invite':'P03-04','Code usage':'P04-12','Find a program':'A01-02','All programs':'A00-01','All partner programs':'A00-01','Back to Command Center':'A00-01','Programs':'A00-01','RCAP Programs':'A00-01','How people participate':'A04-11','Enable Spanish':'A04-17','Street address or PO box':'A04-05','Unit, building, or second address line':'A04-05','City, region, and postal code':'A04-05','Country or additional address lines':'A04-05','Primary action label':'A04-25','Internal creation reason':'A02-12','Participant page address':'A02-05','Enable English and Spanish':'A04-17','Title (optional)':'P01-18','Work email':'P01-17','Name':'P01-16','Offer English and Spanish':'P01-25','Activity & Reporting':'P02-04','Complete packet information':'U05-03','Save and leave':'U05-06','Return to this matter':'U06-07','What do you need help with?':'U08-01','Message':'U08-01','Send request':'U08-01','Contact page':'U08-01','Get technical support':'U08-01','Back to sign in':'U04-05','Send reset instructions':'U04-05','Show password':'U04-01','Already have an account? Sign in':'U04-09','Create account and continue':'U04-01','New screening':'U03-07','Open matter':'U04-07','Review the program configuration':'A08-07','Return to program dashboard':'A03-14','Optional code limits and schedule':'C04-02','Back to internal event controls':'C08-05'}
states=set('Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming'.split('|'))
def scopes(page):
 r=page['route']
 if r=='/internal':return ['A00']
 if r=='/internal/partners/onboarding':return ['A01','A00']
 if r=='/internal/partners/provisioning/new':return ['A02','A00']
 if '/diagnostics' in r:return ['A09','A00']
 if '/internal/partners/onboarding/' in r:return ['A03','A04','A05','A06','A07','A08','A09','A00']
 if '/clinic' in r:return ['C00','C01','C02','C03','C04','C06','C07','C08','P02','A00']
 if r.startswith('/partner'):
  return (['P01'] if '/settings' in r else ['P04'] if '/access-codes' in r else ['P03'] if '/team' in r else [])+['P02']
 if r.startswith('/p/'):return ['U01']
 if r.startswith('/intake/'):return ['U02']
 if '/sign-in' in r or '/forgot-password' in r:return ['U04']
 return ['U05','U06','U07','U08']
def mapping(page,c):
 name=c['name']; n=norm(name); route=page['route']; href=c['href'] or ''
 if name=='Program operator':return 'A02-01' if '/provisioning/new' in route else 'A04-07'
 if name in ['Desktop','Mobile'] and route.startswith('/partner'):return 'P01-31'
 if name=='Legal organization name' and '/provisioning/new' in route:return 'A02-02'
 if name.startswith('Participant page address'):return 'A02-05'
 if name.startswith('Internal creation reason'):return 'A02-12'
 if name.startswith('I inspected the executed document'):return 'A09-26'
 if name in ['Contact email','Name / label'] and route.startswith('/partner/team'):return 'P03-03'
 if name in ['Use an approved logo or the RCAP text identityStandard default applies','Outreach schedulingStandard default applies']:return 'A09-10'
 if name=='English' and route.startswith('/partner/settings?step=start'):return 'P01-31'
 if name in states:return 'A02-09' if '/provisioning/new' in route else 'P01-20' if route.startswith('/partner') else 'A04-13'
 if name.startswith('Remove ') and name[7:] in states:return 'A04-37'
 if name=='Open program':return 'A01-05'
 if name=='Clinics' and route.startswith('/internal'):return 'A01-07'
 if name.startswith('Start free screening'):return 'U01-06' if route.startswith('/p/') else 'U02-05'
 if href.startswith('mailto:'):return 'U01-07' if route.startswith('/p/') else 'A06-10' if '#program-materials' in route or '/internal/partners/onboarding/' in route else 'P02-07' if route.startswith('/partner') else 'U08-01'
 if name.startswith('If you received an access code'):return 'U02-06'
 if name.startswith('Continue through the standard'):return 'U02-12'
 if name.startswith('http://127.0.0.1:3100/clinic/'):return 'C02-05'
 if name.startswith('Inspect '):return 'A09-28'
 if name in aliases:return aliases[name]
 if c['tag']=='INPUT' and c['type'] in ['email','password'] and ('/sign-in' in route or '/forgot-password' in route):return 'U04-05' if '/forgot-password' in route else 'U04-01'
 if c['tag']=='INPUT' and name=='Email' and '/support' in route:return 'U08-01'
 if re.match(r'^[1-5] (Join|Organization|Program|Team|Start)$',name):return 'P01-0'+name[0]
 for scope in scopes(page):
  for r in rows:
   if not r['controlId'].startswith(scope+'-'):continue
   label=r['contract'][0];bold=re.findall(r'\*\*(.*?)\*\*',label);labels=bold or [re.split(r'\s*\(',label)[0]]
   if any(norm(x)==n or len(norm(x))>8 and n.startswith(norm(x)+' ') for x in labels):return r['controlId']
 return None
mapped=[];extra={}
for page in pages:
 for c in page['controls']:
  ident=mapping(page,c)
  observed={**c,'route':page['route'],'actor':page['role']}
  if ident:mapped.append({'controlId':ident,**observed});continue
  name=c['name'];href=c['href'];key=json.dumps([page['role'],family(page['route']),name,family(href) if href else None,c['tag'],c['type']],sort_keys=True)
  if key not in extra:extra[key]={'controlId':'EXTRA-'+hashlib.sha256(key.encode()).hexdigest()[:10].upper(),'actualRoute':family(page['route']),'actor':page['role'],'currentLabel':name,'type':c['type'],'tag':c['tag'],'href':family(href) if href else None,'disposition':'FAIL','result':'VERIFICATION_PENDING','reason':'Retained control requires individual mapping or browser proof. Observation is not acceptance.','evidence':[page['censusEvidence']],'censusEvidence':page['censusEvidence'],'sourceIdentity':page['sourceIdentity'],'instances':[]}
  extra[key]['instances'].append(observed)
(root/'controls/rendered-control-bindings.json').write_text(json.dumps({'sourceIdentity':census['sourceIdentity'],'mapped':mapped,'extraCount':len(extra)},indent=2))
# Every extra stays separate until an actual proof or explicit disposition is bound.
(root/'extra-control-ledger.jsonl').write_text('\n'.join(json.dumps(r) for r in extra.values())+'\n')
print('mapped instances',len(mapped),'extra distinct controls',len(extra))
for e in extra.values():print(e['controlId'],e['actualRoute'],e['tag'],e['currentLabel'][:100],e['href'] or '')

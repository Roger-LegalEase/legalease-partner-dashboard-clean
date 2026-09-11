import pathlib,json,hashlib,subprocess,xml.etree.ElementTree as ET,re,struct
O=pathlib.Path('data/rcap-grade-a/packet-factory-24h/vf08/tx-eight-current-20260911')
S=json.loads((O/'scope.json').read_text());ST=json.loads((O/'stream-measurements.json').read_text()); R=pathlib.Path('data/rcap-grade-a/packet-factory-24h/raster-runs/34644046027')
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):return json.loads(pathlib.Path(p).read_text())
def norm(s):return re.sub(r'\s+',' ',s).strip()
def bind(p):
 p=pathlib.Path(p);b=p.read_bytes();return {'path':str(p),'sha256':sha(b),'bytes':len(b)}
results=[]
for f in S['families']:
 d=pathlib.Path(S['directories'][f]);sf=next(x for x in ST if x['familyId']==f)
 ra=read(d/'reports/rendered-artifacts.json');w=read(d/'product-wiring.json');bl=read(d/'reports/blanks-left-for-the-participant.json');actual=read(d/'reports/actual-writes.json');md=(d/'participant-instructions.md').read_text()
 proof=read(R/(f+'.ORIGINAL_EVIDENCE_VERIFIED.json'));png=[]
 for p in proof['pageImages']:
  b=pathlib.Path(p['path']).read_bytes();width,height=struct.unpack('>II',b[16:24]);png.append({'path':p['path'],'sha256':sha(b),'bytes':len(b),'dimensions':[width,height],'isPacketPage':bool(re.search(r'page-\d{3}\.png$',p['path'])),'matches':sha(b)==(p['expectedSha256'] or p['sha256']) and len(b)==(p['expectedByteLength'] or p['byteLength']),'paperDimensions':p['paperDimensions'] if 'paperDimensions'in p else p['expectedPngDimensions']})
 fixtures=[]
 for kind in ['canonical','boundary']:
  p=d/'fixtures'/f'{kind}.pdf';text=subprocess.check_output(['pdftotext','-layout',str(p),'-']).decode();pages=text.split('\f')[:-1];(O/f'{f}.{kind}.txt').write_text(text)
  old=subprocess.check_output(['git','show',f"{sf['priorBase']}:{p}"],stderr=subprocess.DEVNULL);oldtext=subprocess.check_output(['pdftotext','-layout','-','-'],input=old).decode();oldpages=oldtext.split('\f')[:-1]
  changes=[{'page':i+1,'before':oldpages[i],'after':t} for i,t in enumerate(pages) if t!=oldpages[i]]
  (O/f'{f}.{kind}.page-text-changes.json').write_text(json.dumps(changes,indent=2)+'\n')
  xml=subprocess.check_output(['pdftotext','-bbox',str(p),'-']);root=ET.fromstring(xml);xpages=root.findall('.//{http://www.w3.org/1999/xhtml}page');wordpages=[]
  for page in xpages:
   words=[{'text':n.text or '',**{k:float(v) for k,v in n.attrib.items()}} for n in page.findall('{http://www.w3.org/1999/xhtml}word')];wordpages.append(words)
  writes=next(x for x in actual['documents'] if x['fixture']==kind)['actualWrites'];measured=[]
  for x in writes:
   if not x.get('rect'):continue
   rect=x['rect'];page=x['page'];height=float(xpages[page-1].attrib['height']);box=[rect['x'],height-rect['y']-rect['height'],rect['x']+rect['width'],height-rect['y']]
   words=[n for n in wordpages[page-1] if n['xMin']>=box[0]-1.5 and n['xMax']<=box[2]+1.5 and n['yMin']>=box[1]-1.5 and n['yMax']<=box[3]+1.5]
   found=norm(' '.join(n['text'] for n in words));expected=norm(x.get('drawnText',''))
   measured.append({'field':x['field'],'factId':x.get('factId'),'page':page,'writeBoxTopOrigin':box,'expected':expected,'extractedInsideBox':found,'presentInsideBox':bool(expected) and expected in found})
  pdfmeta=next(x for x in ra['pdfs'] if x['fixture']==kind);proofpdf=next(x for x in proof['currentDocuments'] if x['role']==kind)
  fixtures.append({'fixture':kind,**bind(p),'pageCount':len(pages),'manifestMatches':sha(p.read_bytes())==pdfmeta['sha256'] and len(p.read_bytes())==pdfmeta['byteLength'] and len(pages)==pdfmeta['pageCount'],'originalRasterBindingMatches':sha(p.read_bytes())==proofpdf['verdictBoundSha256'],'changedTextPages':[x['page'] for x in changes],'routeLeakPages':[i+1 for i,t in enumerate(pages) if re.search(r'obligation:(?:track|unit)',t)],'routeLeakLines':[{'page':i+1,'line':line} for i,t in enumerate(pages) for line in t.splitlines() if 'obligation:'in line],'dobLines':[{'page':i+1,'line':line} for i,t in enumerate(pages) for line in t.splitlines() if any(s in line for s in ['1994-04-17','1972-12-31','04/17/1994','12/31/1972'])],'staleSwornDatePages':[i+1 for i,t in enumerate(pages) if '12/15/2022'in t],'writeMeasurements':measured,'outOfPaperWords':[{'page':i+1,**n} for i,words in enumerate(wordpages) for n in words if n['xMin']<-1 or n['yMin']<-1 or n['xMax']>float(xpages[i].attrib['width'])+1 or n['yMax']>float(xpages[i].attrib['height'])+1]})
 missing=[x for x in bl['requiredBeforeFiling'] if x.get('disclosureLabel',x.get('field','')) not in md]
 results.append({'familyId':f,'bindings':[bind(d/p) for p in ['source-receipt.json','production-field-map.json','field-census.census-v1.json','product-wiring.json','participant-instructions.md','reports/rendered-artifacts.json','reports/actual-writes.json','reports/blanks-left-for-the-participant.json']]+[bind('scripts/build-census-v1-'+f+'.mjs')],'wiring':w,'requiredCount':len(bl['requiredBeforeFiling']),'protectedCount':len(bl['protectedBlanks']),'requiredLabelsMissing':missing,'dobRequired':[x for x in bl['requiredBeforeFiling'] if any(s in x.get('field','') for s in ['Month /','Day /','Year /'])],'markdownRouteLeaks':[t for t in md.splitlines() if 'obligation:'in t],'fixtures':fixtures,'rasterEvidenceBinding':bind(R/(f+'.ORIGINAL_EVIDENCE_VERIFIED.json')),'rasterPin':proof['packetCommitSha'],'rasterApiDigest':proof['artifact']['apiDigest'],'rasterLogSha256':proof['immutableCheckoutProof']['originalLogSha256'],'originalPngs':png})
 print(f,[(x['fixture'],x['pageCount'],x['routeLeakPages'],x['dobLines'],sum(not y['presentInsideBox'] for y in x['writeMeasurements'])) for x in fixtures], 'missingLabels',len(missing))
(O/'current-measurements.json').write_text(json.dumps(results,indent=2)+'\n')

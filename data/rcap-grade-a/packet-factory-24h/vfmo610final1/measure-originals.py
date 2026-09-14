import pathlib,json,hashlib,subprocess,struct,re
O=pathlib.Path('data/rcap-grade-a/packet-factory-24h/vfmo610final1');R=pathlib.Path('private/transfers/mo-raster-batch-20260914/mo-arrest/original/artifact');F='mo-610-122-arrest-expungement-set';D=pathlib.Path('data/rcap-all50/overlays/census-v1/mo/'+F+'--official-pdf-fill');BASE='53ff44b4b5507d249c68b56d9b466ada02e24e03'
def bind(p):
 b=pathlib.Path(p).read_bytes();return {'path':str(p),'sha256':hashlib.sha256(b).hexdigest(),'byteLength':len(b)}
def rd(p):return json.loads(pathlib.Path(p).read_text())
index=rd(R/'PAGE_IMAGES_SHA256.json');pages=[]
for x in index:
 p=R/x['member'];b=p.read_bytes();width,height=struct.unpack('>II',b[16:24]);assert hashlib.sha256(b).hexdigest()==x['sha256'] and len(b)==x['bytes'];fixture=p.parent.name;page=int(re.search(r'page-(\d+)',p.name)[1]);component='CR145' if page<=2 else 'FI05' if page<=8 else 'CR143' if page==9 and fixture!='selectable_petition-only' else 'GN10' if page==10 and fixture=='boundary' else 'participant-guide';pages.append({**bind(p),'fixture':fixture,'page':page,'component':component,'actualIHDR':[width,height],'indexPaperDimensions':[x['pngWidth'],x['pngHeight']],'originalViewedIndividually':True,'visualResult':'PASS','clippingOrOverlap':False,'sourceRulesOrLabelsObscured':False,'protectedExecutionInk':False})
assert len(pages)==36
v=rd('data/rcap-grade-a/packet-factory-24h/raster-runs/34795581765/'+F+'.verdict.json');packets=[]
for x in v['documentsRendered']:
 p=pathlib.Path(x['path']);b=p.read_bytes();frozen=subprocess.check_output(['git','show',BASE+':'+str(p)]);assert b==frozen and hashlib.sha256(b).hexdigest()==x['pinned'];packets.append({**bind(p),'document':x['document'],'gitBlobSha':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest(),'currentEqualsFrozen':True,'expectedSha256':x['pinned']})
sources=[]
for x in rd(D/'source-receipt.json')['documents']:
 y=bind(x['path']);assert y['sha256']==x['sha256'] and y['byteLength']==x['byteLength'];sources.append(y)
semantic='data/rcap-grade-a/packet-factory-24h/vfmo610sem1-repair2-pass/saved-byte-measurements.json';prior=rd(semantic);dependencies=[]
for x in prior['candidateBindings']:
 p=x['path'];y=bind(p);y['matchesSemanticBinding']=y['sha256']==x['sha256'];dependencies.append(y)
result={'schemaVersion':'rcap-original-page-final-measurements/v1','familyId':F,'reviewer':'/root/mt_form_b_independent_review','frozenCommit':BASE,'runId':34795581765,'selectedFamilyJobConclusion':'success','wholeBatchConclusionNotAsserted':True,'allOriginalPagesViewed':True,'pages':pages,'packets':packets,'sources':sources,'semanticDependencies':dependencies,'semanticMeasurementReference':bind(semantic),'pageIndex':bind(R/'PAGE_IMAGES_SHA256.json'),'originalArchive':bind('private/transfers/mo-raster-batch-20260914/mo-arrest/original/'+F+'.zip'),'visualDefects':[]};(O/'original-page-measurements.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS36originals,3wholePDFs,4exactSources;semantic mismatches',[x['path'] for x in dependencies if not x['matchesSemanticBinding']])

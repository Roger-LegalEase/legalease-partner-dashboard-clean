#!/usr/bin/env python3
"""Admit one completed, pinned two-fixture raster; never semantic approval.
CONFIG ZIP RUN_JSON JOBS_JSON. Refuses conditional/extra declared packet PDFs.
"""
from pathlib import Path
import copy,hashlib,json,math,re,struct,subprocess,sys,zipfile
Q=Path('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(Path(p).read_text())
# Match rcap-raster-batch.mjs: logical family IDs keep punctuation, while
# artifact and page paths use the renderer's safe filename segment.
family_path=lambda family:re.sub(r'[^A-Za-z0-9._-]','_',family)

def require(ok,message):
    if not ok:raise ValueError(message)

# THE DECLARED SET, IN THE ORDER THE RENDERER RENDERED IT.
#
# This script admitted exactly two documents and refused everything else with
# "additional declared outputs require a full-set importer". That refusal named
# the missing piece correctly, and I twice reported the piece as a workflow
# change on main. It is not. scripts/rcap-raster-batch.mjs has rendered
# `row.documents` -- every document the queue names, each into its own slugged
# directory -- since the eleven-family Washington/Arkansas change; only this
# importer was still built for a pair. So pa_pardon_expungement-set, whose six
# declared deliverables were rendered and measured, was refused here for a limit
# that lives in this file.
#
# `expectedDocuments` is that set, ordered exactly as the verdict's
# documentsRendered: role, document, path, sha256, pages, pageSizePt, pngSizePx.
# Omit it and it is DERIVED from the two-entry expectedPdfs, byte for byte what
# this script always checked, so every config already written stays valid and
# every control keeps its meaning.
#
# What does NOT widen: the receipt must still cover the WHOLE declared
# deliverable inventory. A six-document family is admitted only when six
# documents were rendered and the family's own report declares those six and no
# others. "More than two" was never the guarantee; "all of them" was, and it
# still is.
def expected_documents(c):
    declared=c.get('expectedDocuments')
    if declared is None:
        expected=c['expectedPdfs']
        require(set(expected)=={'canonical','boundary'},'a config with no expectedDocuments must carry exactly two fixtures')
        return [dict(expected[r],role=r,document=r+'.pdf') for r in ['canonical','boundary']]
    require(isinstance(declared,list) and len(declared)>=2,'expectedDocuments must list every rendered document')
    for d in declared:
        require(isinstance(d,dict) and d.get('role') in ('canonical','boundary'),'each document declares a canonical or boundary role')
        require(isinstance(d.get('document'),str) and d['document'].endswith('.pdf'),'each document names its file')
    names=[d['document'] for d in declared]
    require(len(set(names))==len(names),'a document is declared twice')
    for role in ('canonical','boundary'):
        require(any(d['role']==role for d in declared),'both roles must be rendered')
    return declared

# The page images the renderer writes: one directory per DOCUMENT, slugged the
# same way the family id is, because two canonical documents of one family would
# otherwise overwrite each other's PNGs. For a plain canonical.pdf/boundary.pdf
# pair this is character for character the `<family>/<role>/page-NNN.png` this
# script always required.
document_path=lambda d:re.sub(r'[^A-Za-z0-9._-]','_',re.sub(r'\.pdf$','',d))

def validate(c,row,v,images,run,jobs):
    family=c['familyId'];expected=c['expectedPdfs']
    documents=expected_documents(c)
    require(set(expected)=={'canonical','boundary'},'the row still names one primary canonical and one primary boundary')
    require(run.get('id')==c['runId'] and run.get('status')=='completed' and run.get('conclusion')=='success','central run failed')
    require(run.get('path')=='.github/workflows/rcap-packet-raster-acceptance-batch.yml','wrong workflow')
    for name in ['Synthetic canary and live negative controls','Plan the family matrix',family]:
        found=[j for j in jobs if j.get('name')==name]
        require(len(found)==1 and found[0].get('run_id')==c['runId'] and found[0].get('status')=='completed' and found[0].get('conclusion')=='success','central job failed/missing')
    require(row['familyId']==family and v.get('familyId')==family and v.get('schemaVersion')=='rcap-raster-family-verdict/v1','wrong family/schema')
    require(v.get('verdict')=='RASTER_PASS' and str(v.get('workflowRunId'))==str(c['runId']) and v.get('packetCommitSha')==c['packetCommit'],'wrong verdict/commit/run')
    require(v.get('documentsDigest')==c['documentsDigest']==row['documentsDigest'],'document set changed')
    require(v.get('problems')==[] and v.get('environmentProblems')==[] and v.get('packetPdfsModified')==0 and v.get('coversTheWholeFamily') is True,'unclean/incomplete raster')
    docs=row['documents'];require(len(docs)==len(documents),'extra/omitted document')
    derived=[dict(role=d['role'],document=d['document'],path=d['path'],pinned=d['sha256']) for d in documents]
    require(v.get('documentsRendered')==derived,'wrong rendered inputs')
    require(v.get('hashesBound')=={r:dict(path=e['path'],pinned=e['sha256']) for r,e in expected.items()},'wrong PDF pins')
    # The primary pair the row pins is the pair the verdict binds, and it must be
    # among the documents actually rendered -- otherwise a receipt could bind one
    # packet and measure another.
    for role,e in expected.items():
        require(any(d['role']==role and d['path']==e['path'] and d['sha256']==e['sha256'] for d in documents),'the pinned pair is not among the rendered documents')
    pages=set();byname={}
    for e in documents:
        byname[e['document']]=e
        d=[d for d in docs if d['name']==e['document']]
        require(len(d)==1 and d[0]['role']==e['role'] and d[0]['path']==e['path'] and d[0]['sha256']==e['sha256'] and d[0]['pageCount']==e['pages'],'current inventory changed')
        pages.update((e['document'],i) for i in range(1,e['pages']+1))
    observed=set();receipts=[];names=set();measurements=v.get('measurements',[])
    require(v.get('pagesMeasured')==len(pages)==len(measurements),'incomplete page measurement')
    for p in measurements:
        key=(p.get('document'),p.get('page'));require(type(p.get('page')) is int and key in pages and key not in observed,'duplicate/wrong page')
        observed.add(key);document,number=key;e=byname[document]
        require(p.get('kind')==e['role'],'wrong page image binding')
        name=f'{family_path(family)}/{document_path(document)}/page-{number:03d}.png';names.add(name)
        require(p.get('png')==name,'wrong page image binding')
        require(p.get('nonblank') is True and p.get('croppedToThePage') is True,'blank/uncropped page')
        residual=p.get('calibrationResidualPx');require(type(residual) in (int,float) and math.isfinite(residual) and 0<=residual<=2,'invalid calibration')
        require([p.get('pageWidthPt'),p.get('pageHeightPt')]==e['pageSizePt'],'wrong page geometry')
        # An image reaches this check as BYTES, or as a published IDENTITY.
        #
        # The bytes path is the original and is unchanged. The identity path
        # exists because an agent session whose egress policy denies Actions
        # artifact blob storage can be handed the receipts without the 129 MB
        # image corpus: each image's byte length, SHA-256 and PNG header
        # dimensions, read off the real images by whoever downloaded the
        # archives.
        #
        # ONE CHECK IS NOT MADE ON THE IDENTITY PATH, and pretending otherwise
        # would be the whole danger of this route. `pngSizePx` is the image's
        # VIEWPORT size, and the verdict records only the paper rectangle
        # inside that viewport -- so on this path there is no independent
        # second source for the viewport, and comparing the inventory's
        # dimensions against a config field derived from the same inventory
        # would be the inventory agreeing with itself. Rather than dress that
        # up as a passing check, the identity path omits it and says so on the
        # receipt.
        #
        # What survives is real and is a genuine cross-check: the verdict and
        # the inventory are two independently published records, and this
        # requires their byte lengths to agree image by image. A substituted or
        # truncated image fails that. The receipt records who read the bytes.
        entry=images.get(name)
        require(entry is not None,'missing/corrupt PNG')
        if isinstance(entry,(bytes,bytearray)):
            body=entry
            require(len(body)>=24 and len(body)==p.get('bytes') and body[:8]==b'\x89PNG\r\n\x1a\n' and body[12:16]==b'IHDR','missing/corrupt PNG')
            require(list(struct.unpack('>II',body[16:24]))==e['pngSizePx'],'wrong PNG dimensions')
            receipts.append(dict(path=name,sha256=sha(body),byteLength=len(body)))
        else:
            digest=entry.get('sha256');length=entry.get('bytes')
            require(isinstance(digest,str) and re.fullmatch(r'[a-f0-9]{64}',digest) is not None,'missing/corrupt PNG')
            require(isinstance(length,int) and length>=24 and length==p.get('bytes'),'missing/corrupt PNG')
            require(isinstance(entry.get('pngWidth'),int) and isinstance(entry.get('pngHeight'),int),'missing/corrupt PNG')
            receipts.append(dict(path=name,sha256=digest,byteLength=length,
                                 pngWidth=entry.get('pngWidth'),pngHeight=entry.get('pngHeight'),
                                 imageBytesReadBy=entry.get('readBy'),
                                 viewportDimensionsCheckedAgainstASecondSource=False))
    require(observed==pages and set(images)==names,'extra/missing images')
    return receipts

def main():
    require(len(sys.argv)==5,'expected CONFIG ZIP|BUNDLE_DIR RUN_JSON JOBS_JSON')
    c=read(sys.argv[1]);archive=Path(sys.argv[2]);run=read(sys.argv[3]);jobs=read(sys.argv[4])['jobs']
    require(re.fullmatch(r'[a-f0-9]{40}',c['packetCommit']) is not None,'immutable commit required')
    queue=read(Q);rows=[r for r in queue['rows'] if r['familyId']==c['familyId']];require(len(rows)==1,'family not uniquely queued');row=rows[0]
    # One directory per DOCUMENT, not per role: for a pair this is the
    # (canonical|boundary) alternation it always was, and for a full set it is
    # the slugged document names the renderer actually wrote.
    pattern=(re.escape(family_path(c['familyId']))+r'/(?:'
             +'|'.join(re.escape(document_path(e['document'])) for e in expected_documents(c))
             +r')/page-\d+\.png')
    if archive.is_dir():
        # A RECOVERED BUNDLE rather than the artifact ZIP.
        #
        # The ZIP stays the authority and the preferred input. This path is for
        # a reader who cannot fetch one -- an agent session whose egress policy
        # denies Actions artifact blob storage -- and takes the original verdict
        # JSONs plus a published page-image inventory delivered through ordinary
        # repository access. The bundle's own digest is verified here exactly as
        # the archive's is on the other branch, so what this reads is what was
        # published. What it cannot do is read the PNG bytes, and the receipt
        # records that per image rather than glossing it.
        require(sha(Path(c['bundleArchive']).read_bytes())==c['bundleSha256'],'bundle digest mismatch')
        v=read(archive/str(c['runId'])/(family_path(c['familyId'])+'.verdict.json'))
        images={}
        for entry in read(archive/'PAGE_IMAGES_SHA256.json'):
            if str(entry.get('runId'))!=str(c['runId']) or entry.get('familyId')!=c['familyId']:continue
            name=entry.get('member')
            if not re.fullmatch(pattern,name or ''):continue
            require(name not in images,'duplicate inventory member')
            images[name]=dict(entry,readBy=c['imageBytesReadBy'])
    else:
        require(sha(archive.read_bytes())==c['zipSha256'],'archive digest mismatch')
        with zipfile.ZipFile(archive) as z:
            require(len(z.namelist())==len(set(z.namelist())),'duplicate ZIP member')
            require(sum(i.file_size for i in z.infolist())<250_000_000,'oversized expansion')
            v=json.loads(z.read(family_path(c['familyId'])+'.verdict.json'))
            images={n:z.read(n) for n in z.namelist() if re.fullmatch(pattern,n)}
    measured=validate(c,row,v,images,run,jobs)
    subprocess.run(['git','merge-base','--is-ancestor',c['packetCommit'],'HEAD'],check=True)
    for e in expected_documents(c):
        path=Path(e['path']);require(not path.is_absolute() and '..' not in path.parts,'unsafe input path')
        body=path.read_bytes();old=subprocess.check_output(['git','show',c['packetCommit']+':'+str(path)])
        require(body.startswith(b'%PDF-') and sha(body)==sha(old)==e['sha256'],'current/immutable PDF mismatch')
        info=subprocess.check_output(['pdfinfo',str(path)],text=True)
        require(int(re.search(r'^Pages:\s+(\d+)',info,re.M).group(1))==e['pages'],'actual page count mismatch')
    home=Path(c['expectedPdfs']['canonical']['path']).parent.parent
    report=read(home/'reports/rendered-artifacts.json')
    # The declared-output list is named `packets` by the current writers,
    # `pdfs` by the older one this script was written against, and `artifacts`
    # by a third. Read whichever the family actually carries, and refuse a
    # report that carries none rather than treating an unreadable declaration as
    # an empty one -- an absent list must never read as "no additional outputs".
    #
    # PREFER A LIST THAT NAMES FILES. pa_pardon_expungement-set carries both:
    # `artifacts` holds its two assembled outputs WITH paths, and `packets` is
    # the same two fixtures' composition with no path at all. Reading `packets`
    # first sent it down the composition branch, which answers the coverage
    # question by globbing fixtures/ -- and the four per-component PDFs the
    # builder retains for byte proof are in that directory, so a family that
    # declares exactly two outputs was refused for delivering six. The
    # declaration says what is delivered; the directory does not.
    candidates=[report.get(k) for k in ('packets','pdfs','artifacts')]
    candidates=[d for d in candidates if isinstance(d,list) and d]
    require(candidates,'declared output list is missing; a report this script cannot read is not a report of its outputs')
    with_files=[d for d in candidates if all(isinstance(x,dict) and 'file' in x for x in d)]
    declared=with_files[0] if with_files else candidates[0]
    expected_paths={e['path'] for e in expected_documents(c)}
    if all('file' in d for d in declared):
        require(len(declared)==len(expected_paths) and {d['file'] for d in declared}==expected_paths,'the receipt does not cover every declared output')
    else:
        # A COMPOSITION report rather than a file list.
        #
        # Colorado and Pennsylvania describe each fixture by the documents
        # assembled INTO it -- {"fixture":"canonical","documents":["JDF-417",
        # "JDF-418"]} -- and name no path. The question this check asks is
        # unchanged: does the family deliver anything the receipt did not
        # render? So it is answered against the delivered PDFs themselves
        # rather than against a list of component names, which are not
        # deliverables and were never separately rendered.
        require({d.get('fixture') for d in declared}=={'canonical','boundary'},'a composition report must describe both fixtures')
        for d in declared:
            require(isinstance(d.get('documents'),list) and d['documents'],'a fixture that declares no documents is not a readable report')
        delivered={str(p) for p in sorted((home/'fixtures').glob('*.pdf'))}
        require(delivered==expected_paths,'the receipt does not cover every delivered PDF')
    require(not list((home/'fixtures/branches').glob('*.pdf')),'conditional output requires complete-set coverage')
    mutations=[lambda x:x.update(verdict='RASTER_FAIL'),lambda x:x.update(packetCommitSha='0'*40),lambda x:x.update(workflowRunId='0'),lambda x:x.update(documentsDigest='0'*64),lambda x:x['documentsRendered'].pop(),lambda x:x['hashesBound']['canonical'].update(pinned='0'*64),lambda x:x['measurements'].pop(),lambda x:x['measurements'][1].update(kind=x['measurements'][0]['kind'],document=x['measurements'][0]['document'],page=x['measurements'][0]['page']),lambda x:x['measurements'][0].update(kind='boundary' if x['measurements'][0]['kind']=='canonical' else 'canonical'),lambda x:x['measurements'][0].update(png='not-the-page-this-document-rendered.png'),lambda x:x['measurements'][0].update(nonblank=False),lambda x:x['measurements'][0].update(calibrationResidualPx=3),lambda x:x.update(problems=['clipped']),lambda x:x.update(environmentProblems=['missing renderer']),lambda x:x.update(packetPdfsModified=1),lambda x:x.update(coversTheWholeFamily=False)]
    tests=[]
    for mutate in mutations:
        x=copy.deepcopy(v);mutate(x);tests.append(lambda x=x:validate(c,row,x,images,run,jobs))
    missing=dict(images);missing.pop(next(iter(missing)))
    corrupt=dict(images);corrupt[next(iter(corrupt))]=b'broken'
    tests.extend([lambda:validate(c,row,v,missing,run,jobs),lambda:validate(c,row,v,corrupt,run,jobs),lambda:validate(c,row,v,images,dict(run,conclusion='failure'),jobs),lambda:validate(c,row,v,images,run,[j for j in jobs if j['name']!=c['familyId']])])
    caught=0
    for test in tests:
        try:test()
        except ValueError:caught+=1
        else:raise ValueError('corrupt receipt accepted')
    out=Path(c['evidenceDirectory']);out.mkdir(parents=True,exist_ok=True)
    verdict_path=out/(family_path(c['familyId'])+'.verdict.json')
    verdict_path.write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n')
    receipt={'schemaVersion':'rcap-completed-fixture-raster-admission/v1','familyId':c['familyId'],'runId':c['runId'],'artifactId':c['artifactId'],'packetCommit':c['packetCommit'],'zipSha256':c['zipSha256'],'wholeCurrentAndImmutablePdfsVerified':True,'imageBytesReadBy':c.get('imageBytesReadBy','this admission, from the artifact ZIP'),'measuredPageImages':measured,'pagesMeasured':len(measured),'admissionControlsRejected':caught,'independentSemanticApproval':False,'newTerminalPromotions':0}
    (out/'admission-proof.json').write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n')
    prior=row.get('rasterReceipt')
    if prior and str(prior.get('workflowRunId'))!=str(c['runId']):row.setdefault('supersededReceipts',[]).append(dict(prior,supersededBecause='New complete current-byte central receipt admitted.'))
    job=next(j for j in jobs if j['name']==c['familyId'])
    names=[d['document'] for d in v['documentsRendered']]
    row['currentRasterState']='RASTER_PASS';row['nextOwner']='CHATB20260907'
    row['rasterReceipt']={'verdict':'RASTER_PASS','workflowRunId':str(c['runId']),'workflow':run['path'],'renderedCommitSha':c['packetCommit'],'jobId':str(job['id']),'jobConclusion':'success','boundToCanonicalSha256':c['expectedPdfs']['canonical']['sha256'],'boundToBoundarySha256':c['expectedPdfs']['boundary']['sha256'],'documentsDigest':v['documentsDigest'],'documentsCovered':names,'documentsNotCovered':[],'coversTheWholeFamily':True,'documentsMeasured':2,'pagesMeasured':len(measured),'problemsFound':0,'receiptArtifact':{'id':str(c['artifactId']),'name':f"rcap-raster-{family_path(c['familyId'])}-{c['runId']}",'zipSha256':'sha256:'+c['zipSha256']},'verdictPath':str(verdict_path),'receiptArtifactInspection':str(out/'admission-proof.json'),'admittedBy':'Chat A: current-byte raster evidence only, no independent semantic approval.'}
    row['coverage']={'documents':names,'rastered':names,'notRastered':[],'complete':True,'basis':'Both whole declared PDFs and every page matched the completed central receipt.','notRenderedByThisGate':[]}
    Q.write_text(json.dumps(queue,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps(receipt,indent=2))
if __name__=='__main__':main()

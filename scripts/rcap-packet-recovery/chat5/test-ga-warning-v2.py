#!/usr/bin/env python3
"""CHAT4-GA-01 actual complete-output delta controls, author QA only."""
import argparse,hashlib,json,pathlib,tempfile
import fitz
OUT='data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill'
WARNING='Restriction does not remove employment or office disqualifications that apply under O.C.G.A. 42-8-63.1; see 35-3-37(u). This does not mean every job is barred or every employer may access the record.'
def h(b):return hashlib.sha256(b).hexdigest()
def norm(s):return ''.join(s.split())
def check_warning(text):
 assert norm(WARNING) in norm(text),'MISSING_OR_OVERBROAD_EMPLOYMENT_WARNING'
 assert norm('It does not settle federal or immigration disclosure duties.') in norm(text),'FEDERAL_CAUTION_REMOVED'
 assert norm('not record destruction or separate court sealing') in norm(text),'NO_DESTRUCTION_CAUTION_REMOVED'
def main():
 a=argparse.ArgumentParser();a.add_argument('--root',default='.');a.add_argument('--baseline',required=True);a.add_argument('--pass1',required=True);a.add_argument('--pass2',required=True);a.add_argument('--evidence',required=True);o=a.parse_args()
 root=pathlib.Path(o.root).resolve();out=root/OUT;base=pathlib.Path(o.baseline);p1=pathlib.Path(o.pass1);p2=pathlib.Path(o.pass2);e=pathlib.Path(o.evidence);e.mkdir(parents=True,exist_ok=True)
 files=sorted(str(p.relative_to(out)) for p in out.rglob('*') if p.is_file());assert len(files)==52
 vectors=[]
 for name in files:
  b=(out/name).read_bytes();assert b==(p1/name).read_bytes()==(p2/name).read_bytes()
  vectors.append({'path':name,'oldSha256':h((base/name).read_bytes()),'newSha256':h(b),'unchanged':b==(base/name).read_bytes()})
 check_warning((out/'participant-instructions.md').read_text())
 artifacts=json.loads((out/'reports/rendered-artifacts.json').read_text())['artifacts'];pages=[];changed={};checks=[]
 for a in artifacts:
  old=fitz.open(base/a['path']);new=fitz.open(out/a['path']);assert len(old)==len(new)==a['pageCount'];check_warning(new[6].get_text());checks.append({'fixture':a['fixture'],'result':'PASS','warningPage':7})
  for i,(p,q) in enumerate(zip(old,new)):
   x=p.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).tobytes('png');y=q.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).tobytes('png');same=x==y
   assert same==(i!=6),'UNEXPECTED_CHANGED_PAGE: '+a['fixture']+':'+str(i+1)
   if not same and h(y) not in changed:
    n='changed-'+str(len(changed)+1)+'.png';(e/n).write_bytes(y);changed[h(y)]=n
   pages.append({'fixture':a['fixture'],'page':i+1,'oldPngSha256':h(x),'newPngSha256':h(y),'unchanged':same,'changedRepresentative':changed.get(h(y))})
 negatives=[]
 with tempfile.TemporaryDirectory() as td:
  for word in ['42-8-63.1','every job']:
   d=fitz.open(out/'fixtures/canonical.pdf');boxes=d[6].search_for(word);assert boxes
   for r in boxes:d[6].add_redact_annot(r,fill=(1,1,1))
   d[6].apply_redactions();p=pathlib.Path(td)/('bad'+str(len(negatives))+'.pdf');d.save(p);d.close()
   caught=False
   try:check_warning(fitz.open(p)[6].get_text())
   except AssertionError:caught=True
   assert caught;negatives.append({'removed':word,'actualPdfMutantRejected':caught,'sha256':h(p.read_bytes())})
 summary={'finding':'CHAT4-GA-01','scope':'AUTHOR_DELTA_QA_NOT_INDEPENDENT_REVIEW','completePdfs':len(artifacts),'pages':len(pages),'fullRunsCompared':3,'allGeneratedFilesIdentical':len(files),'changedPageInstances':sum(not r['unchanged'] for r in pages),'unchangedPageInstances':sum(r['unchanged'] for r in pages),'distinctChangedPages':len(changed),'positivePdfWarningChecks':checks,'markdownWarningCheck':'PASS','actualPdfNegativeControls':negatives,'fileEquivalence':vectors,'pageEquivalence':pages,'sourceOrPredicateOrFieldMappingChange':False}
 (e/'warning-delta.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps({k:v for k,v in summary.items() if k not in ['fileEquivalence','pageEquivalence']},indent=2))
if __name__=='__main__':main()

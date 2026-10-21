import pathlib,hashlib,json,subprocess,re
import tempfile,os
root=pathlib.Path(__file__).resolve().parents[2];temporary=tempfile.TemporaryDirectory(prefix='wa-sud-saved-pdf-');work=pathlib.Path(temporary.name);name='wa-vac-substance-use-disorder-set--custom-pleading';old=work/'original'/name;new=root/'data/rcap-all50/overlays/census-v1/wa'/name
# Recover only the frozen comparison bytes, never rebuild either fixture.
for relative in [p.relative_to(new) for p in new.rglob('*') if p.is_file()]:
 target=old/relative;target.parent.mkdir(parents=True,exist_ok=True)
 target.write_bytes(subprocess.check_output(['git','show',f'fc78ab3ac5e3ab94c332117fc40ef7a5edc65c6a:{(new/relative).relative_to(root)}'],cwd=root,env={**os.environ,'GIT_NO_LAZY_FETCH':'1'}))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:subprocess.check_output(['pdftotext','-layout',str(p),'-'],text=True).split('\f')[:-1]
norm=lambda s:' '.join(s.split())
results=[]
for fixture in ['canonical','boundary']:
 a=old/'fixtures'/f'{fixture}.pdf';b=new/'fixtures'/f'{fixture}.pdf';aa=read(a);bb=read(b)
 assert len(aa)==10 and len(bb)==9
 assert norm(' '.join(aa))==norm(' '.join(bb))
 assert norm(aa[5])=='judicial decision.'
 assert 'judicial decision.' in norm(bb[4])
 assert all(norm(aa[i])==norm(bb[i]) for i in range(4))
 assert all(norm(aa[i+1])==norm(bb[i]) for i in range(5,9))
 assert norm(aa[4]+' '+aa[5])==norm(bb[4])
 results.append({'fixture':fixture,'oldSHA256':sha(a),'newSHA256':sha(b),'oldPages':len(aa),'newPages':len(bb),'completeNormalizedTextEqual':True,'unchangedOther8PagesText':True,'orphanMergedIntoNoticePage5':True,'newTextSHA256':hashlib.sha256(norm(' '.join(bb)).encode()).hexdigest()})
inventory=[]
for p in sorted(new.rglob('*')):
 if p.is_file():
  rel=p.relative_to(new);o=old/rel;inventory.append({'path':str(rel),'oldSHA256':sha(o) if o.exists() else None,'newSHA256':sha(p),'bytes':p.stat().st_size})
for rel in ['production-field-map.json','participant-instructions.md','reports/blanks-left-for-the-participant.json']:
 assert (old/rel).read_bytes()==(new/rel).read_bytes(),rel
receipt={'scope':'Author layout-only comparison; not independent semantics or visual PASS. Complete extracted text equal ignoring layout whitespace. Existing semantic return/history untouched. Fresh raster and independent review required.','results':results,'exactByteEqual':['production-field-map.json','participant-instructions.md','reports/blanks-left-for-the-participant.json'],'inventory':inventory}
print('PASS: both saved PDFs preserve full text and unaffected pages; each notice includes its closing sentence on page5. Legitimate short pages unchanged.')
temporary.cleanup()

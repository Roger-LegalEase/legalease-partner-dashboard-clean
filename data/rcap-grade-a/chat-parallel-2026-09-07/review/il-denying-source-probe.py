#!/usr/bin/env python3
"""Read-only independent inventory of the newly delivered blank Denying Order.
No packet builder, production map, official-source content, or verdict is changed.
"""
import argparse,copy,hashlib,json,stat,zipfile
from pathlib import Path,PurePosixPath
from collections import Counter
import fitz
p=argparse.ArgumentParser();p.add_argument('archive',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
sha=lambda b:hashlib.sha256(b).hexdigest()
blob=lambda b:hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()
ZIP='6c2e85c70f928145ba73252dcdc84be7402598199489cf7b58e7a77fe0108e06'
PDF='2d3039fa873801bc58bf425a2c73f489951bb82de33b11af031e8bf62df3ffa8'
def require_pin(b,h):
 if sha(b)!=h:raise ValueError('source digest mismatch')
def safe_member(n,mode):
 q=PurePosixPath(n);return not q.is_absolute() and '..' not in q.parts and not stat.S_ISLNK(mode)
raw=a.archive.read_bytes();require_pin(raw,ZIP)
with zipfile.ZipFile(a.archive) as z:
 assert len(z.infolist())==2 and z.testzip() is None
 for m in z.infolist():assert safe_member(m.filename,m.external_attr>>16)
 names=z.namelist();pn=next(n for n in names if n.endswith('.pdf'));rn=next(n for n in names if n.endswith('.json'));pdf=z.read(pn);receipt=z.read(rn)
require_pin(pdf,PDF);d=fitz.open(stream=pdf,filetype='pdf');assert len(d)==1 and not d.is_encrypted
page=d[0];assert page.rect==fitz.Rect(0,0,612,792);stop=page.search_for('Do not fill in the sections below.')[0]
fields=[]
for w in page.widgets():
 assert str(w.field_value or '').strip() in ('','Off')
 role='judicial_protected' if w.rect.y0>stop.y1 else 'caption_or_recipient_conditionally_permitted'
 assert role=='judicial_protected' or w.rect.y1<stop.y0
 fields.append({'name':w.field_name,'type':w.field_type_string,'rectTopLeftPoints':list(w.rect),'sourceValue':w.field_value,'reviewRole':role})
assert len(fields)==30 and len({f['name'] for f in fields})==28
assert Counter(f['reviewRole'] for f in fields)=={'judicial_protected':18,'caption_or_recipient_conditionally_permitted':12}
# In-memory rejection tests do not alter an official source or packet.
controls=[]
for label,b,h,expected in [('exact_digest',pdf,PDF,True),('changed_byte',pdf[:-1]+bytes([pdf[-1]^1]),PDF,False),('wrong_pin',pdf,'0'*64,False)]:
 try:require_pin(b,h);actual=True
 except ValueError:actual=False
 assert actual==expected;controls.append({'case':label,'accepted':actual,'expected':expected})
for label,n,mode,expected in [('normal_member','reference/source.pdf',0o100644,True),('traversal','../source.pdf',0o100644,False),('absolute','/source.pdf',0o100644,False),('symlink','source.pdf',0o120777,False)]:
 actual=safe_member(n,mode);assert actual==expected;controls.append({'case':label,'accepted':actual,'expected':expected})
assert a.archive.read_bytes()==raw
result={'schemaVersion':'chatb-il-denying-source-measurements/v1','archive':{'sha256Measured':sha(raw),'bytes':len(raw),'members':names},'source':{'sha256Measured':sha(pdf),'gitBlobMeasured':blob(pdf),'bytes':len(pdf),'pages':len(d),'form':'ATJ2906.6','revision':'06/26','dimensionsPoints':list(page.rect)},'receivedProvenanceReceiptSha256':sha(receipt),'printedStopRect':list(stop),'fields':fields,'controls':controls,'summary':{'widgets':30,'uniqueFieldNames':28,'captionRecipientWidgets':12,'judicialProtectedWidgets':18,'meaningfulPrefills':0,'controls':len(controls),'inputArchiveUnchanged':True,'packetBuilds':0},'scope':'Blank-source custody, field inventory and printed ownership boundary only. Not a production field map, populated output, complete packet, binary issuer-freshness proof or independent packet PASS.'}
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n');print(json.dumps(result['summary']))

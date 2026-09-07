#!/usr/bin/env python3
"""Source-backed execution-blank checks on complete Alabama outputs."""
import argparse,hashlib,json,pathlib
import fitz
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[3]
FAMILIES=['al-felony-dwop-set','al-felony-nonconviction-90-set']
BLANKS={
 'prior-application-no':fitz.Rect(100,194,115,209),
 'prior-application-yes':fitz.Rect(100,214,115,229),
 'prior-county':fitz.Rect(135,230,330,248),
 'prior-case':fitz.Rect(135,251,366,269),
 'prior-granted':fitz.Rect(159,278,171,290),
 'prior-denied':fitz.Rect(218,278,231,290),
 'pro-se':fitz.Rect(333,335,346,348),
 'signature':fitz.Rect(330,302,546,321),
 'jurat':fitz.Rect(201,420,504,436),
 'notary-signature':fitz.Rect(42,435,270,450),
 'attorney-block':fitz.Rect(327,436,548,616)
}
def pixels(page,clip=None):
 p=page.get_pixmap(matrix=fitz.Matrix(2,2),clip=clip,alpha=False)
 return np.frombuffer(p.samples,dtype=np.uint8).reshape(p.height,p.width,p.n).copy()
def inspect(data,source):
 d=fitz.open(stream=data,filetype='pdf');assert len(d)==11,'all official pages required'
 for label,rect in BLANKS.items():
  assert np.array_equal(pixels(d[5],rect),pixels(source[5],rect)),f'unknown or protected completion field acquired ink: {label}'
 assert not any(list(p.widgets() or []) for p in d),'flattened outputs required'
 return d

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--source',type=pathlib.Path,required=True);ap.add_argument('--before',type=pathlib.Path,required=True);ap.add_argument('--out',type=pathlib.Path,required=True);a=ap.parse_args();a.out.mkdir(parents=True,exist_ok=True)
 sb=a.source.read_bytes();assert hashlib.sha256(sb).hexdigest()=='c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39'
 source=fitz.open(stream=sb,filetype='pdf'); positives=[];negatives=[]
 for fam in FAMILIES:
  folder=ROOT/f'data/rcap-all50/overlays/census-v1/al/{fam}--official-pdf-fill'
  for fixture in ['canonical','boundary']:
   b=(folder/'fixtures'/f'{fixture}.pdf').read_bytes();doc=inspect(b,source)
   before=(a.before/fam/'fixtures'/f'{fixture}.pdf').read_bytes()
   assert b==before,'this instruction/classification repair must not alter PDF ink'
   doc[5].get_pixmap(matrix=fitz.Matrix(1.6,1.6),alpha=False).save(a.out/f'{fam}-{fixture}-page6.png')
   positives.append({'family':fam,'fixture':fixture,'sha256':hashlib.sha256(b).hexdigest(),'pages':11,'byteIdenticalToBefore':True,'blankRegionsComparedToOfficialSource':len(BLANKS)})
   for mutation in ['prior-application-no','pro-se','prior-county','signature','jurat','missing-page']:
    bad=fitz.open(stream=b,filetype='pdf')
    if mutation=='missing-page':bad.delete_page(7)
    else:
     rect=BLANKS[mutation];bad[5].insert_text((rect.x0+2,rect.y1-2),'X',fontsize=8)
    try:inspect(bad.tobytes(),source)
    except AssertionError as e:negatives.append({'family':fam,'fixture':fixture,'mutation':mutation,'caught':str(e)})
    else:raise AssertionError('defect missed: '+mutation)
 report={'scope':'author actual complete-output tests; new instructions do not execute an oath','positives':positives,'negativeControls':negatives,'negativeCount':len(negatives),'independentApproval':False}
 (a.out/'pdf-tests.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()

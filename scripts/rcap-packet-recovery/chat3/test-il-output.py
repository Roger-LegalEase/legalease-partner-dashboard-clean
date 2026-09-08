#!/usr/bin/env python3
"""Read real complete Illinois outputs; catch original defects in PDF bytes.

No OCR, font-metric doubles, substitute forms, or independent verdicts.
"""
import argparse, hashlib, json, pathlib, re, tempfile
import fitz
ROOT = pathlib.Path(__file__).resolve().parents[3]
FAMILY = ROOT / 'data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill'
CONTACTS = {
 'canonical':['Jordan Avery Reyes','412 West Madison Street, Chicago, IL 60606','312-555-0142','jordan.reyes@example.org'],
 'boundary':['Alexandria Catherine Montgomery-Washington','1188 Martin Luther King Jr. Drive, Apartment 1407, Springfield, IL 62703','217-555-0199','alexandria.montgomery.washington@example.org']}
CHARGE = 'Possession of a controlled substance'
norm = lambda s: re.sub(r'\s+', ' ', s).strip()
def inspect(data: bytes, fixture: str) -> dict:
    doc = fitz.open(stream=data,filetype='pdf')
    assert len(doc)==13, 'complete official page set required'
    assert all(not list(page.widgets() or []) for page in doc), 'output must be flattened'
    text = [norm(page.get_text()) for page in doc]
    assert 'REQUEST TO SEAL CRIMINAL RECORDS' in text[3], 'Request page order'
    assert 'IT IS ORDERED' in text[8], 'Order page order'
    order = doc[8]
    for value in CONTACTS[fixture]:
        assert norm(value) in norm(order.get_text(clip=fitz.Rect(65,95,535,150))), f'order contact missing or outside item 3: {value}'
    charge_rect = fitz.Rect(276,287,436,323)
    assert CHARGE in norm(doc[3].get_text(clip=charge_rect)), 'charge missing or in wrong cell'
    assert not re.search(r'exactly as (shown|printed)|extended statutory description|materially exceeds', text[3], re.I), 'instruction in charge cell'
    # The empty ENTERED lines must not acquire fixture ink.
    judge_area = norm(order.get_text(clip=fitz.Rect(175,582,550,630)))
    assert not any(value in judge_area for value in CONTACTS[fixture]), 'participant fact written in judge area'
    return {'fixture':fixture,'sha256':hashlib.sha256(data).hexdigest(),'pages':13,'contactFieldsReadInOrderBlock':4,'chargeCellRead':True}
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--out',type=pathlib.Path,required=True); args=ap.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    positives=[];negatives=[]
    for fixture in CONTACTS:
        data=(FAMILY/'fixtures'/f'{fixture}.pdf').read_bytes(); positives.append(inspect(data,fixture))
        for mutation in ('missing-order-contacts','instruction-in-charge','case-in-charge','missing-official-page'):
            doc=fitz.open(stream=data,filetype='pdf')
            if mutation=='missing-order-contacts':
                doc[8].add_redact_annot(fitz.Rect(65,95,535,150));doc[8].apply_redactions()
            elif mutation=='missing-official-page': doc.delete_page(6)
            else:
                doc[3].add_redact_annot(fitz.Rect(276,287,436,323));doc[3].apply_redactions()
                doc[3].insert_text((280,304),'Charge exactly as shown on the court disposition' if mutation=='instruction-in-charge' else '2021-CF-004217',fontsize=6)
            changed=doc.tobytes()
            try: inspect(changed,fixture)
            except AssertionError as e: negatives.append({'fixture':fixture,'mutation':mutation,'caught':str(e)})
            else: raise AssertionError(f'mutation escaped: {fixture}/{mutation}')
        original=fitz.open(stream=data,filetype='pdf')
        # Render the complete changed pages, not just clipped probes.
        for page in (0,3,8): original[page].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False).save(args.out/f'{fixture}-page-{page+1:02d}.png')
    report={'familyId':'il-seal-edu-set','scope':'author complete-output regression','positives':positives,'negativeControls':negatives,'negativeCount':len(negatives),'independentApproval':False}
    (args.out/'output-tests.json').write_text(json.dumps(report,indent=2)+'\n'); print(json.dumps(report,indent=2))
if __name__=='__main__': main()

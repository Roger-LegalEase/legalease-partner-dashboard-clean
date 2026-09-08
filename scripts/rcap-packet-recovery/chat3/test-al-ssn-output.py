#!/usr/bin/env python3
"""Check actual CR-65 context, complete packet inventory and changed ink.
Author QA only. Prior successful history/pro-se instructions are not replaced.
Requires PyMuPDF and numpy. Reads sources and PDFs; mutates in-memory copies only.
"""
from pathlib import Path
import argparse, hashlib, json
import fitz
import numpy as np

FAMILIES = ("al-felony-dwop-set", "al-felony-nonconviction-90-set")
FIELD = fitz.Rect(124.702003, 251.267029, 191.938004, 266.958008)
CASE_FIELD = fitz.Rect(257.197, 282.208, 544.518, 304.208)
FONT_SIZE = 8.0
ORIGIN = fitz.Point(125.702003, 261.984497)
def digest(b): return hashlib.sha256(b).hexdigest()
def spans(page):
    return [s for b in page.get_text("dict")["blocks"] if "lines" in b for l in b["lines"] for s in l["spans"]]
def field_spans(page):
    # Match actual value origin against the source widget, not against author reports.
    return [s for s in spans(page) if FIELD.contains(fitz.Point(s["origin"])) and s["text"].strip()]
def pixels(page, clip=None):
    p=page.get_pixmap(matrix=fitz.Matrix(2,2),colorspace=fitz.csGRAY,alpha=False,clip=clip)
    return np.frombuffer(p.samples,dtype=np.uint8).reshape(p.height,p.width)
def check_pdf(b, expected, case, source):
    doc=fitz.open(stream=b,filetype="pdf")
    assert len(doc)==11, "COMPONENT_PAGE_COUNT: expected eight CR-65 + three C-10 pages"
    assert "Last four digits only" in doc[0].get_text(), "SOURCE_CONTEXT_MISSING"
    for n in range(8):
        assert "CR-65" in doc[n].get_text(), f"CR65_PAGE_ORDER: {n+1}"
    assert "HARDSHIP" in doc[8].get_text().upper(), "C10_PAGE_ORDER"
    values=field_spans(doc[0])
    if expected is None:
        assert not values, "MISSING_FACT_WAS_FILLED"
        assert np.array_equal(pixels(doc[0],FIELD),pixels(source[0],FIELD)), "MISSING_FACT_INK"
    else:
        assert len(values)==1 and values[0]["text"]==expected, "WRONG_SSN_FACT"
        s=values[0]
        assert abs(s["size"]-FONT_SIZE)<0.01, "FONT_FLOOR_CHANGED"
        assert FIELD.contains(fitz.Rect(s["bbox"])), "SSN_CLIPPED_OR_OUTSIDE_FIELD"
        assert len(expected)==4 and expected.isascii() and expected.isdigit(), "NON_LAST4"
    # Case number must remain in its genuine case-to-expunge field.
    assert case in doc[0].get_text(clip=CASE_FIELD), "CASE_NUMBER_LOST"
    # Preserve the unknown prior-application and representation/execute blanks.
    for area in [(100,194,115,209),(100,214,115,229),(135,230,330,248),
                 (135,251,366,269),(159,278,171,290),(218,278,231,290),
                 (333,335,346,348),(330,302,546,321),(201,420,504,436),
                 (42,435,270,450),(327,436,548,616)]:
        assert np.array_equal(pixels(doc[5],fitz.Rect(area)),pixels(source[5],fitz.Rect(area))), "PROTECTED_PAGE6_INK"
    return {"pages":len(doc),"ssn":expected,"valueSpans":values}
def mutate(b, kind):
    d=fitz.open(stream=b,filetype="pdf")
    if kind=="drop-page": d.delete_page(8)
    elif kind=="swap-components":
        d.select([8,1,2,3,4,5,6,7,0,9,10])
    elif kind=="attest-pro-se":
        d[5].insert_text((335,345),"X",fontsize=8)
    else:
        d[0].add_redact_annot(FIELD,fill=None)
        d[0].apply_redactions(images=0,graphics=0)
        text={"old-case-binding":"CC-2024-000001.99",
              "wrong-last4":"9911","full-ssn":"123-45-6789",
              "shrink-font":"0428","clipped":"0428","blank-when-held":""}.get(kind)
        if text:
            point=(185,ORIGIN.y) if kind=="clipped" else ORIGIN
            d[0].insert_text(point,text,fontsize=4 if kind=="shrink-font" else 8,fontname="helv")
    return d.tobytes(garbage=4,deflate=True)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--root",type=Path,default=Path(__file__).resolve().parents[3])
    ap.add_argument("--source",type=Path,required=True)
    ap.add_argument("--prior",type=Path,required=True)
    ap.add_argument("--out",type=Path,required=True)
    a=ap.parse_args(); a.out.mkdir(parents=True,exist_ok=True)
    source_bytes=a.source.read_bytes()
    assert digest(source_bytes)=="c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39"
    source=fitz.open(stream=source_bytes,filetype="pdf"); assert len(source)==8
    positive=[]; negative=[]; comparisons=[]; image_rows=[]; aliases={}
    for family in FAMILIES:
        rel=Path(f"data/rcap-all50/overlays/census-v1/al/{family}--official-pdf-fill")
        for fixture,ssn,case in [("canonical","0428","CC-2021-004217"),("boundary","0073","CC-2024-000001.99")]:
            old=fitz.open(a.prior/rel/"fixtures"/f"{fixture}.pdf")
            for missing in [False,True]:
                name=fixture+("-ssn-missing" if missing else "")
                path=a.root/rel/"fixtures"/f"{name}.pdf"; b=path.read_bytes()
                measured=check_pdf(b,None if missing else ssn,case,source)
                positive.append({"family":family,"fixture":name,"sha256":digest(b),"bytes":len(b),**measured})
                doc=fitz.open(stream=b,filetype="pdf")
                for n in range(11):
                    before,after=pixels(old[n]),pixels(doc[n])
                    assert before.shape==after.shape
                    diff=before!=after
                    outside=diff.copy()
                    if n==0:
                        r=FIELD+(-2,-2,2,2)
                        outside[max(0,int(r.y0*2)):int(r.y1*2)+1,max(0,int(r.x0*2)):int(r.x1*2)+1]=False
                    assert not outside.any(), f"UNRELATED_INK_CHANGED:{family}:{name}:{n+1}"
                    comparisons.append({"family":family,"fixture":name,"page":n+1,"pixelsChanged":int(diff.sum()),"outsideSsnField":int(outside.sum())})
                # Retain complete changed page, never a crop as the visual review artifact.
                png=doc[0].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False).tobytes("png")
                h=digest(png); image=a.out/f"{family}-{name}-page-01.png"; image.write_bytes(png)
                alias=aliases.get(h); aliases.setdefault(h,image.name)
                image_rows.append({"file":image.name,"sha256":h,"aliasOf":alias,"wholePage":True})
            for kind in ["old-case-binding","wrong-last4","full-ssn","shrink-font","clipped","blank-when-held","drop-page","swap-components","attest-pro-se"]:
                b=(a.root/rel/"fixtures"/f"{fixture}.pdf").read_bytes()
                try: check_pdf(mutate(b,kind),ssn,case,source)
                except AssertionError as e: negative.append({"family":family,"fixture":fixture,"mutation":kind,"caught":str(e)})
                else: raise AssertionError(f"Mutation escaped: {family}:{fixture}:{kind}")
            b=(a.root/rel/"fixtures"/f"{fixture}-ssn-missing.pdf").read_bytes()
            try: check_pdf(mutate(b,"wrong-last4"),None,case,source)
            except AssertionError as e: negative.append({"family":family,"fixture":fixture+"-ssn-missing","mutation":"fill-absent-last4","caught":str(e)})
            else: raise AssertionError("Absent last-four mutation escaped")
    assert digest(a.source.read_bytes())==digest(source_bytes)
    report={"scope":"actual complete-PDF author QA; not independent or central acceptance",
            "positives":positive,"negativeControls":negative,"negativeCount":len(negative),
            "pageComparisons":comparisons,"wholePageImages":image_rows,
            "sourceBytesUnchanged":True,"independentApproval":False}
    (a.out/"pdf-tests.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({"completePdfs":len(positive),"pages":sum(p["pages"] for p in positive),"negativeControlsCaught":len(negative),
                      "unchangedPages":sum(p["pixelsChanged"]==0 for p in comparisons),
                      "changedPagesOnlyInSsnRegion":sum(p["pixelsChanged"]>0 for p in comparisons),
                      "uniqueWholePageImages":len(aliases)},indent=2))
if __name__=="__main__": main()

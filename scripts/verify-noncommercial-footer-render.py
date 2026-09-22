#!/usr/bin/env python3
"""Independent PDF/raster proof. No approval is issued; approved PDFs are read only."""
import hashlib, json, pathlib, re, sys
import pymupdf as fitz
import numpy as np

def sha(data): return hashlib.sha256(data).hexdigest()
def lines(page):
    return [dict(text=''.join(s['text'] for s in l['spans']), bbox=list(l['bbox']), spans=l['spans'])
            for b in page.get_text('dict')['blocks'] if 'lines' in b for l in b['lines']]
def compare(old_path,new_path,raster_dir=None):
    old,new=fitz.open(old_path),fitz.open(new_path)
    assert len(old)==len(new),'page count changed'
    pages=[]
    for i,(before,after) in enumerate(zip(old,new)):
        assert before.rect==after.rect,'page geometry changed'
        original=lines(before); current=lines(after)
        footer=[]; retained=[]; in_footer=False
        for row in original:
            if re.match(r'^Route:\s*obligation:',row['text']): in_footer=True
            if in_footer:
                # These exact builders put only route identifiers in the final
                # wrapped trailer, never body/signature/service material.
                assert re.fullmatch(r'(?:Route:\s*)?[;\s]*(?:obligation:)?[A-Za-z0-9_:; .\-]+',row['text']), 'non-provenance trailer content'
                footer.append(row)
            else: retained.append(row)
        assert not any('Route: obligation:' in x['text'] or 'obligation:track-pathway:' in x['text'] for x in current),'footer remains'
        # Exact full span records include text, origin, bbox, font, size, color.
        # This proves every caption, blank, prefill and substantive glyph stays
        # on the identical page and coordinate, not just equal word counts.
        blank=[row for row in current if not row['text'].strip()]
        current=[row for row in current if row['text'].strip()]
        assert len(blank)==len(footer),'wrapped row footprint changed'
        for was,now in zip(footer,blank):
            assert now['text']==' ','footer was not replaced by exactly one blank row'
            assert len(was['spans'])==len(now['spans'])==1
            for key in ['origin','size','font','color','alpha']:
                assert was['spans'][0][key]==now['spans'][0][key],'blank row geometry changed'
        assert retained==current,'non-footer text/geometry/font changed'
        assert any(x['text'].strip() for x in current),'blank/filler page'
        for row in current:
            x0,y0,x1,y1=row['bbox']
            assert 0<=x0<=x1<=before.rect.width+0.01 and 0<=y0<=y1<=before.rect.height+0.01,'clipping'
        a=before.get_pixmap(matrix=fitz.Matrix(2,2),colorspace=fitz.csGRAY,alpha=False)
        b=after.get_pixmap(matrix=fitz.Matrix(2,2),colorspace=fitz.csGRAY,alpha=False)
        av=np.frombuffer(a.samples,dtype=np.uint8).reshape(a.height,a.width)
        bv=np.frombuffer(b.samples,dtype=np.uint8).reshape(b.height,b.width)
        mask=np.zeros(av.shape,dtype=bool)
        for row in footer:
            x0,y0,x1,y1=row['bbox']; mask[max(0,int(y0*2)-2):int(y1*2)+3,max(0,int(x0*2)-2):int(x1*2)+3]=True
        changed=av!=bv
        assert not np.any(changed & ~mask),'ink changed outside route footer'
        assert not np.any(bv<av),'new/darkened ink or moved/overlapped content'
        pixels=int(np.count_nonzero(changed))
        rasters=[]
        if pixels and raster_dir:
            dest=pathlib.Path(raster_dir);dest.mkdir(parents=True,exist_ok=True)
            for label,pix in [('before',a),('after',b)]:
                file=dest/f'page-{i+1:02}-{label}.png';pix.save(file);rasters.append({'path':str(file),'sha256':sha(file.read_bytes())})
        pages.append({'page':i+1,'retainedLineCount':len(current),'removedWrappedRows':len(footer),
          'removedFooterText':[r['text'] for r in footer],'retainedSpansSha256':sha(json.dumps(retained,sort_keys=True).encode()),
          'changedPixels':pixels,'newOrDarkenedPixels':0,'changedPixelsOutsideFooter':0,'rasters':rasters})
    return {'pageCount':len(new),'sameSubstantiveSpansAndCoordinates':True,'samePageGeometry':True,
      'noNewBlankPage':True,'noClippingOrOverlapRegression':True,'footerAbsent':True,'pages':pages}
if __name__=='__main__':
    print(json.dumps(compare(*sys.argv[1:]),indent=2))

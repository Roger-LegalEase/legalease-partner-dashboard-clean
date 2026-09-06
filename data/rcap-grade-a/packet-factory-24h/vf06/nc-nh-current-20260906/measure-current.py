#!/usr/bin/env python3
"""Read current source/packet text coordinates without calling a builder.

This is a measurement, not a legal approval or a replacement for visual review.
Source PDFs stay in their recovered private custody; only the scoped evidence
directory is written. Declared write lists are checked against independently read
source widgets, held fixture facts, and output words. Printed non-widget blanks
are considered separately in the accompanying independent review.
"""
import hashlib, json, pathlib, re, subprocess, xml.etree.ElementTree as ET

ROOT = pathlib.Path.cwd()
OUT = ROOT / 'data/rcap-grade-a/packet-factory-24h/vf06/nc-nh-current-20260906'
read = lambda p: json.loads(pathlib.Path(p).read_text())
hash_bytes = lambda b: hashlib.sha256(b).hexdigest()
norm = lambda s: ' '.join(str(s).replace('’', "'").split())
census = read(OUT / 'source-fields.json')

def text_pages(path):
    raw = subprocess.check_output(['pdftotext', '-bbox', str(path), '-'], stderr=subprocess.PIPE).decode()
    raw = ''.join(c for c in raw if ord(c) >= 32 or c in '\t\r\n')
    pages = []
    for p in ET.fromstring(raw).findall('.//{*}page'):
        pages.append({'width': float(p.attrib['width']), 'height': float(p.attrib['height']), 'words': [
            {'text': w.text or '', 'bbox': [float(w.attrib[k]) for k in ['xMin','yMin','xMax','yMax']]}
            for w in p.findall('{*}word')
        ]})
    return pages

def widget_box(widget, page):
    r=widget['rect']; return [r['x'], page['height']-r['y']-r['height'],r['x']+r['width'],page['height']-r['y']]

def centered(word, box, tolerance=.25):
    b=word['bbox']; x=(b[0]+b[2])/2; y=(b[1]+b[3])/2
    return box[0]-tolerance<=x<=box[2]+tolerance and box[1]-tolerance<=y<=box[3]+tolerance

def same_word(a,b):
    return norm(a['text'])==norm(b['text']) and max(abs(x-y) for x,y in zip(a['bbox'],b['bbox']))<.1

common = {
 'canonical': {'participant.full_legal_name':'Jordan Avery Reyes','participant.date_of_birth':'1991-04-17'},
 'boundary': {'participant.full_legal_name':"Maria-Alejandra O'Shaughnessy-Whitfield",'participant.date_of_birth':'1968-12-31'}
}
facts={
 'nc':{
  'canonical':dict(zip(['participant.street_address','participant.city','participant.state','participant.zip','participant.phone','matter.case_number','matter.county'],['42 Larkspur Street','Raleigh','NC','27601','919-555-0142','19CR001184','Wake'])),
  'boundary':dict(zip(['participant.street_address','participant.city','participant.state','participant.zip','participant.phone','matter.case_number','matter.county'],['1188 Upper Yadkin River Crossing Road, Apartment 14B','Winston-Salem','NC','27101-2214','(336) 555-0199 ext. 4417','2004CR000000118844-A','New Hanover']))
 },
 'nh':{
  'canonical':dict(zip(['participant.street_address','participant.city','participant.state','participant.zip','participant.phone','matter.case_number','matter.county','participant.email','participant.first_name','participant.last_name','participant.middle_name','participant.city_state_zip'],['412 Elm Street, Apartment 3','Concord','NH','03301','603-555-0142','473-2016-CR-00218','Merrimack','jordan.reyes@example.org','Jordan','Reyes','A','Concord, NH 03301'])),
  'boundary':dict(zip(['participant.street_address','participant.city','participant.state','participant.zip','participant.phone','matter.case_number','matter.county','participant.email','participant.first_name','participant.last_name','participant.middle_name','participant.city_state_zip'],['1188 Upper Notch Crossing Road, Apartment 14B','Portsmouth','NH','03801-2214','(603) 555-0199 ext. 4417','218-2018-CR-00119821-SUPPLEMENTAL','Rockingham','maria.alejandra.oshaughnessy.whitfield@longmailexample.org','Maria-Alejandra',"O'Shaughnessy-Whitfield",'Q','Portsmouth, New Hampshire 03801-2214']))
 }
}
for state, fixtures in facts.items():
 for fixture, values in fixtures.items():
    values.update(common[fixture])
    if state=='nh': values['participant.street_city_state_zip']=values['participant.street_address']+', '+values['participant.city_state_zip']

queue=read(ROOT/'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')
result={'method':'Poppler current PDF words at coordinates; exact source AcroForm widget inventory from pdf-lib; independent fixture-fact transcription from current builder; source/packet SHA-256; declared labels matched to current guide', 'families':[]}
for state, slug, family in [('nc','nc-146-dismissal-petition-set','nc_146_dismissal_petition-set'),('nh','nh-petition-nonconviction-pre2019-set','nh_petition_nonconviction_pre2019-set')]:
    directory=ROOT/f'data/rcap-all50/overlays/census-v1/{state}/{slug}--official-pdf-fill'
    mapping=read(directory/'production-field-map.json'); receipt=read(directory/'source-receipt.json'); artifacts=read(directory/'reports/rendered-artifacts.json')
    guide=(directory/'participant-instructions.md').read_text()
    sources={s['documentId']:dict(s,pages=text_pages(s['path'])) for s in census['sources'] if s['state']==state}
    row={'itemId':family,'familyDirectory':str(directory.relative_to(ROOT)),'sources':[{k:s[k] for k in ['documentId','sha256','byteLength','pageCount','fieldCount']} for s in sources.values()], 'recordBindings':[], 'fixtures':[], 'disclosures':{},'currentImages':[]}
    for record in receipt.get('committedRecords',receipt.get('groundingRecords',[])):
        p=ROOT/record.get('pathInRepository',record.get('path')); b=p.read_bytes()
        assert hash_bytes(b)==record['sha256'] and len(b)==record['byteLength']
        row['recordBindings'].append({'path':str(p.relative_to(ROOT)),'sha256':hash_bytes(b),'exact':True})
    for fixture in ['canonical','boundary']:
        current=next(a for a in artifacts['artifacts'] if a['fixture']==fixture)
        pdf=ROOT/current['file']; b=pdf.read_bytes(); pages=text_pages(pdf)
        assert hash_bytes(b)==current['sha256'] and len(b)==current['byteLength'] and len(pages)==current['pageCount']
        raster=next(r for r in queue['rows'] if r['familyId']==family)
        assert raster['currentRasterState']=='RASTER_PASS'
        assert raster[f'{fixture}PdfSha256']==hash_bytes(b)==raster['rasterReceipt'][f'boundTo{fixture.title()}Sha256']
        report={'fixture':fixture,'sha256':hash_bytes(b),'pageCount':len(pages),'rasterWorkflowRunId':raster['rasterReceipt']['workflowRunId'],'centralRasterRenderedDocuments':raster['coverage']['rastered'],'pageOrder':current['pageManifest'],'writtenWidgets':[],'refusedWidgets':[],'sourceTextComparison':[],'allAddedWordsInsideWrittenWidgets':True}
        for page_number, manifest in enumerate(current['pageManifest'],1):
            assert manifest['packetPage']==page_number
            docid=manifest.get('formNumber',manifest.get('documentId'))
            source=sources[docid]; assert manifest['sourceSha256']==source['sha256']
            sp=source['pages'][manifest['sourcePage']-1]; pp=pages[page_number-1]
            added=[w for w in pp['words'] if not any(same_word(w,s) for s in sp['words'])]
            removed=[w for w in sp['words'] if not any(same_word(w,s) for s in pp['words'])]
            mapdoc=next(m for m in mapping['maps'] if m['documentId']==docid)
            boxes=[]
            for write in mapdoc[fixture+'Writes']:
                name=write.get('acroFieldName') or write['field'].split('.',1)[1]
                field=next(f for f in source['fields'] if f['name']==name)
                for widget in field['widgets']:
                    if widget['page']!=manifest['sourcePage']:continue
                    box=widget_box(widget,pp); boxes.append(box)
                    words=[w for w in added if centered(w,box)]
                    actual=norm(' '.join(w['text'] for w in words)); expected=norm(facts[state][fixture][write['factId']])
                    report['writtenWidgets'].append({'documentId':docid,'field':name,'factId':write['factId'],'packetPage':page_number,'sourceWidgetBoxTopLeft':box,'expected':expected,'actual':actual,'matchesExpected':actual==expected,'wordBboxes':[w['bbox'] for w in words]})
            for refusal in mapdoc[fixture+'Refusals']:
                name=refusal.get('acroFieldName') or refusal['field'].split('.',1)[1]
                field=next(f for f in source['fields'] if f['name']==name)
                for widget in field['widgets']:
                    if widget['page']!=manifest['sourcePage']:continue
                    box=widget_box(widget,pp); words=[w for w in added if centered(w,box)]
                    report['refusedWidgets'].append({'documentId':docid,'field':name,'packetPage':page_number,'addedWords':[w['text'] for w in words],'sourceMaxLength':field['maxLength'],'actualHeldLength':len(facts[state][fixture][refusal['factId']]) if refusal.get('unfittable') else None,'requiredBeforeFiling':refusal.get('requiredBeforeFiling',False),'reason':refusal.get('why',refusal.get('reason'))})
            outside=[w for w in added if not any(centered(w,box) for box in boxes)]
            if outside:report['allAddedWordsInsideWrittenWidgets']=False
            report['sourceTextComparison'].append({'packetPage':page_number,'sourceDocument':docid,'sourcePage':manifest['sourcePage'],'addedWordCount':len(added),'removedSourceWords':removed,'addedWordsOutsideWrittenWidgets':outside})
        report['knownWrittenWidgetMismatches']=[w for w in report['writtenWidgets'] if not w['matchesExpected']]
        report['refusedWidgetsWithAddedText']=[w for w in report['refusedWidgets'] if w['addedWords']]
        if state=='nh':
            header=pages[4]; region=[100,20,578,44]
            report['unmappedWaiverOrderCaption']={'packetPage':5,'sourcePage':2,'printedHeaderWords':[w for w in header['words'] if w['bbox'][1]<75], 'caseNumberExpected':facts[state][fixture]['matter.case_number'],'caseNumberPresent':facts[state][fixture]['matter.case_number'] in ' '.join(w['text'] for w in header['words']), 'hasTextWidgetOnSourcePage2':any(f['type']=='PDFTextField' and any(w['page']==2 for w in f['widgets']) for f in sources['NHJB-2311']['fields'])}
            report['residenceAddressLine']={'packetPage':6,'field':'2.1','heldCity':facts[state][fixture]['participant.city'],'heldState':facts[state][fixture]['participant.state'],'heldZip':facts[state][fixture]['participant.zip'],'actualLine':next(w['actual'] for w in report['writtenWidgets'] if w['documentId']=='NHJB-2328' and w['field']=='2.1')}
        row['fixtures'].append(report)
    for labelset,declared in [('map',mapping['requiredBeforeFiling']),('blankReport',read(directory/'reports/blanks-left-for-the-participant.json')['requiredBeforeFiling'])]:
        missing=[r['disclosureLabel'] for r in declared if norm(r['disclosureLabel']) not in norm(guide)]
        row['disclosures'][labelset]={'count':len(declared),'missing':missing}
    for image in artifacts.get('rasterPages',[]) if state=='nh' else []:
        b=(ROOT/image['file']).read_bytes();assert hash_bytes(b)==image['sha256']
        row['currentImages'].append({'file':image['file'],'sha256':hash_bytes(b),'fixture':image['fixture'],'page':image['page'],'source':'existing current artifact PNG, independently viewed'})
    if state=='nc':
        for fixture in ['canonical','boundary']:
            for p in sorted((OUT/'nc-pages'/fixture).glob('*.png')):row['currentImages'].append({'file':str(p.relative_to(ROOT)),'sha256':hash_bytes(p.read_bytes()),'fixture':fixture,'page':int(p.stem.split('-')[1]),'source':'fresh local pdftoppm 150dpi from the exact current PDF, independently viewed'})
    result['families'].append(row)
(OUT/'measurements.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps([{'itemId':r['itemId'],'sourceCount':len(r['sources']),'disclosures':r['disclosures'],'fixtures':[{'fixture':f['fixture'],'writtenWidgets':len(f['writtenWidgets']),'knownWrittenWidgetMismatches':len(f['knownWrittenWidgetMismatches']),'refusedWidgetsWithAddedText':len(f['refusedWidgetsWithAddedText']),'allAddedWordsInsideWrittenWidgets':f['allAddedWordsInsideWrittenWidgets']} for f in r['fixtures']]} for r in result['families']],indent=2))

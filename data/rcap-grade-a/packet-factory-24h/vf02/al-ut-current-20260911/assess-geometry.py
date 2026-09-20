#!/usr/bin/env python3
"""Bind human observations of ORIGINAL PNGs to PDF operators/source geometry.

No image is generated, edited or rendered. Word bounds corroborate observations;
their bounding-box intersection alone is not claimed to prove pixel occlusion.
"""
import collections,json,pathlib,xml.etree.ElementTree as ET
P=pathlib.Path(__file__).resolve().parent
read=lambda n:json.loads((P/n).read_text())
source=ET.fromstring((P/'ut-source-bbox.stdout').read_text())
NS='{http://www.w3.org/1999/xhtml}'
pages=source.findall('.//'+NS+'page')
rows=read('ut-direct-placement-measurement.json')
confirmed_text={'p1-county','signature-printed-name','q10a-appellate-court','q10b-appellate-case','q10d-appellate-date','q10g1-review-court','q10g2-review-case','q10g4-review-date','q12-court','q12-case','q12-date','q12-appeal-court','q12-appeal-case','q12-appeal-date','q14b1-pending-court','q14b2-pending-case','q14b3-pending-nature'}
observed=[]; candidates=[]
for fixture in rows:
 for write in fixture['writes']:
  rect=write['whiteRect']
  if not rect: continue
  overlaps=[]
  for word in pages[write['page']-1].findall(NS+'word'):
   if not (word.text or '').strip('_'): continue
   x0=float(word.attrib['xMin']);x1=float(word.attrib['xMax']);y0=792-float(word.attrib['yMax']);y1=792-float(word.attrib['yMin'])
   dx=min(x1,rect['x']+rect['width'])-max(x0,rect['x']);dy=min(y1,rect['y']+rect['height'])-max(y0,rect['y'])
   if dx>.1 and dy>.1: overlaps.append({'sourceText':word.text,'sourceWordBoundsPoints':[x0,y0,x1,y1],'intersectionWidthPoints':round(dx,3),'intersectionHeightPoints':round(dy,3)})
  item={'fixture':fixture['fixture'],'field':write['field'],'packetPage':write['page'],'actualWhiteRectangleReadFromPdf':rect,'actualOverlayText':write['actualText'],'sourceWordIntersections':overlaps,'originalPng':'data/rcap-grade-a/packet-factory-24h/raster-runs/34644046027/census-pending-family_UT_path-l-vacatur-human-trafficking-related-expungement/'+fixture['fixture']+f'/page-{write["page"]:03d}.png'}
  if overlaps: candidates.append(item)
  if write['field'] in confirmed_text or write['factId'].startswith('selection.'):
   assert overlaps
   item['humanObservation']='The selected X is displaced over a source bracket; white backing removes source bracket/label ink.' if write['factId'].startswith('selection.') else ('The county rectangle removes the C of County and crowds the preceding District label.' if write['field']=='p1-county' else 'The participant name is drawn over the Printed Name label, below the signature line.' if write['field']=='signature-printed-name' else 'The white-backed value removes part or all of the printed question label instead of occupying its following answer blank.')
   observed.append(item)
by_fixture=dict(collections.Counter(x['fixture'] for x in observed))
assert by_fixture=={'canonical':9,'boundary':27},by_fixture
(P/'ut-geometry-findings.json').write_text(json.dumps({'method':'36 human-confirmed defective field placements across 24 original page PNGs, corroborated by actual PDF white-rectangle operators and independent Poppler source-word bounds. Count is field-by-fixture, not pixels, characters, pages or distinct engineering causes.','confirmedDefectivePlacements':len(observed),'byFixture':by_fixture,'uniqueFieldDefinitions':len(set(x['field'] for x in observed)),'sourceCoordinateSystem':'PDF points, origin bottom-left. Original PNGs are 2448x3168; paper is x=204,y=3,width=2040,height=2640, so paper scale is 10/3 pixels per point.','confirmed':observed,'allBoundingBoxIntersectionCandidates':candidates,'candidateLimit':'Small word-box intersections can be font descent/space bounds rather than visible ink. Only the explicitly enumerated 36 visibly defective placements are in the visual counter; these candidates are retained for the repairer to inspect. Whitened writing rules alone are not counted as missing labels.'},indent=2)+'\n')
print(json.dumps({'confirmedDefectivePlacements':len(observed),'byFixture':by_fixture,'uniqueFieldDefinitions':len(set(x['field'] for x in observed))},indent=2))

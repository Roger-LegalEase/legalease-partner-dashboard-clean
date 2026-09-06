from pathlib import Path
import json,hashlib,re,subprocess,os
os.sched_setaffinity(0,{min(os.sched_getaffinity(0))})
from PIL import Image,ImageChops,ImageDraw
base=Path.cwd();out=Path('/tmp/codex-fix83-20260906');sources=Path('/tmp/codex-captain-20260906/vf04/sources');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();norm=lambda s:re.sub(r'\s+','',s).casefold()
tracks={x['trackId']:x for x in json.loads((base/'data/record-clearing/legal-design-track-registry.json').read_text())['tracks']};sourceBySha={sha(p):p for p in sources.glob('*.pdf')};families=[x['family'] for x in json.loads((out/'build-results.json').read_text()) if x['run']==1];results=[];scale=300/72
assert len(families)==4, 'all four completed builds required before measuring'
# PDF coordinates are bottom-up. Report actual added ink, not the write-box assertion.
def crop(image,box):
 x0,y0,x1,y1=box;return image.crop((round(x0*scale),round((792-y1)*scale),round(x1*scale),round((792-y0)*scale)))
def delta(source,current,box):
 a=crop(source,box).convert('L');b=crop(current,box).convert('L');d=ImageChops.subtract(a,b).point(lambda p:255 if p>50 else 0);bb=d.getbbox()
 if bb:
  bb=[round(box[0]+bb[0]/scale,2),round(box[3]-bb[3]/scale,2),round(box[0]+bb[2]/scale,2),round(box[3]-bb[1]/scale,2)]
 return {'newInkBoundsPdfPoints':bb,'addedDarkPixels':sum(x>0 for x in d.get_flattened_data())}
sourceOrder=Image.open(out/'source-images/1020EX-p1.png');sourceBci=Image.open(out/'source-images/Expungement-Application-p2.png');sourcePet=Image.open(out/'source-images/1000EX-p1.png');sourceOrder2=Image.open(out/'source-images/1020EX-p2.png')
for family in families:
 slug=family.replace('_','-');p=base/'data/rcap-all50/overlays/census-v1/ut'/(slug+'--official-pdf-fill');r=json.loads((p/'reports/actual-writes.json').read_text());m=json.loads((p/'production-field-map.json').read_text());receipt=json.loads((p/'source-receipt.json').read_text());guide=(p/'participant-instructions.md').read_text();row={'familyId':family,'sourceChecks':[],'fixtures':[],'selfHelpStops':[]}
 for doc in receipt['documents']:
  src=sourceBySha[doc['sha256']];assert src.stat().st_size==doc['byteLength'];row['sourceChecks'].append({'formNumber':doc['formNumber'],'sha256':sha(src),'bytes':src.stat().st_size,'exact':True})
 for a in r['artifacts']:
  fixture=a['fixture'];pdf=p/'fixtures'/f'{fixture}.pdf';pages=subprocess.run(['pdftotext','-layout',str(pdf),'-'],capture_output=True,text=True,check=True).stdout.split('\f');assert len(pages)==20
  writes=[{'page':w['packetPage'],'fieldId':w['fieldId'],'value':w['textReadFromOutputBytes'],'present':norm(w['textReadFromOutputBytes']) in norm(pages[w['packetPage']-1])} for w in a['actualWrites']];assert all(w['present'] for w in writes)
  assert a['nonWhitespaceGlyphsOutsideMeasuredWriteBoxes']==0 and not a['refusedFieldsWithInk']
  image=Image.open(out/'images'/slug/f'{fixture}-p08.png');name=delta(sourceOrder,image,(70,400,321,432));border=delta(sourceOrder,image,(65,364,324,387));assert name['addedDarkPixels']>0 and name['newInkBoundsPdfPoints'][1]>411.84 and border['addedDarkPixels']==0
  petitionImage=Image.open(out/'images'/slug/f'{fixture}-p06.png');petitionName=delta(sourcePet,petitionImage,(70,347,321,374));assert petitionName['addedDarkPixels']>0 and petitionName['newInkBoundsPdfPoints'][1]>352.8
  county=[]
  for form,src,img,box,inkTop in [('1000EX',sourcePet,petitionImage,(309,451,417,475),456.72),('1020EX',sourceOrder,image,(309,510,417,534),515.52)]:
   d=delta(src,img,box);assert d['addedDarkPixels']>0 and d['newInkBoundsPdfPoints'][1]>inkTop;county.append({'form':form,'sourceUnderlineInkTop':inkTop,'measurement':d})
  f={'fixture':fixture,'pdfSha256':sha(pdf),'bytes':pdf.stat().st_size,'pageCount':19,'textReadbacks':writes,'addedGlyphsOutsideWriteBoxes':0,'refusedFieldsWithInk':[],'orderNameGeometry':name,'petitionNameGeometry':petitionName,'countyGeometry':county,'oldCaptionBorderNewInk':border}
  if 'with_prejudice' in family:
   img=Image.open(out/'images'/slug/f'{fixture}-p02.png');nameBci=delta(sourceBci,img,(49,396,192,415));preprintedI=delta(sourceBci,img,(48,396,54,413));assert nameBci['newInkBoundsPdfPoints'][0]>=55.4 and preprintedI['addedDarkPixels']==0;f['bciNameGeometry']=nameBci;f['preprintedIUnchanged']=preprintedI
  if 'without_prejudice' in family:
   controls=[]
   for form,packetPage,source in [('1000EX',6,sourcePet),('1020EX',8,sourceOrder),('1020EX',9,sourceOrder2)]:
    mp=next(x for x in m['maps'] if x['formNumber']==form);img=Image.open(out/'images'/slug/f'{fixture}-p{packetPage:02d}.png')
    for c in mp['selectionControls']:
     if c.get('approvedBlankDisposition')=='PARTICIPANT_ELECTION_GENUINE' and c['page']==1 and packetPage in [6,8] or c.get('kind')=='court_finding_requires_prosecutor_evidence' and packetPage==9:
      box=c['measured'];d=delta(source,img,(box['x0']-1,box['y0']-1,box['x1']+1,box['y1']+1));assert d['addedDarkPixels']==0;controls.append({'form':form,'page':packetPage,'selectionId':c['selectionId'],'disposition':c['approvedBlankDisposition'],'measurement':d})
   assert len(controls)==5;f['unsupportedControlsRemainSourceBlank']=controls
  row['fixtures'].append(f)
 track=tracks[family.removesuffix('-set')];row['selfHelpStops']=[{'condition':s,'present':norm(s) in norm(guide)} for s in track['selfHelpStopConditions']];assert all(s['present'] for s in row['selfHelpStops'])
 if 'dismissed' in family:assert 'At least 30 days must have passed since the arrest before you file this petition.' in guide
 if 'without_prejudice' in family:assert 'Paragraph 5 of the proposed order (1020EX) is left unmarked.' in guide and 'The District/Justice election on the petition and the order is left blank for you to mark.' in guide
 row['guideSha256']=sha(p/'participant-instructions.md');results.append(row)
(out/'measurements.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps({'families':len(results),'sources':sum(len(r['sourceChecks']) for r in results),'writeReadbacks':sum(len(f['textReadbacks']) for r in results for f in r['fixtures']),'selfHelpStops':sum(len(r['selfHelpStops']) for r in results),'correctOrderNames':8,'petitionNameClearance':8,'countyClearance':16,'bciDeclarationClearance':2,'unmarkedUnsupportedControls':10}))
# Rendered image crops retain source resolution; contact sheets aid actual visual inspection.
target=out/'inspection';target.mkdir(exist_ok=True)
def sheet(name,tiles,cols=2):
 widths=[im.width for _,im in tiles];heights=[im.height for _,im in tiles];w=max(widths);h=max(heights)+34;canvas=Image.new('RGB',(w*cols,h*((len(tiles)+cols-1)//cols)),'white');draw=ImageDraw.Draw(canvas)
 for i,(label,im) in enumerate(tiles):x=(i%cols)*w;y=(i//cols)*h;draw.text((x+5,y+5),label,fill='black');canvas.paste(im,(x,y+30))
 canvas.save(target/name)
for r in results:
 slug=r['familyId'].replace('_','-')
 for source,page,box,kind in [(sourceOrder,8,(62,355,535,460),'order-name'),(sourcePet,6,(62,324,535,387),'petition-name'),(sourcePet,6,(300,450,470,477),'petition-county'),(sourceOrder,8,(300,509,470,536),'order-county')]:
  tiles=[('SOURCE '+kind,crop(source,box))]
  for f in r['fixtures']:tiles.append((slug+' '+f['fixture'],crop(Image.open(out/'images'/slug/f"{f['fixture']}-p{page:02d}.png"),box)))
  sheet(slug+'-'+kind+'.png',tiles,1)
tiles=[('SOURCE BCI declaration',crop(sourceBci,(44,385,330,420)))]
for fixture in ['canonical','boundary']:tiles.append((fixture,crop(Image.open(out/'images/ut-pet-dismissed-with-prejudice-set'/f'{fixture}-p02.png'),(44,385,330,420))))
sheet('bci-declaration-source-current.png',tiles,1)
for source,page,box,name in [(sourcePet,6,(200,471,397,504),'court-petition'),(sourceOrder,8,(200,531,396,563),'court-order'),(sourceOrder2,9,(108,590,536,674),'prosecutor-consent')]:
 tiles=[('SOURCE',crop(source,box))]
 for fixture in ['canonical','boundary']:tiles.append((fixture,crop(Image.open(out/'images/ut-pet-dismissed-without-prejudice-set'/f'{fixture}-p{page:02d}.png'),box)))
 sheet(name+'-source-current.png',tiles,1)
# Every changed full page included; no hash-only declaration of visual acceptance.
renders=[r for r in json.loads((out/'raster-results.json').read_text()) if 'fixture' in r]
for chunk in range(0,len(renders),4):
 tiles=[]
 for r in renders[chunk:chunk+4]:
  im=Image.open(r['path']);im.thumbnail((850,1100));tiles.append((r['family']+' '+r['fixture']+' p'+str(r['packetPage']),im))
 sheet(f'changed-full-pages-{chunk//4+1}.png',tiles)

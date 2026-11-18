import subprocess,json
from pathlib import Path
from PIL import Image,ImageDraw
p=Path(__file__).parent.parent
names=['A_entry_start','B_state_selection','C_plain_english_question','D_guided_question','E_supported_path','F_stop_boundary']
metrics=[]
for n in names:
 f=p/(n+'.mp4');probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=width,height,r_frame_rate,pix_fmt,codec_name:format=duration','-of','json',str(f)]));metrics.append(dict(name=n,**probe))
 d=p/'raw'/('frames-'+n);d.mkdir(exist_ok=True)
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(f),'-vf','fps=2',str(d/'%03d.png')],check=True)
 ims=sorted(d.glob('*.png'));cols=7;sheet=Image.new('RGB',(cols*195,450*((len(ims)+cols-1)//cols)),'white');draw=ImageDraw.Draw(sheet)
 for i,im in enumerate(ims):
  x=Image.open(im);x.thumbnail((195,422));left=(i%cols)*195;top=(i//cols)*450;sheet.paste(x,(left,top+28));draw.text((left+5,top+5),f'{i/2:.1f}s',fill='black')
 sheet.save(p/'raw'/('timeline-'+n+'.png'))
json.dump(metrics,open(p/'raw/video-metrics.json','w'),indent=2)
sheet=Image.new('RGB',(390*3,884*2),'#eeeeee');draw=ImageDraw.Draw(sheet)
for i,n in enumerate(names):
 im=Image.open(p/(n+'.png'));assert im.size==(780,1688);im.thumbnail((390,844));left=i%3*390;top=i//3*884;sheet.paste(im,(left,top+40));draw.text((left+10,top+12),n,fill='black')
sheet.save(p/'contact-sheet.png')
print(json.dumps(metrics,indent=2))

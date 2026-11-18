import subprocess,json
from pathlib import Path
from PIL import Image,ImageDraw
p=Path(__file__).parent.parent
logs=json.load(open(p/'raw/initial-capture-log.json'))[:1]+json.load(open(p/'raw/retake-capture-log.json'))
for m in logs:
 n=m['name'];subprocess.run(['ffmpeg','-y','-v','error','-ss',str(m['start']+.2),'-i',m['video'],'-t',str(min(7,m['end']-m['start']-.2)),'-vf','crop=390:844:0:0,scale=780:1688:flags=lanczos,fps=30','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-an','-movflags','+faststart',str(p/(n+'.mp4'))],check=True)
json.dump(logs,open(p/'raw/final-log-base.json','w'),indent=2)

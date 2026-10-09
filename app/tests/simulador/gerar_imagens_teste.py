# Gera as imagens usadas por t_logo.py em /tmp/fb/img (requer Pillow: pip install pillow)
import os,shutil
from PIL import Image,ImageDraw,ImageFont
os.makedirs('/tmp/fb/img',exist_ok=True);os.chdir('/tmp/fb/img')
im=Image.new('RGBA',(1200,400),(0,0,0,0));d=ImageDraw.Draw(im)
d.rounded_rectangle((20,20,380,380),40,fill=(11,54,84,255));d.polygon([(100,300),(200,100),(300,300)],fill=(243,167,18,255))
try:f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',120)
except Exception:f=ImageFont.load_default()
d.text((430,130),'EXEMPLO',fill=(11,54,84,255),font=f);im.save('logo_wide.png')
Image.new('RGB',(800,300),(30,120,160)).save('logo.jpg',quality=90)
open('logo.svg','w').write('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><rect width="100" height="40" fill="red"/><script>alert(1)</script></svg>')
Image.new('P',(50,50)).save('anim.gif');Image.new('RGB',(9000,9000),(255,255,255)).save('gigante.png',optimize=True)
open('corrompido.png','w').write('isto nao e uma imagem de verdade, so texto com extensao png');shutil.copy('logo.jpg','jpeg_com_nome_png.png')

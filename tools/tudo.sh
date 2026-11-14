#!/bin/bash
# Regera todas as entregas na ordem certa de dependência.
set -e; cd "$(dirname "$0")/.."; A=/tmp/claude-0/-home-user-lucas-/0d3f7e90-dd37-558c-a2ec-9141744b3677/scratchpad/arte
rm -f entregas/02-posters/*.jpg entregas/03-instagram/*.jpg
node tools/render.mjs src/posters.html --saida entregas/02-posters --escala 3 --jpg 92 --alta | grep -c "✓"
node tools/render.mjs src/instagram.html --saida entregas/03-instagram --escala 2 --jpg 92 --alta | grep -c "✓"
node tools/render.mjs src/mockups-arte.html --saida $A --escala 2 --alta | grep -c "✓"
python3 tools/mockup.py | grep -c "✓"
rm -f /tmp/claude-0/-home-user-lucas-/0d3f7e90-dd37-558c-a2ec-9141744b3677/scratchpad/quadros-*/q*.jpg
node tools/motion.mjs | tail -1; node tools/motion.mjs --v | tail -1
cd entregas/05-motion && rm -f quadros/*.jpg fibra-motion-loop.gif
ffmpeg -y -loglevel error -ss 1.0 -t 5 -i fibra-motion-16x9-1920x1080.mp4 -vf "fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" fibra-motion-loop.gif
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 fibra-motion-16x9-1920x1080.mp4)
for k in 0.06 0.14 0.22 0.30 0.42 0.56 0.70 0.80 0.95; do t=$(python3 -c "print(round($D*$k,2))"); ffmpeg -y -loglevel error -ss $t -i fibra-motion-16x9-1920x1080.mp4 -frames:v 1 -q:v 2 quadros/q$(python3 -c "print(int($k*100))").jpg; done
cd ../..
rm -f entregas/06-apresentacao/*; node tools/render.mjs src/pranchas.html --saida entregas/06-apresentacao --escala 2 --jpg 90 --alta | grep -c "✓"
python3 -c "
import glob
from PIL import Image
fs=sorted(glob.glob('entregas/06-apresentacao/fibra-*.jpg')); ims=[Image.open(f).convert('RGB').resize((2560,1440),Image.LANCZOS) for f in fs]
ims[0].save('entregas/06-apresentacao/FIBRA-brandbook.pdf',save_all=True,append_images=ims[1:],resolution=144,quality=88); print(len(ims),'páginas')"
rm -f entregas/07-portfolio/*; node tools/render.mjs src/portfolio.html --saida entregas/07-portfolio --escala 2 --jpg 92 --alta | grep -c "✓"
echo FIM

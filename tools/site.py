#!/usr/bin/env python3
"""Gera a página da marca (site/index.html + site/img) a partir das entregas."""
import os, glob, json, subprocess
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = f'{R}/site'; I = f'{S}/img'
os.makedirs(I, exist_ok=True)   # site/img também alimenta o brandbook: não apagar

def red(src, nome, lado, q=84):
    im = Image.open(src).convert('RGB'); s = lado / max(im.size)
    if s < 1: im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    im.save(f'{I}/{nome}', quality=q, optimize=True, progressive=True); return nome

E = f'{R}/entregas'
red(f'{E}/08-behance/shot-2-retrato.jpg', 'retrato.jpg', 1600)
red(f'{E}/08-behance/shot-1-dado.jpg', 'dado.jpg', 1600)
cart = [red(f, os.path.basename(f), 900) for f in sorted(glob.glob(f'{E}/02-cartazes/*.jpg'))]
ig = [red(f'{E}/03-instagram/{n}.jpg', f'{n}.jpg', 720) for n in ['ig-01-chegou', 'ig-02-mosaico-feira', 'ig-03-manifesto', 'ig-04-dado', 'ig-05-quem-planta', 'ig-06-arroz-feijao', 'ig-07-mosaico-planos', 'ig-08-campo-mesa', 'ig-09-sem-letra-miuda']]
mk = [red(f, os.path.basename(f).replace('fibra-mockup-', 'mockup-'), 1800) for f in sorted(glob.glob(f'{E}/05-mockups/*.jpg'))]
emb = [red(f'{E}/04-embalagens/{n}.jpg', f'{n}.jpg', 900) for n in ['pacote-arroz', 'pacote-feijao-carioca', 'pacote-feijao-preto']] + [red(f'{E}/04-embalagens/caixa-faca.jpg', 'caixa-faca.jpg', 2000)]
filme = f'{E}/06-motion/fibra-filme-16x9-1920x1080.mp4'
if os.path.exists(filme):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', filme, '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', f'{I}/filme.mp4'], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '41.5', '-i', filme, '-frames:v', '1', '-vf', 'scale=1280:-2', f'{I}/filme-capa.jpg'], check=True)

logo = open(f'{R}/marca/logo/fibra-logo-feijao.svg').read().replace('fill="#2A1611"', 'fill="currentColor"')
pilha = open(f'{R}/marca/logo/fibra-empilhado-feijao.svg').read().replace('fill="#2A1611"', 'fill="currentColor"')
sim = open(f'{R}/marca/logo/fibra-simbolo-feijao.svg').read().replace('fill="#2A1611"', 'fill="currentColor"')
html = open(f'{R}/tools/site.html').read()
html = html.replace('{{LOGO}}', logo).replace('{{PILHA}}', pilha).replace('{{SIMBOLO}}', sim)
html = html.replace('{{CARTAZES}}', ''.join(f'<img src="img/{c}" alt="Cartaz {i + 1}" loading="lazy">' for i, c in enumerate(cart)))
html = html.replace('{{IG}}', ''.join(f'<img src="img/{c}" alt="Post {i + 1} da grade de lançamento" loading="lazy">' for i, c in enumerate(ig)))
html = html.replace('{{MOCKUPS}}', ''.join(f'<figure><img src="img/{m}" alt="" loading="lazy"><figcaption>{m[7:-4].replace("-", " ").capitalize()}</figcaption></figure>' for m in mk))
html = html.replace('{{PACOTES}}', ''.join(f'<img src="img/{p}" alt="" loading="lazy">' for p in emb[:3]))
open(f'{S}/index.html', 'w').write(html)
tot = sum(os.path.getsize(f) for f in glob.glob(f'{I}/*'))
print('site:', len(os.listdir(I)), 'arquivos,', round(tot / 1e6, 1), 'MB')

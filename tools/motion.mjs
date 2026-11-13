#!/usr/bin/env node
// Renderiza o motion quadro a quadro (determinístico) e codifica em H.264.
// uso: node tools/motion.mjs [--v] [--de 0] [--ate 600] [--prova]   (--prova: só alguns quadros, em tira)
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const args = process.argv.slice(2), V = args.includes('--v'), W = V ? 1080 : 1920, H = V ? 1920 : 1080; const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), nome = V ? 'fibra-motion-vertical-1080x1920' : 'fibra-motion-16x9-1920x1080';
const dir = '/tmp/claude-0/-home-user-lucas-/0d3f7e90-dd37-558c-a2ec-9141744b3677/scratchpad/quadros-' + (V ? 'v' : 'h'); fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('[erro]', e.message));
await page.goto('file://' + raiz + '/src/motion.html' + (V ? '?v' : '')); const total = await page.evaluate(() => window.prepara());
if (args.includes('--prova')) {
  const fs_ = (opt('quadros', '20,50,75,110,170,230,250,290,350,400,425,470,520,590')).split(',').map(Number), arqs = [];
  for (const f of fs_) { await page.evaluate(f => window.quadro(f), f); const a = `${dir}/prova-${String(f).padStart(4, '0')}.jpg`; await page.screenshot({ path: a, type: 'jpeg', quality: 80 }); arqs.push(a); }
  await b.close();
  execFileSync('python3', ['-c', `
import sys
from PIL import Image
fs=sys.argv[2:]; s=float(sys.argv[1]); ims=[Image.open(f) for f in fs]; ims=[i.resize((int(i.width*s),int(i.height*s))) for i in ims]; cols=${V ? 7 : 4}
rows=[ims[i:i+cols] for i in range(0,len(ims),cols)]; W=max(sum(i.width for i in r)+8*(len(r)-1) for r in rows); H=sum(r[0].height for r in rows)+8*(len(rows)-1)
o=Image.new('RGB',(W,H),(20,20,20)); y=0
for r in rows:
    x=0
    for i in r: o.paste(i,(x,y)); x+=i.width+8
    y+=r[0].height+8
o.save('/tmp/claude-0/-home-user-lucas-/0d3f7e90-dd37-558c-a2ec-9141744b3677/scratchpad/prova/motion-${V ? 'v' : 'h'}.jpg',quality=84); print(o.size)`, V ? '.26' : '.26', ...arqs], { stdio: 'inherit' });
  process.exit(0);
}
const de = parseInt(opt('de', '0')), ate = parseInt(opt('ate', String(total))); const t0 = Date.now();
for (let f = de; f < ate; f++) { await page.evaluate(f => window.quadro(f), f); await page.screenshot({ path: `${dir}/q${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 95 }); if (f % 100 === 0) console.log('quadro', f, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
await b.close();
const out = `${raiz}/entregas/05-motion`; fs.mkdirSync(out, { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', `${dir}/q%04d.jpg`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${out}/${nome}.mp4`], { stdio: 'inherit' });
console.log('✓', `${out}/${nome}.mp4`, ((Date.now() - t0) / 1000).toFixed(0) + 's');

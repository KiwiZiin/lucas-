#!/usr/bin/env node
// FIBRA v6 — renderiza o filme manifesto quadro a quadro e codifica em H.264 com a trilha.
// A linha do tempo é medida em compassos da música (141,95 BPM a partir de 1:56,255); nada é esticado.
// Renderiza a 60 q/s e funde pares de quadros (desfoque de movimento leve), saída a 30 q/s.
// uso: node tools/motion.mjs [--v] [--prova] [--quadros 0.5,1.1,...(compassos)]
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const args = process.argv.slice(2), V = args.includes('--v'), W = V ? 1080 : 1920, H = V ? 1920 : 1080;
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), nome = V ? 'fibra-filme-9x16-1080x1920' : 'fibra-filme-16x9-1920x1080';
const tmp = '/tmp/claude-0/-home-user-lucas-/0d3f7e90-dd37-558c-a2ec-9141744b3677/scratchpad', dir = `${tmp}/quadros-${V ? 'v' : 'h'}`;
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const COMP = 240 / 141.95, AUD = '/root/.claude/uploads/0d3f7e90-dd37-558c-a2ec-9141744b3677/286b67ac-Rio_Soundtrack-_01_Real_In_Rio.m4a';
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('[erro]', e.message)); page.on('console', m => m.type() === 'error' && console.log('[console]', m.text()));
await page.goto('file://' + raiz + '/src/motion.html' + (V ? '?v' : '')); const n30 = await page.evaluate(() => window.prepara());
const palco = await page.$('#palco');
if (args.includes('--prova')) {
  const cs = opt('quadros', '0.5,1.2,3.9,4.6,5.4,6.6,7.9,8.8,10.3,11.6,12.8,13.8,14.9,16.5,18.5,21,23,24.6,25.8').split(',').map(Number), arqs = [];
  for (const c of cs) { await page.evaluate(t => window.quadro(t), c * COMP); const a = `${dir}/p-${c}.jpg`; await palco.screenshot({ path: a, type: 'jpeg', quality: 82 }); arqs.push(a); }
  await b.close();
  execFileSync('python3', ['-c', `
import sys
from PIL import Image, ImageDraw
fs=sys.argv[1:]; ims=[Image.open(f) for f in fs]; s=${V ? .2 : .2}; ims=[i.resize((int(i.width*s),int(i.height*s))) for i in ims]; cols=${V ? 10 : 5}
w,h=ims[0].size; o=Image.new('RGB',(cols*(w+6),((len(ims)+cols-1)//cols)*(h+20)),(20,20,20)); d=ImageDraw.Draw(o)
for k,(i,f) in enumerate(zip(ims,fs)): x=(k%cols)*(w+6); y=(k//cols)*(h+20); o.paste(i,(x,y)); d.text((x+2,y+h+3),'c '+f.split('-')[-1][:-4],fill=(230,230,230))
o.save('${tmp}/prova/filme-${V ? 'v' : 'h'}.jpg',quality=84); print(o.size)`, ...arqs], { stdio: 'inherit' });
  process.exit(0);
}
const N = n30 * 2, t0 = Date.now();   // 60 q/s
for (let f = 0; f < N; f++) {
  await page.evaluate(t => window.quadro(t), f / 60);
  await palco.screenshot({ path: `${dir}/q${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 94 });
  if (f % 300 === 0) console.log('quadro', f, '/', N, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
await b.close();
const out = `${raiz}/entregas/06-motion`; fs.mkdirSync(out, { recursive: true }); const DUR = (n30 / 30).toFixed(3);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', `${dir}/q%05d.jpg`, '-ss', '116.255', '-t', DUR, '-i', AUD,
  '-vf', "tmix=frames=2:weights='1 1',fps=30,format=yuv420p",
  '-af', `afade=t=in:d=0.2,afade=t=out:st=${(DUR - 2.2).toFixed(2)}:d=2.2,acompressor=threshold=-18dB:ratio=2.5:attack=8:release=180,loudnorm=I=-14:TP=-1:LRA=9`,
  '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-movflags', '+faststart', `${out}/${nome}.mp4`], { stdio: 'inherit' });
console.log('✓', `${out}/${nome}.mp4`, ((Date.now() - t0) / 1000).toFixed(0) + 's');

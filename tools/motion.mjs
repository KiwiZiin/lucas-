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
// sincronia com a música (142 BPM a partir de 1:56,255): cada cena começa num compasso. Pares [quadro da linha do tempo, compasso]
const BPM = 141.95, COMP = 4 * 60 / BPM, CHAVES = [[0, 0], [60, 2], [210, 6], [270, 8], [330, 10], [390, 12], [450, 13], [600, 16]];
const warp = t => { const c = t / COMP; for (let k = 1; k < CHAVES.length; k++) { const [f0, c0] = CHAVES[k - 1], [f1, c1] = CHAVES[k]; if (c <= c1) return f0 + (f1 - f0) * (c - c0) / (c1 - c0); } return 600; };
const NQ = Math.ceil((16 * COMP + 1.2) * 30);
// pulso do bumbo: força de ataque em graves (< 180 Hz), por quadro de vídeo, com decaimento rápido
const PULSO = JSON.parse(execFileSync('python3', ['-c', `
import subprocess, numpy as np, json, sys
sr = 22050; x = np.frombuffer(subprocess.run(['ffmpeg','-loglevel','error','-ss','116.255','-t',sys.argv[2],'-i',sys.argv[1],'-ac','1','-ar',str(sr),'-f','f32le','-'],capture_output=True).stdout, np.float32)
hop = 147; fr = np.lib.stride_tricks.sliding_window_view(x, 2048)[::hop] * np.hanning(2048)
S = np.abs(np.fft.rfft(fr, axis=1)); lo = np.log1p(S[:, 1:18].sum(1)); fl = np.maximum(np.diff(lo, prepend=lo[0]), 0)
n = int(float(sys.argv[2]) * 30); v = np.array([fl[int(i * sr / 30 / hop):int((i + 1) * sr / 30 / hop) + 1].max(initial=0) for i in range(n)])
v = np.clip(v / np.percentile(v[v > 0], 92), 0, 1); v[v < .35] = 0; o = []; e = 0
for a in v: e = max(a, e * .72); o.append(round(float(e), 3))
print(json.dumps(o))`, '/root/.claude/uploads/0d3f7e90-dd37-558c-a2ec-9141744b3677/286b67ac-Rio_Soundtrack-_01_Real_In_Rio.m4a', String(NQ / 30)]).toString());
// só três toques, nas viradas principais (compassos 2, 6 e 13), e só se o bumbo bater ali
const TOQUES = [2, 6, 13].map(c => Math.round(c * COMP * 30)), P2 = PULSO.map(() => 0);
TOQUES.forEach(q => { const k0 = q + PULSO.slice(q, q + 3).indexOf(Math.max(...PULSO.slice(q, q + 3))); for (let i = 0; i < 10 && k0 + i < P2.length; i++) P2[k0 + i] = Math.pow(.7, i); });
await page.evaluate(p => { window.PULSO = p; }, P2); console.log('pulsos fortes:', PULSO.filter(x => x > .9).length);
const de = parseInt(opt('de', '0')), ate = parseInt(opt('ate', String(NQ))); const t0 = Date.now();
for (let f = de; f < ate; f++) { await page.evaluate(([a, b]) => window.quadro(a, b), [Math.min(599.9, warp(f / 30)), f]); await page.screenshot({ path: `${dir}/q${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 95 }); if (f % 100 === 0) console.log('quadro', f, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
await b.close();
const out = `${raiz}/entregas/05-motion`; fs.mkdirSync(out, { recursive: true });
const AUD = '/root/.claude/uploads/0d3f7e90-dd37-558c-a2ec-9141744b3677/286b67ac-Rio_Soundtrack-_01_Real_In_Rio.m4a', DUR = (NQ / 30).toFixed(3);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', `${dir}/q%04d.jpg`, '-ss', '116.255', '-t', DUR, '-i', AUD,
  '-af', `afade=t=in:d=0.25,afade=t=out:st=${(DUR - 2.2).toFixed(2)}:d=2.2,acompressor=threshold=-18dB:ratio=2.5:attack=8:release=180,loudnorm=I=-14:TP=-1:LRA=9`, '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${out}/${nome}.mp4`], { stdio: 'inherit' });
console.log('✓', `${out}/${nome}.mp4`, ((Date.now() - t0) / 1000).toFixed(0) + 's');

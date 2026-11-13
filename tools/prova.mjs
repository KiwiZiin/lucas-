#!/usr/bin/env node
// Prova rápida: renderiza as pranchas de um HTML em baixa resolução, com a grade visível, e monta uma tira.
// uso: node tools/prova.mjs src/posters.html [--so a,b] [--escala .5] [--sem-grade] [--cols 4]
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const args = process.argv.slice(2), html = path.resolve(args[0]); const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] ?? true) : null; };
const escala = parseFloat(opt('escala') || '.5'), so = opt('so') ? opt('so').split(',') : null, cols = parseInt(opt('cols') || '4');
const dir = '/tmp/claude-0/-home-user-lucas-/0d3f7e90-dd37-558c-a2ec-9141744b3677/scratchpad/prova'; fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); const page = await b.newPage({ viewport: { width: 2000, height: 1200 }, deviceScaleFactor: escala });
page.on('pageerror', e => console.log('[erro]', e.message)); page.on('console', m => m.type() === 'error' && console.log('[console]', m.text()));
await page.goto('file://' + html + (args.includes('--sem-grade') ? '' : '?grade')); await page.evaluate(() => window.FIBRA.pronto()); await page.waitForTimeout(250);
const arqs = [];
for (const el of await page.$$('.prancha[data-nome]')) {
  const nome = await el.getAttribute('data-nome'); if (so && !so.some(s => nome.includes(s))) continue;
  const box = await el.boundingBox(); await page.setViewportSize({ width: Math.ceil(box.width) + 80, height: Math.ceil(box.height) + 80 }); await el.scrollIntoViewIfNeeded();
  const a = path.join(dir, nome + '.jpg'); await el.screenshot({ path: a, type: 'jpeg', quality: 86 }); arqs.push(a);
}
await b.close();
const tira = path.join(dir, (opt('nome') || path.basename(html, '.html')) + '-tira.jpg');
execFileSync('python3', ['-c', `
import sys
from PIL import Image
fs = sys.argv[3:]; cols = int(sys.argv[2]); ims = [Image.open(f) for f in fs]; g = 16
rows = [ims[i:i+cols] for i in range(0, len(ims), cols)]
W = max(sum(i.width for i in r) + g*(len(r)-1) for r in rows); H = sum(max(i.height for i in r) for r in rows) + g*(len(rows)-1)
s = Image.new('RGB', (W, H), (24,24,24)); y = 0
for r in rows:
    x = 0
    for i in r: s.paste(i, (x, y)); x += i.width + g
    y += max(i.height for i in r) + g
s.save(sys.argv[1], quality=86); print(sys.argv[1], s.size)`, tira, String(cols), ...arqs], { stdio: 'inherit' });

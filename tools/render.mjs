#!/usr/bin/env node
// Renderiza cada .prancha[data-nome] de um HTML em PNG/JPG de alta resolução.
// uso: node tools/render.mjs src/posters.html --saida entregas/02-posters --escala 3 [--jpg 92] [--so nome1,nome2]
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const args = process.argv.slice(2); const html = path.resolve(args[0]);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const saida = path.resolve(opt('saida') || 'saida'), escala = parseFloat(opt('escala') || '2'), jpg = opt('jpg'), so = opt('so') ? opt('so').split(',') : null;
fs.mkdirSync(saida, { recursive: true });
const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const page = await b.newPage({ viewport: { width: 2000, height: 1200 }, deviceScaleFactor: escala });
page.on('console', m => { if (m.type() === 'error') console.log('  [console]', m.text()); });
page.on('pageerror', e => console.log('  [erro]', e.message));
await page.goto('file://' + html + (args.includes('--alta') ? '?alta' : '')); await page.evaluate(() => window.FIBRA ? window.FIBRA.pronto() : document.fonts.ready); await page.waitForTimeout(300);
const pranchas = await page.$$('.prancha[data-nome]');
for (const el of pranchas) {
  const nome = await el.getAttribute('data-nome'); if (so && !so.includes(nome)) continue;
  const box = await el.boundingBox();
  await page.setViewportSize({ width: Math.ceil(box.width) + 80, height: Math.ceil(box.height) + 80 });
  await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(120);
  const arq = path.join(saida, nome + (jpg ? '.jpg' : '.png'));
  await el.screenshot(jpg ? { path: arq, type: 'jpeg', quality: parseInt(jpg) } : { path: arq, type: 'png' });
  console.log('✓', path.relative(process.cwd(), arq), Math.round(box.width * escala) + '×' + Math.round(box.height * escala));
}
await b.close();

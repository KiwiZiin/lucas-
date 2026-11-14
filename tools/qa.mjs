#!/usr/bin/env node
// Verificação automática das peças: rosto coberto, rosto cortado, elemento fora da peça, imagem que não carregou, fonte ausente.
// uso: node tools/qa.mjs src/instagram.html [src/posters.html ...]
import { createRequire } from 'module'; import path from 'path';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); let total = 0;
for (const arq of process.argv.slice(2)) {
  const page = await b.newPage({ viewport: { width: 2400, height: 1600 } });
  const erros = []; page.on('pageerror', e => erros.push('[js] ' + e.message));
  await page.goto('file://' + path.resolve(arq)); await page.evaluate(() => window.FIBRA.pronto());
  const r = await page.evaluate(() => {
    const out = window.FIBRA.qa ? window.FIBRA.qa() : [];
    [...document.images].forEach(i => { if (!i.naturalWidth) out.push('imagem não carregou: ' + i.src.split('/').slice(-2).join('/')); });
    if (!document.fonts.check('900 40px Gabarito')) out.push('Gabarito Black não carregou');
    return out;
  });
  const lista = [...erros, ...r]; total += lista.length;
  console.log(`${path.basename(arq)}: ${lista.length ? lista.length + ' problema(s)' : 'ok'}`); lista.forEach(l => console.log('  · ' + l));
  await page.close();
}
await b.close(); process.exit(total ? 1 : 0);

/* FIBRA — componentes da identidade (logo, letras-janela, grão) para as peças em HTML */
(() => {
  const D = window.FIBRA_DADOS, L = D.letras, CAP = D.cap, F = window.FIBRA_FOTOS || {};
  const base = new URL('..', document.currentScript.src).href;
  const cor = v => (v && D.cores[v]) || v || D.cores.feijao;
  const ALTA = /[?&]alta/.test(location.search), IDS = window.FIBRA_FOTOS_ID || {};   // ?alta usa os originais em resolução máxima
  const fotoUrl = n => (ALTA && IDS[n]) ? base + 'fotos/originais/AdobeStock_' + IDS[n] + '.jpg' : (window.FIBRA_FOTOS_URL || (base + 'fotos/trabalho/')) + n + '.jpg';
  let uid = 0; const espera = [];

  function graoPath(cx, cy, rx = D.grao.rx, ry = D.grao.ry, ang = D.grao.ang) {
    const a = ang * Math.PI / 180, k = 0.5522847498, c = Math.cos(a), s = Math.sin(a);
    const p = [[rx, 0], [rx, k * ry], [k * rx, ry], [0, ry], [-k * rx, ry], [-rx, k * ry], [-rx, 0], [-rx, -k * ry], [-k * rx, -ry], [0, -ry], [k * rx, -ry], [rx, -k * ry], [rx, 0]]
      .map(([x, y]) => (cx + x * c - y * s).toFixed(1) + ' ' + (cy + x * s + y * c).toFixed(1));
    return `M${p[0]}C${p[1]} ${p[2]} ${p[3]}C${p[4]} ${p[5]} ${p[6]}C${p[7]} ${p[8]} ${p[9]}C${p[10]} ${p[11]} ${p[12]}Z`;
  }
  const letraD = (l, graos = true) => L[l].d + (graos ? L[l].graos.map(([x, y]) => ' ' + graoPath(x, y)).join('') : '');
  const graosD = l => L[l].graos.map(([x, y]) => graoPath(x, y)).join(' ');

  // disposição: lista de {l, x, y} + largura/altura
  function disposicao(versao, S = D) {   // S: conjunto de glifos (D = expandido, D.alta = largura normal)
    const L = S.letras;
    if (versao === 'empilhado') return { w: S.pilha.w, h: S.pilha.h, itens: S.pilha.linhas.flatMap(ln => ln.itens.map(i => ({ l: i.l, x: i.x, y: ln.y }))) };
    if (versao && versao.length <= 5 && /^[FIBRA]+$/.test(versao) && versao !== 'FIBRA') {
      // palavra parcial ou letra isolada, com o mesmo espaçamento do logotipo
      const idx = 'FIBRA'.indexOf(versao); const src = idx >= 0 ? S.logo.itens.slice(idx, idx + versao.length) : [...versao].map(l => ({ l, x: 0 }));
      const x0 = src[0].x, last = src[src.length - 1];
      return { w: last.x - x0 + L[last.l].w, h: CAP, itens: src.map(i => ({ l: i.l, x: i.x - x0, y: 0 })) };
    }
    return { w: S.logo.w, h: CAP, itens: S.logo.itens.map(i => ({ ...i, y: 0 })) };
  }

  class Logo extends HTMLElement {
    connectedCallback() {
      const v = this.getAttribute('versao') || 'horizontal', c = cor(this.getAttribute('cor')), solido = this.hasAttribute('solido');
      if (v === 'simbolo') {
        const g = D.simbolo.grao;
        this.innerHTML = `<svg viewBox="0 0 ${D.simbolo.w} ${CAP}" fill="${c}"><path d="${L.F.d}"/><path d="${graoPath(g[0], g[1], g[2], g[3])}" fill="${cor(this.getAttribute('cor-grao')) || c}"/></svg>`; return;
      }
      const S = this.hasAttribute('alta') ? D.alta : D, d = disposicao(v, S), G = S.letras;
      this.innerHTML = `<svg viewBox="0 0 ${d.w} ${d.h}" fill="${c}">` + d.itens.map(i => `<path transform="translate(${i.x} ${i.y})" fill-rule="evenodd" d="${G[i.l].d + (solido ? '' : G[i.l].graos.map(([x, y]) => ' ' + graoPath(x, y)).join(''))}"/>`).join('') + '</svg>';
    }
  }

  // imagem que cobre a caixa (x,y,w,h) com foco fx/fy (0–1) e zoom
  function cobre(nome, bx, by, bw, bh, fx = .5, fy = .5, zoom = 1) {
    const [iw, ih] = F[nome] || [3, 2]; const a = iw / ih;
    let h = Math.max(bh, bw / a) * zoom, w = h * a;
    const x = bx + (bw - w) * fx, y = by + (bh - h) * fy;
    const u = fotoUrl(nome);
    espera.push(new Promise(r => { const im = new Image(); im.onload = im.onerror = () => (im.decode ? im.decode().catch(() => 0).then(r) : r()); im.src = u; }));
    return `<image href="${u}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" preserveAspectRatio="none"/>`;
  }

  /* <fibra-janela letra="B" foto="cozinha-fogao" fx=".5" fy=".3" zoom="1.1" graos="fuba" fundo="feijao">
     letra: letra única, trecho ("BRA"), "FIBRA" ou "empilhado". fotos="a,b,c": uma por letra. unica: uma só foto atravessando todas as letras. */
  class Janela extends HTMLElement {
    connectedCallback() {
      const v = this.getAttribute('letra') || 'FIBRA';
      if (v === 'grao') {   // janela em forma de grão (elipse inclinada), caixa justa na tinta
        const ang = parseFloat(this.getAttribute('ang') ?? D.grao.ang), rx = 1000, ry = rx * D.grao.ry / D.grao.rx, a = ang * Math.PI / 180;
        const hw = Math.hypot(rx * Math.cos(a), ry * Math.sin(a)), hh = Math.hypot(rx * Math.sin(a), ry * Math.cos(a)), id = 'g' + (++uid), f = this.getAttribute('foto');
        this.innerHTML = `<svg viewBox="0 0 ${2 * hw} ${2 * hh}"><defs><clipPath id="${id}"><path d="${graoPath(hw, hh, rx, ry, ang)}"/></clipPath></defs><g clip-path="url(#${id})"><rect width="${2 * hw}" height="${2 * hh}" fill="${cor(this.getAttribute('fundo') || 'feijao')}"/>${f ? cobre(f, 0, 0, 2 * hw, 2 * hh, parseFloat(this.getAttribute('fx') ?? .5), parseFloat(this.getAttribute('fy') ?? .5), parseFloat(this.getAttribute('zoom') ?? 1)) : ''}</g></svg>`; return;
      }
      const S = this.hasAttribute('alta') ? D.alta : D, L = S.letras, d = disposicao(v === 'FIBRA' ? 'horizontal' : v, S);
      const lista = a => (this.getAttribute(a) || '').split(',').map(s => s.trim()).filter(Boolean);
      const fotos = lista('fotos').length ? lista('fotos') : lista('foto'), fx = lista('fx'), fy = lista('fy'), zm = lista('zoom');
      const num = (arr, i, def) => { const v = arr[Math.min(i, arr.length - 1)]; return v === undefined ? def : parseFloat(v); };
      const unica = this.hasAttribute('unica') || (fotos.length === 1 && d.itens.length > 1 && !this.hasAttribute('repetir'));
      const graos = this.getAttribute('graos'), fundo = cor(this.getAttribute('fundo') || 'feijao'), id = 'j' + (++uid);
      let defs = '', corpo = '';
      if (unica) {
        defs = `<clipPath id="${id}">` + d.itens.map(i => `<path transform="translate(${i.x} ${i.y})" d="${L[i.l].d}"/>`).join('') + '</clipPath>';
        corpo = `<g clip-path="url(#${id})"><rect width="${d.w}" height="${d.h}" fill="${fundo}"/>` + (fotos[0] ? cobre(fotos[0], 0, 0, d.w, d.h, num(fx, 0, .5), num(fy, 0, .5), num(zm, 0, 1)) : '') + '</g>';
      } else d.itens.forEach((i, n) => {
        const f = fotos[Math.min(n, fotos.length - 1)], w = L[i.l].w;
        defs += `<clipPath id="${id}_${n}"><path transform="translate(${i.x} ${i.y})" d="${L[i.l].d}"/></clipPath>`;
        corpo += `<g clip-path="url(#${id}_${n})"><rect x="${i.x}" y="${i.y}" width="${w}" height="${CAP}" fill="${fundo}"/>` + (f ? cobre(f, i.x, i.y, w, CAP, num(fx, n, .5), num(fy, n, .5), num(zm, n, 1)) : '') + '</g>';
      });
      if (graos) corpo += d.itens.map(i => L[i.l].graos.length ? `<path transform="translate(${i.x} ${i.y})" fill="${cor(graos)}" d="${L[i.l].graos.map(([x, y]) => graoPath(x, y)).join(' ')}"/>` : '').join('');
      this.innerHTML = `<svg viewBox="0 0 ${d.w} ${d.h}"><defs>${defs}</defs>${corpo}</svg>`;
    }
  }

  class Grao extends HTMLElement {
    connectedCallback() {   // caixa justa na tinta: o grão encosta exatamente nas bordas do elemento
      const ang = parseFloat(this.getAttribute('ang') ?? D.grao.ang), rx = 100, ry = rx * D.grao.ry / D.grao.rx, a = ang * Math.PI / 180;
      const hw = Math.hypot(rx * Math.cos(a), ry * Math.sin(a)), hh = Math.hypot(rx * Math.sin(a), ry * Math.cos(a));
      this.innerHTML = `<svg viewBox="${-hw} ${-hh} ${2 * hw} ${2 * hh}" fill="${cor(this.getAttribute('cor'))}"><path d="${graoPath(0, 0, rx, ry, ang)}"/></svg>`;
    }
  }

  // padronagem "plantio": grãos em malha deslocada, como fundo de um elemento
  function plantio(c = D.cores.feijao, passo = 120, escala = .3, opac = 1) {
    const g = graoPath(passo / 2, passo / 2, D.grao.rx * escala, D.grao.ry * escala), g2 = graoPath(passo * 1.5, passo * 1.5, D.grao.rx * escala, D.grao.ry * escala);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${passo * 2}" height="${passo * 2}" viewBox="0 0 ${passo * 2} ${passo * 2}"><g fill="${cor(c)}" fill-opacity="${opac}"><path d="${g}"/><path d="${g2}"/></g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  function aplicaPlantio() {
    document.querySelectorAll('[data-plantio]').forEach(el => {
      const [c, passo, esc, op] = el.dataset.plantio.split(',');
      el.style.backgroundImage = plantio(c || 'feijao', parseFloat(passo) || 120, parseFloat(esc) || .3, parseFloat(op) || 1);
    });
  }


  // ── tipografia de precisão ───────────────────────────────────────
  const ctx = document.createElement('canvas').getContext('2d');
  function tinta(el) {   // limites da tinta de uma linha de texto (px)
    const cs = getComputedStyle(el); ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; ctx.letterSpacing = cs.letterSpacing;
    ctx.fontStretch = ({ '125%': 'expanded', '112.5%': 'semi-expanded', '100%': 'normal', '87.5%': 'semi-condensed', '75%': 'condensed' })[cs.fontStretch] || 'normal';
    const t = cs.textTransform === 'uppercase' ? el.textContent.toUpperCase() : el.textContent, m = ctx.measureText(t.trim());
    return { esq: -m.actualBoundingBoxLeft, dir: m.actualBoundingBoxRight };
  }
  function ajustaTipos() {
    // data-ajusta="largura": escala o corpo para a linha mais larga ocupar exatamente a largura (medida na tinta)
    document.querySelectorAll('[data-ajusta]').forEach(el => {
      const alvo = parseFloat(el.dataset.ajusta), linhas = el.querySelectorAll('.ln').length ? [...el.querySelectorAll('.ln')] : [el];
      for (let k = 0; k < 3; k++) {
        const larg = Math.max(...linhas.map(l => { const t = tinta(l); return t.dir - t.esq; }));
        el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * alvo / larg) + 'px';
      }
    });
    // .ln dentro de [data-optico]: encosta a tinta de cada linha na margem esquerda (compensa o recuo lateral do glifo)
    document.querySelectorAll('[data-optico] .ln, .ln[data-optico], [data-ajusta] .ln, .ln[data-ajusta]').forEach(l => {
      const t = tinta(l); l.style.transform = `translateX(${(-t.esq).toFixed(2)}px)`;
    });
  }
  function grade() {     // desenha colunas/margens declaradas em data-grade="margem,colunas,calha"
    if (!/[?&]grade/.test(location.search)) return; document.documentElement.classList.add('ver-grade');
    document.querySelectorAll('.prancha[data-grade]').forEach(p => {
      const [m, n, g] = p.dataset.grade.split(',').map(Number), W = p.offsetWidth, c = (W - 2 * m - (n - 1) * g) / n;
      let h = ''; for (let i = 0; i < n; i++) h += `<div style="position:absolute;top:0;bottom:0;left:${m + i * (c + g)}px;width:${c}px;background:rgba(255,0,200,.13)"></div>`;
      (p.dataset.linhas || '').split(',').filter(Boolean).forEach(y => h += `<div style="position:absolute;left:0;right:0;top:${y}px;height:1px;background:rgba(0,220,255,.9)"></div>`);
      const d = document.createElement('div'); d.className = 'grade'; d.innerHTML = h; p.appendChild(d);
    });
  }


  // ── padronagens ──────────────────────────────────────────────────
  // Cinco estampas modulares, de raiz brasileira, desenhadas num módulo de 100 × 100:
  //   ladrilho (cozinha) · trancado (cesta) · bandeirinha (festa) · folha (roça) · prato (mesa)
  const rng = seed => { let s = (seed * 2654435761) >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const PAD = {   // cada função desenha só as formas do módulo; o fundo é um retângulo único (sem emendas)
    ladrilho: { fundo: 1, f(c) {   // estrela côncava entre quatro círculos — ladrilho hidráulico
      return `<path d="M50 0L100 50L50 100L0 50Z" fill="${c[2] || c[0]}"/><path d="M-.5 -.5H50A50 50 0 0 1 0 50H-.5ZM100.5 -.5V50H100A50 50 0 0 1 50 0V-.5ZM100.5 100.5H50V100A50 50 0 0 1 100 50H100.5ZM-.5 100.5V50H0A50 50 0 0 1 50 100V100.5Z" fill="${c[1]}"/>` +
        `<circle cx="50" cy="50" r="11" fill="${c[0]}"/><path d="M0 0H20A20 20 0 0 1 0 20ZM100 0V20A20 20 0 0 1 80 0ZM100 100H80A20 20 0 0 1 100 80ZM0 100V80A20 20 0 0 1 20 100Z" fill="${c[0]}"/>`; } },
    trancado: { fundo: 0, f(c, i, j) {   // tiras que passam por cima e por baixo — cestaria
      return (i + j) % 2 === 0 ? `<path d="M-.5 5H100.5V47H-.5ZM-.5 53H100.5V95H-.5Z" fill="${c[1]}"/>` : `<path d="M5 -.5H47V100.5H5ZM53 -.5H95V100.5H53Z" fill="${c[2] || c[1]}"/>`; } },
    bandeirinha: { fundo: 0, f(c, i, j) {   // bandeirinhas de festa junina
      return `<path d="M16 -.5H84V92L50 62L16 92Z" fill="${c[1 + ((i + j * 2) % (c.length - 1))]}"/>`; } },
    prato: { fundo: 0, f(c, i, j) {   // pratos e panelas vistos de cima
      const k = c.length - 1, q = n => c[1 + ((i + j + n) % k)];
      return `<circle cx="50" cy="50" r="44" fill="${q(0)}"/><circle cx="50" cy="50" r="29" fill="${q(1)}"/><circle cx="50" cy="50" r="12" fill="${k > 2 ? q(2) : c[0]}"/>`; } },
    folha: { fundo: 0, f(c, i, j, r) {   // quartos de círculo e folhas — a roça vista de cima
      const cor1 = c[1 + Math.floor(r() * (c.length - 1))], t = r(), rot = Math.floor(r() * 4) * 90;
      const f = t < .12 ? `<rect x="-.5" y="-.5" width="101" height="101" fill="${cor1}"/>` : t < .2 ? '' : t < .66 ? `<path d="M-.5 -.5H100A100 100 0 0 1 0 100H-.5Z" fill="${cor1}"/>` : `<path d="M0 0A100 100 0 0 1 100 100A100 100 0 0 1 0 0Z" fill="${cor1}"/>`;
      return `<g transform="rotate(${rot} 50 50)">${f}</g>`; } },
  };
  function padrao(tipo, cores, cols, rows, seed = 1) {
    const c = cores.map(cor), r = rng(seed), P = PAD[tipo]; let h = '';
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) h += `<g transform="translate(${i * 100} ${j * 100})">${P.f(c, i, j, r)}</g>`;
    return `<svg viewBox="0 0 ${cols * 100} ${rows * 100}" preserveAspectRatio="none"><rect width="${cols * 100}" height="${rows * 100}" fill="${c[P.fundo]}"/><g clip-path="inset(0)">${h}</g></svg>`;
  }
  /* <fibra-padrao tipo="ladrilho" cores="arroz,couve,fuba" cols="4" rows="2" seed="3"> — a primeira cor é o fundo */
  class Padrao extends HTMLElement {
    connectedCallback() {
      const g = (a, d) => this.getAttribute(a) || d;
      this.innerHTML = padrao(g('tipo', 'ladrilho'), g('cores', 'arroz,couve,fuba').split(',').map(s => s.trim()), parseInt(g('cols', 4)), parseInt(g('rows', 1)), parseInt(g('seed', 1)));
    }
  }

  customElements.define('fibra-padrao', Padrao);
  customElements.define('fibra-logo', Logo); customElements.define('fibra-janela', Janela); customElements.define('fibra-grao', Grao);
  window.FIBRA = { dados: D, cor, padrao, graoPath, letraD, disposicao, plantio, fotoUrl,
    tinta, pronto: async () => { aplicaPlantio(); await document.fonts.ready; await Promise.all(['900 semi-expanded 40px Archivo', '900 expanded 40px Archivo', '800 40px Archivo', '600 20px Archivo', '400 20px Archivo', '500 20px "DM Mono"'].map(f => document.fonts.load(f))); ajustaTipos(); grade(); await Promise.all(espera);
      await Promise.all([...document.images].map(i => i.complete ? (i.decode ? i.decode().catch(() => 0) : 0) : new Promise(r => { i.onload = i.onerror = r; }))); return true; } };
  document.addEventListener('DOMContentLoaded', aplicaPlantio);
})();

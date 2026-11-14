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
      const ver = v === 'simbolo' ? 'BRA' : v;   // símbolo: BRA — o Brasil dentro do nome
      const S = this.hasAttribute('alta') ? D.alta : D, d = disposicao(ver, S), G = S.letras;
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


  // ── colcha de cestaria ───────────────────────────────────────────
  // Tramas desenhadas fio a fio, como na cestaria: tiras horizontais (trama) e verticais (urdidura) que passam
  // por cima e por baixo. Cada desenho nasce da regra de cruzamento, não de um ornamento aplicado.
  //   sarja (diagonal) · espinha (zigue-zague) · olho (losangos concêntricos) · esteira (2×2) · tela (1×1) · degrau (escada)
  // Grafismos de apoio: raios · zigue · losango · escama · graos · dente
  const rng = seed => { let s = (seed * 2654435761) >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  // ── padronagens editoriais v4 ────────────────────────────────────
  // Seis estampas de raiz brasileira, cada uma com uma história: calçadão (Copacabana), fitas (Bonfim), chita (tecido de festa),
  // abacaxi (a casca da fruta), vitória-régia (Amazônia) e sol. Desenho em módulo de 100; c[0] fundo, c[1] principal, c[2] acento.
  const NAC = ['fuba', 'couve', 'anil', 'urucum', 'arroz', 'dende'].map(cor);
  const ED = {
    ondas(c, W, H, o, r) {   // calçadão: faixas onduladas em pedra portuguesa, com a junta de cada pedrinha
      let d = '', g = '';
      for (let y = -50; y < H + 50; y += 50) { const a = 16; let top = `M-50 ${y}`, bot = '';
        for (let x = -50; x <= W + 50; x += 50) { const s1 = ((x / 50) % 2 ? -1 : 1); top += `Q${x + 25} ${y + s1 * a} ${x + 50} ${y}`; }
        for (let x = W + 50; x >= -50; x -= 50) { const s1 = ((x / 50) % 2 ? -1 : 1); bot += `Q${x - 25} ${y + 25 - s1 * a} ${x - 50} ${y + 25}`; }
        d += top + `L${W + 100} ${y + 25}` + bot + 'Z'; }
      for (let y = 0; y < H; y += 4.2) { const ox = r() * 4; g += `M0 ${y.toFixed(1)}H${W}`; for (let x = ox; x < W; x += 4.2 + r() * 1.2) g += `M${x.toFixed(1)} ${y.toFixed(1)}v4.2`; }
      return `<rect width="${W}" height="${H}" fill="${c[0]}"/><path d="${d}" fill="${c[1]}"/><path d="${g}" stroke="${c[0]}" stroke-opacity=".55" stroke-width=".55" fill="none"/>`;
    },
    fitas(c, W, H, o, r) {   // fitas do Bonfim: tiras com a costura e a lembrança escrita
      const cs = [c[1], c[2] || NAC[0], ...NAC].filter((v, i, a) => a.indexOf(v) === i && v !== c[0]), w = 12.5; let h = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`;
      for (let i = 0, x = 0; x < W; x += w, i++) { const f = cs[i % cs.length], sw = (r() - .5) * 3, tx = cor(f === NAC[4] || f === cor('fuba') ? 'feijao' : 'arroz');
        h += `<g transform="translate(${x} 0) skewX(${sw.toFixed(2)})"><rect x=".6" y="-20" width="${w - 1.2}" height="${H + 40}" fill="${f}"/><path d="M2 -20V${H + 20}M${w - 2} -20V${H + 20}" stroke="${tx}" stroke-opacity=".35" stroke-width=".35" stroke-dasharray="1.4 1.2"/>` +
          `<text transform="translate(${w / 2 + 1.6} ${(r() * 80).toFixed(1)}) rotate(90)" fill="${tx}" font-family="Sora" font-weight="700" font-size="4.6" letter-spacing=".9">${'COMIDA DE VERDADE · BRASIL · '.repeat(Math.ceil(H / 90))}</text></g>`; }
      return h;
    },
    chita(c, W, H, o, r) {   // chita: flor grande de cinco pétalas, miolo, folhas e respingos
      let h = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`; const fol = c[3] || cor('couve'), mi = c[2] || cor('fuba');
      for (let j = 0; j * 100 < H + 50; j++) for (let i = 0; i * 100 < W + 50; i++) { const cx = i * 100 + (j % 2 ? 50 : 0), cy = j * 100 + 50, rot = r() * 72;
        h += `<g transform="translate(${cx} ${cy}) rotate(${rot.toFixed(1)}) scale(1.22)">`;
        [0, 1].forEach(k => h += `<path d="M0 0C14 -10 34 -8 44 0C34 8 14 10 0 0Z" fill="${fol}" transform="rotate(${36 + k * 180})"/><path d="M4 0L40 0" stroke="${c[0]}" stroke-width=".8" transform="rotate(${36 + k * 180})"/>`);
        for (let k = 0; k < 5; k++) h += `<circle cx="0" cy="-17" r="15" fill="${c[1]}" transform="rotate(${k * 72})"/><path d="M0 -6L0 -26" stroke="${c[0]}" stroke-opacity=".35" stroke-width="1" transform="rotate(${k * 72})"/>`;
        h += `<circle r="10" fill="${mi}"/>`; for (let k = 0; k < 8; k++) h += `<circle cx="${(5.2 * Math.cos(k * .785)).toFixed(1)}" cy="${(5.2 * Math.sin(k * .785)).toFixed(1)}" r="1.4" fill="${c[1]}"/>`;
        h += '</g>'; for (let k = 0; k < 6; k++) h += `<circle cx="${(cx + 25 + r() * 50).toFixed(1)}" cy="${(cy - 50 + r() * 100).toFixed(1)}" r="${(1.2 + r() * 1.6).toFixed(1)}" fill="${mi}"/>`; }
      return h;
    },
    abacaxi(c, W, H, o, r) {   // casca de abacaxi: losangos com escamas concêntricas e espinho
      let h = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`; const s2 = 25, e = c[2] || cor('dende');
      for (let j = -1; j * s2 < H + s2; j++) for (let i = -1; i * s2 * 2 < W + s2 * 2; i++) { const cx = i * 50 + (j % 2 ? 25 : 0), cy = j * 25;
        const rh = (k) => `M${cx} ${cy - k}L${cx + 2 * k * .98} ${cy}L${cx} ${cy + k}L${cx - 2 * k * .98} ${cy}Z`;
        h += `<path d="${rh(24)}" fill="${c[1]}"/><path d="${rh(16)}" fill="none" stroke="${e}" stroke-width="2.4"/><path d="${rh(8.5)}" fill="${e}"/><path d="M${cx} ${cy - 3}l-2.2 6h4.4Z" fill="${c[0]}"/>`; }
      return h;
    },
    vitoria(c, W, H, o, r) {   // vitória-régia: folha redonda com borda levantada, nervuras radiais e anéis
      let h = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`; const rr = 46, aro = c[2] || cor('fuba');
      for (let j = 0; j * 100 < H; j++) for (let i = 0; i * 100 < W; i++) { const cx = i * 100 + 50, cy = j * 100 + 50, rot = r() * 360; let v = '';
        for (let k = 0; k < 28; k++) { const a = k / 28 * 6.283; v += `M0 0L${(rr * Math.cos(a)).toFixed(1)} ${(rr * Math.sin(a)).toFixed(1)}`; }
        h += `<g transform="translate(${cx} ${cy}) rotate(${rot.toFixed(0)})"><circle r="${rr + 3}" fill="${aro}"/><circle r="${rr}" fill="${c[1]}"/>` +
          `<path d="${v}" stroke="${aro}" stroke-opacity=".7" stroke-width=".9"/>` + [14, 24, 34].map(q => `<circle r="${q}" fill="none" stroke="${aro}" stroke-opacity=".35" stroke-width=".6"/>`).join('') +
          `<path d="M0 0L${rr + 4} -3L${rr + 4} 3Z" fill="${c[0]}"/><circle r="3.5" fill="${aro}"/></g>`; }
      return h;
    },
    sol(c, W, H, o) {   // sol: raios alternados com um grão no centro
      const n = o.n || 32, cx = W / 2, cy = H / 2, R = Math.hypot(W, H); let d = '';
      for (let k = 0; k < n; k += 2) { const a = k / n * 6.283 - 1.5708, b = a + 6.283 / n; d += `M${cx} ${cy}L${(cx + R * Math.cos(a)).toFixed(1)} ${(cy + R * Math.sin(a)).toFixed(1)}L${(cx + R * Math.cos(b)).toFixed(1)} ${(cy + R * Math.sin(b)).toFixed(1)}Z`; }
      const m = Math.min(W, H);
      return `<rect width="${W}" height="${H}" fill="${c[0]}"/><path d="${d}" fill="${c[1]}"/><circle cx="${cx}" cy="${cy}" r="${m * .2}" fill="${c[0]}"/><circle cx="${cx}" cy="${cy}" r="${m * .16}" fill="${c[2] || c[1]}"/><path d="${graoPath(cx, cy, m * .09, m * .038)}" fill="${c[0]}"/>`;
    },
  };
  const ANTIGO = { sarja: 'ondas', tela: 'ondas', espinha: 'fitas', zigue: 'fitas', olho: 'chita', losango: 'chita', esteira: 'abacaxi', escama: 'abacaxi', degrau: 'vitoria', graos: 'vitoria', dente: 'sol', raios: 'sol' };
  function trama(tipo, cores, cols, rows, o = {}) {
    const t = ED[tipo] ? tipo : (ANTIGO[tipo] || 'ondas'), c = cores.map(cor), W = cols * 100, H = rows * 100;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><g clip-path="inset(0)">${ED[t](c, W, H, o, rng(o.seed || 7))}</g></svg>`;
  }
  /* <fibra-trama tipo="sarja" cores="feijao,fuba,dende" cols="2" rows="2" n="8"> — a primeira cor é o fundo (o vão entre as tiras) */
  class Trama extends HTMLElement {
    connectedCallback() { const g = (a, d) => this.getAttribute(a) || d;
      this.innerHTML = trama(g('tipo', 'ondas'), g('cores', 'feijao,fuba,dende').split(',').map(x => x.trim()), parseFloat(g('cols', 1)), parseFloat(g('rows', 1)), { n: parseInt(g('n', 32)), seed: parseInt(g('seed', 7)) }); }
  }
  /* <fibra-prato foto="tex-feijao-preto" fundo="couve" raios="mata" aro="arroz" n="24"> — prato visto de cima sobre um sol de tiras */
  class Prato extends HTMLElement {
    connectedCallback() { const g = (a, d) => this.getAttribute(a) || d, id = 'p' + (++uid), f = this.getAttribute('foto'), fx = parseFloat(g('fx', .5)), fy = parseFloat(g('fy', .5)), z = parseFloat(g('zoom', 1));
      const r = parseFloat(g('r', 34)), aro = cor(g('aro', 'arroz'));
      this.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">${`<rect width="100" height="100" fill="${cor(g('fundo', 'couve'))}"/><path d="${(() => { let d = ''; const n = parseInt(g('n', 24)); for (let k = 0; k < n; k += 2) { const a = k / n * 6.283 - 1.5708, b2 = a + 6.283 / n; d += `M50 50L${(50 + 80 * Math.cos(a)).toFixed(1)} ${(50 + 80 * Math.sin(a)).toFixed(1)}L${(50 + 80 * Math.cos(b2)).toFixed(1)} ${(50 + 80 * Math.sin(b2)).toFixed(1)}Z`; } return d; })()}" fill="${cor(g('raios', 'mata'))}"/>`}` +
        `<circle cx="50" cy="50" r="${r + 5.5}" fill="${aro}"/><circle cx="50" cy="50" r="${r + 1.6}" fill="none" stroke="${cor(g('fio', 'feijao'))}" stroke-opacity=".28" stroke-width=".7"/>` +
        `<clipPath id="${id}"><circle cx="50" cy="50" r="${r}"/></clipPath><g clip-path="url(#${id})"><rect width="100" height="100" fill="${cor('feijao')}"/>${f ? cobre(f, 50 - r, 50 - r, 2 * r, 2 * r, fx, fy, z) : ''}</g></svg>`; }
  }
  customElements.define('fibra-prato', Prato);
  /* <fibra-foto foto="mesa-jovem" w="1080" h="630" fx=".5" fy=".3" zoom="1" duo="mata,fuba"> — fotografia retangular que cobre a caixa w × h.
     duo: duotom (sombras na primeira cor, luzes na segunda). */
  class Foto extends HTMLElement {
    connectedCallback() {
      const g = (a, d) => parseFloat(this.getAttribute(a) ?? d), w = g('w', 100), h = g('h', 100), duo = this.getAttribute('duo'), id = ++uid; let filtro = '';
      this.style.display = 'block'; this.style.lineHeight = 0;
      if (duo) {
        const hex = v => { const x = cor(v).replace('#', ''); return [0, 2, 4].map(k => parseInt(x.substr(k, 2), 16) / 255); }, [a, b] = duo.split(',').map(x => hex(x.trim()));
        filtro = `<filter id="d${id}" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%"><feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/><feComponentTransfer><feFuncR type="linear" slope="1.25" intercept="-.1"/><feFuncG type="linear" slope="1.25" intercept="-.1"/><feFuncB type="linear" slope="1.25" intercept="-.1"/></feComponentTransfer><feComponentTransfer><feFuncR type="table" tableValues="${a[0]} ${b[0]}"/><feFuncG type="table" tableValues="${a[1]} ${b[1]}"/><feFuncB type="table" tableValues="${a[2]} ${b[2]}"/></feComponentTransfer></filter>`;
      }
      this.innerHTML = `<svg viewBox="0 0 ${w} ${h}" style="display:block;width:100%;height:100%" preserveAspectRatio="none"><defs>${filtro}<clipPath id="f${id}"><rect width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#f${id})"><g ${duo ? `filter="url(#d${id})"` : ''}>${cobre(this.getAttribute('foto'), 0, 0, w, h, g('fx', .5), g('fy', .5), g('zoom', 1))}</g></g></svg>`;
    }
  }
  customElements.define('fibra-foto', Foto);
  customElements.define('fibra-trama', Trama);
  customElements.define('fibra-logo', Logo); customElements.define('fibra-janela', Janela); customElements.define('fibra-grao', Grao);
  window.FIBRA = { dados: D, cor, trama, graoPath, letraD, disposicao, plantio, fotoUrl,
    tinta, pronto: async () => { aplicaPlantio(); await document.fonts.ready; await Promise.all(['400 40px Anton', '400 20px Sora', '600 20px Sora', '700 20px Sora'].map(f => document.fonts.load(f))); ajustaTipos(); grade(); await Promise.all(espera);
      await Promise.all([...document.images].map(i => i.complete ? (i.decode ? i.decode().catch(() => 0) : 0) : new Promise(r => { i.onload = i.onerror = r; }))); return true; } };
  document.addEventListener('DOMContentLoaded', aplicaPlantio);
})();

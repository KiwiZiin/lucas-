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


  // ── colcha de cestaria ───────────────────────────────────────────
  // Tramas desenhadas fio a fio, como na cestaria: tiras horizontais (trama) e verticais (urdidura) que passam
  // por cima e por baixo. Cada desenho nasce da regra de cruzamento, não de um ornamento aplicado.
  //   sarja (diagonal) · espinha (zigue-zague) · olho (losangos concêntricos) · esteira (2×2) · tela (1×1) · degrau (escada)
  // Grafismos de apoio: raios · zigue · losango · escama · graos · dente
  const POR_CIMA = {
    tela: (i, j) => (i + j) % 2 === 0,
    esteira: (i, j) => ((i >> 1) + (j >> 1)) % 2 === 0,
    sarja: (i, j) => (((i + j) % 4) + 4) % 4 < 2,
    espinha: (i, j, P) => { const k = ((j % (2 * P)) + 2 * P) % (2 * P), jj = k < P ? k : 2 * P - 1 - k; return ((i + jj) % 4) < 2; },
    olho: (i, j, P) => { const u = Math.abs((((i % P) + P) % P) - (P - 1) / 2), v = Math.abs((((j % P) + P) % P) - (P - 1) / 2); return Math.floor(u + v) % 4 < 2; },
    degrau: (i, j) => ((i + 2 * Math.floor(j / 2)) % 6 + 6) % 6 < 3,
  };
  function tecido(tipo, c, cols, rows, n = 8) {   // n fios por módulo
    const s = 100 / n, g = s * .14, W = cols * 100, H = rows * 100, NX = cols * n, NY = rows * n, f = POR_CIMA[tipo], P = n; let h = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`, d = '';
    for (let j = 0; j < NY; j++) d += `M0 ${(j * s + g / 2).toFixed(2)}H${W}v${(s - g).toFixed(2)}H0Z`;
    h += `<path d="${d}" fill="${c[1]}"/>`; d = '';
    for (let i = 0; i < NX; i++) { let j = 0; while (j < NY) { if (!f(i, j, P)) { j++; continue; } let k = j; while (k + 1 < NY && f(i, k + 1, P)) k++;
      d += `M${(i * s + g / 2).toFixed(2)} ${(j === 0 ? 0 : j * s + g / 2).toFixed(2)}h${(s - g).toFixed(2)}V${(k === NY - 1 ? H : (k + 1) * s - g / 2).toFixed(2)}h${(-(s - g)).toFixed(2)}Z`; j = k + 1; } }
    return h + `<path d="${d}" fill="${c[2] || c[1]}"/>`;
  }
  const GRAF = {
    raios(c, W, H, o) {   // sol de tiras: raios alternados a partir do centro
      const n = o.n || 24, cx = W / 2, cy = H / 2, R = Math.hypot(W, H); let d = '';
      for (let k = 0; k < n; k += 2) { const a = k / n * 2 * Math.PI - Math.PI / 2 - Math.PI / n, b2 = a + 2 * Math.PI / n; d += `M${cx} ${cy}L${(cx + R * Math.cos(a)).toFixed(1)} ${(cy + R * Math.sin(a)).toFixed(1)}L${(cx + R * Math.cos(b2)).toFixed(1)} ${(cy + R * Math.sin(b2)).toFixed(1)}Z`; }
      return `<rect width="${W}" height="${H}" fill="${c[0]}"/><path d="${d}" fill="${c[1]}"/>`;
    },
    zigue(c, W, H, o) {   // faixas em zigue-zague
      const p = o.p || 50, e = o.e || 12.5, k = c.length - 1; let h = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`;
      for (let y = -p, q = 0; y < H + p; y += e * 2, q++) { let d = `M${-p} ${y + p / 2}`; for (let x = -p, up = true; x <= W + p; x += p / 2, up = !up) d += `L${x} ${y + (up ? p / 2 : 0)}`; h += `<path d="${d}" fill="none" stroke="${c[1 + (q % k)]}" stroke-width="${e}" stroke-linejoin="miter" stroke-miterlimit="8"/>`; }
      return h;
    },
    losango(c, W, H) {   // losangos concêntricos por módulo
      let h = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`; const k = c.length - 1;
      for (let y = 0; y < H; y += 100) for (let x = 0; x < W; x += 100) [50, 36, 22, 9].forEach((r, q) => h += `<path d="M${x + 50} ${y + 50 - r}L${x + 50 + r} ${y + 50}L${x + 50} ${y + 50 + r}L${x + 50 - r} ${y + 50}Z" fill="${c[1 + (q % k)]}"/>`);
      return h;
    },
    escama(c, W, H) {   // escamas / telhas em fiadas desencontradas
      let h = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`; const k = c.length - 1, r = 25;
      for (let j = Math.ceil(H / r) + 1; j >= -1; j--) for (let x = (j % 2 ? -r : 0) - r; x < W + r; x += 2 * r) { const y = j * r; h += `<circle cx="${x + r}" cy="${y}" r="${r}" fill="${c[1 + ((j % k) + k) % k]}"/><circle cx="${x + r}" cy="${y}" r="${r * .56}" fill="${c[1 + (((j + 1) % k) + k) % k]}"/><circle cx="${x + r}" cy="${y}" r="${r * .2}" fill="${c[0]}"/>`; }
      return h;
    },
    graos(c, W, H) {   // grãos em fiadas, com a inclinação alternada: ponto de arroz
      let h = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`, d = [``, ``]; const p = 25;
      for (let j = 0, y = p / 2; y < H; y += p, j++) for (let x = (j % 2 ? p : p / 2); x < W; x += p) d[j % 2] += graoPath(x, y, 9.5, 4, j % 2 ? 42 : -42);
      return h + `<path d="${d[0]}" fill="${c[1]}"/><path d="${d[1]}" fill="${c[2] || c[1]}"/>`;
    },
    dente(c, W, H) {   // dente de serra: fiadas de triângulos
      let h = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`; const k = c.length - 1, p = 25;
      for (let j = 0, y = 0; y < H; y += p, j++) { let d = ''; for (let x = 0; x < W; x += p) d += `M${x} ${y + p}L${x + p / 2} ${y}L${x + p} ${y + p}Z`; h += `<path d="${d}" fill="${c[1 + (j % k)]}"/>`; }
      return h;
    },
  };
  function trama(tipo, cores, cols, rows, o = {}) {
    const c = cores.map(cor), W = cols * 100, H = rows * 100, corpo = POR_CIMA[tipo] ? tecido(tipo, c, cols, rows, o.n || 8) : GRAF[tipo](c, W, H, o);
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><g clip-path="inset(0)">${corpo}</g></svg>`;
  }
  /* <fibra-trama tipo="sarja" cores="feijao,fuba,dende" cols="2" rows="2" n="8"> — a primeira cor é o fundo (o vão entre as tiras) */
  class Trama extends HTMLElement {
    connectedCallback() { const g = (a, d) => this.getAttribute(a) || d;
      this.innerHTML = trama(g('tipo', 'sarja'), g('cores', 'feijao,fuba,dende').split(',').map(x => x.trim()), parseFloat(g('cols', 1)), parseFloat(g('rows', 1)), { n: parseInt(g('n', 8)), p: parseFloat(g('p', 50)), e: parseFloat(g('e', 12.5)) }); }
  }
  /* <fibra-prato foto="tex-feijao-preto" fundo="couve" raios="mata" aro="arroz" n="24"> — prato visto de cima sobre um sol de tiras */
  class Prato extends HTMLElement {
    connectedCallback() { const g = (a, d) => this.getAttribute(a) || d, id = 'p' + (++uid), f = this.getAttribute('foto'), fx = parseFloat(g('fx', .5)), fy = parseFloat(g('fy', .5)), z = parseFloat(g('zoom', 1));
      const r = parseFloat(g('r', 34)), aro = cor(g('aro', 'arroz'));
      this.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">${GRAF.raios([cor(g('fundo', 'couve')), cor(g('raios', 'mata'))], 100, 100, { n: parseInt(g('n', 24)) })}` +
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

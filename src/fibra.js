/* FIBRA v6 — componentes da identidade para as peças em HTML.
   <fibra-logo>      logotipo (horizontal, empilhado, símbolo BRA, letras isoladas)
   <fibra-janela>    fotografia dentro das letras do logotipo
   <fibra-grao>      o grão (elipse a −42°)
   <fibra-foto>      fotografia que cobre a caixa, com foco e zoom; duo = duotom
   <fibra-recorte>   objeto real recortado, com borda de papel
   <fibra-plaq>      plaquinha de preço da feira, com prendedor de madeira
   <fibra-carimbo>   selo de carimbo com tinta irregular
   <fibra-isotipo>   gráfico de grãos (24,2 em cada 100)
   [data-bloco]      composição em bloco: cada .ln ajustada à largura, como nos cartazes de gráfica popular */
(() => {
  const D = window.FIBRA_DADOS, L = D.letras, CAP = D.cap, F = window.FIBRA_FOTOS || {};
  const base = new URL('..', document.currentScript.src).href;
  const CORES = { ...D.cores, mata: '#073D26', papel: '#FBF8F1' };
  const cor = v => (v && CORES[v]) || v || CORES.feijao;
  const ALTA = /[?&]alta/.test(location.search), IDS = window.FIBRA_FOTOS_ID || {};
  const fotoUrl = n => (ALTA && IDS[n]) ? base + 'fotos/originais/AdobeStock_' + IDS[n] + '.jpg' : (window.FIBRA_FOTOS_URL || (base + 'fotos/trabalho/')) + n + '.jpg';
  let uid = 0; const espera = [];
  const carrega = u => espera.push(new Promise(r => { const im = new Image(); im.onload = im.onerror = () => (im.decode ? im.decode().catch(() => 0).then(r) : r()); im.src = u; }));

  function graoPath(cx, cy, rx = D.grao.rx, ry = D.grao.ry, ang = D.grao.ang) {
    const a = ang * Math.PI / 180, k = 0.5522847498, c = Math.cos(a), s = Math.sin(a);
    const p = [[rx, 0], [rx, k * ry], [k * rx, ry], [0, ry], [-k * rx, ry], [-rx, k * ry], [-rx, 0], [-rx, -k * ry], [-k * rx, -ry], [0, -ry], [k * rx, -ry], [rx, -k * ry], [rx, 0]]
      .map(([x, y]) => (cx + x * c - y * s).toFixed(2) + ' ' + (cy + x * s + y * c).toFixed(2));
    return `M${p[0]}C${p[1]} ${p[2]} ${p[3]}C${p[4]} ${p[5]} ${p[6]}C${p[7]} ${p[8]} ${p[9]}C${p[10]} ${p[11]} ${p[12]}Z`;
  }

  function disposicao(versao, S = D) {
    const L = S.letras;
    if (versao === 'empilhado') return { w: S.pilha.w, h: S.pilha.h, itens: S.pilha.linhas.flatMap(ln => ln.itens.map(i => ({ l: i.l, x: i.x, y: ln.y }))) };
    if (versao && versao.length <= 5 && /^[FIBRA]+$/.test(versao) && versao !== 'FIBRA') {
      const idx = 'FIBRA'.indexOf(versao); const src = idx >= 0 ? S.logo.itens.slice(idx, idx + versao.length) : [...versao].map(l => ({ l, x: 0 }));
      const x0 = src[0].x, last = src[src.length - 1];
      return { w: last.x - x0 + L[last.l].w, h: CAP, itens: src.map(i => ({ l: i.l, x: i.x - x0, y: 0 })) };
    }
    return { w: S.logo.w, h: CAP, itens: S.logo.itens.map(i => ({ ...i, y: 0 })) };
  }

  class Logo extends HTMLElement {
    connectedCallback() {
      const v = this.getAttribute('versao') || 'horizontal', c = cor(this.getAttribute('cor')), solido = this.hasAttribute('solido');
      const ver = v === 'simbolo' ? 'BRA' : v, d = disposicao(ver), G = D.letras, gc = this.getAttribute('graos');
      this.innerHTML = `<svg viewBox="0 0 ${d.w} ${d.h}" fill="${c}">` + d.itens.map(i => `<path transform="translate(${i.x} ${i.y})" fill-rule="evenodd" d="${G[i.l].d + (solido || gc ? '' : G[i.l].graos.map(([x, y]) => ' ' + graoPath(x, y)).join(''))}"/>` +
        (gc && G[i.l].graos.length ? `<path transform="translate(${i.x} ${i.y})" fill="${cor(gc)}" d="${G[i.l].graos.map(([x, y]) => graoPath(x, y)).join(' ')}"/>` : '')).join('') + '</svg>';
    }
  }

  // imagem que cobre a caixa (x,y,w,h) com foco fx/fy (0–1) e zoom
  function cobre(nome, bx, by, bw, bh, fx = .5, fy = .5, zoom = 1) {
    const [iw, ih] = F[nome] || [3, 2]; const a = iw / ih;
    let h = Math.max(bh, bw / a) * zoom, w = h * a;
    const x = bx + (bw - w) * fx, y = by + (bh - h) * fy, u = fotoUrl(nome);
    carrega(u);
    return `<image href="${u}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" preserveAspectRatio="none"/>`;
  }

  /* <fibra-janela letra="B" foto="feira-banana" fx=".5" fy=".3" zoom="1.1" graos="fuba" fundo="feijao"> */
  class Janela extends HTMLElement {
    connectedCallback() {
      const v = this.getAttribute('letra') || 'FIBRA';
      if (v === 'grao') {   // janela em forma de grão, caixa justa na tinta
        const ang = parseFloat(this.getAttribute('ang') ?? D.grao.ang), rx = 1000, ry = rx * D.grao.ry / D.grao.rx, a = ang * Math.PI / 180;
        const hw = Math.hypot(rx * Math.cos(a), ry * Math.sin(a)), hh = Math.hypot(rx * Math.sin(a), ry * Math.cos(a)), id = 'g' + (++uid), f = this.getAttribute('foto');
        this.innerHTML = `<svg viewBox="0 0 ${2 * hw} ${2 * hh}"><defs><clipPath id="${id}"><path d="${graoPath(hw, hh, rx, ry, ang)}"/></clipPath></defs><g clip-path="url(#${id})"><rect width="${2 * hw}" height="${2 * hh}" fill="${cor(this.getAttribute('fundo') || 'feijao')}"/>${f ? cobre(f, 0, 0, 2 * hw, 2 * hh, parseFloat(this.getAttribute('fx') ?? .5), parseFloat(this.getAttribute('fy') ?? .5), parseFloat(this.getAttribute('zoom') ?? 1)) : ''}</g></svg>`; return;
      }
      const d = disposicao(v === 'FIBRA' ? 'horizontal' : v);
      const lista = a => (this.getAttribute(a) || '').split(',').map(s => s.trim()).filter(Boolean);
      const fotos = lista('fotos').length ? lista('fotos') : lista('foto'), fx = lista('fx'), fy = lista('fy'), zm = lista('zoom');
      const num = (arr, i, def) => { const v = arr[Math.min(i, arr.length - 1)]; return v === undefined ? def : parseFloat(v); };
      const unica = this.hasAttribute('unica') || (fotos.length === 1 && d.itens.length > 1);
      const graos = this.getAttribute('graos'), fundo = cor(this.getAttribute('fundo') || 'feijao'), id = 'j' + (++uid);
      let defs = '', corpo = '';
      if (unica) {
        defs = `<clipPath id="${id}">` + d.itens.map(i => `<path transform="translate(${i.x} ${i.y})" clip-rule="evenodd" d="${L[i.l].d} ${L[i.l].miolo || ''}"/>`).join('') + '</clipPath>';
        corpo = `<g clip-path="url(#${id})"><rect width="${d.w}" height="${d.h}" fill="${fundo}"/>` + (fotos[0] ? cobre(fotos[0], 0, 0, d.w, d.h, num(fx, 0, .5), num(fy, 0, .5), num(zm, 0, 1)) : '') + '</g>';
      } else d.itens.forEach((i, n) => {
        const f = fotos[Math.min(n, fotos.length - 1)], w = L[i.l].w;
        defs += `<clipPath id="${id}_${n}"><path transform="translate(${i.x} ${i.y})" clip-rule="evenodd" d="${L[i.l].d} ${L[i.l].miolo || ''}"/></clipPath>`;
        corpo += `<g clip-path="url(#${id}_${n})"><rect x="${i.x}" y="${i.y}" width="${w}" height="${CAP}" fill="${fundo}"/>` + (f ? cobre(f, i.x, i.y, w, CAP, num(fx, n, .5), num(fy, n, .5), num(zm, n, 1)) : '') + '</g>';
      });
      // regra da marca: com fotografia dentro das letras, não há grão — as contraformas ficam abertas
      this.innerHTML = `<svg viewBox="0 0 ${d.w} ${d.h}"><defs>${defs}</defs>${corpo}</svg>`;
    }
  }

  class Grao extends HTMLElement {
    connectedCallback() {
      const ang = parseFloat(this.getAttribute('ang') ?? D.grao.ang), rx = 100, ry = rx * D.grao.ry / D.grao.rx, a = ang * Math.PI / 180;
      const hw = Math.hypot(rx * Math.cos(a), ry * Math.sin(a)), hh = Math.hypot(rx * Math.sin(a), ry * Math.cos(a));
      this.innerHTML = `<svg viewBox="${-hw} ${-hh} ${2 * hw} ${2 * hh}" fill="${cor(this.getAttribute('cor'))}"><path d="${graoPath(0, 0, rx, ry, ang)}"/></svg>`;
    }
  }

  /* <fibra-foto foto="mesa-jovem" fx=".5" fy=".3" zoom="1" duo="feijao,fuba"> — cobre a própria caixa (medida no layout) */
  class Foto extends HTMLElement {
    connectedCallback() { this.style.display = 'block'; this.style.lineHeight = 0; this.desenha(); }
    desenha() {
      const r = this.getBoundingClientRect(), g = (a, d) => parseFloat(this.getAttribute(a) ?? d);
      const w = g('w', r.width || 100), h = g('h', r.height || 100), duo = this.getAttribute('duo'), id = ++uid; let filtro = '';
      if (duo) {
        const hex = v => { const x = cor(v).replace('#', ''); return [0, 2, 4].map(k => parseInt(x.substr(k, 2), 16) / 255); }, [a, b] = duo.split(',').map(x => hex(x.trim()));
        filtro = `<filter id="d${id}" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%"><feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/><feComponentTransfer><feFuncR type="linear" slope="1.2" intercept="-.08"/><feFuncG type="linear" slope="1.2" intercept="-.08"/><feFuncB type="linear" slope="1.2" intercept="-.08"/></feComponentTransfer><feComponentTransfer><feFuncR type="table" tableValues="${a[0]} ${b[0]}"/><feFuncG type="table" tableValues="${a[1]} ${b[1]}"/><feFuncB type="table" tableValues="${a[2]} ${b[2]}"/></feComponentTransfer></filter>`;
      }
      this.innerHTML = `<svg viewBox="0 0 ${w} ${h}" style="display:block;width:100%;height:100%" preserveAspectRatio="none"><defs>${filtro}<clipPath id="f${id}"><rect width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#f${id})"><g ${duo ? `filter="url(#d${id})"` : ''}>${cobre(this.getAttribute('foto'), 0, 0, w, h, g('fx', .5), g('fy', .5), g('zoom', 1))}</g></g></svg>`;
    }
  }

  /* <fibra-recorte nome="mandioca" [sem-papel]> — objeto real (fotos/recortes) */
  class Recorte extends HTMLElement {
    connectedCallback() {
      const u = base + 'fotos/recortes/' + this.getAttribute('nome') + (this.hasAttribute('sem-papel') ? '' : '-papel') + '.png'; carrega(u);
      this.innerHTML = `<img src="${u}" alt="">`;
    }
  }

  /* <fibra-pessoa nome="agro-chapeu"> — retrato recortado (fotos/pessoas), sempre apoiado na borda inferior da peça */
  class Pessoa extends HTMLElement {
    connectedCallback() { const u = base + 'fotos/pessoas/' + this.getAttribute('nome') + '.png'; carrega(u); this.innerHTML = `<img src="${u}" alt="">`; }
  }
  /* <fibra-anel cor="fuba" traco="15"> — o grão como anel de traço grosso, atrás do retrato (construção fotográfica) */
  class Anel extends HTMLElement {
    connectedCallback() {
      const ang = D.grao.ang, rx = 100, ry = rx * D.grao.ry / D.grao.rx, a = ang * Math.PI / 180, sw = rx * parseFloat(this.getAttribute('traco') || 15) / 100;
      const hw = Math.hypot(rx * Math.cos(a), ry * Math.sin(a)) + sw / 2, hh = Math.hypot(rx * Math.sin(a), ry * Math.cos(a)) + sw / 2;
      this.innerHTML = `<svg viewBox="${-hw} ${-hh} ${2 * hw} ${2 * hh}"><path d="${graoPath(0, 0, rx, ry, ang)}" fill="${this.hasAttribute('cheio') ? cor(this.getAttribute('cor') || 'fuba') : 'none'}" stroke="${cor(this.getAttribute('cor') || 'fuba')}" stroke-width="${sw}"/></svg>`;
    }
  }

  /* <fibra-plaq nome="Banana-prata" info="na cesta desta semana" preco="39" unid="por semana" cor="fuba" prendedor> */
  class Plaq extends HTMLElement {
    connectedCallback() {
      this.classList.add('plaq'); const c = this.getAttribute('cor'); if (c) this.classList.add(c);
      const g = a => this.getAttribute(a), pr = g('preco');
      const u = base + 'fotos/recortes/prendedor.png'; if (this.hasAttribute('prendedor')) carrega(u);
      this.innerHTML = (this.hasAttribute('prendedor') ? `<img class="prendedor" src="${u}" alt="">` : '') +
        (g('rotulo') ? `<div class="p-info t-rotulo" style="font-size:.26em">${g('rotulo')}</div>` : '') +
        (g('nome') ? `<div class="p-nome">${g('nome')}</div>` : '') +
        (pr ? `<div class="p-preco"><small>R$</small>${pr}${g('unid') ? `<em>${g('unid')}</em>` : ''}</div>` : '') +
        (g('info') ? `<div class="p-info">${g('info')}</div>` : '');
    }
  }

  /* <fibra-carimbo texto="DIRETO DE QUEM PLANTA • " centro="grao | linha 1|linha 2" cor="urucum" semente="3"> */
  class Carimbo extends HTMLElement {
    connectedCallback() {
      const id = 'c' + (++uid), s = parseInt(this.getAttribute('semente') || uid * 7), c = cor(this.getAttribute('cor') || 'urucum');
      const t = (this.getAttribute('texto') || 'DIRETO DE QUEM PLANTA • ').toUpperCase(), centro = this.getAttribute('centro') || 'grao';
      const R = 166, circ = 2 * Math.PI * R;
      const meio = centro === 'grao' ? `<path d="${graoPath(200, 200, 52, 22.2)}"/>` :
        centro.split('|').map((l, i, a) => `<text x="200" y="${200 + (i - (a.length - 1) / 2) * 46 + 16}" text-anchor="middle" font-size="44" font-weight="900" letter-spacing="-.5">${l.trim()}</text>`).join('');
      this.innerHTML = `<svg viewBox="0 0 400 400"><defs>
        <path id="${id}p" d="M200 ${200 - R}A${R} ${R} 0 1 1 ${200 - .01} ${200 - R}"/>
        <filter id="${id}f" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="${s}" result="n1"/>
          <feDisplacementMap in="SourceGraphic" in2="n1" scale="4" xChannelSelector="R" yChannelSelector="G" result="d"/>
          <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="1" seed="${s + 1}" result="n2"/>
          <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -9 0 0 0 6.2" result="furos"/>
          <feComposite in="d" in2="furos" operator="in" result="t"/>
          <feTurbulence type="fractalNoise" baseFrequency=".011" numOctaves="2" seed="${s + 2}" result="n3"/>
          <feColorMatrix in="n3" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -3.2 0 0 0 3.05" result="pressao"/>
          <feComposite in="t" in2="pressao" operator="in"/>
        </filter></defs>
        <g filter="url(#${id}f)" fill="${c}" stroke="${c}" font-family="Gabarito, sans-serif">
          <circle cx="200" cy="200" r="192" fill="none" stroke-width="9"/><circle cx="200" cy="200" r="141" fill="none" stroke-width="3.5"/>
          <text font-size="31" font-weight="800" stroke="none" letter-spacing="1"><textPath href="#${id}p" textLength="${(circ - 6).toFixed(1)}" lengthAdjust="spacing">${t}</textPath></text>
          <g stroke="none">${meio}</g>
        </g></svg>`;
    }
  }

  /* <fibra-isotipo valor="24.2" total="100" cols="10" cor="urucum" base="feijao" opac=".16"> */
  class Isotipo extends HTMLElement {
    connectedCallback() {
      const g = (a, d) => this.getAttribute(a) ?? d, v = parseFloat(g('valor', 24.2)), n = parseInt(g('total', 100)), cols = parseInt(g('cols', 10)), rows = Math.ceil(n / cols);
      const px = 100, py = 62, rx = 41, ry = rx * D.grao.ry / D.grao.rx, ca = cor(g('cor', 'urucum')), cb = cor(g('base', 'feijao')), op = g('opac', .16), id = 'i' + (++uid);
      let h = '';
      for (let k = 0; k < n; k++) {
        const cx = (k % cols) * px + px / 2, cy = Math.floor(k / cols) * py + py / 2, d = graoPath(cx, cy, rx, ry);
        if (k < Math.floor(v)) h += `<path d="${d}" fill="${ca}"/>`;
        else if (k < v) { const f = v - k, a = D.grao.ang * Math.PI / 180, hw = Math.hypot(rx * Math.cos(a), ry * Math.sin(a)); h += `<path d="${d}" fill="${cb}" fill-opacity="${op}"/><clipPath id="${id}"><rect x="${cx - hw}" y="${cy - py / 2}" width="${(2 * hw * f).toFixed(2)}" height="${py}"/></clipPath><path d="${d}" fill="${ca}" clip-path="url(#${id})"/>`; }
        else h += `<path d="${d}" fill="${cb}" fill-opacity="${op}"/>`;
      }
      this.innerHTML = `<svg viewBox="0 0 ${cols * px} ${rows * py}">${h}</svg>`;
    }
  }

  // ── tipografia de precisão ───────────────────────────────────────
  const ctx = document.createElement('canvas').getContext('2d');
  function medida(el, texto) {
    const cs = getComputedStyle(el); ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; ctx.letterSpacing = cs.letterSpacing;
    const t = texto ?? (cs.textTransform === 'uppercase' ? el.textContent.toUpperCase() : el.textContent).trim(), m = ctx.measureText(t), H = ctx.measureText('H');
    return { esq: -m.actualBoundingBoxLeft, dir: m.actualBoundingBoxRight, sobe: m.actualBoundingBoxAscent - H.actualBoundingBoxAscent, desce: m.actualBoundingBoxDescent };
  }
  function bloco() {
    // cada linha ocupa exatamente a largura do bloco, medida na tinta; acentos e cedilha ganham o espaço que ocupam
    document.querySelectorAll('[data-bloco]').forEach(el => {
      const cs = getComputedStyle(el), W = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), max = parseFloat(el.dataset.max || 1e9);
      el.querySelectorAll('.ln').forEach(l => {
        const alvo = l.dataset.w ? W * parseFloat(l.dataset.w) : W;
        for (let k = 0; k < 3; k++) { const m = medida(l); l.style.fontSize = Math.min(max, parseFloat(getComputedStyle(l).fontSize) * alvo / (m.dir - m.esq)) + 'px'; }
        const m = medida(l), fs = parseFloat(getComputedStyle(l).fontSize);
        l.style.transform = `translateX(${(-m.esq).toFixed(2)}px)`;
        if (m.sobe > fs * .02) l.style.marginTop = (m.sobe * .92).toFixed(1) + 'px';
        if (m.desce > fs * .02 && !l.hasAttribute('data-pendura')) l.style.marginBottom = (m.desce * .8).toFixed(1) + 'px';
      });
    });
    // data-ajusta="largura": escala o corpo para a linha mais larga ocupar a largura; .ln alinhadas pela tinta
    document.querySelectorAll('[data-ajusta]').forEach(el => {
      const alvo = parseFloat(el.dataset.ajusta), linhas = el.querySelectorAll('.ln').length ? [...el.querySelectorAll('.ln')] : [el];
      for (let k = 0; k < 3; k++) { const larg = Math.max(...linhas.map(l => { const t = medida(l); return t.dir - t.esq; })); el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * alvo / larg) + 'px'; }
    });
    document.querySelectorAll('[data-optico] .ln, .ln[data-optico], [data-ajusta] .ln').forEach(l => { const t = medida(l); l.style.transform = `translateX(${(-t.esq).toFixed(2)}px)`; });
  }
  function grade() {
    if (!/[?&]grade/.test(location.search)) return; document.documentElement.classList.add('ver-grade');
    document.querySelectorAll('.prancha[data-grade]').forEach(p => {
      const [m, n, g] = p.dataset.grade.split(',').map(Number), W = p.offsetWidth, c = (W - 2 * m - (n - 1) * g) / n;
      let h = ''; for (let i = 0; i < n; i++) h += `<div style="position:absolute;top:0;bottom:0;left:${m + i * (c + g)}px;width:${c}px;background:rgba(255,0,200,.12)"></div>`;
      h += `<div style="position:absolute;inset:${m}px;outline:1px solid rgba(0,200,255,.9)"></div>`;
      const d = document.createElement('div'); d.className = 'grade'; d.innerHTML = h; p.appendChild(d);
    });
  }

  customElements.define('fibra-logo', Logo); customElements.define('fibra-janela', Janela); customElements.define('fibra-grao', Grao);
  customElements.define('fibra-foto', Foto); customElements.define('fibra-recorte', Recorte); customElements.define('fibra-plaq', Plaq);
  customElements.define('fibra-carimbo', Carimbo); customElements.define('fibra-isotipo', Isotipo);
  customElements.define('fibra-pessoa', Pessoa); customElements.define('fibra-anel', Anel);

  // ── verificação: rostos livres, rostos inteiros, nada fora da peça ──
  function qa() {
    const RO = window.FIBRA_ROSTOS || {}, PE = window.FIBRA_PESSOAS || {}, out = [];
    const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    document.querySelectorAll('.prancha').forEach(p => {
      const nome = p.dataset.nome, P = p.getBoundingClientRect(), rostos = [];
      p.querySelectorAll('fibra-foto').forEach(f => { const n = f.getAttribute('foto'), im = f.querySelector('image'); if (!RO[n] || !im) return;
        const r = f.getBoundingClientRect(), vb = f.querySelector('svg').viewBox.baseVal, sx = r.width / vb.width, sy = r.height / vb.height;
        const x = +im.getAttribute('x'), y = +im.getAttribute('y'), w = +im.getAttribute('width'), h = +im.getAttribute('height');
        RO[n].forEach(([a, b, c, d]) => rostos.push({ el: f, foto: n, box: { left: r.left + (x + a * w) * sx, top: r.top + (y + b * h) * sy, right: r.left + (x + c * w) * sx, bottom: r.top + (y + d * h) * sy }, quadro: r })); });
      p.querySelectorAll('fibra-pessoa').forEach(f => { const n = f.getAttribute('nome'), bb = PE[n] && PE[n].bbox; if (!RO[n] || !bb) return; const r = f.querySelector('img').getBoundingClientRect();
        RO[n].forEach(([a, b, c, d]) => { const fx = v => (v - bb[0]) / (bb[2] - bb[0]), fy = v => (v - bb[1]) / (bb[3] - bb[1]);
          rostos.push({ el: f, foto: n, box: { left: r.left + fx(a) * r.width, top: r.top + fy(b) * r.height, right: r.left + fx(c) * r.width, bottom: r.top + fy(d) * r.height }, quadro: P }); }); });
      const ordem = [...p.querySelectorAll('*')];
      rostos.forEach(ro => {
        const A = (ro.box.right - ro.box.left) * (ro.box.bottom - ro.box.top), q = ro.quadro, vis = inter(ro.box, q) / A;
        if (vis < .97) out.push(`${nome}: rosto cortado pela moldura em ${ro.foto} (${Math.round(vis * 100)}% visível)`);
        const iFoto = ordem.indexOf(ro.el);
        p.querySelectorAll('fibra-plaq, fibra-carimbo, fibra-logo, fibra-recorte, fibra-isotipo, .t-bloco, p, .cobre').forEach(e => {
          if (e.contains(ro.el) || ro.el.contains(e) || ordem.indexOf(e) < iFoto) return;   // só o que está por cima
          const c = inter(ro.box, e.getBoundingClientRect()) / A; if (c > .02) out.push(`${nome}: ${e.tagName.toLowerCase()}${e.className ? '.' + String(e.className).split(' ')[0] : ''} cobre ${Math.round(c * 100)}% de um rosto em ${ro.foto}`); });
      });
      p.querySelectorAll('.t-bloco .ln, p:not(.num), fibra-plaq, fibra-logo').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && (r.left < P.left - 1 || r.right > P.right + 1 || r.bottom > P.bottom + 1 || r.top < P.top - 1)) out.push(`${nome}: ${e.tagName.toLowerCase()} sai da peça`); });
    });
    return out;
  }
  window.FIBRA = { dados: D, cor, graoPath, disposicao, fotoUrl, medida, bloco, qa,
    pronto: async () => {
      await document.fonts.ready; await Promise.all(['900 40px Gabarito', '800 40px Gabarito', '700 20px Gabarito', '600 20px Gabarito', '500 20px Gabarito', '400 20px Gabarito'].map(f => document.fonts.load(f, 'AÃÇÉ')));
      bloco(); document.querySelectorAll('fibra-foto').forEach(f => f.desenha()); grade();
      await Promise.all(espera);
      await Promise.all([...document.images].map(i => i.complete ? (i.decode ? i.decode().catch(() => 0) : 0) : new Promise(r => { i.onload = i.onerror = r; })));
      return true;
    } };
})();

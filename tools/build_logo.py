#!/usr/bin/env python3
"""Constrói o logotipo FIBRA a partir da Anton (OFL):
- silhuetas sólidas das letras (janelas de fotografia)
- contra-formas substituídas pelo "grão" (elipse inclinada)
Gera marca/letras.json, src/letras.js e os SVGs em marca/logo/."""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.areaPen import AreaPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = f'{ROOT}/marca/fontes/Anton-Regular.ttf'
CAP = 1000.0                       # altura de caixa-alta normalizada
GRAO = {'rx': 82, 'ry': 35, 'ang': -42}
TRACK = 6                        # entreletra global (unid. normalizadas)
KERN = {'FI': 0, 'IB': 0, 'BR': 0, 'RA': -30}
CORES = {'feijao': '#2A1611', 'arroz': '#F4ECD8', 'couve': '#0B7A3B', 'mata': '#073D26', 'fuba': '#FFC72C', 'anil': '#2152C8', 'dende': '#F28A1C', 'urucum': '#C8402A'}

def contours(rec):
    out, cur = [], []
    for op, a in rec:
        cur.append((op, a))
        if op in ('closePath', 'endPath'): out.append(cur); cur = []
    return out

def replay(c, pen):
    for op, a in c: getattr(pen, op)(*a)

FONT_ALTA = FONT   # a Anton já é condensada: um único conjunto de letras serve ao logotipo e às janelas
KERN_ALTA = KERN

def letter(font, ch):
    gs = font.getGlyphSet(); name = font.getBestCmap()[ord(ch)]; cap = font['OS/2'].sCapHeight; s = CAP / cap
    rec = DecomposingRecordingPen(gs); gs[name].draw(rec); cs = contours(rec.value)
    info = []
    for c in cs:
        ap = AreaPen(gs); replay(c, ap); bp = BoundsPen(gs); replay(c, bp); info.append((c, ap.value, bp.bounds))
    outer = max(info, key=lambda i: abs(i[1])); sign = outer[1] > 0
    xmin = outer[2][0]
    T = (s, 0, 0, -s, -xmin * s, cap * s)        # y para baixo; topo da caixa-alta = 0; base = 1000
    def path(c):
        sp = SVGPathPen(gs, ntos=lambda v: ('%.1f' % v).rstrip('0').rstrip('.')); replay(c, TransformPen(sp, T)); return sp.getCommands()
    outs = [i for i in info if (i[1] > 0) == sign]; holes = [i for i in info if (i[1] > 0) != sign]
    def center(b): return [round(((b[0] + b[2]) / 2 - xmin) * s, 1), round((cap - (b[1] + b[3]) / 2) * s, 1)]
    return {'d': ' '.join(path(i[0]) for i in outs), 'w': round((outer[2][2] - xmin) * s, 1),
            'top': round((cap - outer[2][3]) * s, 1), 'bot': round((cap - outer[2][1]) * s, 1),
            'miolo': ' '.join(path(i[0]) for i in holes),
            'graos': [([center(i[2])[0], 590.0] if ch == 'A' else center(i[2])) for i in sorted(holes, key=lambda i: -i[2][3])],
            'lsb': round(xmin * s, 1), 'adv': round(gs[name].width * s, 1)}

def grao_path(cx, cy, rx=None, ry=None, ang=None):
    rx = rx or GRAO['rx']; ry = ry or GRAO['ry']; a = math.radians(GRAO['ang'] if ang is None else ang); k = 0.5522847498
    pts = [(rx, 0), (rx, k * ry), (k * rx, ry), (0, ry), (-k * rx, ry), (-rx, k * ry), (-rx, 0), (-rx, -k * ry), (-k * rx, -ry), (0, -ry), (k * rx, -ry), (rx, -k * ry), (rx, 0)]
    r = [(cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)) for x, y in pts]
    f = lambda p: '%.1f %.1f' % p
    return f'M{f(r[0])}' + ''.join(f'C{f(r[i])} {f(r[i+1])} {f(r[i+2])}' for i in range(1, 13, 3)) + 'Z'

def layout(L, text, track=TRACK, kern=None):
    kern = KERN if kern is None else kern
    x = 0; items = []
    for i, ch in enumerate(text):
        items.append({'l': ch, 'x': round(x, 1)})
        if i < len(text) - 1:
            nxt = text[i + 1]; g = L[ch]
            x += g['w'] + (g['adv'] - g['lsb'] - g['w']) + L[nxt]['lsb'] + track + kern.get(ch + nxt, 0)
    return items, round(x + L[text[-1]]['w'], 1)

def shape(L, ch, x=0, y=0, graos=True):
    g = L[ch]; d = g['d'] + (' ' + ' '.join(grao_path(cx, cy) for cx, cy in g['graos']) if graos and g['graos'] else '')
    return f'<path transform="translate({x} {y})" fill-rule="evenodd" d="{d}"/>'

def svg(vb, body, fill, bg=None):
    r = f'<rect x="{vb[0]}" y="{vb[1]}" width="{vb[2]}" height="{vb[3]}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]} {vb[1]} {vb[2]} {vb[3]}">{r}<g fill="{fill}">{body}</g></svg>\n'

def main():
    font = TTFont(FONT); L = {c: letter(font, c) for c in 'FIBRA'}
    itens, W = layout(L, 'FIBRA'); top, w_top = layout(L, 'FI'); bot, w_bot = layout(L, 'BRA')
    GAP = 70                                          # entrelinha da versão empilhada
    data = {'cap': CAP, 'grao': GRAO, 'letras': L, 'logo': {'w': W, 'h': CAP, 'itens': itens},
            'pilha': {'w': max(w_top, w_bot), 'h': CAP * 2 + GAP, 'linhas': [{'y': 0, 'itens': top, 'w': w_top}, {'y': CAP + GAP, 'itens': bot, 'w': w_bot}]},
            'cores': CORES}
    # conjunto alto (largura normal)
    fa = TTFont(FONT_ALTA); LA = {c: letter(fa, c) for c in 'FIBRA'}
    ia, wa = layout(LA, 'FIBRA', TRACK, KERN_ALTA); ta, wta = layout(LA, 'FI', TRACK, KERN_ALTA); ba, wba = layout(LA, 'BRA', TRACK, KERN_ALTA)
    data['alta'] = {'letras': LA, 'logo': {'w': wa, 'h': CAP, 'itens': ia}, 'pilha': {'w': max(wta, wba), 'h': CAP * 2 + GAP, 'linhas': [{'y': 0, 'itens': ta, 'w': wta}, {'y': CAP + GAP, 'itens': ba, 'w': wba}]}}
    json.dump(data, open(f'{ROOT}/marca/letras.json', 'w'))
    os.makedirs(f'{ROOT}/src', exist_ok=True)
    open(f'{ROOT}/src/letras.js', 'w').write('window.FIBRA_DADOS = ' + json.dumps(data) + ';\n')
    out = f'{ROOT}/marca/logo'; os.makedirs(out, exist_ok=True)
    horiz = ''.join(shape(L, i['l'], i['x']) for i in itens)
    solido = ''.join(shape(L, i['l'], i['x'], graos=False) for i in itens)
    pilha = ''.join(shape(L, i['l'], i['x'], ln['y']) for ln in data['pilha']['linhas'] for i in ln['itens'])
    # símbolo: F + grão
    F = L['F']; sim_w = F['w']; gx, gy = F['w'] * 0.80, 800.0
    simbolo = shape(L, 'F') + f'<path d="{grao_path(gx, gy, 118, 50)}"/>'
    data['simbolo'] = {'w': sim_w, 'grao': [gx, gy, 118, 50]}
    json.dump(data, open(f'{ROOT}/marca/letras.json', 'w'))
    open(f'{ROOT}/src/letras.js', 'w').write('window.FIBRA_DADOS = ' + json.dumps(data) + ';\n')
    for nome, cor in CORES.items():
        open(f'{out}/fibra-logo-{nome}.svg', 'w').write(svg((0, 0, W, CAP), horiz, cor))
        open(f'{out}/fibra-empilhado-{nome}.svg', 'w').write(svg((0, 0, data['pilha']['w'], data['pilha']['h']), pilha, cor))
        open(f'{out}/fibra-simbolo-{nome}.svg', 'w').write(svg((0, 0, sim_w, CAP), simbolo, cor))
    open(f'{out}/fibra-silhueta-feijao.svg', 'w').write(svg((0, 0, W, CAP), solido, CORES['feijao']))
    for c in 'FIBRA':
        open(f'{out}/letra-{c}.svg', 'w').write(svg((0, 0, L[c]['w'], CAP), shape(L, c, graos=False), CORES['feijao']))
    open(f'{out}/grao.svg', 'w').write(svg((-120, -70, 240, 140), f'<path d="{grao_path(0, 0)}"/>', CORES['feijao']))
    print('logo', W, 'x', CAP, '| pilha', data['pilha']['w'], 'x', data['pilha']['h'])
    for c in 'FIBRA':
        open(f'{out}/letra-alta-{c}.svg', 'w').write(svg((0, 0, LA[c]['w'], CAP), f'<path d="{LA[c]["d"]}"/>', CORES['feijao']))
    print('ALTA', ' '.join(f"{c}={LA[c]['w']}" for c in 'FIBRA'), '| logo', wa)
    for c in 'FIBRA': print(c, 'w', L[c]['w'], 'top', L[c]['top'], 'bot', L[c]['bot'], 'graos', L[c]['graos'], 'lsb', L[c]['lsb'], 'adv', L[c]['adv'])

if __name__ == '__main__': main()

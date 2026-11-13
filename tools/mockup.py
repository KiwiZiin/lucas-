#!/usr/bin/env python3
"""Aplica as artes da FIBRA em fotografias reais (Adobe Stock) com perspectiva, luz e textura da cena.
modos: papel (superfície branca: preserva sombras e reflexos) · vinil (adesivo sobre pintura) · tinta (impressão sobre kraft/tecido)."""
import cv2, numpy as np, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CENA = f'{R}/fotos/trabalho'; ARTE = '/tmp/claude-0/-home-user-lucas-/0d3f7e90-dd37-558c-a2ec-9141744b3677/scratchpad/arte'; SAI = f'{R}/entregas/04-mockups'
CENAS = {
 '01-outdoor':         dict(cena='mk-outdoor',  arte='arte-outdoor-a', quad=[(354, 274), (3141, 944), (3230, 1942), (134, 1608)], modo='papel'),
 '02-outdoor-cidade':  dict(cena='mk-outdoor2', arte='arte-outdoor-b', quad=[(700, 735), (3800, 740), (3960, 1650), (575, 1655)], modo='papel', refina=True),
 '03-tapume':          dict(cena='mk-tapume',   arte='arte-tapume',    quad=[(0, 1686), (4123, 1684), (4123, 2528), (0, 2525)], modo='papel'),
 '04-parede':          dict(cena='mk-parede',   arte='arte-parede',    quad=[(1361, 454), (3825, 454), (3825, 2129), (1360, 2130)], modo='papel'),
 '05-ponto-de-onibus': dict(cena='mk-onibus',   arte='arte-mub-R',     quad=[(861, 749), (1990, 752), (1994, 2404), (864, 2413)], modo='papel'),
 '06-totem':           dict(cena='mk-totem',    arte='arte-mub-B',     quad=[(2184, 319), (3337, 216), (3389, 2034), (2172, 2001)], modo='papel', refina=True),
 '07-caminhao':        dict(cena='mk-caminhao', arte='arte-caminhao',  quad=[(480, 500), (2590, 540), (2575, 1905), (480, 1850)], modo='vinil'),
 '08-caixa':           dict(cena='mk-caixa',    arte='arte-caixa',     quad=[(1757, 1024), (3852, 923), (3844, 1963), (1791, 2334)], modo='tinta', margem=.045),
 '09-ecobag':          dict(cena='mk-ecobag',   arte='arte-ecobag',    quad=[(2620, 1560), (3760, 1600), (3700, 2400), (2640, 2360)], modo='tinta'),
}

def ordena(q):
    q = np.array(q, float); s = q.sum(1); d = np.diff(q, axis=1).ravel()
    return np.array([q[s.argmin()], q[d.argmin()], q[s.argmax()], q[d.argmax()]], np.float32)

def refina(img, quad):
    """Ajusta o quadrilátero estimado à área branca real: ajusta uma reta a cada lado do contorno e cruza as retas."""
    h, w = img.shape[:2]; c = quad.mean(0); ext = (c + (quad - c) * 1.06).astype(np.int32)
    zona = np.zeros((h, w), np.uint8); cv2.fillPoly(zona, [ext], 255)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV); m = ((hsv[..., 2] > 236) & (hsv[..., 1] < 18)).astype(np.uint8) * 255
    m = cv2.morphologyEx(cv2.bitwise_and(m, zona), cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not cs: return quad
    pts = max(cs, key=cv2.contourArea).reshape(-1, 2).astype(np.float32); tam = np.linalg.norm(quad[2] - quad[0]); retas = []
    for i in range(4):
        a, b = quad[i], quad[(i + 1) % 4]; d = (b - a) / np.linalg.norm(b - a); n = np.array([-d[1], d[0]])
        t = (pts - a) @ d / np.linalg.norm(b - a); dist = np.abs((pts - a) @ n)
        sel = pts[(t > .12) & (t < .88) & (dist < .035 * tam)]
        if len(sel) < 30: retas.append((a, d)); continue
        vx, vy, x0, y0 = cv2.fitLine(sel, cv2.DIST_HUBER, 0, .01, .01).ravel(); retas.append((np.array([x0, y0]), np.array([vx, vy])))
    novo = []
    for i in range(4):   # canto i = cruzamento do lado anterior com o lado i
        (p1, d1), (p2, d2) = retas[(i - 1) % 4], retas[i]; A = np.array([d1, -d2]).T
        try: t = np.linalg.solve(A, p2 - p1); novo.append(p1 + t[0] * d1)
        except np.linalg.LinAlgError: novo.append(quad[i])
    novo = np.array(novo, np.float32)
    return novo if np.abs(novo - quad).max() < .08 * max(w, h) else quad

def compoe(nome, c):
    img = cv2.imread(f"{CENA}/{c['cena']}.jpg"); H, W = img.shape[:2]
    arte = cv2.imread(f"{ARTE}/{c['arte']}.png"); quad = ordena(c['quad'])
    if c.get('refina'): quad = refina(img, quad)
    if c.get('margem'):
        ce = quad.mean(0); quad = (ce + (quad - ce) * (1 - c['margem'] * 2)).astype(np.float32)
    lw = int(max(np.linalg.norm(quad[1] - quad[0]), np.linalg.norm(quad[2] - quad[3])) * 1.6); lh = int(max(np.linalg.norm(quad[3] - quad[0]), np.linalg.norm(quad[2] - quad[1])) * 1.6)
    arte = cv2.resize(arte, (lw, lh), interpolation=cv2.INTER_AREA)
    src = np.float32([[0, 0], [lw, 0], [lw, lh], [0, lh]]); M = cv2.getPerspectiveTransform(src, quad)
    wa = cv2.warpPerspective(arte, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
    wa = cv2.GaussianBlur(wa, (0, 0), .7)
    mask = cv2.warpPerspective(np.full((lh, lw), 255, np.uint8), M, (W, H), flags=cv2.INTER_LINEAR).astype(np.float32) / 255
    f = img.astype(np.float32); L = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.6)
    dentro = mask > .99
    if c['modo'] == 'papel':
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV); sup = ((hsv[..., 2] > 120) & (hsv[..., 1] < 90)).astype(np.uint8) * 255
        sup = cv2.morphologyEx(sup, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8)); sup = cv2.GaussianBlur(sup, (0, 0), 1.2).astype(np.float32) / 255
        mask = mask * sup; ref = np.percentile(L[dentro], 97); sombra = np.clip(L / ref, .45, 1.0)
        tom = np.array([np.percentile(f[..., k][dentro], 97) for k in range(3)]); tom = tom / tom.max()
        res = wa * sombra[..., None] * tom[None, None, :] * .985
    elif c['modo'] == 'vinil':
        ref = np.median(L[dentro]); sombra = np.clip(L / ref, .55, 1.18); res = wa * sombra[..., None]
    else:   # tinta: multiplica sobre o suporte, mantendo a textura do papelão / tecido
        tinta = 1 - (1 - wa / 255) * .94; res = f * tinta
    ruido = np.random.default_rng(7).normal(0, 1.6, (H, W, 1)).astype(np.float32)
    res = np.clip(res + ruido, 0, 255); out = f * (1 - mask[..., None]) + res * mask[..., None]
    os.makedirs(SAI, exist_ok=True); arq = f'{SAI}/fibra-mockup-{nome}.jpg'
    cv2.imwrite(arq, np.clip(out, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 93]); print('✓', os.path.relpath(arq, R), f'{W}×{H}', quad.astype(int).tolist())

if __name__ == '__main__':
    so = sys.argv[1:]
    for n, c in CENAS.items():
        if not so or any(s in n for s in so): compoe(n, c)

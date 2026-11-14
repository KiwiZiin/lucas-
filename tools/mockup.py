#!/usr/bin/env python3
"""Aplica as artes da FIBRA em fotografias reais (Adobe Stock) com perspectiva, luz e textura da cena.
modos: papel (superfície branca: preserva sombras e reflexos) · vinil (adesivo sobre pintura) · tinta (impressão sobre kraft/tecido)."""
import cv2, numpy as np, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CENA = f'{R}/fotos/trabalho'; ARTE = '/tmp/claude-0/-home-user-lucas-/0d3f7e90-dd37-558c-a2ec-9141744b3677/scratchpad/arte'; SAI = f'{R}/entregas/04-mockups'
CENAS = {
 '01-outdoor':         dict(cena='mk-outdoor',  arte='arte-outdoor-a', quad=[(356, 275), (3145, 941), (3232, 1933), (138, 1594)], modo='papel', refina=True),
 '02-outdoor-cidade':  dict(cena='mk-outdoor2', arte='arte-outdoor-b', quad=[(705, 722), (3767, 757), (3956, 1659), (577, 1659)], modo='papel', refina=True),
 '03-tapume':          dict(cena='mk-tapume',   arte='arte-tapume',    quad=[(-3, 1686), (4127, 1684), (4127, 2529), (-3, 2527)], modo='papel', refina=True),
 '04-parede':          dict(cena='mk-parede',   arte='arte-parede',    quad=[(1361, 454), (3825, 454), (3825, 2129), (1360, 2130)], modo='papel', refina=True),
 '05-ponto-de-onibus': dict(cena='mk-onibus',   arte='arte-mub-R',     quad=[(861, 749), (1990, 752), (1994, 2404), (864, 2413)], modo='papel', refina=True),
 '06-totem':           dict(cena='mk-totem',    arte='arte-mub-B',     quad=[(2181, 292), (3386, 183), (3434, 2043), (2170, 2004)], modo='papel', refina=True),
 '07-caminhao':        dict(cena='mk-caminhao', arte='arte-caminhao',  quad=[(480, 500), (2590, 540), (2575, 1905), (480, 1850)], modo='vinil'),
 '08-caixa':           dict(cena='mk-entrega',  arte='arte-caixa',     quad=[(1205, 1490), (3170, 1340), (3155, 2495), (1220, 2555)], modo='tinta', luvas=True, maos=[[(2700, 2040), (3260, 2040), (3260, 2660), (2700, 2660)], [(1100, 2250), (1460, 2250), (1460, 2630), (1100, 2630)]]),
 '09-ecobag':          dict(cena='mk-ecobag',   arte='arte-ecobag',    quad=[(2560, 1480), (3700, 1490), (3660, 2380), (2600, 2360)], modo='tinta'),
}

def ordena(q):   # os cantos já são declarados em ordem: sup-esq, sup-dir, inf-dir, inf-esq
    return np.array(q, np.float32)

def refina(img, quad, R=70, folga=1.2):
    """Ajuste fino dos cantos por contraste de borda (subpixel).
    Em ~120 pontos de cada lado, mede o perfil de claridade na direção perpendicular e localiza onde a superfície branca
    termina; ajusta uma reta robusta a esses pontos e cruza as quatro retas. Pontos sem contraste (nuvem atrás da borda,
    fora da imagem) são ignorados. `folga` empurra cada lado 1,2 px para fora, para não sobrar filete branco."""
    h, w = img.shape[:2]; br = cv2.GaussianBlur(img.min(axis=2).astype(np.float32), (0, 0), 1.0); c = quad.mean(0); retas = []
    rr = np.arange(-R, R + .01, .5, dtype=np.float32); k = len(rr) // 4
    for i in range(4):
        a, b = quad[i], quad[(i + 1) % 4]; L = np.linalg.norm(b - a); d = (b - a) / L; n = np.array([d[1], -d[0]], np.float32)
        if (c - a) @ n > 0: n = -n
        pts = []
        for t in np.linspace(.05, .95, 120):
            p0 = a + d * (t * L); xs = p0[0] + rr * n[0]; ys = p0[1] + rr * n[1]
            if xs.min() < 1 or ys.min() < 1 or xs.max() > w - 2 or ys.max() > h - 2: continue
            prof = cv2.remap(br, xs.reshape(1, -1).astype(np.float32), ys.reshape(1, -1).astype(np.float32), cv2.INTER_LINEAR).ravel()
            vi, vo = np.median(prof[:k]), np.median(prof[-k:])
            if vi - vo < 25: continue
            thr = (vi + vo) / 2; idx = np.where(prof < thr)[0]
            if not len(idx) or idx[0] == 0: continue
            j = idx[0]; f = (prof[j - 1] - thr) / max(prof[j - 1] - prof[j], 1e-6); pts.append(p0 + n * (rr[j - 1] + f * .5))
        if len(pts) < 12: retas.append((a.astype(np.float32) + n * folga, d.astype(np.float32))); continue
        vx, vy, x0, y0 = cv2.fitLine(np.array(pts, np.float32), cv2.DIST_HUBER, 0, .01, .01).ravel()
        retas.append((np.array([x0, y0], np.float32) + n * folga, np.array([vx, vy], np.float32)))
    novo = []
    for i in range(4):
        (p1, d1), (p2, d2) = retas[(i - 1) % 4], retas[i]; A = np.array([d1, -d2], np.float64).T
        tt = np.linalg.solve(A, (p2 - p1).astype(np.float64)); novo.append(p1 + tt[0] * d1)
    return np.array(novo, np.float32)

def compoe(nome, c):
    img = cv2.imread(f"{CENA}/{c['cena']}.jpg"); H, W = img.shape[:2]
    arte = cv2.imread(f"{ARTE}/{c['arte']}.png"); quad = ordena(c['quad'])
    if c.get('refina'): quad = refina(img, quad, **c.get('ajuste', {}))
    c['_quad'] = quad
    if c.get('margem'):
        ce = quad.mean(0); quad = (ce + (quad - ce) * (1 - c['margem'] * 2)).astype(np.float32)
    lw = int(max(np.linalg.norm(quad[1] - quad[0]), np.linalg.norm(quad[2] - quad[3])) * 1.6); lh = int(max(np.linalg.norm(quad[3] - quad[0]), np.linalg.norm(quad[2] - quad[1])) * 1.6)
    arte = cv2.resize(arte, (lw, lh), interpolation=cv2.INTER_AREA)
    src = np.float32([[0, 0], [lw, 0], [lw, lh], [0, lh]]); M = cv2.getPerspectiveTransform(src, quad)
    wa = cv2.warpPerspective(arte, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
    wa = cv2.GaussianBlur(wa, (0, 0), .7)
    S = 4   # máscara do quadrilátero desenhada a 4× e reduzida: borda antisserrilhada e exata
    big = np.zeros((H * S, W * S), np.uint8); cv2.fillPoly(big, [np.round(quad * S).astype(np.int32)], 255)
    mask = cv2.resize(big, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    f = img.astype(np.float32); L = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.6)
    dentro = mask > .99
    if c['modo'] == 'papel':
        ref = np.percentile(L[dentro], 97); sombra = np.clip(L / ref, .45, 1.0)
        tom = np.array([np.percentile(f[..., k][dentro], 97) for k in range(3)]); tom = tom / tom.max()
        res = wa * sombra[..., None] * tom[None, None, :] * .985
    elif c['modo'] == 'vinil':
        ref = np.median(L[dentro]); sombra = np.clip(L / ref, .55, 1.18); res = wa * sombra[..., None]
    else:   # tinta: multiplica sobre o suporte, mantendo a textura do papelão / tecido
        tinta = 1 - (1 - wa / 255) * .94; res = f * tinta
        if c.get('luvas'):   # luvas brancas na frente da caixa: preserva o que é claro e sem cor
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV); lv = (((hsv[..., 2] > 215) & (hsv[..., 1] < 16)) | (hsv[..., 1] > 75)).astype(np.uint8) * 255   # luvas e verduras na frente
            zona = np.zeros(hsv.shape[:2], np.uint8); cv2.fillPoly(zona, [np.array(m, np.int32) for m in c.get('maos', [])], 255)
            hh = hsv[..., 0].astype(np.float32); verde = np.clip((hsv[..., 1].astype(np.float32) - 30) / 15, 0, 1) * np.clip(np.minimum(hh - 28, 98 - hh) / 6, 0, 1)   # folhas: matiz verde; papelão: laranja
            luva = np.clip((24 - hsv[..., 1].astype(np.float32)) / 10, 0, 1) * (cv2.GaussianBlur(zona, (0, 0), 3) / 255.)
            lv = cv2.GaussianBlur(np.maximum(verde, luva), (0, 0), .8); mask = mask * (1 - lv)
    ruido = np.random.default_rng(7).normal(0, 1.6, (H, W, 1)).astype(np.float32)
    res = np.clip(res + ruido, 0, 255); out = f * (1 - mask[..., None]) + res * mask[..., None]
    os.makedirs(SAI, exist_ok=True); arq = f'{SAI}/fibra-mockup-{nome}.jpg'
    cv2.imwrite(arq, np.clip(out, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 93]); print('✓', os.path.relpath(arq, R), f'{W}×{H}', quad.astype(int).tolist())

if __name__ == '__main__':
    so = sys.argv[1:]
    for n, c in CENAS.items():
        if not so or any(s in n for s in so): compoe(n, c)

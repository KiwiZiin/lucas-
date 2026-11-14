#!/usr/bin/env python3
"""Recorta objetos fotografados em fundo branco (Adobe Stock) e gera dois PNGs:
- fotos/recortes/<nome>.png        recorte justo, com alfa
- fotos/recortes/<nome>-papel.png  recorte com borda de papel (adesivo), para colagem
Segmentação: limiar de diferença para o fundo + GrabCut para separar sombra suave."""
import os, sys, json
import numpy as np, cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = f'{ROOT}/fotos/originais'
OUT = f'{ROOT}/fotos/recortes'
PAPEL = (241, 248, 251)          # BGR do papel da borda (≈ #FBF8F1)
LADO = 2000                      # maior lado exportado

# nome: (id, recorte (x0,y0,x1,y1) em fração da imagem ou None, limiar)
CFG = {
    'mandioca-folha': ('309940340', None, 22),
    'mandioca':       ('196879036', None, 22),
    'banana':         ('661969000', None, 22),
    'milho':          ('87760868', None, 22),
    'milho-2':        ('424990080', None, 22),
    'abobora':        ('262711757', None, 22),
    'chapeu':         ('210567400', None, 20),
    'peneira':        ('483748408', None, 20),
    'panela-pressao': ('312113483', None, ('borda', (0.0, 0.0, 0.345, 0.445))),
    'caneca':         ('536442310', (0.27, 0.58, 0.80, 0.852), ('borda', None)),
    'prendedor':      ('1553223320', (0.12, 0.0, 0.50, 1.0), 22),
}

def mascara_ret(img):
    # fundo em degradê: GrabCut a partir de um retângulo, sem preencher buracos (alça da caneca)
    h, w = img.shape[:2]; e = 1000 / max(h, w)
    sm = cv2.resize(img, None, fx=e, fy=e, interpolation=cv2.INTER_AREA) if e < 1 else img.copy()
    gs = np.zeros(sm.shape[:2], np.uint8); bg, fg = np.zeros((1, 65)), np.zeros((1, 65))
    mh, mw = int(sm.shape[0] * .03), int(sm.shape[1] * .03)
    cv2.grabCut(sm, gs, (mw, mh, sm.shape[1] - 2 * mw, sm.shape[0] - 2 * mh), bg, fg, 10, cv2.GC_INIT_WITH_RECT)
    r = np.where((gs == cv2.GC_FGD) | (gs == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    r = cv2.resize(r, (w, h), interpolation=cv2.INTER_LINEAR)
    r = (r > 127).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(r)
    if n > 1:
        r = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
    return r

def mascara_borda(img, excl=None):
    # objetos metálicos ou claros em fundo claro: contorno por gradiente, preenchido
    h, w = img.shape[:2]
    g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.6)
    mag = cv2.magnitude(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1))
    m = (mag > 14).astype(np.uint8)
    if excl:
        x0, y0, x1, y1 = excl; m[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = 0
    k = max(5, int(min(h, w) * 0.012) | 1)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    inv = (1 - m).copy(); ff = np.zeros((h + 2, w + 2), np.uint8); cv2.floodFill(inv, ff, (0, 0), 0); m = m | inv
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n > 1: m = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
    return cv2.erode(m, np.ones((3, 3), np.uint8))

def mascara(img, lim):
    if lim == 'ret': return mascara_ret(img)
    if isinstance(lim, tuple) and lim[0] == 'borda': return mascara_borda(img, lim[1])
    h, w = img.shape[:2]
    borda = np.concatenate([img[:8].reshape(-1, 3), img[-8:].reshape(-1, 3), img[:, :8].reshape(-1, 3), img[:, -8:].reshape(-1, 3)])
    fundo = np.median(borda, axis=0)
    dif = np.abs(img.astype(np.int16) - fundo.astype(np.int16)).max(axis=2)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    m = ((dif > lim) | (hsv[..., 1] > 40)).astype(np.uint8)
    k = max(3, int(min(h, w) * 0.004) | 1)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((k, k), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((k * 3, k * 3), np.uint8))
    # GrabCut: certeza dentro do núcleo, provável na borda, fundo fora
    gc = np.full((h, w), cv2.GC_BGD, np.uint8)
    dil = cv2.dilate(m, np.ones((k * 6, k * 6), np.uint8))
    ero = cv2.erode(m, np.ones((k * 4, k * 4), np.uint8))
    gc[dil > 0] = cv2.GC_PR_BGD; gc[m > 0] = cv2.GC_PR_FGD; gc[ero > 0] = cv2.GC_FGD
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    escala = 1200 / max(h, w)
    if escala < 1:
        sm = cv2.resize(img, None, fx=escala, fy=escala, interpolation=cv2.INTER_AREA)
        gs = cv2.resize(gc, (sm.shape[1], sm.shape[0]), interpolation=cv2.INTER_NEAREST)
        cv2.grabCut(sm, gs, None, bg, fg, 5, cv2.GC_INIT_WITH_MASK)
        r = np.where((gs == cv2.GC_FGD) | (gs == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
        r = cv2.resize(r, (w, h), interpolation=cv2.INTER_LINEAR)
        r = np.where(r > 127, 1, 0).astype(np.uint8)
    else:
        cv2.grabCut(img, gc, None, bg, fg, 5, cv2.GC_INIT_WITH_MASK)
        r = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 1, 0).astype(np.uint8)
    # mantém componentes relevantes e preenche buracos
    n, lab, st, _ = cv2.connectedComponentsWithStats(r)
    if n > 1:
        maior = st[1:, cv2.CC_STAT_AREA].max()
        r = np.isin(lab, [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > maior * 0.02]).astype(np.uint8)
    inv = (1 - r).copy(); ff = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(inv, ff, (0, 0), 0)
    r = r | inv
    return r

def exporta(nome, img, m):
    ys, xs = np.where(m > 0)
    pad = int(max(img.shape[:2]) * 0.03)
    y0, y1, x0, x1 = max(0, ys.min() - pad), min(img.shape[0], ys.max() + pad), max(0, xs.min() - pad), min(img.shape[1], xs.max() + pad)
    img, m = img[y0:y1, x0:x1], m[y0:y1, x0:x1]
    s = LADO / max(img.shape[:2])
    if s < 1:
        img = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        m = cv2.resize(m.astype(np.float32), (img.shape[1], img.shape[0]), interpolation=cv2.INTER_AREA)
    a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 0.9)
    a = np.clip((a - 0.5) * 1.6 + 0.5, 0, 1)
    rgba = np.dstack([img, (a * 255).astype(np.uint8)])
    cv2.imwrite(f'{OUT}/{nome}.png', rgba)
    # borda de papel: dilatação proporcional, cantos arredondados pelo blur
    r = max(6, int(max(img.shape[:2]) * 0.014))
    pad2 = r * 3
    big = cv2.copyMakeBorder(rgba, pad2, pad2, pad2, pad2, cv2.BORDER_CONSTANT, value=(0, 0, 0, 0))
    am = big[..., 3].astype(np.float32) / 255
    disco = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    borda = cv2.dilate((am > 0.5).astype(np.uint8), disco).astype(np.float32)
    borda = cv2.GaussianBlur(borda, (0, 0), r * 0.35); borda = np.clip((borda - 0.5) * 3 + 0.5, 0, 1)
    out = np.zeros_like(big, dtype=np.float32)
    for c in range(3):
        out[..., c] = big[..., c] * am + PAPEL[c] * (1 - am)
    out[..., 3] = np.maximum(borda, am) * 255
    cv2.imwrite(f'{OUT}/{nome}-papel.png', out.astype(np.uint8))
    return img.shape[1], img.shape[0]

def main():
    os.makedirs(OUT, exist_ok=True)
    so = sys.argv[1:]
    info = {}
    for nome, (i, crop, lim) in CFG.items():
        if so and nome not in so: continue
        img = cv2.imread(f'{ORIG}/AdobeStock_{i}.jpg')
        if crop:
            h, w = img.shape[:2]; x0, y0, x1, y1 = crop
            img = img[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]
        m = mascara(img, lim)
        info[nome] = {'id': int(i), 'tamanho': exporta(nome, img, m)}
        print(nome, info[nome])
    p = f'{OUT}/recortes.json'
    old = json.load(open(p)) if os.path.exists(p) else {}
    old.update(info); json.dump(old, open(p, 'w'), indent=1)

if __name__ == '__main__': main()

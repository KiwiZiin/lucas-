#!/usr/bin/env python3
"""FIBRA v6 — mockups fotográficos.
A arte é aplicada como acontece no mundo físico:
- tinta: impressão sobre o suporte (multiplicação), herdando fibra, dobra e sombra do material;
- papel: cartaz colado no muro (arte × sombreamento do papel em branco da foto), com o canto descolado preservado;
- tela: conteúdo emissivo na tela do celular, recortado pela oclusão real dos dedos;
- objeto: cartão impresso pousado sobre a cena, com sombra.
Deslocamento pelas dobras: o gradiente de luz do suporte empurra a arte alguns pixels, como o relevo faz."""
import os, sys, json
import numpy as np, cv2

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = f'{R}/fotos/originais'; TRAB = f'{R}/fotos/trabalho'
ARTE = '/tmp/claude-0/-home-user-lucas-/0d3f7e90-dd37-558c-a2ec-9141744b3677/scratchpad/arte'
SAI = f'{R}/entregas/05-mockups'
ARROZ = np.array([216, 236, 244], np.float32)   # BGR de #F4ECD8

def cena_px(q, W, H):
    return np.array([[x * W if x <= 1.5 else x, y * H if y <= 1.5 else y] for x, y in q], np.float32)

def mascara_quad(quad, W, H, S=4):
    big = np.zeros((H * S, W * S), np.uint8); cv2.fillPoly(big, [np.round(quad * S).astype(np.int32)], 255)
    return cv2.resize(big, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255

def poligono(pts, W, H, S=4):
    return mascara_quad(np.array(pts, np.float32), W, H, S)

def le_arte(nome, fundo=(255, 255, 255)):
    a = cv2.imread(f'{ARTE}/{nome}', cv2.IMREAD_UNCHANGED)
    if a.shape[2] == 4:   # achata sobre o fundo
        al = a[..., 3:4].astype(np.float32) / 255; a = (a[..., :3] * al + np.array(fundo, np.float32) * (1 - al)).astype(np.uint8)
    return a

def warp(arte, quad, W, H):
    lw = int(max(np.linalg.norm(quad[1] - quad[0]), np.linalg.norm(quad[2] - quad[3])) * 1.5)
    lh = int(max(np.linalg.norm(quad[3] - quad[0]), np.linalg.norm(quad[2] - quad[1])) * 1.5)
    a = cv2.resize(arte, (lw, lh), interpolation=cv2.INTER_AREA)
    M = cv2.getPerspectiveTransform(np.float32([[0, 0], [lw, 0], [lw, lh], [0, lh]]), quad)
    return cv2.warpPerspective(a, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)

def desloca(img_f, base, k, sigma=4.0):
    if not k: return img_f
    L = cv2.GaussianBlur(cv2.cvtColor(base, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), sigma)
    gx = cv2.Sobel(L, cv2.CV_32F, 1, 0, ksize=3) / 8; gy = cv2.Sobel(L, cv2.CV_32F, 0, 1, ksize=3) / 8
    lim = 4 * k; dx = np.clip(gx * k, -lim, lim); dy = np.clip(gy * k, -lim, lim)
    H, W = L.shape; xs, ys = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    return cv2.remap(img_f, xs + dx, ys + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

def fundo_arroz(base, limiar=14):
    # troca o fundo branco de estúdio pelo arroz, preservando a sombra projetada
    f = base.astype(np.float32); dif = (255 - f).max(axis=2)
    obj = (dif > limiar).astype(np.uint8)
    obj = cv2.morphologyEx(obj, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(obj)
    if n > 1: obj = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
    # só fecha buracos pequenos: o vão entre as alças continua sendo fundo
    nn, ll, ss, _ = cv2.connectedComponentsWithStats((1 - obj).astype(np.uint8))
    for i in range(1, nn):
        if ss[i, cv2.CC_STAT_AREA] < 0.0015 * obj.size: obj[ll == i] = 1
    obj = cv2.erode(obj, np.ones((3, 3), np.uint8)); m = cv2.GaussianBlur(obj.astype(np.float32), (0, 0), 1.0)[..., None]
    return f * m + (f * ARROZ / 255) * (1 - m)

def grava(nome, out):
    os.makedirs(SAI, exist_ok=True); arq = f'{SAI}/fibra-mockup-{nome}.jpg'
    out = np.clip(out, 0, 255).astype(np.uint8)
    cv2.imwrite(arq, out, [cv2.IMWRITE_JPEG_QUALITY, 92]); print('✓', os.path.relpath(arq, R), f'{out.shape[1]}×{out.shape[0]}')

def ruido(H, W, s=1.4, seed=7):
    return np.random.default_rng(seed).normal(0, s, (H, W, 1)).astype(np.float32)

# ── cenas ───────────────────────────────────────────────────────
def tinta(nome, base_arq, arte_nome, quad, k=0.6, opac=.93, estudio=False, sigma=4.0, excl=None):
    base = cv2.imread(base_arq); H, W = base.shape[:2]; q = cena_px(quad, W, H)
    arte = warp(le_arte(arte_nome), q, W, H); arte = desloca(arte, base, k, sigma); arte = cv2.GaussianBlur(arte, (0, 0), .6)
    m = mascara_quad(q, W, H)
    if excl: m *= 1 - poligono(cena_px(excl, W, H), W, H)
    f = fundo_arroz(base) if estudio else base.astype(np.float32)
    ink = 1 - (1 - arte / 255) * opac
    out = f * (1 - m[..., None]) + f * ink * m[..., None]
    grava(nome, out + ruido(H, W, 1.0) * m[..., None])

def papel(nome, base_arq, arte_nome, quad, k=1.4, excl=None, margem_papel=True, sigma=9.0):
    base = cv2.imread(base_arq); H, W = base.shape[:2]; q = cena_px(quad, W, H)
    a = le_arte(arte_nome)
    if margem_papel:   # o cartaz 3:4 impresso numa folha 2:3: sobra papel em cima e embaixo
        qw = (np.linalg.norm(q[1] - q[0]) + np.linalg.norm(q[2] - q[3])) / 2; qh = (np.linalg.norm(q[3] - q[0]) + np.linalg.norm(q[2] - q[1])) / 2
        fh = int(a.shape[1] * qh / qw); folha = np.full((fh, a.shape[1], 3), 252, np.uint8); y0 = (fh - a.shape[0]) // 2
        if y0 >= 0: folha[y0:y0 + a.shape[0]] = a; a = folha
    arte = desloca(warp(a, q, W, H), base, k, sigma)
    m = mascara_quad(q, W, H)
    if excl: m *= 1 - cv2.GaussianBlur(poligono(cena_px(excl, W, H), W, H), (0, 0), 2)
    L = cv2.GaussianBlur(cv2.cvtColor(base, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.2)
    dentro = m > .99; ref = np.percentile(L[dentro], 97)
    sombra = np.clip(L / ref, .35, 1.04)[..., None]
    tom = np.array([np.percentile(base[..., c][dentro], 97) for c in range(3)], np.float32); tom = tom / tom.max()
    res = arte * sombra * tom * .985
    f = base.astype(np.float32); out = f * (1 - m[..., None]) + res * m[..., None]
    grava(nome, out + ruido(H, W, 1.3) * m[..., None])

def tela(nome, base_arq, arte_nome, quad, contorno):
    base = cv2.imread(base_arq); H, W = base.shape[:2]; q = cena_px(quad, W, H)
    arte = cv2.GaussianBlur(warp(le_arte(arte_nome), q, W, H), (0, 0), .8)
    big = np.zeros((H, W), np.uint8); cv2.fillPoly(big, [np.round(np.load(contorno)).astype(np.int32)], 255)
    big = cv2.erode(big, np.ones((5, 5), np.uint8)); m = cv2.GaussianBlur(big.astype(np.float32) / 255, (0, 0), 1.6)
    # leve reflexo diagonal do ambiente, como no vidro
    xs, ys = np.meshgrid(np.linspace(0, 1, W, dtype=np.float32), np.linspace(0, 1, H, dtype=np.float32))
    brilho = np.clip(1 - np.abs((xs + ys) - .95) * 3, 0, 1)[..., None] * 10
    res = arte * .965 + brilho
    f = base.astype(np.float32); out = f * (1 - m[..., None]) + res * m[..., None]
    grava(nome, out)

def objeto(nome, base_arq, arte_nome, centro, largura, ang, sombra=(28, 40, 34, .42), inclina=(0, 0)):
    base = cv2.imread(base_arq); H, W = base.shape[:2]
    a = le_arte(arte_nome); ar = a.shape[0] / a.shape[1]; w = largura * W; h = w * ar
    cx, cy = centro[0] * W, centro[1] * H; t = np.radians(ang)
    pts = np.array([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], np.float32)
    pts[:, 0] *= np.array([1 - inclina[0], 1 - inclina[0], 1 + inclina[0], 1 + inclina[0]], np.float32)   # leve escorço: o cartão não está plano
    rot = np.array([[np.cos(t), -np.sin(t)], [np.sin(t), np.cos(t)]], np.float32); q = (pts @ rot.T + [cx, cy]).astype(np.float32)
    arte = warp(a, q, W, H); m = mascara_quad(q, W, H)
    dx, dy, bl, op = sombra; sm = cv2.GaussianBlur(np.roll(np.roll(m, int(dy), 0), int(dx), 1), (0, 0), bl) * op
    f = base.astype(np.float32) * (1 - sm[..., None])
    luz = np.clip(cv2.GaussianBlur(cv2.cvtColor(base, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 60) / 200, .85, 1.02)[..., None]
    out = f * (1 - m[..., None]) + arte * luz * m[..., None]
    grava(nome, out + ruido(H, W, 1.2) * m[..., None])

CENAS = {
    'sacola-kraft': lambda: tinta('sacola-kraft', f'{ORIG}/AdobeStock_510215540.jpg', 'arte-sacola.png',
                                  [(0.418, 0.316), (0.727, 0.313), (0.727, 0.688), (0.468, 0.843)], k=.5, opac=.94, estudio=True),
    'saco-rafia': lambda: tinta('saco-rafia', f'{ORIG}/AdobeStock_858630641.jpg', 'arte-rafia.png',
                                [(0.405, 0.40), (0.662, 0.40), (0.676, 0.862), (0.358, 0.862)], k=1.3, opac=.92, estudio=True, sigma=6),
    'caixa-aba': lambda: tinta('caixa-aba', f'{ORIG}/AdobeStock_507707601.jpg', 'arte-aba.png',
                               [(4474, 338), (5836, 1338), (5404, 1926), (4042, 926)], k=.4, opac=.9),
    'lambe-lambe': lambda: papel('lambe-lambe', f'{ORIG}/AdobeStock_293552957.jpg', 'cartaz-01-manifesto.png',
                                 [(0.345, 0.155), (0.647, 0.160), (0.648, 0.830), (0.345, 0.822)], k=.55,
                                 excl=[(0.592, 0.140), (0.660, 0.140), (0.660, 0.232)]),
    'celular': lambda: tela('celular', f'{ORIG}/AdobeStock_329310316.jpg', 'tela-feed.png',
                            [(4649, 836), (5442, 1431), (4080, 3246), (3288, 2652)], '/tmp/claude-0/-home-user-lucas-/0d3f7e90-dd37-558c-a2ec-9141744b3677/scratchpad/tela.npy'),
    'caixa-cartao': lambda: objeto('caixa-cartao', f'{ORIG}/AdobeStock_334464661.jpg', 'arte-cartao.png', (0.335, 0.635), 0.205, -9, inclina=(.012, 0)),
}

if __name__ == '__main__':
    so = sys.argv[1:]
    for n, fn in CENAS.items():
        if not so or any(s in n for s in so): fn()

#!/usr/bin/env python3
"""Recorte de pessoas (sem IA generativa): GrabCut a partir de um retângulo, refino da borda com filtro guiado
pela própria foto e descontaminação da cor da borda (tira o halo do céu ou do fundo).
Saída: fotos/pessoas/<nome>.png (RGBA, até 2800 px)."""
import os, sys, json
import numpy as np, cv2

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRAB = f'{R}/fotos/trabalho'; OUT = f'{R}/fotos/pessoas'
# nome: retângulo (x0, y0, x1, y1) em fração; corte opcional da imagem antes (para tirar plano de fundo ruidoso)
CFG = {
    'agro-chapeu':  (0.165, 0.085, 0.515, 0.999),
    'agro-ceu':     (0.335, 0.150, 0.645, 0.999),
    'agro-senhora': (0.215, 0.040, 0.860, 0.999),
    'agro-jovem':   (0.175, 0.001, 0.845, 0.999),
    'agro-senhor':  (0.170, 0.060, 0.800, 0.999),
}

def guiado(I, p, r, eps):
    m = lambda x: cv2.boxFilter(x, -1, (r, r))
    mI, mp_ = m(I), m(p); cov = m(I * p) - mI * mp_; var = m(I * I) - mI * mI
    a = cov / (var + eps); b = mp_ - a * mI
    return m(a) * I + m(b)

def recorta(nome, rect, lado=2800):
    img = cv2.imread(f'{TRAB}/{nome}.jpg'); H, W = img.shape[:2]
    s = 1400 / W; sm = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    x0, y0, x1, y1 = rect; r = (int(x0 * sm.shape[1]), int(y0 * sm.shape[0]), int((x1 - x0) * sm.shape[1]), int((y1 - y0) * sm.shape[0]))
    m = np.zeros(sm.shape[:2], np.uint8); bg, fg = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(sm, m, r, bg, fg, 7, cv2.GC_INIT_WITH_RECT)
    f = np.where((m == 1) | (m == 3), 1, 0).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(f)
    if n > 1: f = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
    inv = (1 - f).copy(); ff = np.zeros((f.shape[0] + 2, f.shape[1] + 2), np.uint8)
    # preenche buracos pequenos (não o espaço entre braço e corpo: só buracos < 0,3% da área)
    nn, ll, ss, _ = cv2.connectedComponentsWithStats(inv)
    for i in range(1, nn):
        if ss[i, cv2.CC_STAT_AREA] < 0.003 * f.size: f[ll == i] = 1
    # escala final
    e = min(1, lado / W); big = cv2.resize(img, None, fx=e, fy=e, interpolation=cv2.INTER_AREA)
    a = cv2.resize(f.astype(np.float32), (big.shape[1], big.shape[0]), interpolation=cv2.INTER_LINEAR)
    g = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    a = np.clip(guiado(g, a, 9, 1e-3), 0, 1); a = np.clip((a - .12) / .76, 0, 1)
    # descontaminação: na borda, cor estimada a partir do interior
    dentro = (a > .96).astype(np.float32); k = (0, 0)
    num = cv2.GaussianBlur(big.astype(np.float32) * dentro[..., None], k, 6); den = cv2.GaussianBlur(dentro, k, 6)[..., None] + 1e-5
    est = num / den; borda = ((a > .01) & (a < .96))[..., None]
    cor = np.where(borda, est * .7 + big * .3, big)
    rgba = np.dstack([np.clip(cor, 0, 255).astype(np.uint8), (a * 255).astype(np.uint8)])
    ys, xs = np.where(a > .02); y0p, y1p, x0p, x1p = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = rgba[y0p:y1p, x0p:x1p]
    os.makedirs(OUT, exist_ok=True); cv2.imwrite(f'{OUT}/{nome}.png', rgba)
    # caixa no quadro original (fração), para posicionar e para a verificação de rostos
    info = {'bbox': [round(x0p / big.shape[1], 4), round(y0p / big.shape[0], 4), round(x1p / big.shape[1], 4), round(y1p / big.shape[0], 4)], 'tam': [int(x1p - x0p), int(y1p - y0p)]}
    print(nome, info); return info

if __name__ == '__main__':
    so = sys.argv[1:]; p = f'{OUT}/pessoas.json'; d = json.load(open(p)) if os.path.exists(p) else {}
    for n, r in CFG.items():
        if not so or n in so: d[n] = recorta(n, r)
    json.dump(d, open(p, 'w'), indent=1)

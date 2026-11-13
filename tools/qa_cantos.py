#!/usr/bin/env python3
"""Conferência de recorte dos mockups: amplia a 200% os quatro cantos de cada superfície aplicada."""
import cv2, numpy as np, importlib.util, sys, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('mk', f'{R}/tools/mockup.py'); mk = importlib.util.module_from_spec(spec); spec.loader.exec_module(mk)
so = sys.argv[1:]; linhas = []
for n, c in mk.CENAS.items():
    if c['modo'] == 'tinta' or (so and not any(x in n for x in so)): continue
    im = cv2.imread(f'{R}/entregas/04-mockups/fibra-mockup-{n}.jpg'); cena = cv2.imread(f"{mk.CENA}/{c['cena']}.jpg"); H, W = im.shape[:2]; q = mk.ordena(c['quad'])
    if c.get('refina'): q = mk.refina(cena, q, **c.get('ajuste', {}))
    print(n, np.round(q, 1).tolist())
    row = []
    for (x, y) in q:
        x0 = int(np.clip(x - 75, 0, W - 150)); y0 = int(np.clip(y - 55, 0, H - 110)); row.append(cv2.resize(im[y0:y0+110, x0:x0+150], (300, 220), interpolation=cv2.INTER_NEAREST))
    # meio de cada lado
    for i in range(4):
        mx, my = (q[i] + q[(i + 1) % 4]) / 2; x0 = int(np.clip(mx - 75, 0, W - 150)); y0 = int(np.clip(my - 55, 0, H - 110)); row.append(cv2.resize(im[y0:y0+110, x0:x0+150], (300, 220), interpolation=cv2.INTER_NEAREST))
    r = np.hstack(row); cv2.putText(r, n, (8, 22), cv2.FONT_HERSHEY_SIMPLEX, .6, (0, 255, 255), 2); linhas.append(r)
cv2.imwrite('/tmp/claude-0/-home-user-lucas-/0d3f7e90-dd37-558c-a2ec-9141744b3677/scratchpad/prova/qa-cantos.jpg', np.vstack(linhas), [cv2.IMWRITE_JPEG_QUALITY, 90])

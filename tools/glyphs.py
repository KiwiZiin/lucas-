#!/usr/bin/env python3
"""Extrai contornos de glifos de uma fonte (TTF) e separa contorno externo e miolos (contra-formas).
Saída: JSON com paths SVG (y para baixo), caixas e centros dos miolos, por letra."""
import sys, json
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.areaPen import AreaPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

def split_contours(rec):
    out, cur = [], []
    for op, args in rec:
        cur.append((op, args))
        if op in ('closePath', 'endPath'):
            out.append(cur); cur = []
    return out

def replay(contour, pen):
    for op, args in contour: getattr(pen, op)(*args)

def glyph_data(font, ch):
    gs = font.getGlyphSet(); name = font.getBestCmap()[ord(ch)]
    rec = DecomposingRecordingPen(gs); gs[name].draw(rec)
    cs = split_contours(rec.value)
    asc = font['hhea'].ascent; flip = (1, 0, 0, -1, 0, asc)   # y para baixo, topo = 0 no ascendente
    items = []
    for c in cs:
        ap = AreaPen(gs); replay(c, ap)
        bp = BoundsPen(gs); replay(c, TransformPen(bp, flip))
        sp = SVGPathPen(gs); replay(c, TransformPen(sp, flip))
        items.append({'area': ap.value, 'bbox': bp.bounds, 'd': sp.getCommands()})
    outer = max(items, key=lambda i: abs(i['area']))
    sign = 1 if outer['area'] > 0 else -1
    outers = [i for i in items if (i['area'] > 0) == (sign > 0)]
    holes = [i for i in items if (i['area'] > 0) != (sign > 0)]
    def bb(i): x0, y0, x1, y1 = i['bbox']; return {'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0, 'cx': (x0 + x1) / 2, 'cy': (y0 + y1) / 2}
    return {'ch': ch, 'adv': gs[name].width, 'outer': ' '.join(i['d'] for i in outers), 'outer_bbox': bb(outer),
            'holes': [{'d': h['d'], **bb(h)} for h in sorted(holes, key=lambda h: h['bbox'][1])]}

def font_data(path, text='FIBRA'):
    f = TTFont(path)
    os2 = f['OS/2']
    return {'upm': f['head'].unitsPerEm, 'asc': f['hhea'].ascent, 'cap': getattr(os2, 'sCapHeight', 0),
            'glyphs': [glyph_data(f, c) for c in text]}

if __name__ == '__main__':
    print(json.dumps(font_data(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'FIBRA')))

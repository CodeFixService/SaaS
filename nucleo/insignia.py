#!/usr/bin/env python3
"""CodeFix · Núcleo · Ícono chico de las notificaciones (badge) de Android.

Android pinta el badge solo con su transparencia: un PNG con fondo (icon-192) sale como un cuadrado blanco.
Este script saca el dibujo blanco del ícono de la app (icons/icon-512.png) y escribe icons/badge.png:
silueta blanca sobre fondo transparente, 96×96. Lo llama sincronizar.py en cada app.
"""
import os
from PIL import Image, ImageFilter


def insignia(repo):
    src, dst = os.path.join(repo, 'icons', 'icon-512.png'), os.path.join(repo, 'icons', 'badge.png')
    if not os.path.exists(src) or (os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src)):
        return False
    im = Image.open(src).convert('RGB')
    # Lo casi blanco (el trazo del dibujo); el brillo de color y el fondo quedan fuera.
    m = im.convert('L').point(lambda v: 255 if v > 205 else 0)
    m = Image.eval(m, lambda v: v).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))  # quita las estrellas
    caja = m.getbbox()
    if not caja:
        return False
    x0, y0, x1, y1 = caja
    lado = int(max(x1 - x0, y1 - y0) * 1.12)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    m = m.crop((cx - lado // 2, cy - lado // 2, cx - lado // 2 + lado, cy - lado // 2 + lado)).resize((96, 96), Image.LANCZOS)
    out = Image.new('RGBA', (96, 96), (255, 255, 255, 0))
    out.putalpha(m)
    out.save(dst, optimize=True)
    return True


if __name__ == '__main__':
    import sys
    for r in sys.argv[1:]:
        print(r, insignia(r))

#!/usr/bin/env python3
"""CodeFix · Núcleo · Copia los archivos comunes a cada app y los enlaza en sus páginas.

Uso:  python3 nucleo/sincronizar.py /ruta/a/los/repos      (carpeta que contiene saas, emprendedor, barberia, …)
Hace en cada repositorio:
  1. Copia iconos.js, instalar.js, barra.js, auto.js y tema.css a la carpeta que usa esa app.
  2. Enlaza tema.css en cada página (después del CSS propio) y los scripts al final del <body>, si faltan.
  3. Agrega los archivos a la lista del service worker (para que funcionen sin internet).
  4. Escribe nucleo.json con la versión del núcleo (el Centro de Mando la muestra en cada tarjeta).
No toca nada más: ni la base de datos, ni la lógica de cada app. Se puede correr las veces que quieras.
"""
import json, os, re, shutil, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
VERSION = json.load(open(os.path.join(AQUI, 'nucleo.json')))['nucleo']
# repo → (carpeta de los .js, carpeta del .css, archivo del service worker)
APPS = {
    'saas': ('shared', 'shared', 'sw.js'),
    'emprendedor': ('js', 'css', 'sw.js'),
    'Aplicaciones': ('shared', 'shared', 'sw.js'),
    'barberia': ('shared', 'shared', 'sw.js'),
    'taller': ('shared', 'shared', 'sw.js'),
    'estacionamiento': ('js', 'css', 'sw.js'),
}
SALTAR = re.compile(r'(^docs/|guia|legal|actualizar\.html)')


def paginas(repo):
    out = subprocess.check_output(['git', '-C', repo, 'ls-files', '*.html']).decode().split()
    return [f for f in out if not SALTAR.search(f)]


def enlazar(repo, js, css):
    for f in paginas(repo):
        p = os.path.join(repo, f)
        s = open(p, encoding='utf-8').read()
        rel = '../' * f.count('/')
        nuevo = s
        if 'tema.css' not in nuevo and '</head>' in nuevo:
            link = '<link rel="stylesheet" href="' + rel + css + '/tema.css">'
            hojas = list(re.finditer(r'<link[^>]+rel="stylesheet"[^>]*>', nuevo))
            if hojas:
                fin = hojas[-1].end()
                nuevo = nuevo[:fin] + '\n' + link + nuevo[fin:]
            else:
                nuevo = nuevo.replace('</head>', link + '\n</head>', 1)
        for nombre in ('iconos.js', 'instalar.js', 'barra.js', 'auto.js'):
            if nombre not in nuevo and '</body>' in nuevo:
                nuevo = nuevo.replace('</body>', '<script src="' + rel + js + '/' + nombre + '"></script>\n</body>', 1)
        if nuevo != s:
            open(p, 'w', encoding='utf-8').write(nuevo)


def cachear(repo, js, css, sw):
    p = os.path.join(repo, sw)
    if not os.path.exists(p):
        return
    s = open(p, encoding='utf-8').read()
    falta = [x for x in (js + '/iconos.js', js + '/instalar.js', js + '/barra.js', js + '/auto.js', css + '/tema.css') if "'" + x + "'" not in s]
    if not falta:
        return
    # Se agregan junto al primer archivo de esa carpeta que ya esté en la lista.
    m = re.search(r"'" + re.escape(js) + r"/[^']+\.js',", s)
    if not m:
        print('  ⚠️  revisar a mano la lista del service worker de', repo, '→ falta', falta)
        return
    s = s[:m.end()] + ' ' + ', '.join("'" + x + "'," for x in falta) + s[m.end():]
    open(p, 'w', encoding='utf-8').write(s)


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(AQUI))
    for repo, (js, css, sw) in APPS.items():
        r = os.path.join(base, repo)
        if not os.path.isdir(r):
            print('—', repo, 'no está en', base)
            continue
        os.makedirs(os.path.join(r, js), exist_ok=True)
        os.makedirs(os.path.join(r, css), exist_ok=True)
        for nombre in ('iconos.js', 'instalar.js', 'barra.js', 'auto.js'):
            destino = os.path.join(r, js, nombre)
            if os.path.abspath(destino) != os.path.abspath(os.path.join(AQUI, nombre)):
                shutil.copy(os.path.join(AQUI, nombre), destino)
        shutil.copy(os.path.join(AQUI, 'tema.css'), os.path.join(r, css, 'tema.css'))
        enlazar(r, js, css)
        cachear(r, js, css, sw)
        json.dump({'nucleo': VERSION}, open(os.path.join(r, 'nucleo.json'), 'w'))
        print('✓', repo, '· núcleo', VERSION)


if __name__ == '__main__':
    main()

"""
aplicar_guion.py: lleva el texto de docs/guion-narrativo.md a las páginas.

El guion es la única fuente de la narración del sitio. Este script lo lee y
escribe, en cada página:
  - la cabecera: «Parte N · nombre · i de n» y el párrafo de apertura;
  - bajo cada título de sección, su cabecera visible con el párrafo de «por
    qué este análisis» (en las páginas de encuestas el párrafo entra en la
    cabecera que dibuja el componente, con conEntrada());
  - al final, el cierre con el botón «Sigue: …» a la página siguiente.
También escribe src/components/guion-partes.json, que la portada usa para las
tarjetas de «La historia en cinco partes».

Se puede correr las veces que haga falta: cada bloque se reemplaza, no se
duplica. Para cambiar un texto se edita el guion y se vuelve a correr.

    python scripts/aplicar_guion.py
"""
import html
import json
import os
import posixpath
import re
import sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
GUION = os.path.join(RAIZ, "docs", "guion-narrativo.md")

# Las cinco partes, con sus páginas en orden de lectura (ruta del sitio).
PARTES = [
    ("Las lenguas", "¿Qué lenguas hay y qué pasa con ellas?",
     ["/libro/lenguas-de-mexico", "/libro/hablantes-en-el-tiempo", "/libro/variantes", "/libro/lenguas-en-riesgo"]),
    ("La ciudad", "¿Quiénes las hablan en la ciudad, de dónde vienen y dónde viven?",
     ["/libro/la-ciudad-en-el-pais", "/libro/de-donde-vienen", "/libro/donde-viven", "/libro/colonias-y-marginacion"]),
    ("Quiénes son y cómo viven", "¿En qué se parecen y en qué se distinguen del resto?",
     ["/libro/quienes-son", "/libro/escuela-y-trabajo", "/libro/salud-y-lengua", "/libro/condiciones-de-vida"]),
    ("La brecha digital", "¿Quién se conecta, con qué y para qué?",
     ["/encuestas/censo/vivienda", "/encuestas/enigh/hogar", "/encuestas/endutih/uso", "/encuestas/endutih/actividades", "/encuestas/endutih/barreras"]),
    ("Lo que enfrentan", "¿Qué discriminación y qué violencia viven, y qué las protege?",
     ["/libro/discriminacion", "/libro/violencia", "/libro/derechos"]),
]
RUTAS = [r for _, _, pags in PARTES for r in pags]


def leer_guion():
    """Devuelve (portada, paginas): portada es una lista de párrafos por parte;
    paginas, una lista en orden con titulo, apertura, secciones y cierre."""
    texto = open(GUION, encoding="utf-8").read().replace("\r\n", "\n")
    cuerpo = texto[texto.index("## 5. Textos"):]
    cuerpo = cuerpo[:cuerpo.index("\n## 6.")] if "\n## 6." in cuerpo else cuerpo
    bloques = re.split(r"\n#### ", cuerpo)
    portada = re.findall(r"^\*\*\d\. [^*]+\.\*\* (.+?)(?=\n\n|\Z)", bloques[0], flags=re.S | re.M)
    paginas = []
    for b in bloques[1:]:
        titulo, _, resto = b.partition("\n")
        resto = resto.split("\n---")[0].split("\n### ")[0]
        parrafos = re.findall(r"^\*\*(.+?)\.\*\* (.+?)(?=\n\n|\Z)", resto, flags=re.S | re.M)
        d = {"titulo": titulo.strip(), "secciones": {}}
        for etiqueta, t in parrafos:
            t = " ".join(t.split())
            if etiqueta == "Apertura":
                d["apertura"] = t
            elif etiqueta == "Cierre":
                d["cierre"] = re.sub(r"\s*Sigue: [^.]+\.$", "", t)
            else:
                d["secciones"][etiqueta] = t
        paginas.append(d)
    return [" ".join(p.split()) for p in portada], paginas


def archivo_de(ruta):
    return os.path.join(RAIZ, "src", *ruta.strip("/").split("/")) + ".md"


def relativa(desde, hacia):
    r = posixpath.relpath(hacia, posixpath.dirname(desde))
    return r if r.startswith(".") else "./" + r


def aplicar_pagina(ruta, d, parte_n, parte_nombre, i, n, siguiente):
    p = archivo_de(ruta)
    s = open(p, encoding="utf-8", newline="").read()
    crlf = "\r\n" in s
    s = s.replace("\r\n", "\n")
    esc = html.escape

    # --- cabecera
    kicker = f"Parte {parte_n} · {parte_nombre} · {i} de {n}"
    s, k1 = re.subn(r'(<div class="hero-pagina">\n\s*)<span class="kicker">[^<]*</span>', lambda m: m.group(1) + f'<span class="kicker">{esc(kicker)}</span>', s, count=1)
    s, k2 = re.subn(r'<p class="hero-entrada">.*?</p>', lambda m: f'<p class="hero-entrada">{esc(d["apertura"], quote=False)}</p>', s, count=1, flags=re.S)
    if not (k1 and k2):
        raise SystemExit(f"{ruta}: no se encontró la cabecera de la página.")

    # --- secciones
    s = re.sub(r'<header class="seccion-cabeza relato-seccion">.*?</header>\n', "", s, flags=re.S)
    anclas = re.findall(r'<h2 id="[^"]+" class="toc-anchor">([^<]+)</h2>', s)
    faltan = [t for t in anclas if t not in d["secciones"]]
    sobran = [t for t in d["secciones"] if t not in anclas]
    if faltan or sobran:
        raise SystemExit(f"{ruta}: el guion y la página no coinciden. Sin texto: {faltan}. Sin sección: {sobran}.")
    encuesta = ruta.startswith("/encuestas/")
    for num, titulo in enumerate(anclas, 1):
        texto = d["secciones"][titulo]
        ancla = re.search(r'<h2 id="[^"]+" class="toc-anchor">' + re.escape(titulo) + r"</h2>\n", s)
        if encuesta:
            # El componente dibuja su propia cabecera: el párrafo entra en ella.
            patron = re.compile(r"display\((?:conEntrada\()?secciones\[(\d+)\](?:, \"(?:[^\"\\]|\\.)*\"\))?\);")
            m = patron.search(s, ancla.end())
            s = s[:m.start()] + f"display(conEntrada(secciones[{m.group(1)}], {json.dumps(texto, ensure_ascii=False)}));" + s[m.end():]
        else:
            bloque = (f'<header class="seccion-cabeza relato-seccion">\n'
                      f'  <span class="kicker"><span class="kicker-num">{num:02d}</span> {esc(titulo, quote=False)}</span>\n'
                      f'  <p class="seccion-entrada">{esc(texto, quote=False)}</p>\n'
                      f"</header>\n")
            s = s[:ancla.end()] + bloque + s[ancla.end():]
    if encuesta and "conEntrada" in s and "import {conEntrada}" not in s:
        s = s.replace('import {verTambien} from "../../components/navegacion.js";', 'import {conEntrada} from "../../components/graficas.js";', 1)
        if "import {conEntrada}" not in s:
            s = re.sub(r"(```js\n)", r'\1import {conEntrada} from "../../components/graficas.js";\n', s, count=1)

    # --- cierre (sustituye al bloque «ver también» de las páginas de encuestas)
    s = re.sub(r"\n*---\n\n```js\ndisplay\(verTambien\(\[.*?\]\)\);\n```\n*", "\n", s, flags=re.S)
    s = re.sub(r"\n*<div class=\"relato-cierre\">.*?</div>\n*", "\n", s, flags=re.S)
    s = s.replace('import {verTambien} from "../../components/navegacion.js";\n', "")
    if siguiente:
        ruta_sig, titulo_sig = siguiente
        boton = f'  <a class="book-cta book-cta-primary" href="{relativa(ruta, ruta_sig)}">Sigue: {esc(titulo_sig, quote=False)}</a>\n'
    else:
        boton = (f'  <a class="book-cta book-cta-primary" href="{relativa(ruta, "/mapa")}">Abrir el mapa</a>\n'
                 f'  <a class="book-cta" href="{relativa(ruta, "/metodologia")}">Cómo se hizo</a>\n')
    s = s.rstrip("\n") + f'\n\n<div class="relato-cierre">\n  <p>{esc(d["cierre"], quote=False)}</p>\n{boton}</div>\n'
    open(p, "w", encoding="utf-8", newline="").write(s.replace("\n", "\r\n") if crlf else s)


def main():
    portada, paginas = leer_guion()
    if len(paginas) != len(RUTAS) or len(portada) != len(PARTES):
        raise SystemExit(f"El guion trae {len(paginas)} páginas y {len(portada)} partes; se esperaban {len(RUTAS)} y {len(PARTES)}.")
    porruta = dict(zip(RUTAS, paginas))
    for k, ruta in enumerate(RUTAS):
        for pn, (nombre, _, pags) in enumerate(PARTES, 1):
            if ruta in pags:
                sig = RUTAS[k + 1] if k + 1 < len(RUTAS) else None
                aplicar_pagina(ruta, porruta[ruta], pn, nombre, pags.index(ruta) + 1, len(pags), (sig, porruta[sig]["titulo"]) if sig else None)
    salida = os.path.join(RAIZ, "src", "components", "guion-partes.json")
    json.dump([{"numero": i, "nombre": n, "pregunta": q, "texto": portada[i - 1], "ruta": pags[0],
                "paginas": [{"ruta": r, "titulo": porruta[r]["titulo"]} for r in pags]}
               for i, (n, q, pags) in enumerate(PARTES, 1)], open(salida, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)
    print(f"[ok] guion aplicado a {len(RUTAS)} páginas; {sum(len(p['secciones']) for p in paginas)} párrafos de sección", file=sys.stderr)


if __name__ == "__main__":
    main()

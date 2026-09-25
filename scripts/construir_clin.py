"""Construye src/data/clin_variantes.csv con las 364 variantes lingüísticas del
Catálogo de las Lenguas Indígenas Nacionales (INALI, DOF 14 de enero de 2008).

Fuente: la versión HTML del catálogo que publica el INALI en
https://www.inali.gob.mx/sitios/clin-inali/ . El índice enlaza 68 páginas
html/l_<agrupacion>.html (agrupación, familia y lista de variantes con sus
autodenominaciones) y cada una tiene su par html/v_<agrupacion>.html con la
tabla de variantes y su referencia geoestadística ("ENTIDAD: Municipio:
localidades. Municipio: ...").

Las páginas se guardan en data-raw/inali/html/ (carpeta sin versionar). La
primera corrida las descarga; las siguientes leen la copia local, así que el
script es reproducible sin red.

Una fila por variante, con estas columnas:

  familia           una de las 11 familias, en minúsculas
  agrupacion        una de las 68 agrupaciones, con la grafía del CLIN
  variante          nombre en español (el que va entre < > en el catálogo)
  autodenominacion  autodenominaciones de la variante, separadas por " | "
  entidades         entidades donde el CLIN la ubica, separadas por " | "
  municipios        "ENTIDAD: Municipio" separados por " | ", sin localidades
  n_localidades     cuántas localidades lista el catálogo para la variante

Al final se comprueba que haya exactamente 11 familias, 68 agrupaciones y 364
variantes; si no cuadra, aborta diciendo qué falta o sobra.

Uso: uv run python scripts/construir_clin.py
"""
import re
import urllib.request
from collections import OrderedDict
from pathlib import Path

import pandas as pd
from bs4 import BeautifulSoup, NavigableString, Tag

RAIZ = Path(__file__).resolve().parent.parent
CRUDO = RAIZ / "data-raw" / "inali" / "html"
SALIDA = RAIZ / "src" / "data" / "clin_variantes.csv"

BASE = "https://www.inali.gob.mx/sitios/clin-inali/"
AGENTE = "Mozilla/5.0"

# Las 11 familias del CLIN, de norte a sur. La llave es como aparece en el
# encabezado de cada página l_; el valor, como se publica en el CSV.
FAMILIAS = OrderedDict([
    ("Álgica", "álgica"),
    ("Yuto-nahua", "yuto-nahua"),
    ("Cochimí-yumana", "cochimí-yumana"),
    ("Seri", "seri"),
    ("Oto-mangue", "oto-mangue"),
    ("Maya", "maya"),
    ("Totonaco-tepehua", "totonaco-tepehua"),
    ("Tarasca", "tarasca"),
    ("Mixe-zoque", "mixe-zoque"),
    ("Chontal de Oaxaca", "chontal de Oaxaca"),
    ("Huave", "huave"),
])
N_FAMILIAS, N_AGRUPACIONES, N_VARIANTES = 11, 68, 364

# Conteos publicados que sirven de contraste: si alguno falla, el parser se
# comió filas aunque el total cuadre.
CONTEOS_CONOCIDOS = {
    "náhuatl": 30, "mixteco": 81, "zapoteco": 62, "otomí": 9, "mazateco": 16,
    "chinanteco": 11, "mixe": 6, "totonaco": 7, "maya": 1, "Kickapoo": 1,
}

# El HTML escribe una vez "VERACRUZ:" a secas (mazateco, Tezonapa) donde el
# resto del catálogo usa el nombre oficial completo. Se homologa y se avisa.
ENTIDADES_HOMOLOGADAS = {
    "VERACRUZ": "VERACRUZ DE IGNACIO DE LA LLAVE",
}

# Texto en mayúsculas seguido de dos puntos: así rotula el catálogo cada
# entidad dentro de la referencia geoestadística. Dos filas de otomí lo
# escriben en minúsculas ("Tlaxcala:", "Estado de México:"); para ellas hay
# un patrón de respaldo que solo se usa si el principal no casa.
RE_ENTIDAD = re.compile(r"([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ ]{2,}?)\s*:\s*$")
RE_ENTIDAD_MINUSCULAS = re.compile(r"([A-ZÁÉÍÓÚÑÜ][A-Za-zÁÉÍÓÚÑÜáéíóúñü ]{2,}?)\s*:\s*$")
RE_NOMBRE = re.compile(r"<\s*(.+?)\s*>", re.S)

problemas = []


def normalizar(texto):
    """Espacios colapsados y apóstrofo recto: las páginas v_ escriben ch’ol
    con apóstrofo tipográfico (U+2019) y las l_ y el índice con el recto."""
    return re.sub(r"\s+", " ", texto).replace("’", "'").replace("‘", "'").strip()


def obtener(nombre):
    """Devuelve el HTML de `nombre` (index.html, html/l_nahuatl.html, ...),
    leyendo la copia local o descargándola la primera vez."""
    destino = CRUDO / Path(nombre).name
    if not destino.exists() or destino.stat().st_size == 0:
        CRUDO.mkdir(parents=True, exist_ok=True)
        url = BASE + nombre
        print(f"  descargando {url}")
        peticion = urllib.request.Request(url, headers={"User-Agent": AGENTE})
        with urllib.request.urlopen(peticion, timeout=60) as r:
            datos = r.read()
        if not datos:
            raise SystemExit(f"Descarga vacía: {url}")
        destino.write_bytes(datos)
    return destino.read_text(encoding="utf-8", errors="replace")


def sopa(html):
    return BeautifulSoup(html, "lxml")


def limpiar(texto):
    return re.sub(r"\s+", " ", texto).strip()


def leer_indice():
    """Slugs de agrupación en el orden del índice (l_akateko, l_amuzgo, ...)."""
    doc = sopa(obtener("index.html"))
    slugs = []
    for a in doc.select("a[href]"):
        m = re.fullmatch(r"html/(l_[a-z_]+)\.html", a["href"])
        if m and m.group(1) not in slugs:
            slugs.append(m.group(1))
    return slugs


def leer_agrupacion(slug):
    """Del l_*.html: nombre de la agrupación, familia y variantes en orden."""
    doc = sopa(obtener(f"html/{slug}.html"))
    texto = doc.find("h4").get_text("\n")
    m_agr = re.search(r"Agrupación lingüística:\s*(.+)", texto)
    m_fam = re.search(r"Familia lingüística:\s*(.+)", texto)
    if not (m_agr and m_fam):
        raise SystemExit(f"{slug}: no se pudo leer agrupación/familia en {texto!r}")
    agrupacion = normalizar(m_agr.group(1))
    familia_html = limpiar(m_fam.group(1)).rstrip(">").strip()
    if familia_html not in FAMILIAS:
        raise SystemExit(f"{slug}: familia desconocida {familia_html!r}")
    # l_akateko enlaza sin la clase mlink; se seleccionan por destino.
    variantes = [normalizar(a.get_text()) for a in doc.select('a[href^="v_"]')]
    return agrupacion, FAMILIAS[familia_html], variantes


def separar_autodenominaciones(td):
    """Del primer td de una fila: autodenominaciones y nombre en español."""
    autodenominaciones = []
    for p in td.find_all("p"):
        for span in p.find_all("span"):
            span.decompose()  # transcripción fonética entre [ ]
        t = normalizar(p.get_text())
        if t:
            autodenominaciones.append(t)
        p.decompose()
    m = RE_NOMBRE.search(limpiar(td.get_text()))
    nombre = normalizar(m.group(1)) if m else None
    return autodenominaciones, nombre


def leer_geografia(td, contexto):
    """Del segundo td: entidades en orden, municipios "ENTIDAD: Municipio" y
    número de localidades. El td alterna texto y <b>Municipio</b>; el texto
    trae "ENTIDAD:" antes del primer municipio de cada entidad y, tras cada
    municipio, ": localidad, localidad, ...".
    """
    entidades, municipios = [], []
    estado = {"entidad": None, "n_loc": 0}

    def procesar_texto(t, tras_municipio):
        t = t.strip()
        if not t:
            return
        m = RE_ENTIDAD.search(t)
        if not m:
            m = RE_ENTIDAD_MINUSCULAS.search(t)
            if m:
                problemas.append(
                    f"{contexto}: la entidad viene en minúsculas ({m.group(1).strip()!r}); "
                    f"se pasa a mayúsculas")
        cuerpo = t[: m.start()] if m else t
        if tras_municipio:
            cuerpo = cuerpo.strip().lstrip(":").strip().rstrip(".").strip()
            if cuerpo:
                estado["n_loc"] += len([x for x in cuerpo.split(",") if x.strip()])
        elif cuerpo.strip():
            problemas.append(f"{contexto}: texto suelto sin municipio: {cuerpo[:80]!r}")
        if m:
            nueva = limpiar(m.group(1)).upper()
            if nueva in ENTIDADES_HOMOLOGADAS:
                problemas.append(
                    f"{contexto}: la entidad viene como {nueva!r}; se homologa a "
                    f"{ENTIDADES_HOMOLOGADAS[nueva]!r}")
                nueva = ENTIDADES_HOMOLOGADAS[nueva]
            estado["entidad"] = nueva
            if nueva not in entidades:
                entidades.append(nueva)

    pendiente = ""
    tras_municipio = False
    for nodo in td.children:
        if isinstance(nodo, NavigableString):
            pendiente += str(nodo)
        elif isinstance(nodo, Tag) and nodo.name == "b":
            procesar_texto(pendiente, tras_municipio)
            pendiente = ""
            municipio = limpiar(nodo.get_text())
            if estado["entidad"] is None:
                problemas.append(f"{contexto}: municipio {municipio!r} sin entidad")
                municipios.append(f"?: {municipio}")
            else:
                municipios.append(f"{estado['entidad']}: {municipio}")
            tras_municipio = True
        elif isinstance(nodo, Tag) and nodo.name == "br":
            pendiente += "\n"
        elif isinstance(nodo, Tag):
            pendiente += nodo.get_text()
    procesar_texto(pendiente, tras_municipio)
    return entidades, municipios, estado["n_loc"]


def leer_variantes(slug, agrupacion, familia, nombres_lista):
    """Del v_*.html: una fila por variante."""
    doc = sopa(obtener(f"html/{slug.replace('l_', 'v_', 1)}.html"))
    filas = []
    for tr in doc.select("table tr"):
        tds = tr.find_all("td", recursive=False)
        if len(tds) != 2:
            continue
        contexto = f"{agrupacion} fila {len(filas) + 1}"
        autos, nombre = separar_autodenominaciones(tds[0])
        if nombre is None:
            if len(filas) < len(nombres_lista):
                nombre = nombres_lista[len(filas)]
                problemas.append(f"{contexto}: sin <nombre> en v_; se toma de l_: {nombre!r}")
            else:
                raise SystemExit(f"{contexto}: variante sin nombre y sin respaldo en l_")
        etiqueta = f"{agrupacion} <{nombre}>"
        entidades, municipios, n_loc = leer_geografia(tds[1], etiqueta)
        if not entidades or not municipios:
            problemas.append(f"{etiqueta}: referencia geoestadística vacía")
        if n_loc == 0:
            problemas.append(f"{etiqueta}: sin localidades listadas")
        if not autos:
            problemas.append(f"{etiqueta}: sin autodenominación")
        filas.append({
            "familia": familia,
            "agrupacion": agrupacion,
            "variante": nombre,
            "autodenominacion": " | ".join(autos),
            "entidades": " | ".join(entidades),
            "municipios": " | ".join(municipios),
            "n_localidades": n_loc,
        })
    # Cotejo con la lista de la página l_: mismos nombres, mismo orden.
    if len(filas) != len(nombres_lista):
        problemas.append(
            f"{agrupacion}: l_ lista {len(nombres_lista)} variantes y v_ trae {len(filas)}")
    for i, (f, n) in enumerate(zip(filas, nombres_lista), 1):
        v = f["variante"]
        if v == n:
            continue
        if v.lower() == n.lower():
            # El CLIN escribe el nombre en minúsculas salvo topónimos; entre
            # dos grafías que solo difieren en mayúsculas, la de menos.
            elegido = min((v, n), key=lambda s: sum(c.isupper() for c in s))
            f["variante"] = elegido
            problemas.append(
                f"{agrupacion} fila {i}: v_ dice {v!r} y l_ dice {n!r}; se toma {elegido!r}")
        else:
            problemas.append(f"{agrupacion} fila {i}: v_ dice {v!r}, l_ dice {n!r}")
    return filas


def main():
    print(f"Fuente: {BASE} (copia local en {CRUDO.relative_to(RAIZ)})")
    slugs = leer_indice()
    if len(slugs) != N_AGRUPACIONES:
        raise SystemExit(f"El índice enlaza {len(slugs)} agrupaciones, no {N_AGRUPACIONES}")

    filas = []
    for slug in slugs:
        agrupacion, familia, nombres = leer_agrupacion(slug)
        filas.extend(leer_variantes(slug, agrupacion, familia, nombres))

    df = pd.DataFrame(filas)
    orden_familia = {f: i for i, f in enumerate(FAMILIAS.values())}
    df["_f"] = df["familia"].map(orden_familia)
    df = df.sort_values(["_f"], kind="stable").drop(columns="_f").reset_index(drop=True)

    # Contraste con conteos publicados y con una ubicación conocida.
    por_agr = df.groupby("agrupacion", sort=False).size()
    for agr, esperado in CONTEOS_CONOCIDOS.items():
        real = int(por_agr.get(agr, 0))
        if real != esperado:
            problemas.append(f"{agr}: se esperaban {esperado} variantes y hay {real}")
    df_ma = df[(df["agrupacion"] == "náhuatl") & (df["variante"] == "mexicano del centro alto")]
    if df_ma.empty or "DISTRITO FEDERAL" not in df_ma.iloc[0]["entidades"]:
        problemas.append("náhuatl <mexicano del centro alto> no ubica DISTRITO FEDERAL")

    # Guardias.
    fam = df["familia"].unique().tolist()
    faltan_f = [f for f in FAMILIAS.values() if f not in fam]
    sobran_f = [f for f in fam if f not in FAMILIAS.values()]
    errores = []
    if len(fam) != N_FAMILIAS or faltan_f or sobran_f:
        errores.append(f"familias: {len(fam)} de {N_FAMILIAS}; faltan {faltan_f}, sobran {sobran_f}")
    if df["agrupacion"].nunique() != N_AGRUPACIONES:
        errores.append(f"agrupaciones: {df['agrupacion'].nunique()} de {N_AGRUPACIONES}: "
                       + ", ".join(sorted(df["agrupacion"].unique())))
    if len(df) != N_VARIANTES:
        detalle = "; ".join(p for p in problemas if "se esperaban" in p or "l_ lista" in p)
        errores.append(f"variantes: {len(df)} de {N_VARIANTES}. {detalle}")
    dup = df[df.duplicated(["agrupacion", "variante"], keep=False)]
    if not dup.empty:
        errores.append("variantes duplicadas: " + ", ".join(
            f"{a} <{v}>" for a, v in
            dup[["agrupacion", "variante"]].drop_duplicates().itertuples(index=False)))
    if df["variante"].isna().any() or (df["variante"] == "").any():
        errores.append("hay variantes sin nombre")

    if errores:
        print("\nPROBLEMAS DETECTADOS:")
        for p in problemas:
            print("  -", p)
        raise SystemExit("\nNo cuadra el catálogo:\n  " + "\n  ".join(errores))

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(SALIDA, index=False, encoding="utf-8", lineterminator="\n")

    # Tabla familia -> agrupaciones -> variantes.
    print(f"\n{'FAMILIA':<20}{'AGRUPACIÓN':<26}VARIANTES")
    for familia, g in df.groupby("familia", sort=False):
        agrs = g.groupby("agrupacion", sort=False).size()
        print(f"{familia:<20}{'(' + str(len(agrs)) + ' agrupaciones)':<26}{len(g)}")
        for agr, n in agrs.items():
            print(f"{'':<20}{agr:<26}{n}")
    n_ent = len({e for s in df["entidades"] for e in s.split(" | ") if e})
    print(f"\n{'TOTAL':<20}{str(df['agrupacion'].nunique()) + ' agrupaciones':<26}"
          f"{len(df)} variantes en {df['familia'].nunique()} familias")
    print(f"Localidades listadas: {int(df['n_localidades'].sum()):,}; entidades distintas: {n_ent}")

    if problemas:
        print(f"\nAvisos ({len(problemas)}):")
        for p in problemas:
            print("  -", p)
    print(f"\nEscrito {SALIDA.relative_to(RAIZ)} ({len(df)} filas)")


if __name__ == "__main__":
    main()

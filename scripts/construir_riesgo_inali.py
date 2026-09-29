"""
Grado de riesgo de desaparición de las 364 variantes lingüísticas, INALI 2012.

Fuente: INALI, *México. Lenguas indígenas nacionales en riesgo de
desaparición: variantes lingüísticas por grado de riesgo* (2012), coords.
Arnulfo Embriz Osorio y Óscar Zamora Alarcón, con datos del Censo 2000.
PDF oficial en data-raw/inali/inali_riesgo_2012.pdf
(https://site.inali.gob.mx/pdf/libro_lenguas_indigenas_nacionales_en_riesgo_de_desaparicion.pdf).

Se leen los cuadros 2 a 5 (páginas 31 a 56 del PDF), una fila por variante
con: familia, agrupación, variante, hablantes en el total de localidades,
hablantes en localidades con 30 % y más de hablantes, número de localidades,
proporción de hablantes y proporción de niños de 5 a 14 años, y el grado.

Criterios del libro (introducción): grado 1, muy alto riesgo, sin
localidades con 30 % o más de hablantes o menos de 100 hablantes en ellas;
grado 2, alto, niños menos de 25 % y menos de 1,000 hablantes en esas
localidades; grado 3, mediano, niños menos de 25 % y más de 1,000, o niños
más de 25 % y menos de 1,000; grado 4, no inmediato, niños más de 25 %, más
de una localidad con 30 % y más de 1,000 hablantes.

Los nombres se alinean con el Catálogo 2008 (src/data/clin_variantes.csv):
el libro trae tres erratas (ku'al por ku'ahl, Akateco por Akateko y la
mayúscula de "Huasteca Hidalguense") y la agrupación "tarasca" por "tarasco".

Guardias: 364 variantes, conteo por grado 64 / 43 / 72 / 185 (el del propio
libro) y todas las variantes casan con el Catálogo.

Salida: src/data/inali_riesgo_2012.csv
"""
import csv
import os
import re
import sys

import pdfplumber

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "loaders"))
from comun import anotar_calculado  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PDF = os.path.join(RAIZ, "data-raw", "inali", "inali_riesgo_2012.pdf")
CLIN = os.path.join(RAIZ, "src", "data", "clin_variantes.csv")
SALIDA = os.path.join(RAIZ, "src", "data", "inali_riesgo_2012.csv")
GRADO = {"1": "Muy alto", "2": "Alto", "3": "Mediano", "4": "No inmediato"}
ESPERADO = {"Muy alto": 64, "Alto": 43, "Mediano": 72, "No inmediato": 185}
ERRATAS_VARIANTE = {"ku'al": "ku'ahl", "Akateco": "Akateko", "mexicano de la Huasteca Hidalguense": "mexicano de la Huasteca hidalguense"}
ERRATAS_AGRUPACION = {"tarasca": "tarasco", "ku'al": "ku'ahl", "Akateco": "Akateko"}


def numero(x):
    x = (x or "").replace(",", "").strip()
    try:
        return float(x)
    except ValueError:
        return None


def main():
    if not os.path.exists(PDF):
        raise SystemExit(f"Falta {PDF}; corre scripts/descargar_datos.sh")
    filas = []
    with pdfplumber.open(PDF) as pdf:
        for i in range(30, 56):
            for tabla in pdf.pages[i].extract_tables():
                for r in tabla:
                    if not r or not re.fullmatch(r"\d+", (r[0] or "").strip()):
                        continue
                    c = [re.sub(r"\s+", " ", (x or "").replace("\n", " ")).strip() for x in r]
                    if len(c) != 11:
                        raise SystemExit(f"Fila con {len(c)} columnas en la página {i + 1}: {c}")
                    lugar, fam, agr, var, hab, hab30, loc, loc30, prop, propn, grado = c
                    filas.append({"lugar": int(lugar), "familia": fam, "agrupacion": ERRATAS_AGRUPACION.get(agr, agr),
                                  "variante": ERRATAS_VARIANTE.get(var, var), "hablantes_2000": numero(hab),
                                  "hablantes_2000_loc30": numero(hab30), "localidades": numero(loc), "localidades_30": numero(loc30),
                                  "prop_hablantes": numero(prop), "prop_ninos": numero(propn), "grado_num": int(grado), "grado": GRADO[grado]})
    conteo = {g: sum(1 for f in filas if f["grado"] == g) for g in ESPERADO}
    if len(filas) != 364 or conteo != ESPERADO:
        raise SystemExit(f"Se esperaban 364 variantes con {ESPERADO} y salieron {len(filas)} con {conteo}.")
    with open(CLIN, encoding="utf-8") as f:
        clin = {r["variante"] for r in csv.DictReader(f)}
    sin = sorted({f["variante"] for f in filas} - clin)
    if sin:
        raise SystemExit(f"Variantes del libro sin par en el Catálogo 2008: {sin}")
    with open(SALIDA, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0].keys()), lineterminator="\n")
        w.writeheader()
        w.writerows(sorted(filas, key=lambda x: x["lugar"]))
    for g, n in conteo.items():
        anotar_calculado("riesgo", f"variantes_{g.lower().replace(' ', '_')}", n, f"variantes en {g.lower()} riesgo, INALI 2012")
    print(f"[ok] {os.path.relpath(SALIDA, RAIZ)}: 364 variantes; {conteo}; todas casan con el Catálogo 2008", file=sys.stderr)


if __name__ == "__main__":
    main()

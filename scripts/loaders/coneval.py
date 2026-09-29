"""
coneval.py: pobreza y carencias sociales de la población indígena, medición
multidimensional de la pobreza del CONEVAL, 2016 - 2022, nacional.

Fuente: CONEVAL, Anexo estadístico de pobreza 2022 (nacional y estatal),
https://www.coneval.org.mx/Medicion/MP/Documents/MMP_2022/AE_nacional_estatal_2022.zip,
copiado en data-raw/coneval/anexo_estadistico_pobreza_2022.xlsx. Cuadros:
  16  población indígena y no indígena (pertenencia étnica)
  17  hablantes y no hablantes de lengua indígena
  23  mujeres y hombres indígenas
  24  mujeres y hombres hablantes de lengua indígena
Cada cuadro trae, por indicador y año (2016, 2018, 2020, 2022), el
porcentaje, los millones de personas y las carencias promedio de dos grupos.

Definición del CONEVAL (nota 1 del cuadro 16): población indígena es la de
los hogares indígenas según el INPI (jefe, cónyuge o algún ascendiente habla
lengua indígena) más los hablantes que no viven en esos hogares. No usa la
autoadscripción. No hay desglose por entidad con esta condición.

La medición de 2024 la publica el INEGI; su presentación (p. 35) solo da la
pobreza de hablantes y no hablantes (66.3 y 26.7 %), que se añade como fila
aparte con su fuente; la serie por pertenencia étnica de 2024 no se ha
publicado en tabla.

Salida: src/data/coneval_pobreza.csv con
  anio, criterio (pertenencia|lengua), sexo (Total|Mujeres|Hombres), grupo
  (Indígena|Resto), indicador, bloque, pct, millones, carencias, fuente
"""
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from comun import anotar_calculado  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ARCHIVO = os.path.join(RAIZ, "data-raw", "coneval", "anexo_estadistico_pobreza_2022.xlsx")
SALIDA = os.path.join(RAIZ, "src", "data", "coneval_pobreza.csv")
ANIOS = [2016, 2018, 2020, 2022]
# cuadro -> (criterio, grupos en el orden de las columnas: (sexo, grupo)).
# El cuadro 24 trae cuatro grupos: hablantes mujeres y hombres, no hablantes
# mujeres y hombres; el 23 solo mujeres y hombres indígenas.
CUADROS = {
    "Cuadro 16": ("pertenencia", [("Total", "Indígena"), ("Total", "Resto")]),
    "Cuadro 17": ("lengua", [("Total", "Indígena"), ("Total", "Resto")]),
    "Cuadro 23": ("pertenencia", [("Mujeres", "Indígena"), ("Hombres", "Indígena")]),
    "Cuadro 24": ("lengua", [("Mujeres", "Indígena"), ("Hombres", "Indígena"), ("Mujeres", "Resto"), ("Hombres", "Resto")]),
}
# Nombres cortos por el orden de los renglones del anexo.
INDICADORES = [
    ("Pobreza", "Pobreza"), ("Pobreza", "Pobreza moderada"), ("Pobreza", "Pobreza extrema"),
    ("Pobreza", "Vulnerable por carencias sociales"), ("Pobreza", "Vulnerable por ingresos"), ("Pobreza", "No pobre y no vulnerable"),
    ("Privación social", "Al menos una carencia social"), ("Privación social", "Tres o más carencias sociales"),
    ("Carencias", "Rezago educativo"), ("Carencias", "Acceso a los servicios de salud"), ("Carencias", "Acceso a la seguridad social"),
    ("Carencias", "Calidad y espacios de la vivienda"), ("Carencias", "Servicios básicos en la vivienda"), ("Carencias", "Alimentación nutritiva y de calidad"),
    ("Bienestar económico", "Ingreso inferior a la línea de pobreza extrema"), ("Bienestar económico", "Ingreso inferior a la línea de pobreza"),
]


def leer_cuadro(xls, hoja, n_grupos):
    d = pd.read_excel(xls, hoja, header=None)
    filas = []
    for _, r in d.iterrows():
        vals = [v for v in r.tolist() if not (isinstance(v, float) and pd.isna(v))]
        textos = [v for v in vals if isinstance(v, str)]
        nums = [float(v) for v in vals if not isinstance(v, str)]
        if textos and not textos[0].strip()[:4].isdigit() and len(nums) >= 12 * n_grupos:
            filas.append((textos[0].strip(), nums[:12 * n_grupos]))
    if len(filas) != len(INDICADORES):
        raise SystemExit(f"{hoja}: se esperaban {len(INDICADORES)} renglones con datos y hay {len(filas)}.")
    return filas


def main():
    if not os.path.exists(ARCHIVO):
        raise SystemExit(f"Falta {ARCHIVO}")
    xls = pd.ExcelFile(ARCHIVO)
    salida = []
    for hoja, (crit, grupos) in CUADROS.items():
        for (bloque, nombre), (etiqueta, nums) in zip(INDICADORES, leer_cuadro(xls, hoja, len(grupos))):
            # Validación del orden: la etiqueta del anexo contiene la palabra clave.
            clave = {"Pobreza": "pobreza", "Pobreza moderada": "moderada", "Pobreza extrema": "extrema", "Rezago educativo": "rezago", "Acceso a los servicios de salud": "salud",
                     "Acceso a la seguridad social": "seguridad", "Calidad y espacios de la vivienda": "calidad", "Servicios básicos en la vivienda": "servicios",
                     "Alimentación nutritiva y de calidad": "alimenta"}.get(nombre)
            if clave and clave not in etiqueta.lower():
                raise SystemExit(f"{hoja}: el renglón «{etiqueta}» no corresponde a {nombre}.")
            for i, anio in enumerate(ANIOS):
                for g, (sexo, grupo) in enumerate(grupos):
                    base = 12 * g
                    salida.append({"anio": anio, "criterio": crit, "sexo": sexo, "grupo": grupo, "bloque": bloque, "indicador": nombre,
                                   "pct": round(nums[base + i], 4), "millones": round(nums[base + 4 + i], 6), "carencias": round(nums[base + 8 + i], 4),
                                   "fuente": f"CONEVAL, anexo estadístico 2022, {hoja.lower()}"})
    out = pd.DataFrame(salida)
    # 2024: solo pobreza de hablantes y no hablantes (INEGI, presentación de la medición 2024, p. 35).
    for grupo, v in (("Indígena", 66.3), ("Resto", 26.7)):
        out = pd.concat([out, pd.DataFrame([{"anio": 2024, "criterio": "lengua", "sexo": "Total", "grupo": grupo, "bloque": "Pobreza", "indicador": "Pobreza",
                                              "pct": v, "millones": None, "carencias": None, "fuente": "INEGI, Medición de la pobreza 2024, presentación de resultados, p. 35"}])], ignore_index=True)
    out.to_csv(SALIDA, index=False, encoding="utf-8", lineterminator="\n")
    t = out[(out.criterio == "pertenencia") & (out.sexo == "Total")].set_index(["anio", "grupo", "indicador"])
    anotar_calculado("coneval", "pobreza_indigena_2022", float(t.loc[(2022, "Indígena", "Pobreza"), "pct"]), "% de población indígena en pobreza, 2022 (CONEVAL)")
    anotar_calculado("coneval", "pobreza_extrema_indigena_2022", float(t.loc[(2022, "Indígena", "Pobreza extrema"), "pct"]), "% de población indígena en pobreza extrema, 2022 (CONEVAL)")
    print(f"[ok] {os.path.relpath(SALIDA, RAIZ)}: {len(out):,} filas; pobreza indígena 2016 - 2022: "
          + ", ".join(f"{a} {t.loc[(a, 'Indígena', 'Pobreza'), 'pct']:.1f}" for a in ANIOS), file=sys.stderr)


if __name__ == "__main__":
    main()

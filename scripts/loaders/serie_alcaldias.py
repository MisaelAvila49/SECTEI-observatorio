"""
Serie 1990-2025 de población indígena en la Ciudad de México, por entidad y
por alcaldía, para el nivel "Alcaldía" del mapa y para la serie del libro.

Salida: src/data/serie_alcaldias.csv, tabla larga con
  anio, nivel ('entidad' | 'alcaldia'), cve ('09' o clave de 3 dígitos),
  nombre, poblacion, sexo ('Total' | 'Mujeres' | 'Hombres'),
  num, den, casos, ee, cota ('censo' | 'muestra'), fuente, universo

Poblaciones:
  hablantes3   habla lengua indígena, 3 años y más  (2010, 2015, 2020, 2025)
  hablantes5   habla lengua indígena, 5 años y más  (1990-2020: la serie larga)
  monolingues  hablantes que no hablan español, sobre los hablantes de 3+
  hogares      población en hogares censales indígenas, sobre la población
  autoads      se considera indígena, sobre la población (2015, 2020, 2025)
  todas        habla lengua indígena O se considera indígena (2015, 2020);
               una persona cuenta una sola vez

De dónde sale cada edición:
  1990, 1995, 2000, 2005  ITER (cuando esté en data-raw/iter/); hablantes 5+
  2010, 2020              ITER de la CDMX: filas de total de entidad y de
                          municipio (LOC = 0000); conteo censal, sin error
  2015                    microdatos de la Encuesta Intercensal; con error de
                          diseño (Taylor, UPM dentro de estrato)
  2020 (autoads, todas)   cuestionario ampliado del Censo; con error
  2025                    conjunto de datos abiertos 105 de la EIC 2025:
                          porcentajes con su error estándar publicado

Guardias: los totales de la entidad se cotejan contra el ITER (2010:
123 224 / 271 463; 2020: 125 153 / 289 139), la SEPI (autoads 2020: 825 348)
y el documento de la Secretaría de Cultura (2015: 129 355 / 784 605).
"""
import os
import sys

import duckdb
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from comun import agregar, anotar_calculado  # noqa: E402
from muestras import CARGADORES, comprobar  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CRUDO = os.path.join(RAIZ, "data-raw")
SALIDA = os.path.join(RAIZ, "src", "data", "serie_alcaldias.csv")

COLUMNAS = ["anio", "nivel", "cve", "nombre", "poblacion", "sexo", "num", "den", "casos", "ee", "cota", "fuente", "universo"]
SEXOS = {"": "Total", "_F": "Mujeres", "_M": "Hombres"}

UNIVERSO = {
    "hablantes3": "Población de 3 años y más",
    "hablantes5": "Población de 5 años y más",
    "monolingues": "Hablantes de lengua indígena de 3 años y más",
    "hogares": "Población total",
    "autoads": "Población total",
    "todas": "Población total",
}

# Nombres oficiales 2020 de las 16 alcaldías, por clave de municipio.
ALCALDIAS = {
    "002": "Azcapotzalco", "003": "Coyoacán", "004": "Cuajimalpa de Morelos",
    "005": "Gustavo A. Madero", "006": "Iztacalco", "007": "Iztapalapa",
    "008": "La Magdalena Contreras", "009": "Milpa Alta", "010": "Álvaro Obregón",
    "011": "Tláhuac", "012": "Tlalpan", "013": "Xochimilco", "014": "Benito Juárez",
    "015": "Cuauhtémoc", "016": "Miguel Hidalgo", "017": "Venustiano Carranza",
}


def fila(anio, nivel, cve, poblacion, sexo, num, den, cota, fuente, casos=None, ee=None):
    return {"anio": anio, "nivel": nivel, "cve": cve, "nombre": "Ciudad de México" if nivel == "entidad" else ALCALDIAS[cve],
            "poblacion": poblacion, "sexo": sexo, "num": num, "den": den, "casos": casos, "ee": ee,
            "cota": cota, "fuente": fuente, "universo": UNIVERSO[poblacion]}


# ---------------------------------------------------------------- ITER (conteo censal)
ITER = {
    2010: ("iter/iter_09_cpv2010/conjunto_de_datos/iter_09_cpv2010.csv", "Censo de Población y Vivienda 2010 (INEGI), ITER"),
    2020: ("iter/iter_09_cpv2020/conjunto_de_datos/conjunto_de_datos_iter_09CSV20.csv", "Censo de Población y Vivienda 2020 (INEGI), ITER"),
}
CONTROL_ITER = {2010: (123_224, 271_463, 122_411), 2020: (125_153, 289_139, 124_540)}


def leer_iter(anio):
    ruta, fuente = ITER[anio]
    d = pd.read_csv(os.path.join(CRUDO, ruta), dtype=str, low_memory=False)
    d.columns = [c.upper() for c in d.columns]
    d["MUN"] = d["MUN"].str.zfill(3)
    d["LOC"] = d["LOC"].str.zfill(4)
    ent = d[d["MUN"] == "000"].head(1)
    alc = d[(d["MUN"] != "000") & (d["LOC"] == "0000")]
    if len(alc) != 16:
        raise SystemExit(f"ITER {anio}: se esperaban 16 alcaldías y hay {len(alc)}.")

    def n(fr, col):
        v = pd.to_numeric(fr[col].iloc[0], errors="coerce")
        return None if pd.isna(v) else float(v)

    e_hli, e_hog, e_hli5 = CONTROL_ITER[anio]
    if (n(ent, "P3YM_HLI"), n(ent, "PHOG_IND"), n(ent, "P5_HLI")) != (e_hli, e_hog, e_hli5):
        raise SystemExit(f"ITER {anio}: el total de la entidad no cuadra con la cifra oficial.")

    filas = []
    for nivel, fr in (("entidad", ent), *(("alcaldia", alc[alc["MUN"] == k]) for k in ALCALDIAS)):
        cve = "09" if nivel == "entidad" else fr["MUN"].iloc[0]
        for suf, sexo in SEXOS.items():
            filas.append(fila(anio, nivel, cve, "hablantes3", sexo, n(fr, "P3YM_HLI" + suf), n(fr, "P_3YMAS" + suf), "censo", fuente))
            filas.append(fila(anio, nivel, cve, "monolingues", sexo, n(fr, "P3HLINHE" + suf), n(fr, "P3YM_HLI" + suf), "censo", fuente))
        filas.append(fila(anio, nivel, cve, "hablantes5", "Total", n(fr, "P5_HLI"), n(fr, "P_5YMAS"), "censo", fuente))
        filas.append(fila(anio, nivel, cve, "hogares", "Total", n(fr, "PHOG_IND"), n(fr, "POBTOT"), "censo", fuente))
    return filas


# ---------------------------------------------------------------- muestras (2015, 2020)
FUENTE_MUESTRA = {2015: "Encuesta Intercensal 2015 (INEGI), microdatos", 2020: "Censo de Población y Vivienda 2020 (INEGI), cuestionario ampliado"}
POB_MUESTRA = {2015: ["hablantes3", "monolingues", "autoads", "todas"], 2020: ["autoads", "todas"]}


def leer_muestra(anio):
    con = duckdb.connect()
    con.execute("PRAGMA disable_progress_bar")
    CARGADORES[anio](con)
    hli, aut = comprobar(con, anio)
    print(f"[ok] muestra {anio}: hablantes {hli:,.0f}, se consideran indígenas {aut:,.0f}", file=sys.stderr)
    union = con.execute("SELECT ROUND(SUM(CASE WHEN hli OR autoads THEN w END)), ROUND(SUM(CASE WHEN hli AND autoads THEN w END)) FROM m").fetchone()
    anotar_calculado("serie", f"union_{anio}", union[0], "personas que hablan lengua indígena o se consideran indígenas (una sola vez)")
    anotar_calculado("serie", f"ambas_{anio}", union[1], "personas que hablan lengua indígena y además se consideran indígenas")

    con.execute("""
    CREATE OR REPLACE TABLE base AS
    SELECT anio, cve_mun, sexo, w, upm, est,
      hli AS y_hablantes3, (hli IS NOT NULL AND edad >= 3) AS u_hablantes3,
      monolingue AS y_monolingues, (monolingue IS NOT NULL) AS u_monolingues,
      autoads AS y_autoads, TRUE AS u_autoads,
      (COALESCE(hli, FALSE) OR COALESCE(autoads, FALSE)) AS y_todas, TRUE AS u_todas
    FROM m WHERE sexo IS NOT NULL
    """)
    # Con sexo 'Total' además de Mujeres/Hombres: dos pasadas, como en comun.agregar.
    con.execute("CREATE OR REPLACE VIEW base_t AS SELECT anio, cve_mun, 'Total' AS sexo, * EXCLUDE (anio, cve_mun, sexo) FROM base")
    con.execute("CREATE OR REPLACE VIEW base_e AS SELECT anio, '09' AS cve_mun, sexo, * EXCLUDE (anio, cve_mun, sexo) FROM base")
    con.execute("CREATE OR REPLACE VIEW base_et AS SELECT anio, '09' AS cve_mun, 'Total' AS sexo, * EXCLUDE (anio, cve_mun, sexo) FROM base")
    ind = [{"clave": k, "tema": "serie", "indicador": k, "universo": UNIVERSO[k]} for k in POB_MUESTRA[anio]]
    partes = [agregar(con, t, ["anio", "cve_mun", "sexo"], ind) for t in ("base", "base_t", "base_e", "base_et")]
    largo = pd.concat(partes, ignore_index=True)

    filas = []
    for _, r in largo.iterrows():
        nivel = "entidad" if r["cve_mun"] == "09" else "alcaldia"
        filas.append(fila(anio, nivel, r["cve_mun"], r["indicador"], r["sexo"], r["num"], r["den"], "muestra",
                          FUENTE_MUESTRA[anio], casos=int(r["casos"]), ee=r["ee"]))
    return filas


# ---------------------------------------------------------------- EIC 2025, conjunto 105
def leer_eic2025():
    ruta = os.path.join(CRUDO, "eic2025", "conjunto_de_datos", "conjunto_datos_eic2025_105.csv")
    d = pd.read_csv(ruta, dtype=str, encoding="latin-1", low_memory=False)
    d = d[(d["CVE_ENT"].str.zfill(2) == "09") & (d["CVE_LOC"].str.zfill(4) == "0000")].copy()
    d["CVE_MUN"] = d["CVE_MUN"].str.zfill(3)
    fuente = "Encuesta Intercensal 2025 (INEGI), principales resultados por localidad de 50 000 y más habitantes"
    filas = []
    for cve in ["000", *ALCALDIAS]:
        v = d[(d["CVE_MUN"] == cve) & (d["ESTIMADOR"] == "Valor")].iloc[0]
        e = d[(d["CVE_MUN"] == cve) & (d["ESTIMADOR"] == "Error estándar")].iloc[0]
        nivel, cve_out = ("entidad", "09") if cve == "000" else ("alcaldia", cve)
        f = lambda col: float(pd.to_numeric(v[col], errors="coerce"))  # noqa: E731
        ef = lambda col: float(pd.to_numeric(e[col], errors="coerce")) / 100  # el error del porcentaje, en proporción  # noqa: E731
        for suf, sexo in SEXOS.items():
            den3 = f("P_3YMAS" + suf)
            filas.append(fila(2025, nivel, cve_out, "hablantes3", sexo, f("PCN_P3YM_HLI" + suf) / 100 * den3, den3, "muestra", fuente, ee=ef("PCN_P3YM_HLI" + suf)))
            dent = f("POBTOT" if suf == "" else "POBFEM" if suf == "_F" else "POBMAS")
            filas.append(fila(2025, nivel, cve_out, "autoads", sexo, f("PCN_POB_IND" + suf) / 100 * dent, dent, "muestra", fuente, ee=ef("PCN_POB_IND" + suf)))
        # Monolingües: porcentaje sobre los hablantes.
        hli = f("PCN_P3YM_HLI") / 100 * f("P_3YMAS")
        filas.append(fila(2025, nivel, cve_out, "monolingues", "Total", f("PCN_P3HLINHE") / 100 * hli, hli, "muestra", fuente, ee=ef("PCN_P3HLINHE")))
        pob, phog, ephog = f("POBTOT"), f("PHOG_IND"), float(pd.to_numeric(e["PHOG_IND"], errors="coerce"))
        filas.append(fila(2025, nivel, cve_out, "hogares", "Total", phog, pob, "muestra", fuente, ee=ephog / pob if pob else None))
    return filas


def main():
    filas = []
    for anio in (2010, 2020):
        filas += leer_iter(anio)
        print(f"[ok] ITER {anio}", file=sys.stderr)
    for anio in (2015, 2020):
        filas += leer_muestra(anio)
    filas += leer_eic2025()
    print("[ok] EIC 2025", file=sys.stderr)

    df = pd.DataFrame(filas, columns=COLUMNAS)
    df["num"] = df["num"].round(2)
    df["den"] = df["den"].round(2)
    df["ee"] = pd.to_numeric(df["ee"], errors="coerce").round(6)
    df = df.sort_values(["anio", "nivel", "cve", "poblacion", "sexo"]).reset_index(drop=True)

    # Cifras de la ciudad que se cotejan en verificaciones.csv.
    def tasa(anio, pob, cota=None):
        q = (df["anio"] == anio) & (df["nivel"] == "entidad") & (df["poblacion"] == pob) & (df["sexo"] == "Total")
        if cota:
            q &= df["cota"] == cota
        r = df[q].iloc[0]
        return 100 * r["num"] / r["den"], r["num"]

    for anio, pob, clave in ((2010, "hablantes3", "cdmx_hli3_2010"), (2020, "hablantes3", "cdmx_hli3_2020"), (2015, "hablantes3", "cdmx_hli3_2015"),
                             (2025, "hablantes3", "cdmx_hli3_2025"), (2015, "autoads", "cdmx_autoads_2015"), (2020, "autoads", "cdmx_autoads_2020"),
                             (2025, "autoads", "cdmx_autoads_2025"), (2010, "hogares", "cdmx_phog_2010"), (2020, "hogares", "cdmx_phog_2020"),
                             (2025, "hogares", "cdmx_phog_2025")):
        pct, n = tasa(anio, pob)
        anotar_calculado("serie", clave, pct, f"% de {pob} en la CDMX, {anio}")
        anotar_calculado("serie", clave + "_n", n, f"personas ({pob}) en la CDMX, {anio}")
    q = (df["anio"] == 2015) & (df["nivel"] == "alcaldia") & (df["poblacion"] == "hablantes3") & (df["sexo"] == "Total")
    izt = df[q & (df["cve"] == "007")]["num"].iloc[0]
    anotar_calculado("serie", "iztapalapa_parte_2015", 100 * izt / df[q]["num"].sum(), "% de los hablantes de la CDMX que viven en Iztapalapa, 2015")

    df.to_csv(SALIDA, index=False, encoding="utf-8")
    print(f"[ok] {os.path.relpath(SALIDA, RAIZ)}: {len(df):,} filas", file=sys.stderr)


if __name__ == "__main__":
    main()

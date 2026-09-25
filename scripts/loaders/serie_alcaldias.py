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
  monolingues  hablantes que no hablan español, sobre los hablantes
  hogares      población en hogares censales indígenas, sobre la población
  autoads      se considera indígena (2000, 2010, 2015, 2020, 2025)
  todas        habla lengua indígena O se considera indígena; una persona
               cuenta una sola vez
  ambas        habla lengua indígena Y se considera indígena

De dónde sale cada edición (conteo censal = ITER; muestra = microdatos):
  1990  ITER: hablantes 5+ como suma de quienes hablan y no hablan español
        (el tabulado no publica el total ni a quienes no especificaron
        español: en la ciudad faltan 3 905 de 111 552). Población de 5 años y
        más estimada con la proporción de la muestra del 10 % por delegación,
        porque el ITER 1990 solo publica la población total.
  1995  ITER: P5HLIND / P5YMAS; monolingües P5HLIYNE
  2000  ITER: P5_HLI / P5_MAS; muestra ampliada: autoads (universo 5+, con
        la pregunta de pertenencia a un grupo indígena), todas y ambas
  2005  ITER: P5YMAHLI(_M/_F) / P_5YMAS; monolingües; hogares P_HOG_IND
  2010  ITER 3+ y 5+, sexo, hogares; muestra ampliada: autoads (3+), todas, ambas
  2015  Encuesta Intercensal, microdatos: hablantes 3+, monolingües, autoads,
        todas, ambas; con error de diseño
  2020  ITER (hablantes, sexo, hogares); ampliado: autoads, todas, ambas
  2025  Encuesta Intercensal, tabulado 105 (hablantes 3+, monolingües,
        hogares, autoads con error publicado) y microdatos (todas, ambas)

Guardias: los totales de la entidad se cotejan contra el ITER (1995:
100 890; 2000: 141 710; 2005: 118 424; 2010: 123 224 / 271 463; 2020:
125 153 / 289 139), la SEPI (autoads 2020: 825 348) y el documento de la
Secretaría de Cultura (2015: 129 355 / 784 605).
"""
import os
import sys

import duckdb
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from comun import agregar, anotar_calculado  # noqa: E402
from muestras import CARGADORES, CRUDO, EDAD_AUTOADS, EDAD_HLI, SIN_DISENO, comprobar  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SALIDA = os.path.join(RAIZ, "src", "data", "serie_alcaldias.csv")

COLUMNAS = ["anio", "nivel", "cve", "nombre", "poblacion", "sexo", "num", "den", "casos", "ee", "cota", "fuente", "universo"]
SEXOS = {"": "Total", "_F": "Mujeres", "_M": "Hombres"}

UNIVERSO = {
    "hablantes3": "Población de 3 años y más",
    "hablantes5": "Población de 5 años y más",
    "monolingues": "Hablantes de lengua indígena",
    "hogares": "Población total",
    "autoads": "Población total",
    "todas": "Población total",
    "ambas": "Población total",
}

ALCALDIAS = {
    "002": "Azcapotzalco", "003": "Coyoacán", "004": "Cuajimalpa de Morelos",
    "005": "Gustavo A. Madero", "006": "Iztacalco", "007": "Iztapalapa",
    "008": "La Magdalena Contreras", "009": "Milpa Alta", "010": "Álvaro Obregón",
    "011": "Tláhuac", "012": "Tlalpan", "013": "Xochimilco", "014": "Benito Juárez",
    "015": "Cuauhtémoc", "016": "Miguel Hidalgo", "017": "Venustiano Carranza",
}


def fila(anio, nivel, cve, poblacion, sexo, num, den, cota, fuente, casos=None, ee=None, universo=None):
    return {"anio": anio, "nivel": nivel, "cve": cve, "nombre": "Ciudad de México" if nivel == "entidad" else ALCALDIAS[cve],
            "poblacion": poblacion, "sexo": sexo, "num": num, "den": den, "casos": casos, "ee": ee,
            "cota": cota, "fuente": fuente, "universo": universo or UNIVERSO[poblacion]}


def _num(v):
    try:
        x = float(str(v).strip())
    except (TypeError, ValueError):
        return None
    return x


# ---------------------------------------------------------------- ITER (conteo censal)
# Por edición: ruta, fuente, columnas (clave de municipio, localidad, población
# total y variables de lengua) y cifra oficial de hablantes 5+ para la guardia.
ITER_DBF = {
    1990: ("iter/iter1990/iter_naldbf90.dbf", "Censo General de Población y Vivienda 1990 (INEGI), ITER", 107_647),
    1995: ("iter/iter1995/ITER_NALDBF95.dbf", "Conteo de Población y Vivienda 1995 (INEGI), ITER", 100_890),
    2000: ("iter/iter2000/ITER_NALDBF00.dbf", "Censo General de Población y Vivienda 2000 (INEGI), ITER", 141_710),
    2005: ("iter/iter2005/ITER_NALDBF05.dbf", "II Conteo de Población y Vivienda 2005 (INEGI), ITER", 118_424),
}
ITER_CSV = {
    2010: ("iter/iter_09_cpv2010/conjunto_de_datos/iter_09_cpv2010.csv", "Censo de Población y Vivienda 2010 (INEGI), ITER"),
    2020: ("iter/iter_09_cpv2020/conjunto_de_datos/conjunto_de_datos_iter_09CSV20.csv", "Censo de Población y Vivienda 2020 (INEGI), ITER"),
}
CONTROL_ITER = {2010: (123_224, 271_463, 122_411), 2020: (125_153, 289_139, 124_540)}


def leer_dbf_cdmx(ruta, columnas):
    from dbfread import DBF
    filas = []
    for r in DBF(ruta, encoding="latin-1", load=False):
        if str(r.get("ENTIDAD", "")).strip() != "09":
            continue
        if str(r.get("LOC", "")).strip() != "0000":
            continue
        filas.append({c: (str(r.get(c)).strip() if r.get(c) is not None else None) for c in columnas})
    return pd.DataFrame(filas, columns=columnas)


def proporcion_5ymas_1990():
    """Proporción de población de 5 años y más por delegación, de la muestra
    del 10 % de 1990: el ITER 1990 no publica la población de 5 años y más."""
    con = duckdb.connect()
    CARGADORES[1990](con)
    d = con.execute("SELECT cve_mun, SUM(w) AS total, SUM(CASE WHEN edad >= 5 THEN w END) AS cinco FROM m GROUP BY 1").df()
    prop = dict(zip(d["cve_mun"], d["cinco"] / d["total"]))
    prop["09"] = d["cinco"].sum() / d["total"].sum()
    return prop


def leer_iter_dbf(anio):
    ruta, fuente, oficial = ITER_DBF[anio]
    ruta = os.path.join(CRUDO, ruta)
    if not os.path.exists(ruta):
        print(f"[aviso] sin ITER {anio} en {ruta}; se omite", file=sys.stderr)
        return []
    if anio == 1990:
        cols = ["ENTIDAD", "MUN", "LOC", "P_TOTAL", "HOMBRES", "MUJERES", "N_HAB_ESP", "HABLA_ESP"]
    elif anio == 1995:
        cols = ["ENTIDAD", "MUN", "LOC", "POBTOTAL", "P5YMAS", "P5HLIND", "P5HLIYNE"]
    elif anio == 2000:
        cols = ["ENTIDAD", "MUN", "LOC", "POBTOT", "P5_MAS", "P5_HLI", "P5_HLIYNE"]
    else:
        cols = ["ENTIDAD", "MUN", "LOC", "P_TOTAL", "P_5YMAS", "P_5YMAS_M", "P_5YMAS_F", "P5YMAHLI", "P5YMAHLI_M", "P5YMAHLI_F", "P5YMALINE", "P_HOG_IND"]
    d = leer_dbf_cdmx(ruta, cols)
    d["MUN"] = d["MUN"].str.zfill(3)
    if len(d[d["MUN"] != "000"]) != 16:
        raise SystemExit(f"ITER {anio}: se esperaban 16 delegaciones y hay {len(d[d['MUN'] != '000'])}.")
    ent = d[d["MUN"] == "000"].iloc[0]
    prop5 = proporcion_5ymas_1990() if anio == 1990 else None

    filas = []
    for _, r in d.iterrows():
        nivel, cve = ("entidad", "09") if r["MUN"] == "000" else ("alcaldia", r["MUN"])
        if anio == 1990:
            num = (_num(r["N_HAB_ESP"]) or 0) + (_num(r["HABLA_ESP"]) or 0)
            den = _num(r["P_TOTAL"]) * prop5[cve]
            filas.append(fila(anio, nivel, cve, "hablantes5", "Total", num, round(den), "censo", fuente,
                              universo="Población de 5 años y más (estimada con la muestra del 10 %)"))
            filas.append(fila(anio, nivel, cve, "monolingues", "Total", _num(r["N_HAB_ESP"]), num, "censo", fuente))
        elif anio == 1995:
            filas.append(fila(anio, nivel, cve, "hablantes5", "Total", _num(r["P5HLIND"]), _num(r["P5YMAS"]), "censo", fuente))
            filas.append(fila(anio, nivel, cve, "monolingues", "Total", _num(r["P5HLIYNE"]), _num(r["P5HLIND"]), "censo", fuente))
        elif anio == 2000:
            filas.append(fila(anio, nivel, cve, "hablantes5", "Total", _num(r["P5_HLI"]), _num(r["P5_MAS"]), "censo", fuente))
            filas.append(fila(anio, nivel, cve, "monolingues", "Total", _num(r["P5_HLIYNE"]), _num(r["P5_HLI"]), "censo", fuente))
        else:
            for suf, sexo in SEXOS.items():
                filas.append(fila(anio, nivel, cve, "hablantes5", sexo, _num(r["P5YMAHLI" + suf]), _num(r["P_5YMAS" + suf]), "censo", fuente))
            filas.append(fila(anio, nivel, cve, "monolingues", "Total", _num(r["P5YMALINE"]), _num(r["P5YMAHLI"]), "censo", fuente))
            filas.append(fila(anio, nivel, cve, "hogares", "Total", _num(r["P_HOG_IND"]), _num(r["P_TOTAL"]), "censo", fuente))
    total = next(f["num"] for f in filas if f["nivel"] == "entidad" and f["poblacion"] == "hablantes5")
    if abs(total - oficial) > 1:
        raise SystemExit(f"ITER {anio}: hablantes de la entidad {total:,.0f}; se esperaban {oficial:,}.")
    return filas


def leer_iter_csv(anio):
    ruta, fuente = ITER_CSV[anio]
    d = pd.read_csv(os.path.join(CRUDO, ruta), dtype=str, low_memory=False)
    d.columns = [c.upper() for c in d.columns]
    d["MUN"] = d["MUN"].str.zfill(3)
    d["LOC"] = d["LOC"].str.zfill(4)
    ent = d[d["MUN"] == "000"].head(1)
    alc = d[(d["MUN"] != "000") & (d["LOC"] == "0000")]
    if len(alc) != 16:
        raise SystemExit(f"ITER {anio}: se esperaban 16 alcaldías y hay {len(alc)}.")

    def n(fr, col):
        return _num(fr[col].iloc[0])

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


# ---------------------------------------------------------------- muestras
FUENTE_MUESTRA = {
    1990: "Censo General de Población y Vivienda 1990 (INEGI), muestra del 10 %",
    2000: "Censo General de Población y Vivienda 2000 (INEGI), cuestionario ampliado",
    2005: "II Conteo de Población y Vivienda 2005 (INEGI), muestra",
    2010: "Censo de Población y Vivienda 2010 (INEGI), cuestionario ampliado",
    2015: "Encuesta Intercensal 2015 (INEGI), microdatos",
    2020: "Censo de Población y Vivienda 2020 (INEGI), cuestionario ampliado",
    2025: "Encuesta Intercensal 2025 (INEGI), microdatos",
}
# Qué poblaciones salen de cada muestra. Los hablantes solo de 2015 (la
# única edición sin conteo censal completo del básico).
POB_MUESTRA = {
    2000: ["autoads", "todas", "ambas"], 2010: ["autoads", "todas", "ambas"],
    2015: ["hablantes3", "monolingues", "autoads", "todas", "ambas"],
    2020: ["autoads", "todas", "ambas"], 2025: ["todas", "ambas"],
}


def leer_muestra(anio):
    con = duckdb.connect()
    con.execute("PRAGMA disable_progress_bar")
    CARGADORES[anio](con)
    hli, aut = comprobar(con, anio)
    print(f"[ok] muestra {anio}: hablantes {hli:,.0f}, se consideran indígenas {aut}", file=sys.stderr)
    union = con.execute("SELECT ROUND(SUM(CASE WHEN hli OR autoads THEN w END)), ROUND(SUM(CASE WHEN hli AND autoads THEN w END)) FROM m").fetchone()
    anotar_calculado("serie", f"union_{anio}", union[0], "personas que hablan lengua indígena o se consideran indígenas (una sola vez)")
    anotar_calculado("serie", f"ambas_{anio}", union[1], "personas que hablan lengua indígena y además se consideran indígenas")

    # El universo de la autoadscripción cambia: 5+ en 2000, 3+ en 2010, todas
    # las edades desde 2015. La unión y la intersección usan ese mismo universo.
    e_aut = EDAD_AUTOADS[anio]
    e_hli = EDAD_HLI[anio]
    con.execute(f"""
    CREATE OR REPLACE TABLE base AS
    SELECT anio, cve_mun, sexo, w, upm, est,
      hli AS y_hablantes3, (hli IS NOT NULL AND edad >= {e_hli}) AS u_hablantes3,
      monolingue AS y_monolingues, (monolingue IS NOT NULL) AS u_monolingues,
      autoads AS y_autoads, (edad >= {e_aut} OR edad IS NULL) AS u_autoads,
      (COALESCE(hli, FALSE) OR COALESCE(autoads, FALSE)) AS y_todas, (edad >= {e_aut} OR edad IS NULL) AS u_todas,
      (COALESCE(hli, FALSE) AND COALESCE(autoads, FALSE)) AS y_ambas, (edad >= {e_aut} OR edad IS NULL) AS u_ambas
    FROM m WHERE sexo IS NOT NULL
    """)
    con.execute("CREATE OR REPLACE VIEW base_t AS SELECT anio, cve_mun, 'Total' AS sexo, * EXCLUDE (anio, cve_mun, sexo) FROM base")
    con.execute("CREATE OR REPLACE VIEW base_e AS SELECT anio, '09' AS cve_mun, sexo, * EXCLUDE (anio, cve_mun, sexo) FROM base")
    con.execute("CREATE OR REPLACE VIEW base_et AS SELECT anio, '09' AS cve_mun, 'Total' AS sexo, * EXCLUDE (anio, cve_mun, sexo) FROM base")
    universo_aut = "Población total" if e_aut == 0 else f"Población de {e_aut} años y más"
    ind = [{"clave": k, "tema": "serie", "indicador": k, "universo": UNIVERSO[k]} for k in POB_MUESTRA[anio]]
    partes = [agregar(con, t, ["anio", "cve_mun", "sexo"], ind) for t in ("base", "base_t", "base_e", "base_et")]
    largo = pd.concat(partes, ignore_index=True)

    filas = []
    for _, r in largo.iterrows():
        nivel = "entidad" if r["cve_mun"] == "09" else "alcaldia"
        uni = universo_aut if r["indicador"] in ("autoads", "todas", "ambas") else None
        filas.append(fila(anio, nivel, r["cve_mun"], r["indicador"], r["sexo"], r["num"], r["den"], "muestra",
                          FUENTE_MUESTRA[anio], casos=int(r["casos"]), ee=None if anio in SIN_DISENO else r["ee"], universo=uni))
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
        ef = lambda col: float(pd.to_numeric(e[col], errors="coerce")) / 100  # noqa: E731
        for suf, sexo in SEXOS.items():
            den3 = f("P_3YMAS" + suf)
            filas.append(fila(2025, nivel, cve_out, "hablantes3", sexo, f("PCN_P3YM_HLI" + suf) / 100 * den3, den3, "muestra", fuente, ee=ef("PCN_P3YM_HLI" + suf)))
            dent = f("POBTOT" if suf == "" else "POBFEM" if suf == "_F" else "POBMAS")
            filas.append(fila(2025, nivel, cve_out, "autoads", sexo, f("PCN_POB_IND" + suf) / 100 * dent, dent, "muestra", fuente, ee=ef("PCN_POB_IND" + suf)))
        hli = f("PCN_P3YM_HLI") / 100 * f("P_3YMAS")
        filas.append(fila(2025, nivel, cve_out, "monolingues", "Total", f("PCN_P3HLINHE") / 100 * hli, hli, "muestra", fuente, ee=ef("PCN_P3HLINHE")))
        pob, phog, ephog = f("POBTOT"), f("PHOG_IND"), float(pd.to_numeric(e["PHOG_IND"], errors="coerce"))
        filas.append(fila(2025, nivel, cve_out, "hogares", "Total", phog, pob, "muestra", fuente, ee=ephog / pob if pob else None))
    return filas


def main():
    filas = []
    for anio in (1990, 1995, 2000, 2005):
        filas += leer_iter_dbf(anio)
        print(f"[ok] ITER {anio}", file=sys.stderr)
    for anio in (2010, 2020):
        filas += leer_iter_csv(anio)
        print(f"[ok] ITER {anio}", file=sys.stderr)
    for anio in (2000, 2010, 2015, 2020, 2025):
        filas += leer_muestra(anio)
    filas += leer_eic2025()
    print("[ok] EIC 2025", file=sys.stderr)

    df = pd.DataFrame(filas, columns=COLUMNAS)
    df["num"] = pd.to_numeric(df["num"]).round(2)
    df["den"] = pd.to_numeric(df["den"]).round(2)
    df["ee"] = pd.to_numeric(df["ee"], errors="coerce").round(6)
    df = df.sort_values(["anio", "nivel", "cve", "poblacion", "sexo"]).reset_index(drop=True)

    def tasa(anio, pob):
        q = (df["anio"] == anio) & (df["nivel"] == "entidad") & (df["poblacion"] == pob) & (df["sexo"] == "Total")
        r = df[q].iloc[0]
        return 100 * r["num"] / r["den"], r["num"]

    for anio, pob, clave in ((1990, "hablantes5", "cdmx_hli5_1990"), (1995, "hablantes5", "cdmx_hli5_1995"), (2000, "hablantes5", "cdmx_hli5_2000"),
                             (2005, "hablantes5", "cdmx_hli5_2005"), (2010, "hablantes5", "cdmx_hli5_2010"), (2020, "hablantes5", "cdmx_hli5_2020"),
                             (2010, "hablantes3", "cdmx_hli3_2010"), (2020, "hablantes3", "cdmx_hli3_2020"), (2015, "hablantes3", "cdmx_hli3_2015"),
                             (2025, "hablantes3", "cdmx_hli3_2025"), (2000, "autoads", "cdmx_autoads_2000"), (2010, "autoads", "cdmx_autoads_2010"),
                             (2015, "autoads", "cdmx_autoads_2015"), (2020, "autoads", "cdmx_autoads_2020"), (2025, "autoads", "cdmx_autoads_2025"),
                             (2005, "hogares", "cdmx_phog_2005"), (2010, "hogares", "cdmx_phog_2010"), (2020, "hogares", "cdmx_phog_2020"),
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

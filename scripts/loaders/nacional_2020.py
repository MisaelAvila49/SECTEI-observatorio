"""
nacional_2020.py: hablantes de lengua indígena, población en hogares indígenas
y población que se considera indígena por entidad y municipio de todo el
país, Censo 2020, por sexo y grupo de edad.

Es la tabla de la beta del libro (página /beta): un solo archivo largo con el
grano más fino que la fuente permite y las celdas de total escritas aquí, no
en el navegador. Dos cotas, como en la serie por alcaldía:

  censo    conteo del ITER nacional 2020 (INEGI, principales resultados por
           localidad, filas de total de entidad y de municipio): hablantes de
           3 años y más por sexo y población en hogares indígenas. Es la cifra
           oficial y exacta; no tiene error ni grupo de edad.
  muestra  cuestionario ampliado nacional (Personas00.CSV): hablantes y
           autoadscritos por grupo de edad y sexo, con error de diseño por
           linearización de Taylor. La muestra SOBREESTIMA a los hablantes
           frente al conteo (2 % en el país, 14 % en la Ciudad de México), así
           que sus celdas se publican solo donde el conteo no llega (edad y
           autoadscripción) y rotuladas como estimación.

Códigos verificados en censo.py: HLENGUA 1 = habla, 3 = no, 9 = no
especificado (vacío en menores de 3); PERTE_INDIGENA 1 = sí, 3 = no; SEXO 1 =
hombre, 3 = mujer. Universos: hablantes sobre la población de 3 años y más;
hogares indígenas sobre la población total; autoadscripción sobre la
población de 3 años y más (PERTE_INDIGENA viene vacía en menores de 3: se
comprobó contando frecuencias, y así reproduce los 23 229 089 y el 19.4 %
que publica el INEGI).

Salida: src/data/hablantes_nacional_2020.csv con
  anio, nivel (nacional|entidad|municipio), cve (00 | 2 | 5 dígitos), nombre,
  poblacion (hablantes|hogares|autoads|todas|ambas), sexo (Total|Mujeres|Hombres),
  edad (Todas|3-14|15-29|30-59|60+), num, den, casos, ee, cota

Guardias: el ITER nacional da 7 364 645 hablantes de 3 y más (cifra oficial)
y la muestra queda dentro del 3 % de esa cifra; la desviación de la muestra en
la Ciudad de México se anota en calculado.csv.
"""
import json
import os
import sys

import duckdb
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from comun import ENTIDADES, agregar, anotar_calculado  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PERSONAS = os.environ.get("CENSO2020_PERSONAS", r"D:\IMPORTANTE\SocialDataIbero\AnalisisSueltos\JCF\data\raw\censo2020\Personas00.CSV")
ITER = os.path.join(RAIZ, "data-raw", "iter", "iter_00_cpv2020", "conjunto_de_datos", "conjunto_de_datos_iter_00CSV20.csv")
GEO = os.path.join(RAIZ, "src", "data", "municipios_mx.geojson")
SALIDA = os.path.join(RAIZ, "src", "data", "hablantes_nacional_2020.csv")
OFICIAL_NACIONAL = 7_364_645
FUENTE_CENSO = "Censo de Población y Vivienda 2020 (INEGI), ITER"
FUENTE_MUESTRA = "Censo de Población y Vivienda 2020 (INEGI), cuestionario ampliado"


def censo(ent_nombre, nombres):
    """Filas de conteo: nacional, entidad y municipio, por sexo, del ITER."""
    con = duckdb.connect()
    d = con.execute(f"""
      SELECT lpad(ENTIDAD, 2, '0') AS ent, lpad(ENTIDAD, 2, '0') || lpad(MUN, 3, '0') AS mun, LOC AS loc,
        TRY_CAST(POBTOT AS DOUBLE) AS POBTOT, TRY_CAST(PHOG_IND AS DOUBLE) AS PHOG_IND,
        TRY_CAST(P_3YMAS AS DOUBLE) AS P_3YMAS, TRY_CAST(P_3YMAS_F AS DOUBLE) AS P_3YMAS_F, TRY_CAST(P_3YMAS_M AS DOUBLE) AS P_3YMAS_M,
        TRY_CAST(P3YM_HLI AS DOUBLE) AS P3YM_HLI, TRY_CAST(P3YM_HLI_F AS DOUBLE) AS P3YM_HLI_F, TRY_CAST(P3YM_HLI_M AS DOUBLE) AS P3YM_HLI_M
      FROM read_csv('{ITER}', all_varchar=true, header=true)
      WHERE LOC = '0000'""").df()
    filas = []
    for r in d.itertuples():
        if r.ent == "00":
            nivel, cve, nombre = "nacional", "00", "Estados Unidos Mexicanos"
        elif r.mun.endswith("000"):
            nivel, cve, nombre = "entidad", r.ent, ent_nombre.get(r.ent, r.ent)
        else:
            nivel, cve, nombre = "municipio", r.mun, nombres.get(r.mun, r.mun)
        base = {"anio": 2020, "nivel": nivel, "cve": cve, "nombre": nombre, "edad": "Todas", "casos": None, "ee": None, "cota": "censo"}
        for sexo, suf in (("Total", ""), ("Mujeres", "_F"), ("Hombres", "_M")):
            filas.append({**base, "poblacion": "hablantes", "sexo": sexo, "num": getattr(r, "P3YM_HLI" + suf), "den": getattr(r, "P_3YMAS" + suf)})
        filas.append({**base, "poblacion": "hogares", "sexo": "Total", "num": r.PHOG_IND, "den": r.POBTOT})
    out = pd.DataFrame(filas)
    tot = out[(out.nivel == "nacional") & (out.poblacion == "hablantes") & (out.sexo == "Total")].iloc[0]
    if int(tot.num) != OFICIAL_NACIONAL:
        raise SystemExit(f"El ITER nacional da {int(tot.num):,} hablantes y la cifra oficial es {OFICIAL_NACIONAL:,}.")
    print(f"[ok] ITER 2020: {len(out):,} filas de conteo; hablantes 3+ nacionales {int(tot.num):,}", file=sys.stderr)
    return out


def muestra(ent_nombre, nombres):
    """Filas de la muestra: grupos de edad (hablantes y autoads) y autoads total."""
    con = duckdb.connect()
    con.execute("PRAGMA disable_progress_bar")
    con.execute(f"""
      CREATE TABLE m AS
      SELECT lpad(ENT, 2, '0') AS ent, lpad(ENT, 2, '0') || lpad(MUN, 3, '0') AS mun,
        CASE SEXO WHEN '1' THEN 'Hombres' WHEN '3' THEN 'Mujeres' END AS sexo,
        CASE WHEN TRY_CAST(EDAD AS INTEGER) BETWEEN 3 AND 14 THEN '3-14'
             WHEN TRY_CAST(EDAD AS INTEGER) BETWEEN 15 AND 29 THEN '15-29'
             WHEN TRY_CAST(EDAD AS INTEGER) BETWEEN 30 AND 59 THEN '30-59'
             WHEN TRY_CAST(EDAD AS INTEGER) BETWEEN 60 AND 130 THEN '60+' END AS grupo,
        HLENGUA = '1' AS y_hli, TRY_CAST(EDAD AS INTEGER) >= 3 AS u_hli,
        PERTE_INDIGENA = '1' AS y_autoads, TRY_CAST(EDAD AS INTEGER) >= 3 AS u_autoads,
        (HLENGUA = '1' OR PERTE_INDIGENA = '1') AS y_todas, TRY_CAST(EDAD AS INTEGER) >= 3 AS u_todas,
        (HLENGUA = '1' AND PERTE_INDIGENA = '1') AS y_ambas, TRY_CAST(EDAD AS INTEGER) >= 3 AS u_ambas,
        CAST(FACTOR AS DOUBLE) AS w, UPM AS upm, ESTRATO AS est
      FROM read_csv('{PERSONAS}', all_varchar=true, header=true)
      WHERE SEXO IN ('1', '3') AND TRY_CAST(EDAD AS INTEGER) < 999""")
    n = con.execute("SELECT COUNT(*), ROUND(SUM(w)) FROM m").fetchone()
    print(f"[ok] muestra 2020: {n[0]:,} personas, {n[1]:,.0f} expandidas", file=sys.stderr)
    # todas = habla la lengua O se considera indígena (una persona cuenta una
    # vez); ambas = habla Y se considera. Los hogares indígenas no entran en la
    # unión: la muestra no trae la marca de hogar por persona.
    ind = [{"clave": "hli", "tema": "nacional", "indicador": "hablantes", "universo": "Población de 3 años y más"},
           {"clave": "autoads", "tema": "nacional", "indicador": "autoads", "universo": "Población de 3 años y más"},
           {"clave": "todas", "tema": "nacional", "indicador": "todas", "universo": "Población de 3 años y más"},
           {"clave": "ambas", "tema": "nacional", "indicador": "ambas", "universo": "Población de 3 años y más"}]
    partes = []
    for nivel, cve in (("nacional", "'00'"), ("entidad", "ent"), ("municipio", "mun")):
        for sexo in ("sexo", "'Total'"):
            for edad in ("grupo", "'Todas'"):
                filtro = "WHERE grupo IS NOT NULL" if edad == "grupo" else ""
                con.execute(f"""CREATE OR REPLACE VIEW v AS
                  SELECT '{nivel}' AS nivel, {cve} AS cve, {sexo} AS sexo, {edad} AS edad,
                    y_hli, u_hli, y_autoads, u_autoads, y_todas, u_todas, y_ambas, u_ambas, w, upm, est FROM m {filtro}""")
                partes.append(agregar(con, "v", ["nivel", "cve", "sexo", "edad"], ind))
    out = pd.concat(partes, ignore_index=True).rename(columns={"indicador": "poblacion"})
    out["anio"] = 2020
    out["cota"] = "muestra"
    out["nombre"] = ["Estados Unidos Mexicanos" if r.nivel == "nacional" else ent_nombre.get(r.cve, r.cve) if r.nivel == "entidad" else nombres.get(r.cve, r.cve) for r in out.itertuples()]
    return out


def main():
    for ruta in (PERSONAS, ITER, GEO):
        if not os.path.exists(ruta):
            raise SystemExit(f"Falta {ruta}")
    nombres = {}
    with open(GEO, encoding="utf-8") as f:
        for ft in json.load(f)["features"]:
            p = ft["properties"]
            nombres[str(p["CVEGEO"]).zfill(5)] = p["NOMGEO"]
    ent_nombre = {f"{k:02d}": v for k, v in ENTIDADES.items()}

    c = censo(ent_nombre, nombres)
    m = muestra(ent_nombre, nombres)

    # Cotejo muestra frente a conteo: nacional dentro de 3 %; la desviación por
    # entidad se anota (la CDMX es la mayor, 14 %).
    mt = m[(m.poblacion == "hablantes") & (m.sexo == "Total") & (m.edad == "Todas")].set_index(["nivel", "cve"])["num"]
    ct = c[(c.poblacion == "hablantes") & (c.sexo == "Total")].set_index(["nivel", "cve"])["num"]
    desv = (mt / ct - 1).dropna()
    nac, cdmx = desv.get(("nacional", "00")), desv.get(("entidad", "09"))
    print(f"[ok] muestra vs ITER, hablantes 3+: nacional {100 * nac:+.1f} %, CDMX {100 * cdmx:+.1f} %, máxima por entidad {100 * desv.loc['entidad'].abs().max():.1f} %", file=sys.stderr)
    if abs(nac) > 0.03:
        raise SystemExit("La muestra se aleja más de 3 % del conteo nacional de hablantes.")
    anotar_calculado("nacional", "hablantes3_nacional_2020", float(ct[("nacional", "00")]), "hablantes de 3 años y más en el país, ITER 2020")
    anotar_calculado("nacional", "hablantes3_nacional_2020_muestra", float(mt[("nacional", "00")]), "hablantes de 3 años y más en el país, muestra del Censo 2020")
    anotar_calculado("nacional", "desv_muestra_hli_nacional_2020", 100 * nac, "% de desviación de la muestra frente al ITER, hablantes 3+, país")
    anotar_calculado("nacional", "desv_muestra_hli_cdmx_2020", 100 * cdmx, "% de desviación de la muestra frente al ITER, hablantes 3+, CDMX")
    autoads = m[(m.nivel == "nacional") & (m.poblacion == "autoads") & (m.sexo == "Total") & (m.edad == "Todas")].iloc[0]
    anotar_calculado("nacional", "pct_autoads_nacional_2020", 100 * autoads.num / autoads.den, "% de población de 3 años y más que se considera indígena en el país, muestra del Censo 2020")

    # Se publican: todo el conteo; de la muestra, los grupos de edad y la
    # autoadscripción (que el conteo no tiene).
    m_pub = m[(m.edad != "Todas") | (m.poblacion.isin(["autoads", "todas", "ambas"]))]
    out = pd.concat([c, m_pub], ignore_index=True)
    out = out[out["den"] > 0]
    out = out[["anio", "nivel", "cve", "nombre", "poblacion", "sexo", "edad", "num", "den", "casos", "ee", "cota"]]
    out = out.sort_values(["nivel", "cve", "poblacion", "cota", "sexo", "edad"])
    for col in ("num", "den"):
        out[col] = out[col].round(1)
    out["ee"] = out["ee"].astype(float).round(6)
    out["casos"] = out["casos"].astype("Int64")
    out.to_csv(SALIDA, index=False, encoding="utf-8", lineterminator="\n")
    print(f"[ok] {os.path.relpath(SALIDA, RAIZ)}: {len(out):,} filas ({int((out.cota == 'censo').sum()):,} de conteo, {int((out.cota == 'muestra').sum()):,} de muestra)", file=sys.stderr)


if __name__ == "__main__":
    main()

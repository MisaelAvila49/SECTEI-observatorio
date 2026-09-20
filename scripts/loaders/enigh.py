"""
enigh.py: acceso del hogar a internet y dispositivos por condición indígena,
ENIGH 2020, 2022 y 2024.

Une la tabla de población (que identifica a cada persona: sexo, edad, si
habla lengua indígena y si se considera indígena) con la de hogares (que
dice si el hogar tiene conexión a internet, celular, computadora...) y con
concentradohogar (tamaño de localidad, ingreso para el decil, y las
columnas del diseño muestral). La unidad es la PERSONA de 6 años o más,
ponderada con su factor; lo que se mide es el acceso EN EL HOGAR donde vive.

--- Códigos, verificados contando frecuencias en los microdatos -----------

  hablaind    1 = habla lengua indígena, 2 = no (vacío en menores de 3)
  etnia       1 = se considera indígena, 2 = no
  sexo        1 = hombre, 2 = mujer
  conex_inte  1 = el hogar tiene conexión a internet, 2 = no
  celular     1 = algún integrante tiene celular, 2 = no
  telefono    1 = línea telefónica fija, 2 = no
  tv_paga     1 = televisión de paga, 2 = no
  peliculas   1 = servicio de streaming, 2 = no (solo existe en 2024)
  num_compu   número de computadoras. En 2020 y 2022 es una sola cuenta
              (escritorio y portátil); en 2024 el INEGI la partió en
              num_compu (escritorio) y num_lap (portátil). Contar solo
              num_compu en 2024 bajaría "hogar con computadora" de 26 % a
              7 % sin que nada fallara, así que ese año se combinan las dos.
  tam_loc     1 = 100 mil o más; 2 = 15 mil a 99 999; 3 = 2 500 a 14 999;
              4 = menos de 2 500 (en concentradohogar)
  nivelaprob  0 ninguno, 1 preescolar, 2 primaria, 3 secundaria, 4
              preparatoria, 5 normal, 6 carrera técnica, 7 profesional, 8 y
              9 posgrado (en 2024 aparece también 10). Tramos: 0-2 primaria
              o menos; 3 secundaria; 4-6 media superior; 7 en adelante
              superior.

La entidad son los dos primeros dígitos de folioviv (con ceros a la
izquierda). El factor de persona, upm y est_dis se heredan de
concentradohogar cuando la tabla de población no los trae (2020).
"""

import os
import sys

import duckdb
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import (  # noqa: E402
    agregar, completar, escribir, guardia, anotar_calculado, sql_rango_edad,
    sql_entidad, LLAVES_BASE, EDAD_MINIMA, EDAD_MINIMA_ESCOLARIDAD,
)

BASE_ENIGH = os.environ.get("ENIGH_DIR", r"D:\IMPORTANTE\SocialDataIbero\AnalisisSueltos\Obindi\enigh")
BASE_HOG = os.environ.get(
    "ENIGH_HOGARES_DIR",
    r"D:\IMPORTANTE\SocialDataIbero\Framework\discriminacion-mujeres\src\data\raw\enigh_hogares",
)
ANIOS = [2020, 2022, 2024]

TEMA = "enigh-hogar"
FUENTE = "ENIGH (INEGI)"
UNIVERSO = "Personas de 6 años o más"


def leer(ruta):
    df = pd.read_csv(ruta, low_memory=False, dtype=str)
    df.columns = df.columns.str.replace("\ufeff", "", regex=False).str.lower().str.strip()
    return df


def decil_ponderado(ing_pc, factor):
    """Decil ponderado (1 = más pobre) de la distribución nacional del año."""
    orden = ing_pc.sort_values().index
    f = factor.loc[orden]
    acumulado = f.cumsum()
    total = f.sum()
    decil = pd.Series(1, index=orden)
    for i in range(1, 10):
        decil[acumulado > total * i / 10] = i + 1
    return decil.reindex(ing_pc.index)


def cargar(year):
    pob = leer(os.path.join(BASE_ENIGH, f"Bases{year}", f"poblacion{year}.csv"))
    conc = leer(os.path.join(BASE_ENIGH, f"Bases{year}", f"concentradohogar{year}.csv"))
    hog = leer(os.path.join(BASE_HOG, str(year), "hogares.csv"))

    for d in (pob, conc, hog):
        for k in ("folioviv", "foliohog"):
            d[k] = d[k].str.strip()

    cols_conc = ["folioviv", "foliohog", "tam_loc", "ing_cor", "tot_integ"]
    for c in ("factor", "upm", "est_dis"):
        if c not in pob.columns:
            cols_conc.append(c)
    cols_hog = ["folioviv", "foliohog", "telefono", "celular", "conex_inte", "tv_paga", "num_compu"]
    for c in ("num_lap", "peliculas"):
        if c in hog.columns:
            cols_hog.append(c)

    antes = len(pob)
    m = pob.merge(conc[cols_conc], on=["folioviv", "foliohog"], how="left", validate="many_to_one")
    m = m.merge(hog[cols_hog], on=["folioviv", "foliohog"], how="left", validate="many_to_one")
    if len(m) != antes:
        raise SystemExit(f"ENIGH {year}: la unión cambió el número de personas.")
    if m["tam_loc"].isna().any() or m["conex_inte"].isna().any():
        raise SystemExit(f"ENIGH {year}: personas sin hogar emparejado en concentradohogar u hogares.")

    m["anio"] = year
    m["edad"] = pd.to_numeric(m["edad"], errors="coerce")
    m["w"] = pd.to_numeric(m["factor"], errors="coerce").fillna(0.0)
    m["cve_ent"] = m["folioviv"].str.zfill(10).str[:2].astype(int)
    m["ing_cor"] = pd.to_numeric(m["ing_cor"], errors="coerce")
    m["tot_integ"] = pd.to_numeric(m["tot_integ"], errors="coerce")
    ing_pc = m["ing_cor"] / m["tot_integ"]
    if ing_pc.isna().any() or (m["tot_integ"] <= 0).any():
        raise SystemExit(f"ENIGH {year}: ingreso per cápita no calculable en alguna persona.")
    m["decil"] = decil_ponderado(ing_pc, m["w"]).astype(int).astype(str)
    part = m.groupby("decil")["w"].sum() / m["w"].sum() * 100
    if ((part < 5) | (part > 15)).any():
        raise SystemExit(f"ENIGH {year}: deciles desbalanceados: {part.round(1).to_dict()}")

    for c in ("hablaind", "etnia", "sexo", "nivelaprob", "tam_loc", "telefono", "celular",
              "conex_inte", "tv_paga", "num_lap", "peliculas", "upm", "est_dis"):
        if c in m.columns:
            m[c] = m[c].astype(str).str.strip()
    m["num_compu"] = pd.to_numeric(m["num_compu"], errors="coerce")
    m["num_lap"] = pd.to_numeric(m["num_lap"], errors="coerce") if "num_lap" in m.columns else float("nan")
    if "peliculas" not in m.columns:
        m["peliculas"] = None

    m = m[(m["edad"] >= EDAD_MINIMA) & m["hablaind"].isin(["1", "2"]) & m["etnia"].isin(["1", "2"])
          & m["sexo"].isin(["1", "2"])].copy()
    return m


def preparar(con, m, year):
    con.register("m", m)
    tiene_lap = m["num_lap"].notna().any()
    computadora = ("(num_compu > 0 OR num_lap > 0)" if tiene_lap else "num_compu > 0")
    u_computadora = ("(num_compu IS NOT NULL OR num_lap IS NOT NULL)" if tiene_lap else "num_compu IS NOT NULL")
    con.execute(f"""
    CREATE OR REPLACE TABLE base AS
    SELECT
      anio,
      CASE hablaind WHEN '1' THEN 'Sí' ELSE 'No' END AS lengua,
      CASE etnia WHEN '1' THEN 'Sí' ELSE 'No' END AS autoads,
      CASE sexo WHEN '1' THEN 'Hombres' ELSE 'Mujeres' END AS sexo,
      {sql_entidad("cve_ent")} AS entidad,
      {sql_rango_edad("edad")} AS rango_edad,
      CASE tam_loc
        WHEN '1' THEN '100 mil habitantes o más'
        WHEN '2' THEN '15 mil a 99 999'
        WHEN '3' THEN '2 500 a 14 999'
        WHEN '4' THEN 'Menos de 2 500'
      END AS tam_loc,
      decil,
      CASE
        WHEN edad < {EDAD_MINIMA_ESCOLARIDAD} THEN NULL
        WHEN nivelaprob IN ('0', '1', '2') THEN 'Primaria o menos'
        WHEN nivelaprob = '3' THEN 'Secundaria'
        WHEN nivelaprob IN ('4', '5', '6') THEN 'Media superior'
        WHEN nivelaprob IN ('7', '8', '9', '10') THEN 'Superior'
      END AS escolaridad,
      w, upm, est_dis AS est,
      conex_inte = '1' AS y_internet, conex_inte IN ('1', '2') AS u_internet,
      celular = '1' AS y_celular, celular IN ('1', '2') AS u_celular,
      {computadora} AS y_computadora, {u_computadora} AS u_computadora,
      telefono = '1' AS y_telefono, telefono IN ('1', '2') AS u_telefono,
      tv_paga = '1' AS y_tv_paga, tv_paga IN ('1', '2') AS u_tv_paga,
      peliculas = '1' AS y_streaming, peliculas IN ('1', '2') AS u_streaming,
      (conex_inte = '2' AND celular = '2') AS y_sin_conexion,
      (conex_inte IN ('1', '2') AND celular IN ('1', '2')) AS u_sin_conexion,
      (conex_inte = '2' AND celular = '1') AS y_solo_celular,
      (conex_inte IN ('1', '2') AND celular IN ('1', '2')) AS u_solo_celular
    FROM m
    WHERE entidad IS NOT NULL AND rango_edad IS NOT NULL AND tam_loc IS NOT NULL
    """)
    con.unregister("m")


INDICADORES = [
    {"clave": "internet", "indicador": "Vive en un hogar con conexión a internet"},
    {"clave": "celular", "indicador": "Vive en un hogar con teléfono celular"},
    {"clave": "computadora", "indicador": "Vive en un hogar con computadora o laptop"},
    {"clave": "telefono", "indicador": "Vive en un hogar con línea telefónica fija"},
    {"clave": "tv_paga", "indicador": "Vive en un hogar con televisión de paga"},
    {"clave": "streaming", "indicador": "Vive en un hogar con servicio de streaming"},
    {"clave": "sin_conexion", "indicador": "Vive en un hogar sin internet ni celular"},
    {"clave": "solo_celular", "indicador": "Vive en un hogar con celular pero sin internet"},
]


def main():
    con = duckdb.connect()
    con.execute("PRAGMA disable_progress_bar")
    ind = [{**i, "tema": TEMA, "universo": UNIVERSO} for i in INDICADORES]
    ind_esc = [{**i, "universo": "Personas de 15 años o más"} for i in ind]

    principal, por_decil, por_esc = [], [], []
    for year in ANIOS:
        m = cargar(year)
        print(f"[ok] ENIGH {year}: {len(m):,} personas de 6 años o más", file=sys.stderr)
        preparar(con, m, year)

        largo = agregar(con, "base", LLAVES_BASE, ind)
        p = completar(largo, FUENTE, "enigh")
        principal.append(p)

        hli = p[p["indicador"] == INDICADORES[0]["indicador"]]
        p_hli = 100 * hli.loc[hli["lengua"] == "Sí", "den"].sum() / hli["den"].sum()
        p_aut = 100 * hli.loc[hli["autoads"] == "Sí", "den"].sum() / hli["den"].sum()
        p_net = 100 * hli["num"].sum() / hli["den"].sum()
        print(f"     habla lengua indígena {p_hli:.2f} %; se considera indígena {p_aut:.2f} %; "
              f"vive con internet {p_net:.1f} %", file=sys.stderr)
        if not 4 <= p_hli <= 9 or not 12 <= p_aut <= 35:
            raise SystemExit(f"ENIGH {year}: participación indígena fuera de rango.")
        anotar_calculado("enigh", f"pers_internet_{year}", p_net, "% de personas de 6+ en hogares con internet")
        # Cifra a nivel HOGAR (la que publica el INEGI en sus tabulados de
        # hogares): un registro por hogar, ponderado con el factor del hogar.
        con.register("m", m)
        for clave, col in (("internet", "conex_inte"), ("celular", "celular"), ("tv_paga", "tv_paga")):
            p_hog = con.execute(f"""
              SELECT 100.0 * SUM(CASE WHEN {col} = '1' THEN w END) / SUM(CASE WHEN {col} IN ('1', '2') THEN w END)
              FROM (SELECT folioviv, foliohog, any_value({col}) AS {col}, any_value(w) AS w
                    FROM m GROUP BY folioviv, foliohog)
            """).fetchone()[0]
            anotar_calculado("enigh", f"hog_{clave}_{year}", p_hog,
                             "% de hogares (con al menos una persona de 6+), ponderado con el factor")
        con.unregister("m")

        llaves_dec = [k for k in LLAVES_BASE if k != "tam_loc"] + ["decil"]
        por_decil.append(completar(agregar(con, "base", llaves_dec, ind), FUENTE, "enigh"))

        con.execute("CREATE OR REPLACE VIEW base_esc AS SELECT * FROM base WHERE escolaridad IS NOT NULL")
        llaves_esc = [k for k in LLAVES_BASE if k != "tam_loc"] + ["escolaridad"]
        por_esc.append(completar(agregar(con, "base_esc", llaves_esc, ind_esc), FUENTE, "enigh"))

    todo = pd.concat(principal, ignore_index=True)
    guardia(todo, "internet en el hogar, todas las ediciones", 45, 85,
            lambda d: d["indicador"] == INDICADORES[0]["indicador"])
    escribir(todo, TEMA)
    escribir(pd.concat(por_decil, ignore_index=True), TEMA + "_decil")
    escribir(pd.concat(por_esc, ignore_index=True), TEMA + "_escolaridad")


if __name__ == "__main__":
    main()

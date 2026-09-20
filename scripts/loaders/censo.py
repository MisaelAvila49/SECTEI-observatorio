"""
censo.py: conectividad de la vivienda por condición indígena, Censo 2020
(cuestionario ampliado, muestra de ~4 millones de viviendas).

Une la tabla de personas con la de viviendas por ID_VIV y cuenta, para cada
persona de 6 años o más, si la vivienda donde vive dispone de internet,
celular, computadora y el resto de bienes y servicios de comunicación. La
unidad es la PERSONA (ponderada con su FACTOR), no la vivienda: la pregunta
del tablero es qué proporción de la población indígena vive con conexión,
no cuántas viviendas la tienen.

--- Códigos, verificados contando frecuencias en los microdatos -----------

Los códigos de "sí" cambian de variable en variable; leerlos por el nombre
de la columna produce un tablero al revés sin que nada falle.

  HLENGUA         1 = habla lengua indígena, 3 = no, 9 = no especificado
                  (vacío en menores de 3 años)
  PERTE_INDIGENA  1 = se considera indígena, 3 = no, 9 = no especificado
  SEXO            1 = hombre, 3 = mujer (NO es 1/2 como en ENIGH y ENDUTIH)
  INTERNET        7 = sí, 8 = no          CELULAR       5 = sí, 6 = no
  COMPUTADORA     1 = sí, 2 = no          TELEFONO      3 = sí, 4 = no
  TELEVISOR       7 = sí, 8 = no          RADIO         5 = sí, 6 = no
  SERV_TV_PAGA    1 = sí, 2 = no          SERV_PEL_PAGA 3 = sí, 4 = no
  CON_VJUEGOS     5 = sí, 6 = no          9 = no especificado en todas
  TAMLOC          1 = menos de 2 500; 2 = 2 500 a 14 999; 3 = 15 000 a
                  49 999; 4 = 50 000 a 99 999; 5 = 100 000 o más
  CLAVIVP         01 a 08 = viviendas particulares; 09 y 99 se excluyen
  NIVACAD         00 a 14; el tramo se fijó cruzando cada código con la
                  escolaridad acumulada media (ESCOACUM) de quienes lo
                  declaran: 00-02 dan 0 a 4.7 años (primaria o menos);
                  03 y 06 dan 8.9 y 9.1 (secundaria); 04, 05, 07 y 09 dan
                  11.6 a 12.8 (media superior); 08 y 10 a 14 dan 14.8 a
                  21.7 (superior). 99 = no especificado, sale del universo.

El error estándar usa ESTRATO y UPM de la tabla de personas.
"""

import os
import sys

import duckdb

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import (  # noqa: E402
    agregar, completar, escribir, guardia, anotar_calculado, sql_rango_edad,
    sql_entidad, LLAVES_BASE, EDAD_MINIMA, EDAD_MINIMA_ESCOLARIDAD,
)

CARPETA = os.environ.get(
    "CENSO_DIR",
    r"D:\IMPORTANTE\SocialDataIbero\AnalisisSueltos\JCF\data\raw\censo2020",
)
PERSONAS = os.path.join(CARPETA, "Personas00.CSV").replace("\\", "/")
VIVIENDAS = os.path.join(CARPETA, "Viviendas00.CSV").replace("\\", "/")

TEMA = "censo-vivienda"
FUENTE = "Censo de Población y Vivienda 2020, cuestionario ampliado (INEGI)"
UNIVERSO = "Personas de 6 años o más en viviendas particulares"

# (clave, nombre, código de sí, códigos válidos)
BIENES = [
    ("internet", "Vive en una vivienda con internet", "INTERNET", 7, (7, 8)),
    ("celular", "Vive en una vivienda con teléfono celular", "CELULAR", 5, (5, 6)),
    ("computadora", "Vive en una vivienda con computadora, laptop o tableta", "COMPUTADORA", 1, (1, 2)),
    ("telefono", "Vive en una vivienda con línea telefónica fija", "TELEFONO", 3, (3, 4)),
    ("tv_paga", "Vive en una vivienda con televisión de paga", "SERV_TV_PAGA", 1, (1, 2)),
    ("streaming", "Vive en una vivienda con servicio de streaming", "SERV_PEL_PAGA", 3, (3, 4)),
    ("videojuegos", "Vive en una vivienda con consola de videojuegos", "CON_VJUEGOS", 5, (5, 6)),
    ("televisor", "Vive en una vivienda con televisor", "TELEVISOR", 7, (7, 8)),
    ("radio", "Vive en una vivienda con radio", "RADIO", 5, (5, 6)),
]


def main():
    for ruta in (PERSONAS, VIVIENDAS):
        if not os.path.exists(ruta):
            raise SystemExit(f"No se encontró {ruta}. Define CENSO_DIR.")

    con = duckdb.connect()
    con.execute("PRAGMA disable_progress_bar")
    con.execute("SET preserve_insertion_order = false")

    sel_y = ",\n      ".join(
        f"v.{col} = {si} AS y_{k}, v.{col} IN {validos} AS u_{k}"
        for k, _, col, si, validos in BIENES)

    con.execute(f"""
    CREATE TABLE base AS
    WITH p AS (
      SELECT ID_VIV, ENT, FACTOR, ESTRATO, UPM, SEXO, EDAD, HLENGUA,
             PERTE_INDIGENA, NIVACAD, TAMLOC
      FROM read_csv('{PERSONAS}', header = true, all_varchar = true)
    ),
    v AS (
      SELECT ID_VIV, CLAVIVP,
             TRY_CAST(INTERNET AS INT) AS INTERNET, TRY_CAST(CELULAR AS INT) AS CELULAR,
             TRY_CAST(COMPUTADORA AS INT) AS COMPUTADORA, TRY_CAST(TELEFONO AS INT) AS TELEFONO,
             TRY_CAST(TELEVISOR AS INT) AS TELEVISOR, TRY_CAST(RADIO AS INT) AS RADIO,
             TRY_CAST(SERV_TV_PAGA AS INT) AS SERV_TV_PAGA,
             TRY_CAST(SERV_PEL_PAGA AS INT) AS SERV_PEL_PAGA,
             TRY_CAST(CON_VJUEGOS AS INT) AS CON_VJUEGOS
      FROM read_csv('{VIVIENDAS}', header = true, all_varchar = true)
    )
    SELECT
      2020 AS anio,
      CASE WHEN p.HLENGUA = '1' THEN 'Sí' WHEN p.HLENGUA = '3' THEN 'No' END AS lengua,
      CASE WHEN p.PERTE_INDIGENA = '1' THEN 'Sí' WHEN p.PERTE_INDIGENA = '3' THEN 'No' END AS autoads,
      CASE WHEN p.SEXO = '1' THEN 'Hombres' WHEN p.SEXO = '3' THEN 'Mujeres' END AS sexo,
      {sql_entidad("TRY_CAST(p.ENT AS INT)")} AS entidad,
      {sql_rango_edad("TRY_CAST(p.EDAD AS INT)")} AS rango_edad,
      CASE p.TAMLOC
        WHEN '1' THEN 'Menos de 2 500'
        WHEN '2' THEN '2 500 a 14 999'
        WHEN '3' THEN '15 mil a 99 999'
        WHEN '4' THEN '15 mil a 99 999'
        WHEN '5' THEN '100 mil habitantes o más'
      END AS tam_loc,
      CASE
        WHEN TRY_CAST(p.EDAD AS INT) < {EDAD_MINIMA_ESCOLARIDAD} THEN NULL
        WHEN p.NIVACAD IN ('00', '01', '02') THEN 'Primaria o menos'
        WHEN p.NIVACAD IN ('03', '06') THEN 'Secundaria'
        WHEN p.NIVACAD IN ('04', '05', '07', '09') THEN 'Media superior'
        WHEN p.NIVACAD IN ('08', '10', '11', '12', '13', '14') THEN 'Superior'
      END AS escolaridad,
      TRY_CAST(p.FACTOR AS DOUBLE) AS w,
      p.ESTRATO AS est, p.UPM AS upm,
      v.ID_VIV IS NOT NULL AS con_vivienda,
      {sel_y},
      (v.INTERNET = 8 AND v.CELULAR = 6) AS y_sin_conexion,
      (v.INTERNET IN (7, 8) AND v.CELULAR IN (5, 6)) AS u_sin_conexion,
      (v.INTERNET = 8 AND v.CELULAR = 5) AS y_solo_celular,
      (v.INTERNET IN (7, 8) AND v.CELULAR IN (5, 6)) AS u_solo_celular
    FROM p LEFT JOIN v USING (ID_VIV)
    WHERE TRY_CAST(p.EDAD AS INT) >= {EDAD_MINIMA} AND TRY_CAST(p.EDAD AS INT) < 999
      AND p.HLENGUA IN ('1', '3') AND p.PERTE_INDIGENA IN ('1', '3')
      AND p.SEXO IN ('1', '3')
      AND (v.CLAVIVP IS NULL OR v.CLAVIVP IN ('01','02','03','04','05','06','07','08'))
    """)

    n, sin = con.execute("SELECT COUNT(*), COUNT(*) FILTER (WHERE NOT con_vivienda) FROM base").fetchone()
    print(f"[ok] Censo 2020: {n:,} personas de 6 años o más; {sin:,} sin vivienda emparejada",
          file=sys.stderr)
    if sin > 0.001 * n:
        raise SystemExit("Censo 2020: más del 0.1 % de las personas no encontró su vivienda por ID_VIV.")
    con.execute("DELETE FROM base WHERE NOT con_vivienda OR lengua IS NULL OR autoads IS NULL "
                "OR sexo IS NULL OR entidad IS NULL OR rango_edad IS NULL OR tam_loc IS NULL")

    # Cifras nacionales a nivel VIVIENDA, que son las que publica el INEGI y
    # contra las que se coteja (verificaciones.csv). La muestra ampliada da
    # una cifra cercana pero no idéntica a la del censo completo.
    for k, _, col, si, validos in BIENES:
        pct = con.execute(f"""
          SELECT 100.0 * SUM(CASE WHEN {col} = {si} THEN FACTOR END) / SUM(CASE WHEN {col} IN {validos} THEN FACTOR END)
          FROM (SELECT TRY_CAST({col} AS INT) AS {col}, TRY_CAST(FACTOR AS DOUBLE) AS FACTOR, CLAVIVP
                FROM read_csv('{VIVIENDAS}', header = true, all_varchar = true))
          WHERE CLAVIVP IN ('01','02','03','04','05','06','07','08')
        """).fetchone()[0]
        anotar_calculado("censo", f"viv_{k}", pct, "% de viviendas particulares habitadas, muestra ampliada")
        print(f"     viviendas con {k}: {pct:.1f} %", file=sys.stderr)

    indicadores = [
        {"clave": k, "tema": TEMA, "indicador": nombre, "universo": UNIVERSO}
        for k, nombre, *_ in BIENES
    ] + [
        {"clave": "sin_conexion", "tema": TEMA,
         "indicador": "Vive en una vivienda sin internet ni celular", "universo": UNIVERSO},
        {"clave": "solo_celular", "tema": TEMA,
         "indicador": "Vive en una vivienda con celular pero sin internet", "universo": UNIVERSO},
    ]

    # --- Archivo principal: llaves base -----------------------------------
    largo = agregar(con, "base", LLAVES_BASE, indicadores, peso="w", upm="upm", estrato="est")
    principal = completar(largo, FUENTE, "censo")

    guardia(principal, "internet (todas las personas)", 40, 70,
            lambda d: d["indicador"] == "Vive en una vivienda con internet")
    guardia(principal, "internet (habla lengua indígena)", 10, 45,
            lambda d: (d["indicador"] == "Vive en una vivienda con internet") & (d["lengua"] == "Sí"))
    hli =principal[principal["indicador"] == "Vive en una vivienda con internet"]
    p_hli = 100 * hli.loc[hli["lengua"] == "Sí", "den"].sum() / hli["den"].sum()
    p_aut = 100 * hli.loc[hli["autoads"] == "Sí", "den"].sum() / hli["den"].sum()
    print(f"[ok] Censo 2020: habla lengua indígena {p_hli:.2f} %; se considera indígena {p_aut:.2f} % (6 años o más)",
          file=sys.stderr)
    anotar_calculado("censo", "pob_hli_6mas", p_hli, "% de personas de 6 años o más que hablan lengua indígena")
    anotar_calculado("censo", "pob_autoads_6mas", p_aut, "% de personas de 6 años o más que se consideran indígenas")
    if not 4 <= p_hli <= 9 or not 12 <= p_aut <= 30:
        raise SystemExit("Censo 2020: la participación indígena salió de rango; revisa HLENGUA/PERTE_INDIGENA.")
    escribir(principal, TEMA)

    # --- Escolaridad: 15 años o más, sin tamaño de localidad --------------
    con.execute(f"CREATE VIEW base_esc AS SELECT * FROM base WHERE escolaridad IS NOT NULL")
    llaves_esc = [k for k in LLAVES_BASE if k != "tam_loc"] + ["escolaridad"]
    ind_esc = [{**i, "universo": "Personas de 15 años o más en viviendas particulares"} for i in indicadores]
    largo_esc = agregar(con, "base_esc", llaves_esc, ind_esc, peso="w", upm="upm", estrato="est")
    escribir(completar(largo_esc, FUENTE, "censo"), TEMA + "_escolaridad")


if __name__ == "__main__":
    main()

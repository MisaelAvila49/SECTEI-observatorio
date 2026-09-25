"""
Lectura común de las dos MUESTRAS con identidad indígena de la Ciudad de
México: la Encuesta Intercensal 2015 y el cuestionario ampliado del Censo
2020. Las usan serie_alcaldias.py (autoadscripción y unión de poblaciones) y
lenguas.py (qué lengua y de dónde vienen).

Las dos traen la misma clave de lengua (QDIALECT_INALI, agrupación del
Catálogo INALI 2008) y el mismo diseño (FACTOR, UPM, ESTRATO), pero cambian
nombres de columnas y códigos:

  - 2015: SEXO 1/3; HLENGUA 1 sí / 3 no / 9 NE (vacío en menores de 3);
    PERTE_INDIGENA 1 sí / 2 sí, en parte / 3 no / 8 no sabe / 9 NE;
    HESPANOL 5 sí / 7 no / 9 NE; residencia en 2010: ENT_PAIS_RES10 y MUN_RES10.
  - 2020: SEXO 1/3; HLENGUA 1/3/9; PERTE_INDIGENA 1/3/9; HESPANOL 1/3/9;
    residencia en 2015: ENT_PAIS_RES_5A y MUN_RES_5A.

Los códigos se comprobaron con cruces, no por el nombre: en 2015 las 129 355
personas con HLENGUA = 1 reproducen la tabla 2 del documento de la Secretaría
de Cultura y las 784 605 con PERTE_INDIGENA = 1, su cifra de autoadscripción;
en 2020 las 825 348 con PERTE_INDIGENA = 1 reproducen el perfil de la SEPI.
"Se considera indígena" es el código 1 en las dos: el "sí, en parte" de 2015
(175 454 personas) no entra, igual que en esas dos fuentes.

La CDMX en el ampliado 2020 pondera 142 201 hablantes contra 125 153 del
cuestionario básico: la muestra estima, no cuenta. Para hablantes manda el
básico (ITER); la muestra sirve para autoadscripción, lengua y cruces.
"""
import os

import duckdb

RUTA_EIC2015 = os.environ.get(
    "EIC2015_CSV",
    os.path.join(os.path.dirname(__file__), "..", "..", "data-raw", "eic2015", "TR_PERSONA09.CSV"),
)
RUTA_CENSO2020 = os.environ.get(
    "CENSO2020_PERSONAS",
    r"D:\IMPORTANTE\SocialDataIbero\AnalisisSueltos\JCF\data\raw\censo2020\Personas00.CSV",
)

# Columnas normalizadas que dejan las dos funciones en la tabla `m`:
#   anio, cve_mun (3 dígitos), nom_mun, sexo ('Mujeres'/'Hombres'), edad,
#   w, upm, est, hli (TRUE/FALSE/NULL), autoads (TRUE/FALSE/NULL),
#   monolingue (TRUE/FALSE/NULL, solo hablantes), lengua (clave INALI o NULL),
#   ent_nac (3 dígitos; > 032 es otro país), ent_res5, mun_res5 (3 dígitos)


def _ruta(p):
    return os.path.abspath(p).replace("\\", "/")


def cargar_eic2015(con: duckdb.DuckDBPyConnection):
    p = _ruta(RUTA_EIC2015)
    if not os.path.exists(p):
        raise SystemExit(f"No está la EIC 2015 de la CDMX en {p}; bájala con scripts/descargar_datos.sh.")
    # latin-1 y campos entre comillas con salto de línea dentro (nombres de
    # municipio partidos): con las opciones por omisión DuckDB la rechaza.
    con.execute(f"""
    CREATE OR REPLACE TABLE m AS
    SELECT
      2015 AS anio,
      lpad(MUN, 3, '0') AS cve_mun,
      NOM_MUN AS nom_mun,
      CASE SEXO WHEN '1' THEN 'Hombres' WHEN '3' THEN 'Mujeres' END AS sexo,
      TRY_CAST(EDAD AS INTEGER) AS edad,
      CAST(FACTOR AS DOUBLE) AS w, UPM AS upm, ESTRATO AS est,
      CASE HLENGUA WHEN '1' THEN TRUE WHEN '3' THEN FALSE END AS hli,
      CASE PERTE_INDIGENA WHEN '1' THEN TRUE WHEN '2' THEN FALSE WHEN '3' THEN FALSE END AS autoads,
      CASE WHEN HLENGUA = '1' THEN (CASE HESPANOL WHEN '7' THEN TRUE WHEN '5' THEN FALSE END) END AS monolingue,
      CASE WHEN HLENGUA = '1' THEN lpad(QDIALECT_INALI, 4, '0') END AS lengua,
      lpad(ENT_PAIS_NAC, 3, '0') AS ent_nac,
      lpad(ENT_PAIS_RES10, 3, '0') AS ent_res5,
      lpad(MUN_RES10, 3, '0') AS mun_res5
    FROM read_csv('{p}', all_varchar=true, header=true, encoding='latin-1', quote='"', strict_mode=false)
    WHERE ENT = '09'
    """)
    return con


def cargar_censo2020(con: duckdb.DuckDBPyConnection):
    p = _ruta(RUTA_CENSO2020)
    if not os.path.exists(p):
        raise SystemExit(f"No están los microdatos del Censo 2020 en {p}.")
    con.execute(f"""
    CREATE OR REPLACE TABLE m AS
    SELECT
      2020 AS anio,
      lpad(MUN, 3, '0') AS cve_mun,
      NULL AS nom_mun,
      CASE SEXO WHEN '1' THEN 'Hombres' WHEN '3' THEN 'Mujeres' END AS sexo,
      TRY_CAST(EDAD AS INTEGER) AS edad,
      CAST(FACTOR AS DOUBLE) AS w, UPM AS upm, ESTRATO AS est,
      CASE HLENGUA WHEN '1' THEN TRUE WHEN '3' THEN FALSE END AS hli,
      CASE PERTE_INDIGENA WHEN '1' THEN TRUE WHEN '3' THEN FALSE END AS autoads,
      CASE WHEN HLENGUA = '1' THEN (CASE HESPANOL WHEN '3' THEN TRUE WHEN '1' THEN FALSE END) END AS monolingue,
      CASE WHEN HLENGUA = '1' THEN lpad(QDIALECT_INALI, 4, '0') END AS lengua,
      lpad(ENT_PAIS_NAC, 3, '0') AS ent_nac,
      lpad(ENT_PAIS_RES_5A, 3, '0') AS ent_res5,
      lpad(MUN_RES_5A, 3, '0') AS mun_res5
    FROM read_csv('{p}', all_varchar=true, header=true)
    WHERE ENT = '09'
    """)
    return con


CARGADORES = {2015: cargar_eic2015, 2020: cargar_censo2020}

# Cifras de control por edición: (hablantes ponderados, autoadscritos ponderados).
# 2015 reproduce al documento de la Secretaría de Cultura; 2020, a la SEPI.
CONTROL = {2015: (129_355, 784_605), 2020: (142_201, 825_348)}


def comprobar(con, anio):
    hli, aut = con.execute("SELECT ROUND(SUM(CASE WHEN hli THEN w END)), ROUND(SUM(CASE WHEN autoads THEN w END)) FROM m").fetchone()
    e_hli, e_aut = CONTROL[anio]
    if abs(hli - e_hli) > 1 or abs(aut - e_aut) > 1:
        raise SystemExit(f"Muestra {anio}: hablantes {hli:,.0f} / autoadscritos {aut:,.0f}; se esperaban {e_hli:,} / {e_aut:,}. Revisa los códigos.")
    return hli, aut

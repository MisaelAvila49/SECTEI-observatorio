"""
Lectura común de las MUESTRAS con identidad indígena de la Ciudad de México:
Censo 1990 (muestra del 10 %), Censo 2000 (ampliado), Conteo 2005 (muestra),
Censo 2010 (ampliado), Encuesta Intercensal 2015, Censo 2020 (ampliado) y
Encuesta Intercensal 2025 (microdatos nacionales). Las usan
serie_alcaldias.py (autoadscripción y unión de poblaciones) y lenguas.py
(qué lengua y de dónde vienen).

Cada cargador deja una tabla `m` con las mismas columnas:
  anio, cve_mun (3 dígitos), nom_mun, sexo ('Mujeres'/'Hombres'), edad,
  w, upm, est (NULL en las muestras autoponderadas: 1990 y 2005, sin diseño
  publicado; ahí el error no se estima y queda vacío),
  hli (TRUE/FALSE/NULL), autoads (TRUE/FALSE/NULL), monolingue (solo hablantes),
  lengua (clave INALI de 4 dígitos, traducida desde el clasificador histórico
  en 1990, 2000 y 2005 con catalogo_lenguas_historico.csv),
  ent_nac (3 dígitos; > 032 es otro país), ent_res5, mun_res5 (3 dígitos)

Los códigos cambian por edición y se comprobaron con cruces, no por nombre:
  - sexo: 1/2 en 1990, 2000 y 2005; 1/3 en 2010, 2015, 2020 y 2025
  - habla lengua: 1/2/9 hasta 2005 (y 0 = menor de 5 en 1990); 1/3/9 después
  - habla español: 3 sí / 4 no hasta 2005; 5/7 en 2015; 1/3 en 2010, 2020 y 2025
  - autoadscripción: PERETN 1/2/9 en 2000 (universo 5+, pregunta distinta:
    "¿es náhuatl, maya, zapoteco, mixteco o de otro grupo indígena?");
    PERETN 1/3/9 en 2010 (3+); PERTE_INDIGENA 1/2/3/8/9 en 2015 (el 2 es
    "sí, en parte" y no cuenta); 1/3/9 en 2020 y 2025 (todas las edades)
  - lengua: clasificador histórico del INEGI (1041 = náhuatl) en 1990, 2000 y
    2005; INALI (0211 = náhuatl) desde 2010. El 0211 existe en los dos con
    significado distinto, por eso la traducción va por tabla y no por nombre.

Cifras de control (CONTROL): las muestras ampliadas sobreestiman a los
hablantes frente al conteo del cuestionario básico (2000: 168 256 contra
141 710; 2010: 144 291 contra 123 224); para hablantes manda el ITER y las
muestras se usan para lo que solo ellas preguntan.
"""
import os

import duckdb
import pandas as pd

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CRUDO = os.path.join(RAIZ, "data-raw")
RUTA_CENSO2020 = os.environ.get("CENSO2020_PERSONAS", r"D:\IMPORTANTE\SocialDataIbero\AnalisisSueltos\JCF\data\raw\censo2020\Personas00.CSV")
RUTA_EIC2015 = os.path.join(CRUDO, "eic2015", "TR_PERSONA09.CSV")
RUTA_EIC2025 = os.path.join(CRUDO, "eic2025", "personas00.csv")
RUTA_1990 = os.path.join(CRUDO, "censo1990", "m_1009.dbf")
RUTA_2000 = os.path.join(CRUDO, "censo2000", "PER_F09.DBF")
RUTA_2005 = os.path.join(CRUDO, "conteo2005", "cpv2005_09_dbf", "trpmue09.DBF")
RUTA_2010 = os.path.join(CRUDO, "censo2010", "Personas_09.dbf")
HISTORICO = os.path.join(RAIZ, "src", "data", "catalogo_lenguas_historico.csv")


def _ruta(p):
    return os.path.abspath(p).replace("\\", "/")


def _existe(p, que):
    if not os.path.exists(p):
        raise SystemExit(f"No está {que} en {p}.")


def _dbf(ruta, columnas):
    from dbfread import DBF
    filas = []
    for r in DBF(ruta, encoding="latin-1", load=False):
        filas.append({c: (r.get(c).strip() if isinstance(r.get(c), str) else r.get(c)) for c in columnas})
    return pd.DataFrame(filas, columns=columnas)


def _traductor(con):
    """Vista `hist` clave_historica -> clave_inali para 1990, 2000 y 2005."""
    con.execute(f"CREATE OR REPLACE TABLE hist AS SELECT clave_historica, clave_inali FROM read_csv('{_ruta(HISTORICO)}', all_varchar=true, header=true)")


def cargar_censo1990(con):
    _existe(RUTA_1990, "la muestra del Censo 1990 de la CDMX")
    d = _dbf(RUTA_1990, ["MUN", "SEXO", "ANO_CUMP", "HAB_IND", "CVE_LENG", "HAB_ESP", "CVE_P_NAC", "CVE_P_RES"])
    con.register("d", d)
    _traductor(con)
    # Autoponderada al 10 %: peso 10, sin diseño.
    con.execute("""
    CREATE OR REPLACE TABLE m AS
    SELECT 1990 AS anio, lpad(MUN, 3, '0') AS cve_mun, CAST(NULL AS VARCHAR) AS nom_mun,
      CASE SEXO WHEN '1' THEN 'Hombres' WHEN '2' THEN 'Mujeres' END AS sexo,
      CASE WHEN ANO_CUMP = '999' THEN NULL ELSE TRY_CAST(ANO_CUMP AS INTEGER) END AS edad,
      10.0 AS w, CAST(NULL AS VARCHAR) AS upm, CAST(NULL AS VARCHAR) AS est,
      CASE HAB_IND WHEN '1' THEN TRUE WHEN '2' THEN FALSE END AS hli,
      CAST(NULL AS BOOLEAN) AS autoads,
      CASE WHEN HAB_IND = '1' THEN (CASE HAB_ESP WHEN '4' THEN TRUE WHEN '3' THEN FALSE END) END AS monolingue,
      CASE WHEN HAB_IND = '1' THEN COALESCE(h.clave_inali, '9000') END AS lengua,
      lpad(CVE_P_NAC, 3, '0') AS ent_nac,
      CASE WHEN CVE_P_RES = '000' THEN NULL ELSE lpad(CVE_P_RES, 3, '0') END AS ent_res5,
      CAST(NULL AS VARCHAR) AS mun_res5
    FROM d LEFT JOIN hist h ON h.clave_historica = d.CVE_LENG
    """)
    con.unregister("d")
    return con


def cargar_censo2000(con):
    _existe(RUTA_2000, "la muestra ampliada del Censo 2000 de la CDMX")
    d = _dbf(RUTA_2000, ["MUN", "FACTOR", "ESTRATO", "UPM", "SEXO", "EDAD", "HLENGUA", "QDIALECT_C", "HESPANOL", "PERETN", "LNACEDO_C", "RES95EDO_C", "MUN95OTR_C"])
    con.register("d", d)
    _traductor(con)
    con.execute("""
    CREATE OR REPLACE TABLE m AS
    SELECT 2000 AS anio, lpad(MUN, 3, '0') AS cve_mun, CAST(NULL AS VARCHAR) AS nom_mun,
      CASE SEXO WHEN '1' THEN 'Hombres' WHEN '2' THEN 'Mujeres' END AS sexo,
      CASE WHEN EDAD = '999' THEN NULL ELSE TRY_CAST(EDAD AS INTEGER) END AS edad,
      CAST(FACTOR AS DOUBLE) AS w, UPM AS upm, ESTRATO AS est,
      CASE HLENGUA WHEN '1' THEN TRUE WHEN '2' THEN FALSE END AS hli,
      CASE PERETN WHEN '1' THEN TRUE WHEN '2' THEN FALSE END AS autoads,
      CASE WHEN HLENGUA = '1' THEN (CASE HESPANOL WHEN '4' THEN TRUE WHEN '3' THEN FALSE END) END AS monolingue,
      CASE WHEN HLENGUA = '1' THEN COALESCE(h.clave_inali, '9000') END AS lengua,
      lpad(LNACEDO_C, 3, '0') AS ent_nac,
      CASE WHEN RES95EDO_C = '' THEN NULL ELSE lpad(RES95EDO_C, 3, '0') END AS ent_res5,
      CASE WHEN MUN95OTR_C = '' THEN NULL ELSE lpad(MUN95OTR_C, 3, '0') END AS mun_res5
    FROM d LEFT JOIN hist h ON h.clave_historica = d.QDIALECT_C
    """)
    con.unregister("d")
    return con


def cargar_conteo2005(con):
    _existe(RUTA_2005, "la muestra del Conteo 2005 de la CDMX")
    d = _dbf(RUTA_2005, ["MUN", "SEXO", "EDAD", "HABLENIN", "LEINDHAB", "HATAMESP", "LURE2000"])
    d["SEXO"] = d["SEXO"].astype(str)
    con.register("d", d)
    _traductor(con)
    con.execute("""
    CREATE OR REPLACE TABLE m AS
    SELECT 2005 AS anio, lpad(MUN, 3, '0') AS cve_mun, CAST(NULL AS VARCHAR) AS nom_mun,
      CASE SEXO WHEN '1' THEN 'Hombres' WHEN '2' THEN 'Mujeres' END AS sexo,
      CASE WHEN EDAD = '999' THEN NULL ELSE TRY_CAST(EDAD AS INTEGER) END AS edad,
      10.0 AS w, CAST(NULL AS VARCHAR) AS upm, CAST(NULL AS VARCHAR) AS est,
      CASE HABLENIN WHEN '1' THEN TRUE WHEN '2' THEN FALSE END AS hli,
      CAST(NULL AS BOOLEAN) AS autoads,
      CASE WHEN HABLENIN = '1' THEN (CASE HATAMESP WHEN '4' THEN TRUE WHEN '3' THEN FALSE END) END AS monolingue,
      CASE WHEN HABLENIN = '1' THEN COALESCE(h.clave_inali, '9000') END AS lengua,
      CAST(NULL AS VARCHAR) AS ent_nac,
      -- LURE2000 viene sin ceros a la izquierda; 600/201 y similares son países.
      CASE WHEN LURE2000 = '' THEN NULL ELSE lpad(LURE2000, 3, '0') END AS ent_res5,
      CAST(NULL AS VARCHAR) AS mun_res5
    FROM d LEFT JOIN hist h ON h.clave_historica = d.LEINDHAB
    """)
    con.unregister("d")
    return con


def cargar_censo2010(con):
    _existe(RUTA_2010, "la muestra ampliada del Censo 2010 de la CDMX")
    d = _dbf(RUTA_2010, ["MUN", "NOM_MUN", "FACTOR", "ESTRATO", "UPM", "SEXO", "EDAD", "HLENGUA", "LI_INALI", "HESPANOL", "PERETN", "LNACEDO_C", "LNACPAIS_C", "RES05EDO_C", "MUN05OTR_C"])
    con.register("d", d)
    con.execute("""
    CREATE OR REPLACE TABLE m AS
    SELECT 2010 AS anio, lpad(MUN, 3, '0') AS cve_mun, NOM_MUN AS nom_mun,
      CASE SEXO WHEN '1' THEN 'Hombres' WHEN '3' THEN 'Mujeres' END AS sexo,
      CASE WHEN EDAD = '999' THEN NULL ELSE TRY_CAST(EDAD AS INTEGER) END AS edad,
      CAST(FACTOR AS DOUBLE) AS w, UPM AS upm, ESTRATO AS est,
      CASE HLENGUA WHEN '1' THEN TRUE WHEN '3' THEN FALSE END AS hli,
      CASE PERETN WHEN '1' THEN TRUE WHEN '3' THEN FALSE END AS autoads,
      CASE WHEN HLENGUA = '1' THEN (CASE HESPANOL WHEN '3' THEN TRUE WHEN '1' THEN FALSE END) END AS monolingue,
      CASE WHEN HLENGUA = '1' THEN lpad(LI_INALI, 4, '0') END AS lengua,
      CASE WHEN LNACEDO_C <> '' THEN lpad(LNACEDO_C, 3, '0') WHEN LNACPAIS_C <> '' THEN '900' ELSE '999' END AS ent_nac,
      CASE WHEN RES05EDO_C = '' THEN NULL ELSE lpad(RES05EDO_C, 3, '0') END AS ent_res5,
      CASE WHEN MUN05OTR_C = '' THEN NULL ELSE lpad(MUN05OTR_C, 3, '0') END AS mun_res5
    FROM d
    """)
    con.unregister("d")
    return con


def cargar_eic2015(con):
    p = _ruta(RUTA_EIC2015)
    _existe(p, "la EIC 2015 de la CDMX")
    con.execute(f"""
    CREATE OR REPLACE TABLE m AS
    SELECT 2015 AS anio, lpad(MUN, 3, '0') AS cve_mun, NOM_MUN AS nom_mun,
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


def cargar_censo2020(con):
    p = _ruta(RUTA_CENSO2020)
    _existe(p, "los microdatos del Censo 2020")
    con.execute(f"""
    CREATE OR REPLACE TABLE m AS
    SELECT 2020 AS anio, lpad(MUN, 3, '0') AS cve_mun, CAST(NULL AS VARCHAR) AS nom_mun,
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


def cargar_eic2025(con):
    p = _ruta(RUTA_EIC2025)
    _existe(p, "los microdatos de la EIC 2025")
    # Archivo nacional de 5.8 GB: se filtra la CDMX al leer. La clave de no
    # especificado de lengua es 9999 aquí y 9000 en el clasificador 2020.
    con.execute(f"""
    CREATE OR REPLACE TABLE m AS
    SELECT 2025 AS anio, lpad(CVE_MUN, 3, '0') AS cve_mun, CAST(NULL AS VARCHAR) AS nom_mun,
      CASE SEXO WHEN '1' THEN 'Hombres' WHEN '3' THEN 'Mujeres' END AS sexo,
      TRY_CAST(EDAD AS INTEGER) AS edad,
      CAST(FACTOR AS DOUBLE) AS w, UPM AS upm, ESTRATO AS est,
      CASE HLENGUA WHEN '1' THEN TRUE WHEN '3' THEN FALSE END AS hli,
      CASE PERTE_INDIGENA WHEN '1' THEN TRUE WHEN '3' THEN FALSE END AS autoads,
      CASE WHEN HLENGUA = '1' THEN (CASE HESPANOL WHEN '3' THEN TRUE WHEN '1' THEN FALSE END) END AS monolingue,
      CASE WHEN HLENGUA = '1' THEN (CASE WHEN QDIALECT_INALI = '9999' THEN '9000' ELSE lpad(QDIALECT_INALI, 4, '0') END) END AS lengua,
      lpad(ENT_PAIS_NAC, 3, '0') AS ent_nac,
      CASE WHEN ENT_PAIS_RES_5A = '' THEN NULL ELSE lpad(ENT_PAIS_RES_5A, 3, '0') END AS ent_res5,
      CASE WHEN MUN_RES_5A = '' THEN NULL ELSE lpad(MUN_RES_5A, 3, '0') END AS mun_res5
    FROM read_csv('{p}', all_varchar=true, header=true)
    WHERE CVE_ENT = '09'
    """)
    return con


CARGADORES = {1990: cargar_censo1990, 2000: cargar_censo2000, 2005: cargar_conteo2005, 2010: cargar_censo2010,
              2015: cargar_eic2015, 2020: cargar_censo2020, 2025: cargar_eic2025}

# Universo de la pregunta de habla y de la de autoadscripción por edición.
EDAD_HLI = {1990: 5, 2000: 5, 2005: 5, 2010: 3, 2015: 3, 2020: 3, 2025: 3}
EDAD_AUTOADS = {2000: 5, 2010: 3, 2015: 0, 2020: 0, 2025: 0}

# (hablantes ponderados, autoadscritos ponderados) medidos en el perfil de
# cada archivo; una desviación mayor a 1 significa códigos mal leídos.
CONTROL = {1990: (112_980, None), 2000: (168_256, 68_426), 2005: (124_110, None), 2010: (144_291, 438_855),
           2015: (129_355, 784_605), 2020: (142_201, 825_348), 2025: (125_790, 619_575)}

# Muestras sin factor ni diseño (autoponderadas al 10 %): sin error muestral.
SIN_DISENO = {1990, 2005}


def comprobar(con, anio):
    hli, aut = con.execute("SELECT ROUND(SUM(CASE WHEN hli THEN w END)), ROUND(SUM(CASE WHEN autoads THEN w END)) FROM m").fetchone()
    e_hli, e_aut = CONTROL[anio]
    if abs(hli - e_hli) > 1 or (e_aut is not None and abs((aut or 0) - e_aut) > 1):
        raise SystemExit(f"Muestra {anio}: hablantes {hli:,.0f} / autoadscritos {aut}; se esperaban {e_hli:,} / {e_aut}. Revisa los códigos.")
    return hli, aut

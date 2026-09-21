"""
endutih.py: uso personal de internet, computadora y celular por condición
indígena, ENDUTIH 2025.

Es la única de las tres fuentes que mide USO (esta persona usa internet, y
para qué) y no solo acceso en el hogar, y la primera edición de la ENDUTIH
que identifica a la población indígena: el módulo 6.A de 2025 pregunta si
la persona se considera indígena (P6A_3) y si habla lengua indígena
(P6A_5). Hasta 2024 la encuesta no traía esas preguntas, así que no hay
serie histórica con este corte.

Tres tablas, dos uniones: `ti25usu` (persona seleccionada de 6 años o más,
módulos 6, 6.A y 7), `ti25usu2` (la misma persona, módulos 8 a 11: celular)
y `ti25hog` (el hogar: equipamiento y conexión). Se unen por UPM + VIV_SEL +
HOGAR (+ NUM_REN entre las dos de persona). La unión persona-persona es
exacta (57 810 registros, 0 sin pareja).

--- Códigos, verificados contando frecuencias en los microdatos -----------

  P6A_5   1 = habla lengua indígena, 2 = no
  P6A_3   1 = se considera indígena, 2 = no
  P6A_1   NO es lengua indígena, aunque encabece el módulo: su 1 (4.9 %)
          se concentra en Guerrero, usa internet por encima del promedio y
          no se asocia con la autoadscripción; es la pregunta de
          afrodescendencia. Se comprobó cruzando las tres variables: el 1
          de P6A_5 pesa 6.3 % (el Censo da 6.1 %), se concentra en Oaxaca,
          Yucatán y Chiapas, el 92 % de quienes lo declaran también se
          consideran indígenas y usan internet 24 puntos por debajo del
          resto. P6A_4 (motivo por el que se considera indígena) solo tiene
          respuesta cuando P6A_3 = 1, lo que fija esa como la autoadscripción.
  SEXO    1 = hombre, 2 = mujer
  TLOC    1 = 100 mil o más; 2 = 15 mil a 99 999; 3 = 2 500 a 14 999;
          4 = menos de 2 500 (coincide con DOMINIO = 'R')
  NIVEL   00 ninguno, 01 preescolar, 02 primaria, 03 secundaria, 04 normal
          básica, 05 técnicos con secundaria, 06 preparatoria, 07 técnicos
          con preparatoria, 08 licenciatura, 09 especialidad, 10 maestría,
          11 doctorado, 99 no sabe. Tramos: 00-02, 03-05, 06-07, 08-11.
  P7_1    1 = usó internet en los últimos tres meses, 2 = no
  P6_1    1 = usó computadora, laptop o tablet, 2 = no
  P8_1    1 = dispone de celular, 2 = no
  P8_3    1 = usó celular, 2 = no
  Las preguntas de "sí/no" de los módulos 7 y 8 son 1 = sí, 2 = no.
  P7_2, P6_3, P8_2, P4_8: motivo de no uso, códigos del cuestionario 2023
  (mismo instrumento), cotejados contra el rango observado en 2025.

El factor es FAC_PER; el diseño, UPM_DIS y EST_DIS.
"""

import os
import sys

import duckdb
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import (  # noqa: E402
    agregar, completar, escribir, guardia, anotar_calculado, sql_rango_edad,
    sql_entidad, LLAVES_BASE, EDAD_MINIMA, EDAD_MINIMA_ESCOLARIDAD, ESTRATO, sql_estrato)

BASE_ENDUTIH = os.environ.get(
    "ENDUTIH_DIR",
    r"D:\IMPORTANTE\SocialDataIbero\Framework\discriminacion-mujeres\src\data\raw\endutih",
)
ANIO = 2025
FUENTE = "ENDUTIH 2025 (INEGI)"
LLAVES_HOGAR = ["UPM", "VIV_SEL", "HOGAR"]
LLAVES_PERSONA = LLAVES_HOGAR + ["NUM_REN"]

U_TODOS = "Personas de 6 años o más"
U_NET = "Personas de 6 años o más que usan internet"
U_CEL = "Personas de 6 años o más que usan celular"
U_SMART = "Personas de 6 años o más que usan celular inteligente"
U_NO_NET = "Personas de 6 años o más que no usan internet"
U_NO_PC = "Personas de 6 años o más que no usan computadora"
U_NO_CEL = "Personas de 6 años o más sin celular"
U_HOG_SIN = "Personas de 6 años o más en hogares sin internet"
U_HOG_CON = "Personas de 6 años o más en hogares con internet"
U_RADIO = "Personas de 6 años o más que escucharon la radio"
U_NO_RADIO = "Personas de 6 años o más que no escucharon la radio"

# (clave, tema, nombre, expresión SQL de "cumple", expresión SQL del universo, texto del universo)
SI = lambda c: f"{c} = '1'"  # noqa: E731
VAL = lambda c: f"{c} IN ('1', '2')"  # noqa: E731

INDICADORES = [
    # --- Uso: quién se conecta y con qué --------------------------------------
    ("usa_internet", "endutih-uso", "Usa internet", SI("P7_1"), VAL("P7_1"), U_TODOS),
    ("usa_computadora", "endutih-uso", "Usa computadora, laptop o tableta", SI("P6_1"), VAL("P6_1"), U_TODOS),
    ("tiene_celular", "endutih-uso", "Dispone de celular", SI("P8_1"), VAL("P8_1"), U_TODOS),
    # Definición del INEGI de persona usuaria de celular: dispone de uno Y lo usó en
    # los últimos tres meses. Con P8_3 sola salía 89.1 %; con las dos, 84.6 %, que es
    # la cifra del comunicado 32/26 y reproduce su brecha por sexo de 0.3 puntos.
    ("usa_celular", "endutih-uso", "Usa celular", "(P8_1 = '1' AND P8_3 = '1')", f"{VAL('P8_1')} AND {VAL('P8_3')}", U_TODOS),
    ("smartphone", "endutih-uso", "El celular que usa es inteligente", SI("P8_4_2"), f"{SI('P8_3')} AND {VAL('P8_4_2')}", U_CEL),
    ("net_diario", "endutih-uso", "Usa internet todos los días", "P7_3 = '1'", f"{SI('P7_1')} AND P7_3 IN ('1','2','3','4','5')", U_NET),
    ("hogar_internet", "endutih-uso", "Vive en un hogar con internet", SI("P4_4"), VAL("P4_4"), U_TODOS),
    ("hogar_solo_movil", "endutih-uso", "La conexión del hogar es solo móvil", "P4_5 = '2'", f"{SI('P4_4')} AND P4_5 IN ('1','2','3')", U_HOG_CON),
    ("hogar_computadora", "endutih-uso", "Vive en un hogar con computadora, laptop o tableta",
     "(P4_2_1_1 = '1' OR P4_2_2_1 = '1' OR P4_2_3_1 = '1')",
     "(P4_2_1_1 IN ('1','2') OR P4_2_2_1 IN ('1','2') OR P4_2_3_1 IN ('1','2'))", U_TODOS),
    ("datos_moviles", "endutih-uso", "Se conecta con datos móviles", SI("P8_12_2"), f"{SI('P8_3')} AND {SI('P8_4_2')} AND {VAL('P8_12_2')}", U_SMART),
    ("wifi", "endutih-uso", "Se conecta por wifi", SI("P8_12_1"), f"{SI('P8_3')} AND {SI('P8_4_2')} AND {VAL('P8_12_1')}", U_SMART),
    ("via_smartphone", "endutih-uso", "Se conecta desde un celular inteligente", SI("P7_6_4"), f"{SI('P7_1')} AND {VAL('P7_6_4')}", U_NET),
    ("via_laptop", "endutih-uso", "Se conecta desde una laptop", SI("P7_6_2"), f"{SI('P7_1')} AND {VAL('P7_6_2')}", U_NET),
    ("via_escritorio", "endutih-uso", "Se conecta desde una computadora de escritorio", SI("P7_6_1"), f"{SI('P7_1')} AND {VAL('P7_6_1')}", U_NET),
    ("via_tablet", "endutih-uso", "Se conecta desde una tableta", SI("P7_6_3"), f"{SI('P7_1')} AND {VAL('P7_6_3')}", U_NET),
    ("via_tv", "endutih-uso", "Se conecta desde una televisión inteligente", SI("P7_6_5"), f"{SI('P7_1')} AND {VAL('P7_6_5')}", U_NET),
    ("lugar_hogar", "endutih-uso", "Usa internet en el hogar", SI("P7_8_1"), f"{SI('P7_1')} AND {VAL('P7_8_1')}", U_NET),
    ("lugar_movil", "endutih-uso", "Usa internet en cualquier lugar con conexión móvil", SI("P7_8_7"), f"{SI('P7_1')} AND {VAL('P7_8_7')}", U_NET),
    ("lugar_publico", "endutih-uso", "Usa internet en un sitio público gratuito", SI("P7_8_5"), f"{SI('P7_1')} AND {VAL('P7_8_5')}", U_NET),
    ("lugar_escuela", "endutih-uso", "Usa internet en la escuela", SI("P7_8_3"), f"{SI('P7_1')} AND {VAL('P7_8_3')}", U_NET),
    ("lugar_trabajo", "endutih-uso", "Usa internet en el trabajo", SI("P7_8_2"), f"{SI('P7_1')} AND {VAL('P7_8_2')}", U_NET),
    # Radio. P4_1_1 es el primer bien de la pregunta 4.1 del hogar; P10_1 a
    # P10_5, la sección de radio del cuestionario de personas (última semana).
    # El orden de los bienes se comprobó con sus tasas: celular 95 %, pantalla
    # plana 85 %, radio 35 %, televisor analógico 11 %.
    ("hogar_radio", "endutih-uso", "Vive en un hogar con radio", SI("P4_1_1"), VAL("P4_1_1"), U_TODOS),
    ("escucha_radio", "endutih-uso", "Escuchó la radio en la última semana", SI("P10_1"), VAL("P10_1"), U_TODOS),
    ("radio_aparato", "endutih-uso", "Escucha la radio en un aparato de radio", "P10_4 IN ('1','2','3')",
     f"{SI('P10_1')} AND P10_4 IN ('1','2','3','4','5','6','7')", U_RADIO),
    ("radio_digital", "endutih-uso", "Escucha la radio en celular, tableta o computadora", "P10_4 IN ('4','5','6')",
     f"{SI('P10_1')} AND P10_4 IN ('1','2','3','4','5','6','7')", U_RADIO),
    ("radio_hogar", "endutih-uso", "Escucha la radio en el hogar", "P10_5 = '1'",
     f"{SI('P10_1')} AND P10_5 IN ('1','2','3','4','5')", U_RADIO),

    # --- Actividades: para qué se usa ------------------------------------------
    ("act_escolar", "endutih-actividades", "Usa internet para actividades escolares", SI("P7_9_2"), f"{SI('P7_1')} AND {VAL('P7_9_2')}", U_NET),
    ("act_laboral", "endutih-actividades", "Usa internet para actividades laborales", SI("P7_9_1"), f"{SI('P7_1')} AND {VAL('P7_9_1')}", U_NET),
    ("act_capacitacion", "endutih-actividades", "Se capacitó para el trabajo por internet", SI("P7_11_1"), f"{SI('P7_1')} AND {VAL('P7_11_1')}", U_NET),
    ("act_cursos", "endutih-actividades", "Tomó cursos de apoyo al estudio", SI("P7_11_2"), f"{SI('P7_1')} AND {VAL('P7_11_2')}", U_NET),
    ("act_tutoriales", "endutih-actividades", "Tomó tutoriales en línea", SI("P7_11_3"), f"{SI('P7_1')} AND {VAL('P7_11_3')}", U_NET),
    ("act_salud", "endutih-actividades", "Buscó información sobre salud", SI("P7_10_1"), f"{SI('P7_1')} AND {VAL('P7_10_1')}", U_NET),
    ("act_empleo", "endutih-actividades", "Buscó empleo o bolsas de trabajo", SI("P7_10_2"), f"{SI('P7_1')} AND {VAL('P7_10_2')}", U_NET),
    ("act_tareas", "endutih-actividades", "Buscó información para educación o tareas", SI("P7_10_3"), f"{SI('P7_1')} AND {VAL('P7_10_3')}", U_NET),
    ("act_gob_comunica", "endutih-actividades", "Se comunicó con el gobierno", SI("P7_35_1"), f"{SI('P7_1')} AND {VAL('P7_35_1')}", U_NET),
    ("act_gob_consulta", "endutih-actividades", "Consultó información del gobierno", SI("P7_35_2"), f"{SI('P7_1')} AND {VAL('P7_35_2')}", U_NET),
    ("act_gob_formatos", "endutih-actividades", "Descargó formatos del gobierno", SI("P7_35_3"), f"{SI('P7_1')} AND {VAL('P7_35_3')}", U_NET),
    ("act_banca", "endutih-actividades", "Usó banca electrónica", SI("P7_33"), f"{SI('P7_1')} AND {VAL('P7_33')}", U_NET),
    ("act_compras", "endutih-actividades", "Compró por internet", SI("P7_21"), f"{SI('P7_1')} AND {VAL('P7_21')}", U_NET),
    ("act_ventas", "endutih-actividades", "Vendió por internet", SI("P7_19"), f"{SI('P7_1')} AND {VAL('P7_19')}", U_NET),
    ("act_pagos", "endutih-actividades", "Realizó pagos por internet", SI("P7_28"), f"{SI('P7_1')} AND {VAL('P7_28')}", U_NET),
    ("act_redes", "endutih-actividades", "Usa redes sociales", SI("P7_15"), f"{SI('P7_1')} AND {VAL('P7_15')}", U_NET),
    ("act_mensajes", "endutih-actividades", "Envía mensajes instantáneos", SI("P7_12_3"), f"{SI('P7_1')} AND {VAL('P7_12_3')}", U_NET),
    ("act_llamadas", "endutih-actividades", "Hace llamadas por internet", SI("P7_12_2"), f"{SI('P7_1')} AND {VAL('P7_12_2')}", U_NET),
    ("act_correo", "endutih-actividades", "Envía correos electrónicos", SI("P7_12_1"), f"{SI('P7_1')} AND {VAL('P7_12_1')}", U_NET),
    ("act_lectura", "endutih-actividades", "Lee periódicos, revistas o libros en línea", SI("P7_13_1"), f"{SI('P7_1')} AND {VAL('P7_13_1')}", U_NET),
    ("act_video_gratis", "endutih-actividades", "Ve video gratuito en línea", SI("P7_13_3"), f"{SI('P7_1')} AND {VAL('P7_13_3')}", U_NET),
    ("act_video_pago", "endutih-actividades", "Ve video de paga en línea", SI("P7_13_2"), f"{SI('P7_1')} AND {VAL('P7_13_2')}", U_NET),
    ("act_musica", "endutih-actividades", "Escucha música en línea", SI("P7_13_4"), f"{SI('P7_1')} AND {VAL('P7_13_4')}", U_NET),
    ("act_radio", "endutih-actividades", "Escucha radio AM o FM por internet", SI("P7_13_6"), f"{SI('P7_1')} AND {VAL('P7_13_6')}", U_NET),
    ("act_juegos", "endutih-actividades", "Juega en línea", SI("P7_13_5"), f"{SI('P7_1')} AND {VAL('P7_13_5')}", U_NET),
    ("act_nube", "endutih-actividades", "Usa servicios en la nube", SI("P7_17_2"), f"{SI('P7_1')} AND {VAL('P7_17_2')}", U_NET),
    ("act_crea", "endutih-actividades", "Creó sitios de internet o blogs", SI("P7_14"), f"{SI('P7_1')} AND {VAL('P7_14')}", U_NET),
    ("riesgo_fraude", "endutih-actividades", "Sufrió fraude con información", SI("P7_18_5"), f"{SI('P7_1')} AND {VAL('P7_18_5')}", U_NET),
    ("riesgo_privacidad", "endutih-actividades", "Sufrió violación a su privacidad", SI("P7_18_6"), f"{SI('P7_1')} AND {VAL('P7_18_6')}", U_NET),

    # --- Barreras: quién no se conecta y por qué -------------------------------
    ("desconectado", "endutih-barreras", "No usa internet ni celular", "(P7_1 = '2' AND P8_3 = '2')", f"{VAL('P7_1')} AND {VAL('P8_3')}", U_TODOS),
    ("no_internet", "endutih-barreras", "No usa internet", "P7_1 = '2'", VAL("P7_1"), U_TODOS),
    ("no_computadora", "endutih-barreras", "No usa computadora, laptop ni tableta", "P6_1 = '2'", VAL("P6_1"), U_TODOS),
    ("sin_celular", "endutih-barreras", "No dispone de celular", "P8_1 = '2'", VAL("P8_1"), U_TODOS),
    ("no_radio", "endutih-barreras", "No escuchó la radio en la última semana", "P10_1 = '2'", VAL("P10_1"), U_TODOS),
    ("hogar_sin_internet", "endutih-barreras", "Vive en un hogar sin internet", "P4_4 = '2'", VAL("P4_4"), U_TODOS),
]

# Motivos: cada categoría es un indicador con el universo de quienes NO usan.
# Sumadas, las categorías de un mismo bloque reconstruyen el 100 % de ese
# universo, que es lo que permite dibujarlas apiladas.
MOTIVOS = {
    "P7_2": ("Motivo para no usar internet", U_NO_NET, "P7_1 = '2'", {
        "1": "No tiene acceso, aunque sabe usarlo", "2": "No sabe utilizarlo",
        "3": "No le interesa o no lo necesita", "4": "Falta de recursos económicos",
        "5": "Por discapacidad", "6": "Por privacidad o seguridad",
        "7": "No le permiten usarlo", "8": "Otra razón"}),
    "P6_3": ("Motivo para no usar computadora", U_NO_PC, "P6_1 = '2'", {
        "1": "No tiene acceso, aunque sabe usarla", "2": "No sabe utilizarla",
        "3": "No le interesa o no la necesita", "4": "Falta de recursos económicos",
        "5": "Usa su celular inteligente", "6": "Desconoce su utilidad",
        "7": "Por discapacidad", "8": "Otra razón"}),
    "P8_2": ("Motivo para no disponer de celular", U_NO_CEL, "P8_1 = '2'", {
        "1": "Falta de recursos económicos", "2": "No le interesa o no lo necesita",
        "3": "No hay servicio en su localidad", "4": "Por privacidad o seguridad",
        "5": "No sabe utilizarlo", "6": "No le permiten usarlo",
        "7": "Por discapacidad", "8": "Otra razón"}),
    "P4_8": ("Motivo del hogar para no tener internet", U_HOG_SIN, "P4_4 = '2'", {
        "1": "Falta de recursos económicos", "2": "No les interesa o no lo necesitan",
        "3": "No saben usarlo", "4": "Desconocen su utilidad",
        "5": "Equipo insuficiente o sin capacidad", "6": "No hay proveedor o infraestructura",
        "7": "Tienen acceso en otros lugares", "8": "Por privacidad o seguridad",
        "9": "Otra razón", "10": "No responde"}),
    "P10_2": ("Motivo para no escuchar la radio", U_NO_RADIO, "P10_1 = '2'", {
        "1": "No le interesa o no lo necesita", "2": "No cuenta con un aparato para escucharla",
        "3": "No hay servicio en su localidad", "4": "Por discapacidad", "5": "Otra razón"}),
}


def _texto(s):
    return s.astype(str).str.strip()


def cargar():
    from dbfread import DBF
    carpeta = os.path.join(BASE_ENDUTIH, str(ANIO), "conjuntos_de_datos")
    if not os.path.isdir(carpeta):
        raise SystemExit(f"No se encontraron los microdatos de ENDUTIH {ANIO} en {carpeta}.")
    leer = lambda n: pd.DataFrame(iter(DBF(os.path.join(carpeta, n), encoding="latin-1")))  # noqa: E731
    usu, usu2, hog = leer("ti25usu.dbf"), leer("ti25usu2.dbf"), leer("ti25hog.dbf")
    for d in (usu, usu2, hog):
        for c in LLAVES_PERSONA:
            if c in d.columns:
                d[c] = _texto(d[c])

    cols2 = [c for c in usu2.columns if c.startswith("P8") or c.startswith("P10") or c in LLAVES_PERSONA]
    m = usu.merge(usu2[cols2], on=LLAVES_PERSONA, how="left", validate="one_to_one")
    colsh = [c for c in hog.columns if c.startswith("P4") or c.startswith("P5") or c in LLAVES_HOGAR]
    m = m.merge(hog[colsh], on=LLAVES_HOGAR, how="left", validate="many_to_one")
    if len(m) != len(usu) or m["P8_1"].isna().any() or m["P4_4"].isna().any():
        raise SystemExit("ENDUTIH: la unión de usuarios con celular u hogar dejó filas sin pareja.")

    for c in m.columns:
        if c.startswith("P") or c in ("SEXO", "TLOC", "NIVEL", "DOMINIO", "CVE_ENT", "UPM_DIS", "EST_DIS", "ESTRATO"):
            m[c] = _texto(m[c])
    m["edad"] = pd.to_numeric(m["EDAD"], errors="coerce")
    m["w"] = pd.to_numeric(m["FAC_PER"], errors="coerce").fillna(0.0)
    m["cve_ent"] = pd.to_numeric(m["CVE_ENT"], errors="coerce")

    # Comprobación de que TLOC = 4 es exactamente el dominio rural.
    cruce = pd.crosstab(m["TLOC"], m["DOMINIO"])
    print(f"[ok] ENDUTIH: TLOC x DOMINIO\n{cruce}", file=sys.stderr)
    # Todo el dominio rural cae en TLOC = 4; al revés no es exacto: unas
    # pocas localidades de menos de 2 500 habitantes (333 registros en 2025,
    # el 2.6 % del tramo) están clasificadas como urbanas por conurbación.
    # El tablero usa TLOC, que es la misma definición que Censo y ENIGH.
    if cruce.loc["4", "R"] != cruce["R"].sum() or cruce.loc["4", "U"] > 0.05 * cruce.loc["4"].sum():
        raise SystemExit("ENDUTIH: TLOC = 4 no coincide con DOMINIO = R.")

    # P4_8 viene con dos dígitos y cero a la izquierda ('01'...'10'); los
    # otros tres motivos con uno. Se normalizan al catálogo sin ceros.
    for c in MOTIVOS:
        m[c] = m[c].str.lstrip("0")
    for c, cats in ((c, v[3]) for c, v in MOTIVOS.items()):
        vistos = set(m.loc[m[c] != "", c].unique())
        extra = vistos - set(cats)
        if extra:
            raise SystemExit(f"ENDUTIH: {c} trae códigos fuera del catálogo: {sorted(extra)}")
        print(f"[ok] {c}: {m.loc[m[c] != '', c].value_counts().sort_index().to_dict()}", file=sys.stderr)

    fuera = set(m["ESTRATO"].unique()) - set(ESTRATO)
    if fuera:
        raise SystemExit(f"ENDUTIH: ESTRATO trae códigos fuera del catálogo: {sorted(fuera)}")

    m = m[(m["edad"] >= EDAD_MINIMA) & m["P6A_5"].isin(["1", "2"]) & m["P6A_3"].isin(["1", "2"])
          & m["SEXO"].isin(["1", "2"])].copy()
    return m


def main():
    m = cargar()
    print(f"[ok] ENDUTIH {ANIO}: {len(m):,} personas de 6 años o más con identidad conocida", file=sys.stderr)

    con = duckdb.connect()
    con.execute("PRAGMA disable_progress_bar")
    con.register("m", m)

    sel = ",\n      ".join(f"({y}) AS y_{k}, ({u}) AS u_{k}" for k, _, _, y, u, _ in INDICADORES)
    sel_mot = ",\n      ".join(
        f"({col} = '{codigo}') AS y_{col}_{codigo}, ({univ}) AS u_{col}_{codigo}"
        for col, (_, _, univ, cats) in MOTIVOS.items() for codigo in cats)

    con.execute(f"""
    CREATE TABLE base AS
    SELECT
      {ANIO} AS anio,
      CASE P6A_5 WHEN '1' THEN 'Sí' ELSE 'No' END AS lengua,
      CASE P6A_3 WHEN '1' THEN 'Sí' ELSE 'No' END AS autoads,
      CASE SEXO WHEN '1' THEN 'Hombres' ELSE 'Mujeres' END AS sexo,
      {sql_entidad("cve_ent")} AS entidad,
      {sql_rango_edad("edad")} AS rango_edad,
      CASE TLOC
        WHEN '1' THEN '100 mil habitantes o más'
        WHEN '2' THEN '15 mil a 99 999'
        WHEN '3' THEN '2 500 a 14 999'
        WHEN '4' THEN 'Menos de 2 500'
      END AS tam_loc,
      CASE
        WHEN edad < {EDAD_MINIMA_ESCOLARIDAD} THEN NULL
        WHEN NIVEL IN ('00', '01', '02') THEN 'Primaria o menos'
        WHEN NIVEL IN ('03', '04', '05') THEN 'Secundaria'
        WHEN NIVEL IN ('06', '07') THEN 'Media superior'
        WHEN NIVEL IN ('08', '09', '10', '11') THEN 'Superior'
      END AS escolaridad,
      {sql_estrato("ESTRATO")} AS estrato,
      w, UPM_DIS AS upm, EST_DIS AS est,
      {sel},
      {sel_mot}
    FROM m
    WHERE entidad IS NOT NULL AND rango_edad IS NOT NULL AND tam_loc IS NOT NULL
    """)
    con.unregister("m")

    indicadores = [{"clave": k, "tema": t, "indicador": n, "universo": u} for k, t, n, _, _, u in INDICADORES]
    for col, (nombre, univ, _, cats) in MOTIVOS.items():
        for codigo, etiqueta in cats.items():
            indicadores.append({"clave": f"{col}_{codigo}", "tema": "endutih-barreras",
                                "indicador": f"{nombre}: {etiqueta}", "universo": univ})

    largo = completar(agregar(con, "base", LLAVES_BASE, indicadores), FUENTE, "endutih")

    usa = largo[largo["indicador"] == "Usa internet"]
    p_hli = 100 * usa.loc[usa["lengua"] == "Sí", "den"].sum() / usa["den"].sum()
    p_aut = 100 * usa.loc[usa["autoads"] == "Sí", "den"].sum() / usa["den"].sum()
    print(f"[ok] ENDUTIH {ANIO}: habla lengua indígena {p_hli:.2f} %; se considera indígena {p_aut:.2f} %",
          file=sys.stderr)
    if not 4 <= p_hli <= 9 or not 12 <= p_aut <= 35:
        raise SystemExit("ENDUTIH: participación indígena fuera de rango; revisa P6A_5 y P6A_3.")
    p_net = guardia(largo, "usa internet (6 años o más)", 70, 92, lambda d: d["indicador"] == "Usa internet")
    anotar_calculado("endutih", "usa_internet_6mas", p_net, "% de personas de 6 años o más que usan internet")
    p_cel = guardia(largo, "usa celular (6 años o más)", 70, 95, lambda d: d["indicador"] == "Usa celular")
    anotar_calculado("endutih", "usa_celular_6mas", p_cel, "% de personas de 6 años o más que usan celular")
    p_pc = guardia(largo, "usa computadora (6 años o más)", 20, 60, lambda d: d["indicador"] == "Usa computadora, laptop o tableta")
    anotar_calculado("endutih", "usa_computadora_6mas", p_pc, "% de personas de 6 años o más que usan computadora")
    # Composición de las personas usuarias de internet: el reporte de resultados
    # publica qué parte habla lengua indígena y qué parte se considera indígena.
    # Es el cotejo directo del mapeo de P6A_5 y P6A_3.
    usan = usa["num"].sum()
    anotar_calculado("endutih", "net_habla_lengua", 100 * usa.loc[usa["lengua"] == "Sí", "num"].sum() / usan,
                     "% de las personas usuarias de internet que hablan lengua indígena")
    anotar_calculado("endutih", "net_se_considera", 100 * usa.loc[usa["autoads"] == "Sí", "num"].sum() / usan,
                     "% de las personas usuarias de internet que se consideran indígenas")
    p_radio = guardia(largo, "escuchó la radio (6 años o más)", 15, 60,
                      lambda d: d["indicador"] == "Escuchó la radio en la última semana")
    anotar_calculado("endutih", "escucha_radio_6mas", p_radio, "% de personas de 6 años o más que escucharon la radio en la última semana")
    guardia(largo, "usa internet (habla lengua indígena)", 30, 80,
            lambda d: (d["indicador"] == "Usa internet") & (d["lengua"] == "Sí"))

    for tema in ("endutih-uso", "endutih-actividades", "endutih-barreras"):
        escribir(largo[largo["tema"] == tema], tema)

    con.execute("CREATE VIEW base_esc AS SELECT * FROM base WHERE escolaridad IS NOT NULL")
    llaves_esc = [k for k in LLAVES_BASE if k != "tam_loc"] + ["escolaridad"]
    ind_esc = [{**i, "universo": i["universo"].replace("6 años", "15 años")} for i in indicadores]
    largo_esc = completar(agregar(con, "base_esc", llaves_esc, ind_esc), FUENTE, "endutih")
    for tema in ("endutih-uso", "endutih-actividades", "endutih-barreras"):
        escribir(largo_esc[largo_esc["tema"] == tema], tema + "_escolaridad")

    llaves_est = [k for k in LLAVES_BASE if k != "tam_loc"] + ["estrato"]
    largo_est = completar(agregar(con, "base", llaves_est, indicadores), FUENTE, "endutih")
    # El estrato tiene que ordenar el uso de internet: si no, los códigos cambiaron.
    net = largo_est[largo_est["indicador"] == "Usa internet"].groupby("estrato")[["num", "den"]].sum()
    tasa = (100 * net["num"] / net["den"]).reindex(list(ESTRATO.values()))
    print(f"[ok] ENDUTIH: usa internet por estrato {tasa.round(1).to_dict()}", file=sys.stderr)
    if not tasa.is_monotonic_increasing:
        raise SystemExit("ENDUTIH: el estrato no ordena el uso de internet; revisa ESTRATO.")
    for tema in ("endutih-uso", "endutih-actividades", "endutih-barreras"):
        escribir(largo_est[largo_est["tema"] == tema], tema + "_estrato")


if __name__ == "__main__":
    main()

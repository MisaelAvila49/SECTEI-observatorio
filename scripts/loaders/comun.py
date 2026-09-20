"""
comun.py: lo que comparten los tres loaders de indicadores (Censo, ENIGH,
ENDUTIH): catálogos de entidad, rangos de edad, tamaño de localidad y
escolaridad; el esquema largo de salida; y el agregador que calcula
numerador, denominador, casos y error estándar en DuckDB con una sola
fórmula para las tres fuentes.

--- El esquema largo -------------------------------------------------------

Cada fila es una celda: un indicador, una edición y una combinación de las
llaves de identidad. El porcentaje NUNCA viaja en el CSV: el navegador suma
num y den de las celdas que el lector combina y divide al final, que es lo
que permite agregar entidades o edades sin promediar tasas.

  tema        página a la que pertenece el indicador
  indicador   nombre visible
  anio        edición
  lengua      "Sí" | "No": habla lengua indígena
  autoads     "Sí" | "No": se considera indígena (autoadscripción)
  sexo        "Mujeres" | "Hombres"
  entidad     nombre oficial de la entidad
  rango_edad  "6-11" ... "60+"
  tam_loc     tamaño de localidad en cuatro tramos, o "Todos"
  decil       decil de ingreso per cápita del hogar (solo ENIGH), o "Todos"
  escolaridad nivel de escolaridad en cuatro tramos (15 años o más), o "Todos"
  num         suma ponderada de quienes cumplen la condición
  den         suma ponderada del universo
  casos       registros de muestra en el universo, sin expandir
  ee          error estándar de num/den bajo el diseño muestral (proporción,
              no puntos porcentuales); vacío cuando no es estimable
  fuente      texto de la fuente para el pie de figura
  universo    texto del denominador
  encuesta    clave corta: censo | enigh | endutih

Las dos columnas de identidad indígena son CELDAS EXCLUYENTES, no dos
versiones del mismo dato: una persona cae en una de cuatro combinaciones
(habla y se considera, habla y no se considera, no habla y se considera, ni
una ni otra). El tablero arma cada criterio sumando las celdas que le tocan:
"habla lengua indígena" = las dos primeras; "se considera indígena" = la
primera y la tercera. Así los dos criterios comparten universo y ninguna
persona se cuenta dos veces.

--- El error estándar -------------------------------------------------------

Linearización de Taylor para el estimador de razón, con varianza entre UPM
dentro de estrato. Es el método de discriminacion-mujeres
(error_muestral.py), reescrito en SQL para que sirva igual sobre los 15
millones de registros del Censo que sobre los 60 mil de la ENDUTIH:

    r      = sum(w*y) / sum(w)
    u_upm  = sum_upm(w*y) - r * sum_upm(w)
    V(r)   = (1/W^2) * sum_estratos [ n_h/(n_h-1) * sum_upm (u - u_medio)^2 ]

Los estratos con una sola UPM no aportan; si la varianza queda en cero el
error viaja vacío, nunca en cero.
"""

import os
import sys

import pandas as pd

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SALIDA = os.path.join(RAIZ, "src", "data", "indicadores")

ENTIDADES = {
    1: "Aguascalientes", 2: "Baja California", 3: "Baja California Sur",
    4: "Campeche", 5: "Coahuila", 6: "Colima", 7: "Chiapas", 8: "Chihuahua",
    9: "Ciudad de México", 10: "Durango", 11: "Guanajuato", 12: "Guerrero",
    13: "Hidalgo", 14: "Jalisco", 15: "México", 16: "Michoacán",
    17: "Morelos", 18: "Nayarit", 19: "Nuevo León", 20: "Oaxaca",
    21: "Puebla", 22: "Querétaro", 23: "Quintana Roo", 24: "San Luis Potosí",
    25: "Sinaloa", 26: "Sonora", 27: "Tabasco", 28: "Tamaulipas",
    29: "Tlaxcala", 30: "Veracruz", 31: "Yucatán", 32: "Zacatecas",
}

# Desde los 6 años: es el universo de la ENDUTIH, y las preguntas de lengua
# y autoadscripción del Censo y la ENIGH se hacen desde los 3. Recortar las
# tres fuentes al mismo piso deja los denominadores comparables.
EDAD_MINIMA = 6
RANGOS_EDAD = [
    (6, 11, "6-11"), (12, 17, "12-17"), (18, 29, "18-29"),
    (30, 44, "30-44"), (45, 59, "45-59"), (60, 130, "60+"),
]
ORDEN_EDAD = [r[2] for r in RANGOS_EDAD]

# Tamaño de localidad, en los cuatro tramos que usan ENIGH y ENDUTIH. El
# Censo publica cinco (parte el de 15 mil a 99 999 en dos) y aquí se junta.
TAM_LOC = [
    "100 mil habitantes o más",
    "15 mil a 99 999",
    "2 500 a 14 999",
    "Menos de 2 500",
]
# Un solo tramo es rural bajo la definición del INEGI (menos de 2 500).
TAM_LOC_RURAL = "Menos de 2 500"

# Escolaridad en cuatro tramos, para personas de 15 años o más. Cada loader
# traduce su propio catálogo a estos cuatro nombres; la verificación de qué
# código cae en qué tramo va en el docstring de cada uno.
ESCOLARIDAD = [
    "Primaria o menos",
    "Secundaria",
    "Media superior",
    "Superior",
]
EDAD_MINIMA_ESCOLARIDAD = 15

LLAVES_BASE = ["anio", "lengua", "autoads", "sexo", "entidad", "rango_edad", "tam_loc"]
LLAVES_EXTRA = {"decil": "decil", "escolaridad": "escolaridad"}

COLUMNAS = [
    "tema", "indicador", "anio", "lengua", "autoads", "sexo", "entidad",
    "rango_edad", "tam_loc", "decil", "escolaridad", "num", "den", "casos",
    "ee", "fuente", "universo", "encuesta",
]


def sql_rango_edad(col="edad"):
    """CASE de SQL que traduce una edad numérica al rango del tablero."""
    partes = [f"WHEN {col} BETWEEN {lo} AND {hi} THEN '{et}'" for lo, hi, et in RANGOS_EDAD]
    return "CASE " + " ".join(partes) + " END"


def sql_entidad(col="cve_ent"):
    partes = [f"WHEN {col} = {k} THEN '{v}'" for k, v in ENTIDADES.items()]
    return "CASE " + " ".join(partes) + " END"


def agregar(con, tabla, llaves, indicadores, peso="w", upm="upm", estrato="est"):
    """
    Agrega una tabla de microdatos ya preparada a la tabla larga del tablero.

    `tabla` es el nombre de una tabla o vista de DuckDB con las columnas de
    `llaves`, el peso, las dos columnas de diseño y, por cada indicador, una
    columna booleana `y_<clave>` (cumple) y `u_<clave>` (está en el universo).
    Las personas fuera del universo de un indicador no entran ni en su
    numerador ni en su denominador ni en su error.

    `indicadores` es una lista de dicts {clave, tema, indicador, universo}.

    Devuelve un DataFrame largo con num, den, casos y ee por celda e
    indicador. Una sola pasada calcula todos los indicadores a la vez: las
    agregaciones intermedias (celda x UPM) se comparten.
    """
    claves = [i["clave"] for i in indicadores]
    ll = ", ".join(llaves)

    sw = ",\n      ".join(
        f"SUM(CASE WHEN u_{k} THEN {peso} END) AS sw_{k}, "
        f"SUM(CASE WHEN u_{k} AND y_{k} THEN {peso} END) AS swy_{k}, "
        f"COUNT(*) FILTER (WHERE u_{k}) AS n_{k}"
        for k in claves)
    tot = ",\n      ".join(
        f"SUM(sw_{k}) AS W_{k}, SUM(swy_{k}) AS N_{k}, SUM(n_{k}) AS C_{k}"
        for k in claves)
    uu = ",\n      ".join(
        f"CASE WHEN a.n_{k} > 0 THEN a.swy_{k} - (t.N_{k} / NULLIF(t.W_{k}, 0)) * a.sw_{k} END AS u_{k}"
        for k in claves)
    ss = ",\n      ".join(
        f"COUNT(*) FILTER (WHERE u_{k} IS NOT NULL) AS nh_{k}, "
        f"SUM(u_{k}) AS su_{k}, SUM(u_{k} * u_{k}) AS suu_{k}"
        for k in claves)
    vv = ",\n      ".join(
        f"SUM(CASE WHEN nh_{k} > 1 THEN nh_{k} / (nh_{k} - 1.0) * (suu_{k} - su_{k} * su_{k} / nh_{k}) END) AS V_{k}"
        for k in claves)
    ee = ",\n      ".join(
        f"CASE WHEN V_{k} > 0 AND W_{k} > 0 THEN sqrt(V_{k}) / W_{k} END AS ee_{k}"
        for k in claves)

    consulta = f"""
    WITH a AS (
      SELECT {ll}, {estrato} AS est_, {upm} AS upm_,
      {sw}
      FROM {tabla}
      GROUP BY ALL
    ),
    t AS (
      SELECT {ll},
      {tot}
      FROM a GROUP BY ALL
    ),
    u AS (
      SELECT a.*,
      {uu}
      FROM a JOIN t USING ({ll})
    ),
    s AS (
      SELECT {ll}, est_,
      {ss}
      FROM u GROUP BY ALL
    ),
    v AS (
      SELECT {ll},
      {vv}
      FROM s GROUP BY ALL
    )
    SELECT t.*,
      {ee}
    FROM t JOIN v USING ({ll})
    """
    ancho = con.execute(consulta).df()

    partes = []
    for ind in indicadores:
        k = ind["clave"]
        d = ancho[llaves].copy()
        d["num"] = ancho[f"N_{k}"]
        d["den"] = ancho[f"W_{k}"]
        d["casos"] = ancho[f"C_{k}"]
        d["ee"] = ancho[f"ee_{k}"]
        d["tema"] = ind["tema"]
        d["indicador"] = ind["indicador"]
        d["universo"] = ind["universo"]
        # Una celda sin universo no es un cero: no existe.
        d = d[d["den"].fillna(0) > 0]
        partes.append(d)
    return pd.concat(partes, ignore_index=True)


def completar(df, fuente, encuesta):
    """Rellena las columnas opcionales y ordena al esquema común."""
    d = df.copy()
    for c, v in (("tam_loc", "Todos"), ("decil", "Todos"), ("escolaridad", "Todos")):
        if c not in d.columns:
            d[c] = v
        d[c] = d[c].fillna(v)
    d["fuente"] = fuente
    d["encuesta"] = encuesta
    d["num"] = d["num"].astype(float).round(2)
    d["den"] = d["den"].astype(float).round(2)
    d["casos"] = d["casos"].astype(int)
    return d[COLUMNAS]


def escribir(df, nombre):
    """
    Escribe src/data/indicadores/<nombre>.parquet.

    Parquet y no CSV: las columnas de texto (indicador, fuente, universo) se
    repiten en cada una de las decenas de miles de celdas y en CSV pesaban
    17 MB por página; con diccionario de Parquet la misma tabla baja a
    menos de 2 MB, que es lo que descarga el navegador.
    """
    os.makedirs(SALIDA, exist_ok=True)
    ruta = os.path.join(SALIDA, nombre + ".parquet")
    d = df.copy()
    d["ee"] = pd.to_numeric(d["ee"], errors="coerce").astype("float64")
    d["anio"] = d["anio"].astype("int32")
    d["casos"] = d["casos"].astype("int32")
    d.to_parquet(ruta, index=False, compression="zstd")
    tam = os.path.getsize(ruta) / 1e6
    print(f"[ok] {nombre}.parquet: {len(d):,} filas, {tam:.2f} MB", file=sys.stderr)
    return ruta


def anotar_calculado(encuesta, clave, valor, nota=""):
    """
    Guarda una cifra nacional calculada por el loader en
    src/data/calculado.csv, que es contra lo que verificar_fuentes.py coteja
    las cifras oficiales transcritas en verificaciones.csv. Una clave se
    sobreescribe si ya existía.
    """
    ruta = os.path.join(RAIZ, "src", "data", "calculado.csv")
    cols = ["encuesta", "clave", "valor", "nota"]
    if os.path.exists(ruta):
        d = pd.read_csv(ruta, dtype=str)
        d = d[~((d["encuesta"] == encuesta) & (d["clave"] == clave))]
    else:
        d = pd.DataFrame(columns=cols)
    fila = pd.DataFrame([{"encuesta": encuesta, "clave": clave,
                          "valor": f"{valor:.4f}", "nota": nota}])
    d = pd.concat([d[cols], fila], ignore_index=True)
    d.sort_values(["encuesta", "clave"]).to_csv(ruta, index=False, encoding="utf-8",
                                                 lineterminator="\n")


def guardia(df, nombre, minimo, maximo, filtro=None):
    """Aborta si la prevalencia nacional de un indicador sale de un rango
    plausible: casi siempre significa que un código se leyó al revés."""
    d = df if filtro is None else df[filtro(df)]
    p = 100 * d["num"].sum() / d["den"].sum() if d["den"].sum() else float("nan")
    if not (minimo <= p <= maximo):
        raise SystemExit(f"{nombre}: prevalencia {p:.1f} % fuera de [{minimo}, {maximo}]. "
                         "Revisa los códigos antes de publicar.")
    print(f"[ok] {nombre}: {p:.1f} %", file=sys.stderr)
    return p

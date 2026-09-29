"""
perfil.py: perfil de la población indígena de la Ciudad de México frente al
resto, 2010, 2015, 2020 y 2025 (muestras censales), con error de diseño.

Dimensiones (cada una con su universo):
  escolaridad      15 años y más con nivel especificado: primaria o menos,
                   secundaria, media superior, superior
  actividad        12 años y más con condición especificada: ocupada,
                   desocupada, no económicamente activa
  posicion         personas ocupadas con posición especificada: empleada u
                   obrera, jornalera o peona, patrona, por cuenta propia, sin pago
  domestico        personas ocupadas: trabajo doméstico remunerado (SINCO 961)
  salud            afiliación a servicios de salud especificada: afiliada
  discapacidad     2020 y 2025 (escala del Grupo de Washington): mucha
                   dificultad o no puede en ver, oír, caminar, recordar,
                   bañarse o hablar. 2010 usó otra pregunta y 2015 no preguntó.
  monolingue       hablantes con respuesta a si hablan español: no lo hablan
  piramide         distribución por edad quinquenal y sexo (sin error)
  proporcion       parte de cada grupo de edad que es indígena (transmisión)

Grupos: con el criterio de lengua, Indígena = habla lengua indígena y Resto =
no la habla (3 años y más, sin no especificados); con el de autoadscripción,
Indígena = se considera indígena y Resto = no se considera (3 años y más; en
2015 la categoría "se considera en parte" no entra en ninguno de los dos).
"Todos" es la población completa de cada universo y sirve para el cotejo con
las cifras publicadas.

Códigos verificados con cruces contra una segunda variable (nivel contra
escolaridad acumulada, condición contra ingreso y posición, afiliación
contra servicio de salud, discapacidad contra edad) y, en 2025, contra los
indicadores publicados por el INEGI para la entidad (PEA 59.25 %, ocupada
96.59 % de la PEA, afiliada 80.07 %, 480 127 personas con discapacidad,
0.95 % de hablantes que no hablan español).
  SEXO            1 hombre, 3 mujer
  HLENGUA         1 sí, 3 no, 9 NE (3 años y más)
  PERETN (2010) / PERTE_INDIGENA: 1 sí, 3 no, 9 NE; 2015 además 2 "en parte"
                  y 8 "no sabe"; 2025 se pregunta a todas las edades
  NIVACAD         2010: 00-02 primaria o menos, 03 y 06 secundaria, 04, 05 y
                  07 media superior, 08-12 superior, 99 NE. 2015-2025: 0-2,
                  3 y 6, 4, 5, 7 y 9 (normal básica), 8 y 10-14, 99 NE
  CONACT          2010, 2020, 2025: 10-20 ocupada, 30 desocupada, 40-80 no
                  activa, 99 NE. 2015: 10-16, 20, 31-35
  SITTRA (SITUACION_TRAB en 2015): 1 empleada u obrera, 2 jornalera, 3
                  ayudante con pago (se suma a empleada), 4 patrona, 5 cuenta
                  propia, 6 sin pago, 9 NE
  Ocupación       2010 OCUACTIV_C de 4 dígitos (9611); 2015-2025 OCUPACION_C
                  de 3 dígitos (961)
  DHSERSAL1       2010 y 2015: 1-7 afiliada, 8 no, 9 NE. 2020 y 2025: 1-8, 9,
                  99 NE
  HESPANOL        2010, 2020, 2025: 1 sí, 3 no, 9 NE. 2015: 5 sí, 7 no, 9 NE
  DIS_*           1 sin dificultad, 2 poca, 3 mucha, 4 no puede, 8 y 9 NE

El ingreso por trabajo no entra en esta tabla: montos de varias ediciones
necesitan deflactarse con el INPC del periodo de levantamiento, y 2020 trae
el ingreso imputado (0.7 % sin dato frente a 11 % en las demás ediciones).

Salida: src/data/perfil_ciudad.csv con
  anio, criterio (lengua|autoads), grupo (Indígena|Resto|Todos), sexo
  (Total|Mujeres|Hombres), edad (Todas|3-14|15-29|30-59|60+), dimension,
  categoria, num, den, casos, ee
"""
import os
import sys

import duckdb
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from comun import agregar, anotar_calculado  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CRUDO = os.path.join(RAIZ, "data-raw")
P2020 = os.environ.get("CENSO2020_PERSONAS", r"D:\IMPORTANTE\SocialDataIbero\AnalisisSueltos\JCF\data\raw\censo2020\Personas00.CSV")
SALIDA = os.path.join(RAIZ, "src", "data", "perfil_ciudad.csv")
ANIOS = (2010, 2015, 2020, 2025)
EDADES_Q = [(3, 4), *[(a, a + 4) for a in range(5, 85, 5)], (85, 130)]


def ruta(p):
    return p.replace("\\", "/")


def cargar(con, anio):
    """Tabla cruda `c` con nombres homologados, todo como texto."""
    if anio == 2010:
        from dbfread import DBF
        cols = ["FACTOR", "UPM", "ESTRATO", "SEXO", "EDAD", "HLENGUA", "HESPANOL", "PERETN", "NIVACAD", "CONACT", "OCUACTIV_C", "SITTRA", "DHSERSAL1"]
        d = pd.DataFrame([{c: r[c] for c in cols} for r in DBF(os.path.join(CRUDO, "censo2010", "Personas_09.dbf"), encoding="latin-1", load=False)]).astype(str)
        d = d.rename(columns={"PERETN": "AUTO", "OCUACTIV_C": "OCUP"})
        con.register("d", d)
        con.execute("CREATE OR REPLACE TABLE c AS SELECT * FROM d")
    elif anio == 2015:
        con.execute(f"""CREATE OR REPLACE TABLE c AS SELECT FACTOR, UPM, ESTRATO, SEXO, EDAD, HLENGUA, HESPANOL, PERTE_INDIGENA AS AUTO,
          NIVACAD, CONACT, OCUPACION_C AS OCUP, SITUACION_TRAB AS SITTRA, DHSERSAL1
          FROM read_csv('{ruta(os.path.join(CRUDO, "eic2015", "TR_PERSONA09.CSV"))}', all_varchar=true, header=true, encoding='latin-1', quote='"', strict_mode=false)""")
    elif anio == 2020:
        con.execute(f"""CREATE OR REPLACE TABLE c AS SELECT FACTOR, UPM, ESTRATO, SEXO, EDAD, HLENGUA, HESPANOL, PERTE_INDIGENA AS AUTO,
          NIVACAD, CONACT, OCUPACION_C AS OCUP, SITTRA, DHSERSAL1, DIS_VER, DIS_OIR, DIS_CAMINAR, DIS_RECORDAR, DIS_BANARSE, DIS_HABLAR
          FROM read_csv('{ruta(P2020)}', all_varchar=true, header=true) WHERE ENT = '09'""")
    else:
        con.execute(f"""CREATE OR REPLACE TABLE c AS SELECT FACTOR, UPM, ESTRATO, SEXO, EDAD, HLENGUA, HESPANOL, PERTE_INDIGENA AS AUTO,
          NIVACAD, CONACT, OCUPACION_C AS OCUP, SITTRA, DHSERSAL1, DIS_VER, DIS_OIR, DIS_CAMINAR, DIS_RECORDAR, DIS_BANARSE, DIS_HABLAR
          FROM read_csv('{ruta(os.path.join(CRUDO, "eic2025", "personas00.csv"))}', all_varchar=true, header=true) WHERE CVE_ENT = '09'""")


def base(con, anio):
    """Tabla `m`: una fila por persona con grupo, cortes e indicadores."""
    i = lambda c: f"TRY_CAST({c} AS INTEGER)"  # noqa: E731
    niv = i("NIVACAD")
    if anio == 2010:
        esc = {"Primaria o menos": f"{niv} BETWEEN 0 AND 2", "Secundaria": f"{niv} IN (3, 6)", "Media superior": f"{niv} IN (4, 5, 7)", "Superior": f"{niv} BETWEEN 8 AND 12"}
    else:
        esc = {"Primaria o menos": f"{niv} BETWEEN 0 AND 2", "Secundaria": f"{niv} IN (3, 6)", "Media superior": f"{niv} IN (4, 5, 7, 9)", "Superior": f"{niv} IN (8, 10, 11, 12, 13, 14)"}
    esc_valida = " OR ".join(f"({v})" for v in esc.values())
    ca = i("CONACT")
    if anio == 2015:
        act = {"Ocupada": f"{ca} BETWEEN 10 AND 16", "Desocupada": f"{ca} = 20", "No económicamente activa": f"{ca} BETWEEN 31 AND 35"}
    else:
        act = {"Ocupada": f"{ca} BETWEEN 10 AND 20", "Desocupada": f"{ca} = 30", "No económicamente activa": f"{ca} BETWEEN 40 AND 80"}
    act_valida = " OR ".join(f"({v})" for v in act.values())
    st = i("SITTRA")
    pos = {"Empleada u obrera": f"{st} IN (1, 3)", "Jornalera o peona": f"{st} = 2", "Patrona": f"{st} = 4", "Por cuenta propia": f"{st} = 5", "Sin pago": f"{st} = 6"}
    ocup = f"({act['Ocupada']})"
    domestico = "OCUP = '9611'" if anio == 2010 else "LEFT(OCUP, 3) = '961'"
    ds = i("DHSERSAL1")
    afil, afil_no = ("BETWEEN 1 AND 7", "= 8") if anio in (2010, 2015) else ("BETWEEN 1 AND 8", "= 9")
    habla_si, habla_no = ("5", "7") if anio == 2015 else ("1", "3")
    dis = ["DIS_VER", "DIS_OIR", "DIS_CAMINAR", "DIS_RECORDAR", "DIS_BANARSE", "DIS_HABLAR"]
    if anio in (2020, 2025):
        dis_si = " OR ".join(f"{i(d)} IN (3, 4)" for d in dis)
        dis_valida = " OR ".join(f"{i(d)} BETWEEN 1 AND 4" for d in dis)
    else:
        dis_si, dis_valida = "FALSE", "FALSE"
    ind = {}
    for k, cond in esc.items():
        ind[("escolaridad", k)] = (cond, f"edad_n >= 15 AND ({esc_valida})")
    for k, cond in act.items():
        ind[("actividad", k)] = (cond, f"edad_n >= 12 AND ({act_valida})")
    for k, cond in pos.items():
        ind[("posicion", k)] = (cond, f"{ocup} AND {st} BETWEEN 1 AND 6")
    ind[("domestico", "Trabajo doméstico remunerado")] = (domestico, f"{ocup} AND OCUP IS NOT NULL AND TRIM(OCUP) NOT IN ('', 'None')")
    ind[("salud", "Afiliada")] = (f"{ds} {afil}", f"({ds} {afil} OR {ds} {afil_no})")
    ind[("discapacidad", "Con discapacidad")] = (f"({dis_si})", f"({dis_valida})")
    ind[("monolingue", "No habla español")] = (f"HESPANOL = '{habla_no}'", f"HLENGUA = '1' AND HESPANOL IN ('{habla_si}', '{habla_no}')")
    cols = []
    claves = {}
    for n, ((dim, cat), (y, u)) in enumerate(ind.items()):
        cols.append(f"COALESCE(({y}), FALSE) AS y_i{n}, COALESCE(({u}), FALSE) AS u_i{n}")
        claves[f"i{n}"] = (dim, cat)
    con.execute(f"""CREATE OR REPLACE TABLE m AS SELECT
        CAST(FACTOR AS DOUBLE) AS w, UPM AS upm, ESTRATO AS est,
        CASE SEXO WHEN '1' THEN 'Hombres' WHEN '3' THEN 'Mujeres' END AS sexo,
        {i('EDAD')} AS edad, HLENGUA, HESPANOL, OCUP,
        CASE WHEN {i('EDAD')} >= 3 THEN CASE HLENGUA WHEN '1' THEN 'Indígena' WHEN '3' THEN 'Resto' END END AS g_lengua,
        CASE WHEN {i('EDAD')} >= 3 THEN CASE AUTO WHEN '1' THEN 'Indígena' WHEN '3' THEN 'Resto' END END AS g_autoads,
        CASE WHEN {i('EDAD')} BETWEEN 3 AND 14 THEN '3-14' WHEN {i('EDAD')} BETWEEN 15 AND 29 THEN '15-29'
             WHEN {i('EDAD')} BETWEEN 30 AND 59 THEN '30-59' WHEN {i('EDAD')} BETWEEN 60 AND 130 THEN '60+' END AS edad_g,
        {', '.join(cols)}
      FROM (SELECT *, {i('EDAD')} AS edad_n FROM c) WHERE SEXO IN ('1', '3') AND {i('EDAD')} BETWEEN 0 AND 130""")
    return claves


def main():
    partes, claves = [], {}
    for anio in ANIOS:
        con = duckdb.connect()
        con.execute("PRAGMA disable_progress_bar")
        cargar(con, anio)
        claves = base(con, anio)
        n = con.execute("SELECT COUNT(*), ROUND(SUM(w)) FROM m").fetchone()
        print(f"[ok] {anio}: {n[0]:,} personas, {n[1]:,.0f} expandidas", file=sys.stderr)
        ind = [{"clave": k, "tema": "perfil", "indicador": k, "universo": ""} for k in claves]
        cols_ind = ", ".join(f"y_{k}, u_{k}" for k in claves)
        grupos = [("lengua", "g_lengua", "WHERE g_lengua IS NOT NULL"), ("autoads", "g_autoads", "WHERE g_autoads IS NOT NULL"), ("todos", "'Todos'", "WHERE TRUE")]
        for criterio, grupo_sql, filtro in grupos:
            for sexo in ("sexo", "'Total'"):
                for edad in ("edad_g", "'Todas'"):
                    f2 = filtro + (" AND edad_g IS NOT NULL" if edad == "edad_g" else "")
                    con.execute(f"""CREATE OR REPLACE VIEW v AS SELECT {grupo_sql} AS grupo, {sexo} AS sexo, {edad} AS edad,
                        w, upm, est, {cols_ind} FROM m {f2}""")
                    d = agregar(con, "v", ["grupo", "sexo", "edad"], ind)
                    d["dimension"] = d["indicador"].map(lambda k: claves[k][0])
                    d["categoria"] = d["indicador"].map(lambda k: claves[k][1])
                    partes.append(d.assign(criterio=criterio, anio=anio))
        for criterio in ("lengua", "autoads"):
            g = f"g_{criterio}"
            caso = " ".join(f"WHEN edad BETWEEN {a} AND {b} THEN '{a}-{b}'" if b < 130 else f"WHEN edad >= {a} THEN '{a} y más'" for a, b in EDADES_Q)
            pir = con.execute(f"""SELECT {g} AS grupo, sexo, CASE {caso} END AS categoria, SUM(w) AS num, COUNT(*) AS casos
                FROM m WHERE {g} IS NOT NULL GROUP BY 1, 2, 3""").df()
            pir["den"] = pir.groupby("grupo")["num"].transform("sum")
            partes.append(pir.assign(criterio=criterio, anio=anio, edad="Todas", dimension="piramide", ee=None))
            prop = con.execute(f"""SELECT 'Todos' AS grupo, 'Total' AS sexo, edad_g AS categoria,
                SUM(CASE WHEN {g} = 'Indígena' THEN w ELSE 0 END) AS num, SUM(w) AS den, COUNT(*) AS casos
                FROM m WHERE {g} IS NOT NULL AND edad_g IS NOT NULL GROUP BY 3""").df()
            partes.append(prop.assign(criterio=criterio, anio=anio, edad="Todas", dimension="proporcion", ee=None))
    out = pd.concat(partes, ignore_index=True)
    out = out[out["den"] > 0]
    # La discapacidad se pregunta igual solo en 2020 y 2025.
    out = out[~((out["dimension"] == "discapacidad") & (~out["anio"].isin([2020, 2025])))]
    out = out[["anio", "criterio", "grupo", "sexo", "edad", "dimension", "categoria", "num", "den", "casos", "ee"]]
    for col in ("num", "den"):
        out[col] = out[col].astype(float).round(1)
    out["ee"] = pd.to_numeric(out["ee"], errors="coerce").round(6)
    out = out.sort_values(["anio", "criterio", "dimension", "grupo", "sexo", "edad", "categoria"])
    out.to_csv(SALIDA, index=False, encoding="utf-8", lineterminator="\n")

    # Cotejo 2025 con la población completa de la entidad (INEGI, EIC 2025).
    t = out[(out.anio == 2025) & (out.criterio == "todos") & (out.sexo == "Total") & (out.edad == "Todas")].set_index(["dimension", "categoria"])
    ocu, des = t.loc[("actividad", "Ocupada"), "num"], t.loc[("actividad", "Desocupada"), "num"]
    pea = 100 * (ocu + des) / t.loc[("actividad", "Ocupada"), "den"]
    ocup = 100 * ocu / (ocu + des)
    afil = 100 * t.loc[("salud", "Afiliada"), "num"] / t.loc[("salud", "Afiliada"), "den"]
    disc = t.loc[("discapacidad", "Con discapacidad"), "num"]
    mono = 100 * t.loc[("monolingue", "No habla español"), "num"] / t.loc[("monolingue", "No habla español"), "den"]
    print(f"[ok] cotejo 2025, CDMX: PEA {pea:.2f} % (INEGI 59.25), ocupada {ocup:.2f} % de la PEA (96.59), afiliada {afil:.2f} % (80.07), "
          f"con discapacidad {disc:,.0f} (480,127), hablantes que no hablan español {mono:.2f} % (0.95)", file=sys.stderr)
    for clave, valor, nota in (("pea_2025", pea, "% de la población de 12 años y más económicamente activa, CDMX 2025"),
                               ("ocupada_pea_2025", ocup, "% de la PEA ocupada, CDMX 2025"),
                               ("afiliada_2025", afil, "% de la población afiliada a servicios de salud, CDMX 2025"),
                               ("discapacidad_2025", disc, "personas con discapacidad, CDMX 2025"),
                               ("monolingue_2025", mono, "% de hablantes que no hablan español, CDMX 2025")):
        anotar_calculado("perfil", clave, float(valor), nota)
    cotejar_indigena(out)
    print(f"[ok] {os.path.relpath(SALIDA, RAIZ)}: {len(out):,} filas", file=sys.stderr)


def cotejar_indigena(out):
    """
    Cotejo 2025 de la población indígena de la ciudad contra los indicadores
    sociodemográficos que el INEGI publica por entidad para hablantes (hoja 51
    del tabulado de etnicidad de la EIC 2025) y para quienes se consideran
    indígenas (hoja 49): discapacidad, afiliación a servicios de salud y tasa
    de participación económica. El INEGI deja el no especificado en el
    denominador de la participación; aquí se excluye, de ahí décimas de
    diferencia.
    """
    for crit, sufijo in (("lengua", "hli"), ("autoads", "autoads")):
        t = out[(out.anio == 2025) & (out.criterio == crit) & (out.grupo == "Indígena") & (out.sexo == "Total") & (out.edad == "Todas")].set_index(["dimension", "categoria"])
        act = t.loc["actividad"]
        pea = 100 * act.loc[["Ocupada", "Desocupada"], "num"].sum() / act["num"].sum()
        disc = 100 * t.loc[("discapacidad", "Con discapacidad"), "num"] / t.loc[("discapacidad", "Con discapacidad"), "den"]
        afil = 100 * t.loc[("salud", "Afiliada"), "num"] / t.loc[("salud", "Afiliada"), "den"]
        for clave, valor, nota in ((f"pea_{sufijo}_2025", pea, f"tasa de participación económica, 12 años y más, {crit}, CDMX 2025"),
                                   (f"discapacidad_{sufijo}_2025", disc, f"% con discapacidad, {crit}, CDMX 2025"),
                                   (f"afiliada_{sufijo}_2025", afil, f"% afiliada a servicios de salud, {crit}, CDMX 2025")):
            anotar_calculado("perfil", clave, float(valor), nota)
        print(f"[ok] cotejo 2025 {crit}: participación {pea:.2f} %, discapacidad {disc:.2f} %, afiliada {afil:.2f} %", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] == ["--solo-cotejo"]:
        cotejar_indigena(pd.read_csv(SALIDA))
    else:
        main()

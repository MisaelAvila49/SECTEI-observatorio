"""
endireh.py: violencia contra las mujeres indígenas de 15 años y más, ENDIREH
2021 (INEGI), por ámbito y tipo, nacional y Ciudad de México, con error de
diseño.

Fuente: microdatos de la ENDIREH 2021 (datos abiertos del INEGI), tablas
TB_VD ("condición de violencia", ya clasificada por el INEGI) y TSDem
(características de las personas del hogar). Ruta en ENDIREH_2021_DIR o la
del proyecto discriminacion-mujeres.

Condición indígena de la mujer entrevistada (TSDem, respondida por el
informante del hogar):
  P2_11  ¿habla algún dialecto o lengua indígena?  1 sí, 2 no
  P2_10  ¿se considera indígena?  1 sí, 2 sí en parte, 3 no, 8 no sabe
         "Indígena" = 1 o 2 (como en los tabulados del INEGI); "Resto" = 3.

Variables de violencia (TB_VD): 1 con violencia, 2 sin, 9 no especificado;
el INEGI deja el 9 en el denominador. Cada ámbito tiene su universo: pareja
entre mujeres con pareja alguna vez (POBP = 1), escolar entre quienes
asistieron a la escuela (POB_E_A, POB_E_12M), laboral entre quienes
trabajaron (POB_L_A, POB_L_12M); familiar (solo últimos 12 meses) y
comunitario entre todas. Una celda vacía es "fuera del universo", no "sin
violencia".

Diseño: FAC_MUJ, UPM_DIS, EST_DIS (el mismo que usa el programa del INEGI).
Representatividad: nacional y por entidad federativa.

Cotejo (tabulados de la ENDIREH 2021, hoja 21.13 y cuadros por ámbito):
violencia a lo largo de la vida 70.1 % total, 60.5 % hablantes, 67.6 % se
consideran indígenas; últimos 12 meses 42.8, 32.4, 40.7.

Salida: src/data/endireh.csv con
  anio, ambito_geo (Nacional|Ciudad de México), criterio (lengua|autoads|todas),
  grupo (Indígena|Resto|Todas), edad (Todas|15-29|30-59|60+), indicador,
  periodo (vida|12 meses), num, den, casos, ee
"""
import os
import sys

import duckdb
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from comun import agregar, anotar_calculado  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BASE = os.environ.get("ENDIREH_2021_DIR", r"D:\IMPORTANTE\SocialDataIbero\Framework\discriminacion-mujeres\src\data\raw\endireh\2021")
SALIDA = os.path.join(RAIZ, "src", "data", "endireh.csv")
# (indicador, periodo) -> (variable, universo)
INDICADORES = {
    ("Cualquier ámbito", "vida"): ("VTOT_A", None), ("Cualquier ámbito", "12 meses"): ("VTOT_12M", None),
    ("Pareja", "vida"): ("VPAR_A", "POBP"), ("Pareja", "12 meses"): ("VPAR_12M", "POBP"),
    ("Familiar", "12 meses"): ("VFAM", None),
    ("Escolar", "vida"): ("VESC_A", "POB_E_A"), ("Escolar", "12 meses"): ("VESC_12M", "POB_E_12M"),
    ("Laboral", "vida"): ("VLAB_A", "POB_L_A"), ("Laboral", "12 meses"): ("VLAB_12M", "POB_L_12M"),
    ("Comunitario", "vida"): ("VCOM_A", None), ("Comunitario", "12 meses"): ("VCOM_12M", None),
    ("Psicológica", "vida"): ("VPSI_A", None), ("Psicológica", "12 meses"): ("VPSI_12M", None),
    ("Física", "vida"): ("VFIS_A", None), ("Física", "12 meses"): ("VFIS_12M", None),
    ("Sexual", "vida"): ("VSEX_A", None), ("Sexual", "12 meses"): ("VSEX_12M", None),
    ("Económica o patrimonial", "vida"): ("VECO_A", None), ("Económica o patrimonial", "12 meses"): ("VECO_12M", None),
}


def leer(tabla, cols=None):
    ruta = os.path.join(BASE, f"conjunto_de_datos_{tabla}", "conjunto_de_datos", f"conjunto_de_datos_{tabla}.csv")
    if not os.path.exists(ruta):
        raise SystemExit(f"Falta {ruta}")
    d = pd.read_csv(ruta, encoding="latin1", dtype=str, usecols=cols, low_memory=False)
    d.columns = [c.strip() for c in d.columns]
    # Cada campo trae un retorno de carro pegado: sin limpiarlo, la unión por
    # ID_PER da cero coincidencias sin error.
    for c in d.columns:
        d[c] = d[c].str.strip()
    return d


def main():
    vd = leer("TB_VD")
    sd = leer("TSDem", ["ID_PER", "EDAD", "P2_10", "P2_11"])
    b = vd.merge(sd, on="ID_PER", how="left")
    if b["P2_11"].isna().mean() > 0.01:
        raise SystemExit("La unión TB_VD - TSDem dejó más de 1 % de mujeres sin condición indígena.")
    num = lambda s: pd.to_numeric(s, errors="coerce")  # noqa: E731
    m = pd.DataFrame({"w": num(b["FAC_MUJ"]), "upm": b["UPM_DIS"], "est": b["EST_DIS"], "ent": b["CVE_ENT"].str.zfill(2)})
    edad = num(b["EDAD"])
    m["edad"] = pd.cut(edad, [14, 29, 59, 130], labels=["15-29", "30-59", "60+"]).astype(str).replace("nan", None)
    m["g_lengua"] = num(b["P2_11"]).map({1: "Indígena", 2: "Resto"})
    m["g_autoads"] = num(b["P2_10"]).map({1: "Indígena", 2: "Indígena", 3: "Resto"})
    claves = {}
    for n, ((ind, per), (var, uni)) in enumerate(INDICADORES.items()):
        v = num(b[var])
        u = v.isin([1, 2, 9])
        if uni:
            u &= num(b[uni]).eq(1)
        m[f"y_i{n}"] = (v == 1) & u
        m[f"u_i{n}"] = u
        claves[f"i{n}"] = (ind, per)
    con = duckdb.connect()
    con.register("m", m)
    lista = [{"clave": k, "tema": "endireh", "indicador": k, "universo": ""} for k in claves]
    cols = ", ".join(f"y_{k}, u_{k}" for k in claves)
    partes = []
    for geo, filtro_geo in (("Nacional", "TRUE"), ("Ciudad de México", "ent = '09'")):
        for criterio, grupo_sql, filtro in (("lengua", "g_lengua", "g_lengua IS NOT NULL"), ("autoads", "g_autoads", "g_autoads IS NOT NULL"), ("todas", "'Todas'", "TRUE")):
            for edad_sql, filtro_edad in (("edad", "edad IS NOT NULL"), ("'Todas'", "TRUE")):
                con.execute(f"CREATE OR REPLACE VIEW v AS SELECT {grupo_sql} AS grupo, {edad_sql} AS edad, w, upm, est, {cols} FROM m WHERE {filtro_geo} AND {filtro} AND {filtro_edad}")
                d = agregar(con, "v", ["grupo", "edad"], lista)
                d["periodo"] = d["indicador"].map(lambda k: claves[k][1])
                d["indicador"] = d["indicador"].map(lambda k: claves[k][0])
                partes.append(d.assign(anio=2021, ambito_geo=geo, criterio=criterio))
    out = pd.concat(partes, ignore_index=True)
    out = out[out["den"] > 0][["anio", "ambito_geo", "criterio", "grupo", "edad", "indicador", "periodo", "num", "den", "casos", "ee"]]
    for col in ("num", "den"):
        out[col] = out[col].round(1)
    out["ee"] = pd.to_numeric(out["ee"], errors="coerce").round(6)
    out.to_csv(SALIDA, index=False, encoding="utf-8", lineterminator="\n")
    t = out[(out.ambito_geo == "Nacional") & (out.edad == "Todas") & (out.indicador == "Cualquier ámbito")]
    def p(crit, grupo, per):
        r = t[(t.criterio == crit) & (t.grupo == grupo) & (t.periodo == per)].iloc[0]
        return 100 * r.num / r.den
    cifras = {"vida_total_2021": p("todas", "Todas", "vida"), "vida_hli_2021": p("lengua", "Indígena", "vida"), "vida_autoads_2021": p("autoads", "Indígena", "vida"),
              "12m_total_2021": p("todas", "Todas", "12 meses"), "12m_hli_2021": p("lengua", "Indígena", "12 meses"), "12m_autoads_2021": p("autoads", "Indígena", "12 meses")}
    print("[ok] cotejo ENDIREH 2021: " + ", ".join(f"{k} {v:.1f}" for k, v in cifras.items()) + " (publicado 70.1, 60.5, 67.6, 42.8, 32.4, 40.7)", file=sys.stderr)
    for k, v in cifras.items():
        anotar_calculado("endireh", k, float(v), f"ENDIREH 2021, mujeres de 15 años y más, nacional: {k}")
    print(f"[ok] {os.path.relpath(SALIDA, RAIZ)}: {len(out):,} filas", file=sys.stderr)


if __name__ == "__main__":
    main()

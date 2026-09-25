"""
Qué lenguas se hablan en la Ciudad de México, dónde, y de dónde vienen
quienes las hablan. Sale de las dos muestras con clave de lengua (EIC 2015 y
cuestionario ampliado 2020), a nivel alcaldía: ningún producto censal publica
la lengua por AGEB ni por manzana.

Salidas:
  src/data/lenguas_alcaldia.csv
    anio, nivel, cve, nombre, lengua (clave INALI), lengua_nombre, familia,
    sexo, num, den, casos, ee, fuente
    num = hablantes de esa lengua; den = población de 3 años y más.
  src/data/lenguas_origen.csv
    anio, lengua, lengua_nombre, tipo ('nacimiento' | 'residencia5'),
    ent (3 dígitos; > 032 es otro país, 999 no especificado), ent_nombre,
    mun (3 dígitos, solo residencia5), num, casos
    Con 'nacimiento', num = hablantes nacidos en esa entidad; con
    'residencia5', hablantes que cinco años antes vivían en ese municipio de
    otra entidad (migración reciente).

Cotejos: 2015 reproduce la tabla 1 del documento de la Secretaría de Cultura
(náhuatl 38 549, mixteco 15 920, otomí 13 764, ...) y 43 lenguas; 2020, el
orden de la tabla 3 de la SEPI (que usa el cuestionario básico y por eso no
coincide en cifras: náhuatl 39 475 contra 38 338 de la muestra).
"""
import os
import sys

import duckdb
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from comun import ENTIDADES, agregar, anotar_calculado  # noqa: E402
from muestras import CARGADORES, comprobar  # noqa: E402
from serie_alcaldias import ALCALDIAS, FUENTE_MUESTRA  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CATALOGO = os.path.join(RAIZ, "src", "data", "catalogo_lenguas.csv")
SALIDA_ALC = os.path.join(RAIZ, "src", "data", "lenguas_alcaldia.csv")
SALIDA_ORI = os.path.join(RAIZ, "src", "data", "lenguas_origen.csv")

CONTROL_2015 = {"0211": 38_549, "0516": 15_920, "0501": 13_764, "0509": 11_076, "0513": 10_593, "0502": 8_321}


def main():
    cat = pd.read_csv(CATALOGO, dtype=str).fillna("")
    nombre = dict(zip(cat["clave"], cat["nombre"]))
    familia = dict(zip(cat["clave"], cat["familia"]))
    ent_nombre = {f"{k:03d}": v for k, v in ENTIDADES.items()}

    alc, ori = [], []
    for anio in (2015, 2020):
        con = duckdb.connect()
        con.execute("PRAGMA disable_progress_bar")
        CARGADORES[anio](con)
        comprobar(con, anio)

        lenguas = [r[0] for r in con.execute("SELECT DISTINCT lengua FROM m WHERE lengua IS NOT NULL ORDER BY 1").fetchall()]
        fuera = sorted(set(lenguas) - set(nombre))
        if fuera:
            raise SystemExit(f"Muestra {anio}: claves de lengua fuera del catálogo: {fuera}")
        print(f"[ok] muestra {anio}: {len(lenguas)} claves de lengua", file=sys.stderr)

        # Una columna y_/u_ por lengua: el universo es la población de 3+ con
        # respuesta de lengua; cumple quien habla ESA lengua.
        sel = ",\n  ".join(f"(lengua = '{k}') AS y_l{k}, (hli IS NOT NULL AND edad >= 3) AS u_l{k}" for k in lenguas)
        con.execute(f"CREATE OR REPLACE TABLE base AS SELECT anio, cve_mun, sexo, w, upm, est,\n  {sel}\nFROM m WHERE sexo IS NOT NULL")
        con.execute("CREATE OR REPLACE VIEW base_t AS SELECT anio, cve_mun, 'Total' AS sexo, * EXCLUDE (anio, cve_mun, sexo) FROM base")
        con.execute("CREATE OR REPLACE VIEW base_e AS SELECT anio, '09' AS cve_mun, sexo, * EXCLUDE (anio, cve_mun, sexo) FROM base")
        con.execute("CREATE OR REPLACE VIEW base_et AS SELECT anio, '09' AS cve_mun, 'Total' AS sexo, * EXCLUDE (anio, cve_mun, sexo) FROM base")
        ind = [{"clave": f"l{k}", "tema": "lenguas", "indicador": k, "universo": "Población de 3 años y más"} for k in lenguas]
        largo = pd.concat([agregar(con, t, ["anio", "cve_mun", "sexo"], ind) for t in ("base", "base_t", "base_e", "base_et")], ignore_index=True)
        largo = largo[largo["num"] > 0]
        for _, r in largo.iterrows():
            nivel = "entidad" if r["cve_mun"] == "09" else "alcaldia"
            alc.append({"anio": anio, "nivel": nivel, "cve": r["cve_mun"],
                        "nombre": "Ciudad de México" if nivel == "entidad" else ALCALDIAS[r["cve_mun"]],
                        "lengua": r["indicador"], "lengua_nombre": nombre[r["indicador"]], "familia": familia[r["indicador"]],
                        "sexo": r["sexo"], "num": round(r["num"], 2), "den": round(r["den"], 2), "casos": int(r["casos"]),
                        "ee": r["ee"], "fuente": FUENTE_MUESTRA[anio]})

        if anio == 2015:
            tot = largo[(largo["cve_mun"] == "09") & (largo["sexo"] == "Total")].set_index("indicador")["num"]
            for k, esperado in CONTROL_2015.items():
                if abs(tot[k] - esperado) > 1:
                    raise SystemExit(f"Lenguas 2015: {nombre[k]} da {tot[k]:,.0f} y el documento dice {esperado:,}.")
            anotar_calculado("lenguas", "n_lenguas_2015", len([k for k in lenguas if k < "8000"]), "agrupaciones lingüísticas con hablantes en la CDMX, EIC 2015")
        anotar_calculado("lenguas", f"nahuatl_{anio}", largo[(largo["cve_mun"] == "09") & (largo["sexo"] == "Total") & (largo["indicador"] == "0211")]["num"].iloc[0],
                         f"hablantes de náhuatl en la CDMX, muestra {anio}")

        # Origen: entidad de nacimiento y municipio de residencia cinco años antes.
        nac = con.execute("""
          SELECT lengua, ent_nac AS ent, ROUND(SUM(w)) AS num, COUNT(*) AS casos
          FROM m WHERE lengua IS NOT NULL GROUP BY 1, 2 ORDER BY 1, 3 DESC""").df()
        res = con.execute("""
          SELECT lengua, ent_res5 AS ent, mun_res5 AS mun, ROUND(SUM(w)) AS num, COUNT(*) AS casos
          FROM m WHERE lengua IS NOT NULL AND ent_res5 BETWEEN '001' AND '032' AND ent_res5 <> '009'
          GROUP BY 1, 2, 3 ORDER BY 1, 4 DESC""").df()
        for _, r in nac.iterrows():
            ori.append({"anio": anio, "lengua": r["lengua"], "lengua_nombre": nombre[r["lengua"]], "tipo": "nacimiento",
                        "ent": r["ent"], "ent_nombre": ent_nombre.get(r["ent"], "Otro país" if r["ent"] > "032" and r["ent"] < "999" else "No especificado"),
                        "mun": "", "num": r["num"], "casos": int(r["casos"])})
        for _, r in res.iterrows():
            ori.append({"anio": anio, "lengua": r["lengua"], "lengua_nombre": nombre[r["lengua"]], "tipo": "residencia5",
                        "ent": r["ent"], "ent_nombre": ent_nombre.get(r["ent"], ""), "mun": r["mun"], "num": r["num"], "casos": int(r["casos"])})
        fuera_cdmx = nac[nac["ent"] != "009"]["num"].sum() / nac["num"].sum() * 100
        anotar_calculado("lenguas", f"hli_nacidos_fuera_{anio}", fuera_cdmx, "% de hablantes de la CDMX nacidos fuera de la ciudad")

    pd.DataFrame(alc).to_csv(SALIDA_ALC, index=False, encoding="utf-8")
    pd.DataFrame(ori).to_csv(SALIDA_ORI, index=False, encoding="utf-8")
    print(f"[ok] lenguas_alcaldia.csv: {len(alc):,} filas; lenguas_origen.csv: {len(ori):,} filas", file=sys.stderr)


if __name__ == "__main__":
    main()

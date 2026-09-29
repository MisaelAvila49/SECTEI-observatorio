"""
lenguas_nacional_2020.py: hablantes de cada lengua indígena en el país y por
entidad, Censo 2020 (cuestionario ampliado), con error de diseño.

Es la tabla del capítulo 1 del libro (las lenguas de México): cuántas
personas hablan cada agrupación lingüística del INALI, en el país y en cada
entidad, con sexo. La clave de lengua es QDIALECT_INALI (clasificador del
Censo 2020, catálogo en src/data/catalogo_lenguas.csv).

Cotejo: la suma de todas las lenguas es el total de hablantes de la muestra
(7 522 496, que sobreestima 2.1 % al conteo del ITER, como se documenta en
nacional_2020.py); las seis lenguas mayores se comparan con el tabulado de
lengua indígena del Censo 2020 en verificaciones.csv.

Salida: src/data/lenguas_nacional_2020.csv con
  anio, nivel (nacional|entidad), cve, lengua, lengua_nombre, familia, sexo,
  num, den, casos, ee
"""
import os
import sys

import duckdb
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from comun import ENTIDADES, agregar, anotar_calculado  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PERSONAS = os.environ.get("CENSO2020_PERSONAS", r"D:\IMPORTANTE\SocialDataIbero\AnalisisSueltos\JCF\data\raw\censo2020\Personas00.CSV")
CATALOGO = os.path.join(RAIZ, "src", "data", "catalogo_lenguas.csv")
SALIDA = os.path.join(RAIZ, "src", "data", "lenguas_nacional_2020.csv")


def main():
    cat = pd.read_csv(CATALOGO, dtype=str).fillna("")
    nombre = dict(zip(cat["clave"], cat["nombre"]))
    familia = dict(zip(cat["clave"], cat["familia"]))
    con = duckdb.connect()
    con.execute("PRAGMA disable_progress_bar")
    con.execute(f"""
      CREATE TABLE m AS
      SELECT lpad(ENT, 2, '0') AS ent,
        CASE SEXO WHEN '1' THEN 'Hombres' WHEN '3' THEN 'Mujeres' END AS sexo,
        lpad(QDIALECT_INALI, 4, '0') AS lengua,
        HLENGUA = '1' AS hli, TRY_CAST(EDAD AS INTEGER) >= 3 AS u,
        CAST(FACTOR AS DOUBLE) AS w, UPM AS upm, ESTRATO AS est
      FROM read_csv('{PERSONAS}', all_varchar=true, header=true)
      WHERE SEXO IN ('1', '3') AND TRY_CAST(EDAD AS INTEGER) BETWEEN 3 AND 130""")
    lenguas = [r[0] for r in con.execute("SELECT DISTINCT lengua FROM m WHERE hli AND lengua IS NOT NULL AND lengua <> '0000' ORDER BY 1").fetchall()]
    fuera = sorted(set(lenguas) - set(nombre))
    if fuera:
        raise SystemExit(f"Claves de lengua fuera del catálogo: {fuera}")
    print(f"[ok] {len(lenguas)} claves de lengua en la muestra nacional", file=sys.stderr)
    sel = ",\n  ".join(f"(hli AND lengua = '{k}') AS y_l{k}, u AS u_l{k}" for k in lenguas)
    con.execute(f"CREATE TABLE base AS SELECT ent, sexo, w, upm, est, {sel} FROM m")
    ind = [{"clave": f"l{k}", "tema": "lenguas", "indicador": k, "universo": "Población de 3 años y más"} for k in lenguas]
    partes = []
    for nivel, cve in (("nacional", "'00'"), ("entidad", "ent")):
        for sexo in ("sexo", "'Total'"):
            con.execute(f"CREATE OR REPLACE VIEW v AS SELECT '{nivel}' AS nivel, {cve} AS cve, {sexo} AS sexo, * EXCLUDE (ent, sexo) FROM base")
            partes.append(agregar(con, "v", ["nivel", "cve", "sexo"], ind))
    out = pd.concat(partes, ignore_index=True)
    out = out[out["num"] > 0].rename(columns={"indicador": "lengua"})
    out["anio"] = 2020
    out["lengua_nombre"] = out["lengua"].map(nombre)
    out["familia"] = out["lengua"].map(familia)
    ent_nombre = {f"{k:02d}": v for k, v in ENTIDADES.items()}
    out["nombre"] = out.apply(lambda r: "Estados Unidos Mexicanos" if r["nivel"] == "nacional" else ent_nombre.get(r["cve"], r["cve"]), axis=1)
    out = out[["anio", "nivel", "cve", "nombre", "lengua", "lengua_nombre", "familia", "sexo", "num", "den", "casos", "ee"]].sort_values(["nivel", "cve", "sexo", "num"], ascending=[True, True, True, False])
    out["num"] = out["num"].round(1); out["den"] = out["den"].round(1); out["ee"] = out["ee"].astype(float).round(6)
    tot = out[(out.nivel == "nacional") & (out.sexo == "Total")]
    suma = tot["num"].sum()
    print(f"[ok] suma nacional de lenguas {suma:,.0f}; mayores: " + ", ".join(f"{r.lengua_nombre} {r.num:,.0f}" for r in tot.head(6).itertuples()), file=sys.stderr)
    for r in tot.head(6).itertuples():
        anotar_calculado("lenguas", f"nacional_{r.lengua}_2020", r.num, f"hablantes de {r.lengua_nombre} en el país, muestra del Censo 2020")
    anotar_calculado("lenguas", "n_lenguas_nacional_2020", len(lenguas), "agrupaciones lingüísticas con hablantes en la muestra nacional 2020")
    out.to_csv(SALIDA, index=False, encoding="utf-8", lineterminator="\n")
    print(f"[ok] {os.path.relpath(SALIDA, RAIZ)}: {len(out):,} filas", file=sys.stderr)


if __name__ == "__main__":
    main()

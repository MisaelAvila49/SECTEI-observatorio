"""
serie_nacional.py: serie nacional de población indígena 1990 - 2025, con los
hablantes de lengua indígena en un solo universo, 5 años y más.

Entrada: scripts/loaders/serie_nacional_oficial.csv, las cifras oficiales
transcritas de los tabulados del INEGI (una fila por edición y población, con
su tabla y su URL). El universo de la pregunta de lengua fue de 5 años y más
hasta 2005 y de 3 años y más desde 2010. El INEGI publica los 5 años y más en
1990 - 2010 y, por resta de grupos quinquenales, en 2020; las Encuestas
Intercensales de 2015 y 2025 no tienen tabulado con ese corte (sus grupos de
edad empiezan en 3 - 17 y 3 - 11 años). Esas dos ediciones se calculan aquí
con los microdatos, con el factor de expansión y el error de diseño
(linearización de Taylor, UPM dentro de estrato):

  2015  Encuesta Intercensal 2015, TR_PERSONA de las 32 entidades
        (data-raw/eic2015/TR_PERSONA??.CSV)
  2025  Encuesta Intercensal 2025, personas00.csv (nacional)

Numerador: HLENGUA = 1. Denominador: todas las personas de 5 años y más,
incluido el no especificado de lengua, como en los tabulados.

Cotejo del método: con el mismo cálculo a partir de 3 años, los microdatos
deben reproducir las cifras publicadas (2015: 7 382 785 de 113 294 340;
2025: 7 421 285 de 126 122 746).

Salida: src/data/serie_nacional.csv con las columnas de la entrada más
cota (censo|muestra) y ee (error estándar de la proporción).
"""
import glob
import os
import sys

import duckdb
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from comun import agregar, anotar_calculado  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CRUDO = os.path.join(RAIZ, "data-raw")
ENTRADA = os.path.join(os.path.dirname(__file__), "serie_nacional_oficial.csv")
SALIDA = os.path.join(RAIZ, "src", "data", "serie_nacional.csv")
OFICIAL_3 = {2015: (7_382_785, 113_294_340), 2025: (7_421_285, 126_122_746)}
FUENTE = {
    2015: ("Microdatos de la Encuesta Intercensal 2015, 32 entidades (cálculo propio)", "https://www.inegi.org.mx/programas/intercensal/2015/#microdatos"),
    2025: ("Microdatos de la Encuesta Intercensal 2025 (cálculo propio)", "https://www.inegi.org.mx/programas/eic/2025/#microdatos"),
}


def cargar(con, anio):
    if anio == 2015:
        archivos = sorted(glob.glob(os.path.join(CRUDO, "eic2015", "TR_PERSONA[0-3][0-9].CSV")))
        if len(archivos) != 32:
            raise SystemExit(f"EIC 2015: se esperaban 32 archivos TR_PERSONA y hay {len(archivos)}.")
        lista = ", ".join(f"'{a}'" for a in archivos)
        con.execute(f"""
        CREATE OR REPLACE TABLE m AS
        SELECT ENT || '-' || ESTRATO AS est, ENT || '-' || UPM AS upm, CAST(FACTOR AS DOUBLE) AS w,
          TRY_CAST(EDAD AS INTEGER) AS edad, HLENGUA = '1' AS hli
        FROM read_csv([{lista}], all_varchar=true, header=true, encoding='latin-1', union_by_name=true,
                      quote='"', escape='"')
        """)
    else:
        p = os.path.join(CRUDO, "eic2025", "personas00.csv")
        if not os.path.exists(p):
            raise SystemExit(f"Falta {p}")
        con.execute(f"""
        CREATE OR REPLACE TABLE m AS
        SELECT CVE_ENT || '-' || ESTRATO AS est, CVE_ENT || '-' || UPM AS upm, CAST(FACTOR AS DOUBLE) AS w,
          TRY_CAST(EDAD AS INTEGER) AS edad, HLENGUA = '1' AS hli
        FROM read_csv('{p}', all_varchar=true, header=true)
        """)
    # La edad no especificada (999 o vacía) queda fuera de los dos universos,
    # como en los tabulados por edad.
    con.execute("""
    CREATE OR REPLACE VIEW v AS SELECT 'Total' AS t, w, upm, est,
      COALESCE(hli, FALSE) AS y_h3, (edad BETWEEN 3 AND 130) AS u_h3,
      COALESCE(hli, FALSE) AS y_h5, (edad BETWEEN 5 AND 130) AS u_h5
    FROM m
    """)
    lista = [{"clave": k, "tema": "serie", "indicador": k, "universo": ""} for k in ("h3", "h5")]
    return agregar(con, "v", ["t"], lista).set_index("indicador")


def main():
    base = pd.read_csv(ENTRADA, dtype={"nota": str})
    base["cota"] = base["anio"].map(lambda a: "muestra" if a in (2015, 2025) else "censo")
    base.loc[base["poblacion"] == "autoads", "cota"] = "muestra"
    base["ee"] = None
    nuevas = []
    anios = [a for a in (2015, 2025) if len(sys.argv) < 2 or str(a) in sys.argv[1:]]
    for anio in anios:
        con = duckdb.connect()
        con.execute("PRAGMA disable_progress_bar")
        d = cargar(con, anio)
        n3, den3 = d.loc["h3", "num"], d.loc["h3", "den"]
        of_n, of_d = OFICIAL_3[anio]
        print(f"[cotejo] {anio} hablantes 3+: {n3:,.0f} de {den3:,.0f} (publicado {of_n:,} de {of_d:,}); "
              f"dif {n3 - of_n:+,.0f} y {den3 - of_d:+,.0f}", file=sys.stderr)
        # Sin comillas explícitas, DuckDB no las detecta en algunos archivos y
        # los nombres con coma corren las columnas: el numerador casi cuadraba
        # y el denominador salía en 661 millones. Por eso se cotejan los dos.
        if abs(n3 - of_n) / of_n > 0.001 or abs(den3 - of_d) / of_d > 0.001:
            raise SystemExit(f"{anio}: los microdatos no reproducen los hablantes de 3 años y más publicados.")
        anotar_calculado("nacional", f"hablantes3_nacional_{anio}_micro", float(n3), f"hablantes 3+ del país con microdatos de la EIC {anio}")
        r = d.loc["h5"]
        anotar_calculado("nacional", f"hablantes5_nacional_{anio}", float(r["num"]), f"hablantes 5+ del país, microdatos EIC {anio}")
        tabla, url = FUENTE[anio]
        nuevas.append({"anio": anio, "poblacion": "hablantes5", "num": round(r["num"]), "den": round(r["den"]), "universo": "pob 5+",
                       "tabla": tabla, "url": url, "nota": f"Cálculo propio con microdatos; el mismo cálculo desde 3 años reproduce la cifra publicada ({of_n:,})".replace(",", " "),
                       "pct": round(100 * r["num"] / r["den"], 4), "cota": "muestra", "ee": round(float(r["ee"]), 6)})
        print(f"[ok] {anio} hablantes 5+: {r['num']:,.0f} de {r['den']:,.0f} = {100 * r['num'] / r['den']:.3f} % (± {196 * r['ee']:.3f})", file=sys.stderr)
    previa = pd.read_csv(SALIDA) if os.path.exists(SALIDA) and len(anios) < 2 else None
    fuera = base[~((base["poblacion"] == "hablantes5") & base["anio"].isin([2015, 2025]))]
    out = pd.concat([fuera, pd.DataFrame(nuevas)], ignore_index=True)
    if previa is not None:  # corrida parcial: conserva el año que no se recalculó
        resto = previa[(previa["poblacion"] == "hablantes5") & previa["anio"].isin([2015, 2025]) & ~previa["anio"].isin(anios)]
        out = pd.concat([out, resto], ignore_index=True)
    out = out.sort_values(["poblacion", "anio"])
    out.to_csv(SALIDA, index=False, encoding="utf-8", lineterminator="\n")
    print(f"[ok] {os.path.relpath(SALIDA, RAIZ)}: {len(out)} filas", file=sys.stderr)


if __name__ == "__main__":
    main()

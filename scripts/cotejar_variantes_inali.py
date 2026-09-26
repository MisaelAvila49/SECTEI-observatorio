"""
Cotejo de los pesos por variante (Censo 2020 ampliado, por municipio) contra
la estimación oficial del INALI por variante (Censo 2000, por localidad):
cuadro 1 de "Estadística básica de la población hablante de lenguas
indígenas nacionales 2000" (data-raw/inali/inali_variantes_2000.xls).

No se espera igualdad (veinte años y otra unidad geográfica): se comprueba
que el ORDEN de las variantes grandes coincida. Se anota, por lengua, si la
variante mayor es la misma y cuántas de las cinco mayores del INALI están
entre las cinco mayores aquí.
"""
import os
import re
import sys
import unicodedata

import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "loaders"))
from comun import anotar_calculado  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
XLS = os.path.join(RAIZ, "data-raw", "inali", "inali_variantes_2000.xls")
PESOS = os.path.join(RAIZ, "src", "data", "variantes_pesos.csv")
SALIDA = os.path.join(RAIZ, "src", "data", "variantes_inali2000.csv")


def normal(s):
    s = unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\d+$", "", s)  # notas al pie pegadas al nombre ("Akateko2")
    return re.sub(r"[^a-z' ]", " ", s).strip()


def main():
    d = pd.read_excel(XLS, sheet_name="Sexo", header=None)
    d = d.iloc[7:, [0, 1, 2, 3, 4]].copy()
    d.columns = ["clave", "variante", "agrupacion", "familia", "hablantes_2000"]
    d = d[d["variante"].notna() & d["agrupacion"].notna()]
    d["hablantes_2000"] = pd.to_numeric(d["hablantes_2000"], errors="coerce")
    d["nvar"] = d["variante"].map(normal)
    d["nagr"] = d["agrupacion"].map(normal)
    d[["clave", "variante", "agrupacion", "familia", "hablantes_2000"]].to_csv(SALIDA, index=False, encoding="utf-8")
    print(f"[ok] INALI 2000: {len(d)} variantes, {d['hablantes_2000'].sum():,.0f} hablantes en asentamientos históricos", file=sys.stderr)

    p = pd.read_csv(PESOS, dtype={"lengua": str})
    p["nvar"] = p["variante"].map(normal)
    p["nagr"] = p["agrupacion"].map(normal)
    aqui = p.groupby(["nagr", "nvar"])["peso"].sum()

    iguales, comparadas, top5 = 0, 0, []
    for agr, g in d.groupby("nagr"):
        g = g.dropna(subset=["hablantes_2000"]).sort_values("hablantes_2000", ascending=False)
        if len(g) < 2 or agr not in aqui.index.get_level_values(0):
            continue
        mio = aqui.loc[agr].sort_values(ascending=False)
        comparadas += 1
        if normal(g["nvar"].iloc[0]) == mio.index[0]:
            iguales += 1
        inali5 = set(g["nvar"].head(5))
        mio5 = set(mio.head(5).index)
        top5.append(len(inali5 & mio5) / min(5, len(inali5)))
        if agr in ("nahuatl", "mixteco", "zapoteco", "otomi", "mazateco"):
            print(f"     {agr}: INALI 2000 {list(g['nvar'].head(3))} | aquí {list(mio.head(3).index)}", file=sys.stderr)
    print(f"[ok] {iguales} de {comparadas} lenguas con varias variantes tienen la misma variante mayor; coincidencia media en las cinco mayores: {100 * sum(top5) / len(top5):.0f} %", file=sys.stderr)
    anotar_calculado("variantes", "inali2000_misma_variante_mayor", 100 * iguales / comparadas, "% de lenguas con varias variantes cuya variante mayor coincide con la del INALI 2000")
    anotar_calculado("variantes", "inali2000_top5", 100 * sum(top5) / len(top5), "% medio de coincidencia entre las cinco variantes mayores del INALI 2000 y las de aquí")


if __name__ == "__main__":
    main()

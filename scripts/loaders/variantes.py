"""
Variante probable de los hablantes de cada lengua que viven en la Ciudad de
México, por edición, con tres niveles de certeza.

Entrada: src/data/lenguas_origen.csv (hablantes por lengua y entidad de
nacimiento, y por municipio de residencia cinco años antes),
src/data/clin_municipios.csv (variante -> municipio, del Catálogo INALI) y
src/data/variantes_pesos.csv (hablantes de la lengua en los municipios de
cada variante, por entidad, del Censo 2020).

Asignación, en este orden:
  exacta     se conoce el municipio donde vivía cinco años antes y el
             Catálogo ubica ahí UNA variante de su lengua (método del INALI
             aplicado al municipio de origen). Supuesto: quien llegó de un
             municipio en los últimos cinco años habla la variante de ese
             municipio.
  unica      solo se conoce la entidad de nacimiento y en ella hay una sola
             variante de la lengua
  estimada   la entidad (o el municipio) tiene varias variantes: sus
             hablantes se reparten con los pesos de variantes_pesos.csv
             (hablantes de la lengua en los municipios de cada variante)
  sin        nacidos en la ciudad, en otro país o sin entidad especificada,
             o entidad sin registro de esa lengua en el Catálogo

Para no contar dos veces, lo asignado por municipio (exacta o estimada por
municipio) se descuenta de los hablantes nacidos en esa entidad antes de
repartir el resto. Guardia: por lengua y edición la suma de todas las filas
es igual al total de hablantes con entidad de nacimiento.

Salida: src/data/variantes_ciudad.csv con
  anio, lengua, lengua_nombre, variante, cve_ent, certeza, num
"""
import os
import sys
from collections import defaultdict

import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from comun import anotar_calculado  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
D = os.path.join(RAIZ, "src", "data")
SALIDA = os.path.join(D, "variantes_ciudad.csv")


def main():
    origen = pd.read_csv(os.path.join(D, "lenguas_origen.csv"), dtype={"lengua": str, "ent": str, "mun": str}).fillna({"mun": ""})
    muni = pd.read_csv(os.path.join(D, "clin_municipios.csv"), dtype=str)
    pesos = pd.read_csv(os.path.join(D, "variantes_pesos.csv"), dtype={"lengua": str, "cve_ent": str})
    nombre = dict(zip(origen["lengua"], origen["lengua_nombre"]))

    # variantes por (lengua, ent, mun) y pesos por (lengua, ent) -> {variante: peso}
    por_mun = defaultdict(list)
    for _, r in muni.iterrows():
        por_mun[(r["lengua"], r["cve_ent"], r["cve_mun"])].append(r["variante"])
    por_ent = defaultdict(dict)
    for _, r in pesos.iterrows():
        por_ent[(r["lengua"], r["cve_ent"])][r["variante"]] = float(r["peso"])

    def repartir(lengua, ent, cantidad, candidatas):
        """Reparte `cantidad` entre las variantes candidatas con los pesos de la entidad."""
        p = por_ent.get((lengua, ent), {})
        w = {v: p.get(v, 0.0) for v in candidatas}
        tot = sum(w.values())
        if tot <= 0:
            w = {v: 1.0 for v in candidatas}
            tot = float(len(candidatas))
        return {v: cantidad * x / tot for v, x in w.items()}

    filas = []
    for (anio, lengua), g in origen.groupby(["anio", "lengua"]):
        nac = g[g["tipo"] == "nacimiento"].groupby("ent")["num"].sum().to_dict()
        res = g[(g["tipo"] == "residencia5") & (g["mun"] != "")]
        asignado_ent = defaultdict(float)
        acum = defaultdict(float)  # (variante, ent, certeza) -> num

        # 1. Por municipio de residencia cinco años antes.
        for _, r in res.iterrows():
            ent, mun, n = r["ent"], str(r["mun"]).zfill(3), float(r["num"])
            cands = por_mun.get((lengua, ent, mun), [])
            if not cands:
                continue
            tope = max(0.0, nac.get(ent, 0.0) - asignado_ent[ent])
            n = min(n, tope)  # nunca más que los nacidos en esa entidad
            if n <= 0:
                continue
            if len(cands) == 1:
                acum[(cands[0], ent, "exacta")] += n
            else:
                for v, x in repartir(lengua, ent, n, cands).items():
                    acum[(v, ent, "estimada")] += x
            asignado_ent[ent] += n

        # 2. El resto, por entidad de nacimiento.
        for ent, n in nac.items():
            resto = n - asignado_ent[ent]
            if resto <= 0:
                continue
            if ent == "009" or not ("001" <= ent <= "032"):
                acum[("", ent, "sin")] += resto
                continue
            cands = list(por_ent.get((lengua, ent), {}).keys())
            if not cands:
                acum[("", ent, "sin")] += resto
            elif len(cands) == 1:
                acum[(cands[0], ent, "unica")] += resto
            else:
                for v, x in repartir(lengua, ent, resto, cands).items():
                    acum[(v, ent, "estimada")] += x

        total = sum(nac.values())
        suma = sum(acum.values())
        if abs(total - suma) > 0.5:
            raise SystemExit(f"Variantes {anio} {lengua}: la asignación suma {suma:,.0f} y los hablantes con origen son {total:,.0f}.")
        for (v, ent, certeza), n in acum.items():
            filas.append({"anio": anio, "lengua": lengua, "lengua_nombre": nombre[lengua], "variante": v, "cve_ent": ent, "certeza": certeza, "num": round(n, 1)})

    out = pd.DataFrame(filas).sort_values(["anio", "lengua", "certeza", "num"], ascending=[True, True, True, False])
    out.to_csv(SALIDA, index=False, encoding="utf-8")
    ult = out[out["anio"] == out["anio"].max()]
    resumen = ult.groupby("certeza")["num"].sum()
    print(f"[ok] variantes_ciudad.csv: {len(out):,} filas; {out['anio'].max()}: " + ", ".join(f"{k} {v:,.0f}" for k, v in resumen.items()), file=sys.stderr)
    nah = ult[(ult["lengua"] == "0211") & (ult["variante"] != "")].groupby("variante")["num"].sum().sort_values(ascending=False)
    print("     náhuatl en la ciudad, variantes mayores:", nah.head(5).round(0).to_dict(), file=sys.stderr)
    for k, v in resumen.items():
        anotar_calculado("variantes", f"ciudad_{k}_{out['anio'].max()}", v, f"hablantes de la ciudad con variante {k}, edición {out['anio'].max()}")


if __name__ == "__main__":
    main()

"""
inpi_2020.py: población indígena según el INPI, 2020, por país, entidad y
municipio, con la tipología municipal de presencia indígena.

Fuente: INPI, Indicadores socioeconómicos de los pueblos indígenas y
afromexicano 2020 (https://www.inpi.gob.mx/indicadores2020/), archivos 3
(entidad) y 4 (municipio), construidos por el INPI sobre el ITER del Censo
2020 "con población indígena en hogares según la metodología del INPI".

Definición del INPI (texto de la página): población indígena en hogares =
todas las personas de un hogar donde la jefa o el jefe, su cónyuge o alguno
de sus ascendientes (madre o padre, madrastra o padrastro, abuelo(a),
bisabuelo(a), tatarabuelo(a), suegro(a), consuegro(a)) declaró hablar lengua
indígena, MÁS los hablantes de lengua indígena que no forman parte de esos
hogares. Universo: población total (todas las edades). No usa la
autoadscripción. Nacional 2020: 11 979 483 (9.5 % de 126 014 024).

Tipología municipal (columna TIPOMUN_PHOG_IND, texto del catálogo del INPI):
  "Mun. 40% y más de PI."
  "Mun. menos de 40% de PI y más de 5,000 indígenas, más Mun. con
   agrupaciones lingüísticas de menos de 5,000 HLI."
  "Mun. menos de 40% de PI y menos de 5,000 indígenas."
  "Mun. sin PI."
El corte de 40 % se aplica sobre un valor redondeado (Santa Catarina Juquila,
39.93 %, está en "40% y más"): se usa la columna publicada, nunca se
recalcula. En los 36 municipios "sin PI" la cifra viene vacía y aquí se
escribe 0, porque el catálogo la define como "sin población indígena en
hogares", no como suprimida.

Cotejo: la suma de los municipios de cada entidad reproduce la fila de
entidad del archivo 3 (guardia), y la autoadscripción por municipio que
publica el INPI (archivo 2, muestra censal con intervalo de 90 %) se compara
con la estimación propia de hablantes_nacional_2020.csv: se anota qué
proporción de municipios cae dentro del intervalo del INPI.

Salida: src/data/inpi_2020.csv con
  anio, nivel (nacional|entidad|municipio), cve, nombre, num, den, pct, tipo
"""
import glob
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from comun import anotar_calculado  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CRUDO = os.path.join(RAIZ, "data-raw", "inpi")
SALIDA = os.path.join(RAIZ, "src", "data", "inpi_2020.csv")
NACIONAL = os.path.join(RAIZ, "src", "data", "hablantes_nacional_2020.csv")
OFICIAL = {"pobtotal": 126_014_024, "pi": 11_979_483}
TIPOS = {
    "Mun. 40% y más de PI.": "40 % y más de población indígena",
    "Mun. menos de 40% de PI y más de 5,000 indígenas, más Mun. con agrupaciones lingüísticas de menos de 5,000 HLI.": "Menos de 40 % y más de 5,000 indígenas (o pueblos con pocos hablantes)",
    "Mun. menos de 40% de PI y menos de 5,000 indígenas.": "Menos de 40 % y menos de 5,000 indígenas",
    "Mun. sin PI.": "Sin población indígena",
}


def archivo(prefijo):
    rutas = glob.glob(os.path.join(CRUDO, f"{prefijo}-*.xlsx"))
    if not rutas:
        raise SystemExit(f"Falta el archivo {prefijo} del INPI en {CRUDO}; corre scripts/descargar_datos.sh")
    return rutas[0]


def main():
    ent = pd.read_excel(archivo("3"), sheet_name="Entidad", header=2, dtype={"ENT": str})
    ent = ent[ent["ENT"].notna()].copy()
    ent["ENT"] = ent["ENT"].astype(str).str.replace(".0", "", regex=False).str.zfill(2)
    ent = ent[ent["ENT"].str.match(r"^\d{2}$")]
    mun = pd.read_excel(archivo("4"), sheet_name="Municipio", header=2)
    mun = mun[mun["IDMUN"].notna() & mun["POBTOTAL"].notna()].copy()
    mun["cve"] = mun["IDMUN"].astype(int).astype(str).str.zfill(5)
    mun["tipo_inpi"] = mun["TIPOMUN_PHOG_IND"].astype(str).str.strip()
    fuera = sorted(set(mun["tipo_inpi"]) - set(TIPOS))
    if fuera:
        raise SystemExit(f"Tipología municipal del INPI fuera del catálogo: {fuera}")
    sin_pi = mun["PHOG_IND"].isna()
    if not (mun.loc[sin_pi, "tipo_inpi"] == "Mun. sin PI.").all():
        raise SystemExit("Hay municipios con población indígena vacía que no son 'sin PI'.")
    mun["PHOG_IND"] = mun["PHOG_IND"].fillna(0)
    if len(mun) != 2469:
        raise SystemExit(f"Se esperaban 2 469 municipios y hay {len(mun):,}.")

    # Guardia: la suma municipal reproduce la fila nacional y las de entidad.
    tot = ent[ent["ENT"] == "00"].iloc[0]
    if int(tot["POBTOTAL"]) != OFICIAL["pobtotal"] or int(tot["PIHOGARES"]) != OFICIAL["pi"]:
        raise SystemExit("La fila nacional del INPI no coincide con la cifra publicada en su página.")
    if int(mun["PHOG_IND"].sum()) != OFICIAL["pi"]:
        raise SystemExit(f"La suma municipal de población indígena da {int(mun['PHOG_IND'].sum()):,} y el nacional es {OFICIAL['pi']:,}.")
    por_ent = mun.groupby(mun["cve"].str[:2])["PHOG_IND"].sum()
    for _, r in ent[ent["ENT"] != "00"].iterrows():
        if int(por_ent.get(r["ENT"], 0)) != int(r["PIHOGARES"]):
            raise SystemExit(f"Entidad {r['ENT']}: municipios suman {int(por_ent.get(r['ENT'], 0)):,} y la fila de entidad dice {int(r['PIHOGARES']):,}.")
    print(f"[ok] INPI 2020: {len(mun):,} municipios, {len(ent) - 1} entidades; población indígena {OFICIAL['pi']:,} ({100 * OFICIAL['pi'] / OFICIAL['pobtotal']:.2f} %)", file=sys.stderr)
    print("     tipología:", mun["tipo_inpi"].map(TIPOS).value_counts().to_dict(), file=sys.stderr)

    filas = []
    for _, r in ent.iterrows():
        nivel = "nacional" if r["ENT"] == "00" else "entidad"
        filas.append({"anio": 2020, "nivel": nivel, "cve": r["ENT"], "nombre": r["ENTIDAD"], "num": int(r["PIHOGARES"]), "den": int(r["POBTOTAL"]), "pct": round(100 * r["PIHOGARES"] / r["POBTOTAL"], 4), "tipo": ""})
    for _, r in mun.iterrows():
        filas.append({"anio": 2020, "nivel": "municipio", "cve": r["cve"], "nombre": r["MUNICIPIO"], "num": int(r["PHOG_IND"]), "den": int(r["POBTOTAL"]), "pct": round(100 * r["PHOG_IND"] / r["POBTOTAL"], 4) if r["POBTOTAL"] else None, "tipo": TIPOS[r["tipo_inpi"]]})
    out = pd.DataFrame(filas)
    out.to_csv(SALIDA, index=False, encoding="utf-8", lineterminator="\n")
    anotar_calculado("inpi", "pct_pi_nacional_2020", 100 * OFICIAL["pi"] / OFICIAL["pobtotal"], "% de población indígena según el INPI en el país, 2020")
    cdmx = out[(out.nivel == "entidad") & (out.cve == "09")].iloc[0]
    anotar_calculado("inpi", "pct_pi_cdmx_2020", cdmx["pct"], "% de población indígena según el INPI en la CDMX, 2020")
    anotar_calculado("inpi", "municipios_40_2020", int((mun["tipo_inpi"] == "Mun. 40% y más de PI.").sum()), "municipios con 40 % y más de población indígena, tipología INPI 2020")

    # Cotejo de la autoadscripción por municipio: estimación propia contra la
    # del INPI (misma muestra, mismo universo de 3 años y más).
    auto = pd.read_excel(archivo("2"), sheet_name="Autoadscripción", header=3)
    auto = auto[auto["Tipo"].astype(str).str.strip() == "Porcentaje"]
    est = auto[auto["Estimador"].astype(str).str.strip() == "Estimación"].set_index(auto[auto["Estimador"].astype(str).str.strip() == "Estimación"]["Clave de municipio"].astype(int).astype(str).str.zfill(5))["Se considera indígena"]
    li = auto[auto["Estimador"].astype(str).str.contains("inferior")].set_index(auto[auto["Estimador"].astype(str).str.contains("inferior")]["Clave de municipio"].astype(int).astype(str).str.zfill(5))["Se considera indígena"]
    ls = auto[auto["Estimador"].astype(str).str.contains("superior")].set_index(auto[auto["Estimador"].astype(str).str.contains("superior")]["Clave de municipio"].astype(int).astype(str).str.zfill(5))["Se considera indígena"]
    nac = pd.read_csv(NACIONAL, dtype={"cve": str})
    propia = nac[(nac.nivel == "municipio") & (nac.poblacion == "autoads") & (nac.sexo == "Total") & (nac.edad == "Todas")].set_index("cve")
    propia = propia.assign(pct=propia["num"] / propia["den"])
    comun = propia.index.intersection(est.dropna().index)
    dif = (propia.loc[comun, "pct"] - est.loc[comun].astype(float)).abs()
    dentro = ((propia.loc[comun, "pct"] >= li.loc[comun].astype(float)) & (propia.loc[comun, "pct"] <= ls.loc[comun].astype(float))).mean()
    print(f"[ok] autoadscripción por municipio: {len(comun):,} municipios comparables; mediana de la diferencia {100 * dif.median():.3f} puntos; máxima {100 * dif.max():.2f}; {100 * dentro:.1f} % dentro del intervalo de 90 % del INPI", file=sys.stderr)
    if dif.median() > 0.001:
        raise SystemExit("La autoadscripción municipal propia se aleja de la publicada por el INPI.")
    anotar_calculado("inpi", "autoads_mun_mediana_dif_2020", 100 * dif.median(), "mediana de la diferencia (puntos) entre la autoadscripción municipal propia y la del INPI")
    anotar_calculado("inpi", "autoads_mun_dentro_ic_2020", 100 * dentro, "% de municipios cuya autoadscripción propia cae dentro del intervalo de 90 % del INPI")
    print(f"[ok] {os.path.relpath(SALIDA, RAIZ)}: {len(out):,} filas", file=sys.stderr)


if __name__ == "__main__":
    main()

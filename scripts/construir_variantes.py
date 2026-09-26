"""
Variantes lingüísticas: del Catálogo INALI 2008 a claves de municipio y a
pesos por variante, con el método del INALI.

El INALI estima hablantes por variante cruzando los hablantes del Censo por
localidad con la referencia geoestadística (entidad, municipio, localidad)
de cada variante del Catálogo. Aquí se hace lo mismo a nivel MUNICIPIO con el
cuestionario ampliado del Censo 2020 (hablantes por municipio y lengua), y
el resultado sirve para dos cosas:

  1. src/data/clin_municipios.csv: variante -> (cve_ent, cve_mun). Con el
     municipio donde vivía una persona cinco años antes se le asigna la
     variante que el Catálogo ubica ahí (asignación "exacta").
  2. src/data/variantes_pesos.csv: por lengua, entidad y variante, cuántos
     hablantes de esa lengua viven en los municipios de la variante. Cuando
     de una persona solo se conoce la entidad de nacimiento y ahí hay varias
     variantes, sus hablantes se reparten con estos pesos ("estimada").

Un municipio compartido por varias variantes de la misma lengua se reparte
en partes iguales entre ellas y queda marcado, igual que el asterisco de
sobreestimación del INALI.

Insumos (data-raw/, gitignored): ITER nacional 2020 (nombres y claves de
municipio) y Personas00.CSV del Censo 2020 ampliado (nacional).
"""
import os
import re
import sys
import unicodedata

import duckdb
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "loaders"))
from comun import anotar_calculado  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CRUDO = os.path.join(RAIZ, "data-raw")
ITER = os.path.join(CRUDO, "iter", "iter2020nal", "iter_00_cpv2020", "conjunto_de_datos", "conjunto_de_datos_iter_00CSV20.csv")
PERSONAS = os.environ.get("CENSO2020_PERSONAS", r"D:\IMPORTANTE\SocialDataIbero\AnalisisSueltos\JCF\data\raw\censo2020\Personas00.CSV")
CLIN = os.path.join(RAIZ, "src", "data", "clin_variantes.csv")
CATALOGO = os.path.join(RAIZ, "src", "data", "catalogo_lenguas.csv")
SALIDA_MUN = os.path.join(RAIZ, "src", "data", "clin_municipios.csv")
SALIDA_PESOS = os.path.join(RAIZ, "src", "data", "variantes_pesos.csv")

# Nombres de entidad tal como los escribe el Catálogo -> clave de dos dígitos.
ENTIDAD_CLIN = {
    "AGUASCALIENTES": "01", "BAJA CALIFORNIA": "02", "BAJA CALIFORNIA SUR": "03", "CAMPECHE": "04",
    "COAHUILA DE ZARAGOZA": "05", "COLIMA": "06", "CHIAPAS": "07", "CHIHUAHUA": "08", "DISTRITO FEDERAL": "09",
    "DURANGO": "10", "GUANAJUATO": "11", "GUERRERO": "12", "HIDALGO": "13", "JALISCO": "14", "ESTADO DE MEXICO": "15",
    "MICHOACAN DE OCAMPO": "16", "MORELOS": "17", "NAYARIT": "18", "NUEVO LEON": "19", "OAXACA": "20", "PUEBLA": "21",
    "QUERETARO ARTEAGA": "22", "QUINTANA ROO": "23", "SAN LUIS POTOSI": "24", "SINALOA": "25", "SONORA": "26",
    "TABASCO": "27", "TAMAULIPAS": "28", "TLAXCALA": "29", "VERACRUZ DE IGNACIO DE LA LLAVE": "30", "YUCATAN": "31",
    "ZACATECAS": "32",
}
# Municipios que cambiaron de nombre entre el Catálogo (2008) y el marco 2020.
RENOMBRADOS = {
    ("21", "chalchicomula de sesma"): "chalchicomula de sesma", ("20", "villa de tututepec de melchor ocampo"): "villa de tututepec",
    ("30", "tantoyuca"): "tantoyuca", ("30", "jose azueta"): "jose azueta", ("07", "san juan cancuc"): "san juan cancuc",
}


def normal(s):
    s = unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9 ]", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()


def main():
    cat = pd.read_csv(CATALOGO, dtype=str).fillna("")
    clave_de = {normal(r["clin"]): r["clave"] for _, r in cat.iterrows() if r["clin"]}

    # --- municipios del marco 2020 ------------------------------------------
    it = pd.read_csv(ITER, dtype=str, usecols=["ENTIDAD", "MUN", "LOC", "NOM_ENT", "NOM_MUN", "P3YM_HLI"], low_memory=False)
    it = it[(it["LOC"].str.zfill(4) == "0000") & (it["MUN"].str.zfill(3) != "000")].copy()
    it["ENTIDAD"] = it["ENTIDAD"].str.zfill(2)
    it["MUN"] = it["MUN"].str.zfill(3)
    it["nmun"] = it["NOM_MUN"].map(normal)
    por_ent = {e: dict(zip(g["nmun"], g["MUN"])) for e, g in it.groupby("ENTIDAD")}

    def clave_mun(cve_ent, nombre):
        n = normal(nombre)
        n = RENOMBRADOS.get((cve_ent, n), n)
        d = por_ent[cve_ent]
        if n in d:
            return d[n]
        # Sin el sufijo "de ..." o con él, y por inicio de cadena: el Catálogo
        # abrevia ("Tantoyuca" por "Tantoyuca") o alarga algunos nombres.
        cands = [k for k in d if k.startswith(n + " ") or n.startswith(k + " ")]
        if len(cands) == 1:
            return d[cands[0]]
        return None

    # --- variante -> municipios ---------------------------------------------
    clin = pd.read_csv(CLIN, dtype=str).fillna("")
    filas, sin_clave, sin_lengua = [], [], set()
    for _, r in clin.iterrows():
        lengua = clave_de.get(normal(r["agrupacion"]))
        if not lengua:
            sin_lengua.add(r["agrupacion"])
            continue
        for par in str(r["municipios"]).split("|"):
            if ":" not in par:
                continue
            ent, mun = (x.strip() for x in par.split(":", 1))
            cve_ent = ENTIDAD_CLIN.get(normal(ent).upper())
            if not cve_ent:
                sin_clave.append((r["variante"], ent, mun, "entidad"))
                continue
            cve_mun = clave_mun(cve_ent, mun)
            if not cve_mun:
                sin_clave.append((r["variante"], ent, mun, "municipio"))
                continue
            filas.append({"lengua": lengua, "agrupacion": r["agrupacion"], "variante": r["variante"], "cve_ent": cve_ent.zfill(3), "cve_mun": cve_mun, "nom_mun": mun})
    mun = pd.DataFrame(filas).drop_duplicates()
    if sin_lengua:
        raise SystemExit(f"Agrupaciones del Catálogo sin clave INALI en catalogo_lenguas.csv: {sorted(sin_lengua)}")
    print(f"[ok] {len(mun):,} pares variante-municipio con clave; {len(sin_clave)} referencias sin clave", file=sys.stderr)
    for x in sin_clave[:40]:
        print("     sin clave:", x, file=sys.stderr)
    anotar_calculado("variantes", "referencias_sin_clave", len(sin_clave), "referencias entidad:municipio del Catálogo que no casaron con el marco 2020")
    # Municipios compartidos por varias variantes de la misma lengua.
    n_var = mun.groupby(["lengua", "cve_ent", "cve_mun"])["variante"].transform("nunique")
    mun["compartido"] = (n_var > 1).astype(int)
    mun["parte"] = 1.0 / n_var
    mun.to_csv(SALIDA_MUN, index=False, encoding="utf-8")

    # --- hablantes por municipio y lengua, Censo 2020 ampliado --------------
    con = duckdb.connect()
    con.execute("PRAGMA disable_progress_bar")
    p = PERSONAS.replace("\\", "/")
    h = con.execute(f"""
      SELECT lpad(ENT, 3, '0') AS cve_ent, lpad(MUN, 3, '0') AS cve_mun, lpad(QDIALECT_INALI, 4, '0') AS lengua,
             SUM(CAST(FACTOR AS DOUBLE)) AS hablantes
      FROM read_csv('{p}', all_varchar=true, header=true)
      WHERE HLENGUA = '1' GROUP BY 1, 2, 3""").df()
    total = h["hablantes"].sum()
    print(f"[ok] hablantes 3+ del ampliado 2020: {total:,.0f} (oficial del básico: 7 364 645)", file=sys.stderr)
    anotar_calculado("variantes", "hli_ampliado_nacional_2020", total, "hablantes de 3+ ponderados del cuestionario ampliado 2020, nacional")

    # --- pesos por variante y entidad ----------------------------------------
    pesos = mun.merge(h, on=["lengua", "cve_ent", "cve_mun"], how="left")
    pesos["hablantes"] = pesos["hablantes"].fillna(0) * pesos["parte"]
    pe = pesos.groupby(["lengua", "agrupacion", "variante", "cve_ent"], as_index=False).agg(
        peso=("hablantes", "sum"), n_municipios=("cve_mun", "nunique"), compartidos=("compartido", "sum"))
    pe["peso"] = pe["peso"].round(1)
    pe.to_csv(SALIDA_PESOS, index=False, encoding="utf-8")
    sin_peso = pe[pe["peso"] == 0]
    print(f"[ok] {len(pe):,} filas variante-entidad; {len(sin_peso)} sin hablantes en sus municipios", file=sys.stderr)
    nah = pe[pe["lengua"] == "0211"].groupby("variante")["peso"].sum().sort_values(ascending=False)
    print("     náhuatl, variantes con más hablantes en el país:", nah.head(6).round(0).to_dict(), file=sys.stderr)
    anotar_calculado("variantes", "nahuatl_variante_mayor_pct", 100 * nah.iloc[0] / nah.sum(), f"% de hablantes de náhuatl en los municipios de la variante mayor ({nah.index[0]}), ampliado 2020")


if __name__ == "__main__":
    main()

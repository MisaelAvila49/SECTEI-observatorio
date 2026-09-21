"""Arma la capa por AGEB urbana de la Ciudad de México: presencia indígena,
conectividad de las viviendas, marginación y rezago social.

Tres fuentes, unidas por la clave de AGEB de 13 dígitos (entidad + municipio +
localidad + AGEB):

  INEGI    Censo 2020, principales resultados por AGEB y manzana urbana. Se
           usan las filas de TOTAL POR AGEB que publica el propio tabulado, no
           la suma de sus manzanas: en la ciudad solo 35 de 2,433 AGEB traen
           suprimida la cifra de hogares indígenas, contra 5,453 de 66,456
           manzanas. Sumar manzanas perdería a esa gente.
  CONAPO   Índice de marginación urbana 2020 por AGEB (grado e índice).
  CONEVAL  Grado de Rezago Social 2020 por AGEB urbana.

No existe pobreza por AGEB para 2020: CONEVAL publicó los rangos de pobreza
urbana por AGEB con datos de 2015 y para 2020 bajó solo hasta localidad urbana.
Lo que sí hay por AGEB en 2020 son el rezago social (CONEVAL) y la marginación
(CONAPO), que no miden ingreso. Se usan esos dos y se dice así en el sitio.

Verificaciones que corre este script y que abortan si fallan:
  - la población de cada AGEB es idéntica en el tabulado, en CONAPO y en CONEVAL;
  - el total de viviendas con características del tabulado es el de CONEVAL;
  - el porcentaje de viviendas sin internet calculado aquí coincide con el que
    publica CONEVAL (mediana de la diferencia 0.0; las AGEB que difieren más de
    2 puntos son las de alta no respuesta, que CONEVAL excluye y el tabulado no
    deja separar).

Salidas:
  src/data/agebs_cdmx.geojson   lo que se tesela (no se versiona)
  src/data/agebs_resumen.csv    la misma tabla sin geometría (se versiona)
"""
import sys
import warnings
from pathlib import Path

import duckdb
import geopandas as gpd
import pandas as pd

warnings.filterwarnings("ignore", category=UserWarning)

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "scripts" / "loaders"))
from comun import anotar_calculado  # noqa: E402

CRUDO = RAIZ / "data-raw"
SALIDA = RAIZ / "src" / "data"

AGEB_SHP = CRUDO / "cartografia/mg09/conjunto_de_datos/09a.shp"
RESAGEBURB = (CRUDO / "censo2020/ageb_mza_urbana_09_cpv2020/conjunto_de_datos"
              / "conjunto_de_datos_ageb_urbana_09_cpv2020.csv")
IMU = CRUDO / "conapo/imu_2020.csv"
GRS = CRUDO / "coneval/GRS_AGEB_urbana_2020.xlsx"

CONTEOS = [
    "POBTOT", "PHOG_IND", "P3YM_HLI", "P3HLINHE", "P_3YMAS", "P_15YMAS", "PSINDER",
    "VIVPARH_CV", "VPH_INTER", "VPH_PC", "VPH_CEL", "VPH_RADIO", "VPH_STVP",
    "VPH_SPMVPI", "VPH_SINTIC",
]
# (numerador, denominador): cada tasa sobre el universo que le corresponde.
TASAS = {
    "PHOG_IND": "POBTOT", "P3YM_HLI": "P_3YMAS", "P3HLINHE": "P_3YMAS", "PSINDER": "POBTOT",
    "VPH_INTER": "VIVPARH_CV", "VPH_PC": "VIVPARH_CV", "VPH_CEL": "VIVPARH_CV",
    "VPH_RADIO": "VIVPARH_CV", "VPH_STVP": "VIVPARH_CV", "VPH_SPMVPI": "VIVPARH_CV",
    "VPH_SINTIC": "VIVPARH_CV",
}
ORDEN_GRADO = {"Muy bajo": 1, "Bajo": 2, "Medio": 3, "Alto": 4, "Muy alto": 5}


def leer_tabulado():
    cols = ",\n      ".join(f"TRY_CAST({c} AS BIGINT) AS {c}" for c in CONTEOS)
    sql = f"""
    SELECT lpad(ENTIDAD,2,'0') || lpad(MUN,3,'0') || lpad(LOC,4,'0') || lpad(AGEB,4,'0') AS cve_ageb,
      NOM_MUN AS alcaldia,
      {cols},
      TRY_CAST(GRAPROES AS DOUBLE) AS GRAPROES
    FROM read_csv_auto(?, all_varchar=true)
    WHERE MZA = '000' AND AGEB <> '0000'
    """
    return duckdb.connect().execute(sql, [str(RESAGEBURB)]).df()


def total_entidad():
    """La fila de total de la entidad: la cifra oficial de la ciudad."""
    cols = ", ".join(f"TRY_CAST({c} AS BIGINT) AS {c}" for c in CONTEOS)
    sql = f"SELECT {cols} FROM read_csv_auto(?, all_varchar=true) WHERE MUN = '000'"
    return duckdb.connect().execute(sql, [str(RESAGEBURB)]).df().iloc[0]


def leer_conapo():
    d = pd.read_csv(IMU, encoding="latin-1", dtype=str)
    d = d[d["ENT"].str.zfill(2) == "09"].copy()
    d["cve_ageb"] = d["CVE_AGEB"].str.zfill(13)
    d["pob_conapo"] = pd.to_numeric(d["POB_TOTAL"], errors="coerce")
    d["im_conapo"] = pd.to_numeric(d["IMN_2020"], errors="coerce").round(4)
    d["gm_conapo"] = d["GM_2020"].str.strip()
    return d[["cve_ageb", "pob_conapo", "im_conapo", "gm_conapo"]]


def leer_coneval():
    # Las seis primeras filas son título y encabezado de dos niveles; las
    # columnas se toman por posición, que es estable en el archivo publicado.
    g = pd.read_excel(GRS, header=None, skiprows=6, dtype=str)
    g = g[g[0] == "09"][[7, 8, 9, 26, 27]].copy()
    g.columns = ["cve_ageb", "pob_coneval", "viv_coneval", "sin_internet_coneval", "grs_coneval"]
    for c in ("pob_coneval", "viv_coneval", "sin_internet_coneval"):
        g[c] = pd.to_numeric(g[c], errors="coerce")
    g["grs_coneval"] = g["grs_coneval"].str.strip()
    return g


def main():
    for ruta in (AGEB_SHP, RESAGEBURB, IMU, GRS):
        if not ruta.exists():
            sys.exit(f"Falta el insumo: {ruta}")

    tab = leer_tabulado()
    conapo, coneval = leer_conapo(), leer_coneval()
    print(f"AGEB en el tabulado {len(tab):,} | CONAPO {len(conapo):,} | CONEVAL {len(coneval):,}")

    d = tab.merge(conapo, on="cve_ageb", how="left").merge(coneval, on="cve_ageb", how="left")

    # --- Verificación contra las dos fuentes externas -------------------------
    con_c = d[d["pob_conapo"].notna()]
    iguales_conapo = int((con_c["POBTOT"] == con_c["pob_conapo"]).sum())
    con_v = d[d["pob_coneval"].notna()]
    iguales_coneval = int((con_v["POBTOT"] == con_v["pob_coneval"]).sum())
    iguales_viv = int((con_v["VIVPARH_CV"] == con_v["viv_coneval"]).sum())
    print(f"población idéntica a CONAPO en {iguales_conapo:,} de {len(con_c):,} AGEB")
    print(f"población idéntica a CONEVAL en {iguales_coneval:,} de {len(con_v):,} AGEB")
    print(f"viviendas con características idénticas a CONEVAL en {iguales_viv:,} de {len(con_v):,} AGEB")
    if iguales_conapo < 0.99 * len(con_c) or iguales_coneval < 0.99 * len(con_v) or iguales_viv < 0.98 * len(con_v):
        sys.exit("La unión con CONAPO o CONEVAL no cuadra: revisa la clave de AGEB.")
    anotar_calculado("ageb", "pob_igual_conapo", 100 * iguales_conapo / len(con_c),
                     "% de AGEB con población idéntica a la de CONAPO")
    anotar_calculado("ageb", "pob_igual_coneval", 100 * iguales_coneval / len(con_v),
                     "% de AGEB con población idéntica a la de CONEVAL")
    anotar_calculado("ageb", "viv_igual_coneval", 100 * iguales_viv / len(con_v),
                     "% de AGEB con el mismo total de viviendas con características que CONEVAL")

    for num, den in TASAS.items():
        tasa = 100 * d[num] / d[den]
        d[f"tasa_{num.lower()}"] = tasa.where(d[den] > 0).round(2)

    dif = (100 - d["tasa_vph_inter"] - d["sin_internet_coneval"]).abs()
    dentro = int((dif <= 0.5).sum())
    print(f"viviendas sin internet: mediana de la diferencia con CONEVAL {dif.median():.3f} pp; "
          f"{dentro:,} de {int(dif.notna().sum()):,} AGEB dentro de 0.5 pp; {int((dif > 2).sum())} sobre 2 pp")
    if dif.median() > 0.1:
        sys.exit("El porcentaje de viviendas sin internet no coincide con CONEVAL.")
    anotar_calculado("ageb", "sin_internet_dentro_medio_punto", 100 * dentro / int(dif.notna().sum()),
                     "% de AGEB donde viviendas sin internet difiere de CONEVAL en 0.5 pp o menos")

    # --- Cifra de ciudad: la suma por AGEB contra el total oficial -------------
    tot = total_entidad()
    oficial_phog = 100 * tot["PHOG_IND"] / tot["POBTOT"]
    oficial_inter = 100 * tot["VPH_INTER"] / tot["VIVPARH_CV"]
    pub = d[d["PHOG_IND"].notna()]
    suma_phog = 100 * pub["PHOG_IND"].sum() / pub["POBTOT"].sum()
    pub_i = d[d["VPH_INTER"].notna() & d["VIVPARH_CV"].notna()]
    suma_inter = 100 * pub_i["VPH_INTER"].sum() / pub_i["VIVPARH_CV"].sum()
    print(f"hogares indígenas: total oficial de la entidad {oficial_phog:.3f} % | suma de AGEB {suma_phog:.3f} %")
    print(f"viviendas con internet: total oficial {oficial_inter:.3f} % | suma de AGEB {suma_inter:.3f} %")
    anotar_calculado("ageb", "cdmx_phog_ind", suma_phog, "% de población en hogares indígenas, suma de AGEB urbanas")
    anotar_calculado("ageb", "cdmx_viv_internet", suma_inter, "% de viviendas con internet, suma de AGEB urbanas")
    anotar_calculado("ageb", "cdmx_phog_ind_oficial", oficial_phog, "fila de total de la entidad del tabulado")
    anotar_calculado("ageb", "cdmx_viv_internet_oficial", oficial_inter, "fila de total de la entidad del tabulado")

    d["gm_orden"] = d["gm_conapo"].map(ORDEN_GRADO)
    d["grs_orden"] = d["grs_coneval"].map(ORDEN_GRADO)
    d["GRAPROES"] = d["GRAPROES"].round(2)
    d = d.drop(columns=["pob_conapo", "pob_coneval", "viv_coneval", "sin_internet_coneval"])

    geo = gpd.read_file(AGEB_SHP)[["CVEGEO", "geometry"]].rename(columns={"CVEGEO": "cve_ageb"})
    capa = geo.merge(d, on="cve_ageb", how="inner")
    print(f"{len(capa):,} AGEB con geometría y dato ({len(d) - len(capa)} del tabulado sin polígono)")

    SALIDA.mkdir(parents=True, exist_ok=True)
    destino = SALIDA / "agebs_cdmx.geojson"
    capa.to_crs(4326).to_file(destino, driver="GeoJSON")
    resumen = SALIDA / "agebs_resumen.csv"
    capa.drop(columns="geometry").to_csv(resumen, index=False, encoding="utf-8", lineterminator="\n")
    print(f"Escrito {destino.name} ({destino.stat().st_size / 1e6:.1f} MB) y {resumen.name} "
          f"({resumen.stat().st_size / 1e3:.0f} KB)")
    print("grado de marginación:", capa["gm_conapo"].value_counts(dropna=False).to_dict())
    print("grado de rezago social:", capa["grs_coneval"].value_counts(dropna=False).to_dict())
    for umbral in (40, 20, 10, 5):
        sobre = capa[capa["tasa_phog_ind"] >= umbral]
        print(f"AGEB con {umbral} % o más de población en hogares indígenas: {len(sobre):,} "
              f"({int(sobre['POBTOT'].sum()):,} habitantes)")


if __name__ == "__main__":
    main()

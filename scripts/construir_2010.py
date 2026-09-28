"""Capas por AGEB urbana y por manzana de la Ciudad de México para 2010, con la
misma estructura que las de 2020 (construir_agebs.py y construir_manzanas.py),
para que el mapa unificado ofrezca dos ediciones a esos niveles.

Fuentes:
  INEGI  Censo 2010, principales resultados por AGEB y manzana urbana
         (data-raw/resageburb2010/). Filas de total por AGEB para la capa de
         AGEB; filas de manzana para la de manzana. Lo suprimido ('*' y 'N/D')
         queda en NULL, nunca en cero.
  INEGI  Cartografía geoestadística urbana, cierre del Censo 2010, Distrito
         Federal: 16 archivos (uno por delegación) con la AGEB y la manzana de
         cada localidad urbana tal como quedaron al cierre del Censo 2010
         (data-raw/cartografia/cgu2010/). Traen CVEGEO y ninguna proyección
         legible por GDAL: el .prj es la Lambert de INEGI sobre ITRF92, que se
         asigna a mano como EPSG:6362. El Marco Geoestadístico 2010 v5.0
         nacional no publica manzanas, por eso no se usa.
  IECM   Colonias 2022 y padrón de pueblos originarios de la SEPI, para
         etiquetar cada manzana con su colonia dominante y la marca de pueblo
         originario, igual que en 2020 (se reutilizan las funciones de
         construir_manzanas.py).

Guardias:
  - cada AGEB y cada manzana del tabulado encuentra su polígono (2,432 y 63,239);
  - la suma por AGEB de hablantes y de población en hogares indígenas queda
    dentro del 3 % del total oficial de la entidad (lo suprimido explica la
    diferencia), y la cifra se anota en calculado.csv para el cotejo.

No hay cruces para 2010 (CONAPO y CONEVAL por AGEB 2010 no se han cargado y
el tabulado 2010 no publica viviendas con características): el mapa oculta
ese control en esa edición.

Salidas:
  src/data/agebs_2010_cdmx.geojson      se tesela (no se versiona)
  src/data/manzanas_2010_cdmx.geojson   se tesela (no se versiona)
  src/data/agebs_resumen_2010.csv       la tabla de AGEB sin geometría (se versiona)
"""
import glob
import sys
import warnings
from pathlib import Path

import duckdb
import geopandas as gpd
import pandas as pd

warnings.filterwarnings("ignore", category=UserWarning)

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "scripts"))
sys.path.insert(0, str(RAIZ / "scripts" / "loaders"))
from comun import anotar_calculado  # noqa: E402
from construir_manzanas import CRS_METRICO, CRS_SALIDA, leer_colonias, repartir  # noqa: E402

CRUDO = RAIZ / "data-raw"
SALIDA = RAIZ / "src" / "data"
RESAGEBURB = (CRUDO / "resageburb2010/resultados_ageb_urbana_09_cpv2010/conjunto_de_datos"
              / "resultados_ageb_urbana_09_cpv2010.csv")
CARTO = CRUDO / "cartografia" / "cgu2010"
# Lambert cónica conforme de INEGI sobre ITRF92 (la del .prj de estos archivos).
CRS_INEGI_2010 = 6362

# Totales oficiales de la entidad (fila MUN = '000' del propio tabulado).
OFICIAL = {"POBTOT": 8_851_080, "P3YM_HLI": 123_224, "P5_HLI": 122_411, "PHOG_IND": 271_463}

CONTEOS_AGEB = ["POBTOT", "POBFEM", "POBMAS", "PHOG_IND", "P3YM_HLI", "P3HLINHE", "P3HLI_HE", "P5_HLI",
                "P_3YMAS", "P_5YMAS", "P_15YMAS", "PSINDER"]
INDICADORES_MZA = [
    "POBTOT", "POBFEM", "POBMAS", "PHOG_IND",
    "P3YM_HLI", "P3YM_HLI_F", "P3YM_HLI_M",
    "P3HLINHE", "P3HLINHE_F", "P3HLINHE_M",
    "P3HLI_HE", "P3HLI_HE_F", "P3HLI_HE_M",
    "PNACOE", "PNACOE_F", "PNACOE_M",
    "PRESOE05", "PRESOE05_F", "PRESOE05_M",
    "PSINDER", "P_3YMAS", "P_15YMAS",
]
PROMEDIO = "GRAPROES"
# Denominadores, iguales a los de 2020 en cada nivel para que la misma unidad
# signifique lo mismo en las dos ediciones: por AGEB la lengua va sobre la
# población de 3 años y más (construir_agebs.py); por manzana todo va sobre
# POBTOT y las variantes por sexo sobre POBFEM y POBMAS (construir_manzanas.py).
DEN_AGEB = {"P3YM_HLI": "P_3YMAS", "P3HLINHE": "P_3YMAS", "P3HLI_HE": "P_3YMAS", "P5_HLI": "P_5YMAS"}
SIN_TASA = {"POBTOT", "POBFEM", "POBMAS", "P_3YMAS", "P_5YMAS", "P_15YMAS"}


def leer(filtro, conteos):
    cols = ",\n      ".join(f"TRY_CAST({c} AS BIGINT) AS {c}" for c in conteos)
    sql = f"""
    SELECT lpad(ENTIDAD,2,'0') || lpad(MUN,3,'0') || lpad(LOC,4,'0') || lpad(AGEB,4,'0') AS cve_ageb,
      lpad(ENTIDAD,2,'0') || lpad(MUN,3,'0') || lpad(LOC,4,'0') || lpad(AGEB,4,'0') || lpad(MZA,3,'0') AS CVEGEO,
      NOM_MUN AS alcaldia,
      {cols},
      TRY_CAST({PROMEDIO} AS DOUBLE) AS {PROMEDIO}
    FROM read_csv_auto(?, all_varchar=true)
    WHERE {filtro}
    """
    return duckdb.connect().execute(sql, [str(RESAGEBURB)]).df()


def geometria(sufijo, clave):
    rutas = sorted(glob.glob(str(CARTO / "**" / f"*[0-9]{sufijo}.shp"), recursive=True))
    if len(rutas) != 33:
        sys.exit(f"Se esperaban 33 capas {sufijo} (una por localidad urbana) y hay {len(rutas)} bajo {CARTO}.")
    partes = [gpd.read_file(r)[["CVEGEO", "geometry"]] for r in rutas]
    g = gpd.GeoDataFrame(pd.concat(partes, ignore_index=True))
    g = g.set_crs(CRS_INEGI_2010, allow_override=True)
    if g["CVEGEO"].duplicated().any():
        sys.exit(f"CVEGEO duplicado en la cartografía {sufijo} de 2010.")
    return g.rename(columns={"CVEGEO": clave})


def tasas(d, indicadores, denominadores):
    """Tasa por cien de cada indicador; NULL donde el numerador está suprimido
    o el denominador es cero (nunca cero: cero significa "nadie cumple")."""
    for ind in indicadores:
        if ind in SIN_TASA:
            continue
        den = {"_F": "POBFEM", "_M": "POBMAS"}.get(ind[-2:], denominadores.get(ind, "POBTOT"))
        t = 100 * d[ind] / d[den]
        d[f"tasa_{ind.lower()}"] = t.where(d[den] > 0).round(2)
    return d


def main():
    for ruta in (RESAGEBURB, CARTO):
        if not ruta.exists():
            sys.exit(f"Falta el insumo: {ruta}\nCorre antes scripts/descargar_datos.sh")

    # ---------------------------------------------------------------- AGEB
    ag = leer("MZA = '000' AND AGEB <> '0000'", CONTEOS_AGEB).drop(columns="CVEGEO")
    tot = leer("MUN = '000'", CONTEOS_AGEB).iloc[0]
    for k, v in OFICIAL.items():
        if int(tot[k]) != v:
            sys.exit(f"La fila de total del tabulado 2010 da {k} = {int(tot[k]):,} y la cifra publicada es {v:,}.")
    print(f"AGEB 2010 en el tabulado: {len(ag):,}")
    ag = tasas(ag, CONTEOS_AGEB, DEN_AGEB)
    for k in ("PHOG_IND", "P3YM_HLI"):
        pub = ag[ag[k].notna()]
        den = "P_3YMAS" if k == "P3YM_HLI" else "POBTOT"
        suma = 100 * pub[k].sum() / pub[den].sum()
        oficial = 100 * tot[k] / tot[den]
        cobertura = 100 * pub[k].sum() / tot[k]
        print(f"  {k}: suma de AGEB {suma:.3f} % | total oficial {oficial:.3f} % | {cobertura:.1f} % de las personas en AGEB con cifra publicada")
        if cobertura < 97:
            sys.exit(f"La suma por AGEB de {k} recupera solo {cobertura:.1f} % del total oficial 2010.")
        anotar_calculado("ageb", f"cdmx_{k.lower()}_2010", suma, f"% {k} sobre su universo, suma de AGEB urbanas 2010")
        anotar_calculado("ageb", f"cdmx_{k.lower()}_2010_oficial", oficial, "fila de total de la entidad del tabulado 2010")
        anotar_calculado("ageb", f"cdmx_{k.lower()}_2010_cobertura", cobertura, f"% del total oficial de {k} que suman las AGEB con cifra publicada, 2010")
    ag[PROMEDIO] = ag[PROMEDIO].round(2)

    geo_a = geometria("A", "cve_ageb")
    capa_a = geo_a.merge(ag, on="cve_ageb", how="inner")
    print(f"  {len(capa_a):,} AGEB con geometría y dato ({len(ag) - len(capa_a)} del tabulado sin polígono)")
    if len(capa_a) != len(ag):
        sys.exit("Hay AGEB del tabulado 2010 sin polígono en la cartografía de cierre.")
    anotar_calculado("ageb", "agebs_2010_con_geometria", len(capa_a), "AGEB urbanas 2010 con polígono y dato")

    SALIDA.mkdir(parents=True, exist_ok=True)
    destino = SALIDA / "agebs_2010_cdmx.geojson"
    capa_a.to_crs(CRS_SALIDA).to_file(destino, driver="GeoJSON")
    resumen = SALIDA / "agebs_resumen_2010.csv"
    capa_a.drop(columns="geometry").to_csv(resumen, index=False, encoding="utf-8", lineterminator="\n")
    print(f"Escrito {destino.name} ({destino.stat().st_size / 1e6:.1f} MB) y {resumen.name}")

    # ------------------------------------------------------------ manzanas
    mz = leer("MZA <> '000'", INDICADORES_MZA).drop(columns="cve_ageb")
    print(f"Manzanas 2010 en el tabulado: {len(mz):,} | POBTOT {int(mz.POBTOT.sum()):,} | PHOG_IND {int(mz.PHOG_IND.sum()):,}")
    geo_m = geometria("M", "CVEGEO").to_crs(CRS_METRICO)
    manzanas = geo_m.merge(mz, on="CVEGEO", how="inner")
    print(f"  {len(manzanas):,} manzanas con geometría y dato ({len(mz) - len(manzanas)} sin polígono)")
    if len(manzanas) != len(mz):
        sys.exit("Hay manzanas del tabulado 2010 sin polígono en la cartografía de cierre.")
    anotar_calculado("manzana", "manzanas_2010_con_geometria", len(manzanas), "manzanas 2010 con polígono y dato")

    print("Leyendo colonias y repartiendo manzanas (área de intersección)...")
    colonias = leer_colonias()
    piezas = repartir(manzanas, colonias)
    dominante = piezas.sort_values("fraccion").groupby("CVEGEO").tail(1)
    manzanas = manzanas.merge(dominante[["CVEGEO", "cve_colonia", "colonia", "pueblo_originario"]], on="CVEGEO", how="left")
    print(f"  {int(manzanas.colonia.isna().sum()):,} manzanas sin colonia del IECM; "
          f"{int(manzanas.pueblo_originario.fillna(False).sum()):,} en pueblos originarios")
    manzanas = tasas(manzanas, INDICADORES_MZA, {})
    manzanas[PROMEDIO] = manzanas[PROMEDIO].round(2)
    manzanas = manzanas.drop(columns=["P_15YMAS"])
    destino_mz = SALIDA / "manzanas_2010_cdmx.geojson"
    manzanas.to_crs(CRS_SALIDA).to_file(destino_mz, driver="GeoJSON")
    print(f"Escrito {destino_mz.name} ({destino_mz.stat().st_size / 1e6:.1f} MB, {len(manzanas):,} manzanas)")


if __name__ == "__main__":
    main()

"""
Municipios de todo el país, simplificados, para el mapa de variantes de cada
lengua: al elegir una lengua, cada municipio se pinta con la variante que el
Catálogo INALI ubica ahí (clin_municipios.csv), de modo que la geometría solo
necesita la clave.

Entrada: Marco Geoestadístico 2020 integrado del INEGI (data-raw/cartografia/
mg2020/, gitignored), capa de municipios. Salida: src/data/municipios_mx.geojson
(gitignored; se convierte a municipios.pmtiles con scripts/generar_teselas.sh)
con CVEGEO (5 dígitos), CVE_ENT, CVE_MUN y NOMGEO.

La geometría se simplifica a 0.003 grados (~300 m) con topología conservada
por municipio; a los zooms de país (3 a 9) no se distingue del original y el
archivo baja de cientos de MB a unos 8.
"""
import glob
import os
import sys

import geopandas as gpd
import pandas as pd

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CRUDO = os.path.join(RAIZ, "data-raw", "cartografia", "mg2020")
SALIDA = os.path.join(RAIZ, "src", "data", "municipios_mx.geojson")


def main():
    # El integrado trae un zip por entidad, cada uno con su capa NNmun.shp:
    # se leen las 32 y se concatenan.
    rutas = sorted(p for p in glob.glob(os.path.join(CRUDO, "**", "*mun.shp"), recursive=True) if os.path.basename(p)[:2].isdigit())
    if len(rutas) != 32:
        raise SystemExit(f"Se esperaban 32 capas de municipios (una por entidad) y hay {len(rutas)} bajo {CRUDO}.")
    partes = [gpd.read_file(r) for r in rutas]
    g = gpd.GeoDataFrame(pd.concat(partes, ignore_index=True), crs=partes[0].crs)
    print(f"[ok] 32 capas leídas, {len(g):,} municipios", file=sys.stderr)
    cols = {c.upper(): c for c in g.columns}
    cve = cols.get("CVEGEO")
    if not cve:
        raise SystemExit(f"La capa no trae CVEGEO; columnas: {list(g.columns)}")
    g = g.rename(columns={cve: "CVEGEO", cols.get("NOMGEO", "NOMGEO"): "NOMGEO", cols.get("CVE_ENT", "CVE_ENT"): "CVE_ENT", cols.get("CVE_MUN", "CVE_MUN"): "CVE_MUN"})
    g = g[["CVEGEO", "CVE_ENT", "CVE_MUN", "NOMGEO", "geometry"]].copy()
    g["CVEGEO"] = g["CVEGEO"].astype(str).str.zfill(5)
    if g["CVEGEO"].duplicated().any():
        raise SystemExit("CVEGEO duplicado en la capa de municipios.")
    n = len(g)
    if not 2400 <= n <= 2500:
        raise SystemExit(f"Se esperaban entre 2 400 y 2 500 municipios y hay {n}.")
    if g.crs and g.crs.to_epsg() != 4326:
        g = g.to_crs(4326)
    g["geometry"] = g["geometry"].simplify(0.003, preserve_topology=True)
    g.to_file(SALIDA, driver="GeoJSON")
    print(f"[ok] {os.path.relpath(SALIDA, RAIZ)}: {n:,} municipios, {os.path.getsize(SALIDA) / 1e6:.1f} MB", file=sys.stderr)


if __name__ == "__main__":
    main()

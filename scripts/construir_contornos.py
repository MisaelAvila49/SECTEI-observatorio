"""Genera los contornos de referencia del mapa: el límite de la Ciudad de México
y el de sus alcaldías.

El mapa base se extiende hasta el Estado de México y Morelos, y las manzanas
terminan de golpe en el límite estatal sin que nada explique por qué. El contorno
marca ese límite para que se lea como un recorte deliberado y no como un hueco.

Se probó además una máscara que aclaraba todo el exterior del estado y se
descartó: ensuciaba el mapa sin decir nada que el contorno no dijera ya.
"""
import warnings
from pathlib import Path

import geopandas as gpd

warnings.filterwarnings("ignore")

RAIZ = Path(__file__).resolve().parent.parent
CARTO = RAIZ / "data-raw/cartografia/mg09/conjunto_de_datos"
SALIDA = RAIZ / "src/data"

CRS_SALIDA = 4326


def main():
    entidad = gpd.read_file(CARTO / "09ent.shp").to_crs(CRS_SALIDA)
    municipios = gpd.read_file(CARTO / "09mun.shp").to_crs(CRS_SALIDA)

    entidad = entidad[["CVEGEO", "NOMGEO", "geometry"]]
    municipios = municipios.rename(columns={"NOMGEO": "alcaldia"})[
        ["CVEGEO", "alcaldia", "geometry"]
    ]

    SALIDA.mkdir(parents=True, exist_ok=True)
    for gdf, nombre in [
        (entidad, "cdmx_limite.geojson"),
        (municipios, "cdmx_alcaldias.geojson"),
    ]:
        destino = SALIDA / nombre
        gdf.to_file(destino, driver="GeoJSON")
        print(f"escrito {nombre} ({destino.stat().st_size / 1024:.0f} KB, "
              f"{len(gdf)} polígonos)")


if __name__ == "__main__":
    main()

"""Une la cartografía de manzanas de CDMX con RESAGEBURB y reparte cada manzana
entre las colonias que la cruzan.

Produce dos salidas:

  data/manzanas_cdmx.geojson  una fila por manzana, con sus indicadores y la
                              colonia dominante. Es lo que se tesela.
  data/colonias_cdmx.geojson  una fila por colonia, con los indicadores ya
                              agregados desde las manzanas.

El reparto de manzanas partidas se hace por área de intersección: si el 30 % de
la superficie de una manzana cae en una colonia, esa colonia recibe el 30 % de
su población. Asume densidad uniforme dentro de la manzana, cosa que no es
cierta cuando media manzana es parque o vialidad; es la mejor aproximación
disponible porque RESAGEBURB publica una sola fila por manzana completa, sin
detalle interno. Queda anotado en la metodología del sitio.
"""
import sys
import warnings
from pathlib import Path

import duckdb
import geopandas as gpd
import pandas as pd

warnings.filterwarnings("ignore", category=UserWarning)

RAIZ = Path(__file__).resolve().parent.parent
CRUDO = RAIZ / "data-raw"
SALIDA = RAIZ / "src" / "data"

MANZANAS_SHP = CRUDO / "cartografia/mg09/conjunto_de_datos/09m.shp"
RESAGEBURB = (CRUDO / "censo2020/ageb_mza_urbana_09_cpv2020/conjunto_de_datos"
              / "conjunto_de_datos_ageb_urbana_09_cpv2020.csv")
COLONIAS_IECM = CRUDO / "colonias/iecm2022/colonias_iecm_2022/colonias_iecm2022_.shp"
SEPI = CRUDO / "sepi/pueblos_originarios_sepi.json"

# EPSG:6372 (Mexico ITRF2008 / LCC) está en metros: se usa para áreas e
# intersecciones. La salida va en 4326, que es lo que leen MapLibre y tippecanoe.
CRS_METRICO = 6372
CRS_SALIDA = 4326

# Los indicadores que se publican por manzana. POBTOT es el denominador de
# todos; PHOG_IND es el indicador central del proyecto.
#
# Las variantes _F y _M son las que publica RESAGEBURB para desagregar por sexo.
# Existen para los indicadores de LENGUA y los de migración, pero NO
# para PHOG_IND: ese cuenta hogares completos —donde conviven ambos sexos— y el
# Censo no lo desagrega. Por eso el filtro de sexo del mapa se apaga al elegir
# ese indicador, en vez de mostrar un cero falso.
#
# No hay ningún cruce de EDAD con lengua indígena: se revisaron las 230 columnas
# del tabulado y no existe. Los rangos de edad que publica RESAGEBURB (P_0A2,
# P_6A11…) son de población total y responden a otra pregunta.
INDICADORES = [
    "POBTOT", "POBFEM", "POBMAS",  # denominadores: total, mujeres y hombres
    "PHOG_IND",    # población en hogares censales indígenas (sin desglose por sexo)
    "P3YM_HLI", "P3YM_HLI_F", "P3YM_HLI_M",        # habla lengua indígena, 3+
    "P3HLINHE", "P3HLINHE_F", "P3HLINHE_M",        # habla lengua y no español
    "P3HLI_HE", "P3HLI_HE_F", "P3HLI_HE_M",        # habla lengua y español
    # Contexto: migración. Es el cruce más pertinente del proyecto, porque las
    # colonias con mayor proporción de población indígena NO son los pueblos
    # originarios, y estas variables miden directamente esa otra vía de llegada.
    "PNACOE", "PNACOE_F", "PNACOE_M",              # nacida en otra entidad
    "PRESOE15", "PRESOE15_F", "PRESOE15_M",        # residía en otra entidad en 2015
]


def leer_censo():
    """Lee RESAGEBURB y arma el CVEGEO de 16 dígitos.

    Los valores suprimidos por confidencialidad vienen como '*' y TRY_CAST los
    deja en NULL. Se conservan como NULL a propósito: un cero se leería como
    "aquí no vive nadie en hogar indígena", que es una afirmación distinta a
    "INEGI no publica el dato".
    """
    columnas = ",\n           ".join(
        f"TRY_CAST({c} AS BIGINT) AS {c}" for c in INDICADORES
    )
    sql = f"""
    SELECT lpad(ENTIDAD,2,'0') || lpad(MUN,3,'0') || lpad(LOC,4,'0')
           || lpad(AGEB,4,'0') || lpad(MZA,3,'0') AS CVEGEO,
           NOM_MUN AS alcaldia,
           {columnas}
    FROM read_csv_auto(?, all_varchar=true)
    WHERE MZA <> '000'
    """
    return duckdb.connect().execute(sql, [str(RESAGEBURB)]).df()


def leer_colonias():
    """Capa de agregación: IECM 2022, marcada con el padrón oficial de la SEPI.

    Se usa IECM porque cubre casi toda la mancha urbana: el catálogo de datos
    abiertos deja fuera 16,613 personas en hogares indígenas (6.1 % del total),
    concentradas en la periferia, que es justo donde están los pueblos
    originarios.

    La marca de pueblo originario viene del padrón de la Secretaría de Pueblos y
    Barrios Originarios (SEPI), que reconoce 50 pueblos y publica la CVEUT de
    cada uno: la MISMA clave del IECM, así que el cruce es exacto y no depende
    de comparar geometrías.

    Antes se derivaba del campo `clasif` del catálogo de colonias, marcando toda
    unidad con más del 30 % de su área dentro de alguno de sus 281 polígonos.
    Eso marcaba 260 unidades —224 de más y 14 de menos frente al padrón—, y
    convertía cualquier cifra "en pueblos originarios" en el promedio de un
    universo cinco veces mayor que el reconocido oficialmente.
    """
    col = gpd.read_file(COLONIAS_IECM).to_crs(CRS_METRICO)
    col = col.rename(columns={"CVEUT": "cve_colonia", "UT": "colonia",
                              "DEMARCACIO": "alcaldia_col"})
    col = col[["cve_colonia", "colonia", "alcaldia_col", "geometry"]]

    sepi = gpd.read_file(SEPI)
    claves = set(sepi["CVEUT"])
    col["pueblo_originario"] = col["cve_colonia"].isin(claves)

    faltantes = claves - set(col["cve_colonia"])
    if faltantes:
        # No debería pasar: ambas capas usan la misma clave del IECM. Si pasa,
        # es que cambió alguna de las dos y la marca quedaría incompleta.
        print(f"  AVISO: {len(faltantes)} pueblos de la SEPI sin unidad en el "
              f"IECM: {sorted(faltantes)[:5]}")

    # Etnia y lengua del padrón, para el tooltip y las fichas.
    sepi_datos = sepi[["CVEUT", "NOMUT", "ETNIA", "LEGING"]].rename(
        columns={"CVEUT": "cve_colonia", "NOMUT": "nombre_pueblo",
                 "ETNIA": "etnia", "LEGING": "lengua"}
    )
    col = col.merge(sepi_datos, on="cve_colonia", how="left")

    return col


def repartir(manzanas, colonias):
    """Reparte cada manzana entre las colonias que la cruzan, por área.

    Devuelve el detalle manzana × colonia con su fracción de área. Una manzana
    contenida por completo en una colonia produce una sola fila con fracción 1.
    """
    piezas = gpd.overlay(
        manzanas[["CVEGEO", "geometry"]], colonias, how="intersection",
        keep_geom_type=True,
    )
    piezas["area_pieza"] = piezas.area

    area_manzana = manzanas.set_index("CVEGEO").area
    piezas["area_manzana"] = piezas["CVEGEO"].map(area_manzana)

    # Las astillas de la topología (bordes que no coinciden al milímetro entre
    # las dos capas) generan intersecciones minúsculas que inflan el conteo de
    # colonias por manzana sin aportar población. Se descartan.
    piezas = piezas[piezas["area_pieza"] / piezas["area_manzana"] > 0.001]

    # La fracción se renormaliza sobre lo que quedó: si una manzana asoma fuera
    # de toda colonia, su población se reparte entre las colonias que sí la
    # tocan, en vez de perderse.
    suma = piezas.groupby("CVEGEO")["area_pieza"].transform("sum")
    piezas["fraccion"] = piezas["area_pieza"] / suma
    return piezas


def agregar_colonias(piezas, censo, colonias):
    """Suma los indicadores de manzana hacia colonia, ponderando por fracción.

    Los valores suprimidos (NULL) no se cuentan como cero: se suman aparte como
    `manzanas_sin_dato` para que cada colonia pueda decir sobre cuántas manzanas
    se calculó realmente su cifra.
    """
    det = piezas.merge(censo, on="CVEGEO", how="left")

    for ind in INDICADORES:
        det[ind] = det[ind] * det["fraccion"]

    det["manzanas_sin_dato"] = det["PHOG_IND"].isna() * det["fraccion"]
    det["manzanas"] = det["fraccion"]

    agregado = det.groupby("cve_colonia", as_index=False)[
        INDICADORES + ["manzanas", "manzanas_sin_dato"]
    ].sum(min_count=1)

    salida = colonias.merge(agregado, on="cve_colonia", how="left")
    salida["manzanas"] = salida["manzanas"].round().astype("Int64")
    salida["manzanas_sin_dato"] = salida["manzanas_sin_dato"].round().astype("Int64")
    for ind in INDICADORES:
        salida[ind] = salida[ind].round().astype("Int64")
    return salida


def con_tasas(gdf):
    """Agrega las tasas por cien, cada una sobre el denominador que le toca.

    Un indicador femenino se divide entre POBFEM y uno masculino entre POBMAS,
    no entre la población total: "12 % de mujeres hablantes" tiene que
    significar 12 de cada 100 mujeres, no 12 de cada 100 personas. Dividir todo
    entre POBTOT haría que las tasas por sexo salieran aproximadamente a la
    mitad y no fueran comparables ni entre sí ni con el total.

    Donde el numerador está suprimido o la población del denominador es cero, la
    tasa queda en NULL y el mapa la pinta transparente. Nunca cero: el cero
    significa "hay gente y ninguna cumple", no "no sabemos".
    """
    denominadores = {"_F": "POBFEM", "_M": "POBMAS"}
    for ind in INDICADORES:
        if ind in ("POBTOT", "POBFEM", "POBMAS"):
            continue
        den = next(
            (col for sufijo, col in denominadores.items() if ind.endswith(sufijo)),
            "POBTOT",
        )
        tasa = 100 * gdf[ind] / gdf[den]
        gdf[f"tasa_{ind.lower()}"] = tasa.where(gdf[den] > 0).round(2)
    return gdf


def main():
    for ruta in (MANZANAS_SHP, RESAGEBURB, COLONIAS_IECM, SEPI):
        if not ruta.exists():
            sys.exit(f"Falta el insumo: {ruta}\nCorre antes scripts/descargar_datos.sh")

    print("Leyendo cartografía de manzanas...")
    manzanas = gpd.read_file(MANZANAS_SHP).to_crs(CRS_METRICO)
    manzanas = manzanas[["CVEGEO", "AMBITO", "geometry"]]

    print("Leyendo RESAGEBURB...")
    censo = leer_censo()

    manzanas = manzanas.merge(censo, on="CVEGEO", how="inner")
    print(f"  {len(manzanas):,} manzanas con dato censal")
    print(f"  POBTOT {int(manzanas.POBTOT.sum()):,} | "
          f"PHOG_IND {int(manzanas.PHOG_IND.sum()):,}")

    print("Leyendo colonias...")
    colonias = leer_colonias()
    print(f"  {len(colonias):,} colonias | "
          f"{int(colonias.pueblo_originario.sum())} pueblos originarios (padrón SEPI)")

    print("Repartiendo manzanas entre colonias (área de intersección)...")
    piezas = repartir(manzanas, colonias)
    partidas = piezas.groupby("CVEGEO").size()
    print(f"  {int((partidas > 1).sum()):,} manzanas caen en más de una colonia")

    print("Agregando a colonia...")
    col_out = con_tasas(agregar_colonias(piezas, censo, colonias))

    # La manzana se publica con su colonia dominante, la que se lleva la mayor
    # fracción de su área. Es una etiqueta para el tooltip y el filtro; el
    # reparto proporcional ya se aplicó en la agregación de arriba.
    dominante = piezas.sort_values("fraccion").groupby("CVEGEO").tail(1)
    manzanas = manzanas.merge(
        dominante[["CVEGEO", "cve_colonia", "colonia", "pueblo_originario"]],
        on="CVEGEO", how="left",
    )
    mz_out = con_tasas(manzanas)

    SALIDA.mkdir(parents=True, exist_ok=True)
    destino_mz = SALIDA / "manzanas_cdmx.geojson"
    destino_col = SALIDA / "colonias_cdmx.geojson"

    mz_out.to_crs(CRS_SALIDA).to_file(destino_mz, driver="GeoJSON")
    col_out.to_crs(CRS_SALIDA).to_file(destino_col, driver="GeoJSON")

    print(f"\nEscrito {destino_mz.name} "
          f"({destino_mz.stat().st_size / 1e6:.1f} MB, {len(mz_out):,} manzanas)")
    print(f"Escrito {destino_col.name} "
          f"({destino_col.stat().st_size / 1e6:.1f} MB, {len(col_out):,} colonias)")

    # Cuadre: la suma por colonia tiene que devolver la misma población que la
    # suma por manzana. Si no cuadra, el reparto perdió o duplicó gente.
    dif = int(col_out.POBTOT.sum()) - int(mz_out.POBTOT.sum())
    print(f"\nCuadre POBTOT manzana vs colonia: diferencia {dif:,}")
    if abs(dif) > len(mz_out):
        print("  ATENCIÓN: la diferencia excede el redondeo esperado")


if __name__ == "__main__":
    main()

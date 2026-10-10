#!/usr/bin/env bash
# Convierte las manzanas y colonias a teselas vectoriales PMTiles.
#
# Corre en WSL, no en Windows: tippecanoe no tiene binario nativo de Windows.
# Desde PowerShell:
#
#   wsl -d Ubuntu -e bash -lc "cd /mnt/d/IMPORTANTE/SocialDataIbero/Framework/grupos-originarios && scripts/generar_teselas.sh"
#
# Instalación previa de tippecanoe (una sola vez, pide contraseña de sudo):
#
#   wsl -d Ubuntu -e bash -lc "sudo apt update && sudo apt install -y tippecanoe"
#
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENTRADA="$RAIZ/src/data"
SALIDA="$RAIZ/src/data"

if ! command -v tippecanoe >/dev/null 2>&1; then
  echo "Falta tippecanoe. Instálalo con: sudo apt update && sudo apt install -y tippecanoe" >&2
  exit 1
fi

echo "Generando manzanas.pmtiles..."
# -z15 y no -zg: `-zg` elige el zoom por densidad y aquí se quedaba en 13, donde
# una manzana mide pocos píxeles y no se puede señalar una en particular. El
# mapa tiene que llegar a nivel calle, que es el sentido de mapear por manzana.
# --drop-densest-as-needed tira los polígonos más apretados cuando una tesela se
# pasa del límite, en vez de fallar; a zoom bajo se pierden manzanas que de
# todos modos medirían menos de un píxel.
# --coalesce-densest-as-needed las fusiona antes de tirarlas, lo que conserva
# mejor la mancha urbana.
# --extend-zooms-if-still-dropping evita huecos a zoom alto.
# --low-detail=10 (octubre 2026): debajo de z15 las coordenadas van a 1024
# unidades por tesela en vez de 4096. Con --no-tile-size-limit las teselas de
# zoom bajo llevan las 66 mil manzanas y elegir «Manzana» con la ciudad
# completa bajaba 6.3 MB; así baja 2.2 MB, sin tirar ninguna manzana ni
# atributo. A z14 la precisión sigue siendo de medio píxel.
tippecanoe \
  -o "$SALIDA/manzanas.pmtiles" \
  --force \
  --layer=manzanas \
  --name="Manzanas CDMX · Censo 2020" \
  --attribution="INEGI, Censo de Población y Vivienda 2020" \
  -z15 -Z8 \
  --low-detail=10 \
  --coalesce-densest-as-needed \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --no-tile-size-limit \
  --generate-ids \
  "$ENTRADA/manzanas_cdmx.geojson"
# --generate-ids es indispensable para el resaltado al pasar el cursor: sin id
# de feature no se puede usar feature-state, y filtrar por CVEGEO no sirve
# porque la clave se repite —toda manzana que cruza el borde de una tesela
# aparece en las dos, así que el filtro encendía trozos sueltos por todo el mapa.

echo "Generando colonias.pmtiles..."
# Las colonias son 1,837 polígonos: caben enteras a cualquier zoom, así que no
# se tira ninguna. -z13 basta porque no se navega más cerca a nivel colonia.
tippecanoe \
  -o "$SALIDA/colonias.pmtiles" \
  --force \
  --layer=colonias \
  --name="Colonias CDMX · Censo 2020" \
  --attribution="INEGI Censo 2020 · IECM 2022" \
  -z13 -Z8 \
  --no-tile-compression \
  "$ENTRADA/colonias_cdmx.geojson"

echo "Generando agebs.pmtiles..."
# Las AGEB urbanas de la ciudad son unos 2,400 polígonos: caben enteras a
# cualquier zoom, así que no se tira ninguna. --generate-ids por lo mismo que en
# las manzanas: el resaltado bajo el cursor usa feature-state.
tippecanoe   -o "$SALIDA/agebs.pmtiles"   --force   --layer=agebs   --name="AGEB urbanas CDMX · Censo 2020"   --attribution="INEGI Censo 2020 · CONAPO · CONEVAL"   -z14 -Z8   --no-tile-size-limit   --generate-ids   "$ENTRADA/agebs_cdmx.geojson"

echo "Generando manzanas_2010.pmtiles y agebs_2010.pmtiles..."
# Edición 2010 de las dos capas, con la cartografía de cierre del Censo 2010
# (scripts/construir_2010.py). Mismas opciones que las de 2020 para que el
# cambio de año no cambie el dibujo por razones de teselado.
if [ -f "$ENTRADA/manzanas_2010_cdmx.geojson" ]; then
tippecanoe   -o "$SALIDA/manzanas_2010.pmtiles"   --force   --layer=manzanas   --name="Manzanas CDMX · Censo 2010"   --attribution="INEGI, Censo de Población y Vivienda 2010"   -z15 -Z8   --low-detail=10   --coalesce-densest-as-needed   --drop-densest-as-needed   --extend-zooms-if-still-dropping   --no-tile-size-limit   --generate-ids   "$ENTRADA/manzanas_2010_cdmx.geojson"
tippecanoe   -o "$SALIDA/agebs_2010.pmtiles"   --force   --layer=agebs   --name="AGEB urbanas CDMX · Censo 2010"   --attribution="INEGI Censo 2010"   -z14 -Z8   --no-tile-size-limit   --generate-ids   "$ENTRADA/agebs_2010_cdmx.geojson"
fi

echo "Generando municipios.pmtiles..."
# Los 2,469 municipios del país, simplificados, para el mapa de variantes por
# lengua: el valor (la variante) se escribe con feature-state por CVEGEO, así
# que la tesela solo lleva claves y nombre. Zoom de país a estado.
if [ -f "$ENTRADA/municipios_mx.geojson" ]; then
tippecanoe   -o "$SALIDA/municipios.pmtiles"   --force   --layer=municipios   --name="Municipios de Mexico · Marco Geoestadistico 2020"   --attribution="INEGI"   -z10 -Z3   --no-tile-size-limit   --coalesce-densest-as-needed   "$ENTRADA/municipios_mx.geojson"
fi

echo
ls -lh "$SALIDA"/*.pmtiles
echo
echo "Listo. Los .geojson de origen ya no se necesitan en el sitio:"
echo "  los .pmtiles son lo que se publica y lo que se versiona."

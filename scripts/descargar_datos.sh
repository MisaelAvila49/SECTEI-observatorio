#!/usr/bin/env bash
# Descarga los insumos públicos del tablero. Todos son datos abiertos y ninguno
# requiere credenciales. Pesan alrededor de 180 MB y no se versionan.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRUDO="$RAIZ/data-raw"

bajar() {  # url destino descripcion
  local url="$1" destino="$2" que="$3"
  if [ -f "$destino" ]; then
    echo "ya está: $que"
    return
  fi
  echo "descargando: $que"
  mkdir -p "$(dirname "$destino")"
  curl -fL --retry 3 --max-time 1200 -o "$destino" "$url"
}

# Censo 2020, principales resultados por AGEB y manzana urbana, CDMX (entidad 09).
bajar "https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/ageb_manzana/ageb_mza_urbana_09_cpv2020_csv.zip" \
      "$CRUDO/censo2020/ageb_mza_09.zip" "RESAGEBURB CDMX (13 MB)"

# Marco Geoestadístico 2020, corte censal, CDMX. Trae 09m.shp (manzanas).
bajar "https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/geografia/marcogeo/889463807469/09_ciudaddemexico.zip" \
      "$CRUDO/cartografia/09_ciudaddemexico.zip" "Marco Geoestadístico CDMX (83 MB)"

# Colonias: IECM 2022 es la capa de agregación (cubre casi toda la mancha
# urbana). El catálogo de datos abiertos se usa solo por su campo `clasif`, que
# distingue los pueblos y barrios originarios.
bajar "https://datos.cdmx.gob.mx/dataset/d8f83ce7-163d-4c2a-96e0-ae38d304c4a0/resource/e3bbadb4-f3de-4c52-b3f4-a4ffea4466a3/download/e3bbadb4-f3de-4c52-b3f4-a4ffea4466a3.zip" \
      "$CRUDO/colonias/iecm2022.zip" "Colonias IECM 2022 (1.4 MB)"

bajar "https://datos.cdmx.gob.mx/dataset/02c6ce99-dbd8-47d8-aee1-ae885a12bb2f/resource/4f831409-b3c9-40c9-bc0e-66b0762b3cf4/download/4f831409-b3c9-40c9-bc0e-66b0762b3cf4.zip" \
      "$CRUDO/colonias/catalogo.zip" "Catálogo de colonias CDMX (2.5 MB)"

# Padrón oficial de los 50 pueblos originarios, de la Secretaría de Pueblos y
# Barrios Originarios. Trae la CVEUT de cada pueblo —la misma clave del IECM, de
# modo que el cruce es exacto— más su etnia y su lengua.
bajar "https://datos.cdmx.gob.mx/dataset/cfcb1777-6279-46c9-a56f-92bbd8e06838/resource/f82befde-6872-4582-9d30-fcd9794d2373/download/f82befde-6872-4582-9d30-fcd9794d2373.json" \
      "$CRUDO/sepi/pueblos_originarios_sepi.json" "Pueblos Originarios SEPI (0.5 MB)"

# Clasificaciones por AGEB urbana que usa scripts/construir_agebs.py. El indice
# de marginacion de CONAPO se baja de su copia oficial en datos.gob.mx porque el
# servidor de CONAPO no siempre responde; el rezago social, directo de CONEVAL.
bajar "https://www.datos.gob.mx/dataset/d8f2a534-bcee-4114-853d-82982a81ce24/resource/9600f414-c1ba-408a-8dd6-7f73d76601d4/download/imu_2020.csv"       "$CRUDO/conapo/imu_2020.csv" "Índice de marginación urbana 2020, CONAPO (15 MB)"

bajar "https://www.coneval.org.mx/Medicion/Documents/GRS_AGEB_2020/GRS_AGEB_urbana_2020.zip"       "$CRUDO/coneval/GRS_AGEB_urbana_2020.zip" "Grado de rezago social por AGEB 2020, CONEVAL"

# Serie por alcaldia, lenguas y variantes (mapa unificado). Los ITER de 1990,
# 1995, 2000 y 2005 no tienen liga directa: se bajan a mano del portal del
# INEGI (Censos y Conteos > Datos abiertos > ITER) a data-raw/iter/.
bajar "https://www.inegi.org.mx/contenidos/programas/ccpv/2010/datosabiertos/iter_09_2010_csv.zip"       "$CRUDO/iter/iter_09_2010_csv.zip" "ITER 2010, Distrito Federal (0.1 MB)"
bajar "https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/iter/iter_09_cpv2020_csv.zip"       "$CRUDO/iter/iter_09_cpv2020_csv.zip" "ITER 2020, Ciudad de Mexico (0.2 MB)"
bajar "https://www.inegi.org.mx/contenidos/programas/ccpv/2010/datosabiertos/ageb_y_manzana/resageburb_09_2010_csv.zip"       "$CRUDO/resageburb2010/resageburb_09_2010_csv.zip" "Resultados por AGEB y manzana 2010, Distrito Federal (9.8 MB)"
bajar "https://www.inegi.org.mx/contenidos/programas/intercensal/2015/microdatos/eic2015_09_csv.zip"       "$CRUDO/eic2015/eic2015_09_csv.zip" "Encuesta Intercensal 2015, microdatos de la Ciudad de Mexico (23 MB)"
bajar "https://www.inegi.org.mx/contenidos/programas/eic/2025/datosabiertos/conjunto_de_datos_eic2025_105_csv.zip"       "$CRUDO/eic2025/conjunto_de_datos_eic2025_105_csv.zip" "Encuesta Intercensal 2025, conjunto 105 (8 MB)"
bajar "https://www.inali.gob.mx/pdf/CLIN_completo.pdf"       "$CRUDO/inali/CLIN_completo.pdf" "Catalogo de las Lenguas Indigenas Nacionales, INALI 2008 (3 MB)"
bajar "https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/nueva_estruc/702825198701.pdf"       "$CRUDO/inali/clasificaciones_censo2020.pdf" "Clasificaciones del Censo 2020, INEGI (2.7 MB)"

echo
echo "descomprimiendo..."
unzip -o -q "$CRUDO/censo2020/ageb_mza_09.zip"        -d "$CRUDO/censo2020"
unzip -o -q "$CRUDO/cartografia/09_ciudaddemexico.zip" -d "$CRUDO/cartografia/mg09"
unzip -o -q "$CRUDO/colonias/iecm2022.zip"             -d "$CRUDO/colonias/iecm2022"
unzip -o -q "$CRUDO/colonias/catalogo.zip"             -d "$CRUDO/colonias/catalogo"
unzip -o -q "$CRUDO/coneval/GRS_AGEB_urbana_2020.zip"  -d "$CRUDO/coneval"
for z in "$CRUDO"/iter/*.zip "$CRUDO"/resageburb2010/*.zip "$CRUDO"/eic2015/*.zip "$CRUDO"/eic2025/*.zip; do unzip -o -q "$z" -d "$(dirname "$z")"; done

echo
echo "Listo. Sigue:"
echo "  python scripts/construir_manzanas.py    # une censo y cartografía"
echo "  python scripts/construir_agebs.py       # AGEB con marginación y rezago social"
echo "  uv run python scripts/loaders/serie_alcaldias.py && uv run python scripts/loaders/lenguas.py && uv run python scripts/construir_clin.py"
echo "  scripts/generar_teselas.sh              # en WSL: produce los .pmtiles"

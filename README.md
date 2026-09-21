# Grupos originarios

Tablero de Social Data Ibero sobre la población indígena de México, en dos
etapas:

1. **Acceso digital** (esta versión): qué proporción de la población indígena
   vive con internet, celular y computadora, y qué usa cada persona y para qué,
   comparada con el resto de la población. Tres fuentes del INEGI, cada una en
   su propia página: Censo 2020 (cuestionario ampliado), ENIGH 2020, 2022 y
   2024, y ENDUTIH 2025.
2. **Mapa por manzana** de la población en hogares indígenas de la Ciudad de
   México, con el Censo 2020, servido como PMTiles (ver más abajo).

## Cómo está definida la población indígena

Cada persona cae en una de cuatro celdas excluyentes: habla lengua indígena
(sí/no) por se considera indígena (sí/no). Los archivos guardan las cuatro y el
navegador suma las que corresponden al **criterio** que el lector elige en el
panel (lengua o autoadscripción), así que los dos criterios comparten universo
y nadie se cuenta dos veces. El universo son personas de 6 años o más. Detalle
en `src/metodologia/definiciones.md`.

## Reproducir los datos

```bash
npm run datos          # corre los tres loaders de scripts/loaders/ (DuckDB)
npm run verificar      # coteja las cifras nacionales con las oficiales
uv run python scripts/generar_portada.py   # la cubierta de la portada, desde los mismos datos
npm install && npm run dev
```

Los loaders leen los microdatos crudos de estas rutas (se cambian con
variables de entorno):

| Fuente | Variable | Ruta por omisión |
| --- | --- | --- |
| Censo 2020, Personas00.CSV y Viviendas00.CSV | `CENSO_DIR` | `D:\IMPORTANTE\SocialDataIbero\AnalisisSueltos\JCF\data\raw\censo2020` |
| ENIGH `poblacion`, `concentradohogar` | `ENIGH_DIR` | `D:\IMPORTANTE\SocialDataIbero\AnalisisSueltos\Obindi\enigh` |
| ENIGH `hogares` | `ENIGH_HOGARES_DIR` | `discriminacion-mujeres/src/data/raw/enigh_hogares` |
| ENDUTIH 2025 (DBF) | `ENDUTIH_DIR` | `discriminacion-mujeres/src/data/raw/endutih` |

Escriben `src/data/indicadores/<tema>.parquet` (llaves base: edición, lengua,
autoadscripción, sexo, entidad, rango de edad, tamaño de localidad) y los
desgloses `<tema>_escolaridad.parquet` y `enigh-hogar_decil.parquet`. Cada fila
trae numerador, denominador, casos sin expandir y el error estándar bajo el
diseño muestral (linearización de Taylor, varianza entre UPM dentro de
estrato), calculado en DuckDB con la misma fórmula para las tres fuentes
(`scripts/loaders/comun.py`). El porcentaje se calcula en el navegador al
sumar celdas, nunca promediando tasas.

## Verificación

```bash
npm run verificar:todo   # fuentes + build + render + filtros + a11y + paleta
```

`verificar:render` cuenta marcas reales en cada página y en los dos temas;
`verificar:filtros` cambia cada control y comprueba que el dibujo responde;
`verificar:a11y` corre axe-core (WCAG 2.1 A/AA, cero serious/critical);
`verificar:paleta` valida las paletas para daltonismo. Los cuatro usan Edge o
Chrome instalado vía playwright-core. `scripts/capturas.mjs` toma capturas de
página completa para revisarlas a ojo (en Git Bash, con `MSYS_NO_PATHCONV=1`
para que las rutas `/encuestas/...` no se conviertan en rutas de Windows).

## Lo que se verificó contra los microdatos

- Los códigos de "sí" cambian de variable en variable en el Censo (INTERNET
  7, CELULAR 5, COMPUTADORA 1, TELEFONO 3...) y SEXO es 1/3, no 1/2.
- En la ENIGH 2024 `num_compu` es solo escritorio; la portátil va en
  `num_lap`. Contar solo la primera bajaba "hogar con computadora" de 26 % a
  7 % sin que nada fallara.
- En la ENDUTIH 2025 la variable que encabeza el módulo 6.A (`P6A_1`) no es
  lengua indígena sino afrodescendencia; lengua es `P6A_5` y autoadscripción
  `P6A_3`. Se comprobó por peso (6.3 % contra 6.1 % del Censo), distribución
  por entidad, cruce con la autoadscripción y tasa de uso de internet.
- `P4_8` de la ENDUTIH viene con dos dígitos y cero a la izquierda.

## Mapas por manzana y por AGEB

```bash
scripts/descargar_datos.sh            # insumos públicos del INEGI y del gobierno de la CDMX (~180 MB)
python scripts/construir_manzanas.py  # une censo y cartografía, reparte manzanas entre colonias, cruce por bandas
python scripts/construir_agebs.py     # AGEB con marginación (CONAPO) y rezago social (CONEVAL); coteja y anota en calculado.csv
python scripts/construir_contornos.py # límite del estado, alcaldías y máscara del exterior
python scripts/construir_colonias_resumen.py  # src/data/colonias_resumen.csv (se versiona)
scripts/generar_teselas.sh            # en WSL: produce los .pmtiles con tippecanoe
python scripts/verificar_salida.py    # comprueba que las cifras cuadren
```

Las 66,449 manzanas pesan 150 MB en GeoJSON; se convierten a teselas con
tippecanoe y se publican como PMTiles de 59.1 MB (las 2,431 AGEB, 4.0 MB). Los
indicadores de vivienda se dividen entre `VIVPARH_CV`, no entre `TVIVPARHAB`:
es el total que coincide con el de CONEVAL en 99.5 % de las AGEB. La cifra de la
ciudad sale de la fila de total de la entidad del tabulado (289,139 de
9,209,944), no de la suma de manzanas, que pierde lo suprimido. **La versión de
`maplibre-gl` va escrita en el import** (`npm:maplibre-gl@5.24.0`): Observable
resuelve `npm:` contra su CDN y la 6 quitó el export default y no pide teselas
a pmtiles. Si aparece `does not provide an export named 'default'`, se coló la
6: detener el servidor, `rm -rf src/.observablehq` y volver a arrancar. El
indicador del mapa (`PHOG_IND`) mide lengua en posiciones del hogar, no
autoadscripción; las manzanas grises son valores suprimidos, no ceros. Detalle
en la página de metodología.

## Publicación en GitHub Pages

`.github/workflows/deploy.yml` construye y publica `dist/` en cada push a
`main`. El build no corre ningún data loader: todos los datos van versionados
(los parquet de `src/data/indicadores/`, `colonias_resumen.csv`, `agebs_resumen.csv`, `cruce_manzanas.csv` y los dos
`.pmtiles`), porque salen de microdatos de varios GB que no viven en el
repositorio, así que el runner solo necesita Node. Requisito de una sola vez:
en GitHub, Settings → Pages → Source = "GitHub Actions". La imagen de vista
previa se regenera con `node scripts/generar_og.mjs`.

## Estructura

```
scripts/loaders/   comun.py (esquema, agregador DuckDB), censo.py, enigh.py, endutih.py
scripts/           verificadores (render, filtros, a11y, paleta), capturas, portada, mapa
src/components/    base.js (paleta, ancho, formatos), grupos.js (comparaciones y criterios),
                   filtros.js (panel y geometría), graficas.js (dumbbell, pendiente, barras,
                   mapas), tablero.js (renderer), catalogo.js (textos), agregar.js,
                   descargar.js, fuentes.js, navegacion.js, mapa.js (MapLibre)
src/data/          indicadores/*.parquet, fuentes.csv, verificaciones.csv, calculado.csv,
                   verificar_fuentes.py, mx_entidades.json, teselas del mapa
src/encuestas/     una carpeta por fuente; cada página es un cascarón de seccionesTema()
src/metodologia/   fuentes y cobertura, definiciones
```

---
title: Beta de filtros
toc: false
---

# Beta: geografía y filtros en una sola sección

Prueba de la arquitectura de filtros del libro con datos reales. El nivel
manda: el país como una sola cifra, las entidades, los municipios, las AGEB y
las manzanas de la Ciudad de México. Entidad, municipio y AGEB acotan o
resaltan una unidad dentro del nivel. El análisis es la vista por omisión y
"Ver como: Mapa" abre el mapa en su lugar, donde un clic sobre la unidad baja
de nivel y las migas suben. Cada filtro aparece solo donde su fuente lo
publica. La población admite seis formas de contar (hablan, viven en hogar
indígena, se consideran, hablan o se consideran, hablan y se consideran, y la
definición del INPI) y "por separado" las compara; por municipio, el globo y
la tabla traen la tipología del INPI de presencia indígena.

```js
import {datosCenso, seccionCenso} from "./components/seccion-censo.js";

const [nacional, inpi, serie, agebs, agebs2010, geoFilas, geoEntidades] = await Promise.all([
  FileAttachment("data/hablantes_nacional_2020.csv").csv({typed: true}),
  FileAttachment("data/inpi_2020.csv").csv({typed: true}),
  FileAttachment("data/serie_alcaldias.csv").csv({typed: true}),
  FileAttachment("data/agebs_resumen.csv").csv({typed: true}),
  FileAttachment("data/agebs_resumen_2010.csv").csv({typed: true}),
  FileAttachment("data/geo_catalogo.csv").csv(),
  FileAttachment("data/mx_entidades.json").json(),
]);
const pmtiles = {municipios: await FileAttachment("data/municipios.pmtiles").url(), agebs: await FileAttachment("data/agebs.pmtiles").url(), manzanas: await FileAttachment("data/manzanas.pmtiles").url(), agebs2010: null, manzanas2010: null};
try { pmtiles.agebs2010 = await FileAttachment("data/agebs_2010.pmtiles").url(); } catch { pmtiles.agebs2010 = null; }
try { pmtiles.manzanas2010 = await FileAttachment("data/manzanas_2010.pmtiles").url(); } catch { pmtiles.manzanas2010 = null; }
const datos = datosCenso({nacional, inpi, serie, agebs, agebs2010, geoFilas, geoEntidades, pmtiles});
display(seccionCenso(datos, {id: "beta"}));
```

## Qué probar

Elige el nivel "Municipios" sin entidad: se comparan los 2,469 municipios del
país; escribe "Oaxaca" en entidad para acotar y "Oaxaca de Juárez" en
municipio para resaltarlo en el ranking (contorno rojo y cifra en el subtítulo). Vuelve a "Entidades
del país": la entidad se suelta sola. Cambia a "AGEB (Ciudad de México)" y
elige una alcaldía; pon "Por separado" en sexo y en grupo de edad a la vez
para ver la rejilla de facetas. Con "Ver como: Mapa", haz clic en una entidad,
después en una alcaldía de la ciudad y en una AGEB; las migas suben.

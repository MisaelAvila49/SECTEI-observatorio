---
title: Mapa
sidebar: false
toc: false
footer: false
pager: false
---

```js
import {mapaUnificado} from "./components/mapa-unificado.js";

const [serie, lenguas, origen, clin, variantesCiudad, clinMunicipios, municipiosLenguas, catalogo, agebs, agebs2010, colonias, geoAlcaldias, geoLimite, geoEntidades] = await Promise.all([
  FileAttachment("data/serie_alcaldias.csv").csv({typed: true}),
  FileAttachment("data/lenguas_alcaldia.csv").csv({typed: true}),
  FileAttachment("data/lenguas_origen.csv").csv({typed: true}),
  FileAttachment("data/clin_variantes.csv").csv(),
  FileAttachment("data/variantes_ciudad.csv").csv(),
  FileAttachment("data/clin_municipios.csv").csv(),
  FileAttachment("data/municipios_lenguas.csv").csv(),
  FileAttachment("data/catalogo_lenguas.csv").csv(),
  FileAttachment("data/agebs_resumen.csv").csv({typed: true}),
  FileAttachment("data/agebs_resumen_2010.csv").csv({typed: true}),
  FileAttachment("data/colonias_resumen.csv").csv({typed: true}),
  FileAttachment("data/cdmx_alcaldias.geojson").json(),
  FileAttachment("data/cdmx_limite.geojson").json(),
  FileAttachment("data/mx_entidades.json").json(),
]);
// Las claves de tres dígitos y de lengua se leen como TEXTO: `typed` las
// convertiría en número y perderían el cero a la izquierda.
const texto = (filas, campos) => filas.map((r) => Object.fromEntries(Object.entries(r).map(([k, x]) => [k, campos.includes(k) ? String(x ?? "").padStart(k === "cve" && String(x).length <= 2 && x !== "09" ? 3 : 0, "0") : x])));
```

```js
const s = serie.map((r) => ({...r, cve: r.nivel === "entidad" ? "09" : String(r.cve).padStart(3, "0"), anio: Number(r.anio)}));
const l = lenguas.map((r) => ({...r, cve: r.nivel === "entidad" ? "09" : String(r.cve).padStart(3, "0"), lengua: String(r.lengua).padStart(4, "0"), anio: Number(r.anio)}));
const o = origen.map((r) => ({...r, lengua: String(r.lengua).padStart(4, "0"), ent: String(r.ent).padStart(3, "0"), mun: r.mun == null || r.mun === "" ? "" : String(r.mun).padStart(3, "0"), anio: Number(r.anio)}));
const vc = variantesCiudad.map((r) => ({...r, anio: Number(r.anio), num: Number(r.num), lengua: String(r.lengua).padStart(4, "0"), cve_alc: String(r.cve_alc ?? "").padStart(3, "0"), cve_ent: String(r.cve_ent ?? "").padStart(r.cve_ent ? 3 : 0, "0")}));
const cm = clinMunicipios.map((r) => ({...r, lengua: String(r.lengua).padStart(4, "0"), cve_ent: String(r.cve_ent).padStart(3, "0"), cve_mun: String(r.cve_mun).padStart(3, "0")}));
// Las teselas de municipios se publican cuando existen; si no, el botón del mapa de la lengua no aparece.
let pmtilesMunicipios = null;
try { pmtilesMunicipios = await FileAttachment("data/municipios.pmtiles").url(); } catch { pmtilesMunicipios = null; }
// Edición 2010 por AGEB y manzana (scripts/construir_2010.py): si faltan sus teselas, el año por esos niveles se queda en 2020.
let pmtilesManzanas2010 = null, pmtilesAgebs2010 = null;
try { pmtilesManzanas2010 = await FileAttachment("data/manzanas_2010.pmtiles").url(); } catch { pmtilesManzanas2010 = null; }
try { pmtilesAgebs2010 = await FileAttachment("data/agebs_2010.pmtiles").url(); } catch { pmtilesAgebs2010 = null; }
const serieEdad = (await FileAttachment("data/serie_alcaldias_edad.csv").csv({typed: true})).map((r) => ({...r, anio: Number(r.anio), cve: String(r.cve).padStart(r.nivel === "entidad" ? 2 : 3, "0")}));
const mapa = mapaUnificado({
  serie: s, serieEdad, lenguas: l, origen: o, clin, variantesCiudad: vc, clinMunicipios: cm,
  municipiosLenguas: municipiosLenguas.map((r) => ({cve: String(r.cve).padStart(5, "0"), lengua: String(r.lengua).padStart(4, "0"), hablantes: Number(r.hablantes)})),
  catalogo, agebs, agebs2010, colonias,
  pmtilesManzanas: await FileAttachment("data/manzanas.pmtiles").url(),
  pmtilesAgebs: await FileAttachment("data/agebs.pmtiles").url(),
  pmtilesMunicipios, pmtilesManzanas2010, pmtilesAgebs2010,
  geoAlcaldias, geoLimite, geoEntidades,
});
```

<div class="mapa-cabecera">
  <a class="mapa-cabecera-marca" href="./">Grupos originarios <span>Social Data Ibero</span></a>
  <h1 class="mapa-cabecera-titulo">Población indígena en la Ciudad de México</h1>
  <nav class="mapa-cabecera-nav" aria-label="Secciones"><a href="./libro/lenguas-de-mexico">Temas</a><a href="./metodologia">Metodología</a></nav>
</div>

```js
display(mapa.nodo);
```

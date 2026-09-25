---
title: Mapa
sidebar: false
toc: false
footer: false
pager: false
---

```js
import {mapaUnificado} from "./components/mapa-unificado.js";

const [serie, lenguas, origen, clin, catalogo, agebs, colonias, geoAlcaldias, geoLimite, geoEntidades] = await Promise.all([
  FileAttachment("data/serie_alcaldias.csv").csv({typed: true}),
  FileAttachment("data/lenguas_alcaldia.csv").csv({typed: true}),
  FileAttachment("data/lenguas_origen.csv").csv({typed: true}),
  FileAttachment("data/clin_variantes.csv").csv(),
  FileAttachment("data/catalogo_lenguas.csv").csv(),
  FileAttachment("data/agebs_resumen.csv").csv({typed: true}),
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
const mapa = mapaUnificado({
  serie: s, lenguas: l, origen: o, clin, catalogo, agebs, colonias,
  pmtilesManzanas: await FileAttachment("data/manzanas.pmtiles").url(),
  pmtilesAgebs: await FileAttachment("data/agebs.pmtiles").url(),
  geoAlcaldias, geoLimite, geoEntidades,
});
```

<div class="mapa-cabecera">
  <a class="mapa-cabecera-marca" href="./">Grupos originarios <span>Social Data Ibero</span></a>
  <h1 class="mapa-cabecera-titulo">Población indígena en la Ciudad de México</h1>
  <nav class="mapa-cabecera-nav" aria-label="Secciones"><a href="./encuestas/censo/vivienda">Análisis</a><a href="./metodologia/definiciones">Definiciones</a><a href="./metodologia/fuentes">Fuentes</a></nav>
</div>

```js
display(mapa.nodo);
```

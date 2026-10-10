---
title: Acceso en el hogar, 2020 - 2024
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {conEntrada} from "../../components/graficas.js";
import {leerParquet} from "../../components/agregar.js";
// Los parquet se piden a la vez, no uno tras otro.
const [datos, datosEscolaridad, datosEstrato, datosDecil] = await Promise.all([
  leerParquet(FileAttachment("../../data/indicadores/enigh-hogar.parquet")),
  leerParquet(FileAttachment("../../data/indicadores/enigh-hogar_escolaridad.parquet")),
  leerParquet(FileAttachment("../../data/indicadores/enigh-hogar_estrato.parquet")),
  leerParquet(FileAttachment("../../data/indicadores/enigh-hogar_decil.parquet")),
]);
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<header class="portada-capitulo">
  <div class="portada-capitulo-arte" data-motivo="parte-4"><svg class="motivo motivo-vivienda" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><path class="a-dib f0" pathLength="1" d="M100,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f3" d="M86.5,189.2 A18,18 0 0 1 113.5,189.2" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f4" d="M76,180.8 A32,32 0 0 1 124,180.8" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f5" d="M65.5,172.4 A46,46 0 0 1 134.5,172.4" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f2" pathLength="1" d="M200,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-dib f3" pathLength="1" d="M300,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f6" d="M286.5,189.2 A18,18 0 0 1 313.5,189.2" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f7" d="M276,180.8 A32,32 0 0 1 324,180.8" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f8" d="M265.5,172.4 A46,46 0 0 1 334.5,172.4" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f5" pathLength="1" d="M400,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f8" d="M386.5,189.2 A18,18 0 0 1 413.5,189.2" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f9" d="M376,180.8 A32,32 0 0 1 424,180.8" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f10" d="M365.5,172.4 A46,46 0 0 1 434.5,172.4" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f6" pathLength="1" d="M500,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><line x1="40" x2="560" y1="320" y2="320" stroke="#8a8a86" stroke-width="1.5"/></svg></div>
  <div class="portada-capitulo-texto">
  <p class="portada-capitulo-parte">Parte 4 · La brecha digital · 2 de 5</p>
  <h1>Acceso en el hogar, 2020 - 2024</h1>
  <p class="portada-capitulo-dek">La ENIGH aporta lo que el Censo no puede: el tiempo y el ingreso.</p>
  </div>
</header>

<p class="entrada-capitulo">Hace la misma pregunta cada dos años y la cruza con lo que gana el hogar. No repite el mapa; muestra cómo se mueve la brecha y entre qué hogares.</p>

```js
const secciones = seccionesTema("enigh-hogar", datos, {geoEntidades, datosEscolaridad, datosEstrato, datosDecil, fuentes});
```

---

<h2 id="internet" class="toc-anchor">La conexión del hogar en tres ediciones</h2>

```js
display(conEntrada(secciones[0], "Seguir la misma pregunta en 2020, 2022 y 2024 muestra si la distancia entre la población indígena y el resto se cierra, se mantiene o crece."));
```
---

<h2 id="ingreso" class="toc-anchor">La conexión según el ingreso del hogar</h2>

```js
display(conEntrada(secciones[1], "El ingreso es la explicación más inmediata de quién tiene conexión. Comparar dentro de cada decil permite ver si la distancia se mantiene entre hogares de ingreso parecido."));
```
---

<h2 id="dispositivos" class="toc-anchor">Dispositivos y servicios del hogar</h2>

```js
display(conEntrada(secciones[2], "Los mismos cortes, aplicados a los aparatos y servicios con que cuenta el hogar."));
```

<div class="relato-cierre">
  <p>Que un hogar tenga internet no significa que todas las personas que viven en él lo usen. Eso solo lo sabe una encuesta que pregunte a cada persona.</p>
  <a class="book-cta book-cta-primary" href="../endutih/uso">Sigue: Quién usa internet</a>
</div>

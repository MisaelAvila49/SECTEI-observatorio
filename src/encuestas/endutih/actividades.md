---
title: Para qué se usa internet
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {conEntrada} from "../../components/graficas.js";
import {leerParquet} from "../../components/agregar.js";
// Los parquet se piden a la vez, no uno tras otro.
const [datos, datosEscolaridad, datosEstrato] = await Promise.all([
  leerParquet(FileAttachment("../../data/indicadores/endutih-actividades.parquet")),
  leerParquet(FileAttachment("../../data/indicadores/endutih-actividades_escolaridad.parquet")),
  leerParquet(FileAttachment("../../data/indicadores/endutih-actividades_estrato.parquet")),
]);
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<header class="portada-capitulo">
  <div class="portada-capitulo-arte" data-motivo="parte-4"><svg class="motivo motivo-vivienda" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><path class="a-dib f0" pathLength="1" d="M100,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f3" d="M86.5,189.2 A18,18 0 0 1 113.5,189.2" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f4" d="M76,180.8 A32,32 0 0 1 124,180.8" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f5" d="M65.5,172.4 A46,46 0 0 1 134.5,172.4" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f2" pathLength="1" d="M200,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-dib f3" pathLength="1" d="M300,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f6" d="M286.5,189.2 A18,18 0 0 1 313.5,189.2" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f7" d="M276,180.8 A32,32 0 0 1 324,180.8" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f8" d="M265.5,172.4 A46,46 0 0 1 334.5,172.4" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f5" pathLength="1" d="M400,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f8" d="M386.5,189.2 A18,18 0 0 1 413.5,189.2" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f9" d="M376,180.8 A32,32 0 0 1 424,180.8" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f10" d="M365.5,172.4 A46,46 0 0 1 434.5,172.4" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f6" pathLength="1" d="M500,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><line x1="40" x2="560" y1="320" y2="320" stroke="#8a8a86" stroke-width="1.5"/></svg></div>
  <div class="portada-capitulo-texto">
  <p class="portada-capitulo-parte">Parte 4 · La brecha digital · 4 de 5</p>
  <h1>Para qué se usa internet</h1>
  <p class="portada-capitulo-dek">Esta página mira qué hacen en internet quienes ya lo usan, y si la población indígena lo usa para lo mismo que el resto.</p>
  </div>
</header>

<p class="entrada-capitulo">Todos sus indicadores se calculan solo entre quienes se conectan.</p>

```js
const secciones = seccionesTema("endutih-actividades", datos, {geoEntidades, datosEscolaridad, datosEstrato, fuentes});
```

---

<h2 id="escolar" class="toc-anchor">Usa internet para actividades escolares</h2>

```js
display(conEntrada(secciones[0], "La escuela es uno de los usos donde la conexión pesa más para niñas, niños y jóvenes."));
```
---

<h2 id="estudiar-trabajar" class="toc-anchor">Estudiar, trabajar e informarse</h2>

```js
display(conEntrada(secciones[1], "Son los usos que amplían oportunidades: aprender, trabajar y saber qué pasa."));
```
---

<h2 id="tramites-dinero" class="toc-anchor">Trámites, dinero y compras</h2>

```js
display(conEntrada(secciones[2], "Cada vez más trámites, pagos y servicios financieros se hacen en línea. Quien no los hace por internet depende de ventanillas y traslados."));
```
---

<h2 id="comunicarse" class="toc-anchor">Comunicarse y entretenerse</h2>

```js
display(conEntrada(secciones[3], "Son los usos más extendidos, y sirven de referencia para medir los demás."));
```
---

<h2 id="habilidades" class="toc-anchor">Habilidades y riesgos</h2>

```js
display(conEntrada(secciones[4], "Usar internet con provecho requiere saber hacerlo y cuidarse. Aquí se pregunta por las dos cosas."));
```

<div class="relato-cierre">
  <p>Queda la otra cara de esta parte: quienes no se conectan.</p>
  <a class="book-cta book-cta-primary" href="./barreras">Sigue: Quién no se conecta</a>
</div>

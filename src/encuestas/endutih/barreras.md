---
title: Quién no se conecta y por qué
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {conEntrada} from "../../components/graficas.js";
import {leerParquet} from "../../components/agregar.js";
// Los parquet se piden a la vez, no uno tras otro.
const [datos, datosEscolaridad, datosEstrato] = await Promise.all([
  leerParquet(FileAttachment("../../data/indicadores/endutih-barreras.parquet")),
  leerParquet(FileAttachment("../../data/indicadores/endutih-barreras_escolaridad.parquet")),
  leerParquet(FileAttachment("../../data/indicadores/endutih-barreras_estrato.parquet")),
]);
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<header class="portada-capitulo">
  <div class="portada-capitulo-arte" data-motivo="parte-4"><svg class="motivo motivo-vivienda" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><path class="a-dib f0" pathLength="1" d="M100,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f3" d="M86.5,189.2 A18,18 0 0 1 113.5,189.2" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f4" d="M76,180.8 A32,32 0 0 1 124,180.8" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f5" d="M65.5,172.4 A46,46 0 0 1 134.5,172.4" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f2" pathLength="1" d="M200,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-dib f3" pathLength="1" d="M300,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f6" d="M286.5,189.2 A18,18 0 0 1 313.5,189.2" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f7" d="M276,180.8 A32,32 0 0 1 324,180.8" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f8" d="M265.5,172.4 A46,46 0 0 1 334.5,172.4" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f5" pathLength="1" d="M400,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f8" d="M386.5,189.2 A18,18 0 0 1 413.5,189.2" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f9" d="M376,180.8 A32,32 0 0 1 424,180.8" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f10" d="M365.5,172.4 A46,46 0 0 1 434.5,172.4" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f6" pathLength="1" d="M500,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><line x1="40" x2="560" y1="320" y2="320" stroke="#8a8a86" stroke-width="1.5"/></svg></div>
  <div class="portada-capitulo-texto">
  <p class="portada-capitulo-parte">Parte 4 · La brecha digital · 5 de 5</p>
  <h1>Quién no se conecta y por qué</h1>
  <p class="portada-capitulo-dek">La última página de esta parte mira a quienes quedan fuera y les pregunta por qué.</p>
  </div>
</header>

<p class="entrada-capitulo">La razón importa, porque no se resuelve igual la falta de dinero que la falta de cobertura, de interés o de saber cómo usarlo.</p>

```js
const secciones = seccionesTema("endutih-barreras", datos, {geoEntidades, datosEscolaridad, datosEstrato, fuentes});
```

---

<h2 id="desconexion" class="toc-anchor">No usa internet ni celular</h2>

```js
display(conEntrada(secciones[0], "Es la medida de la desconexión completa: personas que no usan ninguno de los dos."));
```
---

<h2 id="fuera" class="toc-anchor">Quién queda fuera</h2>

```js
display(conEntrada(secciones[1], "La desconexión se cruza con la edad, el sexo, la escolaridad y el tamaño de la localidad para ver en qué grupos se concentra."));
```
---

<h2 id="motivo-internet" class="toc-anchor">Por qué no usa internet</h2>

```js
display(conEntrada(secciones[2], "Los motivos que declaran las propias personas."));
```
---

<h2 id="motivo-computadora" class="toc-anchor">Por qué no usa computadora</h2>

```js
display(conEntrada(secciones[3], "La computadora tiene sus propios motivos, distintos de los de internet."));
```
---

<h2 id="motivo-celular" class="toc-anchor">Por qué no dispone de celular</h2>

```js
display(conEntrada(secciones[4], "El celular es el aparato más extendido; quien no lo tiene explica por qué."));
```
---

<h2 id="motivo-hogar" class="toc-anchor">Por qué el hogar no tiene internet</h2>

```js
display(conEntrada(secciones[5], "La misma pregunta, hecha al hogar."));
```

<div class="relato-cierre">
  <p>La brecha digital es una desigualdad que se mide en aparatos y conexiones. Otras se miden preguntando a las personas qué han vivido. La quinta parte trata de ellas.</p>
  <a class="book-cta book-cta-primary" href="../../libro/discriminacion">Sigue: Discriminación</a>
</div>

---
title: Quién usa internet y con qué
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {conEntrada} from "../../components/graficas.js";
import {leerParquet} from "../../components/agregar.js";
// Los parquet se piden a la vez, no uno tras otro.
const [datos, datosEscolaridad, datosEstrato] = await Promise.all([
  leerParquet(FileAttachment("../../data/indicadores/endutih-uso.parquet")),
  leerParquet(FileAttachment("../../data/indicadores/endutih-uso_escolaridad.parquet")),
  leerParquet(FileAttachment("../../data/indicadores/endutih-uso_estrato.parquet")),
]);
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<header class="portada-capitulo">
  <div class="portada-capitulo-arte" data-motivo="parte-4"><svg class="motivo motivo-vivienda" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><path class="a-dib f0" pathLength="1" d="M100,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f3" d="M86.5,189.2 A18,18 0 0 1 113.5,189.2" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f4" d="M76,180.8 A32,32 0 0 1 124,180.8" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f5" d="M65.5,172.4 A46,46 0 0 1 134.5,172.4" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f2" pathLength="1" d="M200,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-dib f3" pathLength="1" d="M300,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f6" d="M286.5,189.2 A18,18 0 0 1 313.5,189.2" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f7" d="M276,180.8 A32,32 0 0 1 324,180.8" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f8" d="M265.5,172.4 A46,46 0 0 1 334.5,172.4" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f5" pathLength="1" d="M400,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f8" d="M386.5,189.2 A18,18 0 0 1 413.5,189.2" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f9" d="M376,180.8 A32,32 0 0 1 424,180.8" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f10" d="M365.5,172.4 A46,46 0 0 1 434.5,172.4" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f6" pathLength="1" d="M500,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><line x1="40" x2="560" y1="320" y2="320" stroke="#8a8a86" stroke-width="1.5"/></svg></div>
  <div class="portada-capitulo-texto">
  <p class="portada-capitulo-parte">Parte 4 · La brecha digital · 3 de 5</p>
  <h1>Quién usa internet y con qué</h1>
  <p class="portada-capitulo-dek">La ENDUTIH aporta a la persona: pregunta a cada quien, y no al hogar, si usó internet, con qué equipo y desde dónde.</p>
  </div>
</header>

<p class="entrada-capitulo">Desde 2025 identifica a la población indígena, y es la única fuente que permite ver el uso por edad.</p>

```js
const secciones = seccionesTema("endutih-uso", datos, {geoEntidades, datosEscolaridad, datosEstrato, fuentes});
```

---

<h2 id="usa-internet" class="toc-anchor">Usa internet</h2>

```js
display(conEntrada(secciones[0], "El uso personal es la medida más directa de la brecha: cuenta a quien se conecta, tenga o no conexión en casa. Se abre por grupo de edad, un corte que solo permite una fuente que pregunta persona por persona."));
```
---

<h2 id="dispositivos" class="toc-anchor">Dispositivos y conexión</h2>

```js
display(conEntrada(secciones[1], "Con qué aparatos cuenta cada persona y qué tipo de conexión tiene describen las condiciones en que se conecta."));
```
---

<h2 id="equipo-lugar" class="toc-anchor">Desde qué equipo y en qué lugar</h2>

```js
display(conEntrada(secciones[2], "Conectarse solo desde un celular, o solo fuera de casa, limita lo que se puede hacer en línea. Por eso se pregunta desde dónde y con qué."));
```
---

<h2 id="hogar" class="toc-anchor">El hogar de quien responde</h2>

```js
display(conEntrada(secciones[3], "Las condiciones del hogar ponen en contexto el uso de cada persona."));
```

<div class="relato-cierre">
  <p>Conectarse es un medio. Falta saber para qué se usa.</p>
  <a class="book-cta book-cta-primary" href="./actividades">Sigue: Para qué se usa internet</a>
</div>

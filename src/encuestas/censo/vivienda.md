---
title: Conectividad en la vivienda
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {conEntrada} from "../../components/graficas.js";
import {leerParquet} from "../../components/agregar.js";
// Los parquet se piden a la vez, no uno tras otro.
const [datos, datosEscolaridad] = await Promise.all([
  leerParquet(FileAttachment("../../data/indicadores/censo-vivienda.parquet")),
  leerParquet(FileAttachment("../../data/indicadores/censo-vivienda_escolaridad.parquet")),
]);
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<header class="portada-capitulo">
  <div class="portada-capitulo-arte" data-motivo="parte-4"><svg class="motivo motivo-vivienda" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><path class="a-dib f0" pathLength="1" d="M100,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f3" d="M86.5,189.2 A18,18 0 0 1 113.5,189.2" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f4" d="M76,180.8 A32,32 0 0 1 124,180.8" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f5" d="M65.5,172.4 A46,46 0 0 1 134.5,172.4" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f2" pathLength="1" d="M200,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-dib f3" pathLength="1" d="M300,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f6" d="M286.5,189.2 A18,18 0 0 1 313.5,189.2" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f7" d="M276,180.8 A32,32 0 0 1 324,180.8" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f8" d="M265.5,172.4 A46,46 0 0 1 334.5,172.4" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f5" pathLength="1" d="M400,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f8" d="M386.5,189.2 A18,18 0 0 1 413.5,189.2" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f9" d="M376,180.8 A32,32 0 0 1 424,180.8" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f10" d="M365.5,172.4 A46,46 0 0 1 434.5,172.4" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f6" pathLength="1" d="M500,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><line x1="40" x2="560" y1="320" y2="320" stroke="#8a8a86" stroke-width="1.5"/></svg></div>
  <div class="portada-capitulo-texto">
  <p class="portada-capitulo-parte">Parte 4 · La brecha digital · 1 de 5</p>
  <h1>Conectividad en la vivienda</h1>
  <p class="portada-capitulo-dek">La cuarta parte trata de la brecha digital con tres fuentes, y cada una aporta algo que las otras no pueden.</p>
  </div>
</header>

<p class="entrada-capitulo">El Censo 2020 aporta el territorio: es la única con muestra suficiente para comparar las 32 entidades, y por eso esta página abre con el mapa.</p>

```js
const secciones = seccionesTema("censo-vivienda", datos, {geoEntidades, datosEscolaridad, fuentes});
```

---

<h2 id="internet" class="toc-anchor">Vive en una vivienda con internet</h2>

```js
display(conEntrada(secciones[0], "Tener internet en casa es el primer escalón: sin conexión en la vivienda, estudiar, trabajar o hacer un trámite en línea depende de salir a buscarla. El mapa compara, entidad por entidad, a la población indígena con el resto."));
```
---

<h2 id="dispositivos" class="toc-anchor">Dispositivos para conectarse</h2>

```js
display(conEntrada(secciones[1], "La conexión sirve según el aparato con que se usa. Un celular y una computadora no permiten hacer lo mismo, y por eso se cuentan por separado."));
```
---

<h2 id="otros-servicios" class="toc-anchor">Otros servicios de comunicación</h2>

```js
display(conEntrada(secciones[2], "La radio, la televisión y el teléfono completan el panorama: muestran por qué medios llega la información a una vivienda."));
```

<div class="relato-cierre">
  <p>El Censo es una foto de un año y no pregunta por el ingreso. Para saber si la brecha cambia y cuánto pesa el dinero hace falta otra fuente.</p>
  <a class="book-cta book-cta-primary" href="../enigh/hogar">Sigue: Acceso en el hogar</a>
</div>

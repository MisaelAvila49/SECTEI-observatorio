---
title: Acceso en el hogar, 2020 - 2024
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {conEntrada} from "../../components/graficas.js";
import {materializar} from "../../components/agregar.js";
const datos = materializar(await FileAttachment("../../data/indicadores/enigh-hogar.parquet").parquet());
const datosEscolaridad = materializar(await FileAttachment("../../data/indicadores/enigh-hogar_escolaridad.parquet").parquet());
const datosEstrato = materializar(await FileAttachment("../../data/indicadores/enigh-hogar_estrato.parquet").parquet());
const datosDecil = materializar(await FileAttachment("../../data/indicadores/enigh-hogar_decil.parquet").parquet());
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<div class="hero-pagina">
  <span class="kicker">Parte 4 · La brecha digital · 2 de 5</span>
  <h1>Acceso en el hogar, 2020 - 2024</h1>
  <p class="hero-entrada">La ENIGH aporta lo que el Censo no puede: el tiempo y el ingreso. Hace la misma pregunta cada dos años y la cruza con lo que gana el hogar. No repite el mapa; muestra cómo se mueve la brecha y entre qué hogares.</p>
</div>

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

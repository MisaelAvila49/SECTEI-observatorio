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
  <p class="hero-entrada">La ENIGH hace la misma pregunta cada dos años y la cruza con el ingreso del hogar. Es la única de las tres fuentes que permite ver el cambio en el tiempo.</p>
</div>

```js
const secciones = seccionesTema("enigh-hogar", datos, {geoEntidades, datosEscolaridad, datosEstrato, datosDecil, fuentes});
```

---

<h2 id="internet" class="toc-anchor">Vive en un hogar con conexión a internet</h2>

```js
display(conEntrada(secciones[0], "Seguir la conexión en tres ediciones muestra si la distancia entre los hogares indígenas y el resto se cierra. El decil de ingreso permite ver qué parte de esa distancia va junto con el ingreso."));
```
---

<h2 id="dispositivos" class="toc-anchor">Dispositivos y servicios del hogar</h2>

```js
display(conEntrada(secciones[1], "Los mismos cortes, aplicados a los aparatos y servicios con que cuenta el hogar."));
```

<div class="relato-cierre">
  <p>Que un hogar tenga internet no significa que todas las personas que viven en él lo usen.</p>
  <a class="book-cta book-cta-primary" href="../endutih/uso">Sigue: Quién usa internet</a>
</div>

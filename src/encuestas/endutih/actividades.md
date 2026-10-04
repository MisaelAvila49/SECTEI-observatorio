---
title: Para qué se usa internet
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {conEntrada} from "../../components/graficas.js";
import {materializar} from "../../components/agregar.js";
const datos = materializar(await FileAttachment("../../data/indicadores/endutih-actividades.parquet").parquet());
const datosEscolaridad = materializar(await FileAttachment("../../data/indicadores/endutih-actividades_escolaridad.parquet").parquet());
const datosEstrato = materializar(await FileAttachment("../../data/indicadores/endutih-actividades_estrato.parquet").parquet());
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<div class="hero-pagina">
  <span class="kicker">Parte 4 · La brecha digital · 4 de 5</span>
  <h1>Para qué se usa internet</h1>
  <p class="hero-entrada">Esta página mira qué hacen en internet quienes ya lo usan, y si la población indígena lo usa para lo mismo que el resto. Todos sus indicadores se calculan solo entre quienes se conectan.</p>
</div>

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

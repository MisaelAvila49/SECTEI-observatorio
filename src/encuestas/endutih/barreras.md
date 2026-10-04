---
title: Quién no se conecta y por qué
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {conEntrada} from "../../components/graficas.js";
import {materializar} from "../../components/agregar.js";
const datos = materializar(await FileAttachment("../../data/indicadores/endutih-barreras.parquet").parquet());
const datosEscolaridad = materializar(await FileAttachment("../../data/indicadores/endutih-barreras_escolaridad.parquet").parquet());
const datosEstrato = materializar(await FileAttachment("../../data/indicadores/endutih-barreras_estrato.parquet").parquet());
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<div class="hero-pagina">
  <span class="kicker">Parte 4 · La brecha digital · 5 de 5</span>
  <h1>Quién no se conecta y por qué</h1>
  <p class="hero-entrada">La última página de esta parte mira a quienes quedan fuera y les pregunta por qué. La razón importa, porque no se resuelve igual la falta de dinero que la falta de cobertura, de interés o de saber cómo usarlo.</p>
</div>

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

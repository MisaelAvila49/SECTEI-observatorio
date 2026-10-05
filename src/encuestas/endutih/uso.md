---
title: Quién usa internet y con qué
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {conEntrada} from "../../components/graficas.js";
import {materializar} from "../../components/agregar.js";
const datos = materializar(await FileAttachment("../../data/indicadores/endutih-uso.parquet").parquet());
const datosEscolaridad = materializar(await FileAttachment("../../data/indicadores/endutih-uso_escolaridad.parquet").parquet());
const datosEstrato = materializar(await FileAttachment("../../data/indicadores/endutih-uso_estrato.parquet").parquet());
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<div class="hero-pagina">
  <span class="kicker">Parte 4 · La brecha digital · 3 de 5</span>
  <h1>Quién usa internet y con qué</h1>
  <p class="hero-entrada">La ENDUTIH aporta a la persona: pregunta a cada quien, y no al hogar, si usó internet, con qué equipo y desde dónde. Desde 2025 identifica a la población indígena, y es la única fuente que permite ver el uso por edad.</p>
</div>

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

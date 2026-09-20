---
title: Quién usa internet y con qué
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {verTambien} from "../../components/navegacion.js";
import {materializar} from "../../components/agregar.js";
const datos = materializar(await FileAttachment("../../data/indicadores/endutih-uso.parquet").parquet());
const datosEscolaridad = materializar(await FileAttachment("../../data/indicadores/endutih-uso_escolaridad.parquet").parquet());
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<div class="hero-pagina">
  <span class="kicker">ENDUTIH 2025</span>
  <h1>Quién usa internet y con qué</h1>
  <p class="hero-entrada">La ENDUTIH pregunta a cada persona de 6 años o más si usó internet, computadora y celular en los últimos tres meses, con qué equipo y desde dónde. Desde 2025 pregunta también si habla lengua indígena y si se considera indígena: es la única fuente de uso personal con ese corte.</p>
</div>

```js
const secciones = seccionesTema("endutih-uso", datos, {geoEntidades, datosEscolaridad, fuentes});
```

---

<h2 id="usa-internet" class="toc-anchor">Usa internet</h2>

```js
display(secciones[0]);
```
---

<h2 id="dispositivos" class="toc-anchor">Dispositivos y conexión</h2>

```js
display(secciones[1]);
```
---

<h2 id="equipo-lugar" class="toc-anchor">Desde qué equipo y en qué lugar</h2>

```js
display(secciones[2]);
```
---

<h2 id="hogar" class="toc-anchor">El hogar de quien responde</h2>

```js
display(secciones[3]);
```

---

```js
display(verTambien([
  {ruta: "/encuestas/endutih/actividades", titulo: "Para qué se usa internet", nota: "Estudiar, trabajar, trámites, dinero y entretenimiento, entre quienes se conectan."},
  {ruta: "/encuestas/endutih/barreras", titulo: "Quién no se conecta y por qué", nota: "Cuánta gente queda fuera y qué motivo declara."},
  {ruta: "/encuestas/censo/vivienda", titulo: "Conectividad en la vivienda", nota: "Lo que hay en la vivienda según el Censo 2020, con cortes por entidad y edad."}
]));
```

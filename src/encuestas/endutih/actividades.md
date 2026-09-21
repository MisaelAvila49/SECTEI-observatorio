---
title: Para qué se usa internet
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {verTambien} from "../../components/navegacion.js";
import {materializar} from "../../components/agregar.js";
const datos = materializar(await FileAttachment("../../data/indicadores/endutih-actividades.parquet").parquet());
const datosEscolaridad = materializar(await FileAttachment("../../data/indicadores/endutih-actividades_escolaridad.parquet").parquet());
const datosEstrato = materializar(await FileAttachment("../../data/indicadores/endutih-actividades_estrato.parquet").parquet());
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<div class="hero-pagina">
  <span class="kicker">ENDUTIH 2025</span>
  <h1>Para qué se usa internet</h1>
  <p class="hero-entrada">Entre quienes usan internet, la ENDUTIH pregunta para qué: estudiar, trabajar, informarse, hacer trámites, manejar dinero, comunicarse y entretenerse. Los indicadores de esta página se calculan solo entre quienes usan internet.</p>
</div>

```js
const secciones = seccionesTema("endutih-actividades", datos, {geoEntidades, datosEscolaridad, datosEstrato, fuentes});
```

---

<h2 id="escolar" class="toc-anchor">Usa internet para actividades escolares</h2>

```js
display(secciones[0]);
```
---

<h2 id="estudiar-trabajar" class="toc-anchor">Estudiar, trabajar e informarse</h2>

```js
display(secciones[1]);
```
---

<h2 id="tramites-dinero" class="toc-anchor">Trámites, dinero y compras</h2>

```js
display(secciones[2]);
```
---

<h2 id="comunicarse" class="toc-anchor">Comunicarse y entretenerse</h2>

```js
display(secciones[3]);
```
---

<h2 id="habilidades" class="toc-anchor">Habilidades y riesgos</h2>

```js
display(secciones[4]);
```

---

```js
display(verTambien([
  {ruta: "/encuestas/endutih/uso", titulo: "Quién usa internet y con qué", nota: "El acceso: quién se conecta, con qué equipo y desde dónde."},
  {ruta: "/encuestas/endutih/barreras", titulo: "Quién no se conecta y por qué", nota: "Cuánta gente queda fuera y qué motivo declara."}
]));
```

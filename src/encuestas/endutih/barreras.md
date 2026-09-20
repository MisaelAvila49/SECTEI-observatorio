---
title: Quién no se conecta y por qué
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {verTambien} from "../../components/navegacion.js";
import {materializar} from "../../components/agregar.js";
const datos = materializar(await FileAttachment("../../data/indicadores/endutih-barreras.parquet").parquet());
const datosEscolaridad = materializar(await FileAttachment("../../data/indicadores/endutih-barreras_escolaridad.parquet").parquet());
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<div class="hero-pagina">
  <span class="kicker">ENDUTIH 2025</span>
  <h1>Quién no se conecta y por qué</h1>
  <p class="hero-entrada">La ENDUTIH pregunta a quien no usa internet, computadora o celular por qué no lo hace, y al hogar sin internet por qué no lo tiene. Esta página mide primero cuánta gente queda fuera y luego qué motivo declara cada grupo.</p>
</div>

```js
const secciones = seccionesTema("endutih-barreras", datos, {geoEntidades, datosEscolaridad, fuentes});
```

---

<h2 id="desconexion" class="toc-anchor">No usa internet ni celular</h2>

```js
display(secciones[0]);
```
---

<h2 id="fuera" class="toc-anchor">Quién queda fuera</h2>

```js
display(secciones[1]);
```
---

<h2 id="motivo-internet" class="toc-anchor">Por qué no usa internet</h2>

```js
display(secciones[2]);
```
---

<h2 id="motivo-computadora" class="toc-anchor">Por qué no usa computadora</h2>

```js
display(secciones[3]);
```
---

<h2 id="motivo-celular" class="toc-anchor">Por qué no dispone de celular</h2>

```js
display(secciones[4]);
```
---

<h2 id="motivo-hogar" class="toc-anchor">Por qué el hogar no tiene internet</h2>

```js
display(secciones[5]);
```

---

```js
display(verTambien([
  {ruta: "/encuestas/endutih/uso", titulo: "Quién usa internet y con qué", nota: "El acceso: quién se conecta, con qué equipo y desde dónde."},
  {ruta: "/encuestas/endutih/actividades", titulo: "Para qué se usa internet", nota: "Estudiar, trabajar, trámites, dinero y entretenimiento, entre quienes se conectan."}
]));
```

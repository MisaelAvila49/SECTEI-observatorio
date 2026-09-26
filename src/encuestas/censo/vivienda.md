---
draft: true
title: Conectividad en la vivienda
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {verTambien} from "../../components/navegacion.js";
import {materializar} from "../../components/agregar.js";
const datos = materializar(await FileAttachment("../../data/indicadores/censo-vivienda.parquet").parquet());
const datosEscolaridad = materializar(await FileAttachment("../../data/indicadores/censo-vivienda_escolaridad.parquet").parquet());
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<div class="hero-pagina">
  <span class="kicker">Censo 2020</span>
  <h1>Conectividad en la vivienda</h1>
  <p class="hero-entrada">El Censo 2020 pregunta a cada vivienda si dispone de internet, celular, computadora y otros servicios. Esta página cuenta a las personas de 6 años o más según lo que hay en su vivienda, por condición indígena.</p>
</div>

```js
const secciones = seccionesTema("censo-vivienda", datos, {geoEntidades, datosEscolaridad, fuentes});
```

---

<h2 id="internet" class="toc-anchor">Vive en una vivienda con internet</h2>

```js
display(secciones[0]);
```
---

<h2 id="dispositivos" class="toc-anchor">Dispositivos para conectarse</h2>

```js
display(secciones[1]);
```
---

<h2 id="otros-servicios" class="toc-anchor">Otros servicios de comunicación</h2>

```js
display(secciones[2]);
```

---

```js
display(verTambien([
  {ruta: "/encuestas/enigh/hogar", titulo: "Acceso en el hogar, 2020 - 2024", nota: "La misma pregunta en tres ediciones de la ENIGH, con decil de ingreso."},
  {ruta: "/mapa", titulo: "Mapa de la Ciudad de México", nota: "Dónde vive la población en hogares indígenas de la ciudad, manzana por manzana."}
]));
```

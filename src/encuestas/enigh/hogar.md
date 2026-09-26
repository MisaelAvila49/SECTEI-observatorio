---
draft: true
title: Acceso en el hogar, 2020 - 2024
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {verTambien} from "../../components/navegacion.js";
import {materializar} from "../../components/agregar.js";
const datos = materializar(await FileAttachment("../../data/indicadores/enigh-hogar.parquet").parquet());
const datosEscolaridad = materializar(await FileAttachment("../../data/indicadores/enigh-hogar_escolaridad.parquet").parquet());
const datosEstrato = materializar(await FileAttachment("../../data/indicadores/enigh-hogar_estrato.parquet").parquet());
const datosDecil = materializar(await FileAttachment("../../data/indicadores/enigh-hogar_decil.parquet").parquet());
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<div class="hero-pagina">
  <span class="kicker">ENIGH</span>
  <h1>Acceso en el hogar, 2020 - 2024</h1>
  <p class="hero-entrada">La ENIGH pregunta a cada hogar si tiene internet, celular, computadora y otros servicios, con la misma pregunta cada dos años. Esta página muestra las ediciones 2020, 2022 y 2024 por condición indígena, con decil de ingreso.</p>
</div>

```js
const secciones = seccionesTema("enigh-hogar", datos, {geoEntidades, datosEscolaridad, datosEstrato, datosDecil, fuentes});
```

---

<h2 id="internet" class="toc-anchor">Vive en un hogar con conexión a internet</h2>

```js
display(secciones[0]);
```
---

<h2 id="dispositivos" class="toc-anchor">Dispositivos y servicios del hogar</h2>

```js
display(secciones[1]);
```

---

```js
display(verTambien([
  {ruta: "/encuestas/censo/vivienda", titulo: "Conectividad en la vivienda", nota: "La misma pregunta con la muestra ampliada del Censo 2020, que permite cortes más finos."},
]));
```

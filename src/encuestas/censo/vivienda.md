---
title: Conectividad en la vivienda
---

```js
import {seccionesTema} from "../../components/tablero.js";
import {catalogo} from "../../components/fuentes.js";
import {conEntrada} from "../../components/graficas.js";
import {materializar} from "../../components/agregar.js";
const datos = materializar(await FileAttachment("../../data/indicadores/censo-vivienda.parquet").parquet());
const datosEscolaridad = materializar(await FileAttachment("../../data/indicadores/censo-vivienda_escolaridad.parquet").parquet());
const geoEntidades = await FileAttachment("../../data/mx_entidades.json").json();
const fuentes = catalogo(await FileAttachment("../../data/fuentes.csv").csv());
```

<div class="hero-pagina">
  <span class="kicker">Parte 4 · La brecha digital · 1 de 5</span>
  <h1>Conectividad en la vivienda</h1>
  <p class="hero-entrada">La cuarta parte trata de la brecha digital con tres fuentes, y cada una aporta algo que las otras no pueden. El Censo 2020 aporta el territorio: es la única con muestra suficiente para comparar las 32 entidades, y por eso esta página abre con el mapa.</p>
</div>

```js
const secciones = seccionesTema("censo-vivienda", datos, {geoEntidades, datosEscolaridad, fuentes});
```

---

<h2 id="internet" class="toc-anchor">Vive en una vivienda con internet</h2>

```js
display(conEntrada(secciones[0], "Tener internet en casa es el primer escalón: sin conexión en la vivienda, estudiar, trabajar o hacer un trámite en línea depende de salir a buscarla. El mapa compara, entidad por entidad, a la población indígena con el resto."));
```
---

<h2 id="dispositivos" class="toc-anchor">Dispositivos para conectarse</h2>

```js
display(conEntrada(secciones[1], "La conexión sirve según el aparato con que se usa. Un celular y una computadora no permiten hacer lo mismo, y por eso se cuentan por separado."));
```
---

<h2 id="otros-servicios" class="toc-anchor">Otros servicios de comunicación</h2>

```js
display(conEntrada(secciones[2], "La radio, la televisión y el teléfono completan el panorama: muestran por qué medios llega la información a una vivienda."));
```

<div class="relato-cierre">
  <p>El Censo es una foto de un año y no pregunta por el ingreso. Para saber si la brecha cambia y cuánto pesa el dinero hace falta otra fuente.</p>
  <a class="book-cta book-cta-primary" href="../enigh/hogar">Sigue: Acceso en el hogar</a>
</div>

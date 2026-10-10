---
title: Acceso y uso digital
draft: true
---

<header class="portada-capitulo">
  <div class="portada-capitulo-arte" data-motivo="parte-4"><svg class="motivo motivo-vivienda" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><path class="a-dib f0" pathLength="1" d="M100,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f3" d="M86.5,189.2 A18,18 0 0 1 113.5,189.2" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f4" d="M76,180.8 A32,32 0 0 1 124,180.8" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f5" d="M65.5,172.4 A46,46 0 0 1 134.5,172.4" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f2" pathLength="1" d="M200,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-dib f3" pathLength="1" d="M300,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f6" d="M286.5,189.2 A18,18 0 0 1 313.5,189.2" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f7" d="M276,180.8 A32,32 0 0 1 324,180.8" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f8" d="M265.5,172.4 A46,46 0 0 1 334.5,172.4" fill="none" stroke="#e8474f" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f5" pathLength="1" d="M400,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><path class="a-ap f8" d="M386.5,189.2 A18,18 0 0 1 413.5,189.2" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f9" d="M376,180.8 A32,32 0 0 1 424,180.8" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-ap f10" d="M365.5,172.4 A46,46 0 0 1 434.5,172.4" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><path class="a-dib f6" pathLength="1" d="M500,230 l-42,36 v54 h84 v-54 z" fill="none" stroke="#8a8a86" stroke-width="3" stroke-linejoin="round"/><line x1="40" x2="560" y1="320" y2="320" stroke="#8a8a86" stroke-width="1.5"/></svg></div>
  <div class="portada-capitulo-texto">
  <p class="portada-capitulo-parte">Condiciones de vida</p>
  <h1>Acceso y uso digital</h1>
  <p class="portada-capitulo-dek">Tres fuentes miden la brecha digital de la población indígena, cada una con su pregunta: el Censo 2020, qué hay en la vivienda; la ENIGH, qué hay en el hogar en tres ediciones; y la ENDUTIH 2025, qué usa cada persona y para qué.</p>
  </div>
</header>

<p class="entrada-capitulo">Cada página compara a la población indígena con el resto en todo el país, por entidad, sexo, edad, escolaridad y tamaño de localidad.</p>

```js
import {html} from "npm:htl";
const paginas = [
  ["../encuestas/censo/vivienda", "Censo 2020", "Conectividad en la vivienda", "Internet, celular, computadora y otros servicios de comunicación en la vivienda donde vive cada persona de 6 años o más."],
  ["../encuestas/enigh/hogar", "ENIGH 2020 - 2024", "Acceso en el hogar", "Lo mismo, preguntado a cada hogar cada dos años, con decil de ingreso: la única serie en el tiempo."],
  ["../encuestas/endutih/uso", "ENDUTIH 2025", "Quién usa internet y con qué", "Uso personal de internet, computadora y celular: la primera edición que identifica a la población indígena."],
  ["../encuestas/endutih/actividades", "ENDUTIH 2025", "Para qué se usa internet", "Estudiar, trabajar, trámites, dinero y entretenimiento entre quienes se conectan."],
  ["../encuestas/endutih/barreras", "ENDUTIH 2025", "Quién no se conecta y por qué", "Los motivos que declaran quienes no usan internet, computadora ni celular."],
];
const t = html`<div class="grid grid-cols-2"></div>`;
paginas.forEach(([ruta, fuente, titulo, texto], i) => t.append(html`<div class="card"><span class="card-numero" aria-hidden="true">9.${i + 1}</span>
  <h3><a href="${ruta}">${titulo}</a></h3><p><strong>${fuente}.</strong> ${texto}</p></div>`));
display(t);
```

Las tres fuentes no se suman ni se comparan entre sí: miden cosas distintas
(bienes en la vivienda, servicios del hogar, uso personal) con universos y
años distintos. Lo que sí comparten es la forma de identificar a la población
indígena, por lengua o por autoadscripción, que cada página permite elegir.

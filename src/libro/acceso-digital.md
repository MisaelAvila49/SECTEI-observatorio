---
title: 9. Acceso y uso digital
---

<div class="hero-pagina">
  <span class="kicker">Capítulo 9</span>
  <h1>Acceso y uso digital</h1>
  <p class="hero-entrada">Tres fuentes miden la brecha digital de la población indígena, cada una con su pregunta: el Censo 2020, qué hay en la vivienda; la ENIGH, qué hay en el hogar en tres ediciones; y la ENDUTIH 2025, qué usa cada persona y para qué. Cada página compara a la población indígena con el resto en todo el país, por entidad, sexo, edad, escolaridad y tamaño de localidad.</p>
</div>

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

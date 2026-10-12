---
title: Escúchalos
toc: false
---

```js
import {html} from "npm:htl";
import {campo} from "./components/panel-seccion.js";
import {explicacion} from "./components/graficas.js";
import {punto} from "./components/base.js";
import {procedencia} from "./components/fuentes.js";
const fuenteDe = procedencia({fuentes: await FileAttachment("./data/fuentes.csv").csv(), verificaciones: await FileAttachment("./data/verificaciones.csv").csv(), calculado: await FileAttachment("./data/calculado.csv").csv()});
```

<header class="encabezado-capitulo">
  <p class="antetitulo">Observatorio de Pueblos Indígenas</p>
  <h1><span class="h1-clave">Escúchalos</span></h1>
  <p class="entradilla">Cada lengua tiene su sonido. Estos cortos animados cuentan una historia de su pueblo, narrada por una persona hablante.</p>
</header>

```js
// Cortos de «68 voces - 68 corazones» (Hola Combo, Canal Once, INALI, CDI): uno por agrupación lingüística.
// Fachada: no se carga el reproductor de YouTube hasta que la persona pulsa «Escuchar»; un video a la vez.
const videos68 = await FileAttachment("./data/escucha_68voces.json").json();
const capE = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : "");
const nombreE = (l) => (l === "Tarasco (purépecha)" ? "Purépecha" : l === "Pápago" ? "Tohono o'odham (pápago)" : l);
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const sinAcentos = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const familiasE = [...new Set(videos68.map((v) => v.familia))].sort((a, b) => videos68.filter((v) => v.familia === b).length - videos68.filter((v) => v.familia === a).length);
const selDonde = campo({id: "c4-donde", nombre: "donde", etiqueta: "Mostrar", opciones: [{clave: "todas", etiqueta: `Todas las lenguas con video (${videos68.length})`}, {clave: "ciudad", etiqueta: `Las que se hablan en la ciudad (${videos68.filter((v) => v.hablantes_cdmx > 0).length})`}], valor: "todas"});
const selFamE = campo({id: "c4-familia", nombre: "familia", etiqueta: "Familia lingüística", opciones: [{clave: "", etiqueta: "Todas las familias"}, ...familiasE.map((f) => ({clave: f, etiqueta: capE(f)}))], valor: ""});
const buscaE = html`<form class="filtro" data-campo="buscar" onsubmit="return false"><label class="filtro-etiqueta" for="c4-buscar">Buscar una lengua</label><input id="c4-buscar" type="search" placeholder="Por ejemplo, otomí" autocomplete="off"></form>`;
const panelE = html`<div class="panel-filtros"><div class="panel-campos">${selDonde}${selFamE}${buscaE}</div></div>`;
const cuentaE = html`<p class="escucha-cuenta" aria-live="polite"></p>`;
const rejillaE = html`<ul class="escucha-rejilla"></ul>`;
const vacioE = html`<p class="escucha-vacio" hidden>Ninguna lengua con video coincide con la búsqueda. Pruebe otro nombre o elija «Todas las lenguas con video».</p>`;
let abiertaE = null;
const cerrarE = () => { if (abiertaE) { abiertaE.marco.replaceChildren(abiertaE.fachada); abiertaE = null; } };
function tarjetaE(v) {
  const lengua = nombreE(v.lengua);
  const fachada = html`<button type="button" class="escucha-fachada" aria-label="${`Reproducir «${v.historia}», narrado en ${lengua.toLowerCase()} (${mmss(v.segundos)})`}">
    <img src="${`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`}" alt="" loading="lazy" width="480" height="360">
    <span class="escucha-play" aria-hidden="true"><svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>Escuchar</span>
    <span class="escucha-duracion" aria-hidden="true">${mmss(v.segundos)}</span></button>`;
  const marco = html`<div class="escucha-marco">${fachada}</div>`;
  fachada.addEventListener("click", () => {
    cerrarE();
    const iframe = html`<iframe src="${`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&cc_load_policy=1&cc_lang_pref=es&rel=0`}" title="${`68 voces: ${v.historia}, en ${lengua.toLowerCase()}`}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    marco.replaceChildren(iframe); abiertaE = {marco, fachada}; iframe.focus();
  });
  return html`<li class="escucha-tarjeta">${marco}
    <h3 class="escucha-nombre">${lengua}</h3>
    <p class="escucha-historia">${v.historia}</p>
    <p class="escucha-datos">${v.variante ? html`<span>Narración: ${v.variante}${v.narra ? ` · ${v.narra}` : ""}</span>` : ""}${v.hablantes_cdmx > 0 ? html`<span class="escucha-ciudad">${punto(v.hablantes_cdmx)} hablantes en la ciudad, 2025</span>` : ""}</p></li>`;
}
function pintarE() {
  cerrarE();
  const q = sinAcentos(buscaE.querySelector("input").value.trim());
  const lista = videos68.filter((v) => (selDonde.value === "todas" || v.hablantes_cdmx > 0) && (!selFamE.value || v.familia === selFamE.value) && (!q || sinAcentos(`${nombreE(v.lengua)} ${v.variante}`).includes(q)));
  rejillaE.replaceChildren(...lista.map(tarjetaE));
  vacioE.hidden = lista.length > 0;
  const total = selDonde.value === "todas" ? videos68.length : videos68.filter((v) => v.hablantes_cdmx > 0).length;
  cuentaE.replaceChildren(html`<b>${lista.length}</b>`, ` de ${total} ${selDonde.value === "todas" ? "lenguas con video, de la más hablada en la ciudad a la menos" : "lenguas con video que se hablan en la ciudad"}.`);
}
panelE.addEventListener("input", pintarE);
pintarE();
display(html`<section class="beta-seccion escucha">${panelE}${cuentaE}${rejillaE}${vacioE}
  ${fuenteDe({datos: ["R-68VOCES", "D-EIC-2025-MICRO"], nota: "Los videos no son cifras: no hay nada que cotejar. Los hablantes en la ciudad son la población de 3 años y más que habla cada lengua según la Encuesta Intercensal 2025, la misma cifra de la sección «Cuántas personas hablan cada lengua» de «Las lenguas de México»."})}
  ${explicacion(["Hay un video por lengua (agrupación lingüística), no por variante. La narración es de una variante concreta, que se indica en cada tarjeta, y puede no ser la que se habla en la ciudad: por ejemplo, el náhuatl del video es el de la Huasteca de Hidalgo.", `La serie tiene ${videos68.length} cortos. De las 68 agrupaciones del catálogo del INALI, las que no aparecen todavía no tienen video. Los videos se reproducen desde YouTube en modo de privacidad mejorada: el reproductor no se carga hasta que se pulsa «Escuchar». Derechos de los videos: sus productores.`])}
</section>`);
```

<div class="relato-cierre">
  <p>¿Dónde se habla cada una de estas lenguas y cuántas personas la hablan en la ciudad?</p>
  <a class="book-cta book-cta-primary" href="./libro/lenguas-de-mexico">Ver «Las lenguas de México»</a>
</div>

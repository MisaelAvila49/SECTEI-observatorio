---
title: Mapa por AGEB
---

```js
import {mapaManzanas, leyenda, cortesPorCuantil, RAMPA_MORADA} from "./components/mapa.js";
import {figura, seccion, kpis, dumbbell, tablaDatos, tablaColumnas, explicacion} from "./components/graficas.js";
import {seccionCruce, filasDesdeAgebs, selectorAgrupado} from "./components/cruce.js";
import {conDescarga} from "./components/descargar.js";
import {catalogo, verificado} from "./components/fuentes.js";
import {verTambien} from "./components/navegacion.js";
import {anchoActual, alCambiarAncho, alCambiarModo, punto, ORDEN_GRADO} from "./components/base.js";

const agebs = await FileAttachment("data/agebs_resumen.csv").csv({typed: true});
const fuentes = catalogo(await FileAttachment("data/fuentes.csv").csv());
```

<div class="hero-pagina">
  <span class="kicker">Censo 2020 · CONAPO · CONEVAL</span>
  <h1>Presencia indígena, conectividad y marginación por AGEB</h1>
  <p class="hero-entrada">La AGEB es la unidad con la que el INEGI agrupa manzanas para publicar datos. Esta página reúne, para cada AGEB urbana de la Ciudad de México, la población en hogares indígenas y la conectividad de las viviendas del Censo 2020, el grado de marginación de CONAPO y el grado de rezago social de CONEVAL.</p>
</div>

```js
// Indicadores que se pueden pintar. `campo` es la columna de las teselas;
// `num` y `den`, las del numerador y el denominador para el globo. Los dos
// últimos son CATEGORÍAS ordenadas (cinco grados), no porcentajes.
const INDICADORES = [
  {clave: "phog", grupo: "Población indígena", corto: "Población en hogares indígenas", campo: "tasa_phog_ind",
   num: "PHOG_IND", den: "POBTOT", unidad: "Personas", denTexto: "la población"},
  {clave: "hli", grupo: "Población indígena", corto: "Personas que hablan lengua indígena", campo: "tasa_p3ym_hli",
   num: "P3YM_HLI", den: "P_3YMAS", unidad: "Personas", denTexto: "la población de 3 años o más"},
  {clave: "inter", grupo: "Conectividad de las viviendas", corto: "Viviendas con internet", campo: "tasa_vph_inter",
   num: "VPH_INTER", den: "VIVPARH_CV", unidad: "Viviendas", denTexto: "las viviendas"},
  {clave: "pc", grupo: "Conectividad de las viviendas", corto: "Viviendas con computadora", campo: "tasa_vph_pc",
   num: "VPH_PC", den: "VIVPARH_CV", unidad: "Viviendas", denTexto: "las viviendas"},
  {clave: "cel", grupo: "Conectividad de las viviendas", corto: "Viviendas con celular", campo: "tasa_vph_cel",
   num: "VPH_CEL", den: "VIVPARH_CV", unidad: "Viviendas", denTexto: "las viviendas"},
  {clave: "radio", grupo: "Conectividad de las viviendas", corto: "Viviendas con radio", campo: "tasa_vph_radio",
   num: "VPH_RADIO", den: "VIVPARH_CV", unidad: "Viviendas", denTexto: "las viviendas"},
  {clave: "stvp", grupo: "Conectividad de las viviendas", corto: "Viviendas con televisión de paga", campo: "tasa_vph_stvp",
   num: "VPH_STVP", den: "VIVPARH_CV", unidad: "Viviendas", denTexto: "las viviendas"},
  {clave: "stream", grupo: "Conectividad de las viviendas", corto: "Viviendas con streaming", campo: "tasa_vph_spmvpi",
   num: "VPH_SPMVPI", den: "VIVPARH_CV", unidad: "Viviendas", denTexto: "las viviendas"},
  {clave: "sintic", grupo: "Conectividad de las viviendas", corto: "Viviendas sin ninguna tecnología", campo: "tasa_vph_sintic",
   num: "VPH_SINTIC", den: "VIVPARH_CV", unidad: "Viviendas", denTexto: "las viviendas"},
  {clave: "salud", grupo: "Condiciones de la población", corto: "Sin afiliación a servicios de salud", campo: "tasa_psinder",
   num: "PSINDER", den: "POBTOT", unidad: "Personas", denTexto: "la población"},
  {clave: "gm", grupo: "Marginación y rezago social", corto: "Grado de marginación urbana (CONAPO)", campo: "gm_orden",
   categorias: true, texto: "gm_conapo"},
  {clave: "grs", grupo: "Marginación y rezago social", corto: "Grado de rezago social (CONEVAL)", campo: "grs_orden",
   categorias: true, texto: "grs_coneval"},
];

// Umbrales de presencia indígena. El 40 es el criterio con el que el INPI
// identifica LOCALIDADES indígenas en sus reglas de operación; los demás son
// cortes de exploración, porque con 40 casi ninguna AGEB de la ciudad califica.
const UMBRALES = [
  {valor: 5, etiqueta: "5 % o más"},
  {valor: 10, etiqueta: "10 % o más"},
  {valor: 20, etiqueta: "20 % o más"},
  {valor: 40, etiqueta: "40 % o más (criterio del INPI para localidades)"},
];
const alcanza = (a, u) => Number.isFinite(a.tasa_phog_ind) && a.tasa_phog_ind >= u;
```

---

<h2 id="mapa" class="toc-anchor">Mapa por AGEB</h2>

```js
display(seccion({numero: "01", titulo: "Mapa por AGEB"}));
```

```js
// El panel se arma en UNA celda, con los formularios directos dentro de
// .panel-campos: si cada control se declara en su propia celda de Markdown,
// Framework lo envuelve en un bloque y la hoja deja de reconocerlo como campo.
const selIndicador = selectorAgrupado(INDICADORES, {etiqueta: "Indicador", id: "selector-indicador-ageb"});
const selUmbral = Inputs.select(UMBRALES, {label: "Umbral de presencia indígena", format: (d) => d.etiqueta, value: UMBRALES[1]});
const selMostrar = Inputs.select(["Todas las AGEB", "Solo las que alcanzan el umbral"], {label: "Mostrar", value: "Todas las AGEB"});
display(html`<div class="panel-filtros"><div class="panel-campos">${selIndicador}${selUmbral}${selMostrar}</div></div>`);
```

```js
const indicador = Generators.input(selIndicador);
const umbral = Generators.input(selUmbral);
const mostrar = Generators.input(selMostrar);
```

```js
// Tarjetas: cuántas AGEB alcanzan el umbral elegido y cuánta gente vive ahí.
// La cifra es el dato; la nota solo dice el universo.
{
  const conDato = agebs.filter((a) => Number.isFinite(a.tasa_phog_ind));
  const sobre = conDato.filter((a) => alcanza(a, umbral.valor));
  const suma = (xs, k) => xs.reduce((s, a) => s + (a[k] ?? 0), 0);
  display(kpis([
    {etiqueta: "AGEB que alcanzan el umbral", cifra: punto(sobre.length), nota: `de ${punto(conDato.length)} AGEB urbanas con cifra publicada`},
    {etiqueta: "Población que vive en ellas", cifra: punto(suma(sobre, "POBTOT")), nota: `de ${punto(suma(conDato, "POBTOT"))} habitantes en AGEB urbanas`},
    {etiqueta: "Población en hogares indígenas que vive en ellas", cifra: punto(suma(sobre, "PHOG_IND")), nota: `de ${punto(suma(conDato, "PHOG_IND"))} en toda la ciudad`},
  ]));
}
```

```js
const valores = agebs.map((a) => a[indicador.campo]).filter((v) => Number.isFinite(v));
const cortes = indicador.categorias ? [1, 2, 3, 4, 5] : cortesPorCuantil(valores, 5);
```

```js
const escapar = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const entero = (n) => (n == null || n === "" ? "sin dato" : Number(n).toLocaleString("es-MX"));
const pct = (v) => (v == null || v === "" ? "sin dato" : Number(v).toFixed(1) + " %");

function tooltip(p) {
  const fila = indicador.categorias
    ? `<tr><th>${escapar(indicador.corto)}</th><td>${escapar(p[indicador.texto] ?? "sin grado")}</td></tr>`
    : `<tr><th>${escapar(indicador.corto)}</th><td>${pct(p[indicador.campo])}</td></tr>
       <tr><th>${indicador.unidad} que cumplen</th><td>${entero(p[indicador.num])}</td></tr>
       <tr><th>${indicador.unidad} en total</th><td>${entero(p[indicador.den])}</td></tr>`;
  return `
    <div class="globo-titulo">AGEB ${escapar(String(p.cve_ageb ?? "").slice(-4))}</div>
    <div class="globo-sub">${escapar(p.alcaldia)}</div>
    <table class="globo-tabla">
      ${fila}
      <tr><th>Población en hogares indígenas</th><td>${pct(p.tasa_phog_ind)}</td></tr>
      <tr><th>Grado de marginación</th><td>${escapar(p.gm_conapo ?? "sin grado")}</td></tr>
      <tr><th>Grado de rezago social</th><td>${escapar(p.grs_coneval ?? "sin grado")}</td></tr>
    </table>`;
}
```

```js
const control = mapaManzanas({
  pmtiles: await FileAttachment("data/agebs.pmtiles").url(),
  capa: "agebs",
  campo: INDICADORES[0].campo,
  cortes: cortesPorCuantil(agebs.map((a) => a[INDICADORES[0].campo]).filter((v) => Number.isFinite(v)), 5),
  rampa: RAMPA_MORADA,
  // El globo lee SIEMPRE el indicador vigente: la función se resuelve al pasar
  // el cursor, no al crear el mapa.
  tooltip: (p) => globoActual.fn(p),
  zoomBorde: 9,
  zoomHover: 9,
  limite: await FileAttachment("data/cdmx_limite.geojson").json(),
  alcaldias: await FileAttachment("data/cdmx_alcaldias.geojson").json()
});
const globoActual = {fn: () => ""};
display(control.nodo);
```

```js
// El mapa se crea una sola vez y se repinta al cambiar un control.
globoActual.fn = tooltip;
control.actualizar(indicador.campo, cortes);
control.filtrar(mostrar === "Solo las que alcanzan el umbral"
  ? [">=", ["to-number", ["get", "tasa_phog_ind"], -1], umbral.valor]
  : null);
```

```js
display(leyenda({
  cortes,
  titulo: indicador.categorias ? indicador.corto : `${indicador.corto} (% de ${indicador.denTexto} de la AGEB)`,
  formato: indicador.categorias ? (x) => ORDEN_GRADO[x - 1] : (x) => x.toFixed(1) + " %",
  abierta: !indicador.categorias,
  notaSinDato: indicador.categorias
    ? "Sin grado publicado para esa AGEB"
    : "Sin dato publicado (INEGI suprime la cifra por confidencialidad)",
}));
```

```js
display(explicacion([
  `Cada polígono es una AGEB urbana de la Ciudad de México. En los indicadores de porcentaje, el color es la
   proporción sobre el denominador que nombra la leyenda: la población de la AGEB o sus viviendas particulares
   habitadas con características. Los dos grados son categorías que asignan CONAPO y CONEVAL a cada AGEB con
   indicadores del mismo Censo; ninguno de los dos mide ingreso ni es una medición de pobreza.`,
  `El umbral marca desde qué proporción de población en hogares indígenas una AGEB cuenta como de presencia
   indígena. No existe un criterio oficial para AGEB urbanas: el del INPI se definió para localidades y se
   ofrece aquí como referencia, junto con cortes más bajos para explorar. Las cifras salen de las filas de
   total por AGEB del propio tabulado, que casi no tienen valores suprimidos.`,
]));
display(verificado(fuentes, {
  datos: ["D-CENSO-2020-RESAGEBURB", "D-CONAPO-IMU-2020", "D-CONEVAL-GRS-2020"],
  verificadoCon: ["D-CONEVAL-GRS-2020", "D-CONAPO-IMU-2020"],
  resultado: "la población de cada AGEB es idéntica en el tabulado del Censo, en CONAPO y en CONEVAL, y el porcentaje de viviendas sin internet calculado aquí coincide con el que publica CONEVAL, salvo en unas pocas AGEB con alta no respuesta. Las cifras del cotejo están en verificaciones.csv.",
  referencia: ["R-INPI-ROP-2020", "R-CONEVAL-POB-URBANA"],
  lectura: ["R-INEGI-PI"],
}));
display(tablaColumnas(
  agebs.filter((a) => alcanza(a, umbral.valor)).sort((a, b) => b.tasa_phog_ind - a.tasa_phog_ind).slice(0, 100),
  [
    {etiqueta: "AGEB", valor: (a) => String(a.cve_ageb).padStart(13, "0")},
    {etiqueta: "Alcaldía", valor: (a) => a.alcaldia},
    {etiqueta: "Población en hogares indígenas", num: true, valor: (a) => pct(a.tasa_phog_ind)},
    {etiqueta: "Personas", num: true, valor: (a) => punto(a.PHOG_IND)},
    {etiqueta: "Población", num: true, valor: (a) => punto(a.POBTOT)},
    {etiqueta: "Viviendas con internet", num: true, valor: (a) => pct(a.tasa_vph_inter)},
    {etiqueta: "Marginación", valor: (a) => a.gm_conapo ?? "sin grado"},
    {etiqueta: "Rezago social", valor: (a) => a.grs_coneval ?? "sin grado"},
  ],
  {titulo: "Ver las AGEB que alcanzan el umbral"}
));
```

---

<h2 id="cruce" class="toc-anchor">Conectividad según la presencia indígena</h2>

```js
display(seccionCruce({
  numero: "02",
  titulo: "Conectividad según la presencia indígena",
  filasDe: (ind) => filasDesdeAgebs(agebs, ind),
  etiquetaUnidades: "AGEB",
  unidadTexto: "AGEB",
  fuenteTexto: "INEGI, Censo 2020, resultados por AGEB urbana",
  fuentesBloque: verificado(fuentes, {
    datos: ["D-CENSO-2020-RESAGEBURB"],
    verificadoCon: ["D-CONEVAL-GRS-2020"],
    resultado: "el total de viviendas particulares habitadas con características de cada AGEB, que es el denominador, coincide con el que publica CONEVAL; el agrupamiento por bandas de presencia indígena no se publica y es cálculo propio.",
    lectura: ["R-IFT-BRECHA"],
  }),
}));
```

---

<h2 id="grados" class="toc-anchor">Marginación y rezago social según el umbral</h2>

```js
display(seccion({numero: "03", titulo: "Marginación y rezago social según el umbral"}));
```

```js
{
  const FUENTES_GRADO = [
    {clave: "gm_conapo", etiqueta: "Grado de marginación urbana (CONAPO)", fuente: "CONAPO, índice de marginación urbana 2020", id: "D-CONAPO-IMU-2020"},
    {clave: "grs_coneval", etiqueta: "Grado de rezago social (CONEVAL)", fuente: "CONEVAL, grado de rezago social por AGEB urbana 2020", id: "D-CONEVAL-GRS-2020"},
  ];
  const selFuente = Inputs.select(FUENTES_GRADO, {label: "Clasificación", format: (d) => d.etiqueta, value: FUENTES_GRADO[0]});
  const selUmbral = Inputs.select(UMBRALES, {label: "Umbral de presencia indígena", format: (d) => d.etiqueta, value: UMBRALES[1]});
  selFuente.dataset.campo = "clasificacion";
  selUmbral.dataset.campo = "umbral";
  const panel = html`<div class="panel-filtros"><div class="panel-campos">${selFuente}${selUmbral}</div></div>`;
  const cuerpo = html`<div class="seccion-cuerpo"></div>`;
  let ancho = anchoActual();

  const pintar = (entrada = true) => {
    cuerpo.classList.toggle("sin-entrada", !entrada);
    const f = selFuente.value, u = selUmbral.value.valor;
    const validas = agebs.filter((a) => Number.isFinite(a.tasa_phog_ind) && a[f.clave]);
    const grupos = [
      {serie: "AGEB que alcanzan el umbral", filas: validas.filter((a) => alcanza(a, u))},
      {serie: "Resto de las AGEB", filas: validas.filter((a) => !alcanza(a, u))},
    ];
    // Distribución de la POBLACIÓN de cada grupo entre los cinco grados: se
    // suma población y luego se divide, nunca se promedian porcentajes.
    const series = grupos.flatMap((g) => {
      const total = g.filas.reduce((s, a) => s + a.POBTOT, 0);
      return ORDEN_GRADO.map((grado) => {
        const dentro = g.filas.filter((a) => a[f.clave] === grado);
        const num = dentro.reduce((s, a) => s + a.POBTOT, 0);
        return {serie: g.serie, grado, num, den: total, casos: dentro.length,
                pct: total > 0 ? (100 * num) / total : null, ic: null, fragil: false};
      });
    }).filter((d) => d.pct != null);
    const nSobre = grupos[0].filas.length;
    cuerpo.replaceChildren(...[
      conDescarga(figura({
        titulo: `${f.etiqueta}: población de las AGEB que alcanzan el umbral y del resto`,
        subtitulo: `Ciudad de México, 2020. Umbral: ${selUmbral.value.etiqueta.toLowerCase()} de población en hogares indígenas. ${punto(nSobre)} AGEB con grado publicado lo alcanzan.`,
        pie: `${f.fuente}, e INEGI, Censo 2020: cada fila es un grado y los dos puntos, la parte de la población de cada grupo de AGEB que vive en AGEB de ese grado.`,
      }, [
        dumbbell(series, {comparacion: "ageb", filas: "grado", formato: "pct", width: ancho, intervalo: false, alturaFila: 38}),
        nSobre < 30 ? html`<p class="aviso-muestra" role="note"><strong>Pocas AGEB.</strong> El grupo que alcanza el umbral reúne ${punto(nSobre)} AGEB: con tan pocas unidades las proporciones se mueven mucho de un grado a otro.</p>` : null,
      ])),
      explicacion([
        `Las AGEB se parten en dos grupos según alcancen o no el umbral de población en hogares indígenas. Para
         cada grupo se reparte su población entre los cinco grados de la clasificación elegida: cada punto es
         la parte de la población del grupo que vive en AGEB de ese grado.`,
        `La marginación urbana de CONAPO y el rezago social de CONEVAL se construyen con indicadores de
         educación, salud, vivienda y bienes del Censo 2020. Ninguno incluye ingreso, así que no son una
         medición de pobreza. CONEVAL publicó rangos de pobreza por AGEB con datos de 2015 y para 2020 publicó
         pobreza solo hasta localidad urbana.`,
      ]),
      verificado(fuentes, {
        datos: ["D-CENSO-2020-RESAGEBURB", f.id],
        verificadoCon: [f.id],
        resultado: "la población de cada AGEB en la clasificación es idéntica a la del tabulado del Censo, así que la unión por clave de AGEB es exacta. La distribución por grupos de AGEB no se publica y es cálculo propio.",
        referencia: ["R-CONEVAL-POB-URBANA"],
      }),
      tablaDatos(series, {dims: ["grado"], formato: "pct", intervalo: false, etiquetaCasos: "AGEB",
        etiquetaNum: "Pob. en el grado", etiquetaDen: "Pob. del grupo"}),
    ].filter(Boolean));
  };
  for (const c of [selFuente, selUmbral]) c.addEventListener("input", () => pintar());
  alCambiarModo(() => pintar(false));
  alCambiarAncho((n) => { ancho = n; pintar(false); });
  pintar();
  display(html`<section class="seccion-tablero">${panel}${cuerpo}</section>`);
}
```

---

```js
display(verTambien([
  {ruta: "/mapa-manzanas", titulo: "Mapa por manzana", nota: "La misma información a la unidad más fina que publica el Censo, con agregado por colonia."},
  {ruta: "/encuestas/censo/vivienda", titulo: "Conectividad en la vivienda", nota: "La conectividad por condición indígena de cada persona, en todo el país, con la muestra ampliada del Censo."},
  {ruta: "/metodologia/fuentes", titulo: "Fuentes y cobertura", nota: "De dónde sale cada cifra y cómo se cotejó."},
]));
```

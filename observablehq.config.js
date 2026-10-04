// Tablero de grupos originarios: acceso digital de la población indígena de
// México (Censo 2020, ENIGH 2020-2024 y ENDUTIH 2025) y el mapa por manzana
// de la Ciudad de México con el Censo 2020.
//
// Estilo Social Data Ibero, heredado del Observatorio PISA (custom-style.css,
// botón de tema, parches de accesibilidad del chrome) y de
// discriminacion-mujeres (esquema de datos, filtros por sección).
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ruta base del sitio. En GitHub Pages el tablero vive en /<repo>/; solo se
// usa en `base`: Framework reescribe por su cuenta las rutas de head/footer.
const BASE = process.env.GITHUB_ACTIONS
  ? "/" + process.env.GITHUB_REPOSITORY.split("/")[1] + "/"
  : "/";

// El logo del sidebar se inlina como texto SVG: Framework no reescribe rutas
// dentro de `home`, así que una ruta relativa se rompe bajo un subdirectorio.
const logoSidebar = fs.readFileSync(
  path.join(__dirname, "src/images/social_data_original.svg")
).toString("utf8");

const SITE_URL = process.env.GITHUB_ACTIONS
  ? `https://${process.env.GITHUB_REPOSITORY.split("/")[0]}.github.io${BASE}`
  : "http://localhost:3000/";
const TITULO_SITIO = "Grupos originarios";
const DESCRIPCION_SITIO = "La población indígena de la Ciudad de México y las lenguas de México, 1990 - 2025: cuántas personas hablan una lengua indígena o se consideran indígenas, dónde viven, quiénes son, cómo viven y qué discriminación enfrentan, con censos, intercensales y encuestas del INEGI, el INALI, el INPI, CONAPO y el CONEVAL. Social Data Ibero, Universidad Iberoamericana.";

// Descripción propia de cada página para buscadores y vistas previas. Va
// aquí y no en el front matter porque Framework descarta las claves que no
// conoce antes de pasar `data` a `head`.
const DESCRIPCIONES = {
  "/": DESCRIPCION_SITIO,
  "/mapa": "Mapa de la población indígena de la Ciudad de México por alcaldía, AGEB y manzana: hablantes, hogares indígenas y autoadscripción de 1990 a 2025, con la lengua, sus variantes probables y el origen de quienes la hablan.",
  "/libro/lenguas-de-mexico": "Cuántas lenguas y variantes reconoce México, cuántas personas hablan cada una y en qué entidades, con el Censo 2020 y el Catálogo del INALI.",
  "/libro/hablantes-en-el-tiempo": "Hablantes de lengua indígena de 5 años y más de 1990 a 2025 en el país y en cada alcaldía de la Ciudad de México.",
  "/libro/variantes": "La variante probable de los hablantes de la Ciudad de México por lengua, año y alcaldía, inferida por su lugar de origen con el método del INALI, y qué tan segura es cada asignación.",
  "/libro/lenguas-en-riesgo": "El grado de riesgo de desaparición de las 364 variantes según el INALI, cuáles se hablan en la Ciudad de México y qué lenguas ganan o pierden hablantes en la ciudad.",
  "/libro/la-ciudad-en-el-pais": "Qué lugar ocupa la Ciudad de México entre las entidades y cuántas lenguas tienen hablantes en ella, 1990 - 2025.",
  "/libro/de-donde-vienen": "Entidad de nacimiento y llegadas recientes de los hablantes de lengua indígena que viven en la Ciudad de México, 1990 - 2025.",
  "/libro/donde-viven": "Dónde vive la población indígena de la Ciudad de México por alcaldía, AGEB y manzana, y qué lenguas se hablan en cada alcaldía.",
  "/libro/colonias-y-marginacion": "Presencia indígena y marginación urbana por AGEB, y colonias y pueblos originarios de la Ciudad de México.",
  "/libro/quienes-son": "Edad y sexo de la población indígena de la Ciudad de México frente al resto, 2010 - 2025.",
  "/libro/escuela-y-trabajo": "Escolaridad, condición de actividad, posición en el trabajo y trabajo doméstico remunerado de la población indígena de la Ciudad de México, 2010 - 2025.",
  "/libro/salud-y-lengua": "Afiliación a servicios de salud, discapacidad y hablantes que no hablan español en la Ciudad de México, 2010 - 2025.",
  "/libro/condiciones-de-vida": "Pobreza, pobreza extrema y carencias sociales de la población indígena del país frente al resto, CONEVAL 2016 - 2022.",
  "/encuestas/censo/vivienda": "Qué proporción de la población indígena vive en una vivienda con internet, celular o computadora, por entidad, edad y tamaño de localidad, con el Censo 2020.",
  "/encuestas/enigh/hogar": "Acceso del hogar a internet y dispositivos por condición indígena en 2020, 2022 y 2024, con decil de ingreso, según la ENIGH.",
  "/encuestas/endutih/uso": "Quién usa internet, celular y computadora, con qué equipo y desde dónde, por condición indígena, según la ENDUTIH 2025.",
  "/encuestas/endutih/actividades": "Para qué usa internet la población indígena que se conecta: estudiar, trabajar, trámites, dinero y entretenimiento, según la ENDUTIH 2025.",
  "/encuestas/endutih/barreras": "Quién no usa internet, computadora ni celular y qué motivo declara, por condición indígena, según la ENDUTIH 2025.",
  "/libro/discriminacion": "Discriminación, motivos, ámbitos y derechos negados a la población indígena del país, ENADIS 2017 y 2022.",
  "/libro/violencia": "Violencia contra las mujeres indígenas de 15 años y más por ámbito y tipo, en el país y en la Ciudad de México, ENDIREH 2021.",
  "/libro/derechos": "El marco de derechos lingüísticos y culturales de los pueblos indígenas en México y en la Ciudad de México.",
  "/metodologia": "Cómo se hizo el sitio: qué mide cada población indígena, de dónde sale cada cifra, cómo se cotejó y qué no se puede saber con estas fuentes.",
  "/mapa-manzanas": "Mapa por manzana de la población en hogares indígenas de la Ciudad de México, con el Censo 2020, agregable a colonia y con los pueblos originarios señalados.",
  "/mapa-agebs": "Población en hogares indígenas, conectividad de las viviendas, marginación urbana y rezago social por AGEB de la Ciudad de México, con un umbral de presencia indígena a elección.",
};

export default {
  title: TITULO_SITIO,
  root: "src",
  style: "custom-style.css",
  // Sustituye el globalStylesheets por omisión de Framework, que precarga
  // Source Serif 4 aunque la hoja no la use.
  globalStylesheets: [
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
  ],
  toc: {label: "En esta página"},
  search: true,

  interpreters: {
    ".py": ["uv", "run", "python", "-u"],
  },

  base: BASE,

  // Navegación en cinco partes numeradas, el orden de lectura del guion
  // (docs/guion-narrativo.md): las lenguas, la ciudad, quiénes son y cómo
  // viven, la brecha digital y lo que enfrentan. Cada parte responde una
  // pregunta y cada página deja planteada la siguiente.
  pages: [
    {name: "Inicio", path: "/"},
    {name: "Mapa", path: "/mapa"},
    {
      name: "1. Las lenguas",
      open: true,
      pages: [
        {name: "Las lenguas de México", path: "/libro/lenguas-de-mexico"},
        {name: "Hablantes en el tiempo", path: "/libro/hablantes-en-el-tiempo"},
        {name: "Variantes y origen", path: "/libro/variantes"},
        {name: "Lenguas en riesgo", path: "/libro/lenguas-en-riesgo"},
      ],
    },
    {
      name: "2. La ciudad",
      open: true,
      pages: [
        {name: "La ciudad en el país", path: "/libro/la-ciudad-en-el-pais"},
        {name: "De dónde vienen", path: "/libro/de-donde-vienen"},
        {name: "Dónde viven", path: "/libro/donde-viven"},
        {name: "Colonias, pueblos y marginación", path: "/libro/colonias-y-marginacion"},
      ],
    },
    {
      name: "3. Quiénes son y cómo viven",
      open: true,
      pages: [
        {name: "Edad y sexo", path: "/libro/quienes-son"},
        {name: "Escuela y trabajo", path: "/libro/escuela-y-trabajo"},
        {name: "Salud, discapacidad y español", path: "/libro/salud-y-lengua"},
        {name: "Pobreza y carencias", path: "/libro/condiciones-de-vida"},
      ],
    },
    {
      name: "4. La brecha digital",
      open: true,
      pages: [
        {name: "Conectividad en la vivienda", path: "/encuestas/censo/vivienda"},
        {name: "Acceso en el hogar", path: "/encuestas/enigh/hogar"},
        {name: "Quién usa internet", path: "/encuestas/endutih/uso"},
        {name: "Para qué se usa internet", path: "/encuestas/endutih/actividades"},
        {name: "Quién no se conecta", path: "/encuestas/endutih/barreras"},
      ],
    },
    {
      name: "5. Lo que enfrentan",
      open: true,
      pages: [
        {name: "Discriminación", path: "/libro/discriminacion"},
        {name: "Violencia contra las mujeres", path: "/libro/violencia"},
        {name: "Derechos y política cultural", path: "/libro/derechos"},
      ],
    },
    {name: "Metodología", path: "/metodologia"},
  ],

  home: `<span class="sidebar-brand">
  <span class="sidebar-brand-logo" aria-hidden="true">${logoSidebar}</span>
  <span class="sidebar-brand-text">
    <span class="sidebar-brand-title">Grupos originarios</span>
    <span class="sidebar-brand-obs">Social Data Ibero</span>
  </span>
</span>`,

  // `head` es función para recibir el título y la ruta de cada página. Todo
  // lo compartido (favicon, metadatos, tema, accesibilidad) vive aquí y lo
  // propio de cada página sale de DESCRIPCIONES por su ruta.
  head: ({title, path}) => {
    const ruta = path.replace(/\/index$/, "/");
    const descripcion = DESCRIPCIONES[ruta] ?? DESCRIPCION_SITIO;
    const tituloCompleto = title && title !== TITULO_SITIO ? `${title} | ${TITULO_SITIO}` : TITULO_SITIO;
    const url = SITE_URL.replace(/\/$/, "") + ruta;
    const imagen = `${SITE_URL}images/og-grupos-originarios.png`;
    return `<link rel="icon" href="/images/social_data_original.svg" type="image/svg+xml">
<meta name="theme-color" content="#c4101b">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/maplibre-gl.css">
<meta name="author" content="Social Data Ibero">
<meta name="description" content="${descripcion}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${TITULO_SITIO}">
<meta property="og:title" content="${tituloCompleto}">
<meta property="og:description" content="${descripcion}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${imagen}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="es_MX">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${tituloCompleto}">
<meta name="twitter:description" content="${descripcion}">
<meta name="twitter:image" content="${imagen}">
<script>
// Aplica el tema guardado ANTES de que el navegador pinte nada. El tablero es
// CLARO por omision, tambien para quien tenga el sistema en oscuro: el modo
// oscuro es una eleccion explicita del lector, no del sistema operativo.
(() => {
  // Idioma del documento: Framework no lo declara y es la primera regla de
  // WCAG que axe marca en cada pagina.
  document.documentElement.lang = "es";
  try {
    const guardado = localStorage.getItem("sdi-tema");
    if (guardado === "oscuro" || guardado === "claro") {
      document.documentElement.setAttribute("data-tema", guardado);
      return;
    }
  } catch (e) {
    // localStorage puede lanzar en modo privado; no hay preferencia guardada.
  }
  document.documentElement.setAttribute("data-tema", "claro");
})();
</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>
// Medicion de la cabecera del sidebar, enlace de salto, boton de tema y
// parches de accesibilidad sobre el chrome que Framework genera. Receta de
// la leccion 53 de la skill observableframework.
(() => {
  const medir = () => {
    const sidebar = document.querySelector("#observablehq-sidebar");
    if (sidebar && !sidebar.getAttribute("aria-label")) sidebar.setAttribute("aria-label", "Navegacion principal");
    const toc = document.querySelector("#observablehq-toc nav") ?? document.querySelector("#observablehq-toc");
    if (toc && !toc.getAttribute("aria-label")) toc.setAttribute("aria-label", "En esta pagina");
    const buscador = document.querySelector("#observablehq-search");
    if (!sidebar || !buscador) return;
    const alto = buscador.offsetTop + buscador.offsetHeight;
    sidebar.style.setProperty("--alto-cabecera", alto + "px");
  };
  const salto = () => {
    const main = document.querySelector("#observablehq-main");
    if (!main || document.querySelector(".saltar-contenido")) return;
    if (!main.id) main.id = "observablehq-main";
    const a = document.createElement("a");
    a.className = "saltar-contenido";
    a.href = "#observablehq-main";
    a.textContent = "Saltar al contenido";
    main.setAttribute("tabindex", "-1");
    document.body.insertBefore(a, document.body.firstChild);
  };
  const botonTema = () => {
    if (document.querySelector(".boton-tema")) return;
    const sidebar = document.querySelector("#observablehq-sidebar");
    // Sin sidebar (el mapa a pantalla completa) el boton va en la cabecera.
    const cabecera = document.querySelector(".mapa-cabecera");
    const marca = sidebar
      ? (sidebar.querySelector("li:has(.sidebar-brand)") ??
         sidebar.querySelector(".sidebar-brand")?.closest("li") ??
         sidebar.firstElementChild)
      : cabecera;
    if (!marca) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "boton-tema";
    const pintar = () => {
      const oscuro = document.documentElement.getAttribute("data-tema") === "oscuro";
      b.setAttribute("aria-pressed", String(oscuro));
      b.title = oscuro ? "Cambiar a fondo claro" : "Cambiar a fondo oscuro";
      b.innerHTML =
        '<span class="boton-tema-icono" aria-hidden="true">' +
        (oscuro
          ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 11.5A7.5 7.5 0 0 1 8.5 3a7.5 7.5 0 1 0 8.5 8.5z"/></svg>'
          : '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="3.6"/><path d="M10 1.6v2M10 16.4v2M18.4 10h-2M3.6 10h-2M15.9 4.1l-1.4 1.4M5.5 14.5l-1.4 1.4M15.9 15.9l-1.4-1.4M5.5 5.5 4.1 4.1"/></svg>') +
        "</span>" +
        '<span class="boton-tema-texto">' + (oscuro ? "Oscuro" : "Claro") + "</span>";
    };
    b.addEventListener("click", () => {
      const oscuro = document.documentElement.getAttribute("data-tema") === "oscuro";
      const nuevo = oscuro ? "claro" : "oscuro";
      document.documentElement.setAttribute("data-tema", nuevo);
      try { localStorage.setItem("sdi-tema", nuevo); } catch (e) { /* solo esta pestana */ }
      pintar();
      // Las graficas son SVG ya pintado: se avisa para que se redibujen.
      dispatchEvent(new CustomEvent("sdi:tema", {detail: {oscuro: !oscuro}}));
    });
    pintar();
    // <li> y no <div>: la marca vive dentro de un <ol>, que solo admite <li>.
    const caja = document.createElement(sidebar ? "li" : "span");
    caja.className = "boton-tema-caja";
    caja.appendChild(b);
    if (sidebar) marca.insertAdjacentElement("afterend", caja);
    else marca.appendChild(caja);
  };
  const buscadorEnEspanol = () => {
    const input = document.querySelector("#observablehq-search input[type=search]");
    if (!input || input.placeholder === "Buscar") return;
    input.placeholder = "Buscar";
    input.setAttribute("aria-label", "Buscar en el sitio");
  };
  const accesibilidadChrome = () => {
    const sidebar = document.querySelector("#observablehq-sidebar");
    if (!sidebar) return;
    for (const t of sidebar.querySelectorAll("label[for='observablehq-sidebar-toggle']")) {
      if (t.textContent.trim()) continue;
      const s = document.createElement("span");
      s.className = "aviso-lector";
      s.textContent = "Ocultar el menu";
      t.appendChild(s);
    }
    const toggle = document.querySelector("#observablehq-sidebar-toggle");
    if (toggle && !toggle.getAttribute("aria-label")) toggle.setAttribute("aria-label", "Mostrar u ocultar el menu");
    for (const ol of sidebar.querySelectorAll("ol")) {
      for (const hijo of [...ol.children]) {
        if (!/^(LI|SCRIPT|TEMPLATE)$/.test(hijo.tagName)) {
          const li = document.createElement("li");
          li.className = "li-envoltorio";
          ol.insertBefore(li, hijo);
          li.appendChild(hijo);
        }
      }
    }
  };
  const accesibilidadFiguras = () => {
    for (const g of document.querySelectorAll('#observablehq-main svg g[aria-label]:not([role])')) {
      g.setAttribute("role", "group");
    }
    for (const r of document.querySelectorAll('#observablehq-main svg rect[aria-label="frame"]')) {
      r.removeAttribute("aria-label");
    }
    for (const fig of document.querySelectorAll("#observablehq-main figure")) {
      // Plot envuelve el SVG en su propia figura cuando hay leyenda, sin h3:
      // el titulo se busca en la figura mas cercana que si lo tenga.
      const titulo = (fig.querySelector("h3") ?? fig.closest("figure:has(h3)")?.querySelector("h3"))?.textContent?.trim();
      for (const svg of fig.querySelectorAll("svg")) {
        if (svg.getAttribute("role") === "img" && svg.getAttribute("aria-label")) continue;
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", titulo ? "Grafica: " + titulo : "Grafica");
      }
    }
  };
  const arrancar = () => {
    medir();
    salto();
    botonTema();
    buscadorEnEspanol();
    accesibilidadChrome();
    accesibilidadFiguras();
    const main = document.querySelector("#observablehq-main");
    if (main && window.MutationObserver) {
      let pendiente = null;
      new MutationObserver(() => {
        if (pendiente) return;
        pendiente = setTimeout(() => { pendiente = null; accesibilidadFiguras(); }, 120);
      }).observe(main, {childList: true, subtree: true});
    }
    const cabecera = document.querySelector("#observablehq-sidebar > ol:first-child");
    if (cabecera && window.ResizeObserver) new ResizeObserver(medir).observe(cabecera);
    addEventListener("resize", medir);
  };
  if (document.readyState === "loading") {
    addEventListener("DOMContentLoaded", arrancar);
  } else {
    arrancar();
  }
})();
</script>`;
  },

  // Sin header: su único enlace ya vive en el pie y en la marca del sidebar.

  footer: `<div class="book-footer">
  <div class="instituciones-fila">
    <span class="instituciones-eyebrow">Un proyecto de</span>
    <a class="instituciones-chip instituciones-chip--ibero" href="https://ibero.mx" target="_blank" rel="noopener"><img src="/images/ibero/ibero-logo-color.webp" alt="Universidad Iberoamericana Ciudad de México"></a>
    <a class="instituciones-chip instituciones-chip--sdie" href="https://socialdata.ibero.mx" target="_blank" rel="noopener"><img src="/images/social_data_original.svg" alt="Social Data Ibero"></a>
  </div>
  <div class="book-footer-grid">
    <div class="book-footer-col">
      <p class="book-footer-col-title">Explorar</p>
      <p class="book-footer-col-line"><a href="/">Inicio</a></p>
      <p class="book-footer-col-line"><a href="/mapa">Mapa</a></p>
      <p class="book-footer-col-line"><a href="/libro/lenguas-de-mexico">Las lenguas de México</a></p>
      <p class="book-footer-col-line"><a href="/libro/donde-viven">Dónde viven</a></p>
      <p class="book-footer-col-line"><a href="/libro/condiciones-de-vida">Condiciones de vida</a></p>
    </div>
    <div class="book-footer-col">
      <p class="book-footer-col-title">Datos y método</p>
      <p class="book-footer-col-line">Fuentes: <a href="https://www.inegi.org.mx" target="_blank" rel="noopener">INEGI</a> (censos, conteos e intercensales 1990 - 2025), INALI, INPI, CONAPO y CONEVAL</p>
      <p class="book-footer-col-line"><a href="/metodologia">Metodología</a></p>
      <p class="book-footer-col-line"><a href="/#citar">Cómo citar este tablero</a></p>
    </div>
    <div class="book-footer-col">
      <p class="book-footer-col-title">Contacto</p>
      <p class="book-footer-col-line">Correspondencia: <a href="mailto:wilfrido.gomez@ibero.mx">wilfrido.gomez@ibero.mx</a></p>
      <p class="book-footer-col-line"><a href="https://socialdata.ibero.mx" target="_blank" rel="noopener">socialdata.ibero.mx</a></p>
    </div>
  </div>
  <div class="book-footer-bottom">
    <span>&copy; 2026 Social Data Ibero, Universidad Iberoamericana</span>
    <span class="book-footer-tech">Construido con <a href="https://observablehq.com/framework/" target="_blank" rel="noopener">Observable Framework</a></span>
  </div>
</div>`,
};

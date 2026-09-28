// Panel de una sección del libro: el NIVEL manda; entidad, municipio y AGEB
// acotan o seleccionan; después vienen los cortes.
//
// Se construye a partir de la DECLARACIÓN de la fuente (hasta qué nivel llega,
// qué poblaciones identifica, qué años y cortes publica en cada nivel) y
// expone `value`, `set(parcial)`, `aplica(nombre)` y `mostrar(nombre, bool)`.
// Los clics del mapa y las migas escriben en el mismo panel con `set`, así
// que las gráficas no distinguen por dónde llegó la selección.
// Ver docs/arquitectura-filtros.md, §3 y §4.
import {html} from "npm:htl";
import {NIVELES, ORDEN_NIVEL, buscarUnidad, nivelDe} from "./geografia.js";

// "separado" pide una faceta por categoría (comparar dentro de la misma
// categoría); solo existe en la vista de gráfica.
export const SEPARADO = "separado";
export const SEXOS = [{clave: "Total", etiqueta: "Mujeres y hombres"}, {clave: "Mujeres", etiqueta: "Mujeres"}, {clave: "Hombres", etiqueta: "Hombres"}, {clave: SEPARADO, etiqueta: "Por separado (mujeres frente a hombres)"}];
export const EDADES = [{clave: "Todas", etiqueta: "Todas las edades"}, {clave: "3-14", etiqueta: "3 a 14 años"}, {clave: "15-29", etiqueta: "15 a 29 años"},
  {clave: "30-59", etiqueta: "30 a 59 años"}, {clave: "60+", etiqueta: "60 años y más"}, {clave: SEPARADO, etiqueta: "Por separado (un panel por grupo)"}];

function campo({id, etiqueta, opciones, valor, nombre}) {
  const select = document.createElement("select");
  select.id = id;
  const form = document.createElement("form");
  form.className = "filtro";
  form.dataset.campo = nombre;
  const rotulo = document.createElement("label");
  rotulo.className = "filtro-etiqueta";
  rotulo.textContent = etiqueta;
  rotulo.htmlFor = id;
  form.append(rotulo, select);
  form.rellenar = (ops, v) => {
    select.replaceChildren(...ops.map((o) => { const op = document.createElement("option"); op.value = o.clave; op.textContent = o.etiqueta; return op; }));
    select.value = ops.some((o) => o.clave === v) ? v : (ops[0]?.clave ?? "");
  };
  form.rellenar(opciones, valor);
  Object.defineProperty(form, "value", {get: () => select.value, set: (v) => { select.value = v; }});
  form.select = select;
  form.rotular = (t) => { rotulo.textContent = t; };
  return form;
}

// Buscador con lista de sugerencias. La unidad resuelta queda ESCRITA en la
// caja, con una × dentro para quitarla; el aviso de "ninguna" o "varias"
// coincidencias se superpone debajo sin ocupar sitio, para que nada se mueva.
function buscador({id, etiqueta, nombre, marcador}) {
  const input = document.createElement("input");
  input.type = "text"; input.id = id; input.setAttribute("list", `${id}-lista`); input.placeholder = marcador; input.autocomplete = "off";
  const lista = document.createElement("datalist"); lista.id = `${id}-lista`;
  const quitar = document.createElement("button"); quitar.type = "button"; quitar.className = "filtro-quitar"; quitar.textContent = "×"; quitar.hidden = true;
  const aviso = document.createElement("span"); aviso.className = "filtro-aviso"; aviso.setAttribute("role", "status"); aviso.hidden = true;
  const caja = document.createElement("div"); caja.className = "filtro-caja"; caja.append(input, quitar, lista, aviso);
  const form = document.createElement("form"); form.className = "filtro filtro-buscador"; form.dataset.campo = nombre;
  const rotulo = document.createElement("label"); rotulo.className = "filtro-etiqueta"; rotulo.textContent = etiqueta; rotulo.htmlFor = id;
  form.append(rotulo, caja);
  form.addEventListener("submit", (e) => e.preventDefault());
  form.rellenar = (unidades) => { lista.replaceChildren(...unidades.map((u) => { const o = document.createElement("option"); o.value = u.nombre; return o; })); };
  let alQuitar = null;
  form.fijar = (texto, fn) => {
    alQuitar = fn;
    input.value = texto ?? "";
    input.classList.toggle("es-resuelta", Boolean(texto));
    quitar.hidden = !texto;
    quitar.setAttribute("aria-label", texto ? `Quitar ${texto}` : "Quitar");
  };
  quitar.addEventListener("click", () => { if (alQuitar) alQuitar(); });
  input.addEventListener("focus", () => { if (input.classList.contains("es-resuelta")) input.select(); });
  form.avisar = (texto) => { aviso.textContent = texto ?? ""; aviso.hidden = !texto; };
  input.addEventListener("input", () => form.avisar(""));
  form.input = input;
  form.rotular = (t) => { rotulo.textContent = t; };
  form.marcador = (t) => { input.placeholder = t; };
  Object.defineProperty(form, "value", {get: () => input.value, set: (v) => { input.value = v; }});
  return form;
}

export function panelSeccion({fuente, catalogo, id = "sec"}) {
  const c = {
    vista: campo({id: `${id}-vista`, nombre: "vista", etiqueta: "Ver como", opciones: [{clave: "grafica", etiqueta: "Gráfica"}, {clave: "mapa", etiqueta: "Mapa"}], valor: "grafica"}),
    nivel: campo({id: `${id}-nivel`, nombre: "nivel", etiqueta: "Nivel", opciones: NIVELES.map((n) => ({clave: n.clave, etiqueta: n.etiqueta})), valor: "entidad"}),
    entidad: buscador({id: `${id}-entidad`, nombre: "entidad", etiqueta: "Entidad", marcador: "Todas las entidades"}),
    municipio: buscador({id: `${id}-municipio`, nombre: "municipio", etiqueta: "Municipio", marcador: "Todos los municipios"}),
    ageb: campo({id: `${id}-ageb`, nombre: "ageb", etiqueta: "AGEB", opciones: [{clave: "", etiqueta: "Todas las AGEB"}], valor: ""}),
    poblacion: campo({id: `${id}-poblacion`, nombre: "poblacion", etiqueta: "Población", opciones: fuente.poblaciones, valor: fuente.poblaciones[0].clave}),
    anio: campo({id: `${id}-anio`, nombre: "anio", etiqueta: "Año", opciones: [{clave: "2020", etiqueta: "2020"}], valor: "2020"}),
    sexo: campo({id: `${id}-sexo`, nombre: "sexo", etiqueta: "Sexo", opciones: SEXOS, valor: "Total"}),
    edad: campo({id: `${id}-edad`, nombre: "edad", etiqueta: "Grupo de edad", opciones: EDADES, valor: "Todas"}),
  };
  const nodo = html`<div class="panel-filtros panel-seccion">
    <fieldset class="panel-grupo"><legend class="panel-grupo-titulo">Qué se compara y dónde</legend>
      <div class="panel-campos">${c.vista}${c.nivel}${c.entidad}${c.municipio}${c.ageb}${c.poblacion}${c.anio}</div></fieldset>
    <fieldset class="panel-grupo"><legend class="panel-grupo-titulo">Entre quiénes</legend>
      <div class="panel-campos">${c.sexo}${c.edad}</div></fieldset>
  </div>`;

  // La geografía vive aquí; los controles solo la escriben.
  const geo = {nivel: "entidad", cveEnt: null, cveMun: null, cveAgeb: null, seleccion: null};
  const aplica = {};
  const ver = (nombre, visible) => { aplica[nombre] = visible; c[nombre].hidden = !visible; };
  let anios = [], poblaciones = [];

  function leer() {
    return {...geo, vista: c.vista.value, poblacion: c.poblacion.value, anio: c.anio.value === SEPARADO ? SEPARADO : Number(c.anio.value), sexo: c.sexo.value, edad: c.edad.value,
      anios: anios.slice(), poblaciones: poblaciones.slice()};
  }

  // Qué acota y qué selecciona cada control según el nivel:
  //   nacional  nada
  //   entidad   entidad = selección (resalta una)
  //   municipio entidad = acota; municipio = selección
  //   ageb      municipio (alcaldía) = acota; AGEB = selección
  //   manzana   municipio y AGEB acotan
  function configurar() {
    const enCiudad = geo.nivel === "ageb" || geo.nivel === "manzana";
    if (enCiudad) geo.cveEnt = "09";
    const enMapa = c.vista.value === "mapa";
    // El mapa no faceta: si se pide el mapa, las categorías vuelven al total.
    if (enMapa) { if (c.sexo.value === SEPARADO) c.sexo.value = "Total"; if (c.edad.value === SEPARADO) c.edad.value = "Todas"; if (c.anio.value === SEPARADO) c.anio.value = "2020"; if (c.poblacion.value === SEPARADO) c.poblacion.value = fuente.poblaciones[0].clave; }
    c.nivel.value = geo.nivel;

    const ent = geo.cveEnt ? catalogo.de("entidad", geo.cveEnt) : null;
    const mun = geo.cveMun ? catalogo.de("municipio", geo.cveMun) : null;
    ver("entidad", geo.nivel === "entidad" || geo.nivel === "municipio");
    c.entidad.rellenar(catalogo.todos("entidad"));
    c.entidad.rotular(geo.nivel === "entidad" ? "Entidad a resaltar" : "Entidad");
    c.entidad.marcador(geo.nivel === "entidad" ? "Ninguna resaltada" : "Todas las entidades");
    const entTexto = geo.nivel === "entidad" ? (geo.seleccion ? catalogo.de("entidad", geo.seleccion)?.nombre : null) : ent?.nombre;
    c.entidad.fijar(entTexto ?? null, () => (geo.nivel === "entidad" ? set({seleccion: null}) : set({cveEnt: null, cveMun: null, cveAgeb: null, seleccion: null})));

    ver("municipio", geo.nivel === "municipio" || enCiudad);
    c.municipio.rellenar(catalogo.hijos("municipio", geo.cveEnt));
    c.municipio.rotular(enCiudad ? "Alcaldía" : "Municipio a resaltar");
    c.municipio.marcador(enCiudad ? "Toda la ciudad" : "Ninguno resaltado");
    const munTexto = geo.nivel === "municipio" ? (geo.seleccion ? catalogo.de("municipio", geo.seleccion)?.nombre : null) : mun?.nombre;
    c.municipio.fijar(munTexto ?? null, () => (geo.nivel === "municipio" ? set({seleccion: null}) : set({cveMun: null, cveAgeb: null, seleccion: null})));

    ver("ageb", enCiudad);
    if (enCiudad) {
      const lista = catalogo.hijos("ageb", geo.cveMun);
      c.ageb.rotular(geo.nivel === "ageb" ? "AGEB a resaltar" : "AGEB");
      c.ageb.rellenar([{clave: "", etiqueta: geo.nivel === "ageb" ? "Ninguna resaltada" : (geo.cveMun ? "Todas las AGEB de la alcaldía" : "Toda la ciudad")},
        ...lista.map((u) => ({clave: u.cve, etiqueta: geo.cveMun ? `AGEB ${u.cve.slice(-4)}` : u.nombre}))], geo.nivel === "ageb" ? (geo.seleccion ?? "") : (geo.cveAgeb ?? ""));
    }

    // Población, año y cortes: lo que la fuente publica para ESTE nivel.
    const pobs = fuente.poblaciones.filter((p) => fuente.poblacionesDe(geo).includes(p.clave));
    c.poblacion.rellenar([...pobs, ...(pobs.length > 1 && !enMapa ? [{clave: SEPARADO, etiqueta: "Por separado (comparar poblaciones)"}] : [])], c.poblacion.value);
    poblaciones = pobs.map((p) => p.clave);
    const pobBase = c.poblacion.value === SEPARADO ? poblaciones[0] : c.poblacion.value;
    anios = fuente.aniosDe({geo, poblacion: pobBase});
    const pref = (c.anio.value === SEPARADO && anios.length > 1 && !enMapa) ? SEPARADO : anios.includes(Number(c.anio.value)) ? c.anio.value : anios.includes(2020) ? "2020" : String(anios.at(-1));
    c.anio.rellenar([...anios.map((a) => ({clave: String(a), etiqueta: String(a)})), ...(anios.length > 1 && !enMapa ? [{clave: SEPARADO, etiqueta: "Comparar todas las ediciones"}] : [])], pref);
    c.anio.select.disabled = anios.length <= 1;
    c.anio.rotular(anios.length <= 1 ? "Año (único publicado a este nivel)" : "Año");
    const ctx = {geo, poblacion: pobBase, anio: c.anio.value === SEPARADO ? anios.at(-1) : Number(c.anio.value)};
    const conSexo = fuente.sexoDe(ctx);
    ver("sexo", conSexo); if (!conSexo) c.sexo.value = "Total";
    const conEdad = fuente.edadDe(ctx);
    ver("edad", conEdad); if (!conEdad) c.edad.value = "Todas";
    for (const grupo of nodo.querySelectorAll(".panel-grupo")) grupo.hidden = ![...grupo.querySelectorAll(".filtro")].some((f) => !f.hidden);
    nodo.value = leer();
  }

  function avisar() { nodo.dispatchEvent(new Event("input", {bubbles: true})); }
  // Escribe una geografía parcial (clic en el mapa, miga, control) y avisa.
  function set(parcial) {
    Object.assign(geo, parcial);
    if (parcial.seleccion === undefined) geo.seleccion = null;
    if (!geo.cveEnt) { geo.cveMun = null; geo.cveAgeb = null; }
    if (!geo.cveMun) geo.cveAgeb = null;
    configurar();
    avisar();
  }
  // Cambiar de nivel conserva solo las claves que acotan ese nivel: volver a
  // "Entidades del país" suelta la entidad; "Municipios" suelta el municipio.
  function cambiarNivel(nivel) {
    const p = {nivel, seleccion: null};
    if (nivel === "nacional" || nivel === "entidad") { p.cveEnt = null; p.cveMun = null; p.cveAgeb = null; }
    if (nivel === "municipio") { p.cveMun = null; p.cveAgeb = null; if (geo.cveEnt === "09" && (geo.nivel === "ageb" || geo.nivel === "manzana")) p.cveEnt = "09"; }
    if (nivel === "ageb") { p.cveEnt = "09"; p.cveMun = geo.cveEnt === "09" ? geo.cveMun : null; p.cveAgeb = null; }
    if (nivel === "manzana") { p.cveEnt = "09"; p.cveMun = geo.cveEnt === "09" ? geo.cveMun : null; }
    set(p);
  }

  c.nivel.select.addEventListener("change", () => cambiarNivel(c.nivel.value));
  c.entidad.input.addEventListener("change", () => {
    const texto = c.entidad.value.trim();
    if (!texto) { if (geo.nivel === "entidad" ? geo.seleccion : geo.cveEnt) set(geo.nivel === "entidad" ? {seleccion: null} : {cveEnt: null, cveMun: null, cveAgeb: null}); return; }
    const r = buscarUnidad(catalogo.todos("entidad"), texto);
    if (!r) { c.entidad.avisar("Ninguna entidad con ese nombre"); return; }
    if (r.varias) { c.entidad.avisar(`Varias coincidencias: ${r.varias.slice(0, 4).map((u) => u.nombre).join(", ")}`); return; }
    c.entidad.avisar("");
    if (geo.nivel === "entidad") set({seleccion: r.cve});
    else set({cveEnt: r.cve, cveMun: null, cveAgeb: null});
  });
  c.municipio.input.addEventListener("change", () => {
    const texto = c.municipio.value.trim();
    if (!texto) { if (geo.nivel === "municipio" ? geo.seleccion : geo.cveMun) set(geo.nivel === "municipio" ? {seleccion: null} : {cveMun: null, cveAgeb: null}); return; }
    const r = buscarUnidad(catalogo.hijos("municipio", geo.cveEnt), texto);
    if (!r) { c.municipio.avisar(geo.cveEnt ? "Ningún municipio con ese nombre en esta entidad" : "Ningún municipio con ese nombre"); return; }
    if (r.varias) { c.municipio.avisar(`Varias coincidencias: ${r.varias.slice(0, 4).map((u) => u.nombre).join(", ")}`); return; }
    c.municipio.avisar("");
    if (geo.nivel === "municipio") set({cveEnt: geo.cveEnt ?? r.cve.slice(0, 2), seleccion: r.cve});
    else set({cveMun: r.cve, cveAgeb: null});
  });
  c.ageb.select.addEventListener("change", () => {
    const v = c.ageb.value || null;
    if (geo.nivel === "ageb") set({seleccion: v, cveMun: geo.cveMun ?? (v ? v.slice(0, 5) : null)});
    else set({cveAgeb: v, cveMun: geo.cveMun ?? (v ? v.slice(0, 5) : null)});
  });
  for (const k of ["vista", "poblacion", "anio", "sexo", "edad"]) c[k].select.addEventListener("change", () => {
    // Pedir facetas estando en el mapa devuelve a la gráfica (el mapa no faceta).
    if (k !== "vista" && c[k].value === SEPARADO && c.vista.value === "mapa") c.vista.value = "grafica";
    configurar(); avisar();
  });
  // Un clic en el mapa que baja de nivel deja la vista en mapa; el resto no la toca.
  nodo.verMapa = () => { c.vista.value = "mapa"; };

  configurar();
  nodo.set = set;
  nodo.geo = () => ({...geo});
  nodo.aplica = (nombre) => aplica[nombre] !== false;
  nodo.mostrar = (nombre, visible) => { c[nombre].hidden = !visible; };
  nodo.nivelActual = () => nivelDe(geo.nivel);
  return nodo;
}

// Panel de una sección del libro: geografía primero, después los cortes.
//
// Se construye a partir de la DECLARACIÓN de la fuente (hasta qué nivel llega,
// qué poblaciones identifica, qué años y cortes publica en cada nivel) y
// expone `value`, `set(parcial)`, `aplica(nombre)` y `mostrar(nombre, bool)`,
// como el panel del mapa. Los clics del mapa y las migas escriben en el mismo
// panel con `set`, así que las gráficas no distinguen por dónde llegó la
// selección. Ver docs/arquitectura-filtros.md, §3 y §4.
import {html} from "npm:htl";
import {ORDEN_NIVEL, buscarUnidad, contenedorDe, nivelDe} from "./geografia.js";

export const SEXOS = [{clave: "Total", etiqueta: "Mujeres y hombres"}, {clave: "Mujeres", etiqueta: "Mujeres"}, {clave: "Hombres", etiqueta: "Hombres"}];
export const EDADES = [{clave: "Todas", etiqueta: "Todas las edades"}, {clave: "3-14", etiqueta: "3 a 14 años"}, {clave: "15-29", etiqueta: "15 a 29 años"},
  {clave: "30-59", etiqueta: "30 a 59 años"}, {clave: "60+", etiqueta: "60 años y más"}];

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
  Object.defineProperty(form, "value", {get: () => input.value, set: (v) => { input.value = v; }});
  return form;
}

export function panelSeccion({fuente, catalogo, id = "sec"}) {
  const c = {
    vista: campo({id: `${id}-vista`, nombre: "vista", etiqueta: "Ver como", opciones: [{clave: "grafica", etiqueta: "Gráfica"}, {clave: "mapa", etiqueta: "Mapa"}], valor: "grafica"}),
    nivel: campo({id: `${id}-nivel`, nombre: "nivel", etiqueta: "Nivel", opciones: [{clave: "entidad", etiqueta: "Entidades del país"}], valor: "entidad"}),
    entidad: buscador({id: `${id}-entidad`, nombre: "entidad", etiqueta: "Entidad", marcador: "Escribe una entidad"}),
    municipio: buscador({id: `${id}-municipio`, nombre: "municipio", etiqueta: "Municipio o alcaldía", marcador: "Escribe un municipio"}),
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

  // La geografía vive aquí; los buscadores solo la escriben.
  const geo = {nivel: "entidad", cveEnt: null, cveMun: null, cveAgeb: null, seleccion: null};
  const aplica = {};
  const ver = (nombre, visible) => { aplica[nombre] = visible; c[nombre].hidden = !visible; };
  c.entidad.rellenar(catalogo.todos("entidad"));

  function leer() {
    return {...geo, vista: c.vista.value, poblacion: c.poblacion.value, anio: Number(c.anio.value), sexo: c.sexo.value, edad: c.edad.value};
  }

  // Reconcilia opciones y visibilidad a partir de la geografía y los valores.
  function configurar() {
    const tope = fuente.nivelMax(geo);
    const puede = (n) => ORDEN_NIVEL.indexOf(n) <= ORDEN_NIVEL.indexOf(tope);
    const ops = [{clave: "entidad", etiqueta: "Entidades del país"}];
    if (geo.cveEnt && puede("municipio")) ops.push({clave: "municipio", etiqueta: `Municipios de ${catalogo.de("entidad", geo.cveEnt)?.nombre ?? geo.cveEnt}`});
    if (geo.cveMun && puede("ageb")) ops.push({clave: "ageb", etiqueta: `AGEB de ${catalogo.de("municipio", geo.cveMun)?.nombre ?? geo.cveMun}`});
    if (geo.cveAgeb && puede("manzana")) ops.push({clave: "manzana", etiqueta: `Manzanas de la AGEB ${geo.cveAgeb.slice(-4)}`});
    if (!ops.some((o) => o.clave === geo.nivel)) geo.nivel = ops.at(-1).clave;
    c.nivel.rellenar(ops, geo.nivel);

    // Buscadores: el de municipio solo con entidad; el de AGEB solo con
    // municipio y donde la fuente llega a AGEB.
    const ent = geo.cveEnt ? catalogo.de("entidad", geo.cveEnt) : null;
    const mun = geo.cveMun ? catalogo.de("municipio", geo.cveMun) : null;
    c.entidad.fijar(ent?.nombre ?? null, () => set({cveEnt: null, cveMun: null, cveAgeb: null, nivel: "entidad"}));
    ver("municipio", Boolean(geo.cveEnt) && puede("municipio"));
    c.municipio.rellenar(geo.cveEnt ? catalogo.hijos("municipio", geo.cveEnt) : []);
    c.municipio.fijar(mun?.nombre ?? null, () => set({cveMun: null, cveAgeb: null, nivel: "municipio"}));
    const conAgeb = Boolean(geo.cveMun) && puede("ageb");
    ver("ageb", conAgeb);
    if (conAgeb) {
      c.ageb.rellenar([{clave: "", etiqueta: "Todas las AGEB de la alcaldía"}, ...catalogo.hijos("ageb", geo.cveMun).map((u) => ({clave: u.cve, etiqueta: `AGEB ${u.cve.slice(-4)}`}))], geo.cveAgeb ?? "");
    }

    // Población, año y cortes: lo que la fuente publica para ESTA geografía.
    const pobs = fuente.poblaciones.filter((p) => fuente.poblacionesDe(geo).includes(p.clave));
    c.poblacion.rellenar(pobs, c.poblacion.value);
    const anios = fuente.aniosDe({geo, poblacion: c.poblacion.value});
    const pref = anios.includes(Number(c.anio.value)) ? c.anio.value : anios.includes(2020) ? "2020" : String(anios.at(-1));
    c.anio.rellenar(anios.map((a) => ({clave: String(a), etiqueta: String(a)})), pref);
    c.anio.select.disabled = anios.length <= 1;
    c.anio.querySelector("label").textContent = anios.length <= 1 ? "Año (único publicado a este nivel)" : "Año";
    const ctx = {geo, poblacion: c.poblacion.value, anio: Number(c.anio.value)};
    const conSexo = fuente.sexoDe(ctx);
    ver("sexo", conSexo); if (!conSexo) c.sexo.value = "Total";
    const conEdad = fuente.edadDe(ctx);
    ver("edad", conEdad); if (!conEdad) c.edad.value = "Todas";
    for (const grupo of nodo.querySelectorAll(".panel-grupo")) grupo.hidden = ![...grupo.querySelectorAll(".filtro")].some((f) => !f.hidden);
    nodo.value = leer();
  }

  function avisar() { nodo.dispatchEvent(new Event("input", {bubbles: true})); }
  // Escribe una geografía parcial (clic en el mapa, miga, buscador) y avisa.
  function set(parcial) {
    Object.assign(geo, parcial);
    if (!geo.cveEnt) { geo.cveMun = null; geo.cveAgeb = null; }
    if (!geo.cveMun) geo.cveAgeb = null;
    const contenedor = contenedorDe(geo);
    if (parcial.seleccion === undefined) geo.seleccion = null;
    configurar();
    avisar();
    return contenedor;
  }

  c.nivel.select.addEventListener("change", () => set({nivel: c.nivel.value}));
  c.entidad.input.addEventListener("change", () => {
    const r = buscarUnidad(catalogo.todos("entidad"), c.entidad.value);
    if (!c.entidad.value.trim()) { if (geo.cveEnt) set({cveEnt: null, cveMun: null, cveAgeb: null, nivel: "entidad"}); return; }
    if (!r) { c.entidad.avisar("Ninguna entidad con ese nombre"); return; }
    if (r.varias) { c.entidad.avisar(`Varias coincidencias: ${r.varias.slice(0, 4).map((u) => u.nombre).join(", ")}`); return; }
    c.entidad.avisar("");
    set({cveEnt: r.cve, cveMun: null, cveAgeb: null, nivel: ORDEN_NIVEL.indexOf(fuente.nivelMax({cveEnt: r.cve})) >= 1 ? "municipio" : "entidad", seleccion: r.cve});
  });
  c.municipio.input.addEventListener("change", () => {
    const r = buscarUnidad(catalogo.hijos("municipio", geo.cveEnt), c.municipio.value);
    if (!c.municipio.value.trim()) { if (geo.cveMun) set({cveMun: null, cveAgeb: null, nivel: "municipio"}); return; }
    if (!r) { c.municipio.avisar("Ningún municipio con ese nombre en esta entidad"); return; }
    if (r.varias) { c.municipio.avisar(`Varias coincidencias: ${r.varias.slice(0, 4).map((u) => u.nombre).join(", ")}`); return; }
    c.municipio.avisar("");
    const tope = fuente.nivelMax({cveEnt: geo.cveEnt, cveMun: r.cve});
    set({cveMun: r.cve, cveAgeb: null, nivel: ORDEN_NIVEL.indexOf(tope) >= 2 ? "ageb" : "municipio", seleccion: r.cve});
  });
  c.ageb.select.addEventListener("change", () => {
    const v = c.ageb.value || null;
    set({cveAgeb: v, nivel: v ? "manzana" : "ageb", seleccion: v});
  });
  for (const k of ["vista", "poblacion", "anio", "sexo", "edad"]) c[k].select.addEventListener("change", () => { configurar(); avisar(); });
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

// src/components/capitulo/explora.js
// "Explora por tu cuenta": panel de filtros en dos grupos rotulados y una
// figura con dos vistas enlazadas (mapa de burbujas y barras ordenadas) mas la
// tabla de respaldo. Pasar el cursor o el foco por una entidad la resalta en
// las dos vistas; Esc cierra el globo. Los filtros viven en la URL.

import * as d3 from "npm:d3";
import {html} from "npm:htl";
import {CVE_ISO, NACIDOS_CDMX} from "./datos.js";
import {entero, pct, colores, leerURL, escribirURL, sinAcentos, TIPO} from "./base.js";
import {conDescarga} from "./descargar.js";
import {tablaDatos, explicacion} from "./figura.js";

const MEDIDAS = [
  {clave: "nacimiento", etiqueta: "Lugar de nacimiento"},
  {clave: "residencia5", etiqueta: "Dónde vivía hace cinco años"}
];

function mayorPoligono(f) {
  if (f.geometry.type === "Polygon") return f;
  return f.geometry.coordinates.map((c) => ({type: "Feature", geometry: {type: "Polygon", coordinates: c}}))
    .sort((a, b) => d3.geoArea(b) - d3.geoArea(a))[0];
}

export function explora({datos, geoEnt, lector}) {
  const {vista, aniosNac, aniosRes, lenguas, alcaldias, alcNombre} = datos;
  const url = leerURL();
  const lenguaDe = new Map(lenguas.map((l) => [l.clave, l.nombre]));
  const f = {
    medida: url.get("medida") === "residencia5" ? "residencia5" : "nacimiento",
    anio: Number(url.get("anio")) || 2025,
    lengua: lenguaDe.has(url.get("lengua")) ? url.get("lengua") : null,
    alc: alcNombre.has(url.get("alc")) ? url.get("alc") : null
  };
  const aniosDe = (m) => (m === "residencia5" ? aniosRes : aniosNac);
  if (!aniosDe(f.medida).includes(f.anio)) f.anio = 2025;

  const sec = document.createElement("section");
  sec.className = "explora";
  sec.id = "explora";
  sec.setAttribute("aria-labelledby", "explora-titulo");
  sec.innerHTML = `
    <h2 id="explora-titulo">Explora por año, lengua y alcaldía</h2>
    <form class="cap-panel" aria-label="Filtros de la gráfica">
      <fieldset class="cap-grupo">
        <legend>Qué se compara y dónde</legend>
        <div class="cap-campos">
          <fieldset class="campo campo-anio"><legend class="campo-etiqueta">Año</legend><div class="segmentos" data-campo="anio"></div></fieldset>
          <div class="campo campo-lengua">
            <label class="campo-etiqueta" for="f-lengua">Lengua</label>
            <div class="buscador">
              <input id="f-lengua" type="search" list="f-lengua-lista" placeholder="Todas las lenguas" autocomplete="off" spellcheck="false">
              <button type="button" class="buscador-limpiar">Todas</button>
            </div>
            <datalist id="f-lengua-lista">${lenguas.map((l) => `<option value="${l.nombre}"></option>`).join("")}</datalist>
            <p class="campo-aviso" role="status" aria-live="polite"></p>
          </div>
          <div class="campo campo-alc">
            <label class="campo-etiqueta" for="f-alc">Alcaldía donde viven</label>
            <select id="f-alc"><option value="">Toda la ciudad</option>${alcaldias.map(([c, n]) => `<option value="${c}">${n}</option>`).join("")}</select>
          </div>
        </div>
      </fieldset>
      <fieldset class="cap-grupo cap-grupo-medida">
        <legend>Qué se mide</legend>
        <div class="segmentos segmentos-medida" data-campo="medida">
          ${MEDIDAS.map((m) => `<label class="segmento"><input type="radio" name="f-medida" value="${m.clave}"><span>${m.etiqueta}</span></label>`).join("")}
        </div>
      </fieldset>
    </form>
    <p class="explora-estado" role="status" aria-live="polite"></p>`;

  const segAnio = sec.querySelector('[data-campo="anio"]');
  const inLengua = sec.querySelector("#f-lengua");
  const avisoLengua = sec.querySelector(".campo-aviso");
  const selAlc = sec.querySelector("#f-alc");
  const estado = sec.querySelector(".explora-estado");

  function pintarAnios() {
    segAnio.innerHTML = aniosDe(f.medida).map((a) => `<label class="segmento"><input type="radio" name="f-anio" value="${a}" ${a === f.anio ? "checked" : ""}><span>${a}</span></label>`).join("");
  }
  pintarAnios();
  sec.querySelector(`input[name="f-medida"][value="${f.medida}"]`).checked = true;
  inLengua.value = f.lengua ? lenguaDe.get(f.lengua) : "";
  selAlc.value = f.alc ?? "";

  // ------------------------------------------------------------ figura
  const cifra = html`<div class="cifra"><span class="cifra-valor"></span><p class="cifra-texto"></p></div>`;
  const titulo = html`<h3></h3>`;
  const sub = html`<p class="grafica-sub"></p>`;
  const leyenda = html`<p class="leyenda"></p>`;
  const vistaMapa = html`<div class="vista-mapa"></div>`;
  const vistaBarras = html`<div class="vista-barras"></div>`;
  const globo = html`<div class="globo" role="tooltip" hidden></div>`;
  const lienzo = html`<div class="grafica-lienzo explora-vistas">${vistaMapa}${vistaBarras}${globo}</div>`;
  const pie = html`<figcaption></figcaption>`;
  const figura = conDescarga(html`<figure class="grafica grafica-explora">${cifra}${titulo}${sub}${leyenda}${lienzo}${pie}</figure>`);
  const desplegables = html`<div class="desplegables"></div>`;
  sec.append(figura, desplegables);

  let resaltada = null;
  let ultimo = null;

  function textoGlobo(d, v) {
    const dim = f.medida === "residencia5" ? "Vivía hace cinco años en" : "Entidad de nacimiento";
    const base = f.medida === "residencia5" ? "de quienes llegaron" : "de los hablantes";
    // Jerarquía del globo: dimensión y entidad como rótulos chicos (la entidad
    // con la muestra de su color), la cifra grande en el color de la marca y
    // las personas en un renglón tenue.
    const c = colores();
    const color = d.ent === lector.ent ? c.rojo : c.dato;
    return `<span class="gt-ref">${dim}</span><span class="gt-grupo"><i class="gt-muestra" style="background:${color}"></i>${d.nombre}</span><span class="gt-cifra" style="color:${color}">${pct(d.share)}</span><span class="gt-que">${base}</span><span class="gt-pob">${entero(d.num)} personas</span>`;
  }

  function mostrarGlobo(ent, ancla) {
    const v = ultimo;
    const d = v?.porEnt.find((x) => x.ent === ent);
    if (!d) { globo.hidden = true; return; }
    globo.innerHTML = textoGlobo(d, v);
    globo.hidden = false;
    const caja = lienzo.getBoundingClientRect();
    const r = ancla.getBoundingClientRect();
    const gw = globo.offsetWidth, gh = globo.offsetHeight;
    let x = r.left - caja.left + r.width / 2 - gw / 2;
    let y = r.top - caja.top - gh - 10;
    if (y < 0) y = r.bottom - caja.top + 10;
    x = Math.max(0, Math.min(caja.width - gw, x));
    globo.style.left = `${x}px`;
    globo.style.top = `${y}px`;
  }

  function resaltar(ent, ancla) {
    resaltada = ent;
    const c = colores();
    lienzo.querySelectorAll("[data-ent]").forEach((n) => {
      const si = n.dataset.ent === ent;
      if (n.classList.contains("burbuja")) n.setAttribute("stroke-width", si ? 2.5 : 1), n.setAttribute("stroke", si ? c.tinta : n.dataset.trazo);
      if (n.classList.contains("barra-fila")) n.querySelector(".barra-marco").setAttribute("stroke", si ? c.tinta : "none");
    });
    if (ent && ancla) mostrarGlobo(ent, ancla);
    if (!ent) globo.hidden = true;
  }

  function mapa(v, ancho) {
    const c = colores();
    const W = ancho, H = Math.round(Math.min(560, Math.max(260, W * 0.64)));
    const proy = d3.geoMercator().fitExtent([[8, 8], [W - 8, H - 8]], geoEnt);
    const ruta = d3.geoPath(proy);
    const r = d3.scaleSqrt().domain([0, v.tope]).range([0, Math.max(14, W * 0.07)]);
    const svg = d3.create("svg").attr("width", W).attr("height", H).attr("viewBox", `0 0 ${W} ${H}`)
      .attr("role", "img").attr("font-family", "Schibsted Grotesk, system-ui, sans-serif")
      .attr("aria-label", `Mapa de burbujas por entidad. ${v.porEnt.slice(0, 3).map((d) => `${d.nombre}: ${entero(d.num)}`).join("; ")}.`);
    svg.append("g").selectAll("path").data(geoEnt.features).join("path").attr("d", ruta)
      .attr("fill", (fe) => (fe.properties.id === "MX-CMX" ? c.tierraBorde : c.tierra)).attr("stroke", c.lienzo).attr("stroke-width", 0.8);
    const anclas = new Map(geoEnt.features.map((fe) => [fe.properties.id, ruta.centroid(mayorPoligono(fe))]));
    const puntos = v.porEnt.map((d) => ({...d, xy: anclas.get(`MX-${CVE_ISO[d.ent.slice(1)]}`)})).filter((d) => d.xy);
    svg.append("g").selectAll("circle").data(puntos).join("circle")
      .attr("class", "burbuja").attr("data-ent", (d) => d.ent)
      .attr("cx", (d) => d.xy[0]).attr("cy", (d) => d.xy[1]).attr("r", (d) => Math.max(1.5, r(d.num)))
      .attr("fill", (d) => (d.ent === lector.ent ? c.rojo : c.dato)).attr("fill-opacity", (d) => (d.ent === lector.ent ? 0.7 : 0.32))
      .attr("stroke", (d) => (d.ent === lector.ent ? c.rojo : c.dato)).attr("data-trazo", (d) => (d.ent === lector.ent ? c.rojo : c.dato)).attr("stroke-width", 1)
      .on("pointerenter", function (e, d) { resaltar(d.ent, this); })
      .on("pointerleave", () => resaltar(null));
    const cd = anclas.get("MX-CMX");
    svg.append("circle").attr("cx", cd[0]).attr("cy", cd[1]).attr("r", 3.5).attr("fill", c.tinta);
    return svg.node();
  }

  function barras(v, ancho) {
    const c = colores();
    const angosto = ancho < 420;
    const fila = 24, izq = angosto ? 128 : 162, der = 64;
    const W = ancho, H = v.porEnt.length * fila + 8;
    const x = d3.scaleLinear().domain([0, v.tope]).range([izq, W - der]);
    const svg = d3.create("svg").attr("width", W).attr("height", H).attr("viewBox", `0 0 ${W} ${H}`)
      .attr("role", "list").attr("aria-label", "Personas por entidad, de mayor a menor. Usa las flechas para recorrer las entidades.")
      .attr("font-family", "Schibsted Grotesk, system-ui, sans-serif");
    const g = svg.selectAll("g").data(v.porEnt).join("g")
      .attr("class", "barra-fila").attr("data-ent", (d) => d.ent).attr("role", "listitem")
      .attr("tabindex", (d, i) => (i === 0 ? 0 : -1))
      .attr("aria-label", (d) => `${d.nombre}: ${entero(d.num)} personas, ${pct(d.share)}`)
      .attr("transform", (d, i) => `translate(0,${4 + i * fila})`);
    g.append("rect").attr("class", "barra-marco").attr("x", 0).attr("y", 0).attr("width", W).attr("height", fila - 2)
      .attr("fill", "transparent").attr("stroke", "none").attr("rx", 3);
    g.append("text").attr("x", izq - 8).attr("y", fila / 2).attr("dy", "0.34em").attr("text-anchor", "end")
      .attr("font-size", TIPO.ejes).attr("fill", c.tinta).attr("font-weight", (d) => (d.ent === lector.ent ? 700 : 400))
      .text((d) => (angosto ? d.nombre.replace("Estado de México", "Edo. de México").replace("Baja California Sur", "B. C. Sur").replace("San Luis Potosí", "S. L. Potosí") : d.nombre));
    g.append("rect").attr("x", izq).attr("y", 4).attr("height", fila - 10)
      .attr("width", (d) => Math.max(1, x(d.num) - izq)).attr("fill", (d) => (d.ent === lector.ent ? c.rojo : c.dato)).attr("rx", 1.5);
    g.append("text").attr("x", (d) => x(d.num) + 6).attr("y", fila / 2).attr("dy", "0.34em")
      .attr("font-size", TIPO.valor).attr("fill", c.tenue).attr("font-variant-numeric", "lining-nums").text((d) => entero(d.num));
    g.on("pointerenter", function (e, d) { resaltar(d.ent, this.querySelector("rect:nth-of-type(2)")); })
      .on("pointerleave", () => resaltar(null))
      .on("focus", function (e, d) { resaltar(d.ent, this.querySelector("rect:nth-of-type(2)")); })
      .on("blur", () => resaltar(null))
      .on("keydown", function (e) {
        const filas = [...svg.node().querySelectorAll(".barra-fila")];
        const i = filas.indexOf(this);
        const sig = e.key === "ArrowDown" ? filas[i + 1] : e.key === "ArrowUp" ? filas[i - 1] : e.key === "Home" ? filas[0] : e.key === "End" ? filas.at(-1) : null;
        if (sig) { e.preventDefault(); filas.forEach((n) => n.setAttribute("tabindex", -1)); sig.setAttribute("tabindex", 0); sig.focus(); }
      });
    return svg.node();
  }

  function pintar() {
    const v = vista(f);
    ultimo = v;
    const lugar = f.alc ? alcNombre.get(f.alc) : "la ciudad";
    const nomLen = f.lengua ? lenguaDe.get(f.lengua) : null;
    const res = f.medida === "residencia5";
    const L = lector.info();
    if (res) {
      cifra.querySelector(".cifra-valor").textContent = entero(v.tot);
      cifra.querySelector(".cifra-texto").textContent = `hablantes que viven en ${lugar} vivían en otra entidad cinco años antes, ${f.anio}`;
    } else {
      cifra.querySelector(".cifra-valor").textContent = v.tot ? pct((100 * v.otraNum) / v.tot) : "sin dato";
      cifra.querySelector(".cifra-texto").textContent = v.tot ? `nacieron en otra entidad: ${entero(v.otraNum)} de ${entero(v.tot)} hablantes que viven en ${lugar}, ${f.anio}` : `sin hablantes en la muestra para esta combinación, ${f.anio}`;
    }
    titulo.textContent = res ? `Dónde vivían cinco años antes los hablantes que llegaron a ${lugar}, ${f.anio}` : `En qué entidad nacieron los hablantes que viven en ${lugar}, ${f.anio}`;
    sub.textContent = `${nomLen ?? "Todas las lenguas"} · ${f.alc ? alcNombre.get(f.alc) : "toda la ciudad"} · el área de cada círculo y el largo de cada barra son proporcionales al número de personas, con la misma escala en todas las ediciones`;
    leyenda.innerHTML = `<span class="ley-item"><span class="ley-muestra m-dato"></span>Entidad</span>${L ? `<span class="ley-item"><span class="ley-muestra m-rojo"></span>Tu entidad: ${L.nombre}</span>` : ""}<span class="ley-item"><span class="ley-muestra m-punto"></span>Ciudad de México</span>`;
    pie.textContent = res
      ? "Censos, Conteo 2005 y Encuestas Intercensales del INEGI · cada círculo y cada barra es la entidad donde vivían cinco años antes quienes hoy viven en la ciudad"
      : "Censos y Encuestas Intercensales del INEGI · cada círculo y cada barra es una entidad de nacimiento de los hablantes que viven en la ciudad; en rojo, la entidad que elegiste";
    const ancho = lienzo.clientWidth || 640;
    const lado = ancho >= 820;
    lienzo.classList.toggle("lado", lado);
    const anchoMapa = lado ? Math.floor(ancho * 0.56) - 16 : ancho;
    const anchoBarras = lado ? ancho - anchoMapa - 32 : ancho;
    globo.hidden = true;
    if (!v.porEnt.length) {
      vistaMapa.replaceChildren(html`<p class="sin-dato">Sin dato: la muestra no registró hablantes nacidos en otra entidad para esta combinación de filtros.</p>`);
      vistaBarras.replaceChildren();
    } else {
      vistaMapa.replaceChildren(mapa(v, anchoMapa));
      vistaBarras.replaceChildren(barras(v, anchoBarras));
    }
    // Tabla de respaldo: todas las entidades y las otras categorias aparte.
    const filas = [...v.porEnt.map((d) => ({nombre: d.nombre, num: d.num, share: d.share, casos: d.casos})),
      ...(res ? [] : [
        {nombre: "Ciudad de México (nacieron aquí)", ...v.resto.ciudad},
        {nombre: "Otro país", ...v.resto.pais},
        {nombre: "No especificado", ...v.resto.ne}
      ].map((d) => ({...d, share: v.tot ? (100 * d.num) / v.tot : 0})))];
    desplegables.replaceChildren(
      fuentes(),
      explicacion("El censo pregunta en qué entidad o país nació cada persona y en qué entidad vivía cinco años antes. Aquí se cuenta a quienes hablan una lengua indígena y viven en la Ciudad de México, o en la alcaldía elegida. El denominador de cada porcentaje es el total de esos hablantes, incluidos quienes nacieron en la ciudad, en otro país o no especificaron dónde; las lenguas con clave no específica entran en los totales aunque no aparezcan en la lista de lenguas. «Dónde vivía hace cinco años» cuenta solo a quienes vivían en otra entidad, con 5 años o más. Las cifras son estimaciones de muestras del INEGI: al elegir una lengua o una alcaldía la muestra se reduce, y las cifras de entidades con pocos casos son inestables. El universo de estas muestras no coincide con los totales de hablantes del censo por alcaldía, por eso no se mezclan en una misma gráfica. El Conteo 2005 no preguntó el lugar de nacimiento, y la muestra de 2000 estima más hablantes que el conteo de ese año."),
      tablaDatos(filas, [
        {etiqueta: res ? "Entidad donde vivía" : "Entidad de nacimiento", valor: (r) => r.nombre},
        {etiqueta: "Personas", num: true, valor: (r) => entero(r.num)},
        {etiqueta: "% del total", num: true, valor: (r) => (v.tot ? pct(r.share) : "sin dato")},
        {etiqueta: "Casos en la muestra", num: true, valor: (r) => entero(r.casos)}
      ])
    );
    estado.textContent = `${v.porEnt.length === 1 ? "Se muestra 1 entidad" : `Se muestran ${v.porEnt.length} entidades`}, ${f.anio}${nomLen ? `, ${nomLen}` : ""}${f.alc ? `, ${alcNombre.get(f.alc)}` : ""}.`;
  }

  function fuentes() {
    return html`<details><summary>Fuentes</summary><div>
      <p><strong>Datos.</strong> Microdatos de las muestras del INEGI:</p>
      <ul>
        <li><a href="https://www.inegi.org.mx/programas/ccpv/1990/#microdatos">XI Censo General de Población y Vivienda 1990, muestra del 10 %</a></li>
        <li><a href="https://www.inegi.org.mx/programas/ccpv/2000/#microdatos">XII Censo General de Población y Vivienda 2000, cuestionario ampliado</a></li>
        <li><a href="https://www.inegi.org.mx/programas/ccpv/2005/#microdatos">II Conteo de Población y Vivienda 2005, muestra</a></li>
        <li><a href="https://www.inegi.org.mx/programas/ccpv/2010/#microdatos">Censo de Población y Vivienda 2010, cuestionario ampliado</a></li>
        <li><a href="https://www.inegi.org.mx/programas/intercensal/2015/#microdatos">Encuesta Intercensal 2015</a></li>
        <li><a href="https://www.inegi.org.mx/programas/ccpv/2020/#microdatos">Censo de Población y Vivienda 2020, cuestionario ampliado</a></li>
        <li><a href="https://www.inegi.org.mx/programas/eic/2025/#microdatos">Encuesta Intercensal 2025</a></li>
      </ul>
      <p><strong>Verificado con fuente.</strong></p>
      <ul>
        <li><span class="cotejo-pendiente">No coincide.</span> 2020: la Secretaría de Pueblos y Barrios Originarios de la ciudad publica 84.3 % de hablantes nacidos en otra entidad, con el cuestionario básico del Censo; con la muestra del cuestionario ampliado esta gráfica da 81.7 %, 2.6 puntos menos (<a href="https://sepi.cdmx.gob.mx/storage/app/uploads/public/66f/472/de4/66f472de449dd418314492.pdf">SEPI, 2024</a>).</li>
        <li><span class="cotejo-pendiente">Verificación pendiente.</span> 2025: no se localizó una tabla oficial de hablantes por entidad de nacimiento para la ciudad; la referencia más cercana son los tabulados de la <a href="https://www.inegi.org.mx/programas/eic/2025/">Encuesta Intercensal 2025</a>.</li>
      </ul>
    </div></details>`;
  }

  // ------------------------------------------------------------ eventos
  const aplicar = () => {
    escribirURL({medida: f.medida === "nacimiento" ? null : f.medida, anio: f.anio === 2025 ? null : f.anio, lengua: f.lengua, alc: f.alc});
    pintar();
  };
  segAnio.addEventListener("change", (e) => { f.anio = Number(e.target.value); aplicar(); });
  sec.querySelector('[data-campo="medida"]').addEventListener("change", (e) => {
    f.medida = e.target.value;
    if (!aniosDe(f.medida).includes(f.anio)) {
      // 2005 solo existe para la residencia de cinco años antes: se pasa a la edición siguiente.
      f.anio = aniosDe(f.medida).find((a) => a > f.anio) ?? 2025;
    }
    pintarAnios();
    aplicar();
  });
  selAlc.addEventListener("change", () => { f.alc = selAlc.value || null; aplicar(); });
  const elegirLengua = (final) => {
    const q = sinAcentos(inLengua.value);
    avisoLengua.textContent = "";
    if (!q) { if (f.lengua) { f.lengua = null; aplicar(); } return; }
    const exacta = lenguas.find((l) => sinAcentos(l.nombre) === q);
    if (exacta) { if (f.lengua !== exacta.clave) { f.lengua = exacta.clave; aplicar(); } return; }
    if (!final) return;
    const parciales = lenguas.filter((l) => sinAcentos(l.nombre).includes(q));
    if (parciales.length === 1) { inLengua.value = parciales[0].nombre; f.lengua = parciales[0].clave; aplicar(); }
    else if (!parciales.length) avisoLengua.textContent = `Ninguna lengua coincide con «${inLengua.value}». La gráfica no cambió.`;
    else avisoLengua.textContent = `Varias lenguas coinciden con «${inLengua.value}»: ${parciales.slice(0, 4).map((l) => l.nombre).join(", ")}${parciales.length > 4 ? " y otras" : ""}. Elige una de la lista.`;
  };
  inLengua.addEventListener("input", () => elegirLengua(false));
  inLengua.addEventListener("change", () => elegirLengua(true));
  inLengua.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); elegirLengua(true); } });
  sec.querySelector(".buscador-limpiar").addEventListener("click", () => { inLengua.value = ""; avisoLengua.textContent = ""; f.lengua = null; aplicar(); inLengua.focus(); });
  sec.querySelector("form").addEventListener("submit", (e) => e.preventDefault());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !globo.hidden) { globo.hidden = true; resaltar(null); } });
  window.addEventListener("sdi:tema", pintar);
  lector.alCambiar(pintar);
  let anchoPrevio = 0;
  new ResizeObserver(() => { const w = lienzo.clientWidth; if (Math.abs(w - anchoPrevio) > 2) { anchoPrevio = w; pintar(); } }).observe(lienzo);
  pintar();
  return sec;
}

export {NACIDOS_CDMX};

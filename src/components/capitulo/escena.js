// src/components/capitulo/escena.js
// La grafica persistente de la historia: un solo SVG que cambia de estado entre
// pasos. El mapa se acerca de Mexico a la ciudad con una transformacion, las
// burbujas cambian de tamano con el tiempo, los arcos se dibujan como flujos y
// la linea se traza en orden temporal. Lo que no es mapa (la rejilla de 100,
// el diagrama de flujos y la linea) vive en capas propias del mismo SVG.
//
// Colores por clase CSS con variables del tema: esta grafica no se descarga,
// asi que cambia de tema sin repintar. La coropleta si resuelve colores en JS
// y se repinta con el evento sdi:tema.

import * as d3 from "npm:d3";
import {sankey as d3Sankey} from "npm:d3-sankey";
import {CVE_ISO, ANIO} from "./datos.js";
import {entero, pct, colores, svgNS} from "./base.js";

const DUR = 800;
// Dominio fijo de la coropleta de naahuatl, medido sobre las 16 alcaldias en
// 2025 (15.2 a 50.1 %): cubre todos los valores y usa el 92 % de la rampa.
export const DOMINIO_NAH = [14, 52];

function mayorPoligono(f) {
  if (f.geometry.type === "Polygon") return f;
  const partes = f.geometry.coordinates.map((c) => ({type: "Feature", properties: f.properties, geometry: {type: "Polygon", coordinates: c}}));
  return partes.sort((a, b) => d3.geoArea(b) - d3.geoArea(a))[0];
}

// Arco cuadratico entre dos puntos; la curvatura separa los flujos que llegan
// al mismo destino.
function arco(a, b, curva = 0.22) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const cx = mx - dy * curva, cy = my + dx * curva;
  return `M${a[0]},${a[1]}Q${cx},${cy} ${b[0]},${b[1]}`;
}

const el = (nombre, attrs = {}) => {
  const n = document.createElementNS(svgNS, nombre);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

export class Escena {
  constructor({H, geoEnt, geoAlc, alcNombre, entNombre}) {
    this.H = H; this.geoEnt = geoEnt; this.geoAlc = geoAlc; this.alcNombre = alcNombre; this.entNombre = entNombre;
    this.estado = null;
    this.raiz = document.createElement("div");
    this.raiz.className = "escena";
    this.raiz.setAttribute("aria-hidden", "true");
    this.svg = d3.select(this.raiz).append("svg").attr("class", "escena-svg").attr("focusable", "false");
    this.capaMapa = this.svg.append("g").attr("class", "capa-mapa");
    this.gEst = this.capaMapa.append("g").attr("class", "esc-estados");
    this.gAlc = this.capaMapa.append("g").attr("class", "esc-alcaldias");
    this.gBurb = this.capaMapa.append("g").attr("class", "esc-burbujas");
    this.gArcos = this.capaMapa.append("g").attr("class", "esc-arcos");
    this.gCir = this.capaMapa.append("g").attr("class", "esc-circulos");
    this.gCirLector = this.capaMapa.append("g").attr("class", "esc-circulos-lector");
    this.gContorno = this.capaMapa.append("g").attr("class", "esc-contorno");
    this.gDestino = this.capaMapa.append("g").attr("class", "esc-destino");
    this.gRot = this.svg.append("g").attr("class", "esc-rotulos");
    this.gUni = this.svg.append("g").attr("class", "esc-unidades");
    this.gSan = this.svg.append("g").attr("class", "esc-sankey");
    this.gLin = this.svg.append("g").attr("class", "esc-linea");
    this.anio = d3.select(this.raiz).append("div").attr("class", "escena-anio");
    this.leyenda = d3.select(this.raiz).append("div").attr("class", "escena-leyenda");
    window.addEventListener("sdi:tema", () => { if (this.estado) this.ir(this.estado, false, true); });
  }

  // Tamano del lienzo y zona libre para dibujar (en la vista ancha, la columna
  // de tarjetas queda a la izquierda y el mapa se acomoda a su derecha).
  medir(ancho, alto, zona) {
    if (!ancho || !alto) return;
    if (this.W === ancho && this.Hh === alto && this.zona && zona.x0 === this.zona.x0 && zona.y1 === this.zona.y1) return;
    this.W = ancho; this.Hh = alto; this.zona = zona;
    this.svg.attr("width", ancho).attr("height", alto).attr("viewBox", `0 0 ${ancho} ${alto}`);
    const {x0, y0, x1, y1} = zona;
    this.proy = d3.geoMercator().fitExtent([[x0, y0], [x1, y1]], this.geoEnt);
    this.ruta = d3.geoPath(this.proy);
    this.anclas = new Map(this.geoEnt.features.map((f) => [f.properties.id, this.ruta.centroid(mayorPoligono(f))]));
    this.destino = this.anclas.get("MX-CMX");
    this.anclasAlc = new Map(this.geoAlc.features.map((f) => [f.properties.CVEGEO.slice(2), this.ruta.centroid(f)]));
    // Acercamiento a la ciudad: los limites de las alcaldias en la proyeccion nacional.
    const [[bx0, by0], [bx1, by1]] = this.ruta.bounds(this.geoAlc);
    const k = 0.92 * Math.min((x1 - x0) / (bx1 - bx0), (y1 - y0) / (by1 - by0));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    this.zoomCiudad = {k, x: cx - k * (bx0 + bx1) / 2, y: cy - k * (by0 + by1) / 2};
    this.rMax = Math.max(14, Math.min(x1 - x0, y1 - y0) * 0.085);
    this.rEnt = d3.scaleSqrt().domain([0, this.H.maxEntAnio]).range([0, this.rMax]);
    this.rAlc = d3.scaleSqrt().domain([0, this.H.maxAlc]).range([0, Math.min(x1 - x0, y1 - y0) * 0.11]);
    this.gEst.selectAll("path").data(this.geoEnt.features, (f) => f.properties.id).join("path")
      .attr("class", (f) => `esc-tierra${f.properties.id === "MX-CMX" ? " es-ciudad" : ""}`).attr("d", this.ruta);
    this.gAlc.selectAll("path").data(this.geoAlc.features, (f) => f.properties.CVEGEO).join("path")
      .attr("class", "esc-alc").attr("d", this.ruta);
    if (this.estado) this.ir(this.estado, false, true);
  }

  // Cambia al estado {paso, sub, entidad}. `animar` en falso pinta sin transicion.
  ir(estado, animar = true, forzar = false) {
    if (!this.proy) { this.estado = estado; return; }
    const previo = this.estado;
    if (!forzar && previo && previo.paso === estado.paso && previo.sub === estado.sub && previo.entidad === estado.entidad) return;
    this.estado = estado;
    this.svg.selectAll("*").interrupt();
    const t = animar ? this.svg.transition("escena").duration(DUR).ease(d3.easeCubicInOut) : null;
    const T = (sel) => (t ? sel.transition(t) : sel);
    const entra = !previo || previo.paso !== estado.paso;
    const p = estado.paso;
    const visible = {mapa: ["b", "c", "d", "f"].includes(p), uni: p === "a", san: p === "e", lin: p === "g"};
    T(this.capaMapa).style("opacity", visible.mapa ? 1 : 0);
    T(this.gUni).style("opacity", visible.uni ? 1 : 0);
    T(this.gSan).style("opacity", visible.san ? 1 : 0);
    T(this.gLin).style("opacity", visible.lin ? 1 : 0);
    // La transformacion del mapa: Mexico entero o la ciudad.
    const z = ["d", "f"].includes(p) ? this.zoomCiudad : {k: 1, x: 0, y: 0};
    if (visible.mapa || !previo) {
      T(this.capaMapa).attr("transform", `translate(${z.x},${z.y}) scale(${z.k})`);
      T(this.gEst.selectAll("path")).attr("stroke-width", 1 / z.k).style("opacity", ["d", "f"].includes(p) ? 0.55 : 1);
      T(this.gAlc.selectAll("path")).attr("stroke-width", 1.2 / z.k).style("opacity", ["d", "f"].includes(p) ? 1 : 0);
    }
    this.z = z;
    const idDe = (ent) => (ent ? `MX-${CVE_ISO[ent.slice(1)]}` : null);
    const idActivo = p === "c" ? idDe(estado.sub) : null, idLector = ["b", "c"].includes(p) ? idDe(estado.entidad) : null;
    this.gEst.selectAll("path").classed("es-activo", (f) => f.properties.id === idActivo).classed("es-lector-ent", (f) => f.properties.id === idLector);
    this.anio.text(p === "b" ? String(estado.sub ?? this.H.aniosNac[0]) : "").classed("activo", p === "b");
    this.pintarUnidades(estado, T, entra && animar);
    this.pintarBurbujas(estado, T);
    this.pintarArcos(estado, T, entra && animar);
    this.pintarCirculos(estado, T);
    this.pintarCoropleta(estado, T);
    this.pintarSankey(estado, T, entra && animar);
    this.pintarLinea(estado, T, entra && animar);
    this.pintarRotulos(estado, animar);
    this.pintarLeyenda(estado);
  }

  pintarUnidades(estado, T, animar) {
    const {x0, y0, x1, y1} = this.zona;
    const lado = Math.min(x1 - x0, y1 - y0) * 0.74;
    const paso = lado / 10;
    const ox = (x0 + x1) / 2 - lado / 2, oy = (y0 + y1) / 2 - lado / 2;
    const u = this.H.unidades;
    const L = estado.entidad ? this.H.entidad(estado.entidad) : null;
    const nLector = L && L.num ? Math.max(1, Math.round(L.shareTotal)) : 0;
    const datos = d3.range(100).map((i) => ({i, cat: i < u.otra ? "otra" : i < u.otra + u.pais ? "pais" : i < u.otra + u.pais + u.ne ? "ne" : "ciudad", lector: i < nLector}));
    const activo = estado.paso === "a";
    const c = this.gUni.selectAll("circle").data(datos).join("circle")
      .attr("cx", (d) => ox + (d.i % 10) * paso + paso / 2).attr("cy", (d) => oy + Math.floor(d.i / 10) * paso + paso / 2)
      .attr("r", paso * 0.36)
      .attr("class", (d) => `esc-unidad cat-${d.cat}${d.lector ? " es-lector" : ""}`);
    if (animar && activo) {
      // Los 100 puntos se llenan en orden: primero los nacidos en otra entidad.
      c.classed("lleno", false).transition().delay((d) => 200 + d.i * 9).duration(1).on("end", function () { this.classList.add("lleno"); });
    } else c.classed("lleno", true);
  }

  pintarBurbujas(estado, T) {
    const p = estado.paso;
    const anio = p === "b" ? (estado.sub ?? this.H.aniosNac[0]) : ANIO;
    const m = this.H.porAnioEnt.get(anio);
    const datos = this.geoEnt.features.filter((f) => f.properties.id !== "MX-CMX").map((f) => {
      const cve = Object.keys(CVE_ISO).find((k) => `MX-${CVE_ISO[k]}` === f.properties.id);
      return {id: f.properties.id, ent: `0${cve}`, num: m.get(`0${cve}`) ?? 0, xy: this.anclas.get(f.properties.id)};
    }).sort((a, b) => b.num - a.num);
    const sel = this.gBurb.selectAll("circle").data(datos, (d) => d.id).join((e) => e.append("circle").attr("r", 0));
    sel.attr("cx", (d) => d.xy[0]).attr("cy", (d) => d.xy[1])
      .attr("class", (d) => `esc-burbuja${d.ent === estado.entidad ? " es-lector" : ""}`);
    sel.filter((d) => d.ent === estado.entidad).raise();
    const mostrar = p === "b" || p === "c";
    T(sel).attr("r", (d) => (mostrar ? this.rEnt(d.num) : 0)).style("opacity", p === "c" ? 0.18 : 1);
    // La ciudad como destino.
    this.gDestino.selectAll("circle").data(mostrar ? [this.destino] : []).join("circle")
      .attr("class", "esc-destino-punto").attr("cx", (d) => d[0]).attr("cy", (d) => d[1]).attr("r", 4.5);
  }

  pintarArcos(estado, T, animar) {
    const p = estado.paso;
    const m = this.H.porAnioEnt.get(ANIO);
    const ancho = d3.scaleSqrt().domain([0, d3.max(m.values())]).range([0.6, Math.max(4, this.rMax * 0.42)]);
    const activo = p === "c" ? estado.sub : null;
    const datos = [...m.entries()].map(([ent, num]) => ({ent, num, a: this.anclas.get(`MX-${CVE_ISO[ent.slice(1)]}`)})).filter((d) => d.a).sort((a, b) => a.num - b.num);
    const sel = this.gArcos.selectAll("path").data(p === "c" ? datos : [], (d) => d.ent)
      .join((e) => e.append("path").attr("pathLength", 1).style("stroke-dasharray", "1 1").style("stroke-dashoffset", 1));
    sel.attr("d", (d) => arco(d.a, this.destino)).attr("stroke-width", (d) => ancho(d.num))
      .attr("class", (d) => `esc-arco${d.ent === activo ? " activo" : ""}${d.ent === estado.entidad ? " es-lector" : ""}`);
    sel.filter((d) => d.ent === activo || d.ent === estado.entidad).raise();
    if (animar) {
      const orden = [...datos].sort((a, b) => b.num - a.num).map((d) => d.ent);
      sel.style("stroke-dashoffset", 1).transition().delay((d) => 120 + orden.indexOf(d.ent) * 40).duration(900).ease(d3.easeCubicOut).style("stroke-dashoffset", 0);
    } else sel.style("stroke-dashoffset", 0);
  }

  pintarCirculos(estado, T) {
    const p = estado.paso;
    const k = this.z.k;
    const datos = [...this.H.alcOtra.entries()].map(([cve, num]) => ({cve, num, xy: this.anclasAlc.get(cve)})).filter((d) => d.xy).sort((a, b) => b.num - a.num);
    const sel = this.gCir.selectAll("circle").data(p === "d" ? datos : [], (d) => d.cve).join((e) => e.append("circle").attr("r", 0));
    sel.attr("cx", (d) => d.xy[0]).attr("cy", (d) => d.xy[1]).attr("class", "esc-circulo").attr("stroke-width", 1.2 / k);
    T(sel).attr("r", (d) => this.rAlc(d.num) / k);
    const mLector = estado.entidad ? this.H.alcPorEnt.get(estado.entidad) : null;
    const datosL = p === "d" && mLector ? [...mLector.entries()].map(([cve, num]) => ({cve, num, xy: this.anclasAlc.get(cve)})).filter((d) => d.xy) : [];
    const selL = this.gCirLector.selectAll("circle").data(datosL, (d) => d.cve).join((e) => e.append("circle").attr("r", 0));
    selL.attr("cx", (d) => d.xy[0]).attr("cy", (d) => d.xy[1]).attr("class", "esc-circulo es-lector").attr("stroke-width", 1.2 / k);
    T(selL).attr("r", (d) => this.rAlc(d.num) / k);
  }

  pintarCoropleta(estado, T) {
    const p = estado.paso;
    const c = colores();
    const escala = d3.scaleLinear().domain([DOMINIO_NAH[0], (DOMINIO_NAH[0] + DOMINIO_NAH[1]) / 2, DOMINIO_NAH[1]]).range(c.rampa).clamp(true);
    const share = (f) => { const d = this.H.porAlc.get(f.properties.CVEGEO.slice(2)); return d && d.tot ? (100 * d.nah) / d.tot : null; };
    T(this.gAlc.selectAll("path")).style("fill", (f) => (p === "f" ? (share(f) == null ? c.tierra : escala(share(f))) : c.tierra));
    const milpa = this.geoAlc.features.filter((f) => f.properties.CVEGEO === "09009");
    this.gContorno.selectAll("path").data(p === "f" ? milpa : []).join("path").attr("class", "esc-contorno-rojo")
      .attr("d", this.ruta).attr("stroke-width", 3 / this.z.k);
  }

  pintarSankey(estado, T, animar) {
    if (estado.paso !== "e") { this.gSan.selectAll("*").remove(); return; }
    const {x0, y0, x1, y1} = this.zona;
    const angosto = x1 - x0 < 520;
    const mx = angosto ? 108 : 186;
    const datos = this.H.sankey(estado.entidad);
    const g = d3Sankey().nodeId((d) => d.id).nodeWidth(12).nodePadding(angosto ? 9 : 12).nodeSort(null)
      .extent([[x0 + mx, y0 + 8], [x1 - mx, y1 - 8]])({nodes: datos.nodos.map((d) => ({...d})), links: datos.enlaces.map((d) => ({...d}))});
    const dest = estado.entidad && datos.nodos.some((n) => n.id === `o:${estado.entidad}`) ? `o:${estado.entidad}` : "o:020";
    const esL = estado.entidad && dest === `o:${estado.entidad}` ? " es-lector" : "";
    const curva = (d) => {
      const xa = d.source.x1, xb = d.target.x0, xm = (xa + xb) / 2;
      return `M${xa},${d.y0}C${xm},${d.y0} ${xm},${d.y1} ${xb},${d.y1}`;
    };
    this.gSan.selectAll("*").remove();
    const enl = this.gSan.append("g").selectAll("path").data(g.links.sort((a, b) => (a.source.id === dest) - (b.source.id === dest))).join("path")
      .attr("class", (d) => `esc-flujo${d.source.id === dest ? ` activo${esL}` : ""}`).attr("d", curva)
      .attr("stroke-width", (d) => Math.max(1, d.width)).attr("pathLength", 1).style("stroke-dasharray", "1 1");
    if (animar) enl.style("stroke-dashoffset", 1).transition().delay((d, i) => 80 + i * 14).duration(900).ease(d3.easeCubicOut).style("stroke-dashoffset", 0);
    else enl.style("stroke-dashoffset", 0);
    this.gSan.append("g").selectAll("rect").data(g.nodes).join("rect")
      .attr("class", (d) => `esc-nodo${d.id === dest ? ` activo${esL}` : ""}`)
      .attr("x", (d) => d.x0).attr("y", (d) => d.y0).attr("width", (d) => d.x1 - d.x0).attr("height", (d) => Math.max(1, d.y1 - d.y0));
    const fs = angosto ? 12 : 13;
    const rot = this.gSan.append("g").selectAll("text").data(g.nodes).join("text")
      .attr("class", (d) => `esc-rotulo-san${d.id === dest ? ` activo${esL}` : ""}`)
      .attr("x", (d) => (d.lado === "o" ? d.x0 - 6 : d.x1 + 6)).attr("y", (d) => (d.y0 + d.y1) / 2)
      .attr("text-anchor", (d) => (d.lado === "o" ? "end" : "start")).attr("dominant-baseline", "middle").style("font-size", `${fs}px`);
    const corto = (n) => (angosto ? n.replace("Gustavo A. Madero", "G. A. Madero").replace("Estado de México", "Edo. Méx.").replace("Otras entidades", "Otras").replace("Otras alcaldías", "Otras") : n);
    rot.append("tspan").text((d) => corto(d.nombre));
    rot.append("tspan").attr("class", "cifra-san").attr("dx", 5).text((d) => entero(d.value));
    this.sankeyDatos = {g, dest};
  }

  pintarLinea(estado, T, animar) {
    if (estado.paso !== "g") { this.gLin.selectAll("*").remove(); return; }
    const {x0, y0, x1, y1} = this.zona;
    const datos = this.H.llegadas;
    const L = estado.entidad ? this.H.entidad(estado.entidad) : null;
    const x = d3.scaleLinear().domain([1990, 2025]).range([x0 + 40, x1 - 30]);
    const y = d3.scaleLinear().domain([0, 36000]).range([y1 - 34, y0 + 40]);
    this.gLin.selectAll("*").remove();
    const ejes = this.gLin.append("g").attr("class", "esc-ejes");
    for (const v of [0, 10000, 20000, 30000]) {
      ejes.append("line").attr("x1", x0).attr("x2", x1 - 10).attr("y1", y(v)).attr("y2", y(v)).attr("class", v ? "rejilla" : "base");
      ejes.append("text").attr("x", x0).attr("y", y(v) - 5).attr("class", "eje-texto").text(v ? entero(v) : "0");
    }
    ejes.selectAll("text.anio").data(datos).join("text").attr("class", "eje-texto anio").attr("x", (d) => x(d.anio)).attr("y", y1 - 12).attr("text-anchor", "middle").text((d) => d.anio);
    const linea = d3.line().x((d) => x(d.anio)).y((d) => y(d.num));
    const series = [{clase: "total", datos}, ...(L ? [{clase: "lector", datos: L.llegadas}] : [])];
    series.forEach((s, k) => {
      const path = this.gLin.append("path").attr("class", `esc-trazo ${s.clase}`).attr("d", linea(s.datos)).attr("pathLength", 1).style("stroke-dasharray", "1 1");
      const pts = this.gLin.append("g").selectAll("circle").data(s.datos).join("circle").attr("class", `esc-punto ${s.clase}`)
        .attr("cx", (d) => x(d.anio)).attr("cy", (d) => y(d.num)).attr("r", s.clase === "total" ? 5 : 4);
      const txt = this.gLin.append("g").selectAll("text").data(s.datos).join("text").attr("class", `esc-valor ${s.clase}`)
        .attr("x", (d) => x(d.anio)).attr("y", (d) => y(d.num) + (s.clase === "total" ? -12 : 18)).attr("text-anchor", "middle").text((d) => entero(d.num));
      if (animar) {
        path.style("stroke-dashoffset", 1).transition().delay(150 + k * 300).duration(1400).ease(d3.easeLinear).style("stroke-dashoffset", 0);
        const t0 = 150 + k * 300;
        // Cada punto aparece cuando la linea llega a su ano.
        const prog = (d) => t0 + 1400 * (x(d.anio) - x(1990)) / (x(2025) - x(1990));
        pts.style("opacity", 0).transition().delay(prog).duration(200).style("opacity", 1);
        txt.style("opacity", 0).transition().delay(prog).duration(200).style("opacity", 1);
      } else path.style("stroke-dashoffset", 0);
    });
  }

  pintarRotulos(estado, animar) {
    const p = estado.paso, z = this.z;
    const aPant = (xy) => [z.x + z.k * xy[0], z.y + z.k * xy[1]];
    const H = this.H;
    const ancla = (e) => aPant(this.anclas.get(`MX-${CVE_ISO[e.slice(1)]}`));
    let rot = [];
    if (p === "b") {
      const anio = estado.sub ?? H.aniosNac[0];
      const m = H.porAnioEnt.get(anio);
      const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e);
      if (estado.entidad && !top.includes(estado.entidad) && m.has(estado.entidad)) top.unshift(estado.entidad);
      rot = top.map((e) => ({k: e, xy: ancla(e), r: this.rEnt(m.get(e)), t1: this.entNombre.get(e), t2: entero(m.get(e)), lector: e === estado.entidad}));
    } else if (p === "c" && estado.sub) {
      const e = estado.sub;
      const num = H.porAnioEnt.get(ANIO).get(e);
      if (num) rot = [{k: e, xy: ancla(e), r: 5, t1: this.entNombre.get(e), t2: entero(num), lector: e === estado.entidad}];
      rot.push({k: "cdmx", xy: aPant(this.destino), r: 6, t1: "Ciudad de México", t2: "", lector: false});
    } else if (p === "d") {
      const L = estado.entidad ? H.entidad(estado.entidad) : null;
      const lista = L && L.alcs.length ? L.alcs.slice(0, 3).map((a) => ({cve: a.cve, num: a.num})) : [...H.alcOtra.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([cve, num]) => ({cve, num}));
      rot = lista.map((a) => ({k: a.cve, xy: aPant(this.anclasAlc.get(a.cve)), r: this.rAlc(L ? this.H.alcOtra.get(a.cve) : a.num), t1: this.alcNombre.get(a.cve), t2: entero(a.num), lector: Boolean(L), adentro: true}));
    } else if (p === "f") {
      const sh = (c) => { const d = H.porAlc.get(c); return (100 * d.nah) / d.tot; };
      rot = [{k: "009", xy: aPant(this.anclasAlc.get("009")), r: 0, t1: "Milpa Alta", t2: pct(sh("009")), lector: true, centro: true},
        {k: "015", xy: aPant(this.anclasAlc.get("015")), r: 0, t1: "Cuauhtémoc", t2: pct(sh("015")), lector: false, centro: true}];
    }
    this.colocar(rot);
    const sel = this.gRot.selectAll("g.rotulo").data(rot, (d) => `${p}-${d.k}`).join((e) => {
      const g = e.append("g").attr("class", "rotulo").style("opacity", 0);
      g.append("line").attr("class", "guia");
      g.append("text").attr("class", "r1");
      g.append("text").attr("class", "r2");
      return g;
    });
    sel.classed("es-lector", (d) => d.lector);
    sel.each((d, i, n) => {
      const g = d3.select(n[i]);
      g.select(".r1").attr("x", d.cx).attr("y", d.top + 13).attr("text-anchor", "middle").text(d.t1);
      g.select(".r2").attr("x", d.cx).attr("y", d.top + 29).attr("text-anchor", "middle").text(d.t2);
      const guia = g.select(".guia").style("display", d.guia ? null : "none");
      if (d.guia) guia.attr("x1", d.guia[0]).attr("y1", d.guia[1]).attr("x2", d.guia[2]).attr("y2", d.guia[3]);
    });
    if (animar) sel.transition().delay(DUR * 0.7).duration(300).style("opacity", 1);
    else sel.style("opacity", 1);
  }

  // Coloca cada rotulo junto a su marca sin encimarse con los demas ni salirse
  // de la zona del mapa. Prueba arriba, abajo, derecha e izquierda; si ninguna
  // cabe, lo aleja hacia arriba y traza una guia hasta la marca.
  colocar(rot) {
    const {x0, x1} = this.zona;
    const cajas = [];
    const choca = (b) => cajas.some((c) => b.x < c.x + c.w && b.x + b.w > c.x && b.y < c.y + c.h && b.y + b.h > c.y);
    const dentro = (b) => b.x >= x0 - 8 && b.x + b.w <= Math.min(this.W - 4, x1 + 30) && b.y >= 4 && b.y + b.h <= this.Hh - 30;
    for (const d of rot) {
      const w = Math.max(d.t1.length, d.t2.length) * 7.4 + 8, h = d.t2 ? 34 : 18;
      const [x, y] = d.xy, r = d.r;
      const caja = (cx, top) => ({x: cx - w / 2, y: top, w, h, cx, top});
      let elegido = null;
      const arriba = caja(x, y - r - h - 2), abajo = caja(x, y + r + 2), der = caja(x + r + 6 + w / 2, y - h / 2), izq = caja(x - r - 6 - w / 2, y - h / 2);
      // Primero el lado que se aleja de la ciudad, donde hay menos marcas.
      const dc = this.destino ? [x - (this.z.x + this.z.k * this.destino[0]), y - (this.z.y + this.z.k * this.destino[1])] : [0, -1];
      const orden = Math.abs(dc[1]) >= Math.abs(dc[0]) ? (dc[1] > 0 ? [abajo, dc[0] > 0 ? der : izq, arriba] : [arriba, dc[0] > 0 ? der : izq, abajo]) : (dc[0] > 0 ? [der, abajo, arriba] : [izq, arriba, abajo]);
      // Dentro de su circulo solo si cabe; si no, afuera con guia.
      const cabe = d.adentro && 2 * r > w + 4 && 2 * r > h + 4;
      const candidatas = d.centro ? [caja(x, y - h / 2)] : [...(cabe ? [caja(x, y - h / 2)] : []), ...orden, der, izq].filter((c, i, a) => a.indexOf(c) === i);
      for (const c of candidatas) if (dentro(c) && !choca(c)) { elegido = c; break; }
      if (!elegido && d.centro) elegido = candidatas[0];
      if (!elegido) {
        for (let k = 1; k < 12 && !elegido; k++) {
          for (const dx of [0, w * 0.6, -w * 0.6]) {
            const c = caja(x + dx, y - r - h - 2 - k * 20);
            if (dentro(c) && !choca(c)) { elegido = c; break; }
          }
        }
        elegido = elegido ?? candidatas[0];
        elegido.guia = [x, y - r, elegido.cx, elegido.top + h];
      }
      cajas.push(elegido);
      Object.assign(d, {cx: elegido.cx, top: elegido.top, guia: elegido.guia ?? null});
    }
  }

  pintarLeyenda(estado) {
    const p = estado.paso;
    const c = colores();
    const L = estado.entidad ? this.entNombre.get(estado.entidad) : null;
    const item = (clase, texto) => `<span class="ley-item"><span class="ley-muestra ${clase}"></span>${texto}</span>`;
    let html = "";
    if (p === "a") html = item("m-rojo", "Nacieron en otra entidad") + item("m-dato", "En otro país") + item("m-hueco", "En la ciudad") + (L ? item("m-anillo", `Nacieron en ${L}`) : "");
    else if (p === "b") html = `<span class="ley-item">Área del círculo: personas nacidas en cada entidad, misma escala en todas las ediciones</span>` + (L ? item("m-rojo", L) : "");
    else if (p === "c") html = `<span class="ley-item">Grosor del arco: personas nacidas en cada entidad, 2025</span>` + (L ? item("m-rojo", L) : "");
    else if (p === "d") html = item("m-dato", "Nacidas en otra entidad") + (L ? item("m-rojo", `Nacidas en ${L}`) : "");
    else if (p === "e") html = `<span class="ley-item">Grosor del flujo: personas, 2025</span>`;
    else if (p === "f") html = `<span class="ley-item ley-rampa"><span>Hablan náhuatl, % de los hablantes de la alcaldía</span><span class="rampa" style="background:linear-gradient(90deg, ${c.rampa.join(",")})"></span><span class="rampa-ejes"><span>${DOMINIO_NAH[0]} %</span><span>${DOMINIO_NAH[1]} %</span></span></span>`;
    else if (p === "g") html = item("m-tinta", "Llegaron de otra entidad") + (L ? item("m-rojo", `Desde ${L}`) : "");
    this.leyenda.html(html);
  }
}

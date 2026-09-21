// src/components/descargar.js
// Botón de descarga de una gráfica, en PNG o SVG.
//
// Lo que se descarga es la figura COMPLETA tal como está en pantalla: título,
// subtítulo (que dice qué filtros se aplicaron), la gráfica, la leyenda y el
// pie de fuente, más un crédito al pie. Descargar solo el SVG del Plot daría
// una imagen sin contexto, y una gráfica de PISA sin decir qué ciclo ni qué
// país muestra no se puede citar.
//
// Se ofrecen dos formatos y no tres: PNG para pegar en una presentación y SVG
// para imprimir o editar. El JPG comprime con pérdida y deja halos alrededor
// del texto y de las líneas finas, que es justo de lo que está hecha una
// gráfica.

import {html} from "npm:htl";
import {ROJO} from "./base.js";

// Crédito al pie de la imagen. Vive aquí y no en cada página para que una
// sola edición cambie todas las descargas.
const CREDITO = "Social Data IBERO Educación, Universidad Iberoamericana";

// Nombre de archivo a partir del título, sin acentos ni signos.
function nombreArchivo(titulo, ext) {
  const base = (titulo || "grafica")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return `pisa-${base || "grafica"}.${ext}`;
}

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Se revoca en el siguiente turno: revocarlo de inmediato cancela la
  // descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Estilos que hay que copiar al SVG suelto. Un SVG extraído del documento
// pierde las reglas de la hoja: los ejes de Plot heredan `font-family` y
// `font-size` del contenedor, así que fuera de la página saldrían con la
// fuente por omisión del visor.
function estilosDe(nodo) {
  const c = getComputedStyle(nodo);
  return `font-family:${c.fontFamily};font-size:${c.fontSize};color:${c.color}`;
}

// Serializa la figura a un SVG único: un lienzo con el texto de contexto y,
// dentro, los SVG de la gráfica y de su leyenda en su posición real.
function figuraASvg(figura, {fondo, tinta, tenue}) {
  const caja = figura.getBoundingClientRect();
  const MARGEN = 16;
  const ALTO_CREDITO = 22;
  // El ancho del lienzo es el del CONTENIDO, no el de la parte visible. En
  // pantallas estrechas la gráfica es más ancha que su tarjeta y se recorre en
  // horizontal: con `caja.width` la descarga salía cortada justo por donde el
  // lector hubiera dejado el scroll.
  const anchoUtil = Math.max(caja.width, figura.scrollWidth);
  const ancho = Math.ceil(anchoUtil) + MARGEN * 2;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("xmlns", ns);
  svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  const piezas = [];
  let y = MARGEN;

  // Texto: título, subtítulo y pie. Se reconstruyen como <text> con
  // ajuste manual de línea, porque un <foreignObject> no se rasteriza en
  // todos los visores ni al convertir a PNG.
  const escribir = (texto, {tam, peso, color, anchoMax}) => {
    if (!texto) return;
    const palabras = texto.split(/\s+/);
    const porLinea = Math.max(20, Math.floor(anchoMax / (tam * 0.5)));
    let linea = [];
    const lineas = [];
    for (const p of palabras) {
      linea.push(p);
      if (linea.join(" ").length > porLinea) {
        lineas.push(linea.join(" "));
        linea = [];
      }
    }
    if (linea.length) lineas.push(linea.join(" "));
    for (const l of lineas) {
      y += tam * 1.35;
      piezas.push(
        `<text x="${MARGEN}" y="${y.toFixed(1)}" font-family="Inter, system-ui, sans-serif" ` +
        `font-size="${tam}" font-weight="${peso}" fill="${color}">${
          l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        }</text>`
      );
    }
    y += 4;
  };

  const anchoTexto = anchoUtil;
  escribir(figura.querySelector("h3")?.textContent?.trim(), {tam: 16, peso: 700, color: ROJO, anchoMax: anchoTexto});
  escribir(figura.querySelector(".grafica-sub")?.textContent?.trim(), {tam: 12, peso: 400, color: tenue, anchoMax: anchoTexto});
  y += 6;

  // Los SVG de la figura (la gráfica y, si existe, su leyenda), en orden y
  // conservando su tamaño real.
  for (const g of figura.querySelectorAll("svg")) {
    const r = g.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const copia = g.cloneNode(true);
    // `r.left - caja.left` mide desde el borde visible, así que con la tarjeta
    // desplazada da un valor negativo; `scrollLeft` lo devuelve a su posición
    // dentro del contenido.
    copia.setAttribute("x", MARGEN + (r.left - caja.left) + figura.scrollLeft);
    copia.setAttribute("y", y);
    copia.setAttribute("width", r.width);
    copia.setAttribute("height", r.height);
    if (!copia.getAttribute("viewBox")) {
      copia.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
    }
    copia.setAttribute("style", estilosDe(g));
    piezas.push(new XMLSerializer().serializeToString(copia));
    y += r.height + 6;
  }

  // La leyenda del mapa bivariado es HTML (una rejilla de nueve celdas con
  // sus cortes), no un SVG: sin este bloque la descarga traía el mapa sin
  // forma de leer el color. Se redibuja como rectángulos y texto.
  const ley = figura.querySelector(".leyenda-bivariada");
  if (ley) {
    const F = 'font-family="Inter, system-ui, sans-serif"';
    const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const texto = (x, yy, t, {tam = 10, peso = 400, color = tenue, ancla = "start"} = {}) =>
      piezas.push(`<text x="${x}" y="${yy.toFixed(1)}" ${F} font-size="${tam}" font-weight="${peso}" fill="${color}" text-anchor="${ancla}">${esc(t)}</text>`);
    const celdas = [...ley.querySelectorAll(".leyenda-biv-celda")];
    const escA = [...ley.querySelectorAll(".leyenda-biv-escalaA span")].map((e) => e.textContent.trim());
    const escB = [...ley.querySelectorAll(".leyenda-biv-escalaB span")].map((e) => e.textContent.trim());
    const ejeA = ley.querySelector(".leyenda-biv-ejeA")?.textContent?.trim() ?? "";
    const ejeB = ley.querySelector(".leyenda-biv-ejeB")?.textContent?.trim() ?? "";
    const LADO = 24, ANCHO = 56, X0 = MARGEN;
    y += 8;
    texto(MARGEN, y + 10, "Cómo leer el color", {tam: 11, peso: 600, color: tinta});
    y += 18;
    texto(MARGEN, y + 10, ejeB);
    y += 16;
    celdas.forEach((c, i) => {
      const col = i % 3, fila = Math.floor(i / 3);
      const color = getComputedStyle(c).backgroundColor;
      piezas.push(`<rect x="${X0 + col * ANCHO}" y="${y + fila * LADO}" width="${ANCHO - 2}" height="${LADO - 2}" fill="${color}"/>`);
      if (col === 2 && escB[fila]) texto(X0 + 3 * ANCHO + 6, y + fila * LADO + LADO * 0.68, escB[fila]);
    });
    y += 3 * LADO + 2;
    escA.forEach((t, i) => texto(X0 + i * ANCHO + ANCHO / 2 - 1, y + 10, t, {tam: 9, ancla: "middle"}));
    y += 14;
    texto(MARGEN, y + 10, ejeA);
    y += 16;
  }

  // La nota de las líneas de referencia viaja con la figura exportada.
  y += 4;
  escribir(figura.querySelector(".nota-referencia")?.textContent?.replace(/\s+/g, " ").trim(),
           {tam: 11, peso: 400, color: tenue, anchoMax: anchoTexto});

  y += 4;
  escribir(figura.querySelector("figcaption")?.textContent?.replace(/\s+/g, " ").trim(),
           {tam: 11, peso: 400, color: tenue, anchoMax: anchoTexto});

  // Crédito, separado por una línea.
  y += 10;
  piezas.push(`<line x1="${MARGEN}" y1="${y}" x2="${ancho - MARGEN}" y2="${y}" stroke="${tenue}" stroke-opacity="0.35"/>`);
  y += ALTO_CREDITO;
  piezas.push(
    `<text x="${MARGEN}" y="${y.toFixed(1)}" font-family="Inter, system-ui, sans-serif" ` +
    `font-size="11" font-weight="600" fill="${ROJO}">${CREDITO}</text>`
  );

  const alto = Math.ceil(y + MARGEN);
  svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
  svg.setAttribute("width", ancho);
  svg.setAttribute("height", alto);

  // El contenido se arma con el parser de XML y se adopta nodo a nodo, en vez
  // de asignar `innerHTML`. Las piezas salen de esta misma función y de
  // XMLSerializer, no de entrada del usuario, pero un `innerHTML` sobre una
  // cadena construida a mano es un patrón que hay que evitar por norma: si
  // mañana alguien mete en el título texto que venga de un CSV, el escape
  // deja de ser una garantía local.
  const fondoRect = document.createElementNS(ns, "rect");
  fondoRect.setAttribute("width", ancho);
  fondoRect.setAttribute("height", alto);
  fondoRect.setAttribute("fill", fondo);
  svg.appendChild(fondoRect);

  const doc = new DOMParser().parseFromString(
    `<svg xmlns="${ns}" xmlns:xlink="http://www.w3.org/1999/xlink">${piezas.join("")}</svg>`,
    "image/svg+xml"
  );
  if (doc.querySelector("parsererror")) throw new Error("SVG mal formado al serializar la figura");
  for (const hijo of [...doc.documentElement.childNodes]) {
    svg.appendChild(document.importNode(hijo, true));
  }
  return {texto: new XMLSerializer().serializeToString(svg), ancho, alto};
}

// Colores del tema actual, leídos del documento: la imagen descargada tiene
// que salir con el mismo fondo que la pantalla, o el texto claro del modo
// oscuro quedaría sobre blanco.
function paleta() {
  const c = getComputedStyle(document.body);
  const raiz = getComputedStyle(document.documentElement);
  return {
    fondo: c.backgroundColor || "#ffffff",
    tinta: c.color || "#1d1d1b",
    tenue: raiz.getPropertyValue("--text-secondary").trim() || "#4a4845",
  };
}

async function aPng(svgTexto, ancho, alto, escala = 2) {
  const blob = new Blob([svgTexto], {type: "image/svg+xml;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise((ok, err) => {
      img.onload = ok;
      img.onerror = () => err(new Error("no se pudo rasterizar el SVG"));
      img.src = url;
    });
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(ancho * escala);
    lienzo.height = Math.round(alto * escala);
    const ctx = lienzo.getContext("2d");
    ctx.scale(escala, escala);
    ctx.drawImage(img, 0, 0);
    return await new Promise((r) => lienzo.toBlob(r, "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Devuelve el bloque de botones. Se cuelga de la figura: al pulsar, busca la
// figura más cercana y la serializa, así que funciona con cualquier gráfica
// de la librería sin tocar sus funciones.
// `montarEn(figura)` cuelga el bloque dentro de la propia figura, bajo el
// pie: la descarga pertenece a la gráfica, no a la sección, y ahí se
// encuentra sin buscarla. Devuelve la figura, para poder encadenarlo en el
// `return` de una página.
export function conDescarga(figura) {
  if (!figura || !figura.querySelector) return figura;
  figura.appendChild(descargar());
  return figura;
}

export function descargar() {
  const aviso = html`<span class="descarga-aviso" role="status" aria-live="polite"></span>`;
  const bloque = html`<div class="descarga">
    <span class="descarga-etiqueta">Descargar</span>
    <button type="button" class="descarga-boton" data-formato="png">PNG</button>
    <button type="button" class="descarga-boton" data-formato="svg">SVG</button>
    ${aviso}
  </div>`;

  bloque.addEventListener("click", async (e) => {
    const boton = e.target.closest(".descarga-boton");
    if (!boton) return;
    const figura = bloque.closest("figure") ||
      bloque.parentElement?.querySelector("figure") ||
      bloque.closest(".seccion-cuerpo")?.querySelector("figure");
    if (!figura) {
      aviso.textContent = "No se encontró la gráfica.";
      return;
    }
    const titulo = figura.querySelector("h3")?.textContent?.trim() ?? "grafica";
    aviso.textContent = "Preparando…";
    try {
      const {texto, ancho, alto} = figuraASvg(figura, paleta());
      if (boton.dataset.formato === "svg") {
        descargarBlob(new Blob([texto], {type: "image/svg+xml;charset=utf-8"}),
                      nombreArchivo(titulo, "svg"));
      } else {
        const png = await aPng(texto, ancho, alto);
        descargarBlob(png, nombreArchivo(titulo, "png"));
      }
      aviso.textContent = "Descargado.";
    } catch (err) {
      console.error(err);
      aviso.textContent = "No se pudo generar la imagen.";
    }
    setTimeout(() => { aviso.textContent = ""; }, 4000);
  });

  return bloque;
}

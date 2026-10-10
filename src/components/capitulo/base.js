// src/components/capitulo/base.js
// Formato de cifras, preferencia de movimiento, colores resueltos del tema y
// la escala tipografica unica de las graficas.

export const TIPO = {ejes: 13, valor: 12.5, rotulo: 13};

const ent0 = new Intl.NumberFormat("en-US", {maximumFractionDigits: 0});
const dec1 = new Intl.NumberFormat("en-US", {minimumFractionDigits: 1, maximumFractionDigits: 1});
// Separador de miles con coma y punto decimal, como en los tabulados del INEGI.
export const entero = (v) => ent0.format(Math.round(v));
export const pct = (v) => `${dec1.format(v)} %`;
export const pct0 = (v) => `${Math.round(v)} %`;

// Colores leidos del CSS en el momento de pintar. Un var(--x) dentro de un SVG
// no sobrevive a la descarga, asi que las graficas descargables reciben el
// valor ya resuelto y se repintan al cambiar de tema.
export function colores() {
  const c = getComputedStyle(document.documentElement);
  const v = (n) => c.getPropertyValue(n).trim();
  return {
    lienzo: v("--canvas"), superficie: v("--surface"), tinta: v("--ink"), tenue: v("--ink-muted"), sutil: v("--ink-subtle"),
    linea: v("--hairline"), tierra: v("--land"), tierraBorde: v("--land-edge"),
    dato: v("--dato"), datoSuave: v("--dato-soft"), rojo: v("--primary"),
    rampa: [v("--rampa-0"), v("--rampa-1"), v("--rampa-2")]
  };
}

export function alCambiarTema(fn) {
  window.addEventListener("sdi:tema", () => fn());
}

// El movimiento de la portada lo controla la hoja de animaciones (CSS): se
// detiene con prefers-reduced-motion y con la pausa global del sitio.

// Parametros de la URL: leer y escribir sin recargar.
export function leerURL() {
  return new URLSearchParams(window.location.search);
}
export function escribirURL(cambios) {
  const p = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(cambios)) {
    if (v == null || v === "") p.delete(k);
    else p.set(k, v);
  }
  const q = p.toString();
  history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`);
}

// Comparacion sin acentos ni mayusculas, para el buscador de lenguas.
export const sinAcentos = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export const svgNS = "http://www.w3.org/2000/svg";

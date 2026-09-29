---
title: 7. Discriminación
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo, SEPARADO} from "../components/panel-seccion.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {punto, COLOR_SERIE} from "../components/base.js";

const enadis = (await FileAttachment("../data/enadis.csv").csv({typed: true})).map((r) => ({...r, anio: Number(r.anio)}));
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
const EDAD_ETIQ = {"12-29": "12 a 29 años", "30-59": "30 a 59 años", "60+": "60 años y más"};
// 2017 en gris de referencia y 2022 en el rojo de la población indígena: un
// tono claro del mismo rojo no alcanza contraste 3:1 sobre el fondo.
const COLOR_ANIO = {"2017": "#8a8a86", "2022": "#C4101B"};
const tot = (anio, ind, cat) => enadis.find((r) => r.anio === anio && r.sexo === "Total" && r.edad === "Todas" && r.ambito === "Total" && r.indicador === ind && r.categoria === cat);
const pr = (r) => (r ? 100 * r.num / r.den : null);

// Sección genérica: barras por categoría de un indicador de la ENADIS, con
// año (2017, 2022 o las dos), sexo, edad y tipo de localidad; sexo, edad y
// localidad admiten "por separado" (una faceta; la segunda vuelve al total).
function seccionEnadis({id, indicador, titulo, pie, explica, orden = null, soloAnios = null, inicialAnio = "2022"}) {
  const anios = soloAnios ?? [2017, 2022];
  const cAnio = campo({id: `${id}-anio`, nombre: "anio", etiqueta: "Año", opciones: [...(anios.length > 1 ? [{clave: SEPARADO, etiqueta: "2017 y 2022 (comparar)", grupo: "En conjunto"}] : []), ...anios.map((a) => ({clave: String(a), etiqueta: String(a), grupo: "Una edición"}))], valor: anios.length > 1 ? inicialAnio : String(anios[0])});
  const op = (total, cats) => [{clave: total, etiqueta: cats.total, grupo: "En conjunto"}, {clave: SEPARADO, etiqueta: "Por separado (comparar)", grupo: "En conjunto"}, ...cats.lista.map(([k, v]) => ({clave: k, etiqueta: v, grupo: "Una a una"}))];
  const cSexo = campo({id: `${id}-sexo`, nombre: "sexo", etiqueta: "Sexo", opciones: op("Total", {total: "Mujeres y hombres", lista: [["Mujeres", "Mujeres"], ["Hombres", "Hombres"]]}), valor: "Total"});
  const cEdad = campo({id: `${id}-edad`, nombre: "edad", etiqueta: "Grupo de edad", opciones: op("Todas", {total: "12 años y más", lista: Object.entries(EDAD_ETIQ)}), valor: "Todas"});
  const cAmb = campo({id: `${id}-ambito`, nombre: "ambito", etiqueta: "Tipo de localidad", opciones: op("Total", {total: "Urbana y rural", lista: [["Urbano", "Urbana"], ["Rural", "Rural (menos de 2,500 habitantes)"]]}), valor: "Total"});
  const panel = html`<div class="panel-filtros"><div class="panel-campos">${cAnio}${cSexo}${cEdad}${cAmb}</div></div>`;
  const cuerpo = document.createElement("div");
  function pintar() {
    const comparar = cAnio.value === SEPARADO;
    const sepCampo = [["sexo", cSexo], ["edad", cEdad], ["ambito", cAmb]].find(([, c]) => c.value === SEPARADO)?.[0] ?? null;
    const fijo = {sexo: cSexo.value === SEPARADO ? null : cSexo.value, edad: cEdad.value === SEPARADO ? null : cEdad.value, ambito: cAmb.value === SEPARADO ? null : cAmb.value};
    const extra = [["sexo", cSexo], ["edad", cEdad], ["ambito", cAmb]].filter(([k, c]) => c.value === SEPARADO && k !== sepCampo);
    for (const [k] of extra) fijo[k] = k === "edad" ? "Todas" : "Total";
    const f = enadis.filter((r) => r.indicador === indicador && (comparar ? anios.includes(r.anio) : r.anio === Number(cAnio.value))
      && ["sexo", "edad", "ambito"].every((k) => (fijo[k] == null ? r[k] !== (k === "edad" ? "Todas" : "Total") : r[k] === fijo[k])))
      .map((r) => ({...r, pct: 100 * r.num / r.den, anioT: String(r.anio), faceta: sepCampo ? (sepCampo === "edad" ? EDAD_ETIQ[r.edad] : sepCampo === "ambito" ? (r.ambito === "Rural" ? "Rural" : "Urbana") : r.sexo) : ""}));
    const base = f.filter((r) => r.anio === Math.max(...f.map((x) => x.anio)) && (!sepCampo || true));
    const cats = orden ?? [...new Set(base.slice().sort((a, b) => b.pct - a.pct).map((r) => r.categoria))];
    const facetas = sepCampo ? {fx: {label: null}} : {};
    const alto = 50 + (comparar ? 40 : 26) * cats.length;
    const inset = comparar ? {insetTop: 13, insetBottom: 13} : {};
    const maxX = Math.min(100, Math.max(5, ...f.map((r) => r.pct + 196 * (r.ee ?? 0))) * 1.12);
    const color = comparar ? {domain: ["2017", "2022"], range: [COLOR_ANIO["2017"], COLOR_ANIO["2022"]], legend: true} : {domain: ["x"], range: [COLOR_SERIE["Población indígena"]]};
    const tip = (r) => `${r.categoria} · ${r.anio}${r.faceta ? ` · ${r.faceta}` : ""}\n${pct(r.pct)}${r.ee ? ` ± ${(196 * r.ee).toFixed(1)}` : ""}\n${entero(r.num)} de ${entero(r.den)} personas`;
    const sub = [comparar ? "2017 y 2022" : cAnio.value, fijo.sexo && fijo.sexo !== "Total" ? fijo.sexo : "", fijo.edad && fijo.edad !== "Todas" ? EDAD_ETIQ[fijo.edad] : "", fijo.ambito && fijo.ambito !== "Total" ? `localidades ${fijo.ambito === "Rural" ? "rurales" : "urbanas"}` : "", sepCampo ? `un panel por ${{sexo: "sexo", edad: "grupo de edad", ambito: "tipo de localidad"}[sepCampo]}` : ""].filter(Boolean).join(" · ");
    cuerpo.replaceChildren(
      figura({titulo, subtitulo: `Población indígena de 12 años y más, México · ${sub}`, pie},
        [f.length ? Plot.plot({marginLeft: 280, marginRight: 60, height: alto, width: Math.min(1000, width), ...facetas, color, x: {label: "% de la población indígena", grid: true, domain: [0, maxX]}, y: {label: null, domain: cats},
          marks: [...(comparar ? [[2017, -8], [2022, 8]] : [[null, 0]]).flatMap(([a, dy]) => {
              const d = a == null ? f : f.filter((r) => r.anio === a);
              const fx = sepCampo ? {fx: "faceta"} : {};
              return [Plot.barX(d, {x: "pct", y: "categoria", fill: comparar ? "anioT" : () => "x", dy, ...inset, ...fx}),
                Plot.ruleX(d.filter((r) => r.ee), {x1: (r) => Math.max(0, r.pct - 196 * r.ee), x2: (r) => r.pct + 196 * r.ee, y: "categoria", dy, stroke: "currentColor", strokeOpacity: 0.55, ...fx}),
                Plot.text(d, {x: "pct", y: "categoria", text: (r) => pct(r.pct), dx: 6, dy, textAnchor: "start", fontSize: 11, ...fx})];
            }),
            Plot.tip(f, Plot.pointer({x: "pct", y: "categoria", ...(sepCampo ? {fx: "faceta"} : {}), maxRadius: Infinity, title: tip})), Plot.ruleX([0])]}) : html`<p class="beta-nota">La pregunta no existe en esta edición.</p>`]),
      extra.length ? html`<p class="beta-nota">Solo un corte puede ir por separado a la vez; los demás vuelven al total.</p>` : "",
      explicacion(explica),
      tablaColumnas(f, [{etiqueta: "Categoría", valor: (r) => r.categoria}, {etiqueta: "Año", valor: (r) => r.anio}, {etiqueta: "Sexo", valor: (r) => r.sexo}, {etiqueta: "Edad", valor: (r) => EDAD_ETIQ[r.edad] ?? "12 y más"}, {etiqueta: "Localidad", valor: (r) => r.ambito},
        {etiqueta: "%", num: true, valor: (r) => r.pct.toFixed(2)}, {etiqueta: "± 95 %", num: true, valor: (r) => (r.ee ? (196 * r.ee).toFixed(2) : "")}, {etiqueta: "Personas", num: true, valor: (r) => entero(r.num)}, {etiqueta: "Universo", num: true, valor: (r) => entero(r.den)}], {titulo: "Ver los datos"}));
  }
  for (const c of [cAnio, cSexo, cEdad, cAmb]) c.select.addEventListener("change", pintar);
  pintar();
  return html`<section class="beta-seccion">${panel}${cuerpo}</section>`;
}
```

<div class="hero-pagina">
  <span class="kicker">Capítulo 7</span>
  <h1>Discriminación</h1>
  <p class="hero-entrada">Qué tanto declaran las personas indígenas haber sido discriminadas, por qué motivo, en qué lugares y qué derechos les negaron, según la Encuesta Nacional sobre Discriminación de 2017 y 2022. La encuesta solo da cifras para el país: su muestra de población indígena no alcanza para la Ciudad de México.</p>
</div>

```js
display(kpis([
  {etiqueta: "Discriminadas en el último año, 2022", cifra: pct(pr(tot(2022, "discriminacion", "Por algún motivo"))), nota: "población indígena de 12 años y más, por cualquiera de 16 motivos"},
  {etiqueta: "Con los mismos diez motivos de 2017", cifra: `${pct(pr(tot(2017, "discriminacion", "Por algún motivo")))} → ${pct(pr(tot(2022, "discriminacion", "Por los diez motivos comunes a 2017 y 2022")))}`, nota: "2017 → 2022"},
  {etiqueta: "Por ser persona indígena o afrodescendiente", cifra: pct(pr(tot(2022, "por_indigena", "Por ser persona indígena o afrodescendiente"))), nota: "de quienes fueron discriminadas, 2022"},
]));
```

---

<h2 id="en-el-ultimo-ano" class="toc-anchor">Discriminación en el último año</h2>

```js
display(seccionEnadis({id: "c7a", indicador: "discriminacion", orden: ["Por algún motivo", "Por los diez motivos comunes a 2017 y 2022"], inicialAnio: SEPARADO,
  titulo: "Personas indígenas que fueron discriminadas en los últimos 12 meses",
  pie: "INEGI, ENADIS 2017 y 2022, módulo de población indígena · cada barra es una forma de medir; la línea, el intervalo de 95 %",
  explica: "La encuesta pregunta si en los últimos doce meses la persona fue discriminada o menospreciada por alguno de una lista de motivos. En 2017 la lista tenía diez motivos y en 2022 dieciséis (se añadieron ser indígena o afrodescendiente, discapacidad, enfermedad, opiniones políticas, estado civil y otro). Por eso se muestran dos medidas: con todos los motivos de cada año, que es la que publica el INEGI (25.3 y 28.0 %), y solo con los diez motivos que existen en las dos ediciones, que es la comparable. Además, en 2022 entró al módulo más gente: quien se considera indígena por cualquiera de seis razones, no solo por su comunidad o sus padres."}));
```

---

<h2 id="motivos" class="toc-anchor">Por qué motivo</h2>

```js
display(seccionEnadis({id: "c7b", indicador: "motivo",
  titulo: "Motivos por los que las personas indígenas fueron discriminadas",
  pie: "INEGI, ENADIS 2017 y 2022 · cada barra es un motivo; una persona puede señalar varios",
  explica: "Porcentaje de toda la población indígena de 12 años y más que señaló cada motivo en los últimos doce meses. Una persona puede señalar más de uno, así que las barras no suman el total de discriminadas. Los motivos de 'ser persona indígena o afrodescendiente' en adelante solo existen en 2022."}));
```

---

<h2 id="donde-ocurre" class="toc-anchor">Dónde ocurre</h2>

```js
display(seccionEnadis({id: "c7c", indicador: "ambito",
  titulo: "Lugares donde las personas indígenas fueron discriminadas",
  pie: "INEGI, ENADIS 2017 y 2022 · cada barra es un ámbito; una persona puede señalar varios",
  explica: "Porcentaje de la población indígena de 12 años y más que en los últimos doce meses fue discriminada en cada lugar: el trabajo o la escuela, la familia, los servicios médicos, una oficina de gobierno, un negocio o banco, la calle o el transporte, las redes sociales y, desde 2022, ante la policía o el Ministerio Público. La barra 'en al menos un ámbito' reúne a quien señaló cualquiera."}));
```

---

<h2 id="derechos-negados" class="toc-anchor">Derechos negados</h2>

```js
display(seccionEnadis({id: "c7d", indicador: "derecho",
  titulo: "Derechos que les negaron injustificadamente en los últimos cinco años",
  pie: "INEGI, ENADIS 2017 y 2022 · cada barra es un derecho, sobre quienes respondieron sí o no",
  explica: "Porcentaje de la población indígena a la que en los últimos cinco años le negaron sin justificación cada derecho, sobre quienes lo intentaron ejercer (se excluye a quien respondió 'no aplica'). Estudiar solo se preguntó a personas de 12 a 35 años, y trabajar, crédito y renta a las de 18 y más; rentar una vivienda solo existe en 2022. El INEGI publica 26.9 % con al menos un derecho negado en 2022 (18 años y más) y 29.2 % en 2017."}));
```

---

<h2 id="respeto" class="toc-anchor">Cómo ven el respeto a sus derechos</h2>

```js
display(seccionEnadis({id: "c7e", indicador: "respeto", orden: ["Mucho", "Algo", "Poco", "Nada"], inicialAnio: SEPARADO,
  titulo: "¿Qué tanto se respetan los derechos de las personas indígenas?",
  pie: "INEGI, ENADIS 2017 y 2022 · cada barra es una respuesta; suman 100 % en cada año",
  explica: "Opinión de las propias personas indígenas de 12 años y más sobre cuánto se respetan sus derechos en el país. Se excluye a quien no supo responder."}));
```

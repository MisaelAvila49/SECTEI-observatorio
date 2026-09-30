---
title: Escuela y trabajo
---

```js
import * as Plot from "npm:@observablehq/plot";
import {html} from "npm:htl";
import {campo, SEPARADO} from "../components/panel-seccion.js";
import {seccionPerfil, CRITERIOS} from "../components/seccion-perfil.js";
import {figura, explicacion, tablaColumnas, kpis} from "../components/graficas.js";
import {punto, COLOR_SERIE, ejePct} from "../components/base.js";
import {procedencia} from "../components/fuentes.js";

const perfil = (await FileAttachment("../data/perfil_ciudad.csv").csv({typed: true})).map((r) => ({...r, anio: Number(r.anio)}));
const fuenteDe = procedencia({fuentes: await FileAttachment("../data/fuentes.csv").csv(), verificaciones: await FileAttachment("../data/verificaciones.csv").csv(), calculado: await FileAttachment("../data/calculado.csv").csv()});
const PERFIL_DATOS = ["D-CENSO-2010-AMP", "D-EIC-2015", "D-CENSO-2020", "D-EIC-2025-MICRO"];
// Qué se cotejó para cada tema del perfil. El INEGI publica para 2025, por
// entidad, la discapacidad, la afiliación y la participación económica de
// hablantes y de quienes se consideran indígenas; la distribución por nivel de
// estudios y la posición en el trabajo no, y ahí se remite a lo más cercano.
const COTEJOS_PERFIL = {
  esc: {cotejos: [], referencia: ["R-EIC-2025-TAB-ETN"], nota: "El INEGI no publica la distribución por nivel de estudios de la población indígena de la ciudad; su tabulado de etnicidad trae el grado promedio de escolaridad y la tasa de alfabetismo de hablantes y de quienes se consideran indígenas."},
  act: {cotejos: ["pea_hli_2025", "pea_autoads_2025", "pea_2025", "ocupada_pea_2025"]},
  pos: {cotejos: [], referencia: ["R-EIC-2025-TAB-ETN"], nota: "El INEGI no publica la posición en el trabajo de la población indígena de la ciudad; el tabulado de etnicidad trae su condición de actividad, cotejada en la gráfica de actividad."},
  dom: {cotejos: [], referencia: ["R-SECULT-LENGUAS"], nota: "No hay tabulado oficial del trabajo doméstico remunerado por condición indígena; el documento de la Secretaría de Cultura lo señala como ocupación frecuente de las mujeres hablantes."},
  afil: {cotejos: ["afiliada_hli_2025", "afiliada_autoads_2025", "afiliada_2025"]},
  dis: {cotejos: ["discapacidad_hli_2025", "discapacidad_autoads_2025", "discapacidad_2025"]},
};
const fuentesPerfil = (tema) => fuenteDe({datos: PERFIL_DATOS, ...(COTEJOS_PERFIL[tema.clave] ?? {})});
const entero = (n) => punto(Math.round(Number(n)));
const pct = (v, d = 1) => `${Number(v).toFixed(d)} %`;
const EDAD_ETIQ = {"3-14": "3 a 14 años", "15-29": "15 a 29 años", "30-59": "30 a 59 años", "60+": "60 años y más"};
```

<div class="hero-pagina">
  <span class="kicker">La población indígena en la ciudad</span>
  <h1>Escuela y trabajo</h1>
  <p class="hero-entrada">Hasta qué nivel estudió la población indígena de la ciudad, si trabaja, en qué posición y cuántas personas se ocupan en el trabajo doméstico remunerado, frente al resto de la población.</p>
</div>

---

<h2 id="escolaridad" class="toc-anchor">Escolaridad</h2>

```js
display(seccionPerfil(perfil, {id: "c3esc", fuentes: fuentesPerfil, temas: [{clave: "esc", etiqueta: "Nivel de estudios", dimension: "escolaridad", categorias: ["Primaria o menos", "Secundaria", "Media superior", "Superior"], edades: ["15-29", "30-59", "60+"],
  titulo: ({crit}) => `Nivel de estudios de la población indígena y del resto (${crit})`,
  pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México, personas de 15 años y más · cada par de barras es un nivel; la línea, el intervalo de 95 %",
  explica: "Nivel más alto de estudios aprobado por las personas de 15 años y más, en cuatro tramos: primaria o menos (incluye a quien no fue a la escuela), secundaria, media superior (bachillerato, normal básica y carreras técnicas después de la secundaria) y superior (licenciatura, normal de licenciatura y posgrado). Cada barra es el porcentaje del grupo con ese nivel; las cuatro de un grupo suman 100 %. Quien no especificó su nivel no entra."}]}));
```

---

<h2 id="trabajo" class="toc-anchor">Trabajo</h2>

```js
display(seccionPerfil(perfil, {id: "c3tra", fuentes: fuentesPerfil, temas: [
  {clave: "act", etiqueta: "Condición de actividad", dimension: "actividad", categorias: ["Ocupada", "Desocupada", "No económicamente activa"], edades: ["15-29", "30-59", "60+"],
   titulo: ({crit}) => `Condición de actividad de la población indígena y del resto (${crit})`, pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México, personas de 12 años y más · cada par de barras es una condición",
   explica: "Si en la semana anterior la persona trabajó (ocupada), buscó trabajo sin encontrarlo (desocupada) o no hizo ninguna de las dos cosas (no económicamente activa: estudiantes, personas dedicadas al hogar, jubiladas, con alguna limitación permanente). Universo: 12 años y más."},
  {clave: "pos", etiqueta: "Posición en el trabajo", dimension: "posicion", categorias: ["Empleada u obrera", "Jornalera o peona", "Patrona", "Por cuenta propia", "Sin pago"], edades: ["15-29", "30-59", "60+"],
   titulo: ({crit}) => `Posición en el trabajo de la población indígena ocupada y del resto (${crit})`, pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México, personas ocupadas · cada par de barras es una posición",
   explica: "Cómo trabaja la persona ocupada: como empleada u obrera (incluye ayudantes con pago), jornalera o peona, patrona o empleadora, por su cuenta o sin recibir pago. Universo: personas ocupadas que especificaron su posición."},
  {clave: "dom", etiqueta: "Trabajo doméstico remunerado", dimension: "domestico", categorias: ["Trabajo doméstico remunerado"], edades: ["15-29", "30-59", "60+"],
   titulo: ({crit}) => `Personas ocupadas en trabajo doméstico remunerado (${crit})`, pie: "Censos e intercensales (INEGI), muestras de la Ciudad de México, personas ocupadas; ocupación según el SINCO · cada barra es un grupo",
   explica: "Porcentaje de las personas ocupadas cuya ocupación es la de trabajadora doméstica (código 961 del Sistema Nacional de Clasificación de Ocupaciones; 9611 en 2010). Nueve de cada diez son mujeres. El documento de la Secretaría de Cultura señala esta ocupación como una de las principales de los hablantes en la ciudad."},
]}));
```

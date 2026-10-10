// src/components/capitulo/textos.js
// Texto de cada paso de la historia. Todas las cifras se calculan con los
// datos; si el lector eligio una entidad, cada paso suma una frase con sus
// numeros. Los textos describen lo que muestra la grafica, sin adelantar
// conclusiones.

import * as d3 from "npm:d3";
import {ANIO} from "./datos.js";
import {entero, pct} from "./base.js";

const lista = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}`);
const pocos = (L) => (L.pocosCasos ? " La cifra se apoya en pocos casos de la muestra y conviene leerla como orientación." : "");
const sinMuestra = (L) => `La muestra de ${ANIO} no registró hablantes nacidos en ${L.nombre} que vivan en la ciudad.`;

export function pasos(H, alcNombre) {
  const sharePct = (n, d) => (100 * n) / d;
  const top5 = H.top5;
  const sum5 = d3.sum(top5, (d) => d.num);
  const alcOrden = [...H.alcOtra.entries()].sort((a, b) => b[1] - a[1]);
  const [izt, ...restoAlc] = alcOrden;
  const san = H.sankey(null);
  const mayor = [...san.enlaces].filter((e) => e.oe !== "otras" && e.dc !== "otras").sort((a, b) => b.value - a.value)[0];
  const numOe = H.porAnioEnt.get(ANIO).get(mayor.oe);
  const ma = H.porAlc.get("009");
  const cu = H.porAlc.get("015");
  const cdmxMax = [...H.porAlc.entries()].sort((a, b) => b[1].cdmx / b[1].tot - a[1].cdmx / a[1].tot)[0][0];
  const llegada = (a) => H.llegadas.find((d) => d.anio === a)?.num ?? 0;
  const nombreE = (e) => H.ent25.find((d) => d.ent === e)?.nombre ?? e;

  return [
    {
      id: "a",
      cifra: String(H.unidades.otra), cifraTexto: "de cada 100",
      titulo: "nacieron en otra entidad del país",
      cuerpo: () => [`De las ${entero(H.total)} personas que hablan una lengua indígena y viven en la Ciudad de México, ${entero(H.otra)} nacieron en otra entidad: ${pct(sharePct(H.otra, H.total))}. Otras ${entero(H.ciudad)} nacieron en la ciudad y ${entero(H.pais)} en otro país.`],
      lector: (L) => (L.num ? `${entero(L.num)} nacieron en ${L.nombre}: ${Math.max(1, Math.round(L.shareTotal))} de cada 100 hablantes de la ciudad.${pocos(L)}` : sinMuestra(L)),
      fuente: `Encuesta Intercensal ${ANIO}, INEGI. Cada punto equivale a una de cada 100 personas.`,
      alt: () => `Rejilla de 100 puntos: ${H.unidades.otra} para quienes nacieron en otra entidad, ${H.unidades.pais} para otro país y ${H.unidades.ciudad} para la ciudad.`
    },
    {
      id: "b",
      titulo: "Oaxaca, al frente en todas las ediciones",
      subs: H.aniosNac,
      cuerpo: () => [`Cada círculo es una entidad de nacimiento; su área, el número de hablantes que viven en la ciudad y nacieron ahí. Oaxaca encabeza la lista en las ${H.aniosNac.length} ediciones que preguntan el lugar de nacimiento, de ${H.aniosNac[0]} a ${H.aniosNac.at(-1)}.`],
      lectura: (sub, L) => {
        const a = sub ? Number(sub) : H.aniosNac[0];
        const m = H.porAnioEnt.get(a);
        const extra = L && L.ent !== "020" ? `; de ${L.nombre}, ${entero(m.get(L.ent) ?? 0)}` : "";
        return `<strong>${a}</strong>: ${entero(H.totalOtraAnio.get(a))} personas nacidas en otra entidad; de Oaxaca, ${entero(m.get("020") ?? 0)}${extra}.`;
      },
      lector: (L) => (L.num ? `En ${ANIO}, ${L.nombre} ocupa el lugar ${L.lugar} de ${H.ent25.length} entidades de origen.${pocos(L)}` : sinMuestra(L)),
      fuente: "Censos 1990, 2000, 2010 y 2020, Encuestas Intercensales 2015 y 2025, INEGI.",
      alt: () => `Mapa de burbujas por entidad de nacimiento. ${H.aniosNac.map((a) => `${a}: ${entero(H.totalOtraAnio.get(a))} nacidas en otra entidad, ${entero(H.porAnioEnt.get(a).get("020") ?? 0)} de Oaxaca`).join("; ")}.`
    },
    {
      id: "c",
      titulo: `Cinco entidades suman ${Math.round(sharePct(sum5, H.otra))} de cada 100`,
      subs: (L) => [...top5.map((d) => d.ent), ...(L && L.num && !top5.some((d) => d.ent === L.ent) ? [L.ent] : [])],
      cuerpo: () => [`${lista(top5.map((d) => d.nombre))} suman ${entero(sum5)} personas, ${pct(sharePct(sum5, H.otra))} de quienes nacieron en otra entidad. Cada arco une una entidad con la ciudad y su grosor es el número de personas.`],
      lectura: (sub) => {
        const e = sub ?? top5[0].ent;
        const d = H.ent25.find((x) => x.ent === e);
        return d ? `<strong>${d.nombre}</strong>: ${entero(d.num)} personas, ${pct(d.share)} de las nacidas en otra entidad.` : "";
      },
      lector: (L) => (L.num ? (top5.some((d) => d.ent === L.ent) ? `${L.nombre} está entre las cinco: lugar ${L.lugar}.` : `${L.nombre} ocupa el lugar ${L.lugar}: ${entero(L.num)} personas.`) + pocos(L) : sinMuestra(L)),
      fuente: `Encuesta Intercensal ${ANIO}, INEGI.`,
      alt: () => `Arcos desde cada entidad hacia la ciudad. ${top5.map((d) => `${d.nombre}: ${entero(d.num)}`).join("; ")}.`
    },
    {
      id: "d",
      titulo: `Una de cada cuatro vive en ${alcNombre.get(izt[0])}`,
      cuerpo: () => [`Ya en la ciudad, de las ${entero(H.otra)} personas nacidas en otra entidad, ${entero(izt[1])} viven en ${alcNombre.get(izt[0])}: ${pct(sharePct(izt[1], H.otra))}. Le siguen ${lista(restoAlc.slice(0, 3).map(([c, n]) => `${alcNombre.get(c)} (${entero(n)})`))}.`],
      lector: (L) => (L.alcs.length ? `Quienes nacieron en ${L.nombre} viven sobre todo en ${lista(L.alcs.slice(0, 3).map((a) => `${a.nombre} (${entero(a.num)})`))}.${pocos(L)}` : sinMuestra(L)),
      fuente: `Encuesta Intercensal ${ANIO}, INEGI. El área de cada círculo es proporcional al número de personas.`,
      alt: () => `Mapa de las 16 alcaldías con un círculo por alcaldía. ${alcOrden.slice(0, 4).map(([c, n]) => `${alcNombre.get(c)}: ${entero(n)}`).join("; ")}.`
    },
    {
      id: "e",
      titulo: `De ${nombreE(mayor.oe)} a ${alcNombre.get(mayor.dc)}, el flujo más grueso`,
      cuerpo: () => [`A la izquierda, la entidad de nacimiento; a la derecha, la alcaldía donde viven. ${entero(mayor.value)} personas nacidas en ${nombreE(mayor.oe)} viven en ${alcNombre.get(mayor.dc)}: ${pct(sharePct(mayor.value, numOe))} de las que nacieron en ${nombreE(mayor.oe)}.`],
      lector: (L) => (L.alcs.length ? `De ${L.nombre}, el flujo mayor va a ${L.alcs[0].nombre}: ${entero(L.alcs[0].num)} personas, ${pct(L.alcs[0].share)}.${pocos(L)}` : sinMuestra(L)),
      fuente: `Encuesta Intercensal ${ANIO}, INEGI. Seis entidades y seis alcaldías con más personas; el resto, agrupado.`,
      alt: () => `Diagrama de flujos de seis entidades a seis alcaldías. ${[...san.enlaces].filter((e) => e.oe !== "otras" && e.dc !== "otras").sort((a, b) => b.value - a.value).slice(0, 4).map((e) => `${nombreE(e.oe)} a ${alcNombre.get(e.dc)}: ${entero(e.value)}`).join("; ")}.`
    },
    {
      id: "f",
      titulo: "En Milpa Alta, la mitad habla náhuatl",
      cuerpo: () => [`${cdmxMax === "009" ? "Milpa Alta tiene la proporción más alta de hablantes nacidos en la ciudad" : "En Milpa Alta, los hablantes nacidos en la ciudad son"}: ${pct(sharePct(ma.cdmx, ma.tot))}, ${entero(ma.cdmx)} de ${entero(ma.tot)}. Ahí, ${entero(ma.nah)} personas hablan náhuatl, ${pct(sharePct(ma.nah, ma.tot))} de los hablantes de la alcaldía; en Cuauhtémoc son ${pct(sharePct(cu.nah, cu.tot))}.`],
      lector: (L) => (L.lengua ? `Entre quienes nacieron en ${L.nombre}, la lengua con más hablantes es ${L.lengua[0].toLowerCase()}: ${entero(L.lengua[1])} personas.${pocos(L)}` : sinMuestra(L)),
      fuente: `Encuesta Intercensal ${ANIO}, INEGI. El color indica qué parte de los hablantes de cada alcaldía habla náhuatl.`,
      alt: () => `Mapa de las alcaldías coloreado por la parte de los hablantes que habla náhuatl, de ${pct(sharePct(cu.nah, cu.tot))} en Cuauhtémoc a ${pct(sharePct(ma.nah, ma.tot))} en Milpa Alta.`
    },
    {
      id: "g",
      titulo: "Quiénes llegaron en los últimos cinco años",
      cuerpo: () => [`Cada censo pregunta también dónde vivía la persona cinco años antes. En 2000, ${entero(llegada(2000))} hablantes que viven en la ciudad vivían en otra entidad cinco años antes; en ${ANIO}, ${entero(llegada(ANIO))}. En 1990 fueron ${entero(llegada(1990))} y en 2005, ${entero(llegada(2005))}.`],
      lector: (L) => {
        const n = L.llegadas.find((d) => d.anio === ANIO)?.num ?? 0;
        return n ? `Desde ${L.nombre} llegaron ${entero(n)} personas en los cinco años previos a ${ANIO}.${pocos(L)}` : `La muestra de ${ANIO} no registró llegadas recientes desde ${L.nombre}.`;
      },
      fuente: "Censos, Conteo 2005 y Encuestas Intercensales, INEGI. Personas de 5 años y más.",
      alt: () => `Línea de llegadas recientes por edición: ${H.llegadas.map((d) => `${d.anio}, ${entero(d.num)}`).join("; ")}.`
    }
  ];
}

---
title: Mapa por manzana
toc: false
---

```js
import {mapaManzanas, leyenda, cortesPorCuantil, RAMPA_MORADA} from "./components/mapa.js";
```

<h2 id="mapa-manzana" class="toc-anchor">Mapa por manzana</h2>

# Población en hogares indígenas, manzana por manzana

La Ciudad de México tiene 66,449 manzanas urbanas con dato censal. En ellas viven
9,145,155 personas, de las cuales 273,851 —el 2.99 %— forman parte de un hogar
censal indígena. Ese promedio de ciudad esconde lo que este mapa muestra: hay
manzanas donde la proporción llega al 100 % y colonias enteras que rondan el
20 %, a pocos kilómetros de otras donde no vive ninguna.

```js
// Los indicadores que se pueden pintar. El denominador es siempre la población
// total de la manzana, y así se dice en el desplegable de abajo: sin
// denominador explícito, un porcentaje no significa nada.
//
// El nombre corto de cada uno dice a QUIÉN cuenta, no solo el tema: "Hogares
// con lengua indígena" y "Personas que hablan lengua indígena" son universos
// distintos y etiquetarlos ambos como "lengua indígena" invitaba a compararlos
// como si midieran lo mismo.
// `base` es la raíz de la variable en RESAGEBURB. El filtro de sexo le añade el
// sufijo _F o _M, que es como el Censo publica el desglose.
//
// `porSexo: false` marca los indicadores que el Censo NO desagrega. PHOG_IND
// cuenta hogares completos —donde conviven ambos sexos— y no tiene versión
// femenina ni masculina: al elegirlo, el filtro de sexo se apaga en vez de
// ofrecer una opción que devolvería celdas vacías.
const INDICADORES = [
  {
    base: "PHOG_IND",
    grupo: "Población indígena",
    nombre: "Población en hogares censales indígenas",
    corto: "Hogares con lengua indígena",
    porSexo: false,
    definicion:
      "Cuenta a todos los integrantes de un hogar —incluidos quienes no hablan " +
      "la lengua— cuando la persona de referencia, su cónyuge o alguno de sus " +
      "ascendientes declararon hablarla. Es un indicador de HOGAR: mide dónde " +
      "vive la población ligada a una lengua indígena por vínculo familiar, no " +
      "cuánta gente la habla. El Censo no lo publica por sexo, porque un hogar " +
      "no tiene sexo."
  },
  {
    base: "P3YM_HLI",
    grupo: "Población indígena",
    nombre: "Personas de 3 años y más que hablan lengua indígena",
    corto: "Personas hablantes",
    porSexo: true,
    definicion:
      "Cuenta únicamente a quien declaró hablar una lengua indígena, sin importar " +
      "con quién viva. Es un indicador de PERSONA y siempre da una cifra menor " +
      "que el de hogares, porque en un mismo hogar suele haber integrantes que ya " +
      "no la hablan."
  },
  {
    base: "P3HLI_HE",
    grupo: "Población indígena",
    nombre: "Hablantes bilingües (lengua indígena y español)",
    corto: "Hablantes bilingües",
    porSexo: true,
    definicion:
      "Personas de 3 años y más que hablan una lengua indígena y además español. " +
      "Es la enorme mayoría de los hablantes en la Ciudad de México."
  },
  {
    base: "P3HLINHE",
    grupo: "Población indígena",
    nombre: "Hablantes monolingües (no hablan español)",
    corto: "Hablantes monolingües",
    porSexo: true,
    definicion:
      "Personas de 3 años y más que hablan una lengua indígena y no hablan " +
      "español. Es el grupo con mayores barreras para acceder a servicios de " +
      "salud, justicia y educación, y en la ciudad es muy pequeño: donde aparece, " +
      "suele tratarse de unas cuantas personas por manzana."
  },
  {
    base: "PNACOE",
    grupo: "Contexto: migración",
    nombre: "Población nacida en otra entidad",
    corto: "Nacidas en otra entidad",
    porSexo: true,
    definicion:
      "Personas que nacieron fuera de la Ciudad de México. No mide población " +
      "indígena: sirve para contrastar. Las colonias con mayor proporción de " +
      "población en hogares indígenas no son los pueblos originarios, y esta " +
      "variable permite ver si coinciden con las zonas de asentamiento migrante."
  },
  {
    base: "PRESOE15",
    grupo: "Contexto: migración",
    nombre: "Residía en otra entidad en 2015",
    corto: "Migración reciente",
    porSexo: true,
    definicion:
      "Personas de 5 años y más que en marzo de 2015 vivían en otra entidad. " +
      "Frente a la anterior, que capta la migración de toda la vida, esta mide " +
      "la llegada del último quinquenio antes del Censo."
  }
];

// Las opciones de sexo. El sufijo es el que RESAGEBURB usa en el nombre de la
// variable, y el denominador cambia con él: una tasa femenina se calcula sobre
// las mujeres de la manzana, no sobre su población total.
const SEXOS = [
  {clave: "T", etiqueta: "Total", sufijo: "", denominador: "POBTOT"},
  {clave: "F", etiqueta: "Mujeres", sufijo: "_F", denominador: "POBFEM"},
  {clave: "M", etiqueta: "Hombres", sufijo: "_M", denominador: "POBMAS"}
];
```

<div class="panel-filtros">

```js
// Selector agrupado por tema: los indicadores de población indígena primero y
// las variables de contexto después, para que quede claro que las segundas no
// miden lo mismo aunque se pinten en el mismo mapa.
//
// Se construye a mano y no con `Inputs.select` porque este no admite
// <optgroup>: se revisó su código y no lo genera. Sin la agrupación, "Nacidas
// en otra entidad" aparecería en la misma lista plana que "Personas hablantes"
// como si fueran indicadores equivalentes.
function selectorIndicador() {
  const select = document.createElement("select");
  const grupos = new Map();
  for (const ind of INDICADORES) {
    if (!grupos.has(ind.grupo)) {
      const g = document.createElement("optgroup");
      g.label = ind.grupo;
      grupos.set(ind.grupo, g);
      select.append(g);
    }
    const opcion = document.createElement("option");
    opcion.textContent = ind.corto;
    opcion.value = ind.base;
    grupos.get(ind.grupo).append(opcion);
  }

  const form = document.createElement("form");
  form.className = "filtro";
  const etiqueta = document.createElement("label");
  etiqueta.className = "filtro-etiqueta";
  etiqueta.textContent = "Indicador";
  // La etiqueta se asocia al select por id: sin el `for`, el control no tiene
  // nombre accesible y axe lo marca como crítico.
  select.id = "selector-indicador";
  etiqueta.htmlFor = select.id;
  form.append(etiqueta, select);

  form.value = INDICADORES[0];
  select.onchange = () => {
    form.value = INDICADORES.find((d) => d.base === select.value);
    form.dispatchEvent(new CustomEvent("input", {bubbles: true}));
  };
  return form;
}

const indicador = view(selectorIndicador());
```

```js
// Desplegable y no botones de radio, como en los demás tableros del proyecto:
// los tres controles del panel se leen entonces igual.
const sexo = view(
  Inputs.select(SEXOS, {
    label: "Sexo",
    format: (d) => d.etiqueta,
    value: SEXOS[0]
  })
);
```

```js
// También desplegable: un interruptor rompía la lectura del panel y su
// etiqueta larga se partía en tres líneas.
const ambito = view(
  Inputs.select(["Toda la ciudad", "Solo pueblos originarios"], {
    label: "Ámbito",
    value: "Toda la ciudad"
  })
);
```

</div>

```js
// Los cortes se calculan sobre los datos reales de cada indicador, no fijos.
// La tasa de hogares indígenas llega a 24 % en una colonia y la de hablantes
// monolingües no pasa de 0.1 %: con una escala compartida el segundo mapa
// saldría enteramente del color más claro y parecería que no hay variación.
//
// Se usa el CSV sin geometría: las formas ya viajan en las teselas y volver a
// descargarlas en GeoJSON costaría 5.4 MB para nada.
const colonias = await FileAttachment("data/colonias_resumen.csv").csv({typed: true});
```

```js
// El sexo elegido solo aplica si el indicador tiene desglose. En PHOG_IND no
// existe —el Censo no publica hogares por sexo— y se cae a Total en vez de
// buscar una columna inexistente, que dejaría el mapa gris entero.
const sexoEfectivo = indicador.porSexo ? sexo : SEXOS[0];
const campo = `tasa_${(indicador.base + sexoEfectivo.sufijo).toLowerCase()}`;
const conteo = indicador.base + sexoEfectivo.sufijo;
const denominador = sexoEfectivo.denominador;
```

```js
// El selector de sexo se OCULTA cuando el indicador no admite desglose, igual
// que en los demás tableros del proyecto: un filtro que no aplica se quita en
// vez de ofrecer una opción que devolvería celdas vacías. Es el caso de
// PHOG_IND, que cuenta hogares completos y el Censo no publica por sexo.
{
  const panel = document.querySelector(".panel-filtros");
  const control = [...(panel?.querySelectorAll("form") ?? [])].find(
    (f) => f.querySelector("label")?.textContent.trim() === "Sexo"
  );
  if (control) control.style.display = indicador.porSexo ? "" : "none";
}
```

```js
const valores = colonias.map((p) => p[campo]).filter((v) => v != null);
const cortes = cortesPorCuantil(valores, 5);
```

```js
// El tooltip escapa el texto que viene de las teselas. Los nombres de colonia
// son dato de terceros y van a parar a innerHTML.
const escapar = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c])
  );

const entero = (n) => (n == null ? "sin dato" : Number(n).toLocaleString("es-MX"));

function tooltip(p) {
  const tasa = p[campo];
  const n = p[conteo];
  // El denominador se nombra en el globo: con el filtro en Mujeres, el
  // porcentaje es sobre las mujeres de la manzana y no sobre su población, y
  // sin decirlo la cifra se leería mal.
  const etiquetaDen = denominador === "POBFEM" ? "Mujeres en la manzana"
    : denominador === "POBMAS" ? "Hombres en la manzana"
    : "Población de la manzana";
  const rotulo = indicador.porSexo && sexoEfectivo.clave !== "T"
    ? `${indicador.corto} · ${sexoEfectivo.etiqueta.toLowerCase()}`
    : indicador.corto;
  return `
    <div class="globo-titulo">${escapar(p.colonia ?? "Sin colonia")}</div>
    <div class="globo-sub">${escapar(p.alcaldia)}</div>
    <table class="globo-tabla">
      <tr><th>${escapar(rotulo)}</th><td>${
        tasa == null ? "sin dato publicado" : Number(tasa).toFixed(1) + " %"
      }</td></tr>
      <tr><th>Personas</th><td>${entero(n)}</td></tr>
      <tr><th>${escapar(etiquetaDen)}</th><td>${entero(p[denominador])}</td></tr>
    </table>`;
}
```

```js
const control = mapaManzanas({
  pmtiles: await FileAttachment("data/manzanas.pmtiles").url(),
  capa: "manzanas",
  campo,
  cortes,
  rampa: RAMPA_MORADA,
  tooltip,
  // Contornos de referencia: sin ellos las manzanas se cortan de golpe en el
  // límite del estado sobre un mapa base que sigue hasta Morelos, y se lee como
  // si faltaran datos en vez de como un recorte deliberado.
  limite: await FileAttachment("data/cdmx_limite.geojson").json(),
  alcaldias: await FileAttachment("data/cdmx_alcaldias.geojson").json()
});

display(control.nodo);
```

```js
// El mapa se crea una sola vez y se repinta al cambiar el filtro: recrearlo
// obligaría a volver a descargar las teselas y perdería la posición de la vista.
control.actualizar(campo, cortes);
// La marca viaja como cadena "True"/"False" en las teselas, no como booleano:
// el GeoJSON lo escribe Python y tippecanoe conserva el tipo tal cual. Comparar
// contra `true` no casaba con nada y el filtro vaciaba el mapa en silencio.
control.filtrar(
  ambito === "Solo pueblos originarios"
    ? ["==", ["to-string", ["get", "pueblo_originario"]], "True"]
    : null
);
```

```js
// El formato se adapta a la magnitud de los cortes. Con un decimal fijo, los
// dos primeros escalones de varios indicadores se imprimían ambos como "0.0 %"
// —el segundo corte vale 0.04 %— y la leyenda parecía repetir una clase.
const decimales = cortes.some((c) => c > 0 && c < 0.1) ? 2 : 1;

display(
  leyenda({
    cortes,
    titulo: `${indicador.nombre}${
      indicador.porSexo && sexoEfectivo.clave !== "T"
        ? ` · ${sexoEfectivo.etiqueta.toLowerCase()}`
        : ""
    } (% de ${
      denominador === "POBFEM" ? "las mujeres"
        : denominador === "POBMAS" ? "los hombres"
        : "la población"
    } de la manzana)`,
    formato: (x) => x.toFixed(decimales) + " %"
  })
);
```

<details>
<summary>¿Qué quiere decir este análisis?</summary>

Cada polígono es una manzana urbana de la Ciudad de México y su color es el
porcentaje que representa el indicador elegido **sobre la población total de esa
manzana**. La pregunta que responde el mapa es dónde vive la población indígena
dentro de la ciudad, no cuánta hay: una manzana de doscientos habitantes donde
veinte forman hogares indígenas se pinta igual que una de dos mil con doscientos.

Los cuatro indicadores no miden lo mismo y no son intercambiables:

```js
display(
  html`<dl class="lista-definiciones">${INDICADORES.map(
    (d) => html`<div class="definicion${d === indicador ? " es-activa" : ""}">
      <dt>${d.corto}</dt>
      <dd>${d.definicion}</dd>
    </div>`
  )}</dl>`
);
```

Los tres últimos son **subconjuntos anidados de personas**: quienes hablan una
lengua indígena se dividen en bilingües y monolingües, y la suma de ambos da el
total de hablantes. El primero es de otra naturaleza —cuenta hogares completos,
incluidos los integrantes que ya no hablan la lengua—, y por eso siempre arroja
una cifra mayor. Comparar el porcentaje de hogares con el de hablantes en la
misma manzana no revela una contradicción sino esa diferencia de universo.

Ninguno de los cuatro es autoadscripción, y no por omisión: la pregunta sobre si
la persona se considera indígena solo se levantó en el cuestionario ampliado, que
es una muestra y no se publica por manzana. Por eso la cifra de ciudad que arroja
este mapa —2.99 %— es menor que el 8 o 9 % que suele citarse para la Ciudad de
México, que proviene de esa otra pregunta. Son mediciones distintas, no un error;
quien necesite la medida amplia debe usar la autoadscripción, y quien necesite la
distribución territorial fina no tiene más opción que estos indicadores.

Las manzanas grises no valen cero: son las 5,452 donde INEGI suprime la cifra
por confidencialidad, casi siempre por tener muy pocos habitantes. Contarlas como
ausencia de población indígena sesgaría el mapa hacia abajo.

</details>

---

<h2 id="colonias" class="toc-anchor">Agregado por colonia</h2>

## De la manzana al barrio

La manzana es la unidad más fina que publica el Censo, pero no es la unidad en la
que se piensa la ciudad ni en la que se decide una política. Al agregar a colonia
aparece un problema que la jerarquía del INEGI no tiene: **5,925 manzanas —el
8.9 %— caen en más de una colonia**, porque los límites de colonia no siguen los
de la cartografía censal.

A esas manzanas se les reparte la población en proporción al área que cae en cada
colonia. El supuesto es que la gente se distribuye de manera uniforme dentro de
la manzana, cosa que no es cierta cuando media manzana es un parque o una
vialidad; es la mejor aproximación posible porque el Censo publica una sola cifra
por manzana completa, sin detalle interno.

```js
const colTabla = colonias
  .filter((p) => p[denominador] >= 500 && p[campo] != null)
  .sort((a, b) => b[campo] - a[campo])
  .slice(0, 25);
```

```js
// La tabla se desplaza dentro de su caja: con tabindex la región se alcanza
// con el teclado (axe: scrollable-region-focusable).
const tablaColonias =
  Inputs.table(colTabla, {
    // Sin casillas de selección: la tabla es de consulta y las casillas sin
    // etiqueta eran 26 controles sin nombre accesible.
    select: false,
    columns: ["colonia", "alcaldia_col", campo, conteo, denominador, "pueblo_originario"],
    header: {
      colonia: "Colonia",
      alcaldia_col: "Alcaldía",
      [campo]: "%",
      [conteo]: "Personas",
      [denominador]: denominador === "POBFEM" ? "Mujeres"
        : denominador === "POBMAS" ? "Hombres" : "Población",
      pueblo_originario: "Pueblo originario"
    },
    format: {
      [campo]: (x) => x.toFixed(1) + " %",
      [conteo]: (x) => (x ?? 0).toLocaleString("es-MX"),
      [denominador]: (x) => (x ?? 0).toLocaleString("es-MX"),
      pueblo_originario: (x) => (x ? "Sí" : "")
    },
    sort: campo,
    reverse: true,
    rows: 25,
    width: {colonia: 220, alcaldia_col: 150}
  });
tablaColonias.setAttribute("tabindex", "0");
tablaColonias.setAttribute("role", "region");
tablaColonias.setAttribute("aria-label", "Tabla de colonias");
display(tablaColonias);
```

<details>
<summary>¿Qué quiere decir este análisis?</summary>

La tabla ordena las colonias por el porcentaje del indicador elegido y se limita
a las que tienen al menos 500 habitantes: en una colonia de treinta personas, que
tres formen hogares indígenas da un 10 % que no dice nada sobre la ciudad.

La columna de pueblo originario marca los 50 pueblos que reconoce el padrón de
la Secretaría de Pueblos y Barrios Originarios (SEPI), cruzados por su clave de
unidad territorial, la misma que usa el IECM. Los 50 son de etnia náhuatl y se
concentran en siete alcaldías del sur y el poniente: Xochimilco, Milpa Alta,
Tlalpan, Tláhuac, Cuajimalpa, La Magdalena Contreras y Álvaro Obregón.

En conjunto tienen 4.59 % de su población en hogares indígenas, contra 2.86 % en
el resto de la ciudad. La concentración es real, pero no los agota: ninguna de
las colonias con mayor porcentaje de toda la ciudad es un pueblo originario. La
población indígena de la Ciudad de México es, en buena medida, población migrante
asentada en la periferia urbana, no solo la descendiente de los pueblos que la
ciudad absorbió al crecer.

</details>

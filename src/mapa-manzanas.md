---
title: Mapa por manzana
toc: false
---

```js
import {mapaManzanas, leyenda, cortesPorCuantil, RAMPA_MORADA} from "./components/mapa.js";
import {panelCruceMapa, seccionCruce, filasDesdeTabla} from "./components/cruce.js";
import {catalogo, verificado} from "./components/fuentes.js";
const fuentes = catalogo(await FileAttachment("data/fuentes.csv").csv());
```

<h2 id="mapa-manzana" class="toc-anchor">Mapa por manzana</h2>

# Población en hogares indígenas, manzana por manzana

Este mapa pinta cada manzana urbana de la Ciudad de México según la proporción de su población que cumple el indicador elegido, con el Censo 2020. Los indicadores miden lengua indígena, en hogares o en personas, y se pueden agregar a colonia.

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
  },
  // Conectividad y condiciones de la manzana. Son VIVIENDAS, no personas, y su
  // denominador es VIVPARH_CV (viviendas particulares habitadas con
  // características), que es el que usa CONEVAL y se verificó contra su tabla
  // por AGEB. `denominador` y `unidad` viajan con el indicador para que el
  // globo, la leyenda y la tabla nombren lo que de verdad se está dividiendo.
  {
    base: "VPH_INTER", grupo: "Conectividad de las viviendas",
    nombre: "Viviendas que disponen de internet", corto: "Viviendas con internet",
    porSexo: false, denominador: "VIVPARH_CV", unidad: "viviendas",
    definicion: "Viviendas particulares habitadas que disponen de internet, sobre el total de viviendas particulares habitadas con características de la manzana."
  },
  {
    base: "VPH_PC", grupo: "Conectividad de las viviendas",
    nombre: "Viviendas que disponen de computadora, laptop o tableta", corto: "Viviendas con computadora",
    porSexo: false, denominador: "VIVPARH_CV", unidad: "viviendas",
    definicion: "Viviendas particulares habitadas que disponen de computadora, laptop o tableta."
  },
  {
    base: "VPH_CEL", grupo: "Conectividad de las viviendas",
    nombre: "Viviendas que disponen de teléfono celular", corto: "Viviendas con celular",
    porSexo: false, denominador: "VIVPARH_CV", unidad: "viviendas",
    definicion: "Viviendas particulares habitadas donde al menos un integrante dispone de teléfono celular."
  },
  {
    base: "VPH_RADIO", grupo: "Conectividad de las viviendas",
    nombre: "Viviendas que disponen de radio", corto: "Viviendas con radio",
    porSexo: false, denominador: "VIVPARH_CV", unidad: "viviendas",
    definicion: "Viviendas particulares habitadas que disponen de radio."
  },
  {
    base: "VPH_STVP", grupo: "Conectividad de las viviendas",
    nombre: "Viviendas que disponen de televisión de paga", corto: "Viviendas con televisión de paga",
    porSexo: false, denominador: "VIVPARH_CV", unidad: "viviendas",
    definicion: "Viviendas particulares habitadas que disponen de servicio de televisión de paga."
  },
  {
    base: "VPH_SPMVPI", grupo: "Conectividad de las viviendas",
    nombre: "Viviendas con servicio de películas, música o videos de paga por internet", corto: "Viviendas con streaming",
    porSexo: false, denominador: "VIVPARH_CV", unidad: "viviendas",
    definicion: "Viviendas particulares habitadas que disponen de servicio de películas, música o videos de paga por internet."
  },
  {
    base: "VPH_SINTIC", grupo: "Conectividad de las viviendas",
    nombre: "Viviendas sin ninguna tecnología de la información", corto: "Viviendas sin ninguna tecnología",
    porSexo: false, denominador: "VIVPARH_CV", unidad: "viviendas",
    definicion: "Viviendas particulares habitadas que no disponen de radio, televisor, computadora, teléfono fijo, celular ni internet."
  },
  {
    base: "PSINDER", grupo: "Condiciones de la población",
    nombre: "Población sin afiliación a servicios de salud", corto: "Sin afiliación a servicios de salud",
    porSexo: false,
    definicion: "Personas que no están afiliadas a servicios médicos en ninguna institución pública o privada, sobre la población total de la manzana."
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

```js
// Desplegable y no botones de radio, como en los demás tableros del proyecto.
const selSexo = Inputs.select(SEXOS, {label: "Sexo", format: (d) => d.etiqueta, value: SEXOS[0]});
selSexo.dataset.campo = "sexo";
const selAmbito = Inputs.select(["Toda la ciudad", "Solo pueblos originarios"], {label: "Ámbito", value: "Toda la ciudad"});
selAmbito.dataset.campo = "ambito";

// El panel separa el indicador de población indígena de las características
// con las que se cruza. Antes todo vivía en una sola lista y elegir "Viviendas
// con internet" pintaba el internet de TODA la ciudad, sin relación con la
// población indígena. Ahora el cruce se pinta donde la presencia indígena
// alcanza el mínimo elegido.
const conClave = INDICADORES.map((d) => ({...d, clave: d.base}));
const panelMapa = panelCruceMapa({
  indigenas: conClave.filter((d) => d.grupo === "Población indígena"),
  cruces: conClave.filter((d) => d.grupo !== "Población indígena"),
  id: "mza", extrasQue: [selSexo], extrasDonde: [selAmbito],
});
display(panelMapa);
```

```js
const eleccion = Generators.input(panelMapa);
const sexo = Generators.input(selSexo);
const ambito = Generators.input(selAmbito);
```

```js
// `indicador` es lo que se PINTA: el cruce si hay uno, o el indicador de
// población indígena. `presencia` es siempre el indicador de población indígena,
// que además decide qué manzanas entran cuando hay un mínimo.
const indicador = eleccion.cruce ?? eleccion.indigena;
const presencia = eleccion.indigena;
const umbral = eleccion.umbral;
const campoPresencia = `tasa_${presencia.base.toLowerCase()}`;
```

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
// El denominador lo manda el indicador cuando trae el suyo (las viviendas);
// si no, lo manda el sexo elegido.
const esVivienda = indicador.unidad === "viviendas";
const denominador = indicador.denominador ?? sexoEfectivo.denominador;
// En la tabla por colonia el denominador de las viviendas es el restringido a
// las manzanas con cifra publicada (den_<indicador>), no un total de la colonia.
const denColonia = esVivienda ? `den_${indicador.base}` : denominador;
```

```js
// El selector de sexo se OCULTA cuando el indicador no admite desglose, igual
// que en los demás tableros del proyecto: un filtro que no aplica se quita en
// vez de ofrecer una opción que devolvería celdas vacías. Es el caso de
// PHOG_IND, que cuenta hogares completos y el Censo no publica por sexo.
selSexo.style.display = indicador.porSexo ? "" : "none";
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
  const etiquetaDen = esVivienda ? "Viviendas"
    : denominador === "POBFEM" ? "Mujeres"
    : denominador === "POBMAS" ? "Hombres"
    : "Personas";
  const rotulo = indicador.porSexo && sexoEfectivo.clave !== "T"
    ? `${indicador.corto} · ${sexoEfectivo.etiqueta.toLowerCase()}`
    : indicador.corto;
  // Globo corto: el valor, la presencia indígena cuando se está cruzando, y el
  // conteo sobre su total en un solo renglón.
  const filaPresencia = eleccion.cruce
    ? `<tr><th>${escapar(presencia.corto)}</th><td>${
        p[campoPresencia] == null ? "sin dato" : Number(p[campoPresencia]).toFixed(1) + " %"}</td></tr>`
    : "";
  return `
    <div class="globo-titulo">${escapar(p.colonia ?? "Sin colonia")}</div>
    <div class="globo-sub">${escapar(p.alcaldia)}</div>
    <table class="globo-tabla">
      <tr><th>${escapar(rotulo)}</th><td>${
        tasa == null ? "sin dato publicado" : Number(tasa).toFixed(1) + " %"
      }</td></tr>
      ${filaPresencia}
      <tr><th>${escapar(etiquetaDen)}</th><td>${entero(n)} de ${entero(p[denominador])}</td></tr>
    </table>`;
}
```

```js
const control = mapaManzanas({
  pmtiles: await FileAttachment("data/manzanas.pmtiles").url(),
  capa: "manzanas",
  // Valores INICIALES fijos, no las variables reactivas: si esta celda leyera
  // `campo` o `cortes`, cada cambio del panel recrearía el mapa entero, volvería a
  // bajar las teselas y descartaría el filtro recién puesto. El repintado va en
  // la celda siguiente, con `actualizar` y `filtrar`.
  campo: "tasa_phog_ind",
  cortes: cortesPorCuantil(colonias.map((c) => c.tasa_phog_ind).filter((v) => v != null), 5),
  rampa: RAMPA_MORADA,
  // El globo lee SIEMPRE la función vigente: se resuelve al pasar el cursor.
  tooltip: (p) => globoActual.fn(p),
  // Contornos de referencia: sin ellos las manzanas se cortan de golpe en el
  // límite del estado sobre un mapa base que sigue hasta Morelos, y se lee como
  // si faltaran datos en vez de como un recorte deliberado.
  limite: await FileAttachment("data/cdmx_limite.geojson").json(),
  alcaldias: await FileAttachment("data/cdmx_alcaldias.geojson").json()
});
const globoActual = {fn: () => ""};
display(control.nodo);
```

```js
globoActual.fn = tooltip;
// El mapa se crea una sola vez y se repinta al cambiar el filtro: recrearlo
// obligaría a volver a descargar las teselas y perdería la posición de la vista.
control.actualizar(campo, cortes);
// La marca viaja como cadena "True"/"False" en las teselas, no como booleano:
// el GeoJSON lo escribe Python y tippecanoe conserva el tipo tal cual. Comparar
// contra `true` no casaba con nada y el filtro vaciaba el mapa en silencio.
// El mínimo de presencia indígena se aplica sobre la tasa total del indicador de
// población indígena. Una manzana con la cifra suprimida no la tiene y queda
// fuera: `to-number` convierte el nulo en 0.
const condiciones = [];
if (ambito === "Solo pueblos originarios") condiciones.push(["==", ["to-string", ["get", "pueblo_originario"]], "True"]);
if (umbral.valor > 0) condiciones.push([">=", ["to-number", ["get", campoPresencia]], umbral.valor]);
control.filtrar(condiciones.length ? ["all", ...condiciones] : null);
control.realzar(umbral.valor > 0);
```

```js
// Con un mínimo activo quedan manzanas sueltas, que a zoom de ciudad son puntos.
// Sin mínimo no se muestra nada: una plantilla vacía se imprime como «null».
if (umbral.valor > 0) display(
  html`<p class="panel-aviso" role="note">El mapa muestra solo las manzanas con ${umbral.valor} % o más de
      ${presencia.nombre.toLowerCase()}. Son manzanas sueltas: acerca el mapa para verlas, o usa el
      <a href="./mapa-agebs">mapa por AGEB</a> para la vista de toda la ciudad.</p>`);
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
      esVivienda ? "las viviendas"
        : denominador === "POBFEM" ? "las mujeres"
        : denominador === "POBMAS" ? "los hombres"
        : "la población"
    } de la manzana)${umbral.valor > 0
      ? `, en manzanas con ${umbral.valor} % o más de ${presencia.nombre.toLowerCase()}` : ""}`,
    formato: (x) => x.toFixed(decimales) + " %"
  })
);
```

<details>
<summary>¿Qué quiere decir este análisis?</summary>

El panel tiene dos partes. **Qué se pinta** elige el indicador de población
indígena y, si se quiere, una característica con la que cruzarlo: conectividad de
las viviendas, migración o afiliación a servicios de salud. **Dónde** fija la
presencia indígena mínima: con un cruce activo, el mapa pinta esa característica
solo en las manzanas donde la población indígena alcanza ese mínimo. Es un cruce
entre territorios: el tabulado dice cuántas viviendas de la manzana tienen
internet y cuánta de su población vive en hogares indígenas, pero no qué vivienda
es de quién. El cruce entre personas está en las páginas del Censo, la ENIGH y
la ENDUTIH.

Cada polígono es una manzana urbana de la Ciudad de México y su color es el
porcentaje que representa el indicador elegido **sobre la población total de esa
manzana**. La pregunta que responde el mapa es dónde vive la población indígena
dentro de la ciudad, no cuánta hay: una manzana de doscientos habitantes donde
veinte forman hogares indígenas se pinta igual que una de dos mil con doscientos.

Los indicadores del mismo grupo no miden lo mismo y no son intercambiables:

```js
display(
  html`<dl class="lista-definiciones">${INDICADORES.filter((d) => d.grupo === indicador.grupo).map(
    (d) => html`<div class="definicion${d === indicador ? " es-activa" : ""}">
      <dt>${d.corto}</dt>
      <dd>${d.definicion}</dd>
    </div>`
  )}</dl>`
);
```

En el grupo de población indígena, los tres indicadores de hablantes son
**subconjuntos anidados de personas**: quienes hablan una lengua indígena se
dividen en bilingües y monolingües, y la suma de ambos da el total de hablantes.
El de hogares es de otra naturaleza —cuenta hogares completos, incluidos los
integrantes que ya no hablan la lengua—, y por eso siempre arroja una cifra mayor.
Los indicadores de conectividad cuentan viviendas y se dividen entre las
viviendas particulares habitadas con características de la manzana. Comparar el porcentaje de hogares con el de hablantes en la
misma manzana no revela una contradicción sino esa diferencia de universo.

Ninguno de los indicadores es autoadscripción, y no por omisión: la pregunta sobre si
la persona se considera indígena solo se levantó en el cuestionario ampliado, que
es una muestra y no se publica por manzana. Las cifras de este mapa y las de
autoadscripción responden preguntas distintas y no son comparables entre sí.

Las manzanas grises no valen cero: son aquellas donde el INEGI suprime la cifra
por confidencialidad, casi siempre por tener muy pocos habitantes.

</details>

---

<h2 id="colonias" class="toc-anchor">Agregado por colonia</h2>

## De la manzana al barrio

La manzana es la unidad más fina que publica el Censo. Esta tabla agrega las manzanas a colonia: cuando una manzana cae en más de una colonia, su población se reparte en proporción al área que queda en cada una. El procedimiento está en la página de fuentes.

```js
const colTabla = colonias
  .filter((p) => (esVivienda ? p.POBTOT : p[denominador]) >= 500 && p[campo] != null)
  .filter((p) => umbral.valor === 0 || (p[campoPresencia] ?? -1) >= umbral.valor)
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
    columns: ["colonia", "alcaldia_col", campo, conteo, denColonia, "pueblo_originario"],
    header: {
      colonia: "Colonia",
      alcaldia_col: "Alcaldía",
      [campo]: "%",
      [conteo]: esVivienda ? "Viviendas que cumplen" : "Personas",
      [denColonia]: esVivienda ? "Viviendas"
        : denominador === "POBFEM" ? "Mujeres"
        : denominador === "POBMAS" ? "Hombres" : "Población",
      pueblo_originario: "Pueblo originario"
    },
    format: {
      [campo]: (x) => x.toFixed(1) + " %",
      [conteo]: (x) => (x ?? 0).toLocaleString("es-MX"),
      [denColonia]: (x) => (x ?? 0).toLocaleString("es-MX"),
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

La tabla ordena las colonias por el porcentaje de lo que pinta el mapa, aplica el
mismo mínimo de presencia indígena que el panel y se limita a las que tienen al
menos 500 habitantes, porque en colonias muy pequeñas unas
cuantas personas mueven mucho el porcentaje.

La columna de pueblo originario marca los 50 pueblos que reconoce el padrón de
la Secretaría de Pueblos y Barrios Originarios (SEPI), cruzados por su clave de
unidad territorial, la misma que usa el IECM. Los 50 son de etnia náhuatl y se
concentran en siete alcaldías del sur y el poniente: Xochimilco, Milpa Alta,
Tlalpan, Tláhuac, Cuajimalpa, La Magdalena Contreras y Álvaro Obregón.

</details>

---

<h2 id="cruce" class="toc-anchor">Conectividad según la presencia indígena</h2>

```js
const cruce = await FileAttachment("data/cruce_manzanas.csv").csv({typed: true});
```

```js
display(seccionCruce({
  numero: "03",
  titulo: "Conectividad según la presencia indígena",
  filasDe: (ind) => filasDesdeTabla(cruce, ind),
  etiquetaUnidades: "Manzanas",
  unidadTexto: "manzana",
  fuenteTexto: "INEGI, Censo 2020, resultados por manzana urbana",
  fuentesBloque: verificado(fuentes, {
    datos: ["D-CENSO-2020-RESAGEBURB"],
    verificadoCon: ["D-CONEVAL-GRS-2020"],
    resultado: "el denominador de las viviendas (viviendas particulares habitadas con características) se cotejó por AGEB contra el total que publica CONEVAL y coincide. El agrupamiento de manzanas por presencia indígena no se publica y es cálculo propio; entran solo las manzanas con cifra publicada.",
    lectura: ["R-IFT-BRECHA"],
  }),
}));
```

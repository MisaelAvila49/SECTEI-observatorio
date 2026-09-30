---
title: Metodología
toc:
  label: En esta página
---

<div class="hero-pagina">
  <span class="kicker">Metodología</span>
  <h1>Cómo se hizo</h1>
  <p class="hero-entrada">De dónde sale cada cifra, qué mide cada población indígena y qué se puede y qué no se puede saber con estas fuentes. Cada gráfica del sitio lleva además su propio desplegable «Fuentes y verificación», con la cifra oficial contra la que se cotejó.</p>
</div>

<h2 id="paso-a-paso">Paso a paso</h2>

Esta página describe, en orden y sin detalle de código, cómo se construyó
cada parte del tablero: qué archivos se descargaron, qué se calculó con
ellos, contra qué se cotejó cada cifra y qué no permite saber ninguna fuente.
Las definiciones de cada población están en [Definiciones](#definiciones) y
cada archivo con su liga y sus cautelas, en [Fuentes y cobertura](#fuentes).

### 1. Qué se quería saber y qué publica cada fuente

Se partió de cuatro preguntas: cuánta población indígena vive en la Ciudad de
México según cada definición, dónde vive, qué lenguas habla y de dónde llegó.
Antes de diseñar nada se revisó qué publica cada producto del INEGI y a qué
nivel geográfico, porque eso decide qué se puede mostrar. El resultado fija
la estructura del mapa: la población en hogares indígenas y los hablantes
existen por manzana y por AGEB en el tabulado del Censo 2020; la lengua que
se habla, la autoadscripción y la serie de 1990 a 2025 existen solo en
muestras y tabulados que llegan hasta la alcaldía; y la variante de la lengua
no la pregunta ningún censo ni encuesta, de modo que solo puede inferirse.
Los controles del mapa que no aplican a un nivel se ocultan en vez de
ofrecer opciones vacías.

### 2. Descargas

Todos los insumos son públicos. Del INEGI se descargaron los Principales
resultados por localidad (ITER) de 1990, 1995, 2000, 2005, 2010 y 2020, los
tabulados por AGEB y manzana de 2010 y de 2020 para la Ciudad de México, la
cartografía urbana de cierre del Censo 2010 (un archivo por delegación), los microdatos
de las muestras de 1990, 2000, 2005, 2010 y 2020 y de las encuestas
intercensales de 2015 y 2025, el marco geoestadístico 2020 y el clasificador
de lenguas del Censo 2020. Del INALI, el Catálogo de las Lenguas Indígenas
Nacionales de 2008 (publicado en el Diario Oficial) y sus cuadros de hablantes
por variante con el Censo 2000. De CONAPO y CONEVAL, los grados de
marginación urbana y de rezago social por AGEB de 2020, y del gobierno de la
ciudad, las colonias del IECM y el padrón de pueblos y barrios originarios de
la SEPI. Los archivos crudos no se versionan en el repositorio; el script de
descarga los reproduce y los que el portal del INEGI no ofrece por liga
directa (los ITER de 1990 a 2005 y las muestras) se descargan a mano.

### 3. Cómo se leyó cada archivo

Cada edición cambia nombres de columnas y códigos, así que ningún archivo se
leyó por el nombre de sus variables: cada código se comprobó con cruces
antes de usarlo. El sexo es 1 y 2 hasta 2005 y 1 y 3 desde 2010; la pregunta
de habla usa 1, 2 y 9 hasta 2005 y 1, 3 y 9 después; la de hablar español,
3 y 4 hasta 2005, 5 y 7 en 2015 y 1 y 3 en las demás; y la lengua viene con
el clasificador histórico del INEGI en 1990, 2000 y 2005 y con la clave del
INALI desde 2010. Los dos clasificadores comparten el número 0211 con
significados distintos (chinanteco en el histórico, náhuatl en el INALI), por
lo que la traducción entre ambos se midió en la muestra de 2010, donde cada
persona trae las dos claves, y quedó en una tabla de equivalencias.

Cada lector de archivo lleva una guardia: si la cifra de control de la
ciudad no coincide con la publicada (por ejemplo 125 153 hablantes en 2020 o
784 605 personas que se consideran indígenas en 2015), el proceso se detiene
en vez de producir una tabla equivocada.

### 4. La serie por alcaldía, 1990 - 2025

Para cada edición se tomó el conteo censal cuando existe y la muestra solo
para lo que el conteo no pregunta. Los hablantes salen del ITER (filas de
total de la entidad y de cada delegación) porque las muestras ampliadas los
sobreestiman; la autoadscripción, la unión y la intersección de poblaciones
salen de las muestras, con su error de diseño calculado por linearización
de Taylor y mostrado como intervalo. La pregunta de lengua se hizo a partir de los 5 años hasta 2005 y a partir
de los 3 desde 2010. Para comparar las ocho ediciones, los hablantes se
cuentan siempre sobre la población de 5 años y más: el INEGI la publica de
1990 a 2010 y en 2020, y en 2015 y 2025, que no tienen tabulado con ese
corte, se calcula con los microdatos de las intercensales. El mismo cálculo
a partir de 3 años reproduce exactamente la cifra publicada de esas dos
ediciones, que es la comprobación del método. Por sexo solo hay 5 años y más
en 2005, 2015 y 2025, así que la serie por sexo va en 3 años y más desde
2010. La autoadscripción conserva el universo de cada fuente: 5 años y más
en 2000, 3 y más en 2010 y todas las edades desde 2015. El ITER de 1990 no publica el total de hablantes ni la
población de 5 años y más, y la figura lo dice: su cifra suma a quienes
hablan y no hablan español y estima el denominador con la muestra de ese
censo.

### 5. Las lenguas y su origen

La lengua concreta se calculó en las siete muestras por alcaldía y sexo, con
la clave de agrupación lingüística del INALI. Para 2015 la tabla reproduce
exactamente las cifras publicadas por la Secretaría de Cultura (náhuatl
38 549, mixteco 15 920, otomí 13 764), que es la comprobación de que la clave
está bien leída. El origen se tomó de dos preguntas: la entidad de nacimiento
de cada hablante y la entidad y municipio donde vivía cinco años antes.

### 6. Las variantes: el método del INALI aplicado al lugar de origen

Ningún censo pregunta la variante. El INALI estima hablantes por variante
cruzando los hablantes del Censo por localidad con la referencia
geoestadística de cada variante de su Catálogo, y marca con asterisco las
variantes que comparten localidades. Aquí se aplicó el mismo cruce, a nivel
municipio, al lugar de origen de los hablantes que viven en la ciudad, en
tres niveles de certeza que el mapa rotula. Primero, "exacta": se conoce el
municipio donde la persona vivía cinco años antes y el Catálogo ubica ahí
una sola variante de su lengua. Segundo, "única": solo se conoce la entidad
de nacimiento y en ella hay una sola variante. Tercero, "estimada": la
entidad tiene varias variantes y los hablantes nacidos ahí se reparten entre
ellas en proporción a los hablantes de esa lengua que el Censo 2020 registra
en los municipios de cada variante. Quienes nacieron en la ciudad, en otro
país o en una entidad sin registro de la lengua quedan sin variante. Lo
asignado por municipio se descuenta de la entidad antes de repartir el
resto, para no contar a nadie dos veces, y una guardia comprueba que la
suma de todas las asignaciones sea igual al total de hablantes con origen
conocido.

Es una inferencia sobre el lugar de origen y no un dato de la persona: quien
nació en una entidad pudo aprender la variante de otra. Como contraste
externo, el orden de las variantes mayores de cada lengua se comparó con los
cuadros por variante del INALI de 2000.

### 7. El mapa

Las manzanas y las AGEB se sirven como teselas vectoriales con las tasas de
cada edición como atributos, una capa por año: la de 2020 con el marco
geoestadístico 2020 y la de 2010 con la cartografía de cierre del Censo 2010,
que el INEGI publica por delegación y que cubre las 2 432 AGEB y las 63 239
manzanas del tabulado de ese año. En 2010 no hay cruces (las clasificaciones
de CONAPO y CONEVAL por AGEB de ese año no se cargaron) y la definición de
hogar indígena es la anterior, sin ascendientes; el mapa lo avisa al elegir
esa población. Las alcaldías y las entidades son polígonos cuyo valor se
escribe en el navegador con la serie, la lengua y el año elegidos. Los cortes
de color son fijos a lo largo de los años en todos los niveles, calculados
sobre todas las ediciones de cada indicador, para que el mismo tono
signifique lo mismo en 1990 y en 2025, o en 2010 y en 2020. La vista de origen dibuja
una flecha por entidad y variante, con el grosor por número de personas y el
color por variante. Cada variante tiene un tono fijo, el mismo en la lista,
en las flechas y en el mapa de la lengua; por entidad se dibujan hasta cinco
flechas con color y una gris con las variantes menores sumadas. Con treinta
tonos ningún esquema es seguro para daltonismo, por lo que el nombre de la
variante acompaña siempre al color en el globo y en la leyenda.

Con una lengua elegida hay dos vistas más: la de origen, con una línea por
entidad de nacimiento y variante probable, y la del mapa de la lengua, que
pinta cada municipio del país con la variante que el Catálogo ubica ahí,
sobre los municipios del marco geoestadístico 2020 simplificados a unos
300 metros. Al hacer clic en una unidad se fija a la izquierda para
comparar hasta cinco; el cambio de filtro las borra.

### 8. Cotejos

Cada cifra central se comparó con una publicada y el resultado está en el
archivo de verificaciones del repositorio, que se ejecuta en cada
construcción del sitio. Coinciden con el ITER los hablantes de 1995, 2000,
2005, 2010 y 2020; con el documento de la Secretaría de Cultura, las 32
celdas de hablantes por alcaldía y sexo de 2015, la distribución por
alcaldía y las seis lenguas mayores; con los perfiles de la SEPI, los
hablantes y autoadscritos de 2020 y los monolingües por alcaldía; con el
tabulado de la Intercensal 2025, las 16 alcaldías; con la fila de total del
tabulado 2010, la suma por AGEB de hablantes y de población en hogares
indígenas de ese año, y con su cartografía de cierre, que cada AGEB y cada
manzana del tabulado tenga polígono; y con el tabulado del cuestionario
ampliado de 2010, la autoadscripción de ese año en la ciudad. Queda
pendiente el porcentaje de hogares con internet de la ENIGH 2024: sus
tabulados no lo publican, y la cifra de la ENDUTIH 2024 no es equivalente
porque cambia la encuesta, el universo y la pregunta.

### 9. Lo que no se puede saber con estas fuentes

La variante que habla cada persona; la lengua y la autoadscripción por AGEB
o manzana; la autoadscripción antes de 2000 y con la misma pregunta antes de
2010; los hablantes de 3 años y más antes de 2010; la población en hogares
indígenas antes de 2005; y el municipio de nacimiento, que ningún censo
publica. Cuando alguna de estas cosas aparece en el mapa lo hace como
inferencia rotulada, nunca como dato.

---

<h2 id="definiciones">Definiciones</h2>

### Quién es población indígena en este tablero

Las tres encuestas hacen dos preguntas distintas, y el tablero ofrece las dos
como **criterio de identificación** en el panel de cada gráfica:

- **Habla lengua indígena.** La persona declaró hablar alguna lengua indígena.
  Es la pregunta `HLENGUA` del Censo (personas de 3 años o más), `hablaind` de
  la ENIGH y `P6A_5` de la ENDUTIH 2025.
- **Se considera indígena.** La persona declaró considerarse indígena, hable o
  no una lengua. Es `PERTE_INDIGENA` del Censo, `etnia` de la ENIGH y `P6A_3`
  de la ENDUTIH. Delimita una población más amplia que la del criterio de
  lengua, y su tamaño varía entre fuentes y ediciones.

Las dos preguntas se responden por separado, así que cada persona cae en una
de cuatro combinaciones (habla y se considera, habla y no se considera, no
habla y se considera, ni una ni otra). Los archivos del tablero guardan esas
cuatro celdas y el navegador suma las que corresponden al criterio elegido: los
dos criterios comparten universo y ninguna persona se cuenta dos veces. El
**resto de la población** es siempre todo el que no cumple el criterio activo.

Quien no respondió alguna de las dos preguntas queda fuera del universo bajo
ambos criterios.

### Qué mide cada fuente

| Fuente | Unidad de la pregunta | Ediciones | Qué responde |
| --- | --- | --- | --- |
| Censo 2020, cuestionario ampliado | La **vivienda**: dispone de internet, celular, computadora, televisor, radio, televisión de paga, streaming, consola | 2020 | Qué proporción de personas vive con el bien o servicio |
| ENIGH | El **hogar**: conexión a internet, celular, computadora, teléfono fijo, televisión de paga, streaming (2024) | 2020, 2022, 2024 | Lo mismo, en tres ediciones y con decil de ingreso |
| ENDUTIH 2025 | La **persona**: usó internet, computadora o celular en los últimos tres meses, con qué, dónde y para qué; si escuchó la radio en la última semana; y el hogar | 2025 | Uso personal, no solo disponibilidad |

En las tres, el porcentaje que se publica es la fracción de **personas de 6
años o más** de cada grupo que cumple la condición. Se cuentan personas y no
viviendas u hogares porque la pregunta del tablero es cuánta población indígena
vive conectada, no cuántas viviendas lo están. El piso de 6 años es el universo
de la ENDUTIH; recortar las tres fuentes al mismo piso deja los denominadores
comparables.

### Los universos que no son toda la población

Varios indicadores de la ENDUTIH se calculan solo entre quienes ya usan algo, y
cada figura lo dice en su subtítulo:

- **Entre quienes usan internet:** usar internet todos los días, desde qué
  equipo y en qué lugar se conectan, y todas las actividades (estudiar,
  trabajar, trámites, dinero, comunicación, entretenimiento, riesgos).
- **Entre quienes usan celular:** si el celular es inteligente.
- **Entre quienes usan celular inteligente:** si se conectan con datos móviles o
  por wifi.
- **Entre quienes escucharon la radio** en la última semana: con qué dispositivo
  principal y en qué lugar. "Aparato de radio" agrupa estéreo o grabadora, radio
  del automóvil o del transporte y radio portátil; la otra figura agrupa celular,
  tableta y computadora.
- **Entre quienes no usan** internet, computadora o celular, no escucharon la
  radio, o cuyo hogar no tiene internet: el motivo declarado. Los motivos de un mismo bloque suman el
  total de cada grupo.

En la escolaridad el universo son las personas de **15 años o más**, porque
antes de esa edad la escolaridad está en curso.

### Las dimensiones de los filtros

- **Entidad.** Las tres fuentes son representativas por entidad. "Comparar
  entidades" ordena las 32 por la brecha; "Ver mapa" pinta el nivel de cada
  grupo y la brecha en puntos.
- **Sexo.** Como faceta o como recorte, en la comparación población indígena
  contra resto. La comparación mujeres indígenas contra hombres indígenas lo
  lleva ya en las series.
- **Localidad.** Cuatro tramos de tamaño de localidad (100 mil o más; 15 mil a
  99 999; 2 500 a 14 999; menos de 2 500). "Rural" es el último tramo, que es la
  definición del INEGI. El Censo publica cinco tramos y aquí se junta el de 15
  mil a 49 999 con el de 50 mil a 99 999.
- **Rango de edad.** 6 a 11, 12 a 17, 18 a 29, 30 a 44, 45 a 59 y 60 o más.
- **Decil de ingreso** (solo ENIGH). Decil del ingreso corriente trimestral
  per cápita del hogar, calculado sobre la distribución nacional ponderada de
  cada edición: es un ranking dentro del año, no un monto comparable entre
  ediciones.
- **Escolaridad** (15 años o más). Primaria o menos; secundaria; media
  superior; superior. Cada fuente traduce su propio catálogo: en el Censo el
  tramo se fijó cruzando cada código con los años de escolaridad acumulada.
- **Estrato socioeconómico** (ENIGH y ENDUTIH). Clasificación del INEGI de las
  viviendas en cuatro niveles (bajo, medio bajo, medio alto y alto) a partir de
  sus características físicas y su equipamiento; no es una medida de ingreso ni
  de pobreza. La ENIGH lo trae en `est_socio` y la ENDUTIH en `ESTRATO`, con los
  mismos códigos. Se comprobó que ordenan en el sentido esperado: en la ENIGH el
  ingreso corriente medio del hogar crece del estrato 1 al 4 en las tres
  ediciones, y en la ENDUTIH el hogar con internet pasa de 52 a 96 %. El Censo
  no lo publica.

Como máximo se despliegan dos dimensiones a la vez; una tercera reemplaza a la
más antigua. Decil, escolaridad y estrato viven cada uno en su archivo, sin tamaño
de localidad: son excluyentes entre sí y con el filtro de localidad.

### Muestra, error e intervalo

Toda cifra va expandida con el factor de la encuesta, pero la suficiencia se
juzga con los **casos sin expandir**: por debajo de 30 la cifra lleva asterisco
y trama, y el aviso junto a la gráfica dice cuántas hay.

El **intervalo de confianza** que aparece en el tooltip, la tabla y los bigotes
sale del diseño muestral real (estratificado por conglomerados), por
linearización de Taylor con varianza entre UPM dentro de estrato. No se usa la
fórmula binomial `sqrt(p(1-p)/n)`: supone muestreo aleatorio simple y
subestima el error de un diseño por conglomerados. Cuando el error no es
estimable (estratos con una sola UPM) la cifra viaja sin intervalo, nunca con
un cero. Al agregar celdas en el navegador (entidades, edades) las varianzas se
suman como si las partes fueran independientes, lo que subestima levemente el
error del agregado.

### El mapa por manzana de la Ciudad de México

Usa otra fuente y otra definición: los tabulados por AGEB y manzana de los
Censos 2010 y 2020, y la variable `PHOG_IND`, personas en hogares donde la
persona de referencia, su cónyuge o alguno de sus ascendientes hablan lengua
indígena. La definición no es la misma en las dos ediciones: el diccionario de
2010 cuenta los hogares donde el jefe o su cónyuge hablan la lengua, y el de
2020 añade a los ascendientes de ambos. Por eso el mapa avisa, al comparar
2010 con 2020 en esa población, que parte del cambio es de definición. Es un
indicador de hogar y de lengua, no de autoadscripción; el detalle está en
[Fuentes y cobertura](#fuentes).

### Cómo se lee el mapa

El mapa es uno solo y el panel decide qué se ve. En **Qué se pinta** se elige la
población (hablantes de lengua indígena, población en hogares indígenas,
personas que se consideran indígenas, o todas juntas), la lengua cuando la
población son los hablantes, y una característica con la que cruzar por AGEB o
manzana. En **Dónde y cuándo** se elige la unidad (alcaldía, AGEB o manzana), el
año, el sexo, el ámbito de pueblos originarios por manzana y, con un cruce
activo, la presencia mínima que recorta el mapa. Los controles que no aplican
se ocultan: por AGEB y manzana solo hay hablantes y hogares indígenas de 2020,
porque es lo único que el tabulado del Censo publica a ese nivel; la lengua, la
autoadscripción, la unión de poblaciones y la serie 2010-2025 existen solo por
alcaldía, porque salen de muestras representativas hasta ahí.

El panel de la derecha tiene dos pestañas. "Filtros" es el panel de controles y
los botones de vista; "Información" trae la definición de lo pintado, el detalle
de la unidad elegida con clic y, con una lengua, la tarjeta de variantes con
el glosario de certeza. Al pasar el cursor por una unidad aparece su cifra en
un globo; al hacer clic la unidad se fija en una tarjeta a la izquierda del
mapa, para compararla con otras, y se abre Información con su detalle: por
alcaldía, su serie por edición y sus variantes probables (que se resaltan en la
lista); por AGEB o manzana, todos sus indicadores de 2020; por entidad, las
lenguas y variantes de quienes nacieron ahí; por municipio, sus hablantes por
lengua y las variantes del catálogo. "Volver a los filtros" regresa. Caben cinco: la sexta sustituye a la más antigua, y cualquier cambio de
filtro o de vista borra la comparación, porque las cifras fijadas dejarían de
corresponder a lo que el mapa pinta.

Con una lengua elegida aparecen dos vistas más. "Ver de dónde vienen" pinta la
República por entidad de nacimiento de los hablantes, con una línea por entidad
y variante probable. "Ver el mapa de la lengua" pinta cada municipio del país con
la variante que el Catálogo del INALI ubica ahí: es el territorio histórico de la
lengua, no dónde vive hoy cada hablante. Como una lengua puede tener treinta
variantes, esa vista usa un color por variante y ningún esquema de tantos tonos
es seguro para daltonismo; por eso el nombre de la variante va siempre en el
globo de cada municipio y en la lista de la leyenda. Con "Todas las lenguas"
las dos vistas también funcionan: el mapa de la lengua pinta cada municipio
con la lengua indígena que más se habla en él según el Censo 2020 y el globo
lista las variantes que el Catálogo ubica ahí, y la vista de origen dibuja una
flecha por entidad y lengua, con las variantes probables en el globo. En la
ciudad, el globo de cada alcaldía lista las tres variantes probables con más
hablantes. Al elegir una lengua, la tarjeta de variantes trae el glosario de
los niveles de certeza (exacta, única, estimada, sin variante).

Los cortes de color de cada indicador por alcaldía son fijos a lo largo de los
años: se calculan sobre todas las alcaldías y ediciones de ese indicador, de
modo que un mismo tono significa lo mismo en 2010 y en 2025. Por AGEB y manzana
los cortes son cuantiles de las unidades con dato, como en la etapa anterior.
Con una lengua elegida aparece el botón "Ver de dónde vienen", que cambia el
mapa a la República: cada entidad se pinta por el número de hablantes de esa
lengua nacidos ahí que viven en la ciudad, y cada línea los une con la ciudad,
con el color de su variante probable.

### Cómo se leen los filtros de los mapas

El panel de los dos mapas separa lo que se pinta del lugar donde se pinta. En
**Qué se pinta** va primero el indicador de población indígena y después,
opcional, una característica con la que cruzarlo (conectividad de las viviendas,
migración, afiliación a servicios de salud y, por AGEB, marginación y rezago
social). En **Dónde** va la presencia indígena mínima, que recorta el mapa a las
manzanas o AGEB donde el indicador de población indígena alcanza 5, 10, 20 o 40
por ciento. Al elegir un cruce sin mínimo el panel propone 10 por ciento, porque
sin recorte el mapa pintaría esa característica en toda la ciudad y dejaría de
hablar de población indígena; el lector puede quitarlo.

Es un cruce entre territorios y no entre personas. El tabulado dice cuántas
viviendas de una manzana tienen internet y cuánta de su población vive en hogares
indígenas, pero no qué vivienda es de quién, de modo que el mapa describe las
manzanas con presencia indígena y no los hogares indígenas. El cruce entre
personas sale de los microdatos y está en las páginas del Censo, la ENIGH y la
ENDUTIH, a nivel nacional y por entidad.

### El mapa por AGEB y sus clasificaciones

La **AGEB** (Área Geoestadística Básica) es el conjunto de manzanas, entre una y
cincuenta en zona urbana, con el que el INEGI organiza el levantamiento y la
publicación del Censo. Es más gruesa que la manzana y más fina que la colonia o
la alcaldía, y es la unidad en la que CONAPO y CONEVAL publican sus
clasificaciones, por lo que es la única donde se pueden leer juntas la presencia
indígena, la conectividad y la marginación.

El **grado de marginación urbana** (CONAPO, 2020) ordena las AGEB en cinco
grados, de muy bajo a muy alto, a partir de carencias de educación, salud,
vivienda y bienes. El **grado de rezago social** (CONEVAL, 2020) usa los mismos
cinco nombres con indicadores y cortes distintos. Ninguno de los dos mide
pobreza, porque ninguno incorpora ingreso.

Los indicadores de **vivienda** (internet, computadora, celular, radio,
televisión de paga, streaming, sin ninguna tecnología) tienen como denominador
las viviendas particulares habitadas con características captadas
(`VIVPARH_CV`), no el total de viviendas. El **umbral de presencia indígena** es
el porcentaje mínimo de población en hogares censales indígenas a partir del
cual una AGEB entra al grupo que se compara; es un corte de exploración que
elige el lector y no una clasificación oficial. La justificación de cada
decisión está en [Fuentes y cobertura](#fuentes).

### Cómo se leen los colores

Cada color significa lo mismo en todas las páginas y con cualquier filtro. El
rojo y el azul se usan solo cuando se compara a la población indígena con el
resto de la población; el ámbar y el azul, cuando se compara a mujeres con
hombres. Una sola serie, sin comparación, va en morado, y lo que se destaca
dentro de ella, como la Ciudad de México en una lista de entidades, va en rojo.
Las magnitudes de los mapas y de los mapas de calor usan una sola rampa morada,
del claro al oscuro, con la escala fija para que un mismo tono signifique lo
mismo en todos los años. Las categorías que tienen un orden, como los grupos de
edad, los grados de marginación, el riesgo de una lengua o la certeza de una
variante, usan pasos de esa misma rampa, y el gris marca las referencias, como
el promedio de la ciudad o la edición anterior.

Por la misma razón, los ejes de cada gráfica están fijos: al cambiar un filtro
cambia el largo de la barra o la altura de la línea, pero no la escala, y una
vista se puede comparar con otra sin leer de nuevo los números del eje.

---

<h2 id="fuentes">Fuentes y cobertura</h2>

### Las tres encuestas del análisis de acceso digital

Las páginas de acceso digital usan tres fuentes del INEGI, cada una con su
propia unidad y su propio alcance. No se mezclan entre sí: cada página lleva
una sola encuesta y lo dice en su cabecera.

**Censo de Población y Vivienda 2020, cuestionario ampliado.** Muestra de
alrededor de 4 millones de viviendas y 15 millones de personas, representativa
por entidad y municipio. Pregunta a la vivienda si dispone de internet,
celular, computadora, televisor, radio, televisión de paga, servicio de
películas por internet y consola de videojuegos; y a cada persona de 3 años o
más si habla lengua indígena y si se considera indígena. Aquí se cuentan las
personas de 6 años o más en viviendas particulares. La cifra nacional de
viviendas con internet que da la muestra difiere ligeramente de la del
cuestionario básico por el diseño de la muestra; el cotejo está en
`src/data/verificaciones.csv`.

**ENIGH 2020, 2022 y 2024.** Representativa por entidad. La tabla de hogares
pregunta si el hogar tiene conexión a internet, celular, línea telefónica fija,
televisión de paga y cuántas computadoras (desde 2024, escritorio y portátil por
separado, que aquí se juntan); la de población, si cada persona habla lengua
indígena y si se considera indígena. Es la única fuente con serie en el tiempo
y con decil de ingreso del hogar, calculado sobre el ingreso corriente per
cápita de cada edición. Las ediciones 2016 y 2018 no se usan: su tabla de
población no está disponible en el mismo formato y meterlas partiría la serie.

**ENDUTIH 2025.** Representativa por entidad y por tamaño de localidad. Es la
única de las tres que mide **uso personal** (esta persona usó internet en los
últimos tres meses, desde qué equipo, en qué lugar y para qué) y no solo la
disponibilidad en el hogar. Hasta 2024 la encuesta no preguntaba por lengua
indígena ni autoadscripción; el módulo 6.A de 2025 incorpora ambas, así que no
hay serie histórica con este corte. Se verificó contra los propios microdatos
qué pregunta es cuál: la variable que encabeza el módulo (P6A_1) no es la de
lengua indígena sino la de afrodescendencia; la de lengua es P6A_5 y la de
autoadscripción, P6A_3. La comprobación se hizo por el peso de cada respuesta,
su distribución por entidad y el cruce entre las tres variables.

En las tres fuentes el porcentaje es de **personas de 6 años o más**, y en las
tres la población indígena se define con el criterio que el lector elige en el
panel: lengua o autoadscripción. Las definiciones están en
[Definiciones](#definiciones); las cifras nacionales calculadas se cotejan con
las oficiales en `src/data/verificaciones.csv`.

### De dónde sale el mapa por manzana

El mapa por AGEB y por manzana tiene dos ediciones. La de 2020 se describe a
continuación; la de 2010 sigue la misma estructura con el tabulado
**Principales resultados por AGEB y manzana urbana** del Censo 2010 y la
**Cartografía geoestadística urbana, cierre del Censo 2010**, que el INEGI
publica en un archivo por delegación con las 33 localidades urbanas de la
ciudad. Las 2 432 AGEB y las 63 239 manzanas del tabulado de 2010 encuentran
su polígono; la suma por AGEB recupera el 98 por ciento de los hablantes y
de la población en hogares indígenas de la fila de total (lo demás está
suprimido por confidencialidad). En 2010 no se cargaron las clasificaciones
de CONAPO y CONEVAL ni las viviendas con características, así que esa
edición no ofrece cruces, y los cortes de color de cada indicador se
calculan sobre las dos ediciones para que el tono sea comparable.

El mapa por manzana se construye con **Principales resultados por AGEB y manzana
urbana** del Censo de Población y Vivienda 2020 (INEGI), tabulado que publica
alrededor de 230 variables para cada manzana urbana del país. Para la Ciudad de
México son 66,456 manzanas. La geometría viene del **Marco Geoestadístico 2020**,
en su corte censal, y ambas fuentes se unen por la clave geoestadística CVEGEO de
dieciséis dígitos, que concatena entidad, municipio, localidad, AGEB y manzana.

De ese cruce quedan **66,449 manzanas** con dato y geometría. Se pierden 340
manzanas rurales, que la cartografía dibuja pero el tabulado no cubre —solo
publica manzanas urbanas—, y siete filas del tabulado sin polígono
correspondiente. En conjunto reúnen 9,145,155 habitantes, es decir el 99.3 % de
la población de la Ciudad de México en 2020.

Los límites de colonia son las **1,837 unidades territoriales del Instituto
Electoral de la Ciudad de México (2022)**, elegidas porque cubren casi toda la
mancha urbana: solo 63 manzanas quedan fuera de ellas. El catálogo de colonias
del Gobierno de la Ciudad de México se descartó como capa de agregación porque
deja fuera 1,273 manzanas donde viven 16,613 personas en hogares indígenas: el
6.1 % del total de la ciudad, concentrado justamente en la periferia.

Los pueblos originarios se identifican con el **padrón de la Secretaría de
Pueblos y Barrios Originarios y Comunidades Indígenas Residentes (SEPI)**, que
reconoce **50 pueblos** y publica la clave de unidad territorial de cada uno —la
misma del IECM—, de modo que el cruce es exacto y no depende de comparar
geometrías. Los 50 son de etnia náhuatl y se distribuyen en siete alcaldías:
Xochimilco (14), Milpa Alta (11), Tlalpan (8), Tláhuac (7), Cuajimalpa (4), La
Magdalena Contreras (4) y Álvaro Obregón (2).

Una versión anterior de este tablero derivaba esa marca del campo `clasif` del
catálogo de colonias, señalando toda unidad con más del 30 % de su área dentro
de alguno de sus 281 polígonos de "Pueblos y Barrios Originarios". Ese método
marcaba 260 unidades —224 de más y 14 de menos frente al padrón oficial— y
convertía cualquier cifra "en pueblos originarios" en el promedio de un universo
cinco veces mayor que el reconocido. Con el padrón, la proporción de población en
hogares indígenas en los pueblos originarios pasa de 3.73 % a **4.59 %**: el
contraste con el resto de la ciudad, 2.86 %, resulta más nítido de lo que
aparentaba, no menos.

### Qué mide "población en hogares censales indígenas"

Es la definición de INEGI para la variable `PHOG_IND`: personas que forman
hogares censales donde **la persona de referencia del hogar, su cónyuge o alguno
de los ascendientes de estos declararon hablar lengua indígena**. El criterio es
de lengua y se aplica a posiciones específicas dentro del hogar. Un hogar cuyos
integrantes se reconocen indígenas pero ya no hablan la lengua no entra; uno
donde solo el hijo la habla, tampoco.

Bajo ese criterio, 289,139 de los 9,209,944 habitantes de la Ciudad de México,
el 3.14 %, viven en hogares censales indígenas. Esa es la cifra oficial y sale de
la fila de total de la entidad del mismo tabulado. La suma de las manzanas
publicadas da 273,851 de 9,145,155 habitantes (2.99 %), porque deja fuera lo
suprimido por confidencialidad y lo que no es manzana urbana; por eso la portada
cita la primera y no la segunda. Es una cifra menor al 8 o 9 % que suele citarse para
la ciudad, y la diferencia no es un error de ninguna de las dos: ese otro dato
proviene de la **autoadscripción**, una pregunta distinta y más amplia, levantada
en el cuestionario ampliado del mismo Censo. La autoadscripción no puede
mapearse por manzana porque el cuestionario ampliado es una muestra, diseñada
para dar estimaciones estatales y municipales, no de manzana. Publicarla a ese
nivel produciría cifras sin significado estadístico.

Quien busque la medida amplia de población indígena en la ciudad debe usar la
autoadscripción; quien busque su distribución territorial fina no tiene más
opción que este indicador. Son dos preguntas y dos usos.

### Qué se puede desagregar y qué no

El mapa ofrece un filtro de **sexo** porque RESAGEBURB publica las variantes
femenina y masculina de los indicadores de lengua y de migración. No las publica para la población en hogares censales indígenas: ese
indicador cuenta hogares completos, donde conviven ambos sexos, y no admite ese
desglose. Por eso el filtro desaparece al elegirlo, en vez de ofrecer una opción
que devolvería celdas vacías.

Cuando el filtro está activo, el denominador cambia con él: una tasa femenina se
calcula sobre las mujeres de la manzana y no sobre su población total. De otro
modo "12 % de mujeres hablantes" significaría doce de cada cien personas y no
doce de cada cien mujeres.

Conviene saber que **las cifras por sexo no suman el total**. En la Ciudad de
México, la suma de hablantes mujeres y hombres da 80,367 frente a 98,631 del
total: faltan 18,264, el 18.5 %. No es un error de cálculo sino un efecto de la
supresión por confidencialidad —7,640 manzanas publican el total pero ocultan
uno o ambos sexos, porque al partir la cifra en dos, más celdas caen bajo el
umbral—. Las tasas por sexo se calculan, entonces, sobre menos manzanas que las
del total.

**No hay filtro de edad**, y no por omisión: se revisaron las 230 columnas del
tabulado y no existe ningún cruce de edad con lengua indígena a nivel manzana.
Los rangos de edad que RESAGEBURB sí publica (P_0A2, P_6A11, P_15A17…) son de
población total y responden a otra pregunta. El único corte de edad que llevan
estos indicadores es el suyo propio: los de lengua se refieren a personas de 3
años y más, y el de migración reciente a personas de 5 años y más.

### Las variables de contexto

Además de los indicadores de población indígena, el mapa permite pintar dos
variables de **migración**: población nacida en otra entidad y población que en
marzo de 2015 residía en otra entidad. No miden población indígena y por eso
aparecen en un grupo aparte del selector.

Están ahí porque el propio mapa plantea la pregunta: las colonias con mayor
proporción de población en hogares indígenas no son los pueblos originarios, lo
que sugiere que buena parte de esa población llegó a la ciudad y no desciende de
los pueblos que la ciudad absorbió. Estas dos variables permiten contrastar esa
hipótesis territorialmente, aunque no la demuestran: que dos fenómenos coincidan
en una manzana no prueba que se trate de las mismas personas.

### Valores suprimidos

INEGI suprime por confidencialidad los valores de manzanas con muy poca
población, y los publica con asterisco. En la Ciudad de México son **5,452
manzanas** sin cifra de población en hogares indígenas. El mapa las pinta de gris
y las declara así en la leyenda, en lugar de contarlas como cero: la ausencia del
dato no es la ausencia del fenómeno, y tratarla como cero sesgaría el mapa hacia
abajo justo en las manzanas más pequeñas.

### El reparto de manzanas entre colonias

Los límites de colonia no siguen los de la cartografía censal, así que **5,925
manzanas —el 8.9 %— caen en más de una colonia**. A cada una se le reparte la
población en proporción al área que queda dentro de cada colonia: si el 30 % de
la superficie de una manzana cae en cierta colonia, esa colonia recibe el 30 % de
sus habitantes.

El supuesto es que la población se distribuye de manera uniforme dentro de la
manzana, y no siempre es cierto: una manzana mitad parque y mitad vivienda
aporta a la colonia del parque una población que en realidad no vive ahí. Es la
mejor aproximación disponible, porque el tabulado publica una sola cifra por
manzana completa y no hay forma de saber cómo se reparte dentro de ella. Las
intersecciones menores al 0.1 % del área de la manzana se descartan por ser
artefactos del desajuste entre las dos cartografías.

El resultado cuadra: la suma de población por colonia difiere de la suma por
manzana en 1,382 personas sobre 9.1 millones, un 0.015 %, atribuible al redondeo
a enteros de 1,837 colonias.

### La serie 1990-2025 por alcaldía

El mapa por alcaldía y la serie del sitio se arman con una fuente distinta por
edición, porque ningún producto del INEGI cubre solo los 35 años con la misma
unidad y la misma pregunta. Para 2010 y 2020 se usan los Principales resultados
por localidad (ITER) de la Ciudad de México, que son conteo censal completo: las
filas de total de la entidad y de cada demarcación traen hablantes de lengua
indígena de 3 y de 5 años y más, monolingües y población en hogares indígenas,
sin error muestral. Para 2015 se usan los microdatos de la Encuesta Intercensal
y para la autoadscripción de 2020, los del cuestionario ampliado del Censo; las
dos son muestras, así que sus cifras llevan error de diseño, calculado por
linearización de Taylor con la varianza entre unidades primarias dentro de
estrato, y la figura lo muestra como un intervalo de más o menos 1.96 errores.
Para 2025 se usa el conjunto de datos abiertos 105 de la Encuesta Intercensal
2025, que publica el porcentaje de cada indicador con su error estándar para la
entidad, las 16 alcaldías y las localidades de 50 mil habitantes y más.

Se comprobó que las muestras reproducen las cifras publicadas antes de usarlas:
la EIC 2015 da 129 355 hablantes y 784 605 personas que se consideran
indígenas, que son las tablas del documento de la Secretaría de Cultura, y el
ampliado de 2020 da 825 348 autoadscritos, la cifra de la SEPI. Los hablantes
del ampliado 2020 (142 201) no coinciden con los 125 153 del cuestionario
básico porque la muestra estima y el básico cuenta; por esto los hablantes de
2020 salen del ITER y la muestra se reserva para lo que solo ella pregunta.

Tres cambios de definición cruzan la serie y se marcan en las figuras. El
universo de hablantes fue de 5 años y más hasta 2005 y de 3 años y más desde
2010; el ITER de 2010 y 2020 publica los dos, y la serie larga va en 5 años y
más en las ocho ediciones; los valores de 2015 y 2025 salen de los
microdatos de las intercensales, porque sus tabulados empiezan en 3 años. La población en hogares indígenas contaba en 2010 a quienes vivían con
una jefa o jefe o cónyuge hablante, y desde 2020 incluye también a los
ascendientes, de modo que 271 463 y 289 139 no son estrictamente comparables.
La autoadscripción no existe en 1990, 1995 ni 2005; en 2000 la pregunta era
otra ("¿es náhuatl, maya, zapoteco, mixteco o de otro grupo indígena?") y desde
2010 es "de acuerdo con su cultura, ¿se considera indígena?". En 2025 la cifra
de la ciudad baja de 9.0 a 6.8 por ciento; no se determinó todavía si cambió la
redacción, y la figura lo dice.

Las ediciones de 1990, 1995, 2000 y 2005 salen de los ITER nacionales, filas
de total de la entidad y de cada delegación. Los totales de 1995, 2000 y
2005 (100 890, 141 710 y 118 424 hablantes de 5 años y más) coinciden con la
serie que publica la SEPI. El de 1990 no: ese ITER no publica el total de
hablantes, solo a quienes hablan español y a quienes no, y la suma (107 647)
deja fuera a 3 905 personas que no especificaron si hablan español; tampoco
publica la población de 5 años y más, que se estimó con la proporción de la
muestra del 10 % de ese censo en cada delegación. Las figuras de 1990 lo
dicen. La autoadscripción de 2000 sale del cuestionario ampliado con su
pregunta de pertenencia (68 426 personas de 5 años y más), y la de 2010 del
ampliado de ese censo (438 855, el 5.0 por ciento): esta última queda por
cotejar con el tabulado oficial de la muestra antes de leerla como caída
frente al 8.8 por ciento de 2015.

### Qué lengua se habla y de dónde vienen quienes la hablan

La lengua concreta solo la registran las muestras: desde 2010 con la clave de
agrupación lingüística del Catálogo INALI 2008 (72 códigos: las 68
agrupaciones, otras lenguas indígenas de América, no especificado y tres
códigos para chontal, tepehuano y popoluca insuficientemente especificados), y
en 1990, 2000 y 2005 con el clasificador histórico del INEGI, que distingue
más lenguas (doce chinantecos, siete zapotecos) y usa otros números. La
equivalencia entre los dos se midió en la muestra de 2010, donde cada
persona trae las dos claves, y está en `catalogo_lenguas_historico.csv`; hay
que tenerla porque el código 0211 existe en ambos con significado distinto
(chinanteco en el histórico, náhuatl en el INALI). Por esto la lengua se
ofrece solo por alcaldía: ni el ITER ni el tabulado por AGEB y manzana dicen
cuál lengua se habla. En 1990 y 2005 la muestra es autoponderada (una de cada
diez viviendas, sin factor ni diseño publicado) y el error queda vacío. Los hablantes de cada lengua se calculan sobre la población de 3 años y
más con las mismas muestras y el mismo error de diseño; la EIC 2015 registra 43
claves en la ciudad y el ampliado 2020, 38. Las seis lenguas mayores de 2015
(náhuatl 38 549, mixteco 15 920, otomí 13 764, mazateco 11 076, zapoteco
10 593 y mazahua 8 321) reproducen exactamente la tabla 1 del documento de la
Secretaría de Cultura, que es la comprobación de que la clave está bien leída.
Para 2020 el náhuatl da 38 338 en la muestra contra 39 475 en la tabla de la
SEPI, que usa el cuestionario básico: es diferencia de diseño y se deja como
referencia, no como fallo.

El origen se toma de dos preguntas de las mismas muestras: la entidad de
nacimiento, para todos, y la entidad y municipio de residencia cinco años
antes, para quienes llegaron en ese lapso. La vista "De dónde vienen" del mapa
usa la entidad de nacimiento: cada línea une la entidad con la ciudad y su
grosor es el número de hablantes de esa lengua nacidos ahí. En 2020 el 82 por
ciento de los hablantes de la ciudad nació en otra entidad o en otro país; la
SEPI publica 84.3 y 0.5 por ciento con el básico.

### Las variantes: lo que el catálogo dice y lo que el censo no pregunta

Ningún censo ni encuesta del INEGI pregunta qué variante de la lengua habla la
persona: la clave llega hasta la agrupación. Las variantes existen en el
Catálogo de las Lenguas Indígenas Nacionales del INALI, publicado en el Diario
Oficial el 14 de enero de 2008, que reconoce 11 familias, 68 agrupaciones y 364
variantes, cada una con su autodenominación y con las entidades, municipios y
localidades donde se habla. El catálogo se tomó de las páginas oficiales del
INALI (una por agrupación y una por sus variantes) y se guardó en
`clin_variantes.csv` con 364 filas; el script que lo genera aborta si el conteo
por familia o por agrupación no cuadra con el publicado.

El INALI es la única institución que ha estimado hablantes por variante, y
lo hizo cruzando los hablantes del Censo 2000 por localidad con la referencia
geoestadística de cada variante; su pie de cuadro marca con asterisco las
variantes que comparten localidades, "por lo que existe una sobreestimación".
Aquí se aplicó ese mismo cruce, a nivel municipio, al lugar de origen de los
hablantes que viven en la ciudad, en tres niveles de certeza que el mapa
rotula. La asignación es **exacta** cuando se conoce el municipio donde la
persona vivía cinco años antes y el catálogo ubica ahí una sola variante de
su lengua; **única** cuando solo se conoce la entidad de nacimiento y en ella
hay una sola variante; y **estimada** cuando la entidad tiene varias, caso en
que los hablantes nacidos ahí se reparten entre ellas en proporción a los
hablantes de esa lengua que el cuestionario ampliado del Censo 2020 registra
en los municipios de cada variante. Quienes nacieron en la ciudad, en otro
país o en una entidad sin registro de la lengua quedan **sin variante**. Lo
asignado por municipio se descuenta de la entidad antes de repartir el
resto, y una guardia comprueba que la suma de las asignaciones iguale al
total de hablantes con origen conocido. En 2025, de 125 790 hablantes, 5 464
tienen variante exacta, 11 896 única, 83 035 estimada y 25 395 ninguna.

Para casar el catálogo con el marco geoestadístico se buscaron sus 1 196
referencias de entidad y municipio por nombre; 61 no casaron (cambios de
nombre y localidades listadas como municipio) y quedan fuera del cruce, lo
que se anota en el archivo de cifras calculadas. Como contraste externo se
comparó el orden de las variantes de cada lengua, con los pesos de 2020 por
municipio, contra los cuadros del INALI de 2000 por localidad: en 27 de las
35 lenguas con varias variantes la variante mayor es la misma y las cinco
mayores coinciden en un 94 por ciento en promedio, lo que confirma que el
cruce por municipio ordena las variantes como el cruce oficial por localidad.

Es una inferencia sobre el lugar de origen y no un dato de la persona:
alguien pudo nacer en una entidad y hablar la variante de otra, y quien
nació en la ciudad no recibe variante alguna. El mapa lo rotula así en cada
vista. Cada variante lleva un tono fijo en las tres vistas (lista, flechas y
mapa de la lengua); por entidad se dibujan hasta cinco flechas con color y
una gris con las variantes menores sumadas. Con tantos tonos la paleta no es
segura para daltonismo, así que el nombre acompaña siempre al color.

### Todas las poblaciones indígenas: la unión sin doble conteo

La opción "Todas las poblaciones indígenas" cuenta a las personas que hablan
una lengua indígena o se consideran indígenas, una sola vez cada una. Solo se
puede calcular en los microdatos, donde las dos respuestas están en el mismo
registro: en 2015 son 835 437 personas (784 605 autoadscritas más 50 832 que
hablan una lengua sin considerarse indígenas) y en 2020, 852 286. Sumar las
dos cifras publicadas contaría dos veces a las 78 523 personas de 2015 y a las
115 263 de 2020 que cumplen ambas. Como la unión usa los hablantes de la
muestra, su cifra de hablantes no coincide con la del cuestionario básico.

### Los indicadores de vivienda y su denominador

El mismo tabulado publica, para cada manzana y cada AGEB, cuántas viviendas
disponen de internet, computadora, teléfono celular, radio, televisión de paga y
servicio de películas o música por internet, y cuántas no tienen ninguna de esas
tecnologías (`VPH_INTER`, `VPH_PC`, `VPH_CEL`, `VPH_RADIO`, `VPH_STVP`,
`VPH_SPMVPI` y `VPH_SINTIC`). Se incorporaron al mapa junto con la población sin
afiliación a servicios de salud (`PSINDER`) y el grado promedio de escolaridad
(`GRAPROES`), para poder describir las condiciones de las manzanas donde vive la
población en hogares indígenas.

El tabulado ofrece dos totales de vivienda y no dice cuál corresponde a estos
indicadores: `TVIVPARHAB`, el total de viviendas particulares habitadas, y
`VIVPARH_CV`, las viviendas particulares habitadas de las que se captaron
características. Para decidirlo se cotejó cada total contra el que CONEVAL
publica en su base de rezago social por AGEB, que parte del mismo Censo. Con
`VIVPARH_CV` el total coincide en 2,397 de las 2,410 AGEB de la ciudad (99.5 %);
con `TVIVPARHAB`, solo en 1,016 (42 %). Por esto todos los porcentajes de vivienda
se calculan sobre `VIVPARH_CV`: dividir entre el total de viviendas contaría como
"sin internet" a viviendas de las que no se sabe nada.

Con ese denominador, el porcentaje de viviendas sin internet difiere del de
CONEVAL en medio punto o menos en el 97.6 % de las AGEB. Las 14 AGEB que difieren
más de dos puntos están todas en Miguel Hidalgo y son de alta no respuesta:
CONEVAL excluye las viviendas que no contestaron la pregunta y el tabulado no
permite separarlas. Es una limitación del dato publicado y no del cálculo, y
afecta a menos del 1 % de las unidades. Para la ciudad completa, la suma por
AGEB da 76.0 % de viviendas con internet y la fila de total del tabulado, 75.7 %.

### El cruce entre presencia indígena y conectividad

Las secciones de cruce agrupan las manzanas, o las AGEB, en seis bandas según la
proporción de su población que vive en hogares censales indígenas: sin población
en hogares indígenas, más de 0 y hasta 5 %, de 5 a 10, de 10 a 20, de 20 a 40 y
más de 40 %. Dentro de cada banda se suman el numerador y el denominador del
indicador y después se divide, de modo que una manzana de dos mil habitantes
pesa más que una de veinte; en ningún caso se promedian porcentajes. El grado
promedio de escolaridad, que ya es un promedio, se pondera por la población de
15 años o más de cada unidad.

Es importante destacar que se trata de un cruce entre territorios y no entre
hogares. El tabulado dice cuántas viviendas de una manzana tienen internet y
cuánta de su población vive en hogares indígenas, pero no qué vivienda es de
quién. Lo que la figura permite afirmar es cómo son las manzanas con más o menos
presencia indígena, no cómo son los hogares indígenas; esa segunda pregunta se
responde con los microdatos, en las páginas del Censo, la ENIGH y la ENDUTIH.

Las bandas no tienen el mismo tamaño. Por manzana, la banda de más de 40 % reúne
156 manzanas y 10,153 habitantes, frente a 33,999 manzanas sin población en
hogares indígenas. Por AGEB la misma banda se reduce a 4 unidades con 273
habitantes en total, por lo que la figura marca con asterisco toda banda con
menos de 30 unidades: su cifra se mueve mucho con un solo caso y sirve
únicamente como orden de magnitud.

### De dónde sale el mapa por AGEB

La AGEB (Área Geoestadística Básica) es la unidad con la que el INEGI agrupa
manzanas, entre una y cincuenta en zona urbana, para levantar y publicar el
Censo. El tabulado por AGEB y manzana incluye una fila de total por AGEB, que es
la que se usa: no se suman manzanas, porque la suma perdería las cifras que el
INEGI suprime a nivel manzana y sí publica a nivel AGEB. La Ciudad de México
tiene 2,431 AGEB urbanas con polígono, 9,138,524 habitantes en conjunto, y 2,379
publican la cifra de población en hogares indígenas.

A cada AGEB se le unen, por su clave de trece dígitos, dos clasificaciones
externas: el grado de marginación urbana de CONAPO, publicado para 2,381 AGEB de
la ciudad, y el grado de rezago social de CONEVAL, publicado para 2,410. La unión
se verificó comparando la población total de cada AGEB en las tres fuentes: es
idéntica en todas las AGEB que comparten, lo que confirma que las claves casan y
que las tres parten del mismo levantamiento. Las AGEB sin grado son las de muy
poca población, que ninguna de las dos instituciones clasifica, y el mapa las
pinta como "sin dato".

El servidor de CONAPO no respondió durante la construcción, así que el índice
de marginación se descargó de la copia que la propia institución mantiene en
datos.gob.mx. Es el mismo archivo oficial y no un espejo de terceros.

### Marginación y rezago social: qué existe para 2020 y qué no

Se buscó una medición de pobreza por AGEB actualizada a 2020 y se confirmó que
no existe. CONEVAL publicó rangos de pobreza urbana por AGEB con información de
2015, y para 2020 la desagregación más fina de la pobreza es la localidad
urbana. Lo que sí existe para 2020 a nivel AGEB son las dos clasificaciones que
usa el mapa, y ninguna es una medición de pobreza: el índice de marginación
urbana resume carencias de educación, salud, vivienda y bienes, y el grado de
rezago social resume indicadores de educación, salud, servicios y activos del
hogar. Ninguno incorpora ingreso, seguridad social ni alimentación.

Por lo anterior, el tablero habla de marginación y de rezago social y no de
pobreza. Las dos clasificaciones no son intercambiables: en la ciudad, CONAPO
ubica 116 AGEB en grado alto o muy alto y CONEVAL, 28, porque parten de
indicadores y de cortes distintos. La sección ofrece ambas con un selector en
lugar de combinarlas en un índice propio.

### El umbral de presencia indígena

No existe un criterio oficial para llamar indígena a una AGEB urbana. El más
cercano es el que el INPI usa en las reglas de operación de sus programas para
identificar localidades indígenas: al menos 40 % de población indígena (sección
3.2.1 de las reglas del Programa de Infraestructura Indígena 2020, publicadas en
el Diario Oficial de la Federación). Ese criterio se definió para localidades y
va acompañado de condiciones de marginación y de tamaño.

Aplicado a las AGEB de la ciudad, el corte de 40 % deja 4 AGEB con 273
habitantes; el de 20 %, 11 AGEB con 7,972; el de 10 %, 95 AGEB con 272,619, y
el de 5 %, 358 AGEB con 1,466,976. Por esto la página ofrece los cuatro cortes
como selector y abre en 10 %: el de 40 % se conserva como referencia normativa,
pero no describe una ciudad donde la población en hogares indígenas vive
dispersa y en ninguna zona amplia es mayoría. El umbral es una herramienta de
exploración y no una clasificación oficial de las AGEB.

### Cómo se publica el mapa

Las 66,449 manzanas pesan 150 MB en GeoJSON con todos sus indicadores, demasiado
para que un navegador las cargue de una vez. Se convierten a teselas vectoriales
con tippecanoe y se publican como un único archivo **PMTiles** de 59.1 MB (las
AGEB, en otro de 4.0 MB), del que el navegador lee
solo los fragmentos que la vista necesita, mediante peticiones de rango HTTP. Eso
permite servir el mapa como archivo estático, sin servidor de teselas y sin
cuenta en ningún proveedor.

Los indicadores viajan como atributos de cada manzana, de modo que cambiar de
indicador o de filtro repinta el mapa en el navegador sin volver a descargar
nada.

### Antecedente

Este mapa replica y extiende el publicado por el INIDE de la Universidad
Iberoamericana en `estudianteshlicdmxinide.webflow.io/mapa`. Se verificó que
parte del mismo dato: al reproducir su cruce se obtienen exactamente sus cifras
—66,449 manzanas, 9,145,155 habitantes, 273,851 personas en hogares indígenas—.

Las diferencias son de construcción. Aquel mapa publica una capa por indicador y
muestra una a la vez, con los cortes de color fijados en el código; sus datos no
conservan la clave CVEGEO, de modo que no pueden cruzarse con otra fuente. Aquí
hay una sola capa con todos los indicadores como atributos, los cortes se
calculan sobre los datos de cada indicador, y cada manzana conserva su clave, su
colonia y su marca de pueblo originario, lo que permite filtrar y agregar sin
regenerar las teselas.

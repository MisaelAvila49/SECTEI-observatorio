---
title: Fuentes y cobertura
---

# Fuentes y cobertura

## Las tres encuestas del análisis de acceso digital

Las páginas de acceso digital usan tres fuentes del INEGI, cada una con su
propia unidad y su propio alcance. No se mezclan entre sí: cada página lleva
una sola encuesta y lo dice en su cabecera.

**Censo de Población y Vivienda 2020, cuestionario ampliado.** Muestra de
alrededor de 4 millones de viviendas y 15 millones de personas, representativa
por entidad y municipio. Pregunta a la vivienda si dispone de internet,
celular, computadora, televisor, radio, televisión de paga, servicio de
películas por internet y consola de videojuegos; y a cada persona de 3 años o
más si habla lengua indígena y si se considera indígena. Aquí se cuentan las
personas de 6 años o más en viviendas particulares (13.3 millones de registros
en la muestra). La cifra nacional de viviendas con internet que da la muestra
(53.9 %) difiere de la del cuestionario básico (52.1 %) por el diseño de la
muestra; la diferencia se declara en cada figura.

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
lengua indígena sino la de afrodescendencia; la de lengua es P6A_5 (6.3 % de la
población de 6 años o más, concentrada en Oaxaca, Yucatán y Chiapas, con 92 %
de autoadscripción entre quienes la declaran) y la de autoadscripción, P6A_3.

En las tres fuentes el porcentaje es de **personas de 6 años o más**, y en las
tres la población indígena se define con el criterio que el lector elige en el
panel: lengua o autoadscripción. Las definiciones están en
[Definiciones](./definiciones); las cifras nacionales calculadas se cotejan con
las oficiales en `src/data/verificaciones.csv`.

## De dónde sale el mapa por manzana

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

## Qué mide "población en hogares censales indígenas"

Es la definición de INEGI para la variable `PHOG_IND`: personas que forman
hogares censales donde **la persona de referencia del hogar, su cónyuge o alguno
de los ascendientes de estos declararon hablar lengua indígena**. El criterio es
de lengua y se aplica a posiciones específicas dentro del hogar. Un hogar cuyos
integrantes se reconocen indígenas pero ya no hablan la lengua no entra; uno
donde solo el hijo la habla, tampoco.

Bajo ese criterio, 273,851 personas de la Ciudad de México —el 2.99 %— viven en
hogares censales indígenas. Es una cifra menor al 8 o 9 % que suele citarse para
la ciudad, y la diferencia no es un error de ninguna de las dos: ese otro dato
proviene de la **autoadscripción**, una pregunta distinta y más amplia, levantada
en el cuestionario ampliado del mismo Censo. La autoadscripción no puede
mapearse por manzana porque el cuestionario ampliado es una muestra, diseñada
para dar estimaciones estatales y municipales, no de manzana. Publicarla a ese
nivel produciría cifras sin significado estadístico.

Quien busque la medida amplia de población indígena en la ciudad debe usar la
autoadscripción; quien busque su distribución territorial fina no tiene más
opción que este indicador. Son dos preguntas y dos usos.

## Qué se puede desagregar y qué no

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

## Las variables de contexto

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

## Valores suprimidos

INEGI suprime por confidencialidad los valores de manzanas con muy poca
población, y los publica con asterisco. En la Ciudad de México son **5,452
manzanas** sin cifra de población en hogares indígenas. El mapa las pinta de gris
y las declara así en la leyenda, en lugar de contarlas como cero: la ausencia del
dato no es la ausencia del fenómeno, y tratarla como cero sesgaría el mapa hacia
abajo justo en las manzanas más pequeñas.

## El reparto de manzanas entre colonias

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

## Cómo se publica el mapa

Las 66,449 manzanas pesan 94.5 MB en GeoJSON, demasiado para que un navegador las
cargue de una vez. Se convierten a teselas vectoriales con tippecanoe y se
publican como un único archivo **PMTiles** de 21.6 MB, del que el navegador lee
solo los fragmentos que la vista necesita, mediante peticiones de rango HTTP. Eso
permite servir el mapa como archivo estático, sin servidor de teselas y sin
cuenta en ningún proveedor.

Los indicadores viajan como atributos de cada manzana, de modo que cambiar de
indicador o de filtro repinta el mapa en el navegador sin volver a descargar
nada.

## Antecedente

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

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

## La serie 1990-2025 por alcaldía

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
más. La población en hogares indígenas contaba en 2010 a quienes vivían con
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

## Qué lengua se habla y de dónde vienen quienes la hablan

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

## Las variantes: lo que el catálogo dice y lo que el censo no pregunta

Ningún censo ni encuesta del INEGI pregunta qué variante de la lengua habla la
persona: la clave llega hasta la agrupación. Las variantes existen en el
Catálogo de las Lenguas Indígenas Nacionales del INALI, publicado en el Diario
Oficial el 14 de enero de 2008, que reconoce 11 familias, 68 agrupaciones y 364
variantes, cada una con su autodenominación y con las entidades, municipios y
localidades donde se habla. El catálogo se tomó de las páginas oficiales del
INALI (una por agrupación y una por sus variantes) y se guardó en
`clin_variantes.csv` con 364 filas; el script que lo genera aborta si el conteo
por familia o por agrupación no cuadra con el publicado.

Con eso, la **variante probable** de un hablante es la que el catálogo ubica en
su entidad de nacimiento, y solo cuando ahí hay una sola variante de esa lengua.
Si la entidad tiene varias (Puebla registra nueve variantes del náhuatl) la
línea se pinta en gris y el globo dice "una de N variantes"; si no tiene ninguna
registrada, también. Es una inferencia sobre el lugar de nacimiento y no un
dato de la persona: alguien pudo nacer en una entidad y hablar la variante de
otra, y una persona nacida en la ciudad no recibe variante alguna. El mapa lo
rotula así en cada vista y el color solo distingue las tres variantes con más
hablantes; las demás van en gris, porque con cuatro tonos la paleta deja de
distinguirse bajo deuteranopía.

## Todas las poblaciones indígenas: la unión sin doble conteo

La opción "Todas las poblaciones indígenas" cuenta a las personas que hablan
una lengua indígena o se consideran indígenas, una sola vez cada una. Solo se
puede calcular en los microdatos, donde las dos respuestas están en el mismo
registro: en 2015 son 835 437 personas (784 605 autoadscritas más 50 832 que
hablan una lengua sin considerarse indígenas) y en 2020, 852 286. Sumar las
dos cifras publicadas contaría dos veces a las 78 523 personas de 2015 y a las
115 263 de 2020 que cumplen ambas. Como la unión usa los hablantes de la
muestra, su cifra de hablantes no coincide con la del cuestionario básico.

## Los indicadores de vivienda y su denominador

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

## El cruce entre presencia indígena y conectividad

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

## De dónde sale el mapa por AGEB

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

## Marginación y rezago social: qué existe para 2020 y qué no

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

## El umbral de presencia indígena

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

## Cómo se publica el mapa

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

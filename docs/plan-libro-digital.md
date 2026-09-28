# Plan del libro digital: lenguas y pueblos indígenas en la Ciudad de México

Documento de planeación, 27 de septiembre de 2026. Parte del tablero actual (mapa
unificado 1990 - 2025, variantes, metodología) y del documento de la Secretaría de
Cultura *Lenguas indígenas en la Ciudad de México* (asesoría de Andrea Moctezuma
Mendoza, EIC 2015), cuya narrativa va de lo general a lo particular. Se fijan
primero los filtros posibles por nivel, después el inventario de fuentes, luego los
capítulos con sus preguntas, y al final el orden de trabajo y las decisiones que
quedan abiertas.

## 1. Filtros por nivel: qué permite cada fuente

Antes de prometer un filtro se revisó qué publica cada fuente y a qué nivel, porque
eso decide qué se puede ofrecer sin inventar (lección 103 del proyecto). El cuadro
resume el resultado para los tres niveles del mapa.

| Filtro | Alcaldía | AGEB | Manzana |
|---|---|---|---|
| Año | 1990 - 2025 (siete ediciones) | 2010 y 2020 | 2010 y 2020 |
| Sexo | Sí, en todas las ediciones: ITER de 2005 en adelante y muestras de 1990 a 2025 (en 1990 - 2000 el ITER no lo desglosa y saldría de la muestra, rotulado como estimación) | Sí: el tabulado publica hablantes por sexo también en la fila de AGEB; el constructor de 2020 lo omitió y basta añadir las columnas | Ya está (2010 y 2020) |
| Ámbito (pueblos originarios) | Como agregado: sumar las manzanas que caen en pueblos originarios dentro de cada alcaldía (2010 y 2020), rotulado "población en pueblos originarios de la alcaldía" | Por fracción de área de la AGEB dentro de un pueblo (mayoría de área), rotulado como aproximación | Ya está |
| Grupo de edad | Sí, desde los microdatos de las siete muestras: hablantes y autoadscritos por grupo (3 - 14, 15 - 29, 30 - 59, 60 y más) | No: el tabulado por AGEB y manzana no cruza edad con lengua (se revisaron sus 230 columnas); lo único que separa es 3 - 4 años frente a 5 y más | No, por la misma razón |
| Lengua | Sí (muestras) | No | No |
| Población en hogares indígenas por sexo | No existe en ninguna fuente: cuenta hogares completos | No | No |

Los hallazgos son tres. Primero, sexo y año ya son posibles en los tres niveles y
solo falta cablear el sexo por AGEB, que es un cambio de constructor y de un
campo en el panel. Segundo, el ámbito de pueblos originarios es una propiedad de
la colonia, así que por AGEB y por alcaldía solo puede ofrecerse como agregado o
como aproximación de área, y hay que rotularlo así. Tercero, el grupo de edad
solo existe donde hay microdatos, es decir por alcaldía y en todas las encuestas
del libro, y no puede existir por AGEB ni por manzana. Cuando el lector baje a
esos niveles el selector de edad se oculta, como hoy se oculta la lengua.

Sobre el universo de 3 años y más: es la definición oficial de hablante desde el
Censo 2010 y la que usan el tabulado por AGEB y manzana, las intercensales y el
Censo 2020, así que es la base correcta para todo lo que va de 2010 en adelante.
Para la serie larga se mantiene la doble publicación que ya existe: 5 años y más
de 1990 a 2005, porque esas ediciones no preguntaron a menores de cinco, y 3 años
y más desde 2010, con el universo escrito en cada figura. La autoadscripción
conserva sus propios universos (5 y más en 2000, 3 y más en 2010, toda la
población desde 2015). No se recomienda recalcular 1990 - 2005 sobre 3 y más
porque no hay dato, ni recortar 2010 - 2025 a 5 y más para toda figura, porque
dejaría de coincidir con la cifra oficial que el lector puede cotejar.

## 2. Fuentes: cómo identifica cada una a la población indígena

El libro cruza varias encuestas y cada una identifica a la población indígena
de forma distinta. Se listan con su edición, su pregunta, su nivel geográfico y
su estado en el repositorio, porque de ahí sale qué filtros admite cada capítulo.

| Fuente | Ediciones | Cómo identifica | Nivel útil | Estado |
|---|---|---|---|---|
| Censos (ITER) | 1990, 1995, 2000, 2005, 2010, 2020 | Hablantes de lengua indígena, monolingües, hogares indígenas | Localidad y alcaldía | Cargado (serie por alcaldía) |
| Censos, cuestionario ampliado (muestras) | 1990, 2000, 2005, 2010, 2020 | Lengua específica, habla español, autoadscripción (2000, 2010, 2020), edad, sexo, escolaridad, ocupación, posición en el trabajo, afiliación a salud, discapacidad, migración, ingreso por trabajo (2010, 2020) | Alcaldía, con error de diseño | Cargadas para lengua y serie; falta explotar ocupación, escolaridad, salud, discapacidad, ingreso |
| Tabulado por AGEB y manzana | 2010, 2020 | Hablantes 3 y más, 5 y más, monolingües, hogares indígenas, sexo | AGEB y manzana | Cargado en las dos ediciones |
| Encuestas intercensales | 2015, 2025 | Lengua, autoadscripción, edad, sexo, escolaridad, ocupación, migración | Alcaldía (2015 con microdatos de la ciudad; 2025 con microdatos nacionales y conjunto 105) | Cargadas para lengua y serie; falta el resto de temas |
| ENIGH | 2016, 2018, 2020, 2022, 2024 | Habla lengua indígena y se considera indígena, por persona; hogar con ingreso, gasto, equipamiento; diseño muestral | Entidad (la ciudad completa), con error de diseño | Cargadas 2020 - 2024 para acceso digital; 2016 y 2018 descargadas sin cargar; ingreso y carencias sin explotar |
| ENADIS | 2017, 2022 | Módulo de población indígena (se considera indígena o habla la lengua) y opinión de la población general | Entidad en 2022; en 2017 se confirmará la representatividad estatal antes de publicar cifras de la ciudad | Descargada en parquet, sin cargar |
| ENDIREH | 2016, 2021 | Mujeres de 15 y más que hablan lengua indígena y que se consideran indígenas | Entidad, con error de diseño | Sin descargar |
| ENDUTIH | 2025 (única edición con la pregunta) | Habla lengua indígena y se considera indígena (módulo 6.A) | Entidad | Cargada (uso, actividades, barreras) |
| CONEVAL | Pobreza municipal 2010, 2015, 2020; grado de rezago social por AGEB 2020; pobreza de la población indígena (serie nacional y por entidad, 2008 - 2022) | No identifica personas: clasifica territorio; la serie de población indígena usa la ENIGH con su método | Alcaldía (pobreza municipal), AGEB (rezago) | Rezago por AGEB cargado; el resto sin descargar |
| CONAPO | Marginación urbana por AGEB 2010 y 2020; marginación municipal 2010, 2015, 2020 | Clasifica territorio | AGEB y alcaldía | Cargado solo 2020 por AGEB |
| INALI | Catálogo 2008 (variantes y municipios); catálogo de riesgo de desaparición por variante (2012) | Territorio de cada variante y grado de riesgo | Municipio de origen | Catálogo cargado; riesgo sin cargar |
| UNESCO | Atlas de lenguas en peligro | Grado de vitalidad por lengua | Lengua | Sin cargar; el Word lo cita |
| SEPI e IECM | Padrón de pueblos originarios; colonias 2022 | Territorio | Colonia | Cargado |

Dos cautelas aplican a todo el libro. La ENADIS, la ENDIREH y la ENIGH son
encuestas con muestra por entidad: sus cifras para la ciudad llevan intervalo de
confianza calculado con el diseño muestral, y al cruzar dos o tres filtros la
muestra de población indígena en la ciudad se vuelve chica, así que cada figura
tiene que mostrar el error y vaciar la celda cuando no sea estimable. Y ninguna
de estas encuestas baja de la entidad: los capítulos de condiciones de vida,
discriminación y violencia hablan de la ciudad completa, o de la ciudad frente al
país, nunca de alcaldías.

## 3. Capítulos, secciones y preguntas

El orden reproduce el del documento de la Secretaría de Cultura, del país a la
manzana y de la lengua a la persona: primero cuántas lenguas hay y dónde se
hablan en México, después qué lugar ocupa la ciudad, luego quiénes son los
hablantes, dónde viven, de dónde vienen y en qué condiciones, y al final el
riesgo de las lenguas y el marco de derechos. Cada sección lleva sus preguntas,
su fuente, sus filtros y la forma de gráfica que le corresponde por densidad
(barras con un panel, facetas con dos a cuatro, mapa de calor con más). Toda
figura lleva su panel propio de filtros, el desplegable de explicación, la tabla
de respaldo y la marca de verificación contra fuente.

### Capítulo 1. Las lenguas de México

Sección 1.1, *Cuántas lenguas y cuántas variantes*: cuántas agrupaciones y
variantes reconoce el Catálogo INALI, a qué familias pertenecen y cuántos
hablantes tiene cada agrupación en el país en cada censo. Fuente: Catálogo 2008
y Censos 1990 - 2020 con intercensales (nacional). Filtros: año, familia, lengua.
Forma: barras ordenadas por hablantes y una tabla de familias.

Sección 1.2, *Dónde se habla cada lengua*: el mapa de la lengua por municipio que
ya existe, con la variante del catálogo y la lengua dominante del Censo 2020.
Filtros: lengua, variante. Forma: mapa de municipios.

Sección 1.3, *La serie nacional*: hablantes de 5 y más y de 3 y más de 1990 a
2025 y población que se considera indígena de 2000 a 2025, con el cambio de
pregunta de 2000 rotulado. Filtros: población, sexo, grupo de edad. Forma: líneas
por edición.

### Capítulo 2. La ciudad en el país

Sección 2.1, *Cuántas lenguas llegan a la ciudad*: cuántas de las 68
agrupaciones tienen hablantes en la ciudad en cada edición (el documento dice 47
en 2015) y cuáles son las mayores. Fuente: muestras 1990 - 2025. Filtros: año,
sexo, grupo de edad. Forma: barras de las quince mayores y tabla completa.

Sección 2.2, *La ciudad frente a las entidades*: porcentaje de hablantes y de
autoadscritos por entidad, con la ciudad destacada, y el número absoluto, que es
donde la ciudad sube de lugar. Fuente: Censos e intercensales por entidad.
Filtros: año, población, sexo, grupo de edad. Forma: ranking de 32 entidades.

Sección 2.3, *De dónde vienen*: la vista de origen que ya existe (entidad de
nacimiento y residencia cinco años antes, variante probable), más una serie de
la proporción de hablantes nacidos fuera de la ciudad por edición. Filtros: año,
lengua. Forma: mapa de flujos y línea.

### Capítulo 3. Quiénes son: perfil de los hablantes en la ciudad

Sección 3.1, *Edad y sexo*: pirámide de hablantes frente a la del resto de la
población, y la proporción de niñas y niños de 3 a 14 años entre los hablantes
(la tabla 3 del documento: 5 429 menores frente a 123 926 de 15 y más en 2015),
que es la medida de transmisión de la lengua. Fuente: muestras 1990 - 2025.
Filtros: año, alcaldía, lengua, población. Forma: pirámide y línea por edición.

Sección 3.2, *Mujeres y hombres por alcaldía*: hablantes por sexo y alcaldía (la
tabla 2 del documento), con la razón mujeres por cada cien hombres. Filtros:
año, lengua. Forma: barras divergentes por alcaldía.

Sección 3.3, *Escolaridad*: nivel alcanzado y años promedio de escolaridad de
hablantes y autoadscritos frente al resto, por grupo de edad y sexo. Fuente:
muestras 2000 - 2025. Filtros: año, población, sexo, grupo de edad, alcaldía.
Forma: barras apiladas por nivel.

Sección 3.4, *Ocupación y posición en el trabajo*: sector de actividad y
posición (empleado u obrero, trabajador por cuenta propia, trabajo del hogar
remunerado) de los hablantes ocupados, que el documento resume en su figura 3.
Fuente: muestras 2000 - 2025. Filtros: año, sexo, grupo de edad, lengua. Forma:
barras ordenadas; facetas por sexo.

Sección 3.5, *Monolingüismo y transmisión*: proporción de hablantes que no
hablan español por edad y sexo, y hablantes por generación. Fuente: ITER y
muestras. Filtros: año, alcaldía, lengua, sexo. Forma: líneas por grupo de edad.

Sección 3.6, *Hogares indígenas*: personas en hogares indígenas por alcaldía y
edición, con la nota del cambio de definición de 2020. Fuente: ITER 2005 - 2020 y
tabulado por AGEB. Filtros: año, alcaldía. Forma: barras por alcaldía.

### Capítulo 4. Dónde viven: el territorio

Sección 4.1, *Por alcaldía*: el mapa actual con su serie 1990 - 2025, más la
población en pueblos originarios de cada alcaldía como agregado de manzanas
(2010 y 2020). Filtros: año, población, sexo, lengua, ámbito.

Sección 4.2, *Por AGEB y manzana*: el mapa actual en sus dos ediciones, con el
sexo por AGEB añadido. Filtros: año, población, sexo, ámbito, cruce y presencia
mínima.

Sección 4.3, *Concentraciones y marginación*: dónde se concentran los hablantes
según el grado de marginación urbana de la AGEB (el mapa 2 del documento, que
además cruzaba altitud), en 2010 y 2020, con la marginación de CONAPO de cada
edición. Fuente: tabulado por AGEB y CONAPO 2010 y 2020. Filtros: año, población,
grado. Forma: barras por grado y mapa con cruce.

Sección 4.4, *Pueblos originarios y colonias*: las colonias con mayor proporción
de población indígena frente al padrón de pueblos originarios, que no coinciden.
Fuente: manzanas 2010 y 2020 agregadas a colonia. Filtros: año, población,
alcaldía. Forma: ranking de colonias y tabla.

### Capítulo 5. Variantes y origen de cada lengua

Es el capítulo que ya existe en el mapa: la lista de variantes con sus niveles
de certeza, el mapa de la lengua y las flechas de origen. Se le añade una sección
de *Variantes por alcaldía* (qué variantes probables concentra cada alcaldía) y
la lectura de cotejo con el INALI 2000. Filtros: lengua, año, alcaldía,
certeza.

### Capítulo 6. Condiciones de vida

Sección 6.1, *Ingreso*: ingreso corriente per cápita del hogar, deflactado al
periodo de levantamiento, de personas que hablan lengua indígena, que se
consideran indígenas y del resto, por decil y sexo. Fuente: ENIGH 2016 - 2024.
Filtros: año, población, sexo, grupo de edad, escolaridad, tamaño de localidad.
Forma: líneas por edición y barras por decil.

Sección 6.2, *Carencias*: afiliación a servicios de salud, rezago educativo,
servicios básicos y calidad de la vivienda, por condición indígena, con el
método de indicadores de carencia de CONEVAL aplicado a la ENIGH. Filtros: año,
población, sexo, grupo de edad. Forma: barras agrupadas.

Sección 6.3, *Pobreza*: la serie de pobreza de la población indígena que
publica CONEVAL (nacional y por entidad) frente a la no indígena, y la pobreza
municipal 2010 - 2020 por alcaldía cruzada con hablantes. Fuente: CONEVAL.
Filtros: año, entidad, alcaldía. Forma: líneas y ranking.

Sección 6.4, *Trabajo*: condición de actividad, informalidad y horas por
condición indígena. Fuente: ENIGH y muestras censales. Filtros: año, población,
sexo, grupo de edad.

### Capítulo 7. Discriminación

Sección 7.1, *Percepción*: proporción de personas indígenas que declaran haber
sido discriminadas en el último año y por qué motivo (apariencia, forma de
hablar, lengua). Fuente: ENADIS 2017 y 2022, módulo de población indígena.
Filtros: año, sexo, grupo de edad, escolaridad, ciudad frente a país. Forma:
barras con intervalo.

Sección 7.2, *Ámbitos*: dónde ocurrió (trabajo, escuela, servicios de salud,
calle, oficinas de gobierno) y qué derecho se negó. Mismos filtros. Forma:
barras ordenadas por ámbito.

Sección 7.3, *Lo que opina el resto*: la opinión de la población general sobre
los pueblos indígenas (acuerdo con frases, disposición a convivir). Fuente:
ENADIS, cuestionario general. Filtros: año, sexo, edad, escolaridad. Forma:
barras apiladas por grado de acuerdo.

### Capítulo 8. Violencia contra las mujeres indígenas

Sección 8.1, *Prevalencia por ámbito*: violencia total y por ámbito (pareja,
familiar, escolar, laboral, comunitario) en mujeres de 15 y más que hablan lengua
indígena o se consideran indígenas, frente al resto, en la ciudad y en el país.
Fuente: ENDIREH 2016 y 2021, con cada ámbito sobre su propio universo. Filtros:
año, población, ámbito, grupo de edad, escolaridad, ciudad frente a país. Forma:
barras agrupadas con intervalo.

Sección 8.2, *Tipo de violencia y agresor*: física, sexual, económica (solo en el
ámbito familiar), psicológica; quién la ejerció. Mismos filtros.

### Capítulo 9. Acceso y uso digital

Las tres páginas ya construidas y hoy en borrador (Censo 2020 vivienda, ENIGH
hogar, ENDUTIH uso, actividades y barreras) entran como capítulo con sus filtros
actuales (sexo, grupo de edad, escolaridad, decil, tamaño de localidad, entidad)
y el corte de población homologado con el resto del libro.

### Capítulo 10. Lenguas en riesgo

Sección 10.1, *Grado de riesgo de las variantes presentes en la ciudad*: las
variantes probables de la ciudad clasificadas por el grado de riesgo del INALI
(muy alto, alto, mediano, no inmediato) y por la vitalidad de la UNESCO, con el
número de hablantes probables de cada una. Fuente: variantes de la ciudad,
INALI 2012 y Atlas UNESCO. Filtros: lengua, grado, alcaldía. Forma: mapa de
calor lengua por grado y tabla.

Sección 10.2, *Lenguas que pierden hablantes en la ciudad*: cambio entre
ediciones por lengua, con el intervalo, que es lo que permite decir si cae o
empata. Fuente: muestras 1990 - 2025. Filtros: lengua, sexo. Forma: pendientes
por lengua.

### Capítulo 11. Derechos y política cultural

Texto del documento de la Secretaría de Cultura con el marco legal
(Constituciones, Ley General de Derechos Lingüísticos, Ley de Derechos
Culturales de la ciudad) y una línea de tiempo de hitos; sin gráficas de
encuesta. Se puede acompañar de la sección 7.2 (derechos negados) como enlace.

### Capítulo 12. Cómo se hizo

Las páginas de metodología que ya existen (paso a paso, definiciones, fuentes
y cobertura) y las verificaciones, con una sección nueva por encuesta añadida.

## 4. Catálogo de filtros

Todo panel usa el mismo catálogo, con los mismos rótulos y el mismo orden de lo
grande a lo específico: primero *qué se compara y dónde* (población, lengua,
año, unidad, alcaldía o entidad, ámbito) y después *entre quiénes* (sexo, grupo
de edad, escolaridad, decil, tamaño de localidad). El selector de población
ofrece siempre las mismas cuatro opciones que el mapa (hablantes, se consideran
indígenas, hablan y se consideran, todas las poblaciones), y las encuestas que
no traen una de ellas la ocultan en lugar de dejar la opción vacía. Los grupos
de edad se fijan en 3 - 14, 15 - 29, 30 - 59 y 60 y más, con la excepción de
ENDIREH (15 y más) y ENDUTIH y ENIGH digital (6 y más), donde el primer tramo se
ajusta al universo. La escolaridad usa los cuatro tramos ya definidos en los
cargadores (primaria o menos, secundaria, media superior, superior), y el decil
se calcula con el ingreso deflactado.

Cada filtro se muestra solo donde su fuente lo publica, y el panel lee el valor,
no el DOM, para decidirlo. El verificador de filtros se extiende a cada página
nueva con la huella de posiciones.

## 5. Orden de trabajo

Primero se completan los filtros del mapa que ya son posibles (sexo por AGEB,
ámbito agregado por alcaldía, grupo de edad por alcaldía desde las muestras), que
son cambios acotados sobre código existente. Después se explotan las muestras
censales para el capítulo 3, porque están cargadas y verificadas y solo falta
leer más variables. Sigue el capítulo 6 con la ENIGH, cuyo cargador y deflactor
ya existen. Los capítulos 7 y 8 requieren cargar ENADIS y descargar y cargar
ENDIREH, con su perfilado de códigos previo. Al final se cargan los catálogos de
riesgo (INALI, UNESCO) y las clasificaciones territoriales que faltan (CONAPO y
CONEVAL 2010, pobreza municipal). El capítulo 11 es texto y puede escribirse en
paralelo.

Cada capítulo sigue la misma disciplina que el mapa: códigos verificados contra
los microdatos antes de publicar, una cifra de control cotejada con una
publicación oficial por sección y anotada en el archivo de verificaciones, error
de diseño en toda encuesta, y batería de verificadores antes de cada
publicación.

## 6. Decisiones abiertas

Quedan cuatro decisiones que cambian el alcance y conviene fijar antes de
escribir código. La primera es si los capítulos de encuesta (6, 7, 8) se
presentan como ciudad frente a país en toda figura o solo cuando la muestra de
la ciudad no alcanza. La segunda es si se incluye el trabajo desde la ENOE, que
no identifica a la población indígena, o se deja el tema a las muestras
censales y la ENIGH. La tercera es si la ENADIS 2017 entra para la ciudad,
según lo que confirme su diseño muestral, o solo la de 2022. La cuarta es el
título y la portada del libro, que fijan el hero, el bloque de cita y el archivo
de citación del repositorio.

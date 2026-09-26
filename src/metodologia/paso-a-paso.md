---
title: Paso a paso
---

# Cómo se hizo, paso a paso

Esta página describe, en orden y sin detalle de código, cómo se construyó
cada parte del tablero: qué archivos se descargaron, qué se calculó con
ellos, contra qué se cotejó cada cifra y qué no permite saber ninguna fuente.
Las definiciones de cada población están en [Definiciones](./definiciones) y
cada archivo con su liga y sus cautelas, en [Fuentes y cobertura](./fuentes).

## 1. Qué se quería saber y qué publica cada fuente

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

## 2. Descargas

Todos los insumos son públicos. Del INEGI se descargaron los Principales
resultados por localidad (ITER) de 1990, 1995, 2000, 2005, 2010 y 2020, el
tabulado por AGEB y manzana de 2020 para la Ciudad de México, los microdatos
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

## 3. Cómo se leyó cada archivo

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

## 4. La serie por alcaldía, 1990 - 2025

Para cada edición se tomó el conteo censal cuando existe y la muestra solo
para lo que el conteo no pregunta. Los hablantes salen del ITER (filas de
total de la entidad y de cada delegación) porque las muestras ampliadas los
sobreestiman; la autoadscripción, la unión y la intersección de poblaciones
salen de las muestras, con su error de diseño calculado por linearización
de Taylor y mostrado como intervalo. Los universos se respetan tal como los
publica cada fuente: 5 años y más hasta 2005, 3 años y más desde 2010, y la
autoadscripción de 5 años y más en 2000, de 3 y más en 2010 y de todas las
edades desde 2015. El ITER de 1990 no publica el total de hablantes ni la
población de 5 años y más, y la figura lo dice: su cifra suma a quienes
hablan y no hablan español y estima el denominador con la muestra de ese
censo.

## 5. Las lenguas y su origen

La lengua concreta se calculó en las siete muestras por alcaldía y sexo, con
la clave de agrupación lingüística del INALI. Para 2015 la tabla reproduce
exactamente las cifras publicadas por la Secretaría de Cultura (náhuatl
38 549, mixteco 15 920, otomí 13 764), que es la comprobación de que la clave
está bien leída. El origen se tomó de dos preguntas: la entidad de nacimiento
de cada hablante y la entidad y municipio donde vivía cinco años antes.

## 6. Las variantes: el método del INALI aplicado al lugar de origen

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

## 7. El mapa

Las manzanas y las AGEB se sirven como teselas vectoriales con las tasas de
2020 como atributos; las alcaldías y las entidades son polígonos cuyo valor
se escribe en el navegador con la serie, la lengua y el año elegidos. Los
cortes de color por alcaldía son fijos a lo largo de los años, para que el
mismo tono signifique lo mismo en 1990 y en 2025. La vista de origen dibuja
una línea por entidad y variante, con el grosor por número de personas y el
color por variante; solo las tres variantes con más hablantes reciben color,
porque con cuatro tonos la paleta deja de distinguirse bajo deuteranopía.

## 8. Cotejos

Cada cifra central se comparó con una publicada y el resultado está en el
archivo de verificaciones del repositorio, que se ejecuta en cada
construcción del sitio. Coinciden con el ITER los hablantes de 1995, 2000,
2005, 2010 y 2020; con el documento de la Secretaría de Cultura, las 32
celdas de hablantes por alcaldía y sexo de 2015, la distribución por
alcaldía y las seis lenguas mayores; con los perfiles de la SEPI, los
hablantes y autoadscritos de 2020 y los monolingües por alcaldía; con el
tabulado de la Intercensal 2025, las 16 alcaldías. Quedan pendientes, sin
cifra oficial localizada, la autoadscripción de 2010 y el porcentaje de
hogares con internet de la ENIGH 2024.

## 9. Lo que no se puede saber con estas fuentes

La variante que habla cada persona; la lengua y la autoadscripción por AGEB
o manzana; la autoadscripción antes de 2000 y con la misma pregunta antes de
2010; los hablantes de 3 años y más antes de 2010; la población en hogares
indígenas antes de 2005; y el municipio de nacimiento, que ningún censo
publica. Cuando alguna de estas cosas aparece en el mapa lo hace como
inferencia rotulada, nunca como dato.

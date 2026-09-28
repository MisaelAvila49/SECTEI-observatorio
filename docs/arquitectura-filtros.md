# Arquitectura de filtros del libro: geografía primero, análisis después

Documento de diseño, 27 de septiembre de 2026. Fija cómo se eligen la geografía y
los cortes antes de escribir cualquier análisis, para que las doce secciones del
[plan del libro](plan-libro-digital.md) compartan un solo modelo. Se parte de lo que
ya funciona en dos proyectos: el tablero de Jóvenes Construyendo el Futuro
(`jcf-stats-v2`), donde cada sección tiene su panel con nivel, entidad y municipio
y una vista de gráfica o de mapa, y el mapa unificado de este proyecto, con sus
niveles de alcaldía, AGEB y manzana y sus reglas de qué filtro se muestra en cada
nivel. Lo que ninguno de los dos tiene, y aquí se añade, es bajar de nivel con un
clic sobre el mapa.

## 1. Lo que se toma de cada proyecto

De `jcf-stats-v2` se toma el panel por sección con los mismos controles en el mismo
orden (nivel, vista, año, entidad, municipio, sexo, edad, decil), la regla de que
un selector solo se construye cuando su fuente tiene más de un valor real, los seis
modos que derivan del panel (nacional, estado, municipio y sus tres comparaciones)
y el corte en dos pasos, geografía primero y después los demás filtros. Sus
lecciones documentadas también aplican: en la comparación de municipios de todo el
país la llave de cinco dígitos no casa con el mapa de entidades de dos, así que ahí
solo se muestra el ranking; una gráfica de facetas por año sobre la vista de mapa
tiene que responder con un mapa de calor y no ignorar la petición; y la
selección en el mapa se hace por clase CSS sobre el polígono, no con el puntero de
Plot, que elige la unidad equivocada.

Del mapa unificado se toman los niveles de la ciudad (alcaldía, AGEB, manzana) con
sus teselas, la regla de que cada filtro aparece solo donde la fuente lo publica
(lección 103), el estado de reposo en la tarjeta, la comparación con clic (hasta
cinco unidades fijadas) y la pestaña de Información de la unidad elegida. El
motor de mapa es MapLibre en todo el libro, porque ya sirve las teselas de
municipios del país, las alcaldías, las AGEB y las manzanas; Plot queda para las
gráficas.

## 2. El modelo de geografía

La geografía es un solo objeto que viaja con el panel de cada sección:

```js
{nivel: "nacional" | "entidad" | "municipio" | "ageb" | "manzana",
 cveEnt: "09" | null, cveMun: "09007" | null, cveAgeb: "0900700011716" | null,
 vista: "grafica" | "mapa"}
```

Cada fuente declara hasta qué nivel llega y con qué llave, y el panel no ofrece
un nivel por debajo del que la fuente publica. Con eso, el mismo componente sirve
para una sección de ENADIS (que se detiene en entidad) y para una de hablantes
por manzana.

| Fuente | Nivel máximo | Llave | Cómo se agrega hacia arriba |
|---|---|---|---|
| Censos e intercensales (muestras) | Municipio o alcaldía | `cve_mun` de 5 dígitos | Suma de numerador y denominador; el error se suma en varianza y se rotula como aproximación |
| ITER | Localidad, publicado por alcaldía | `cve_mun` | Suma exacta |
| Tabulado por AGEB y manzana | Manzana | `CVEGEO` de 16 dígitos; AGEB de 13 | Suma exacta con pérdida por supresión, que se declara |
| ENIGH, ENADIS, ENDIREH, ENDUTIH | Entidad | `cve_ent` de 2 dígitos | Solo nacional, con el diseño muestral |
| CONEVAL pobreza municipal, CONAPO municipal | Municipio | `cve_mun` | No se agrega: son clasificaciones |
| CONAPO y CONEVAL por AGEB | AGEB | `cve_ageb` | No se agrega |
| Catálogo INALI | Municipio | `cve_mun` | No se agrega |

De la geografía y la vista salen los modos, los mismos seis de `jcf-stats-v2` más
tres de la ciudad. Un modo de una sola unidad (nacional, estado, municipio, AGEB)
dibuja series y perfiles; un modo de comparación (todas las entidades, los
municipios de un estado, las alcaldías de la ciudad, las AGEB de una alcaldía,
las manzanas de una AGEB o colonia) dibuja mapa y ranking. La regla que decide el
modo vive en un módulo de geografía compartido, que lee el valor del panel y no el
DOM.

## 3. Bajar de nivel con el mapa

El descenso tiene tres caminos y los tres escriben en el mismo panel, de modo que
las gráficas de la sección no distinguen por dónde llegó la selección.

El primero es el clic sobre el mapa. Un clic sobre una entidad en el mapa nacional
escribe esa entidad en el panel y pasa el nivel a "municipio", con lo que el mapa
muestra los municipios de ese estado; un clic sobre un municipio escribe el
municipio y, si la fuente llega más abajo, pasa a AGEB; un clic sobre una AGEB
pasa a manzana. El nivel al que se baja siempre es el siguiente que la fuente
publica: en una sección de ENADIS el clic sobre una entidad la selecciona y no
baja más, y el mapa lo dice en la tarjeta ("esta fuente llega hasta entidad"). El
hover no selecciona nada; solo el clic.

El segundo es la miga de pan sobre el mapa: "México › Ciudad de México ›
Iztapalapa › AGEB 1716". Cada tramo es un botón que sube a ese nivel y limpia lo
que está por debajo. Es la forma de volver, y sustituye al botón "Volver a la
ciudad" del mapa actual.

El tercero es el panel de la sección: los buscadores de entidad y municipio con
resolución sin acentos, desempate por recencia y aviso de "ninguna coincidencia",
como en `jcf-stats-v2`, más un selector de alcaldía y otro de AGEB cuando el
nivel lo pide. Escribir en el buscador y hacer clic en el mapa producen el mismo
estado.

Fijar unidades para comparar (clic con la tecla de mayúsculas, o el botón "Fijar"
de la tarjeta) es una acción distinta de bajar de nivel: fija hasta cinco
tarjetas sin cambiar el nivel, como hoy. La pestaña de Información de la unidad
elegida conserva su botón para bajar a ella.

## 4. Los demás filtros y sus reglas

El panel de toda sección tiene dos grupos rotulados. *Qué se compara y dónde*
lleva población (hablantes, se consideran indígenas, hablan y se consideran, todas
las poblaciones, hogares indígenas), lengua, año, nivel, entidad, municipio o
alcaldía, ámbito de pueblos originarios, vista y, en las teselas, cruce y
presencia mínima. *Entre quiénes* lleva sexo, grupo de edad, escolaridad, decil y
tamaño de localidad. Los selectores con categorías admiten "por separado" para
facetar, salvo en la vista de mapa, que fuerza un solo año, edades juntas y sin
facetas, y devuelve a la vista de gráfica cuando el lector pide facetas.

Qué se muestra en cada nivel sale de lo que publica la fuente, no de la página:

| Filtro | Nacional y entidad | Municipio o alcaldía | AGEB | Manzana |
|---|---|---|---|---|
| Año | Todas las ediciones de la fuente | Las que tenga la fuente | 2010 y 2020 | 2010 y 2020 |
| Población | Las que la fuente identifique | Igual | Hablantes y hogares | Hablantes y hogares |
| Lengua | Sí en censos y muestras | Sí | No | No |
| Sexo | Sí | Sí | Sí (hablantes) | Sí (hablantes) |
| Grupo de edad | Sí donde hay microdatos | Sí (muestras) | No | No |
| Escolaridad, decil, tamaño de localidad | Encuestas con microdatos | Muestras censales (escolaridad) | No | No |
| Ámbito de pueblos originarios | No | Agregado de manzanas | Aproximación por área | Sí |
| Cruce y presencia mínima | No | No | Solo 2020 | Solo 2020 |

Un selector cuya fuente no publica el corte en ese nivel se oculta, y su valor
vuelve al total para que ninguna gráfica lea un filtro invisible. El grupo entero
se oculta si no le queda ningún control visible. Los grupos de edad son fijos en
todo el libro (3 a 14, 15 a 29, 30 a 59, 60 y más) y el primer tramo se ajusta al
universo de cada encuesta (6 y más en ENIGH digital y ENDUTIH, 15 y más en
ENDIREH), con el universo escrito en la definición.

## 5. Forma de los datos

Cada sección lee una tabla larga, producida por su cargador y versionada, con el
grano más fino que la fuente permite y una fila por celda:

```
anio, nivel, cve, nombre, poblacion, lengua, sexo, edad, [escolaridad, decil, tamloc],
num, den, ee, casos, fuente, universo
```

Las celdas de total ("Total" en sexo, "Todas" en edad, "todas" en lengua) las
escribe el cargador, no el navegador: así el error de diseño de cada celda sale
de la linearización de Taylor sobre los microdatos y no de una suma aproximada. El
navegador filtra y, cuando el modo lo exige (municipios de un estado a partir de
alcaldías, colonias a partir de manzanas), suma numerador y denominador y nunca
promedia tasas. Las celdas cuya varianza no es estimable llevan el error vacío y
la gráfica lo dibuja como "no estimable", nunca como cero. Las tablas de encuesta
con un año se parten por tema para que cada página cargue solo lo suyo.

Las llaves se normalizan al leer (dos, cinco, trece y dieciséis dígitos) y, antes
de pintar un mapa, se comprueba que la llave de la agregación tenga la misma
longitud que la del geojson o la tesela; si no coincide, se muestra el ranking y
no un mapa gris.

## 6. Estado compartido y URL

La selección de una sección no contamina a las demás: cada panel guarda la suya,
para poder dejar una gráfica en 2010 y otra en 2020. Lo que sí se comparte es la
geografía cuando el lector lo pide: un botón "Aplicar a todo el capítulo" copia
nivel y unidad a los paneles de la página. La geografía y el año de cada sección
se escriben en el fragmento de la URL (`#s3.1=ageb:0900700011716;2020`) para poder
compartir una vista concreta; los demás filtros no, porque el enlace se volvería
ilegible. Al abrir un enlace con fragmento, la sección restaura su estado antes
de pintar.

## 7. Componentes a construir

Se construyen cuatro piezas y el resto se reutiliza. `geografia.js` declara los
niveles, las llaves, la derivación del modo y las etiquetas ("Municipios de
Jalisco", "AGEB de Iztapalapa"). `panelSeccion.js` arma el panel a partir de la
declaración de la fuente (niveles, cortes, ediciones) y expone `value`, `aplica`
y `mostrar` como el panel del mapa. `mapaNavegador.js` dibuja con MapLibre el
nivel actual con el indicador elegido, gestiona clic, miga de pan, fijadas y
tarjeta, y recibe qué fuentes de teselas y geojson usar. `seccion.js` une panel,
mapa y gráfica: corta la geografía, corta los demás filtros, decide el modo y
llama a la función de construcción de la sección con `{v, geo, modo, filas,
comparacion, etiqueta, ancho}`. El mapa unificado actual pasa a ser una sección
más que usa estas piezas, sin perder la pestaña de Información ni las vistas de
origen y de la lengua.

## 8. Verificación

El verificador de filtros se extiende con una prueba por sección que registra
la huella de posiciones y colores, baja dos niveles con clic en el mapa y sube
con la miga de pan, y comprueba que un filtro oculto no altere el dibujo. Antes
de aprobar una sección se cuentan las marcas reales en el mapa y en la gráfica,
se mide que la llave case con la geometría, y se lee en voz alta la cifra de la
tarjeta con su unidad y su universo.

## 9. Orden de trabajo

Estado al 27 de septiembre: la beta está construida en la página `/beta` con
las cuatro piezas (`geografia.js`, `panel-seccion.js`, `mapa-navegador.js` y la
sección armada en la propia página) y datos reales: el ITER nacional 2020 y la
muestra del cuestionario ampliado por entidad y municipio (sexo y grupo de
edad), la serie 1990 - 2025 por alcaldía y las teselas de AGEB y manzana de
2010 y 2020. Se comprobó con el navegador que el clic baja de entidad a
municipio, de alcaldía a AGEB y de AGEB a manzana, que las migas suben, que
los buscadores resuelven sin acentos y avisan, y que el año, el sexo y la edad
aparecen solo donde su fuente los publica. La tarjeta y la leyenda van debajo
del lienzo, no encima: un panel flotante tapaba unidades y se tragaba el clic.

Primero `geografia.js` y `panelSeccion.js` con sus pruebas, porque todo lo demás
depende de ellos. Después `mapaNavegador.js` sobre el mapa unificado, añadiendo
el clic para bajar y la miga de pan sin quitar nada de lo que hoy funciona; esa
es la prueba de que el modelo aguanta los tres niveles de la ciudad. Luego la
primera sección nueva del libro (hablantes por entidad y municipio del país, del
capítulo 2), que ejercita nacional, entidad y municipio con datos ya cargados. A
partir de ahí, cada sección del plan entra con su cargador, su tabla larga y su
declaración de fuente.

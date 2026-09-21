---
title: Definiciones
---

# Definiciones

## Quién es población indígena en este tablero

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

## Qué mide cada fuente

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

## Los universos que no son toda la población

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

## Las dimensiones de los filtros

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

## Muestra, error e intervalo

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

## El mapa por manzana de la Ciudad de México

Usa otra fuente y otra definición: el tabulado por AGEB y manzana del Censo
2020, y la variable `PHOG_IND`, personas en hogares donde la persona de
referencia, su cónyuge o alguno de sus ascendientes hablan lengua indígena. Es
un indicador de hogar y de lengua, no de autoadscripción; el detalle está en
[Fuentes y cobertura](./fuentes).

## Cómo se leen los filtros de los mapas

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

## El mapa por AGEB y sus clasificaciones

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
decisión está en [Fuentes y cobertura](./fuentes).

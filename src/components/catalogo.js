// src/components/catalogo.js
// Contenido editorial de las páginas de análisis: qué indicador abre cada
// tema, qué bloques siguen y qué dice el desplegable de explicación. Las
// páginas .md son cascarones; el texto vive aquí para que cambiarlo no
// obligue a tocar cinco archivos.
//
// Reglas de redacción: los textos describen, no concluyen. Se nombra la
// fuente oficial; el pipeline propio es infraestructura y no aparece.

export const ENCUESTAS = [
  {clave: "censo", nombre: "Censo 2020", ruta: "/encuestas/censo/vivienda",
   resumen: "Qué hay en la vivienda: internet, celular, computadora y otros servicios, con la muestra ampliada del Censo."},
  {clave: "enigh", nombre: "ENIGH 2020 - 2024", ruta: "/encuestas/enigh/hogar",
   resumen: "Qué hay en el hogar en tres ediciones, con decil de ingreso: la única serie en el tiempo."},
  {clave: "endutih", nombre: "ENDUTIH 2025", ruta: "/encuestas/endutih/uso",
   resumen: "Qué usa cada persona, para qué, y por qué no: la única fuente de uso personal con identificación indígena."},
];

const EXPLICA_CRITERIO = `Población indígena es, según el criterio elegido en el panel,
  quien declaró hablar alguna lengua indígena o quien declaró considerarse indígena.
  Son dos preguntas distintas del cuestionario y dan poblaciones distintas: la
  segunda es unas tres veces mayor que la primera. El resto de la población es todo
  el que no cumple el criterio activo.`;

export const CATALOGO = {
  "censo-vivienda": {
    encuesta: "censo",
    titulo: "Conectividad en la vivienda",
    ruta: "/encuestas/censo/vivienda",
    entrada: `El Censo 2020 pregunta, vivienda por vivienda, si dispone de internet, celular,
      computadora y otros bienes y servicios de comunicación. Esta página cuenta a las
      personas de 6 años o más según lo que hay en la vivienda donde viven.`,
    explica: `${EXPLICA_CRITERIO} El porcentaje es la fracción de personas de 6 años o más
      de cada grupo que vive en una vivienda particular con el servicio o el bien. El
      Censo mide lo que hay en la vivienda, no lo que cada persona usa.`,
    principal: {
      indicador: "Vive en una vivienda con internet",
      titulo: "Vive en una vivienda con internet",
      explica: `La pregunta del Censo es si la vivienda dispone de internet, sin distinguir
        conexión fija de móvil.`,
    },
    bloques: [
      {
        titulo: "Dispositivos para conectarse",
        abre: "edad",
        indicadores: [
          {indicador: "Vive en una vivienda con teléfono celular"},
          {indicador: "Vive en una vivienda con computadora, laptop o tableta"},
          {indicador: "Vive en una vivienda con celular pero sin internet",
           explica: `Viviendas que tienen al menos un celular y no disponen de internet: el
             celular como único puente, con datos de prepago o sin conexión.`},
          {indicador: "Vive en una vivienda sin internet ni celular",
           explica: `Viviendas sin internet y sin ningún celular entre sus integrantes: la
             desconexión completa.`},
        ],
        explica: `Cada gráfica muestra la fracción de personas de cada grupo cuya vivienda
          dispone del bien. Con el desglose por edad se lee si la brecha es la misma en
          la infancia, la vida laboral y la vejez.`,
      },
      {
        titulo: "Otros servicios de comunicación",
        abre: "localidad",
        indicadores: [
          {indicador: "Vive en una vivienda con línea telefónica fija"},
          {indicador: "Vive en una vivienda con televisión de paga"},
          {indicador: "Vive en una vivienda con servicio de streaming"},
          {indicador: "Vive en una vivienda con televisor"},
          {indicador: "Vive en una vivienda con radio"},
          {indicador: "Vive en una vivienda con consola de videojuegos"},
        ],
        explica: `Los servicios de paga (telefonía fija, televisión de paga, streaming) dependen
          de que haya oferta en la localidad y de poder pagarla; el televisor y la radio
          son los bienes de comunicación más extendidos y sirven de referencia.`,
      },
    ],
    fuentes: {
      verificadoCon: ["R-CENSO-2020-TAB"],
      resultado: "los tabulados del Censo publican 52.1 % de viviendas particulares habitadas con internet; la muestra ampliada da 53.9 % a nivel vivienda, dentro de la diferencia esperada entre el cuestionario básico y la muestra. El corte por condición indígena no se publica y es cálculo propio sobre los microdatos.",
    },
  },

  "enigh-hogar": {
    encuesta: "enigh",
    titulo: "Acceso en el hogar, 2020 - 2024",
    ruta: "/encuestas/enigh/hogar",
    entrada: `La ENIGH pregunta al hogar si tiene conexión a internet, celular, computadora y
      otros servicios, y lo hace cada dos años con la misma pregunta. Es la única de las
      tres fuentes que permite ver si la brecha se cierra o se abre, y la única con decil
      de ingreso.`,
    explica: `${EXPLICA_CRITERIO} El porcentaje es la fracción de personas de 6 años o más
      de cada grupo que vive en un hogar con el servicio. El decil de ingreso es del
      ingreso corriente per cápita del hogar, calculado dentro de cada edición.`,
    principal: {
      indicador: "Vive en un hogar con conexión a internet",
      titulo: "Vive en un hogar con conexión a internet",
      explica: `Al comparar ediciones se ve la trayectoria de cada grupo; al elegir una
        edición y comparar entidades, dónde está la brecha ese año.`,
    },
    bloques: [
      {
        titulo: "Dispositivos y servicios del hogar",
        abre: "edad",
        indicadores: [
          {indicador: "Vive en un hogar con teléfono celular"},
          {indicador: "Vive en un hogar con computadora o laptop",
           explica: `En 2024 la ENIGH separó computadora de escritorio y portátil; aquí se
             cuentan juntas para que la serie sea comparable con 2020 y 2022.`},
          {indicador: "Vive en un hogar con celular pero sin internet"},
          {indicador: "Vive en un hogar sin internet ni celular"},
          {indicador: "Vive en un hogar con línea telefónica fija"},
          {indicador: "Vive en un hogar con televisión de paga"},
          {indicador: "Vive en un hogar con servicio de streaming",
           explica: `La pregunta de streaming existe solo desde la edición 2024.`},
        ],
        explica: `Cada gráfica muestra la fracción de personas de cada grupo cuyo hogar
          dispone del servicio. Con el desglose por edad se lee si la brecha es la misma
          en la infancia, la vida laboral y la vejez.`,
      },
    ],
    fuentes: {
      referencia: ["R-ENIGH-2024-TAB"],
      resultado: "los tabulados de la ENIGH publican la disponibilidad de servicios por hogar; el corte por condición indígena de la persona no se publica y es cálculo propio sobre los microdatos. La cifra nacional por hogar se compara en verificaciones.csv.",
    },
  },

  "endutih-uso": {
    encuesta: "endutih",
    titulo: "Quién usa internet y con qué",
    ruta: "/encuestas/endutih/uso",
    entrada: `La ENDUTIH pregunta a cada persona de 6 años o más si usó internet, computadora
      y celular en los últimos tres meses, y desde 2025 si habla lengua indígena y si se
      considera indígena. Es la única fuente de uso personal con ese corte.`,
    explica: `${EXPLICA_CRITERIO} Salvo que la figura diga otra cosa, el porcentaje es la
      fracción de personas de 6 años o más de cada grupo que declaró el uso en los
      últimos tres meses.`,
    principal: {
      indicador: "Usa internet",
      titulo: "Usa internet",
      explica: `Usar internet es haberlo usado en los últimos tres meses, en el hogar o fuera
        de él, desde cualquier dispositivo.`,
    },
    bloques: [
      {
        titulo: "Dispositivos y conexión",
        abre: "edad",
        indicadores: [
          {indicador: "Usa celular"},
          {indicador: "Usa computadora, laptop o tableta"},
          {indicador: "El celular que usa es inteligente", universo: "Personas de 6 años o más que usan celular"},
          {indicador: "Usa internet todos los días", universo: "Personas de 6 años o más que usan internet"},
          {indicador: "Se conecta con datos móviles", universo: "Personas de 6 años o más que usan celular inteligente"},
          {indicador: "Se conecta por wifi", universo: "Personas de 6 años o más que usan celular inteligente"},
        ],
        explica: `Los tres primeros indicadores se calculan sobre toda la población; los demás,
          solo entre quienes usan el dispositivo, y así lo dice el subtítulo de cada
          figura.`,
      },
      {
        titulo: "Desde qué equipo y en qué lugar",
        abre: "localidad",
        indicadores: [
          {indicador: "Se conecta desde un celular inteligente", universo: "Personas de 6 años o más que usan internet"},
          {indicador: "Se conecta desde una laptop", universo: "Personas de 6 años o más que usan internet"},
          {indicador: "Se conecta desde una computadora de escritorio", universo: "Personas de 6 años o más que usan internet"},
          {indicador: "Se conecta desde una televisión inteligente", universo: "Personas de 6 años o más que usan internet"},
          {indicador: "Usa internet en el hogar", universo: "Personas de 6 años o más que usan internet"},
          {indicador: "Usa internet en cualquier lugar con conexión móvil", universo: "Personas de 6 años o más que usan internet"},
          {indicador: "Usa internet en un sitio público gratuito", universo: "Personas de 6 años o más que usan internet"},
          {indicador: "Usa internet en la escuela", universo: "Personas de 6 años o más que usan internet"},
        ],
        explica: `Todos los indicadores de este bloque se calculan entre quienes usan internet:
          dicen con qué y desde dónde se conecta quien ya se conecta.`,
      },
      {
        titulo: "El hogar de quien responde",
        indicadores: [
          {indicador: "Vive en un hogar con internet"},
          {indicador: "Vive en un hogar con computadora, laptop o tableta"},
          {indicador: "La conexión del hogar es solo móvil", universo: "Personas de 6 años o más en hogares con internet",
           explica: `Hogares cuya única conexión es a través de la red celular, sin conexión fija.`},
        ],
        explica: `La ENDUTIH también pregunta por el hogar, con la misma pregunta que el Censo y
          la ENIGH; estas tres figuras permiten cotejar las tres fuentes.`,
      },
    ],
    fuentes: {
      referencia: ["R-ENDUTIH-2025-COM"],
      resultado: "la cifra nacional de personas de 6 años o más que usan internet se compara con el comunicado de resultados de la ENDUTIH en verificaciones.csv; el corte por condición indígena no se publica y es cálculo propio sobre los microdatos.",
    },
  },

  "endutih-actividades": {
    encuesta: "endutih",
    titulo: "Para qué se usa internet",
    ruta: "/encuestas/endutih/actividades",
    entrada: `Entre quienes usan internet, la ENDUTIH pregunta para qué: estudiar, trabajar,
      informarse, hacer trámites, manejar dinero, comunicarse y entretenerse. Todos los
      indicadores de esta página se calculan solo entre quienes usan internet.`,
    explica: `${EXPLICA_CRITERIO} El porcentaje es la fracción de personas de 6 años o más
      de cada grupo QUE USAN INTERNET y declararon la actividad en el periodo de
      referencia (tres meses, o doce en compras, ventas, pagos y gobierno).`,
    principal: {
      indicador: "Usa internet para actividades escolares",
      titulo: "Usa internet para actividades escolares",
      explica: `Entre quienes usan internet, la fracción que lo usa para actividades escolares.
        No mide asistencia a la escuela: es una lectura del uso, no de la matrícula.`,
    },
    bloques: [
      {
        titulo: "Estudiar, trabajar e informarse",
        abre: "edad",
        indicadores: [
          {indicador: "Usa internet para actividades laborales"},
          {indicador: "Se capacitó para el trabajo por internet"},
          {indicador: "Tomó cursos de apoyo al estudio"},
          {indicador: "Tomó tutoriales en línea"},
          {indicador: "Buscó información sobre salud"},
          {indicador: "Buscó empleo o bolsas de trabajo"},
          {indicador: "Buscó información para educación o tareas"},
        ],
      },
      {
        titulo: "Trámites, dinero y compras",
        indicadores: [
          {indicador: "Se comunicó con el gobierno"},
          {indicador: "Consultó información del gobierno"},
          {indicador: "Descargó formatos del gobierno"},
          {indicador: "Usó banca electrónica"},
          {indicador: "Realizó pagos por internet"},
          {indicador: "Compró por internet"},
          {indicador: "Vendió por internet"},
        ],
        explica: `Gobierno, banca y comercio son los usos que sustituyen un trámite presencial:
          donde hay brecha aquí, la hay también en el acceso a esos servicios.`,
      },
      {
        titulo: "Comunicarse y entretenerse",
        indicadores: [
          {indicador: "Usa redes sociales"},
          {indicador: "Envía mensajes instantáneos"},
          {indicador: "Hace llamadas por internet"},
          {indicador: "Envía correos electrónicos"},
          {indicador: "Lee periódicos, revistas o libros en línea"},
          {indicador: "Ve video gratuito en línea"},
          {indicador: "Ve video de paga en línea"},
          {indicador: "Juega en línea"},
        ],
      },
      {
        titulo: "Habilidades y riesgos",
        indicadores: [
          {indicador: "Usa servicios en la nube"},
          {indicador: "Creó sitios de internet o blogs"},
          {indicador: "Sufrió fraude con información"},
          {indicador: "Sufrió violación a su privacidad"},
        ],
        explica: `Los dos últimos son problemas que la persona declara haber tenido en los
          equipos con que se conecta, en los últimos tres meses.`,
      },
    ],
    fuentes: {
      referencia: ["R-ENDUTIH-2025-COM"],
      resultado: "las actividades por grupo de población indígena no se publican; son cálculo propio sobre los microdatos. La cifra nacional de uso de internet se compara en verificaciones.csv.",
    },
  },

  "endutih-barreras": {
    encuesta: "endutih",
    titulo: "Quién no se conecta y por qué",
    ruta: "/encuestas/endutih/barreras",
    entrada: `La ENDUTIH pregunta a quien no usa internet, computadora o celular por qué no
      lo hace, y al hogar sin internet por qué no lo tiene. Esta página mide primero
      cuánta gente queda fuera y luego qué motivo declara.`,
    explica: `${EXPLICA_CRITERIO} El primer bloque se calcula sobre toda la población de 6
      años o más; los motivos, solo entre quienes no usan o no tienen, y suman 100 %
      dentro de cada grupo.`,
    principal: {
      indicador: "No usa internet ni celular",
      titulo: "No usa internet ni celular",
      explica: `Personas que en los últimos tres meses no usaron internet ni celular: la
        desconexión completa, sin ningún puente.`,
    },
    bloques: [
      {
        titulo: "Quién queda fuera",
        abre: "edad",
        indicadores: [
          {indicador: "No usa internet"},
          {indicador: "No usa computadora, laptop ni tableta"},
          {indicador: "No dispone de celular"},
          {indicador: "Vive en un hogar sin internet"},
        ],
        explica: `Son los complementos de los indicadores de uso, vistos desde la exclusión:
          aquí el rojo alto es desventaja.`,
      },
    ],
    motivos: [
      {titulo: "Por qué no usa internet", prefijo: "Motivo para no usar internet: ",
       explica: `Cada persona que no usa internet declara UN motivo principal. "No sabe
         utilizarlo" y "falta de recursos" son barreras de habilidad y de ingreso; "no
         tiene acceso, aunque sabe" es una barrera de oferta.`},
      {titulo: "Por qué no usa computadora", prefijo: "Motivo para no usar computadora: ",
       explica: `Un motivo principal por persona. "Usa su celular inteligente" no es una
         barrera sino una sustitución.`},
      {titulo: "Por qué no dispone de celular", prefijo: "Motivo para no disponer de celular: ",
       explica: `Un motivo principal por persona sin celular. "No hay servicio en su localidad"
         es la barrera de cobertura.`},
      {titulo: "Por qué el hogar no tiene internet", prefijo: "Motivo del hogar para no tener internet: ",
       explica: `Lo responde el hogar, no la persona; aquí se cuenta a las personas de 6 años
         o más que viven en hogares sin internet según el motivo que declaró su hogar.
         "No hay proveedor o infraestructura" es la barrera de oferta.`},
    ],
    fuentes: {
      referencia: ["R-ENDUTIH-2025-COM"],
      resultado: "los motivos por condición indígena no se publican; son cálculo propio sobre los microdatos.",
    },
  },
};

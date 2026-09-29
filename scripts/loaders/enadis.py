"""
enadis.py: discriminación hacia la población indígena, ENADIS 2017 y 2022
(INEGI), módulo de población indígena de 12 años y más, con error de diseño.

Cobertura: el módulo indígena es representativo SOLO a nivel nacional en las
dos ediciones (diseño muestral 2022, p. 2: "La encuesta está diseñada para
dar resultados a nivel nacional"; 2017: los dominios estatales no incluyen
este módulo). Por eso no hay cortes por entidad.

Universo y ponderador:
  2022  tabla indigena (TINDIGENA), filas con RESUL_POB = 'A' (entrevista
        completa); FAC_IND; diseño UPM_DIS y EST_DIS. La tabla indigena_v es
        de verificación (no se consideran indígenas) y no se usa.
  2017  tabla indigena, filas con el módulo 8 respondido (pm8_6_01 no vacío);
        factor_per; diseño upm_dis y est_dis.
Cambio de definición: en 2022 entra quien habla lengua indígena o se
considera indígena por cualquiera de seis razones; en 2017 solo quien habla
o se considera por pertenecer a una comunidad o por padres hablantes.

Preguntas (cuestionario y descriptor de archivos del INEGI; códigos
confirmados contra los microdatos):
  discriminacion  últimos 12 meses discriminada o menospreciada por algún
                  motivo: 2022 PM9_6_01..16, 2017 pm8_6_01..10 (1 sí). Los
                  motivos 11 a 16 solo existen en 2022; "comparable" usa los
                  diez comunes.
  motivo          cada motivo, sobre toda la población indígena de 12 y más
  por_indigena    2022: entre quienes fueron discriminados, por "ser persona
                  indígena o afrodescendiente" (PM9_6_11)
  ambito          últimos 12 meses discriminada en: 2022 PM9_7_1..9, 2017
                  pm8_7_1..8 (1 sí), sobre toda la población del módulo
  derecho         últimos 5 años le negaron injustificadamente: 2022
                  PM9_1_1..8, 2017 pm8_1_1..7 (1 sí, 2 no, 3 no aplica, 9 NE);
                  cada derecho sobre quienes respondieron sí o no
  derecho_alguno  al menos un derecho negado: 2022 entre personas de 18 y más
                  (como el boletín del INEGI); 2017 entre 12 y más sin contar
                  "estudiar" (así reproduce el 29.2 % publicado)
  respeto         ¿los derechos de las personas indígenas se respetan...?
                  2022 PM1_1, 2017 pm1_1: mucho, algo, poco, nada (sin NS)

Cotejo con lo publicado (boletines 346/18 y 275/23, tabulados): discriminada
en 12 meses 25.3 % (2017) y 28.0 % (2022); al menos un derecho negado 29.2 %
(2017) y 26.9 % (2022, 18 y más); discriminada en al menos un ámbito 20.3 %
(2017).

Salida: src/data/enadis.csv con
  anio, sexo, edad (Todas|12-29|30-59|60+), ambito (Total|Urbano|Rural),
  indicador, categoria, num, den, casos, ee
"""
import os
import sys

import duckdb
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from comun import agregar, anotar_calculado  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CRUDO = os.path.join(RAIZ, "data-raw", "enadis")
SALIDA = os.path.join(RAIZ, "src", "data", "enadis.csv")

MOTIVOS = {1: "Tono de piel", 2: "Manera de hablar", 3: "Peso o estatura", 4: "Forma de vestir o arreglo personal", 5: "Clase social",
           6: "Lugar donde vive", 7: "Creencias religiosas", 8: "Ser mujer u hombre", 9: "Edad", 10: "Orientación sexual",
           11: "Ser persona indígena o afrodescendiente", 12: "Discapacidad", 13: "Alguna enfermedad", 14: "Opiniones políticas",
           15: "Estado civil o situación familiar", 16: "Otro motivo"}
AMBITOS_22 = {1: "Trabajo o escuela", 2: "Familia", 3: "Servicios médicos", 4: "Oficina de gobierno", 5: "Negocio, centro comercial o banco",
              6: "Calle o transporte público", 7: "Redes sociales", 8: "Policía, Ministerio Público o fiscalía", 9: "Otro lugar"}
AMBITOS_17 = {1: "Trabajo o escuela", 2: "Familia", 3: "Servicios médicos", 4: "Oficina de gobierno", 5: "Negocio, centro comercial o banco",
              6: "Calle o transporte público", 7: "Redes sociales", 8: "Otro lugar"}
DERECHOS_22 = {1: "Atención médica o medicamentos", 2: "Atención en una oficina de gobierno", 3: "Entrada o permanencia en un negocio o banco",
               4: "Recibir apoyos de programas sociales", 5: "Estudiar (12 a 35 años)", 6: "Trabajar u obtener un ascenso (18 y más)",
               7: "Crédito, préstamo o tarjeta (18 y más)", 8: "Rentar una vivienda (18 y más)"}
DERECHOS_17 = {k: v for k, v in DERECHOS_22.items() if k <= 7}
RESPETO = {1: "Mucho", 2: "Algo", 3: "Poco", 4: "Nada"}


def indicadores(anio):
    """(indicador, categoria) -> (condición y, condición de universo)."""
    if anio == 2022:
        mot, amb, der, resp = "PM9_6_{:02d}", "PM9_7_{}", "PM9_1_{}", "PM1_1"
        motivos, ambitos, derechos = range(1, 17), AMBITOS_22, DERECHOS_22
        alguno_der, u_alguno = " OR ".join(f"{der.format(k)} = 1" for k in derechos), "EDAD >= 18"
    else:
        mot, amb, der, resp = "pm8_6_{:02d}", "pm8_7_{}", "pm8_1_{}", "pm1_1"
        motivos, ambitos, derechos = range(1, 11), AMBITOS_17, DERECHOS_17
        alguno_der, u_alguno = " OR ".join(f"{der.format(k)} = 1" for k in derechos if k != 5), "TRUE"
    todos = " OR ".join(f"{mot.format(k)} = 1" for k in motivos)
    comparables = " OR ".join(f"{mot.format(k)} = 1" for k in range(1, 11))
    ind = {("discriminacion", "Por algún motivo"): (todos, "TRUE"),
           ("discriminacion", "Por los diez motivos comunes a 2017 y 2022"): (comparables, "TRUE")}
    for k in motivos:
        ind[("motivo", MOTIVOS[k])] = (f"{mot.format(k)} = 1", "TRUE")
    if anio == 2022:
        ind[("por_indigena", "Por ser persona indígena o afrodescendiente")] = ("PM9_6_11 = 1", f"({todos})")
    for k, nombre in ambitos.items():
        ind[("ambito", nombre)] = (f"{amb.format(k)} = 1", "TRUE")
    ind[("ambito", "En al menos un ámbito")] = (" OR ".join(f"{amb.format(k)} = 1" for k in ambitos), "TRUE")
    for k, nombre in derechos.items():
        ind[("derecho", nombre)] = (f"{der.format(k)} = 1", f"{der.format(k)} IN (1, 2)")
    ind[("derecho_alguno", "Al menos un derecho negado")] = (f"({alguno_der})", u_alguno)
    for k, nombre in RESPETO.items():
        ind[("respeto", nombre)] = (f"{resp} = {k}", f"{resp} BETWEEN 1 AND 4")
    return ind


def main():
    partes = []
    for anio in (2017, 2022):
        con = duckdb.connect()
        ruta = os.path.join(CRUDO, f"y{anio}", "indigena.parquet").replace("\\", "/")
        if not os.path.exists(ruta):
            raise SystemExit(f"Falta {ruta}")
        if anio == 2022:
            con.execute(f"""CREATE TABLE c AS SELECT *, FAC_IND AS w, UPM_DIS AS upm, EST_DIS AS est,
              CASE SEXO WHEN 1 THEN 'Hombres' WHEN 2 THEN 'Mujeres' END AS sexo_t, EDAD AS edad_n,
              CASE DOMINIO WHEN 'U' THEN 'Urbano' WHEN 'R' THEN 'Rural' END AS ambito_t
              FROM read_parquet('{ruta}') WHERE RESUL_POB = 'A'""")
        else:
            con.execute(f"""CREATE TABLE c AS SELECT *, factor_per AS w, upm_dis AS upm, est_dis AS est,
              CASE sexo WHEN 1 THEN 'Hombres' WHEN 2 THEN 'Mujeres' END AS sexo_t, edad AS edad_n, edad AS EDAD,
              CASE WHEN tloc = 4 THEN 'Rural' ELSE 'Urbano' END AS ambito_t
              FROM read_parquet('{ruta}') WHERE pm8_6_01 IS NOT NULL""")
        ind = indicadores(anio)
        claves = {f"i{n}": k for n, k in enumerate(ind)}
        cols = ", ".join(f"COALESCE(({y}), FALSE) AS y_i{n}, COALESCE(({u}), FALSE) AS u_i{n}" for n, (y, u) in enumerate(ind.values()))
        con.execute(f"""CREATE TABLE m AS SELECT w, upm, est, sexo_t AS sexo, ambito_t AS ambito,
            CASE WHEN edad_n BETWEEN 12 AND 29 THEN '12-29' WHEN edad_n BETWEEN 30 AND 59 THEN '30-59' WHEN edad_n BETWEEN 60 AND 130 THEN '60+' END AS edad, {cols} FROM c""")
        n = con.execute("SELECT COUNT(*), ROUND(SUM(w)) FROM m").fetchone()
        print(f"[ok] ENADIS {anio}: {n[0]:,} personas indígenas de 12 y más, {n[1]:,.0f} expandidas", file=sys.stderr)
        lista = [{"clave": k, "tema": "enadis", "indicador": k, "universo": ""} for k in claves]
        cols_ind = ", ".join(f"y_{k}, u_{k}" for k in claves)
        for sexo in ("sexo", "'Total'"):
            for edad in ("edad", "'Todas'"):
                for ambito in ("ambito", "'Total'"):
                    filtro = "WHERE edad IS NOT NULL" if edad == "edad" else ""
                    con.execute(f"CREATE OR REPLACE VIEW v AS SELECT {sexo} AS sexo, {edad} AS edad, {ambito} AS ambito, w, upm, est, {cols_ind} FROM m {filtro}")
                    d = agregar(con, "v", ["sexo", "edad", "ambito"], lista)
                    d["categoria"] = d["indicador"].map(lambda k: claves[k][1])
                    d["indicador"] = d["indicador"].map(lambda k: claves[k][0])
                    partes.append(d.assign(anio=anio))
    out = pd.concat(partes, ignore_index=True)
    out = out[out["den"] > 0][["anio", "sexo", "edad", "ambito", "indicador", "categoria", "num", "den", "casos", "ee"]]
    for col in ("num", "den"):
        out[col] = out[col].round(1)
    out["ee"] = pd.to_numeric(out["ee"], errors="coerce").round(6)
    out.to_csv(SALIDA, index=False, encoding="utf-8", lineterminator="\n")
    t = out[(out.sexo == "Total") & (out.edad == "Todas") & (out.ambito == "Total")].set_index(["anio", "indicador", "categoria"])
    p = lambda a, i, c: 100 * t.loc[(a, i, c), "num"] / t.loc[(a, i, c), "den"]  # noqa: E731
    cifras = {"disc_2017": p(2017, "discriminacion", "Por algún motivo"), "disc_2022": p(2022, "discriminacion", "Por algún motivo"),
              "disc_comparable_2022": p(2022, "discriminacion", "Por los diez motivos comunes a 2017 y 2022"),
              "derecho_2017": p(2017, "derecho_alguno", "Al menos un derecho negado"), "derecho_2022": p(2022, "derecho_alguno", "Al menos un derecho negado"),
              "ambito_2017": p(2017, "ambito", "En al menos un ámbito"), "por_indigena_2022": p(2022, "por_indigena", "Por ser persona indígena o afrodescendiente")}
    print("[ok] cotejo: " + ", ".join(f"{k} {v:.2f} %" for k, v in cifras.items()) + " (publicado: 25.3, 28.0, s/p, 29.2, 26.9, 20.3, 29.0)", file=sys.stderr)
    for k, v in cifras.items():
        anotar_calculado("enadis", k, float(v), f"ENADIS, población indígena de 12 años y más, nacional: {k}")
    print(f"[ok] {os.path.relpath(SALIDA, RAIZ)}: {len(out):,} filas", file=sys.stderr)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Coteja las cifras nacionales que calculan los loaders contra las que publica
el INEGI.

Lee `verificaciones.csv` (cifras oficiales transcritas a mano, con la tabla
o comunicado exacto de donde salen y la fecha de consulta) y las compara con
`calculado.csv`, que escriben los loaders de scripts/loaders/ al correr.
Cada fila declara su estado:

  verificado  la cifra oficial existe con el MISMO universo y definición: se
              compara y el script ABORTA si la diferencia supera la tolerancia
  referencia  la cifra oficial existe con otro universo (población de 3 años
              o más contra 6 o más): se muestra la diferencia, no aborta
  pendiente   la cifra oficial todavía no se transcribió: se lista y se pide

Uso:  uv run python src/data/verificar_fuentes.py
"""
import csv
import io
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))


def leer(ruta):
    with io.open(ruta, encoding="utf-8") as h:
        return list(csv.DictReader(h))


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def main():
    verificaciones = leer(os.path.join(AQUI, "verificaciones.csv"))
    ruta_calc = os.path.join(AQUI, "calculado.csv")
    if not os.path.exists(ruta_calc):
        raise SystemExit("Falta src/data/calculado.csv: corre `npm run datos` primero.")
    calculado = {(c["encuesta"], c["clave"]): num(c["valor"]) for c in leer(ruta_calc)}
    fuentes = {f["id"] for f in leer(os.path.join(AQUI, "fuentes.csv"))}

    fallos, pendientes, ok = [], [], 0
    for v in verificaciones:
        llave = (v["encuesta"], v["clave"])
        if v["fuente_id"] not in fuentes:
            fallos.append(f"{v['clave']}: fuente_id {v['fuente_id']} no existe en fuentes.csv")
            continue
        propio = calculado.get(llave)
        oficial = num(v["valor_oficial"])
        if v["estado"] == "pendiente" or oficial is None:
            pendientes.append(f"{v['clave']} ({v['encuesta']} {v['anio']}): calculado {propio:.2f}" if propio is not None
                              else f"{v['clave']}: sin cifra calculada ni oficial")
            continue
        if propio is None:
            fallos.append(f"{v['clave']}: no está en calculado.csv")
            continue
        dif = propio - oficial
        tol = num(v["tolerancia"]) or 1.0
        marca = "ok " if abs(dif) <= tol else "!! "
        print(f"[{marca}{v['estado']:10}] {v['clave']:22} oficial {oficial:6.2f}  calculado {propio:6.2f}  dif {dif:+.2f}  ({v['unidad']})")
        if v["estado"] == "verificado" and abs(dif) > tol:
            fallos.append(f"{v['clave']}: difiere {dif:+.2f} de la cifra oficial (tolerancia {tol})")
        elif abs(dif) <= tol:
            ok += 1

    if pendientes:
        print("\nVerificaciones pendientes (transcribir la cifra oficial en verificaciones.csv):")
        for p in pendientes:
            print("  -", p)
    print(f"\n{ok} cotejos dentro de tolerancia, {len(fallos)} fallos, {len(pendientes)} pendientes.")
    if fallos:
        for f in fallos:
            print("FALLO:", f, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

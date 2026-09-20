"""
generar_portada.py: dibuja src/images/portada-brecha.svg, el gráfico de la
cubierta de la portada, a partir de los MISMOS datos que el tablero.

Es un dumbbell: una fila por indicador central (Censo, ENIGH 2024 y ENDUTIH
2025), un punto por grupo (población que habla lengua indígena y resto) y el
segmento entre ambos como brecha, en el criterio de lengua y con todo el país
junto. Es la forma con la que abre la portada y la que repite cada página, de
modo que la cubierta REPRESENTA el dato y no es un adorno.

El viewBox se ciñe al contenido: la caja de la cubierta usa object-fit:
contain y un lienzo con aire escala el dibujo a media escala (lección 77).

Uso: uv run python scripts/generar_portada.py   (después de npm run datos)
"""
import os

import pandas as pd

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS = os.path.join(RAIZ, "src", "data", "indicadores")
SALIDA = os.path.join(RAIZ, "src", "images", "portada-brecha.svg")

CLAVE = [
    ("censo-vivienda", 2020, "Vive en una vivienda con internet"),
    ("enigh-hogar", 2024, "Vive en un hogar con conexión a internet"),
    ("enigh-hogar", 2024, "Vive en un hogar con computadora o laptop"),
    ("endutih-uso", 2025, "Usa internet"),
    ("endutih-uso", 2025, "Usa celular"),
    ("endutih-uso", 2025, "Usa computadora, laptop o tableta"),
    ("endutih-uso", 2025, "Vive en un hogar con internet"),
]

# Tonos claros sobre la cubierta oscura: los mismos escalones del modo oscuro
# del tablero (base.js), aclarados un paso para leerse sobre el rojo y negro.
ROJO, AZUL, SEG = "#FFB3B8", "#B8D8F7", "rgba(255,255,255,0.55)"


def nacional(tema, anio, indicador):
    d = pd.read_parquet(os.path.join(DATOS, tema + ".parquet"))
    d = d[(d["indicador"] == indicador) & (d["anio"] == anio) & (d["decil"] == "Todos") & (d["escolaridad"] == "Todos")]
    ind = d[d["lengua"] == "Sí"]
    resto = d[d["lengua"] == "No"]
    return 100 * ind["num"].sum() / ind["den"].sum(), 100 * resto["num"].sum() / resto["den"].sum()


def main():
    filas = [nacional(*c) for c in CLAVE]
    n = len(filas)
    ancho, paso, margen = 300.0, 13.0, 8.0
    alto = paso * (n - 1) + 2 * margen
    x = lambda v: 6 + v / 100 * (ancho - 12)  # noqa: E731
    partes = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho:.0f} {alto:.0f}" width="{ancho:.0f}" height="{alto:.0f}">']
    partes.append('<g class="portada-brecha">')
    for i, (a, b) in enumerate(filas):
        y = margen + i * paso
        partes.append(f'<line x1="{x(a):.1f}" y1="{y:.1f}" x2="{x(b):.1f}" y2="{y:.1f}" stroke="{SEG}" stroke-width="2.6" stroke-linecap="round"/>')
        partes.append(f'<circle cx="{x(a):.1f}" cy="{y:.1f}" r="3.6" fill="{ROJO}"/>')
        partes.append(f'<circle cx="{x(b):.1f}" cy="{y:.1f}" r="3.6" fill="{AZUL}"/>')
    partes.append("</g></svg>")
    with open(SALIDA, "w", encoding="utf-8", newline="\n") as h:
        h.write("\n".join(partes) + "\n")
    for c, (a, b) in zip(CLAVE, filas):
        print(f"  {c[2]:<48} {a:5.1f}  {b:5.1f}")
    print(f"[ok] {SALIDA}")


if __name__ == "__main__":
    main()

"""Tabla de colonias sin geometría, para las gráficas y los filtros del mapa.

Escribe src/data/colonias_resumen.csv, que SÍ se versiona. Antes este script
vivía en src/data/ como data loader de Framework y corría en cada build, pero
lee colonias_cdmx.geojson, que no se versiona (pesa 6 MB y se regenera): en
GitHub Actions ese archivo no existe y el build abortaba. Ahora se corre a
mano después de construir_manzanas.py y el build ya no necesita Python.

La portada y la página del mapa solo necesitan las propiedades: leer el GeoJSON
completo les costaba 5.4 MB de descarga por las geometrías, que ahí no se
dibujan. El mapa sí las necesita y las obtiene de las teselas, no de aquí.

Las columnas se derivan del propio GeoJSON y NO se listan a mano. Cuando estaban
fijas, agregar los desgloses por sexo al pipeline dejó el CSV sin ellos: la
página pedía `tasa_p3ym_hli_f`, recibía undefined en cada fila, y la escala del
mapa colapsaba a una sola clase sin lanzar ningún error.
"""
import csv
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / "src/data/colonias_cdmx.geojson"
DESTINO = RAIZ / "src/data/colonias_resumen.csv"

if not ORIGEN.exists():
    sys.exit(f"Falta {ORIGEN}. Corre antes scripts/construir_manzanas.py")

datos = json.loads(ORIGEN.read_text(encoding="utf8"))
filas = [f["properties"] for f in datos["features"]]

if not filas:
    sys.exit(f"{ORIGEN} no tiene features")

# Orden estable: primero los identificadores, luego todo lo demás como venga.
IDENTIFICADORES = ["cve_colonia", "colonia", "alcaldia_col", "pueblo_originario",
                   "nombre_pueblo", "etnia", "lengua"]
presentes = list(filas[0].keys())
columnas = ([c for c in IDENTIFICADORES if c in presentes]
            + [c for c in presentes if c not in IDENTIFICADORES])

with DESTINO.open("w", encoding="utf8", newline="") as salida:
    escritor = csv.DictWriter(salida, fieldnames=columnas, extrasaction="ignore", lineterminator="\n")
    escritor.writeheader()
    for fila in filas:
        escritor.writerow(fila)
print(f"[ok] {DESTINO}: {len(filas):,} colonias, {len(columnas)} columnas")

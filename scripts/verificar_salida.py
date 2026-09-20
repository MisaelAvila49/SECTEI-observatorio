"""Comprobaciones sobre las salidas de construir_manzanas.py.

Se corre después del pipeline para confirmar que las cifras publicadas cuadran
con la fuente y que los valores suprimidos siguen siendo nulos.
"""
import warnings
from pathlib import Path

import geopandas as gpd

warnings.filterwarnings("ignore")

RAIZ = Path(__file__).resolve().parent.parent
mz = gpd.read_file(RAIZ / "src/data/manzanas_cdmx.geojson")
col = gpd.read_file(RAIZ / "src/data/colonias_cdmx.geojson")

print(f"manzanas {len(mz):,} | colonias {len(col):,}")
print(f"POBTOT   manzana {int(mz.POBTOT.sum()):,} | colonia {int(col.POBTOT.sum()):,}")
print(f"PHOG_IND manzana {int(mz.PHOG_IND.sum()):,} | colonia {int(col.PHOG_IND.sum()):,}")
print(f"tasa CDMX: {100 * mz.PHOG_IND.sum() / mz.POBTOT.sum():.2f} %")

print(f"\nsuprimidos (PHOG_IND nulo): {int(mz.PHOG_IND.isna().sum()):,} manzanas")
print(f"tasa nula donde no hay dato o no hay gente: {int(mz.tasa_phog_ind.isna().sum()):,}")

o = col[col.pueblo_originario]
r = col[~col.pueblo_originario]
print(f"\npueblos y barrios originarios: {len(o)} colonias")
print(f"  población {int(o.POBTOT.sum()):,} | en hogar indígena {int(o.PHOG_IND.sum()):,}"
      f" | tasa {100 * o.PHOG_IND.sum() / o.POBTOT.sum():.2f} %")
print(f"resto de la ciudad: {len(r)} colonias")
print(f"  población {int(r.POBTOT.sum()):,} | en hogar indígena {int(r.PHOG_IND.sum()):,}"
      f" | tasa {100 * r.PHOG_IND.sum() / r.POBTOT.sum():.2f} %")

print("\nColonias con mayor tasa (mínimo 500 habitantes):")
top = col[col.POBTOT >= 500].nlargest(10, "tasa_phog_ind")
for _, f in top.iterrows():
    marca = "  [originario]" if f.pueblo_originario else ""
    print(f"  {f.tasa_phog_ind:5.1f} %  {f.colonia[:38]:<38} "
          f"{f.alcaldia_col[:18]:<18} pob {int(f.POBTOT):>7,}{marca}")

geom_malas = int((~mz.geometry.is_valid).sum())
print(f"\ngeometrías inválidas en manzanas: {geom_malas}")
print(f"rango de tasa_phog_ind: {mz.tasa_phog_ind.min():.2f} a {mz.tasa_phog_ind.max():.2f}")

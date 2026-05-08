"""
find_pez_gordo.py - Análisis para identificar el "pez gordo"
Persona natural (CC) con contratos en 10+ entidades, mayor monto acumulado, con domicilio.
"""
import pandas as pd
import numpy as np
import glob, os, warnings, sys
warnings.filterwarnings("ignore")

base = r"E:\Documents\PROYECTOS\AgencIA\thegu\RETO"
CSV = glob.glob(os.path.join(base, "**", "*.csv"), recursive=True)[0]
print(f"CSV: {CSV}")
print("Cargando...")

df = pd.read_csv(CSV, encoding="utf-8", low_memory=False, dtype=str, on_bad_lines="skip")
df.columns = df.columns.str.strip().str.strip('"')
print(f"Shape: {df.shape[0]:,} x {df.shape[1]}")

# Limpiar y convertir valor
df["_valor"] = (
    df["Valor del Contrato"]
    .str.replace(r'[\$,\s"]', '', regex=True)
    .str.replace(r'[^0-9.\-]', '', regex=True)
)
df["_valor"] = pd.to_numeric(df["_valor"], errors="coerce").fillna(0)

# Limpiar columnas clave
df["_tipo_doc"] = df["TipoDocProveedor"].str.strip().str.upper()
df["_doc"] = df["Documento Proveedor"].str.strip()
df["_entidad"] = df["Nombre Entidad"].str.strip().str.upper()
df["_domicilio"] = df["Domicilio Representante Legal"].str.strip()
df["_nombre"] = df["Proveedor Adjudicado"].str.strip()

# Verificar valores de TipoDocProveedor
print("\nTipos de documento únicos:")
print(df["_tipo_doc"].value_counts().head(10))

# Filtrar SOLO cédulas de ciudadanía
cc_mask = df["_tipo_doc"].str.contains("CEDULA|CÉDULA|CC|C.C", na=False)
df_cc = df[cc_mask].copy()
print(f"\nRegistros con Cédula de Ciudadanía: {len(df_cc):,}")

# Filtrar los que tienen domicilio registrado
df_cc_dom = df_cc[df_cc["_domicilio"].notna() & (df_cc["_domicilio"] != "") & (df_cc["_domicilio"] != "NaN")].copy()
print(f"Con domicilio: {len(df_cc_dom):,}")

# Por cada cédula: contar entidades distintas, contratos, monto total
agg = df_cc_dom.groupby("_doc").agg(
    nombre=("_nombre", "first"),
    n_entidades=("_entidad", "nunique"),
    n_contratos=("_entidad", "count"),
    monto_total=("_valor", "sum"),
    domicilio=("_domicilio", "first"),
).reset_index()

# Condición: 10+ entidades distintas
candidatos = agg[agg["n_entidades"] >= 10].copy()
print(f"\nCC con 10+ entidades distintas: {len(candidatos)}")

if len(candidatos) == 0:
    print("Ninguno con domicilio y 10+ entidades. Revisando sin filtro domicilio...")
    agg2 = df_cc.groupby("_doc").agg(
        nombre=("_nombre", "first"),
        n_entidades=("_entidad", "nunique"),
        n_contratos=("_entidad", "count"),
        monto_total=("_valor", "sum"),
        domicilio=("_domicilio", "first"),
    ).reset_index()
    candidatos = agg2[agg2["n_entidades"] >= 10].copy()
    print(f"Sin filtro domicilio, CC con 10+ entidades: {len(candidatos)}")

# Ordenar por monto total descendente
candidatos = candidatos.sort_values("monto_total", ascending=False)
print(f"\nTop 10 candidatos:")
print(candidatos[["_doc","nombre","n_entidades","n_contratos","monto_total","domicilio"]].head(10).to_string())

# El ganador: mayor monto, 10+ entidades, con domicilio
ganador_row = candidatos.iloc[0]
cedula = ganador_row["_doc"]
print(f"\n{'='*60}")
print(f"GANADOR: {ganador_row['nombre']}")
print(f"Cédula:  {cedula}")
print(f"Domicilio: {ganador_row['domicilio']}")
print(f"Entidades: {ganador_row['n_entidades']}")
print(f"Contratos: {ganador_row['n_contratos']}")
print(f"Monto total: ${ganador_row['monto_total']:,.0f}")
print(f"{'='*60}")

# Detalle de sus contratos
contratos_ganador = df_cc[df_cc["_doc"] == cedula].copy()

print("\nEntidades contratantes:")
ent_detail = contratos_ganador.groupby("_entidad")["_valor"].agg(["sum","count"]).sort_values("sum", ascending=False)
for ent, row in ent_detail.head(15).iterrows():
    print(f"  {ent[:60]:60} | contratos: {row['count']:3} | ${row['sum']:>20,.0f}")

# Supervisores (con cédula)
print("\nSupervisores:")
sup_cols = ["Nombre supervisor", "Número de documento supervisor", "Tipo de documento supervisor"]
for c in sup_cols:
    if c not in df.columns:
        print(f"  Columna '{c}' no encontrada")

sups = contratos_ganador[sup_cols].dropna(subset=["Nombre supervisor"]).copy()
sups = sups[sups["Nombre supervisor"].str.strip() != ""]
sups_unique = sups.drop_duplicates(subset=["Número de documento supervisor"]).head(10)
for _, s in sups_unique.iterrows():
    print(f"  {str(s.get('Nombre supervisor',''))[:50]:50} | Doc: {s.get('Número de documento supervisor','N/A')} | Tipo: {s.get('Tipo de documento supervisor','N/A')}")

# Muestra de contratos del ganador
print("\nMuestra de contratos:")
cols_show = ["Nombre Entidad", "Fecha de Firma", "Valor del Contrato", "Tipo de Contrato", "Descripcion del Proceso"]
cols_show = [c for c in cols_show if c in df.columns]
print(contratos_ganador[cols_show].head(10).to_string())

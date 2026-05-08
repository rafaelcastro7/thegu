"""
find_pez_gordo2.py - Análisis refinado: solo CC reales, persona natural, con domicilio
"""
import pandas as pd
import numpy as np
import re
import glob, os, warnings
warnings.filterwarnings("ignore")

base = r"E:\Documents\PROYECTOS\AgencIA\thegu\RETO"
CSV = glob.glob(os.path.join(base, "**", "*.csv"), recursive=True)[0]
print("Cargando CSV...")
df = pd.read_csv(CSV, encoding="utf-8", low_memory=False, dtype=str, on_bad_lines="skip")
df.columns = df.columns.str.strip().str.strip('"')

# Convertir valor
df["_valor"] = (
    df["Valor del Contrato"]
    .str.replace(r'[\$,\s"]', '', regex=True)
    .str.replace(r'[^0-9.\-]', '', regex=True)
)
df["_valor"] = pd.to_numeric(df["_valor"], errors="coerce").fillna(0)

df["_tipo_doc"] = df["TipoDocProveedor"].str.strip()
df["_doc"] = df["Documento Proveedor"].str.strip()
df["_entidad"] = df["Nombre Entidad"].str.strip().str.upper()
df["_domicilio"] = df["Domicilio Representante Legal"].str.strip()
df["_nombre"] = df["Proveedor Adjudicado"].str.strip()

# Filtro 1: EXACTAMENTE cédula de ciudadanía (case-insensitive)
cc = df[df["_tipo_doc"].str.upper() == "CÉDULA DE CIUDADANÍA"].copy()
print(f"Registros CC: {len(cc):,}")

# Filtro 2: documento numérico válido (5-12 dígitos) → garantiza persona natural
cc = cc[cc["_doc"].str.match(r'^\d{5,12}$', na=False)].copy()
print(f"Con cédula numérica válida: {len(cc):,}")

# Filtro 3: domicilio no vacío ni "No Definido"
cc_dom = cc[
    cc["_domicilio"].notna() &
    (~cc["_domicilio"].str.upper().str.contains("NO DEFINIDO|NaN|^$", na=True, regex=True)) &
    (cc["_domicilio"].str.len() > 5)
].copy()
print(f"Con domicilio válido: {len(cc_dom):,}")

# Agrupación
agg = cc_dom.groupby("_doc").agg(
    nombre=("_nombre", lambda x: x.mode()[0] if len(x) > 0 else x.iloc[0]),
    n_entidades=("_entidad", "nunique"),
    n_contratos=("_entidad", "count"),
    monto_total=("_valor", "sum"),
    domicilio=("_domicilio", "first"),
).reset_index()

# Condición: 10+ entidades
cands = agg[agg["n_entidades"] >= 10].sort_values("monto_total", ascending=False)
print(f"\nCandidatos (CC, domicilio, 10+ entidades): {len(cands)}")
print(cands[["_doc","nombre","n_entidades","n_contratos","monto_total","domicilio"]].head(15).to_string())

if len(cands) == 0:
    # Relajar domicilio — tomar el mejor y buscar domicilio en todos sus registros
    print("\n--- Relajando filtro de domicilio ---")
    agg2 = cc.groupby("_doc").agg(
        nombre=("_nombre", lambda x: x.mode()[0] if len(x) > 0 else x.iloc[0]),
        n_entidades=("_entidad", "nunique"),
        n_contratos=("_entidad", "count"),
        monto_total=("_valor", "sum"),
        domicilio=("_domicilio", lambda x: next((v for v in x if pd.notna(v) and len(str(v)) > 5 and "NO DEFINIDO" not in str(v).upper()), "N/A")),
    ).reset_index()
    cands = agg2[agg2["n_entidades"] >= 10].sort_values("monto_total", ascending=False)
    print(cands[["_doc","nombre","n_entidades","n_contratos","monto_total","domicilio"]].head(15).to_string())

ganador = cands.iloc[0]
cedula = ganador["_doc"]
print(f"\n{'='*70}")
print(f"PEZ GORDO:")
print(f"  Nombre:    {ganador['nombre']}")
print(f"  Cédula:    {cedula}")
print(f"  Domicilio: {ganador['domicilio']}")
print(f"  Entidades: {ganador['n_entidades']}")
print(f"  Contratos: {ganador['n_contratos']}")
print(f"  Monto:     ${ganador['monto_total']:,.0f} COP")
print(f"{'='*70}")

# Detalle entidades
contratos = cc[cc["_doc"] == cedula].copy()
print("\nTodas las entidades contratantes:")
ent_d = contratos.groupby("_entidad")["_valor"].agg(["sum","count"]).sort_values("sum", ascending=False)
for i,(ent,row) in enumerate(ent_d.iterrows(),1):
    print(f"  {i:2}. {ent[:65]:65} | {int(row['count']):3} contratos | ${row['sum']:>20,.0f}")

# Supervisores con CC
print("\nSupervisores:")
sup_cols_try = [
    ("Nombre supervisor", "Número de documento supervisor", "Tipo de documento supervisor"),
    ("Nombre Supervisor", "Número de documento Supervisor", "Tipo de documento Supervisor"),
]
for nc, dc, tc in sup_cols_try:
    if nc in contratos.columns:
        sups = contratos[[nc, dc, tc]].dropna(subset=[nc])
        sups = sups[sups[nc].str.strip() != ""].drop_duplicates(subset=[dc])
        for _, s in sups.head(10).iterrows():
            print(f"  {str(s[nc]).strip()[:50]:50} | CC: {str(s[dc]).strip()} | {str(s[tc]).strip()}")
        break

# Domicilios únicos del ganador
print(f"\nDomicilios registrados para cédula {cedula}:")
doms = contratos["_domicilio"].dropna().unique()
for d in doms[:5]:
    if str(d).upper() not in ("NO DEFINIDO","NAN",""):
        print(f"  {d}")

# Info representante legal
print(f"\nInfo representante legal:")
for col in ["Nombre Representante Legal","Género Representante Legal","Nacionalidad Representante Legal"]:
    if col in contratos.columns:
        vals = contratos[col].dropna().unique()
        print(f"  {col}: {', '.join(str(v) for v in vals[:3])}")

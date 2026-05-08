#!/usr/bin/env python3
"""
pez_gordo.py — Hackathon Nacional COL 5.0 · Stress Test Ciberseguridad
Identifica al contratista persona natural (CC) que:
  1. Tiene contratos firmados en 10 o más entidades públicas distintas
  2. Posee el mayor monto total acumulado entre quienes cumplen la condición 1
  3. Su dirección domiciliaria aparece publicada en el dataset

Uso: python3 pez_gordo.py <ruta_al_csv>
"""

import sys
import os
import pandas as pd
import warnings
warnings.filterwarnings("ignore")


def fmt_cop(v):
    if v >= 1e12:
        return f"${v/1e12:.2f} Billones COP"
    if v >= 1e9:
        return f"${v/1e9:.2f} Miles de millones COP"
    if v >= 1e6:
        return f"${v/1e6:.1f} Millones COP"
    return f"${v:,.0f} COP"


def main(csv_path):
    if not os.path.exists(csv_path):
        print(f"[ERROR] Archivo no encontrado: {csv_path}")
        sys.exit(1)

    print(f"\n{'='*70}")
    print("  PEZ GORDO — Análisis SECOP II · Hackathon Nacional COL 5.0")
    print(f"{'='*70}")
    print(f"  CSV: {os.path.basename(csv_path)}")
    print(f"  Tamaño: {os.path.getsize(csv_path)/1e9:.2f} GB")
    print("  Cargando datos (esto puede tardar 30-60 segundos)...")

    df = pd.read_csv(csv_path, encoding="utf-8", low_memory=False,
                     dtype=str, on_bad_lines="skip")
    df.columns = df.columns.str.strip().str.strip('"')

    print(f"  Registros cargados: {len(df):,}  |  Variables: {df.shape[1]}")

    # ── Limpiar valor del contrato ──────────────────────────────────────────
    df["_valor"] = (
        df["Valor del Contrato"]
        .str.replace(r'[\$,\s"]', '', regex=True)
        .str.replace(r'[^0-9.\-]', '', regex=True)
    )
    df["_valor"] = pd.to_numeric(df["_valor"], errors="coerce").fillna(0)

    df["_tipo_doc"]  = df["TipoDocProveedor"].str.strip()
    df["_doc"]       = df["Documento Proveedor"].str.strip()
    df["_entidad"]   = df["Nombre Entidad"].str.strip().str.upper()
    df["_domicilio"] = df["Domicilio Representante Legal"].str.strip()

    # ── FILTRO 1: Solo Cédula de Ciudadanía ─────────────────────────────────
    cc = df[df["_tipo_doc"].str.upper() == "CÉDULA DE CIUDADANÍA"].copy()
    print(f"\n[F1] Registros con Cédula de Ciudadanía: {len(cc):,}")

    # ── FILTRO 2: Documento numérico válido (persona natural) ───────────────
    cc = cc[cc["_doc"].str.match(r'^\d{5,12}$', na=False)].copy()
    print(f"[F2] Con cédula numérica válida (5-12 dígitos): {len(cc):,}")

    # ── FILTRO 3: Domicilio publicado en dataset ────────────────────────────
    dom_mask = (
        cc["_domicilio"].notna() &
        (~cc["_domicilio"].str.upper().str.contains(
            r'^NO DEFINIDO$|^NAN$|^N/A$|^\s*$', na=True, regex=True)) &
        (cc["_domicilio"].str.len() > 5)
    )
    cc_dom = cc[dom_mask].copy()
    print(f"[F3] Con domicilio válido publicado: {len(cc_dom):,}")

    # ── AGREGACIÓN por cédula ────────────────────────────────────────────────
    agg = cc_dom.groupby("_doc").agg(
        nombre=("Proveedor Adjudicado",
                lambda x: x.mode()[0] if len(x) > 0 else x.iloc[0]),
        n_entidades=("_entidad", "nunique"),
        n_contratos=("_entidad", "count"),
        monto_total=("_valor", "sum"),
        domicilio=("_domicilio", "first"),
    ).reset_index()

    # ── FILTRO 4: 10+ entidades distintas ───────────────────────────────────
    cands = agg[agg["n_entidades"] >= 10].sort_values("monto_total", ascending=False)
    print(f"[F4] Cédulas con 10+ entidades distintas: {len(cands)}")

    if cands.empty:
        print("\n[!] Sin candidatos con domicilio. Buscando sin ese filtro...")
        agg2 = cc.groupby("_doc").agg(
            nombre=("Proveedor Adjudicado",
                    lambda x: x.mode()[0] if len(x) > 0 else x.iloc[0]),
            n_entidades=("_entidad", "nunique"),
            n_contratos=("_entidad", "count"),
            monto_total=("_valor", "sum"),
            domicilio=("_domicilio",
                       lambda x: next(
                           (v for v in x if pd.notna(v) and len(str(v)) > 5
                            and "NO DEFINIDO" not in str(v).upper()),
                           "N/A")),
        ).reset_index()
        cands = agg2[agg2["n_entidades"] >= 10].sort_values("monto_total",
                                                             ascending=False)

    # ── RESULTADO: mayor monto ───────────────────────────────────────────────
    ganador = cands.iloc[0]
    cedula  = ganador["_doc"]

    print(f"\n{'='*70}")
    print(f"  ★  PEZ GORDO IDENTIFICADO  ★")
    print(f"{'='*70}")
    print(f"  Nombre completo   : {ganador['nombre'].strip()}")
    print(f"  Cédula            : {cedula}")
    print(f"  Domicilio         : {ganador['domicilio']}")
    print(f"  N° entidades      : {ganador['n_entidades']}")
    print(f"  N° contratos      : {ganador['n_contratos']}")
    print(f"  Monto acumulado   : {fmt_cop(ganador['monto_total'])}")
    print(f"  Monto (exacto)    : ${ganador['monto_total']:,.0f} COP")
    print(f"{'='*70}")

    # ── Detalle: entidades ───────────────────────────────────────────────────
    contratos = cc[cc["_doc"] == cedula].copy()
    ent_d = (contratos.groupby("_entidad")["_valor"]
             .agg(["sum", "count"])
             .sort_values("sum", ascending=False))

    print(f"\n  ENTIDADES CONTRATANTES ({len(ent_d)}):")
    print(f"  {'#':>3}  {'Entidad':<60}  {'Cttos':>5}  {'Monto':>22}")
    print(f"  {'-'*3}  {'-'*60}  {'-'*5}  {'-'*22}")
    for i, (ent, row) in enumerate(ent_d.iterrows(), 1):
        print(f"  {i:>3}. {ent[:60]:<60}  {int(row['count']):>5}  "
              f"${row['sum']:>21,.0f}")

    # ── Detalle: supervisores ────────────────────────────────────────────────
    sup_cols = ("Nombre supervisor",
                "Número de documento supervisor",
                "Tipo de documento supervisor")
    if all(c in contratos.columns for c in sup_cols):
        sups = (contratos[list(sup_cols)]
                .dropna(subset=["Nombre supervisor"])
                .copy())
        sups = sups[sups["Nombre supervisor"].str.strip() != ""]
        sups = sups.drop_duplicates(subset=["Número de documento supervisor"])
        sups_cc = sups[sups["Tipo de documento supervisor"]
                       .str.upper().str.contains("CEDULA|CÉDULA", na=False)]

        print(f"\n  SUPERVISORES CON CÉDULA ({len(sups_cc)}):")
        print(f"  {'#':>3}  {'Nombre':<50}  {'Cédula':>15}")
        print(f"  {'-'*3}  {'-'*50}  {'-'*15}")
        for i, (_, s) in enumerate(sups_cc.iterrows(), 1):
            print(f"  {i:>3}. {str(s['Nombre supervisor']).strip():<50}  "
                  f"{str(s['Número de documento supervisor']).strip():>15}")

    # ── Info representante legal ─────────────────────────────────────────────
    print(f"\n  REPRESENTANTE LEGAL:")
    for col in ["Nombre Representante Legal",
                "Género Representante Legal",
                "Nacionalidad Representante Legal"]:
        if col in contratos.columns:
            vals = contratos[col].dropna().unique()
            val  = vals[0] if len(vals) > 0 else "N/A"
            label = col.replace("Representante Legal", "").strip()
            print(f"    {label:<30}: {val}")

    print(f"\n{'='*70}")
    print("  Análisis completado.")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 pez_gordo.py <ruta_al_csv>")
        sys.exit(1)
    main(sys.argv[1])

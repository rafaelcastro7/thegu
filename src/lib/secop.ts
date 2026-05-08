/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Contract {
  id_contrato: string;
  referencia_proceso?: string;
  id_adjudicacion?: string;
  url_proceso?: string;
  nombre_entidad: string;
  nit_entidad: string;
  departamento: string;
  ciudad: string;
  modalidad_de_contratacion: string;
  estado_contrato: string;
  objeto_del_contrato: string;
  valor_del_contrato: string;
  nombre_del_contratista: string;
  documento_proveedor: string;
  fecha_de_firma: string;
  year_fiscal?: string;
}

const SECOP_II_API = "https://www.datos.gov.co/resource/p6dx-8zbt.json";

function isBrowserRuntime() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function normalizeEntityName(entityName: string) {
  return entityName.toUpperCase().trim().replace(/\s+/g, " ");
}

function sanitizeLimit(limit: number) {
  if (!Number.isFinite(limit)) return 50;
  return Math.max(1, Math.min(100, Math.floor(limit)));
}

function escapeSoqlString(value: string) {
  return value.replace(/'/g, "''");
}

function mapSecopRecord(record: Record<string, unknown>): Contract {
  const value = (key: string) => record[key]?.toString();
  const processId = value("id_del_proceso") || "N/A";
  const awardId = value("id_adjudicacion");
  const reference = value("referencia_del_proceso");
  const publishedAt = value("fecha_de_publicacion_del") || value("fecha_de_publicacion") || "NO_DATE";
  const amount = value("precio_base") || "0";
  const sourceUrl = value("urlproceso");
  const uniqueContractId =
    awardId ||
    [processId, reference, publishedAt, amount]
      .filter(Boolean)
      .join("::");

  return {
    id_contrato: uniqueContractId,
    referencia_proceso: reference || processId,
    id_adjudicacion: awardId || undefined,
    url_proceso: sourceUrl || undefined,
    nombre_entidad: value("entidad") || "ENTIDAD_DESCONOCIDA",
    nit_entidad: value("nit_entidad") || "N/A",
    departamento: value("departamento_entidad") || "N/A",
    ciudad: value("ciudad_entidad") || "N/A",
    nombre_del_contratista:
      value("nombre_del_proveedor") && value("nombre_del_proveedor") !== "No Definido"
        ? value("nombre_del_proveedor")!
        : value("entidad") || "PROVEEDOR_NO_IDENTIFICADO",
    documento_proveedor: value("nit_del_proveedor_adjudicado") || value("nit_entidad") || "0",
    valor_del_contrato: value("precio_base") || "0",
    fecha_de_firma: publishedAt || new Date().toISOString(),
    objeto_del_contrato: value("descripci_n_del_procedimiento") || value("nombre_del_procedimiento") || "Sin descripción",
    modalidad_de_contratacion: value("modalidad_de_contratacion") || "No definida",
    estado_contrato: value("estado_resumen") || value("estado_del_procedimiento") || "Activo",
  };
}

export async function fetchContractsFromSecop(entityName: string, limit: number = 100): Promise<Contract[]> {
  const name = normalizeEntityName(entityName);
  const safeLimit = sanitizeLimit(limit);
  if (!name) return [];

  const escapedName = escapeSoqlString(name);
  const params = new URLSearchParams({
    "$where": `entidad like '%${escapedName}%' OR nit_entidad like '%${escapedName}%'`,
    "$limit": String(safeLimit),
    "$order": "precio_base DESC",
  });
  const url = `${SECOP_II_API}?${params.toString()}`;

  try {
    console.warn(`[AUDIT_INIT] Connecting to SECOP II for: ${name}`);
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SOCRATA_REJECT] Status ${response.status}: ${errorText}`);
      throw new Error(`SECOP API unavailable: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    return data.map((record) => mapSecopRecord(record));
  } catch (error) {
    console.error("[SECOP_CONNECTIVITY_ERROR]", error);
    return [];
  }
}

export async function fetchContractsByEntity(entityName: string, limit: number = 100): Promise<Contract[]> {
  if (!isBrowserRuntime()) {
    return fetchContractsFromSecop(entityName, limit);
  }

  const params = new URLSearchParams({
    entity: entityName,
    limit: String(sanitizeLimit(limit)),
  });

  try {
    const response = await fetch(`/api/secop/contracts?${params.toString()}`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error("[SECOP_BACKEND_PROXY_ERROR]", error);
    return [];
  }
}

export function groupContractsByProvider(contracts: Contract[]) {
  const groups: Record<string, Contract[]> = {};

  contracts.forEach((contract) => {
    const id = contract.documento_proveedor || contract.nit_entidad || "ID_GENERICO";
    const key = `REF:${id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push({
      ...contract,
      nombre_del_contratista: contract.nombre_del_contratista || contract.nombre_entidad || "PROVEEDOR_NO_IDENTIFICADO",
    });
  });

  return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
}

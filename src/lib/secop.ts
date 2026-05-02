/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Contract {
  id_contrato: string;
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

// Socrata API Endpoint for SECOP II
const SECOP_II_API = "https://www.datos.gov.co/resource/p6dx-8zbt.json";

export async function fetchContractsByEntity(entityName: string, limit: number = 100): Promise<Contract[]> {
  const name = entityName.toUpperCase().trim();
  // Consulta SoQL optimizada para Procesos de Contratación SECOP II
  // Usamos 'entidad' en lugar de 'nombre_entidad' para este dataset
  const entityFilter = `entidad like '%${name}%' OR nit_entidad like '%${name}%'`;
  const query = `$where=${encodeURIComponent(entityFilter)}&$limit=${limit}&$order=precio_base DESC`;
  const url = `${SECOP_II_API}?${query}`;
  
  try {
    console.warn(`[AUDIT_INIT] Connecting to SECOP II Neural Node (p6dx-8zbt) for: ${name}`);
    console.log(`[NETWORK_PULSE] GET ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SOCRATA_REJECT] Status ${response.status}: ${errorText}`);
      throw new Error(`API SECOP Inalcanzable: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`[ZERO_RECORDS] No active processes found for: ${name}`);
      return [];
    }

    console.log(`[INGESTAR_HALLAZGO] ${data.length} records retrieved from verified source.`);

    return data.map((d: any) => ({
      id_contrato: d.id_del_proceso || "N/A",
      nombre_entidad: d.entidad || "ENTIDAD_DESCONOCIDA",
      nit_entidad: d.nit_entidad || "N/A",
      departamento: d.departamento_entidad || "N/A",
      ciudad: d.ciudad_entidad || "N/A",
      nombre_del_contratista: d.nombre_del_proveedor && d.nombre_del_proveedor !== "No Definido" 
        ? d.nombre_del_proveedor 
        : d.entidad, // Fallback to entity if vendor not defined (common in fractioning contexts)
      documento_proveedor: d.nit_del_proveedor_adjudicado || d.nit_entidad || "0",
      valor_del_contrato: d.precio_base?.toString() || "0",
      fecha_de_firma: d.fecha_de_publicacion_del || d.fecha_de_publicacion || new Date().toISOString(),
      objeto_del_contrato: d.descripci_n_del_procedimiento || d.nombre_del_procedimiento || "Sin descripción",
      modalidad_de_contratacion: d.modalidad_de_contratacion || "No definida",
      estado_contrato: d.estado_resumen || d.estado_del_procedimiento || "Activo"
    }));
  } catch (error) {
    console.error("[CRITICAL_FAIL] SECOP Connectivity Error:", error);
    return [];
  }
}

export function groupContractsByProvider(contracts: Contract[]) {
  const groups: Record<string, Contract[]> = {};
  
  contracts.forEach(c => {
    // Usamos documento_proveedor (NIT) o en su defecto el nombre para agrupar
    const id = c.documento_proveedor || c.nit_entidad || "ID_GENERICO";
    const key = `REF:${id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push({
      ...c,
      nombre_del_contratista: c.nombre_del_contratista || c.nombre_entidad || "PROVEEDOR_NO_IDENTIFICADO"
    });
  });

  // Retornamos todos los grupos, priorizando los que tienen más contratos (mayor sospecha)
  return Object.entries(groups)
    .sort((a, b) => b[1].length - a[1].length);
}

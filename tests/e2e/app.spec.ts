import { expect, test } from "@playwright/test";

test("loads a persisted finding and generates a forensic report", async ({ page }) => {
  const contract = {
    id_contrato: "CT-001",
    nombre_entidad: "SENA REGIONAL SANTANDER",
    nit_entidad: "899999034",
    departamento: "Santander",
    ciudad: "Bucaramanga",
    modalidad_de_contratacion: "Contratación Directa",
    estado_contrato: "Activo",
    objeto_del_contrato: "Prestación de servicios profesionales para apoyo a procesos administrativos y técnicos.",
    valor_del_contrato: "120000000",
    nombre_del_contratista: "PROVEEDOR PRUEBA SAS",
    documento_proveedor: "900123456",
    fecha_de_firma: "2026-04-15T00:00:00.000Z",
  };

  await page.addInitScript((payload) => {
    localStorage.setItem("GOB_IA_CACHE_V1", JSON.stringify({
      results: [{
        groupKey: "REF:900123456",
        providerName: "PROVEEDOR PRUEBA SAS",
        contracts: [payload],
        totalValue: 120000000,
        similarityScore: 0.92,
        maxDayDiff: 7,
        risk: "Red",
        quickObservation: "Posible fraccionamiento con concentración de objeto contractual.",
        redFlags: [
          "Identidad de objeto: duplicidad semántica extrema (>85%)",
          "Alta dependencia de contratación directa",
        ],
        detailedFindings: [{
          contractId: "CT-001",
          reasons: ["Cuantía individual significativa", "Modalidad de riesgo: Contratación Directa"],
          evidence: "Objeto: Prestación de servicios profesionales... | Valor: 120000000 | Fecha: 2026-04-15",
          contract: payload,
        }],
        riskScore: 92,
        loadType: "FULL",
      }],
      health: 98.42,
      timestamp: Date.now(),
    }));
  }, contract);

  await page.goto("/");
  await expect(page).toHaveTitle(/BHA/i);
  await expect(page.getByTestId("search-input")).toBeVisible();

  await expect(page.getByTestId("result-card").first()).toBeVisible({ timeout: 180000 });
  await page.getByTestId("result-card").first().click();

  await expect(page.getByText(/EXPORTAR PDF OFICIAL|EXPORT OFFICIAL PDF/i)).toBeVisible({ timeout: 240000 });
});

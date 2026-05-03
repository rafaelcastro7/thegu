export interface LegalContext {
  id: string;
  source: string;
  text: string;
  embedding?: number[];
}

export const LEGAL_KNOWLEDGE_BASE: LegalContext[] = [
  {
    id: "ley-80-art-24-25",
    source: "Ley 80 de 1993, Artículos 24 y 25",
    text: "El fraccionamiento de contratos ocurre cuando una entidad estatal divide una contratación que debió ser objeto de un solo proceso, con el fin de eludir los procedimientos de selección pública por licitación. El principio de planeación obliga a las entidades a consolidar sus necesidades.",
  },
  {
    id: "decreto-1082-2015-planeacion",
    source: "Decreto 1082 de 2015, Título I",
    text: "Establece que las entidades deben realizar estudios y documentos previos que incluyan la descripción de la necesidad y el objeto a contratar. Fragmentar la necesidad para aplicar mínima cuantía o contratación directa es una violación al régimen de competencia y transparencia.",
  },
  {
    id: "ley-1474-anticorrupcion-art90",
    source: "Ley 1474 de 2011, Artículo 90",
    text: "Las conductas que busquen eludir los procedimientos de selección mediante el fraccionamiento de contratos son causales de responsabilidad disciplinaria y fiscal. La reiteración de contratos idénticos en periodos cortos es un indicio de falta de planeación grave.",
  },
  {
    id: "ley-2195-2022-analitica",
    source: "Ley 2195 de 2022, Artículos 14-16",
    text: "Promueve la interoperabilidad y analítica preventiva de datos para detectar irregularidades. Obliga a usar herramientas tecnológicas para la prevención del daño antijurídico. La analítica de datos es prueba válida para iniciar investigaciones preventivas.",
  },
  {
    id: "cce-concepto-c122-2024-fraccionamiento",
    source: "Colombia Compra Eficiente - Concepto C-122-2024",
    text: "La prohibición del fraccionamiento busca evitar que se desconozca la ley de presupuesto. Existe fraccionamiento cuando hay identidad de objeto, unidad de tiempo y unidad de presupuesto, pero se separa la contratación para aplicar regímenes menos rigurosos.",
  },
  {
    id: "oecd-integrity-procurement",
    source: "OECD Recommendation on Public Procurement",
    text: "Las entidades deben monitorizar activamente los indicadores de riesgo de fraccionamiento, incluyendo el fraccionamiento de facturas y órdenes de compra por debajo de los umbrales de competencia. La transparencia debe ser la regla general y no la excepción, evitando el uso excesivo de contrataciones directas.",
  },
  {
    id: "oecd-red-flags-bunching",
    source: "OECD Managing Risks in Public Procurement",
    text: "El agolpamiento de contratos (bunching) justo por debajo de los umbrales legales es un indicador crítico de riesgo de fraude y elusión de competencia. Se recomienda el uso de analítica avanzada para detectar patrones donde múltiples contratos pequeños suman el valor de un proceso mayor que debería ser licitado.",
  },
  {
    id: "consejo-estado-fraccionamiento",
    source: "Consejo de Estado, Sala de lo Contencioso Administrativo, Sección Tercera",
    text: "El fraccionamiento se configura cuando se divide la materia del contrato con el fin de eludir los procesos de licitación pública. No se requiere dolo para su configuración, basta con la vulneración objetiva del régimen de competencia y la transparencia en la selección del contratista.",
  },
];

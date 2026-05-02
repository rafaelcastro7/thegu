# GobIA Auditor: Detección Forense de Fraccionamiento Contractual

Sitema de inteligencia artificial y analítica preventiva desarrollado para la detección de patrones de evasión y anomalías en la contratación pública colombiana (SECOP II).

## 💡 El Problema
El fraccionamiento contractual es una práctica donde se divide una contratación única en múltiples contratos de menor cuantía para eludir procesos de licitación pública, afectando la transparencia y eficiencia del gasto público.

## 🚀 Solución: GobIA Auditor
GobIA Auditor utiliza un pipeline de IA Forense:
1. **Ingesta:** Extracción en tiempo real vía API Socrata (SECOP II).
2. **Heurística:** Agrupamiento por proveedor/entidad y cálculo de ventanas temporales.
3. **Análisis Semántico:** Uso de `text-embedding-04` para detectar objetos contractuales idénticos o sospechosamente similares.
4. **RAG Jurídico:** Generación de informes indiciarios basados en la Ley 80 de 1993, Ley 1474 de 2011 y conceptos de Colombia Compra Eficiente.

## 🛠 Stack Tecnológico
- **Cerebro:** Gemini 2.5 Flash (Google GenAI SDK).
- **Embeddings:** Gemini Embedding 2 Preview.
- **Frontend:** React + Tailwind CSS + Framer Motion (Diseño Estilo "Brutalist Forense").
- **Backend:** Express/Node.js (Proxy API).
- **Data Source:** datos.gov.co (Socrata REST API).

## 🛠 Arquitectura del Sistema
- `/src/lib/secop.ts`: Gestión de conexión con el dataset nacional.
- `/src/lib/analysis.ts`: Motor de lógica de negocio y semáforos de riesgo.
- `/src/lib/gemini.ts`: Integración con LLM y generación de embeddings.
- `/src/lib/ragManager.ts`: Base de conocimiento legal para justificación de hallazgos.

## 📦 Instalación
```bash
npm install
npm run dev
```
*Requiere `GEMINI_API_KEY` configurada en las variables de entorno.*

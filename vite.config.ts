import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-vendor";
          }

          if (id.includes("framer-motion") || id.includes("motion")) {
            return "motion-vendor";
          }

          if (id.includes("recharts")) {
            return "charts-vendor";
          }

          if (id.includes("html2canvas")) {
            return "html2canvas-vendor";
          }

          if (id.includes("jspdf")) {
            return "jspdf-vendor";
          }

          if (id.includes("@huggingface/transformers")) {
            return "transformers-vendor";
          }

          if (id.includes("onnxruntime-web")) {
            return "onnx-vendor";
          }
        },
      },
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== "true",
  },
});

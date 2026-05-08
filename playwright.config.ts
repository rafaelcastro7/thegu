import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 240000,
  use: {
    baseURL: "http://127.0.0.1:3051",
    headless: true,
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3051/api/health",
    reuseExistingServer: true,
    timeout: 240000,
    env: {
      DB_HOST: "localhost",
      DB_PORT: "5433",
      DB_USER: "aiuser",
      DB_PASSWORD: "changeme",
      DB_NAME: "aiagency",
      OLLAMA_HOST: "http://localhost:11434",
      PORT: "3051",
    },
  },
});

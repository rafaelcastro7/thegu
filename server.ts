import { createApp } from "./src/server/app";
import { config } from "./src/server/config";
import { closeDatabase, initDatabase } from "./src/server/database";

async function startServer() {
  await initDatabase();
  const app = await createApp();

  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${config.port} (Ollama: ${config.ollamaHost})`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

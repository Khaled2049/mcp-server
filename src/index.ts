// src/index.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { mcpServer } from "./server";
import { initializeDatabase, shutdownDatabase } from "./database";
import { fetchStudentSpend } from "./graphql/queries";

// Graceful shutdown
const handleShutdown = async (signal: string) => {
  console.error(`[Server] ${signal} received. Shutting down.`);
  await shutdownDatabase();
  process.exit(0);
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

async function startApplication() {
  await initializeDatabase(); // Initialize DB connection pool
  try {
    console.error("[Server] Attempting to start StdioServerTransport...");
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error(
      "[Server] Connected to StdioServerTransport. Listening for messages."
    );
  } catch (e) {
    console.error("[Server] Error starting MCP server:", e);
    await shutdownDatabase(); // Ensure DB is closed even on server startup error
    process.exit(1);
  }

  // const GET_STUDENT_SPEND_VARIABLES = {
  //   guildUuid: "47cbf684-7bfa-49b8-ae70-a80a90006b2f",
  //   employerId: "6307979a-db8d-437a-aa67-7cddd6e23e12",
  //   spendAsOf: "2024-03-21",
  //   capAsOf: "2024-03-11",
  //   product: "TUITION_ASSISTANCE",
  //   programUuid: "81be91c4-997e-499a-ae95-db53a7650223",
  // };
  // fetchStudentSpend(GET_STUDENT_SPEND_VARIABLES);
}

startApplication();

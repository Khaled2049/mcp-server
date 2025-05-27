// src/index.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { mcpServer } from "./server";

async function startApplication() {
  try {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
  } catch (e) {
    process.exit(1);
  }
}

startApplication();

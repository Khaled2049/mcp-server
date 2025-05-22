// src/tools/add.tool.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const addTool = (server: McpServer) => {
  server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => {
    console.error(`[Tool 'add'] Called with a: ${a}, b: ${b}`);
    const result = a + b;
    console.error(`[Tool 'add'] Result: ${result}`);
    return {
      content: [{ type: "text", text: String(result) }],
    };
  });
};

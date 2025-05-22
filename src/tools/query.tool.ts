// src/tools/query.tool.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeQuery } from "../database/queries";
import { QueryResultRow } from "pg"; // Ensure this is imported

export const queryTool = (server: McpServer) => {
  server.tool("query", { sql: z.string() }, async ({ sql }) => {
    console.error(
      `[Tool 'query'] Called with SQL: ${sql.substring(0, 100)}${
        sql.length > 100 ? "..." : ""
      }`
    );
    try {
      const results = await executeQuery<QueryResultRow>(sql);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`[Tool 'query'] Error: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error executing query: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });
};

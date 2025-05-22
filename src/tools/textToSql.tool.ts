// src/tools/textToSql.tool.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getFormattedSchemaForLLM } from "../database/queries";
import { generateSqlFromNaturalLanguage } from "../services/ollama.service";

export const textToSqlTool = (server: McpServer) => {
  server.tool(
    "textToSql",
    {
      naturalQuery: z
        .string()
        .min(3, "Natural query must be at least 3 characters long"),
    },
    async ({ naturalQuery }) => {
      console.error(`[Tool 'textToSql'] Called with query: "${naturalQuery}"`);
      try {
        const schemaText = await getFormattedSchemaForLLM();
        if (schemaText.includes("-- No tables found")) {
          return {
            content: [
              {
                type: "text",
                text: "Error: Database schema is empty or could not be fetched for LLM.",
              },
            ],
            isError: true,
          };
        }

        const sqlQuery = await generateSqlFromNaturalLanguage(
          naturalQuery,
          schemaText
        );

        if (sqlQuery.toLowerCase().startsWith("error:")) {
          return { content: [{ type: "text", text: sqlQuery }], isError: true };
        }

        return { content: [{ type: "text", text: sqlQuery }] };
      } catch (err: unknown) {
        const error = err as Error;
        console.error(`[Tool 'textToSql'] Error: ${error.message}`);
        return {
          content: [
            {
              type: "text",
              text: `Error generating SQL: ${error.message.substring(0, 500)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
};

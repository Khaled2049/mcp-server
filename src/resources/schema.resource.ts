// src/resources/schema.resource.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getFormattedSchemaForLLM } from "../database/queries"; // Import the schema fetching logic

export const schemaResource = (server: McpServer) => {
  server.resource("schema", "schema://main", async (uri) => {
    try {
      const schemaText = await getFormattedSchemaForLLM();
      return {
        contents: [
          {
            uri: uri.href,
            text: schemaText,
          },
        ],
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`[Resource 'schema'] Error: ${error.message}`);
      return {
        contents: [
          { uri: uri.href, text: `Error fetching schema: ${error.message}` },
        ],
      };
    }
  });
};

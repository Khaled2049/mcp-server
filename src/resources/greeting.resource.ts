// src/resources/greeting.resource.ts
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

export const greetingResource = (server: McpServer) => {
  server.resource(
    "greeting",
    new ResourceTemplate("greeting://{name}", { list: undefined }),
    async (uri, { name }) => {
      console.error(`[Resource 'greeting'] Called for name: ${name}`);
      return {
        contents: [
          {
            uri: uri.href,
            text: `Hello, ${name}!`,
          },
        ],
      };
    }
  );
};

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { addTool, queryTool, textToSqlTool, chatTool } from "./tools";
import { greetingResource, schemaResource } from "./resources";

export const mcpServer = new McpServer({
  name: "Hackathon Server",
  version: "1.0.0",
});

console.log("[MCP Server] Instance created.");

// Register all tools
addTool(mcpServer);
queryTool(mcpServer);
textToSqlTool(mcpServer);
chatTool(mcpServer);

// Register all resources
greetingResource(mcpServer);
schemaResource(mcpServer);

console.log("[MCP Server] Tools and resources registered.");

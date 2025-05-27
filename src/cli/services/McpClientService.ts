import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// --- MCP Client Configuration ---
const MCP_SERVER_COMMAND = "ts-node"; // Or your actual server command
const MCP_SERVER_ARGS = ["src/index.ts"]; // Or your actual server arguments (relative to where MCP_SERVER_COMMAND runs)

let clientInstance: Client | null = null;

function getClientInstance(): Client {
  if (!clientInstance) {
    clientInstance = new Client({
      name: "mcp-cli-client-clipanion",
      version: "1.0.0",
    });
  }
  return clientInstance;
}

export async function ensureConnected(): Promise<Client> {
  const client = getClientInstance();

  const transport = new StdioClientTransport({
    command: MCP_SERVER_COMMAND,
    args: MCP_SERVER_ARGS,
  });
  try {
    await client.connect(transport);
  } catch (error) {
    console.error(
      "[CLI] Failed to connect to MCP server. Details:",
      error instanceof Error ? error.message : error
    );
    throw new Error(
      "MCP connection failed. Please check server status and configuration."
    );
  }

  return client;
}

export async function accessResource(resourceUri: string) {
  const transport = new StdioClientTransport({
    command: MCP_SERVER_COMMAND,
    args: MCP_SERVER_ARGS,
  });
  const client = getClientInstance();

  await client.connect(transport);

  try {
    // Send the resources/read request
    const response = await client.readResource({
      uri: resourceUri,
    });

    // Process the resource content
    if (response.content) {
      console.log("Resource content:", response.content);
    } else {
      console.log("Resource not found or empty.");
    }
  } catch (error) {
    console.error("Error accessing resource:", error);
  } finally {
    await client.close();
  }
}

export async function disconnectClient(): Promise<void> {
  const client = getClientInstance();

  try {
    await client.close();
  } catch (error) {
    console.error(
      "[CLI] Error during disconnection:",
      error instanceof Error ? error.message : error
    );
  }
}

export function getMcpClientVersion() {
  return getClientInstance();
}

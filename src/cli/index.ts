import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline"; // For simple interactive input

const MCP_SERVER_COMMAND = "ts-node";
const MCP_SERVER_ARGS = ["src/index.ts"];

const client = new Client({
  name: "mcp-cli-client",
  version: "1.0.0",
});

let isConnected = false;
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "mcp-cli> ",
});

async function connectToMcpServer() {
  if (isConnected) {
    return; // Already connected
  }
  try {
    console.log("[CLI] Attempting to connect to MCP server...");
    const transport = new StdioClientTransport({
      command: MCP_SERVER_COMMAND,
      args: MCP_SERVER_ARGS,
    });
    await client.connect(transport);
    isConnected = true;
    console.log("[CLI] Connected to MCP server. Type 'help' for commands.");
  } catch (error) {
    console.error("[CLI] Failed to connect to MCP server:", error);
    process.exit(1); // Exit if connection fails
  }
}

function displayHelp() {
  console.log(`
Available commands:
  add <num1> <num2>                  - Calls the 'add' tool.
  query <sql_string>                 - Calls the 'query' tool.
  textToSql "<natural_query>"        - Calls the 'textToSql' tool. (Use quotes for multi-word queries)
  greeting <name>                    - Reads the 'greeting' resource.
  schema                             - Reads the 'schema' resource.
  quit / exit                        - Disconnects and exits the CLI.
  help                               - Displays this help message.
`);
}

async function handleCommand(input: string) {
  const parts = input.trim().split(/\s+(.*)/s); // Split into command and rest of line
  const command = parts[0];
  const argsString = parts[1] || "";

  if (!isConnected) {
    console.error("[CLI] Not connected to MCP server. Please try again.");
    return;
  }

  try {
    switch (command.toLowerCase()) {
      case "add": {
        const [aStr, bStr] = argsString.split(/\s+/);
        const a = parseFloat(aStr);
        const b = parseFloat(bStr);
        if (isNaN(a) || isNaN(b)) {
          console.log("Usage: add <num1> <num2>");
          break;
        }
        const result = await client.callTool({
          name: "add",
          arguments: {
            a: 1,
            b: 2,
          },
        });
        console.log("Result:", JSON.stringify(result, null, 2));
        break;
      }
      case "query": {
        const sql = argsString.trim();
        if (!sql) {
          console.log("Usage: query <sql_string>");
          break;
        }
        const result = await client.callTool({
          name: "query",
          arguments: {
            sql: "SELECT * FROM test.payments_dates_config;",
          },
        });
        console.log("Result:", JSON.stringify(result, null, 2));
        break;
      }
      case "texttosql": {
        const naturalQuery = argsString.replace(/^"|"$/g, "").trim(); // Remove surrounding quotes
        if (!naturalQuery) {
          console.log('Usage: textToSql "<natural_query>"');
          break;
        }
        const result = await client.callTool({
          name: "textToSql",
          arguments: {
            naturalQuery: naturalQuery,
          },
        });
        console.log("Result:", JSON.stringify(result, null, 2));
        break;
      }
      case "greeting": {
        const name = argsString.trim();
        if (!name) {
          console.log("Usage: greeting <name>");
          break;
        }
        const result = await client.readResource({
          uri: `greeting://${name}`,
        });
        console.log("Result:", JSON.stringify(result, null, 2));
        break;
      }
      case "schema": {
        const result = await client.readResource({
          uri: "schema://main",
        });
        console.log("Result:", JSON.stringify(result, null, 2));
        break;
      }
      case "help": {
        displayHelp();
        break;
      }
      case "quit":
      case "exit": {
        console.log("[CLI] Disconnecting from server...");
        await client.close();
        console.log("[CLI] Disconnected. Exiting.");
        rl.close();
        process.exit(0);
      }
      case "": // Empty input
        break;
      default:
        console.log(
          `Unknown command: "${command}". Type 'help' for available commands.`
        );
    }
  } catch (error: any) {
    console.error("[CLI] Error executing command:", error.message || error);
    // You might want more detailed error logging here from the MCP error object
  } finally {
    rl.prompt(); // Show prompt again
  }
}

// Main execution flow
(async () => {
  await connectToMcpServer();
  displayHelp();
  rl.prompt();

  rl.on("line", (line) => {
    handleCommand(line);
  }).on("close", () => {
    console.log("[CLI] Exiting.");
    process.exit(0);
  });

  // Graceful shutdown
  const handleShutdown = async (signal: string) => {
    console.log(`\n[CLI] ${signal} received. Disconnecting...`);
    if (isConnected) {
      await client.close();
    }
    rl.close();
    process.exit(0);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
})();

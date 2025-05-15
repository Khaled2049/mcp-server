import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "ts-node", // Or "node" if you are running compiled JS
  args: ["index.ts"], // Path to your server's main file
  // Ensure the CWD for StdioClientTransport is the server's root directory
  // if index.ts is not in the same directory as this client script.
  // options: { cwd: "../path/to/server" }
});

const client = new Client({
  name: "example-client-pg", // Updated client name slightly for clarity
  version: "1.0.0",
});

(async () => {
  try {
    console.log("[Client] Attempting to connect to server...");
    await client.connect(transport);
    console.log("[Client] Connected to server.");

    // 1. Read the existing 'greeting' resource
    console.log("\n[Client] Reading 'greeting' resource...");
    const greetingResource = await client.readResource({
      uri: "greeting://John",
    });
    console.log("[Client] Greeting Resource:", greetingResource);
    if (greetingResource.contents && greetingResource.contents.length > 0) {
      console.log("[Client] Greeting text:", greetingResource.contents[0].text);
    }

    // 2. Call the existing 'add' tool
    console.log("\n[Client] Calling 'add' tool...");
    const addResult = await client.callTool({
      name: "add",
      arguments: {
        a: 1,
        b: 2,
      },
    });
    console.log("[Client] Add Tool Result:", addResult);
    if (
      Array.isArray(addResult.content) &&
      addResult.content.length > 0 &&
      addResult.content[0].type === "text"
    ) {
      console.log("[Client] Sum:", addResult.content[0].text);
    }

    // 3. Read the new 'schema' resource (for PostgreSQL)
    console.log("\n[Client] Reading 'schema' resource...");
    const schemaResource = await client.readResource({
      uri: "schema://main",
    });

    if (schemaResource.contents && schemaResource.contents.length > 0) {
      console.log(
        "[Client] Database Schema Text:\n",
        schemaResource.contents[0].text
      );
    }

    console.log(
      "\n[Client] Calling 'query' tool (example: selecting table names)..."
    );
    try {
      const queryResult = await client.callTool({
        name: "query",
        arguments: {
          //   sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 2;",
          sql: "SELECT * FROM public.novels",
        },
      });
      console.log("[Client] Query Tool Result:", queryResult);
      if (
        Array.isArray(queryResult.content) &&
        queryResult.content.length > 0 &&
        queryResult.content[0].type === "text"
      ) {
        console.log("[Client] Query Output:\n", queryResult.content[0].text);
      }
      if (queryResult.isError) {
        console.error(
          "[Client] Query Tool reported an error in the result object."
        );
      }
    } catch (toolError) {
      console.error("[Client] Error calling 'query' tool:", toolError);
    }
  } catch (error) {
    console.error("[Client] An error occurred:", error);
  } finally {
    // If the SDK does not provide a connection state, just attempt to close the transport
    console.log("\n[Client] Disconnecting...");
    if (typeof transport.close === "function") {
      await transport.close();
      console.log("[Client] Disconnected.");
    } else {
      console.log("[Client] No transport.close() method available.");
    }
  }
})();

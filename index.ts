// index.ts
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Pool, QueryResultRow } from "pg";

console.error("[Server] Initializing MCP server...");

// --- PostgreSQL Pool Setup ---
console.error("[Server] Initializing PostgreSQL connection pool...");
const pool = new Pool({
  user: "myuser",
  host: "localhost",
  database: "novel_platform",
  password: "mypassword",
  port: 5433,
});

pool.on("connect", (client) => {
  console.error("[Server] PostgreSQL pool: new client connected");
});

pool.on("error", (err, client) => {
  console.error("[Server] PostgreSQL pool error:", err);
  // Depending on the error, you might want to handle it more robustly
  // For example, by trying to re-initialize the pool or exiting the application
});

// Helper to execute queries using the pool
const executeQuery = async <T extends QueryResultRow>(
  sql: string,
  params?: any[]
): Promise<T[]> => {
  console.error(
    `[Server] Executing SQL query: ${sql.substring(0, 100)}${
      sql.length > 100 ? "..." : ""
    }${params ? ` with params: ${JSON.stringify(params)}` : ""}`
  );
  try {
    const result = await pool.query(sql, params);
    console.error(`[Server] Query returned ${result.rowCount} rows.`);
    return result.rows as T[];
  } catch (error) {
    console.error(
      `[Server] Error executing query: "${sql.substring(0, 100)}..."`,
      error
    );
    throw error; // Re-throw to be caught by the tool/resource handler
  }
};

// Graceful shutdown for the pool
const shutdown = async (signal: string) => {
  console.error(
    `[Server] ${signal} received. Shutting down. Closing PostgreSQL pool...`
  );
  try {
    await pool.end();
    console.error("[Server] PostgreSQL pool closed.");
  } catch (e) {
    console.error("[Server] Error closing PostgreSQL pool:", e);
  }
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
// --- End PostgreSQL Pool Setup ---

const server = new McpServer({
  name: "PostgreSQL Explorer", // Updated server name
  version: "1.0.0",
});

console.error("[Server] MCP Server instance created.");

// Existing 'add' tool - remains unchanged
server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => {
  console.error(`[Server] Tool 'add' called with a: ${a}, b: ${b}`);
  const result = a + b;
  console.error(`[Server] Tool 'add' result: ${result}`);
  return {
    content: [{ type: "text", text: String(result) }],
  };
});

// Existing 'greeting' resource - remains unchanged
server.resource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  async (uri, { name }) => {
    console.error(`[Server] Resource 'greeting' called for name: ${name}`);
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

server.resource(
  "schema",
  "schema://main", // Simple URI for fetching the main schema
  async (uri) => {
    console.error(`[Server] Resource 'schema' called for URI: ${uri.href}`);
    try {
      // Get all user-defined tables in the 'public' schema
      const tables = await executeQuery<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
      );

      if (tables.length === 0) {
        return {
          contents: [
            {
              uri: uri.href,
              text: "No tables found in 'public' schema.",
            },
          ],
        };
      }

      let schemaText = "Database Schema (public):\n\n";
      for (const table of tables) {
        const tableName = table.table_name;
        schemaText += `Table: ${tableName}\n`;
        // Get columns for the current table
        const columns = await executeQuery<{
          column_name: string;
          data_type: string;
          is_nullable: string;
        }>(
          "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public' ORDER BY ordinal_position",
          [tableName]
        );
        for (const column of columns) {
          schemaText += `  - ${column.column_name}: ${column.data_type} (${
            column.is_nullable === "YES" ? "NULLABLE" : "NOT NULL"
          })\n`;
        }
        schemaText += "\n";
      }

      return {
        contents: [
          {
            uri: uri.href,
            text: schemaText.trim(),
          },
        ],
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`[Server] Error in 'schema' resource: ${error.message}`);
      // Note: MCP resource error handling might have a specific structure.
      // For now, returning error message in text content.
      return {
        contents: [
          {
            uri: uri.href,
            text: `Error fetching schema: ${error.message}`,
          },
        ],
        // isError: true, // If MCP resources support an error flag like tools
      };
    }
  }
);

server.tool(
  "query",
  { sql: z.string() }, // Input schema: expects an object with an SQL string
  async ({ sql }) => {
    console.error(
      `[Server] Tool 'query' called with SQL: ${sql.substring(0, 100)}${
        sql.length > 100 ? "..." : ""
      }`
    );
    try {
      const results = await executeQuery<QueryResultRow>(sql); // Using QueryResultRow for generic results
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2), // Pretty print JSON results
          },
        ],
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`[Server] Error in 'query' tool: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error executing query: ${error.message}`,
          },
        ],
        isError: true, // MCP tool responses can have an isError flag
      };
    }
  }
);
console.error("[Server] Tool 'query' for PostgreSQL registered.");

// --- End New/Modified Database Resources and Tools ---

(async () => {
  try {
    console.error("[Server] Attempting to start StdioServerTransport...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(
      "[Server] Connected to StdioServerTransport. Listening for messages."
    );
  } catch (e) {
    console.error("[Server] Error starting server:", e);
    // Ensure pool is closed on startup error as well, if it was initialized
    if (pool) {
      console.error("[Server] Closing PostgreSQL pool due to startup error...");
      await pool
        .end()
        .catch((poolErr) =>
          console.error(
            "[Server] Error closing pool on startup error:",
            poolErr
          )
        );
    }
    process.exit(1);
  }
})();

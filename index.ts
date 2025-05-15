// index.ts
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Pool, QueryResultRow } from "pg";
// Add this import at the top of your index.ts
import axios, { AxiosError } from "axios";

const pool = new Pool({
  user: "myuser",
  host: "localhost",
  database: "novel_platform",
  password: "mypassword",
  port: 5433,
});

// --- Ollama Configuration ---
const OLLAMA_API_BASE_URL = "http://127.0.0.1:11434";
const OLLAMA_CHAT_API_URL = `${OLLAMA_API_BASE_URL}/api/chat`;
const OLLAMA_MODEL = "qwen3:8b";

pool.on("connect", (client) => {
  console.error("[Server] PostgreSQL pool: new client connected");
});

pool.on("error", (err, client) => {
  console.error("[Server] PostgreSQL pool error:", err);
});

// Helper to execute queries using the pool
const executeQuery = async <T extends QueryResultRow>(
  sql: string,
  params?: any[]
): Promise<T[]> => {
  try {
    const result = await pool.query(sql, params);

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

const server = new McpServer({
  name: "PostgreSQL Explorer",
  version: "1.0.0",
});

console.error("[Server] MCP Server instance created.");

server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => {
  console.error(`[Server] Tool 'add' called with a: ${a}, b: ${b}`);
  const result = a + b;
  console.error(`[Server] Tool 'add' result: ${result}`);
  return {
    content: [{ type: "text", text: String(result) }],
  };
});

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

server.resource("schema", "schema://main", async (uri) => {
  try {
    const schemaText = await getFormattedSchemaForLLM(); // Use the LLM-optimized version
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
    console.error(`[Server] Error in 'schema' resource: ${error.message}`);
    return {
      contents: [
        { uri: uri.href, text: `Error fetching schema: ${error.message}` },
      ],
    };
  }
});

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

server.tool(
  "textToSql",
  {
    naturalQuery: z
      .string()
      .min(3, "Natural query must be at least 3 characters long"),
  },
  async ({ naturalQuery }) => {
    console.error(
      `[Server] Tool 'textToSql' called with query: "${naturalQuery}"`
    );
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

      const systemPrompt = `You are an expert PostgreSQL query writer.
Based on the provided database schema, generate a single, runnable SQL query that directly answers the user's question.
Output ONLY the raw SQL query. Do not include any explanations, comments, or markdown formatting like \`\`\`sql ... \`\`\`.
If the question cannot be answered with the given schema, is ambiguous, or requires modification/unsafe operations not typically derived from a "get" or "show" type question, output "Error: Cannot generate a safe SELECT query from the given request and schema."
Focus on generating SELECT queries. Output the SQL query in a single line without line breaks or indentation. Do not include <thinking> or any other tags.`;

      const userPrompt = `Database Schema:
---
${schemaText}
---
User Question: "${naturalQuery}"

SQL Query:`;

      const payload = {
        model: OLLAMA_MODEL, // Ensure OLLAMA_MODEL is correctly defined (e.g., "llama3" or "llama3:latest")
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        options: {
          temperature: 0.1, // Lower temperature for more deterministic SQL
        },
      };

      console.error(
        `[Server] Sending request to Ollama API via Axios: ${OLLAMA_CHAT_API_URL} with model: ${OLLAMA_MODEL}`
      );
      // console.error("[Server] Ollama request payload:", JSON.stringify(payload, null, 2)); // Uncomment for debugging payload

      const ollamaAxiosResponse = await axios.post(
        OLLAMA_CHAT_API_URL,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          //   timeout: 30000, // Optional: 30-second timeout for the Ollama API call
        }
      );

      // With axios, response data is in .data
      const ollamaResponseData = ollamaAxiosResponse.data as any;
      let sqlQuery = ollamaResponseData.message?.content?.trim();

      let rawOutput = ollamaResponseData.message?.content?.trim();

      if (!rawOutput) {
        console.error(
          "[Server] Ollama response (axios) did not contain expected content:",
          ollamaResponseData
        );
        throw new Error(
          "Failed to extract SQL query from Ollama response. Ensure the model is responding correctly and the response structure is as expected."
        );
      }

      if (!sqlQuery) {
        console.error(
          "[Server] Ollama response (axios) did not contain expected content:",
          ollamaResponseData
        );
        throw new Error(
          "Failed to extract SQL query from Ollama response. Ensure the model is responding correctly and the response structure is as expected."
        );
      }

      sqlQuery = sqlQuery.replace(/^```sql\s*|\s*```$/gi, "").trim(); // Remove potential markdown
      sqlQuery = sqlQuery.replace(/;\s*$/, ""); // Remove trailing semicolon

      console.error(`[Server] Generated SQL from Ollama (axios): ${sqlQuery}`);

      if (sqlQuery.toLowerCase().startsWith("error:")) {
        return { content: [{ type: "text", text: sqlQuery }], isError: true };
      }

      return { content: [{ type: "text", text: sqlQuery }] };
    } catch (err: unknown) {
      let errorMessage = "Error generating SQL";
      let loggableError = err;

      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<any>;
        console.error(
          `[Server] Axios error calling Ollama API: ${axiosError.message}`
        );
        if (axiosError.response) {
          console.error(
            "[Server] Ollama API Response Status:",
            axiosError.response.status
          );
          console.error(
            "[Server] Ollama API Response Data:",
            JSON.stringify(axiosError.response.data, null, 2)
          );
          // Try to get a more specific error message from Ollama's response
          const ollamaError =
            axiosError.response.data?.error ||
            (typeof axiosError.response.data === "string"
              ? axiosError.response.data
              : axiosError.message);
          errorMessage = `Ollama API Error (${axiosError.response.status}): ${ollamaError}`;
        } else if (axiosError.request) {
          console.error(
            "[Server] Ollama API No Response (Axios): The request was made but no response was received."
          );
          errorMessage = `No response from Ollama API. Is it running at ${OLLAMA_CHAT_API_URL}? Details: ${axiosError.message}`;
        } else {
          errorMessage = `Error setting up Ollama API request (Axios): ${axiosError.message}`;
        }
        loggableError = {
          // Create a serializable error object for logging/returning
          message: axiosError.message,
          code: axiosError.code,
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        };
      } else if (err instanceof Error) {
        console.error(
          `[Server] Non-Axios error in 'textToSql' tool: ${err.message}`
        );
        errorMessage = err.message;
        loggableError = { message: err.message, stack: err.stack };
      } else {
        console.error(`[Server] Unknown error in 'textToSql' tool:`, err);
        errorMessage = "An unknown error occurred.";
        loggableError = String(err);
      }

      console.error(
        `[Server] Full error details for 'textToSql':`,
        JSON.stringify(loggableError, null, 2)
      );

      return {
        content: [
          {
            type: "text",
            text: `Error generating SQL: ${errorMessage.substring(0, 500)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function getFormattedSchemaForLLM(): Promise<string> {
  console.error("[Server] Fetching formatted DDL-like schema for LLM...");
  const tables = await executeQuery<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );

  if (tables.length === 0) {
    return "-- No tables found in 'public' schema.";
  }

  let schemaString = "-- PostgreSQL Schema for context:\n";
  for (const table of tables) {
    const tableName = table.table_name;
    schemaString += `\nCREATE TABLE public.${tableName} (\n`;

    const columns = await executeQuery<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
      character_maximum_length: number | null;
    }>(
      `SELECT 
               c.column_name, 
               c.data_type, 
               c.is_nullable, 
               c.column_default,
               c.character_maximum_length
           FROM information_schema.columns c
           WHERE c.table_name = $1 AND c.table_schema = 'public' 
           ORDER BY c.ordinal_position`,
      [tableName]
    );

    const columnDefinitions = columns.map((col) => {
      let definition = `  ${col.column_name} ${col.data_type}`;
      if (col.character_maximum_length) {
        definition += `(${col.character_maximum_length})`;
      }
      if (col.is_nullable === "NO") {
        definition += " NOT NULL";
      }
      if (col.column_default) {
        definition += ` DEFAULT ${col.column_default}`;
      }
      return definition;
    });
    schemaString += columnDefinitions.join(",\n");

    const pkInfo = await executeQuery<{ column_name: string }>(
      `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = $1 AND tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position;
      `,
      [tableName]
    );

    if (pkInfo.length > 0) {
      schemaString += `,\n  PRIMARY KEY (${pkInfo
        .map((pk) => pk.column_name)
        .join(", ")})`;
    }
    schemaString += "\n);\n";
  }
  console.error("[Server] Formatted DDL-like schema fetched.");
  return schemaString.trim();
}

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

// src/database/queries.ts
import { Pool, QueryResultRow } from "pg";
import { pool } from "./index"; // Import the shared pool instance

export const executeQuery = async <T extends QueryResultRow>(
  sql: string,
  params?: any[]
): Promise<T[]> => {
  try {
    const result = await pool.query(sql, params);
    return result.rows as T[];
  } catch (error) {
    console.error(
      `[DB Query] Error executing query: "${sql.substring(0, 100)}..."`,
      error
    );
    throw error;
  }
};

export async function getFormattedSchemaForLLM(
  schemaName: string = "test"
): Promise<string> {
  console.error(
    `[DB Query] Fetching formatted DDL-like schema for LLM from schema: '${schemaName}'...`
  );
  const tables = await executeQuery<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name",
    [schemaName]
  );

  if (tables.length === 0) {
    return `-- No tables found in '${schemaName}' schema.`;
  }

  let schemaString = `-- PostgreSQL Schema for context from schema '${schemaName}':\n`;
  for (const table of tables) {
    const tableName = table.table_name;
    schemaString += `\nCREATE TABLE ${schemaName}.${tableName} (\n`;

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
           WHERE c.table_name = $1 AND c.table_schema = $2
           ORDER BY c.ordinal_position`,
      [tableName, schemaName]
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
        // Ensure default values are quoted correctly for string types, etc.
        const defaultVal = col.column_default;
        if (typeof defaultVal === "string" && !defaultVal.startsWith("'")) {
          // Basic check for strings that might need quoting
          definition += ` DEFAULT ${defaultVal}`; // Let PG handle system functions like 'now()'
        } else {
          definition += ` DEFAULT ${defaultVal}`;
        }
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
        WHERE tc.table_name = $1 AND tc.table_schema = $2 AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position;
      `,
      [tableName, schemaName]
    );

    if (pkInfo.length > 0) {
      schemaString += `,\n  PRIMARY KEY (${pkInfo
        .map((pk) => pk.column_name)
        .join(", ")})`;
    }
    schemaString += "\n);\n";
  }
  console.error("[DB Query] Formatted DDL-like schema fetched.");
  return schemaString.trim();
}

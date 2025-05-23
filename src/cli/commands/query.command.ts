// src/cli/commands/add.command.ts
import { Command, Option } from "clipanion";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { AbstractMcpCommand } from "./AbstractMcpCommand";
import { initializeDatabase, shutdownDatabase } from "../../database";

export class QueryCommand extends AbstractMcpCommand {
  static paths = [["query"]];
  static usage = Command.Usage({
    description: "Calls the 'query' tool with an SQL string.",
    examples: [["Executes an SQL query", '$0 query "SELECT * FROM users"']],
  });

  sqlString = Option.String({
    name: "sql_string",
    required: true,
  });

  async runMcpCommand(client: Client) {
    await initializeDatabase(); // Initialize DB connection pool
    const result = await client.callTool({
      name: "query",
      arguments: { sql: this.sqlString }, // Use provided SQL string
    });
    this.context.stdout.write(
      "Result: " + JSON.stringify(result, null, 2) + "\n"
    );
    process.on("SIGINT", () => this.handleShutdown("SIGINT"));
    process.on("SIGTERM", () => this.handleShutdown("SIGTERM"));
  }

  // Graceful shutdown
  async handleShutdown(signal: string) {
    await shutdownDatabase();
    process.exit(0);
  }
}

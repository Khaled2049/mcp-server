import { Command, Option } from "clipanion";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { AbstractMcpCommand } from "./AbstractMcpCommand";
import { initializeDatabase, shutdownDatabase } from "../../database";

export class TextToSqlCommand extends AbstractMcpCommand {
  static paths = [["textToSql"]];
  static usage = Command.Usage({
    description:
      "Calls the 'textToSql' tool to convert a natural language query to SQL.",
    examples: [
      [
        "Converts natural language to SQL",
        '$0 textToSql "show me all active users created this month"',
      ],
    ],
  });

  naturalQuery = Option.String({
    name: "natural_query",
    required: true,
  });

  async runMcpCommand(client: Client) {
    await initializeDatabase(); // Initialize DB connection pool
    const result = await client.callTool({
      name: "textToSql",
      arguments: { naturalQuery: this.naturalQuery },
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

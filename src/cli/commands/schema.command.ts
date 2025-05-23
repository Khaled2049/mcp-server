import { Command } from "clipanion";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { AbstractMcpCommand } from "./AbstractMcpCommand";
import { initializeDatabase, shutdownDatabase } from "../../database";

export class SchemaCommand extends AbstractMcpCommand {
  static paths = [["schema"]];
  static usage = Command.Usage({
    description: "Reads the 'schema' resource (e.g., database schema).",
    examples: [["Fetches the main schema", "$0 schema"]],
  });

  async runMcpCommand(client: Client) {
    await initializeDatabase(); // Initialize DB connection pool
    const result = await client.readResource({
      uri: "schema://main", // Assuming 'main' is the identifier for your primary schema
    });
    this.context.stdout.write(
      "Result: " + JSON.stringify(result, null, 2) + "\n"
    );
  }
  // Graceful shutdown
  async handleShutdown(signal: string) {
    await shutdownDatabase();
    process.exit(0);
  }
}

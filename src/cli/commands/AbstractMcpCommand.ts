// src/cli/commands/AbstractMcpCommand.ts
import { Command } from "clipanion";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  ensureConnected,
  disconnectClient,
} from "../services/McpClientService";

export abstract class AbstractMcpCommand extends Command {
  async execute() {
    try {
      const client = await ensureConnected();
      await this.runMcpCommand(client);
      return 0; // Success
    } catch (error: any) {
      this.context.stderr.write(
        `[CLI] Error: ${error.message || "An unknown error occurred."}\n`
      );
      if (error.cause) {
        this.context.stderr.write(`Cause: ${error.cause}\n`);
      }
      return 1; // Failure
    } finally {
      await disconnectClient();
    }
  }

  /**
   * Abstract method to be implemented by subclasses.
   * This method contains the core logic of the command and assumes the MCP client is connected.
   * @param client The connected MCP Client instance.
   */
  abstract runMcpCommand(client: Client): Promise<void>;
}

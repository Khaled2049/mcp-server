import { Command, Option } from "clipanion";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { AbstractMcpCommand } from "./AbstractMcpCommand";
import { initializeDatabase, shutdownDatabase } from "../../database";
import { ChatMessage } from "../../services/ollama.service";

export class InteractionCommand extends AbstractMcpCommand {
  static paths = [["interaction"]];

  static usage = Command.Usage({
    description:
      "Sends a natural language query to the MCP server's interaction tool for LLM orchestration.",
    examples: [
      [
        "Ask a general question",
        '$0 interact "What is the capital of France?"',
      ],
      [
        "Ask a database-related question",
        '$0 interact "Show me the names of all users."',
      ],
      [
        "Continue a conversation with history",
        '$0 interact "Tell me more about it." --history \'[{"role":"user","content":"Hi"},{"role":"assistant","content":"Hello! How can I help you today?"}]\'',
      ],
    ],
  });

  userQuery = Option.String({
    name: "query", // The name of the option, e.g., `$0 interact --query "..."`
    required: true,
  });

  history = Option.String({
    name: "history",
    required: false,
  });

  async runMcpCommand(client: Client) {
    console.log("Running interaction command...");
    let chatHistory: ChatMessage[] = [];
    if (this.history) {
      try {
        chatHistory = JSON.parse(this.history);

        if (
          !Array.isArray(chatHistory) ||
          !chatHistory.every(
            (msg) =>
              typeof msg === "object" && "role" in msg && "content" in msg
          )
        ) {
          throw new Error(
            "History must be a JSON array of objects with 'role' and 'content'."
          );
        }
        console.log("[Client] Parsed conversation history.");
      } catch (error: any) {
        this.context.stderr.write(`Error parsing history: ${error.message}\n`);
        return; // Exit if history is invalid
      }
    }

    try {
      console.log("Calling interaction tool...");
      const result = await client.callTool({
        name: "interaction",
        arguments: {
          userQuery: this.userQuery,
          chatHistory: chatHistory,
        },
      });
      console.log("Is this working?", result);
    } catch (error: any) {
      this.context.stderr.write(
        `Error calling interaction tool: ${error.message}\n`
      );
      if (error.response) {
        this.context.stderr.write(
          `Server Response: ${JSON.stringify(error.response.data, null, 2)}\n`
        );
      }
    } finally {
      await shutdownDatabase();
    }

    process.on("SIGINT", () => this.handleShutdown("SIGINT"));
    process.on("SIGTERM", () => this.handleShutdown("SIGTERM"));
  }

  async handleShutdown(signal: string) {
    console.log(`\n[Client] Received ${signal}. Shutting down...`);
    await shutdownDatabase(); // Ensure DB is shut down
    process.exit(0); // Exit the process
  }
}

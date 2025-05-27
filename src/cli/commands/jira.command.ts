import { Command, Option } from "clipanion";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { AbstractMcpCommand } from "./AbstractMcpCommand";

export class JiraCommand extends AbstractMcpCommand {
  static paths = [["summarize-ticket"]];
  static usage = Command.Usage({
    description: "Summarizes a Jira ticket.",
    examples: [["Summarizes a Jira ticket", "$0 jira TICKET-123"]],
  });

  ticket = Option.String({
    name: "ticket",
    required: true,
  });

  async runMcpCommand(client: Client) {
    try {
      const result = await client.callTool({
        name: "jira", // This matches your tool registration name
        arguments: { ticketId: this.ticket },
      });

      console.log("Result:", result);
    } catch (error: any) {
      this.context.stderr.write(`\nError calling tool: ${error.message}\n`);
      // Optionally, re-throw or exit with an error code
    }
  }
}

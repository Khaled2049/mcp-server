import { Command, Option } from "clipanion";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { AbstractMcpCommand } from "./AbstractMcpCommand";

export class GsCommand extends AbstractMcpCommand {
  static paths = [["gs"]];
  static usage = Command.Usage({
    description:
      "Calls the 'getStudentSpend' tool to retrieve student spend data.",
    examples: [["Get student spend data", "$0 gs"]],
  });

  async runMcpCommand(client: Client) {
    this.context.stdout.write("Calling 'getStudentSpend' tool...\n");
    const result = await client.callTool({
      name: "getStudentSpend",
      arguments: {},
    });
    this.context.stdout.write(
      "Result: " + JSON.stringify(result, null, 2) + "\n"
    );
  }
}

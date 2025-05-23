import { Command, Option } from "clipanion";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { AbstractMcpCommand } from "./AbstractMcpCommand";

export class GreetingCommand extends AbstractMcpCommand {
  static paths = [["greeting"]];
  static usage = Command.Usage({
    description: "Reads the 'greeting' resource for a given name.",
    examples: [["Gets a greeting for 'Alice'", "$0 greeting Alice"]],
  });

  name = Option.String({
    name: "name",
    required: true,
  });

  async runMcpCommand(client: Client) {
    const result = await client.readResource({
      uri: `greeting://${this.name}`,
    });
    this.context.stdout.write(
      "Result: " + JSON.stringify(result, null, 2) + "\n"
    );
  }
}

// src/cli/commands/add.command.ts
import { Command, Option } from "clipanion";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { AbstractMcpCommand } from "./AbstractMcpCommand";

export class AddCommand extends AbstractMcpCommand {
  static paths = [["add"]];
  static usage = Command.Usage({
    description: "Calls the 'add' tool to sum two numbers.",
    examples: [["Adds two numbers", "$0 add 10 20"]],
  });

  num1 = Option.String({
    name: "num1",
    required: true,
  });
  num2 = Option.String({
    name: "num2",
    required: true,
  });

  async runMcpCommand(client: Client) {
    const a = parseFloat(this.num1);
    const b = parseFloat(this.num2);

    if (isNaN(a) || isNaN(b)) {
      throw new Error(
        "Invalid arguments: <num1> and <num2> must be numbers. Usage: add <num1> <num2>"
      );
    }

    const result = await client.callTool({
      name: "add",
      arguments: { a, b },
    });
    this.context.stdout.write(
      "Result: " + JSON.stringify(result, null, 2) + "\n"
    );
  }
}

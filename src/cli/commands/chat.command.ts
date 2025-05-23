// src/cli/commands/chat.command.ts
import { Command, Option, Usage } from "clipanion";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { AbstractMcpCommand } from "./AbstractMcpCommand"; // Adjust path if needed
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { OllamaMessage } from "../../services/ollama.service";

export class ChatCommand extends AbstractMcpCommand {
  static paths = [["chat"]];
  static usage: Usage = Command.Usage({
    description:
      "Initiates an interactive chat session with the LLM via the MCP chat tool.",
    examples: [
      ["Start an interactive chat session", "$0 chat"],
      [
        "Start an interactive chat with an initial message",
        '$0 chat "Hello there!"',
      ],
      [
        "Start with a custom system prompt",
        '$0 chat -s "You are a witty pirate." "Ahoy, matey!"',
      ],
    ],
  });

  // Optional initial message. If not provided, chat starts by prompting the user.
  initialMessage = Option.String({
    name: "message",
    required: false,
  });

  systemPrompt = Option.String("--system-prompt,-s", {
    description:
      "Custom system prompt for the chat session. Defaults to 'You are a helpful AI assistant.'",
  });

  async runMcpCommand(client: Client) {
    const rl = readline.createInterface({ input, output });
    // currentConversationLog will store the history of messages (system, user, assistant)
    const currentConversationLog: OllamaMessage[] = [];

    const activeSystemPrompt =
      this.systemPrompt || "You are a helpful AI assistant.";

    this.context.stdout.write(`Starting chat session...\n`);
    this.context.stdout.write(`System Prompt: "${activeSystemPrompt}"\n`);
    this.context.stdout.write("Type '/quit' or '/exit' to end the session.\n");
    this.context.stdout.write(
      "Type '/history' to view the current conversation log.\n\n"
    );

    let firstMessageContent = this.initialMessage;

    // Main chat loop
    while (true) {
      let userInput: string;

      if (firstMessageContent !== undefined) {
        userInput = firstMessageContent;
        firstMessageContent = undefined; // Consume the initial message
        // Echo the initial message as if the user typed it
        if (userInput.length > 0)
          this.context.stdout.write(`You: ${userInput}\n`);
      } else {
        userInput = (await rl.question("You: ")).trim();
      }

      if (
        userInput.toLowerCase() === "/quit" ||
        userInput.toLowerCase() === "/exit"
      ) {
        break;
      }

      if (userInput.toLowerCase() === "/history") {
        this.context.stdout.write("\n--- Conversation History ---\n");
        if (currentConversationLog.length === 0 && activeSystemPrompt) {
          this.context.stdout.write(`[system] ${activeSystemPrompt}\n`);
        }
        currentConversationLog.forEach((msg) => {
          this.context.stdout.write(`[${msg.role}] ${msg.content}\n`);
        });
        this.context.stdout.write("--------------------------\n\n");
        continue;
      }

      if (!userInput) {
        continue;
      }

      const toolArguments = {
        newMessage: userInput,
        history: [...currentConversationLog],
        systemPrompt: activeSystemPrompt,
      };

      try {
        this.context.stdout.write("AI: Thinking...\r");
        const response = await client.callTool({
          name: "chat", // Name of the tool on the MCP server
          arguments: toolArguments,
        });

        if (currentConversationLog.length === 0) {
          currentConversationLog.push({
            role: "system",
            content: activeSystemPrompt,
          });
        }
        currentConversationLog.push({ role: "user", content: userInput });

        if (response.isError || !response.content) {
          this.context.stderr.write(`AI Error\n`);
        } else {
          const contentArr = response.content as { text: string }[];
          const aiResponseText =
            Array.isArray(contentArr) && contentArr.length > 0
              ? contentArr[0].text
              : "";
          this.context.stdout.write(`AI: ${aiResponseText}\n`);
          currentConversationLog.push({
            role: "assistant",
            content: aiResponseText,
          });
        }
      } catch (error: any) {
        this.context.stderr.write(
          `\n[CLI Error] Failed to call chat tool: ${error.message}\n`
        );
      }
      this.context.stdout.write("\n"); // Extra line for readability before next "You: " prompt
    }

    rl.close();
    this.context.stdout.write("Chat session ended.\n");
  }
}

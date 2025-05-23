import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import {
  getOllamaChatCompletion,
  OllamaMessage,
} from "../services/ollama.service"; // Adjust path as necessary

const messageInputSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

export const chatTool = (server: McpServer) => {
  server.tool(
    "chat",
    {
      newMessage: z
        .string()
        .min(1, "New message must be at least 1 character long."),
      history: z.array(messageInputSchema).optional().default([]),
      systemPrompt: z.string().optional(),
    },
    async ({ newMessage, history, systemPrompt }) => {
      console.error(`[Tool 'chat'] Called with new message: "${newMessage}"`);

      const messagesForOllama: OllamaMessage[] = [];

      if (history.length === 0) {
        messagesForOllama.push({
          role: "system",
          content: systemPrompt || "You are a helpful AI assistant.",
        });
      } else {
        // History is provided, assume it's complete and includes any system prompt.
        messagesForOllama.push(...history);
      }

      // Add the new user message to the end
      messagesForOllama.push({ role: "user", content: newMessage });

      try {
        const assistantResponseText = await getOllamaChatCompletion(
          messagesForOllama
        );

        return {
          content: [
            {
              type: "text",
              text: assistantResponseText,
            },
          ],
        };
      } catch (error: any) {
        console.error(`[Tool 'chat'] Error during Ollama call:`, error.message);
        return {
          content: [
            {
              type: "text",
              text: `I encountered an error trying to respond: ${error.message}`,
            },
          ],
          isError: true,
          errorDetails: {
            message: error.message,
          },
        };
      }
    }
  );
};

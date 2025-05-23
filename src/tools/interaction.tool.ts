import { executeQuery, getFormattedSchemaForLLM } from "../database/queries";
import {
  generateSqlFromNaturalLanguage,
  getOllamaChatCompletion,
  OllamaMessage,
} from "../services/ollama.service";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

export const interactionTool = (server: McpServer) => {
  server.tool(
    "interaction",
    {
      userQuery: z.string().min(1, "User query cannot be empty."),
      chatHistory: z
        .array(
          z.object({
            role: z.enum(["system", "user", "assistant"]),
            content: z.string(),
          })
        )
        .optional()
        .default([]),
    },
    async ({ userQuery, chatHistory }) => {
      console.log("Interaction tool called with query:", userQuery);
      const response = await handleUserRequest(userQuery, chatHistory);

      if (response.type === "error") {
        return {
          content: [{ type: "text", text: response.content }],
          isError: true,
          errorDetails: { message: response.content },
        };
      } else if (response.type === "sql_result") {
        return {
          content: [
            {
              type: "text",
              text: `Query Result:\n${JSON.stringify(
                response.content,
                null,
                2
              )}`,
            },
          ],
        };
      } else {
        // type === "text"
        return {
          content: [{ type: "text", text: response.content }],
        };
      }
    }
  );
};

export async function handleUserRequest(
  userQuery: string,
  chatHistory: OllamaMessage[] = [] // Pass conversation history for context
): Promise<{ type: "text" | "sql_result" | "error"; content: any }> {
  // 1. Instruct the LLM on tool usage
  const systemPrompt = `You are a helpful assistant that can interact with a database and engage in general chat.
You have access to the following tools:

<tool_definitions>
1.  **textToSqlTool**:
    Description: Converts a natural language question and a database schema into a PostgreSQL SQL query.
    Parameters:
        - naturalQuery (string): The user's question in natural language.
        - schemaText (string): The full database schema.
    Response: The raw SQL query string.
    Example call: <tool_code>textToSqlTool(naturalQuery='Show me all users created in the last month', schemaText='CREATE TABLE users (id INT, name TEXT);')</tool_code>

2.  **queryTool**:
    Description: Executes a given SQL query against the database and returns the results as JSON.
    Parameters:
        - sqlQuery (string): The SQL query to execute.
    Response: JSON array of objects representing the query results.
    Example call: <tool_code>queryTool(sqlQuery='SELECT name, email FROM users WHERE created_at > NOW() - INTERVAL \\'1 month\\'')</tool_code>

3.  **chatTool**:
    Description: Engages in general conversation or answers questions that do not require database interaction.
    Parameters:
        - newMessage (string): The current user message.
        - history (array<object>): The conversation history (e.g., [{role: "user", content: "hi"}, {role: "assistant", content: "hello"}]).
        - systemPrompt (string, optional): An initial system prompt for the chat.
    Response: The assistant's text response.
    Example call: <tool_code>chatTool(newMessage='What is the capital of France?')</tool_code>
</tool_definitions>

Based on the user's input, decide which tool to call or if a direct chat response is needed.
If you need to call a tool, respond ONLY with the tool call in the format: <tool_code>toolName(param1='value1', param2='value2')</tool_code>.
If you need to chain tools (e.g., convert text to SQL, then run SQL), output the first tool call.
If no tool is suitable, or if the user asks a general question, provide a natural language response.
Do not explain your reasoning unless explicitly asked to do so after a tool call.
`;

  // Combine history and current user query
  const messagesForOllama: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: userQuery },
  ];

  console.log(
    `[interation.tool.ts] Sending request to Ollama for tool decision...`
  );

  try {
    const ollamaDecision = await getOllamaChatCompletion(messagesForOllama);
    console.log(`[interation.tool.ts] Ollama Decision: "${ollamaDecision}"`);

    // 2. Parse Ollama's decision (tool call or direct response)
    const toolCallRegex = /<tool_code>(\w+)\((.*)\)<\/tool_code>/;
    const match = ollamaDecision.match(toolCallRegex);

    if (match) {
      const toolName = match[1];
      const paramsString = match[2];
      let params: Record<string, any> = {};

      try {
        paramsString
          .split(/,\s*(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/)
          .forEach((param) => {
            const parts = param.split(/=(.*)/s); // Split only on the first '='
            if (parts.length === 2) {
              const key = parts[0].trim();
              let value = parts[1].trim();

              // Remove quotes and handle escaping (simple for demonstration)
              if (value.startsWith("'") && value.endsWith("'")) {
                value = value
                  .substring(1, value.length - 1)
                  .replace(/\\'/g, "'");
              } else if (value.startsWith('"') && value.endsWith('"')) {
                value = value
                  .substring(1, value.length - 1)
                  .replace(/\\"/g, '"');
              }
              params[key] = value;
            }
          });
        console.log(
          `[Orchestrator] Parsed tool call: ${toolName} with params:`,
          params
        );
      } catch (parseError) {
        console.error(
          `[Orchestrator] Error parsing tool parameters:`,
          parseError
        );
        return {
          type: "error",
          content: `Failed to parse tool call from LLM. Please try rephrasing. Error: ${
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          }`,
        };
      }

      switch (toolName) {
        case "textToSqlTool":
          console.log(
            `[Orchestrator] Executing textToSqlTool for: "${userQuery}"`
          );
          const schemaText = await getFormattedSchemaForLLM();
          try {
            const sqlQuery = await generateSqlFromNaturalLanguage(
              params.naturalQuery || userQuery,
              params.schemaText || schemaText
            );
            console.log(`[Orchestrator] Generated SQL: "${sqlQuery}"`);

            return await handleUserRequest(
              `<tool_code>queryTool(sqlQuery='${sqlQuery.replace(
                /'/g,
                "\\'"
              )}')</tool_code>`,
              [...chatHistory, { role: "assistant", content: ollamaDecision }]
            );
          } catch (sqlError: any) {
            console.error(`[Orchestrator] SQL Generation Error:`, sqlError);
            return {
              type: "error",
              content: `Failed to generate SQL: ${sqlError.message}`,
            };
          }
        case "queryTool":
          console.log(
            `[Orchestrator] Executing queryTool for SQL: "${params.sqlQuery}"`
          );
          try {
            const queryResult = await executeQuery(params.sqlQuery);
            console.log(`[Orchestrator] Query Result:`, queryResult);

            return {
              type: "sql_result",
              content: JSON.stringify(queryResult, null, 2),
            };
          } catch (queryError: any) {
            console.error(`[Orchestrator] Database Query Error:`, queryError);
            return {
              type: "error",
              content: `Failed to execute SQL query: ${queryError.message}`,
            };
          }
        case "chatTool":
          console.log(
            `[Orchestrator] Executing chatTool for: "${params.newMessage}"`
          );
          try {
            const chatResponse = await getOllamaChatCompletion([
              {
                role: "system",
                content:
                  params.systemPrompt || "You are a helpful AI assistant.",
              },
              ...(params.history || []),
              { role: "user", content: params.newMessage },
            ]);
            return { type: "text", content: chatResponse };
          } catch (chatError: any) {
            console.error(`[Orchestrator] Chat Tool Error:`, chatError);
            return {
              type: "error",
              content: `Failed to get chat response: ${chatError.message}`,
            };
          }
        default:
          return {
            type: "error",
            content: `Unknown tool: ${toolName}. Please check tool definitions.`,
          };
      }
    } else {
      console.log(`[Orchestrator] Direct chat response: "${ollamaDecision}"`);
      return { type: "text", content: ollamaDecision };
    }
  } catch (error: any) {
    console.error(`[Orchestrator] Error during orchestration:`, error.message);
    return {
      type: "error",
      content: `An internal error occurred: ${error.message}`,
    };
  }
}

// src/services/ollama.service.ts
import axios, { AxiosError, AxiosResponse } from "axios";
import { OLLAMA_CONFIG } from "../config"; // Import Ollama config

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: ChatMessage;
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

const OLLAMA_CHAT_API_URL = `${OLLAMA_CONFIG.baseUrl}/api/chat`;

export async function generateSqlFromNaturalLanguage(
  naturalQuery: string,
  schemaText: string
): Promise<string> {
  const systemPrompt = `You are an expert PostgreSQL query writer.
Based on the provided database schema, generate a single, runnable SQL query that directly answers the user's question.
Output ONLY the raw SQL query. Do not include any explanations, comments, or markdown formatting like \`\`\`sql ... \`\`\`.
If the question cannot be answered with the given schema, is ambiguous, or requires modification/unsafe operations not typically derived from a "get" or "show" type question, output "Error: Cannot generate a safe SELECT query from the given request and schema."
Focus on generating SELECT queries. Output the SQL query in a single line without line breaks or indentation. Do not include <thinking> or any other tags.`;

  const userPrompt = `Database Schema:
---
${schemaText}
---
User Question: "${naturalQuery}"

SQL Query:`;

  const payload = {
    model: OLLAMA_CONFIG.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: false,
    options: {
      temperature: 0.1, // Lower temperature for more deterministic SQL
    },
  };

  console.error(
    `[Ollama Service] Sending request to Ollama API: ${OLLAMA_CHAT_API_URL} with model: ${OLLAMA_CONFIG.model}`
  );

  try {
    const ollamaAxiosResponse: AxiosResponse<OllamaChatResponse> =
      await axios.post(OLLAMA_CHAT_API_URL, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 60000, // 60-second timeout
      });

    const ollamaResponseData = ollamaAxiosResponse.data;
    let sqlQuery = ollamaResponseData.message?.content?.trim();

    if (!sqlQuery) {
      console.error(
        "[Ollama Service] Ollama response did not contain expected content:",
        ollamaResponseData
      );
      throw new Error(
        "Failed to extract SQL query from Ollama response. Ensure the model is responding correctly and the response structure is as expected."
      );
    }

    // Clean up potential markdown and trailing semicolons
    sqlQuery = sqlQuery.replace(/^```sql\s*|\s*```$/gi, "").trim();
    sqlQuery = sqlQuery.replace(/;\s*$/, "");

    console.error(`[Ollama Service] Generated SQL from Ollama: ${sqlQuery}`);
    return sqlQuery;
  } catch (err: unknown) {
    let errorMessage = "Unknown error calling Ollama API";
    if (axios.isAxiosError(err)) {
      const axiosError = err as AxiosError<any>;
      console.error(
        `[Ollama Service] Axios error calling Ollama API: ${axiosError.message}`
      );
      if (axiosError.response) {
        console.error(
          "[Ollama Service] Ollama API Response Status:",
          axiosError.response.status
        );
        console.error(
          "[Ollama Service] Ollama API Response Data:",
          JSON.stringify(axiosError.response.data, null, 2)
        );
        const ollamaError =
          axiosError.response.data?.error ||
          (typeof axiosError.response.data === "string"
            ? axiosError.response.data
            : axiosError.message);
        errorMessage = `Ollama API Error (${axiosError.response.status}): ${ollamaError}`;
      } else if (axiosError.request) {
        console.error(
          "[Ollama Service] Ollama API No Response: The request was made but no response was received."
        );
        errorMessage = `No response from Ollama API. Is it running at ${OLLAMA_CHAT_API_URL}? Details: ${axiosError.message}`;
      } else {
        errorMessage = `Error setting up Ollama API request: ${axiosError.message}`;
      }
    } else if (err instanceof Error) {
      console.error(`[Ollama Service] Non-Axios error: ${err.message}`);
      errorMessage = err.message;
    } else {
      console.error(`[Ollama Service] Unknown error:`, err);
    }
    throw new Error(errorMessage); // Re-throw a simplified error
  }
}

// src/services/ollama.service.ts
import axios, { AxiosError, AxiosResponse } from "axios";
import { OLLAMA_CONFIG } from "../config"; // Import Ollama config

export interface ChatMessage {
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

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Interface for the expected structure of Ollama's API response
interface OllamaChatApiResponse {
  model: string;
  created_at: string;
  message: OllamaMessage; // Contains the assistant's response
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string; // The generated text
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

const OLLAMA_GENERATE_API_URL = `${OLLAMA_CONFIG.baseUrl}/api/generate`;

export async function generateTextFromPrompt(
  prompt: string,
  model: string = OLLAMA_CONFIG.model,
  temperature: number = 0.1
): Promise<string> {
  const payload = {
    model: model,
    prompt: prompt,
    stream: false,
    options: {
      temperature: temperature,
    },
  };

  try {
    const ollamaAxiosResponse: AxiosResponse<OllamaGenerateResponse> =
      await axios.post(OLLAMA_GENERATE_API_URL, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 60000, // 60-second timeout
      });

    const ollamaResponseData = ollamaAxiosResponse.data;
    const generatedContent = ollamaResponseData.response?.trim();

    if (!generatedContent) {
      console.error(
        "[Ollama Service] Ollama generate response did not contain expected content:",
        ollamaResponseData
      );
      throw new Error(
        "Failed to extract generated content from Ollama response. Ensure the model is responding correctly and the response structure is as expected."
      );
    }

    return generatedContent;
  } catch (err: unknown) {
    let errorMessage = "Unknown error calling Ollama Generate API";
    if (axios.isAxiosError(err)) {
      const axiosError = err as AxiosError<any>;
      console.error(
        `[Ollama Service] Axios error calling Ollama Generate API: ${axiosError.message}`
      );
      if (axiosError.response) {
        const responseData = axiosError.response.data;
        console.error(
          "[Ollama Service] Ollama API Response Status:",
          axiosError.response.status
        );
        console.error(
          "[Ollama Service] Ollama API Response Data:",
          JSON.stringify(responseData, null, 2)
        );
        const ollamaError =
          responseData?.error ||
          (typeof responseData === "string"
            ? responseData
            : axiosError.message);
        errorMessage = `Ollama API Error (${axiosError.response.status}): ${ollamaError}`;
      } else if (axiosError.request) {
        console.error(
          "[Ollama Service] Ollama API No Response: The request was made but no response was received."
        );
        errorMessage = `No response from Ollama API. Is it running at ${OLLAMA_GENERATE_API_URL}? Details: ${axiosError.message}`;
      } else {
        errorMessage = `Error setting up Ollama API generate request: ${axiosError.message}`;
      }
    } else if (err instanceof Error) {
      console.error(`[Ollama Service] Non-Axios error: ${err.message}`);
      errorMessage = err.message;
    } else {
      console.error(`[Ollama Service] Unknown error:`, err);
    }
    throw new Error(errorMessage);
  }
}

export async function summarizeText(
  textToSummarize: string,
  summaryLength: "brief" | "medium" | "detailed" = "medium"
): Promise<string> {
  let instructions = "";
  switch (summaryLength) {
    case "brief":
      instructions =
        "Provide a very concise summary, ideally one to two sentences.";
      break;
    case "medium":
      instructions =
        "Provide a concise summary, focusing on the main points in a paragraph or two.";
      break;
    case "detailed":
      instructions =
        "Provide a comprehensive summary, including key details and supporting information, covering a few paragraphs.";
      break;
    default:
      instructions = "Provide a concise summary.";
  }

  const fullPrompt = `You are an expert summarizer. Your task is to accurately and concisely summarize the following text based on the user's requested length.

Instructions: ${instructions}
Output ONLY the summarized text. Do not include any preambles, comments, or markdown formatting.

Text to Summarize:
---
${textToSummarize}
---

Summary:`;

  try {
    const summarizedContent = await generateTextFromPrompt(
      fullPrompt,
      OLLAMA_CONFIG.model,
      0.5
    ); // Adjust temperature as needed for summarization

    return summarizedContent;
  } catch (err: unknown) {
    // Re-throw any errors from generateTextFromPrompt
    throw err;
  }
}

export async function getOllamaChatCompletion(
  messages: OllamaMessage[]
): Promise<string> {
  const payload = {
    model: OLLAMA_CONFIG.model,
    messages: messages,
    stream: false,
  };

  try {
    const ollamaAxiosResponse: AxiosResponse<OllamaChatApiResponse> =
      await axios.post(OLLAMA_CHAT_API_URL, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 60000, // Use configured or default timeout
      });

    const ollamaResponseData = ollamaAxiosResponse.data;
    const assistantResponse = ollamaResponseData.message?.content?.trim();

    if (!assistantResponse) {
      console.error(
        "[Ollama Service] Ollama chat response did not contain expected message content:",
        ollamaResponseData
      );
      throw new Error(
        "Failed to extract assistant's message from Ollama response. Ensure the model is responding as expected."
      );
    }

    console.error(
      `[Ollama Service] Assistant response from Ollama: ${assistantResponse}`
    );
    return assistantResponse;
  } catch (err: unknown) {
    let errorMessage = "Unknown error calling Ollama Chat API";
    if (axios.isAxiosError(err)) {
      const axiosError = err as AxiosError<any>; // Using 'any' for broader compatibility with error data
      console.error(
        `[Ollama Service] Axios error calling Ollama Chat API: ${axiosError.message}`
      );
      if (axiosError.response) {
        const responseData = axiosError.response.data;
        console.error(
          "[Ollama Service] Ollama API Response Status:",
          axiosError.response.status
        );
        console.error(
          "[Ollama Service] Ollama API Response Data:",
          JSON.stringify(responseData, null, 2)
        );
        // Prefer a specific error message from Ollama if available
        const ollamaError =
          responseData?.error ||
          (typeof responseData === "string"
            ? responseData
            : axiosError.message);
        errorMessage = `Ollama API Error (${axiosError.response.status}): ${ollamaError}`;
      } else if (axiosError.request) {
        console.error(
          "[Ollama Service] Ollama API No Response: The request was made but no response was received."
        );
        errorMessage = `No response from Ollama API. Is ${OLLAMA_CONFIG.baseUrl} accessible? Details: ${axiosError.message}`;
      } else {
        errorMessage = `Error setting up Ollama API request: ${axiosError.message}`;
      }
    } else if (err instanceof Error) {
      console.error(
        `[Ollama Service] Non-Axios error in chat completion: ${err.message}`
      );
      errorMessage = err.message;
    } else {
      console.error(
        `[Ollama Service] Unknown error object in chat completion:`,
        err
      );
    }
    // Re-throw a consolidated error message
    throw new Error(errorMessage);
  }
}

import OpenAI from "openai";
import { OPENAI_CONFIG } from "../config"; // Import your OpenAI config

if (!OPENAI_CONFIG.apiKey) {
  console.error("Error: OPENAI_API_KEY environment variable is not set.");
  throw new Error("OPENAI_API_KEY is not set in environment variables.");
}

const openaiClient = new OpenAI({
  apiKey: OPENAI_CONFIG.apiKey,
});

export async function generateBedtimeStory(prompt: string): Promise<string> {
  console.error(
    `[OpenAI Service] Generating bedtime story with prompt: "${prompt}"`
  );
  try {
    const response = await openaiClient.chat.completions.create({
      // Use chat.completions.create for chat models
      model: "gpt-4o", // gpt-4.1 is not a standard OpenAI model. Use gpt-4o, gpt-4-turbo, gpt-4, gpt-3.5-turbo etc.
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50, // Limit response length for a "one-sentence" story
      temperature: 0.7, // Adjust creativity
    });

    // The output for chat models is typically in response.choices[0].message.content
    const story = response.choices[0].message?.content?.trim();

    if (!story) {
      console.error(
        "[OpenAI Service] No content received from OpenAI:",
        response
      );
      throw new Error(
        "Failed to generate bedtime story: No content in OpenAI response."
      );
    }

    console.error("[OpenAI Service] Generated story:", story);
    return story;
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error(
        `[OpenAI Service] OpenAI API Error: ${error.status} - ${error.message}`
      );
      throw new Error(`OpenAI API Error: ${error.message}`);
    } else {
      console.error("[OpenAI Service] Unexpected error calling OpenAI:", error);
      throw new Error(`Failed to generate story: ${(error as Error).message}`);
    }
  }
}

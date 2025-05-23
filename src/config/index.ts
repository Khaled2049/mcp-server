// src/config/index.ts
import * as dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env

export const DB_CONFIG = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "epcs",
  password: process.env.DB_PASSWORD || "password",
  port: parseInt(process.env.DB_PORT || "5432", 10),
};

export const OLLAMA_CONFIG = {
  baseUrl: process.env.OLLAMA_API_BASE_URL || "http://127.0.0.1:11434",
  model: process.env.OLLAMA_MODEL || "gemma3:4b",
};

export const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY as string,
};

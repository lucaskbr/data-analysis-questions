import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";

import { NativeAgent } from "./agent/agent.js";
import { AGENT_INSTRUCTIONS } from "./agent/prompts.js";
import { chatRequestSchema, handleChat } from "./api/chat.js";
import { validateJson } from "./api/validation.js";
import { ChatService } from "./chat/chat-service.js";
import { InMemoryConversationStore } from "./conversation/in-memory-store.js";
import { BigQueryExecutor } from "./data/bigquery-executor.js";
import { OpenAiResponsesClient } from "./llm/client.js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set.`);
  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

export function createApp(): Hono {
  const queryExecutor = new BigQueryExecutor(
    required("BIGQUERY_DATASET"),
    {
      maxBytesBilled: positiveInteger("BIGQUERY_MAX_BYTES_BILLED", 1_000_000_000),
      maxRows: positiveInteger("BIGQUERY_MAX_ROWS", 1_000),
    },
    process.env.GOOGLE_CLOUD_PROJECT,
  );
  const agent = new NativeAgent(
    new OpenAiResponsesClient(
      required("OPENAI_API_KEY"),
      required("OPENAI_MODEL"),
      AGENT_INSTRUCTIONS,
    ),
    queryExecutor,
    positiveInteger("AGENT_MAX_ITERATIONS", 6),
  );
  const chat = new ChatService(new InMemoryConversationStore(), agent);
  const allowedOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

  const app = new Hono();
  app.use(
    "*",
    bodyLimit({
      maxSize: 64 * 1024,
      onError: (context) => context.json({ error: "Request body is too large." }, 413),
    }),
  );
  app.use(
    "*",
    cors({
      origin: allowedOrigin,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    }),
  );
  app.get("/", (context) => context.json({ name: "analytics-chat-backend", status: "ok" }));
  app.get("/health", (context) => context.json({ status: "ok" }));
  app.post("/api/chat", validateJson(chatRequestSchema), (context) =>
    handleChat(context, chat, context.req.valid("json")),
  );

  return app;
}

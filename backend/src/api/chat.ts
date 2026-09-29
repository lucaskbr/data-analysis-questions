import type { Context } from "hono";
import { z } from "zod";

import type { ChatService } from "../chat/chat-service.js";

export const chatRequestSchema = z
  .object({
    conversationId: z.string().trim().min(1).max(128),
    message: z.string().trim().min(1).max(16_384),
  })
  .strict();

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export async function handleChat(
  context: Context,
  chat: ChatService,
  request: ChatRequest,
): Promise<Response> {
  try {
    return context.json(await chat.chat(request.conversationId, request.message));
  } catch (error) {
    return context.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      500,
    );
  }
}

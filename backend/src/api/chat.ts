import type { Context } from "hono";
import { z } from "zod";

import type { ChatService } from "../chat/chat-service.js";
import { logger } from "../observability/logger.js";

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
    logger.info("chat_request_received", {
      conversationId: request.conversationId,
      messageLength: request.message.length,
    });
    return context.json(await chat.chat(request.conversationId, request.message));
  } catch (error) {
    logger.error("chat_request_failed", error, { conversationId: request.conversationId });
    return context.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      500,
    );
  }
}

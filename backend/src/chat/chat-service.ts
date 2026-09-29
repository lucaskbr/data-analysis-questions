import type { AgentResult, NativeAgent } from "../agent/agent.js";
import type { AgentResponse } from "../agent/response-format.js";
import type { ConversationStore } from "../conversation/conversation-store.js";
import { logger } from "../observability/logger.js";

export interface ChatResponse {
  conversationId: string;
  response: AgentResponse;
  visualization?: { type: "bar" | "line" | "table"; x?: string; y?: string };
  queryTrace: Array<{
    sql: string;
    result: { columns: string[]; rows: Record<string, unknown>[]; totalBytesProcessed: number };
  }>;
}

export class ChatService {
  constructor(
    private readonly store: ConversationStore,
    private readonly agent: NativeAgent,
  ) {}

  async chat(conversationId: string, message: string): Promise<ChatResponse> {
    const history = await this.store.get(conversationId);
    logger.info("chat_execution_started", {
      conversationId,
      historyMessageCount: history.length,
      messageLength: message.length,
    });
    const userMessage = {
      role: "user" as const,
      content: message,
      createdAt: new Date().toISOString(),
    };
    await this.store.append(conversationId, userMessage);

    const result: AgentResult = await this.agent.run([...history, userMessage]);
    await this.store.append(conversationId, {
      role: "assistant",
      content: result.response.content,
      createdAt: new Date().toISOString(),
    });

    logger.info("chat_execution_completed", {
      conversationId,
      responseLength: result.response.content.length,
      queryCount: result.queryTrace.length,
    });

    return { conversationId, ...result };
  }
}

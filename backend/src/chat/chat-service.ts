import type { AgentResult, NativeAgent } from "../agent/agent.js";
import type { ConversationStore } from "../conversation/conversation-store.js";

export interface ChatResponse {
  conversationId: string;
  analysis: string;
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
    const userMessage = {
      role: "user" as const,
      content: message,
      createdAt: new Date().toISOString(),
    };
    await this.store.append(conversationId, userMessage);

    const result: AgentResult = await this.agent.run([...history, userMessage]);
    await this.store.append(conversationId, {
      role: "assistant",
      content: result.analysis,
      createdAt: new Date().toISOString(),
    });

    return { conversationId, ...result };
  }
}

import type { ConversationMessage, ConversationStore } from "./conversation-store.js";

export class InMemoryConversationStore implements ConversationStore {
  readonly conversations = new Map<string, ConversationMessage[]>();

  async get(conversationId: string): Promise<ConversationMessage[]> {
    return [...(this.conversations.get(conversationId) ?? [])];
  }

  async append(conversationId: string, message: ConversationMessage): Promise<void> {
    const messages = this.conversations.get(conversationId) ?? [];
    messages.push(message);
    this.conversations.set(conversationId, messages);
  }
}

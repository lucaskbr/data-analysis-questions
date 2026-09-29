type ConversationRole = "user" | "assistant";

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
  createdAt: string;
}

export interface ConversationStore {
  get(conversationId: string): Promise<ConversationMessage[]>;
  append(conversationId: string, message: ConversationMessage): Promise<void>;
}

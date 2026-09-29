import { describe, expect, it } from "vitest";

import { chatRequestSchema } from "./chat.js";

describe("chatRequestSchema", () => {
  it("trims and accepts a valid chat request", () => {
    expect(
      chatRequestSchema.parse({
        conversationId: "  conversation-1 ",
        message: "  Show daily users  ",
      }),
    ).toEqual({ conversationId: "conversation-1", message: "Show daily users" });
  });

  it("rejects missing, empty, oversized, and unknown request fields", () => {
    expect(chatRequestSchema.safeParse({ conversationId: "", message: "hello" }).success).toBe(
      false,
    );
    expect(
      chatRequestSchema.safeParse({ conversationId: "id", message: "", extra: true }).success,
    ).toBe(false);
    expect(
      chatRequestSchema.safeParse({ conversationId: "id", message: "a".repeat(16_385) }).success,
    ).toBe(false);
  });
});

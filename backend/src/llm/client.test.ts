import { describe, expect, it } from "vitest";

import { extractOutputText } from "./client.js";

describe("extractOutputText", () => {
  it("extracts text from message output when the SDK convenience field is absent", () => {
    expect(
      extractOutputText({
        output: [
          { type: "reasoning" },
          {
            type: "message",
            content: [
              { type: "output_text", text: "You can explore traffic, users, and purchases." },
            ],
          },
        ],
      }),
    ).toBe("You can explore traffic, users, and purchases.");
  });

  it("uses output_text when provided", () => {
    expect(extractOutputText({ output_text: "Direct response" })).toBe("Direct response");
  });
});

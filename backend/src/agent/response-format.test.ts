import { describe, expect, it } from "vitest";

import { AGENT_RESPONSE_FORMAT, parseAgentResponse } from "./response-format.js";

describe("agent response format", () => {
  it("supports a text-only response", () => {
    expect(
      parseAgentResponse(
        JSON.stringify({
          type: "text",
          title: "Query ideas",
          content: "You can explore acquisition, engagement, and ecommerce conversion.",
          suggestedQuestions: ["Show sessions by channel"],
        }),
      ),
    ).toMatchObject({ type: "text", title: "Query ideas" });
  });

  it("supports a data-backed response", () => {
    expect(
      parseAgentResponse(
        JSON.stringify({
          type: "data",
          title: "Daily users",
          content: "Users increased over the selected period.",
          suggestedQuestions: [],
        }),
      ),
    ).toMatchObject({ type: "data", title: "Daily users" });
  });

  it("uses a strict JSON schema", () => {
    expect(AGENT_RESPONSE_FORMAT).toMatchObject({
      type: "json_schema",
      strict: true,
      schema: { required: ["type", "title", "content", "suggestedQuestions"] },
    });
  });
});

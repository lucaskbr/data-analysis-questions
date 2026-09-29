import { describe, expect, it } from "vitest";

import { createAgentInstructions } from "./prompts.js";

describe("createAgentInstructions", () => {
  it("guides the model on when to query and requires the configured dataset prefix", () => {
    const instructions = createAgentInstructions(
      "bigquery-public-data.ga4_obfuscated_sample_ecommerce",
    );

    expect(instructions).toContain("First understand the user's intent");
    expect(instructions).toContain("answer directly without calling `run_sql`");
    expect(instructions).toContain("ask a concise clarifying question");
    expect(instructions).not.toContain("{{DATASET}}");
    expect(instructions).toContain(
      "`bigquery-public-data.ga4_obfuscated_sample_ecommerce.TABLE_NAME`",
    );
  });
});

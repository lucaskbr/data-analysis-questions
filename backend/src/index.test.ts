import { describe, expect, it } from "vitest";

import { validateSql } from "./data/bigquery-executor.js";

describe("validateSql", () => {
  it("allows read-only queries against the configured dataset", () => {
    expect(() =>
      validateSql("SELECT * FROM `demo.analytics_123.events_*` LIMIT 10", "demo.analytics_123"),
    ).not.toThrow();
  });

  it("rejects write queries and tables outside the configured dataset", () => {
    expect(() =>
      validateSql("DELETE FROM `demo.analytics_123.events`", "demo.analytics_123"),
    ).toThrow("Only SELECT queries and WITH queries are allowed.");
    expect(() => validateSql("SELECT * FROM `other.dataset.events`", "demo.analytics_123")).toThrow(
      "Only tables in demo.analytics_123 are allowed.",
    );
  });
});

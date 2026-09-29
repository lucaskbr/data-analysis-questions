import { afterEach, describe, expect, it, vi } from "vitest";

import { logger, runWithLogContext } from "./logger.js";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs an error's type and message with contextual fields", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    runWithLogContext({ requestId: "request-123" }, () => {
      logger.error("bigquery_query_failed", new Error("BigQuery credentials are invalid"), {
        dataset: "bigquery-public-data.ga4_obfuscated_sample_ecommerce",
      });
    });

    expect(JSON.parse(errorSpy.mock.calls[0]?.[0] as string)).toMatchObject({
      level: "error",
      event: "bigquery_query_failed",
      requestId: "request-123",
      dataset: "bigquery-public-data.ga4_obfuscated_sample_ecommerce",
      errorType: "Error",
      errorMessage: "BigQuery credentials are invalid",
    });
  });
});

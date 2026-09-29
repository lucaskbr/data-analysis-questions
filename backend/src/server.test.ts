import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "./server.js";

describe("createApp", () => {
  beforeEach(() => {
    vi.stubEnv("BIGQUERY_DATASET", "demo.analytics_123");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "gpt-test");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns service information from the root route", async () => {
    const response = await createApp().request("/");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      name: "analytics-chat-backend",
      status: "ok",
    });
  });

  it("returns an OK health check response", async () => {
    const response = await createApp().request("/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });
});

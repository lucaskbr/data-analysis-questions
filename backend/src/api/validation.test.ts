import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { validateJson } from "./validation.js";

const requestSchema = z.object({ name: z.string().min(1) }).strict();
const app = new Hono().post("/", validateJson(requestSchema), (context) =>
  context.json(context.req.valid("json")),
);

describe("validateJson", () => {
  it("provides typed, validated JSON to the handler", async () => {
    const response = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ name: "Ada" });
  });

  it("returns a consistent 400 response for invalid JSON data", async () => {
    const response = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", unexpected: true }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "Invalid request body." });
  });
});

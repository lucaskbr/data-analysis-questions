import { describe, expect, it } from "vitest";

import type { QueryExecutor, QueryResult } from "../data/query-executor.js";
import type { FunctionTool, LlmClient, LlmResponse } from "../llm/client.js";
import { NativeAgent } from "./native-agent.js";

class FakeQueryExecutor implements QueryExecutor {
  lastSql = "";

  constructor(
    private readonly result: QueryResult = {
      columns: ["date", "users"],
      rows: [
        { date: "2026-01-01", users: 10 },
        { date: "2026-01-02", users: 12 },
      ],
      totalBytesProcessed: 1_024,
    },
  ) {}

  async run(sql: string): Promise<QueryResult> {
    this.lastSql = sql;
    return this.result;
  }
}

class FakeLlmClient implements LlmClient {
  readonly inputs: Array<Array<Record<string, unknown>>> = [];
  calls = 0;

  async createResponse(
    input: Array<Record<string, unknown>>,
    _tools: FunctionTool[],
  ): Promise<LlmResponse> {
    this.inputs.push(input);
    this.calls += 1;
    if (this.calls === 1) {
      return {
        output: [
          {
            type: "function_call",
            call_id: "call_123",
            name: "run_sql",
            arguments: '{"sql":"SELECT date, users FROM `demo.analytics_123.events_*`"}',
          },
        ],
        outputText: "",
      };
    }
    return {
      output: [],
      outputText: JSON.stringify({
        type: "data",
        title: "User trend",
        content: "Users increased from 10 to 12.",
        suggestedQuestions: ["Compare users by channel"],
      }),
    };
  }
}

describe("NativeAgent", () => {
  it("executes run_sql and sends its result back to the model", async () => {
    const llm = new FakeLlmClient();
    const queryExecutor = new FakeQueryExecutor();
    const agent = new NativeAgent(llm, queryExecutor);

    const result = await agent.run([
      { role: "user", content: "How did users change?", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    expect(result.response).toEqual({
      type: "data",
      title: "User trend",
      content: "Users increased from 10 to 12.",
      suggestedQuestions: ["Compare users by channel"],
    });
    expect(queryExecutor.lastSql).toBe("SELECT date, users FROM `demo.analytics_123.events_*`");
    expect(result.visualization).toEqual({ type: "bar", x: "date", y: "users" });
    expect(result.queryTrace).toHaveLength(1);
    expect(llm.inputs[1]).toContainEqual({
      type: "function_call_output",
      call_id: "call_123",
      output: JSON.stringify(result.queryTrace[0]!.result),
    });
  });

  it("falls back to a table when the candidate metric is a timestamp", async () => {
    const agent = new NativeAgent(
      new FakeLlmClient(),
      new FakeQueryExecutor({
        columns: ["product_name", "latest_sale_time"],
        rows: [
          { product_name: "Mug", latest_sale_time: { value: "2021-01-31T23:37:46.409473000Z" } },
          {
            product_name: "Sticker",
            latest_sale_time: { value: "2021-01-30T21:35:18.344716000Z" },
          },
        ],
        totalBytesProcessed: 1_024,
      }),
    );

    const result = await agent.run([
      { role: "user", content: "Show recent purchases", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    expect(result.visualization).toEqual({ type: "table" });
  });

  it("charts the numeric metric instead of a numeric timestamp", async () => {
    const agent = new NativeAgent(
      new FakeLlmClient(),
      new FakeQueryExecutor({
        columns: ["item_name", "latest_purchase_ts", "purchase_events"],
        rows: [
          { item_name: "Mug", latest_purchase_ts: 1_612_136_266_409_473, purchase_events: 448 },
          { item_name: "Sticker", latest_purchase_ts: 1_612_042_693_988_852, purchase_events: 40 },
        ],
        totalBytesProcessed: 1_024,
      }),
    );

    const result = await agent.run([
      { role: "user", content: "Show recent purchases", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    expect(result.visualization).toEqual({
      type: "bar",
      x: "item_name",
      y: "purchase_events",
    });
  });
});

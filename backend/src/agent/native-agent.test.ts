import { describe, expect, it } from "vitest";

import type { QueryExecutor, QueryResult } from "../data/query-executor.js";
import type { FunctionTool, LlmClient, LlmResponse } from "../llm/client.js";
import { NativeAgent } from "./native-agent.js";

class FakeQueryExecutor implements QueryExecutor {
  lastSql = "";

  async run(sql: string): Promise<QueryResult> {
    this.lastSql = sql;
    return {
      columns: ["date", "users"],
      rows: [
        { date: "2026-01-01", users: 10 },
        { date: "2026-01-02", users: 12 },
      ],
      totalBytesProcessed: 1_024,
    };
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
    return { output: [], outputText: "Users increased from 10 to 12." };
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

    expect(result.analysis).toBe("Users increased from 10 to 12.");
    expect(queryExecutor.lastSql).toBe("SELECT date, users FROM `demo.analytics_123.events_*`");
    expect(result.visualization).toEqual({ type: "bar", x: "date", y: "users" });
    expect(result.queryTrace).toHaveLength(1);
    expect(llm.inputs[1]).toContainEqual({
      type: "function_call_output",
      call_id: "call_123",
      output: JSON.stringify(result.queryTrace[0]!.result),
    });
  });
});

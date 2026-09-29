import type { ConversationMessage } from "../conversation/conversation-store.js";
import type { QueryExecutor, QueryResult } from "../data/query-executor.js";
import type { FunctionCall, FunctionTool, LlmClient } from "../llm/client.js";

export interface QueryTrace {
  sql: string;
  result: QueryResult;
}

interface VisualizationMetadata {
  type: "bar" | "line" | "table";
  x?: string;
  y?: string;
}

export interface AgentResult {
  analysis: string;
  visualization?: VisualizationMetadata;
  queryTrace: QueryTrace[];
}

const RUN_SQL_TOOL: FunctionTool = {
  type: "function",
  name: "run_sql",
  description: "Run a read-only BigQuery SQL query against the configured GA4 dataset.",
  parameters: {
    type: "object",
    properties: {
      sql: { type: "string", description: "A fully qualified, read-only BigQuery SQL query." },
    },
    required: ["sql"],
    additionalProperties: false,
  },
  strict: true,
};

function toInput(message: ConversationMessage): Record<string, unknown> {
  return {
    role: message.role,
    content: [
      { type: message.role === "user" ? "input_text" : "output_text", text: message.content },
    ],
  };
}

function functionCalls(output: Array<Record<string, unknown>>): FunctionCall[] {
  return output.filter((item) => item.type === "function_call") as unknown as FunctionCall[];
}

function visualizationFor(result: QueryResult): VisualizationMetadata {
  const [x, y] = result.columns;
  if (x && y && result.rows.length > 1) return { type: "bar", x, y };
  return { type: "table" };
}

export class NativeAgent {
  constructor(
    private readonly llm: LlmClient,
    private readonly queryExecutor: QueryExecutor,
    private readonly maxIterations = 6,
  ) {}

  async run(history: ConversationMessage[]): Promise<AgentResult> {
    let input = history.map(toInput);
    const queryTrace: QueryTrace[] = [];

    for (let iteration = 0; iteration < this.maxIterations; iteration += 1) {
      const response = await this.llm.createResponse(input, [RUN_SQL_TOOL]);
      const calls = functionCalls(response.output);

      if (calls.length === 0) {
        const result = {
          analysis: response.outputText || "I could not produce an analysis.",
          queryTrace,
        };
        const lastQuery = queryTrace.at(-1);
        return lastQuery
          ? { ...result, visualization: visualizationFor(lastQuery.result) }
          : result;
      }

      input = [...input, ...response.output];
      for (const call of calls) {
        const toolOutput = await this.executeToolCall(call, queryTrace);
        input.push({ type: "function_call_output", call_id: call.call_id, output: toolOutput });
      }
    }

    throw new Error(`Agent exceeded the ${this.maxIterations}-iteration limit.`);
  }

  private async executeToolCall(call: FunctionCall, queryTrace: QueryTrace[]): Promise<string> {
    if (call.name !== "run_sql") return JSON.stringify({ error: `Unknown tool: ${call.name}` });

    try {
      const parsed = JSON.parse(call.arguments) as { sql?: unknown };
      if (typeof parsed.sql !== "string")
        throw new Error("run_sql requires a string sql argument.");

      const result = await this.queryExecutor.run(parsed.sql);
      queryTrace.push({ sql: parsed.sql, result });
      return JSON.stringify(result);
    } catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : "Tool execution failed.",
      });
    }
  }
}

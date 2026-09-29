import type { ConversationMessage } from "../conversation/conversation-store.js";
import type { QueryExecutor, QueryResult } from "../data/query-executor.js";
import type { FunctionCall, FunctionTool, LlmClient } from "../llm/client.js";
import { logger } from "../observability/logger.js";
import {
  AGENT_RESPONSE_FORMAT,
  parseAgentResponse,
  type AgentResponse,
} from "./response-format.js";

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
  response: AgentResponse;
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

function isNumericMetric(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string" || value.trim() === "") return false;

  return Number.isFinite(Number(value));
}

function isTemporalColumn(column: string): boolean {
  return /(?:^|_)(?:date|day|week|month|quarter|year|time|timestamp|ts)(?:$|_)/i.test(column);
}

function visualizationFor(result: QueryResult): VisualizationMetadata {
  const [x] = result.columns;
  const metricColumns = result.columns.slice(1).filter((column) => {
    const values = result.rows
      .map((row) => row[column])
      .filter((value) => value !== null && value !== undefined);
    return !isTemporalColumn(column) && values.length > 0 && values.every(isNumericMetric);
  });

  const [y] = metricColumns;
  if (x && y && metricColumns.length === 1 && result.rows.length > 1) {
    return { type: "bar", x, y };
  }
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
    logger.info("agent_run_started", { historyMessageCount: history.length });

    for (let iteration = 0; iteration < this.maxIterations; iteration += 1) {
      const llmResponse = await this.llm.createResponse(
        input,
        [RUN_SQL_TOOL],
        AGENT_RESPONSE_FORMAT,
      );
      const calls = functionCalls(llmResponse.output);
      logger.info("agent_iteration_completed", {
        iteration: iteration + 1,
        functionCallCount: calls.length,
      });

      if (calls.length === 0) {
        const result = {
          response: parseAgentResponse(llmResponse.outputText),
          queryTrace,
        };
        const lastQuery = queryTrace.at(-1);
        logger.info("agent_run_completed", {
          iteration: iteration + 1,
          queryCount: queryTrace.length,
        });
        return lastQuery
          ? { ...result, visualization: visualizationFor(lastQuery.result) }
          : result;
      }

      input = [...input, ...llmResponse.output];
      for (const call of calls) {
        const toolOutput = await this.executeToolCall(call, queryTrace);
        input.push({ type: "function_call_output", call_id: call.call_id, output: toolOutput });
      }
    }

    logger.info("agent_run_limit_reached", { maxIterations: this.maxIterations });
    throw new Error(`Agent exceeded the ${this.maxIterations}-iteration limit.`);
  }

  private async executeToolCall(call: FunctionCall, queryTrace: QueryTrace[]): Promise<string> {
    if (call.name !== "run_sql") {
      logger.info("agent_tool_rejected", { toolName: call.name });
      return JSON.stringify({ error: `Unknown tool: ${call.name}` });
    }

    try {
      const parsed = JSON.parse(call.arguments) as { sql?: unknown };
      if (typeof parsed.sql !== "string")
        throw new Error("run_sql requires a string sql argument.");

      logger.info("agent_tool_started", { toolName: call.name, sqlLength: parsed.sql.length });
      const result = await this.queryExecutor.run(parsed.sql);
      queryTrace.push({ sql: parsed.sql, result });
      logger.info("agent_tool_completed", {
        toolName: call.name,
        rowCount: result.rows.length,
        totalBytesProcessed: result.totalBytesProcessed,
      });
      return JSON.stringify(result);
    } catch (error) {
      logger.error("agent_tool_failed", error, { toolName: call.name });
      return JSON.stringify({
        error: error instanceof Error ? error.message : "Tool execution failed.",
      });
    }
  }
}

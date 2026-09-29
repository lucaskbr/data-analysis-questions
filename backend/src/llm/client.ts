export interface FunctionTool {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict: true;
}

export interface FunctionCall {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: string;
}

export interface ResponseTextFormat {
  type: "json_schema";
  name: string;
  strict: boolean;
  schema: Record<string, unknown>;
}

export interface LlmResponse {
  output: Array<Record<string, unknown>>;
  outputText: string;
}

export interface LlmClient {
  createResponse(
    input: Array<Record<string, unknown>>,
    tools: FunctionTool[],
    textFormat?: ResponseTextFormat,
  ): Promise<LlmResponse>;
}

interface OpenAiResponse {
  output?: Array<Record<string, unknown>>;
  output_text?: string;
}

export function extractOutputText(payload: OpenAiResponse): string {
  if (payload.output_text) return payload.output_text;

  return (payload.output ?? [])
    .flatMap((item) => {
      if (item.type !== "message" || !Array.isArray(item.content)) return [];

      return item.content.flatMap((content) => {
        if (
          typeof content !== "object" ||
          content === null ||
          !("type" in content) ||
          !("text" in content) ||
          content.type !== "output_text" ||
          typeof content.text !== "string"
        ) {
          return [];
        }
        return [content.text];
      });
    })
    .join("");
}

export class OpenAiResponsesClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly instructions: string,
  ) {}

  async createResponse(
    input: Array<Record<string, unknown>>,
    tools: FunctionTool[],
    textFormat?: ResponseTextFormat,
  ): Promise<LlmResponse> {
    const startedAt = Date.now();
    logger.info("openai_response_started", {
      inputItemCount: input.length,
      model: this.model,
      toolCount: tools.length,
    });
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        instructions: this.instructions,
        input,
        tools,
        ...(textFormat ? { text: { format: textFormat } } : {}),
        parallel_tool_calls: false,
        store: false,
      }),
    });

    if (!response.ok) {
      logger.info("openai_response_failed", {
        durationMs: Date.now() - startedAt,
        model: this.model,
        statusCode: response.status,
      });
      throw new Error(`OpenAI request failed (${response.status}): ${await response.text()}`);
    }

    const payload = (await response.json()) as OpenAiResponse;
    logger.info("openai_response_completed", {
      durationMs: Date.now() - startedAt,
      model: this.model,
      outputItemCount: payload.output?.length ?? 0,
      statusCode: response.status,
    });
    return { output: payload.output ?? [], outputText: extractOutputText(payload) };
  }
}
import { logger } from "../observability/logger.js";

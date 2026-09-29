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

export interface LlmResponse {
  output: Array<Record<string, unknown>>;
  outputText: string;
}

export interface LlmClient {
  createResponse(
    input: Array<Record<string, unknown>>,
    tools: FunctionTool[],
  ): Promise<LlmResponse>;
}

interface OpenAiResponse {
  output?: Array<Record<string, unknown>>;
  output_text?: string;
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
  ): Promise<LlmResponse> {
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
        parallel_tool_calls: false,
        store: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed (${response.status}): ${await response.text()}`);
    }

    const payload = (await response.json()) as OpenAiResponse;
    return { output: payload.output ?? [], outputText: payload.output_text ?? "" };
  }
}

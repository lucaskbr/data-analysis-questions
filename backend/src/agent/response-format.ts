import { z } from "zod";

export const agentResponseSchema = z.object({
  type: z.enum(["text", "data"]),
  title: z.string(),
  content: z.string(),
  suggestedQuestions: z.array(z.string()),
});

export type AgentResponse = z.infer<typeof agentResponseSchema>;

export const AGENT_RESPONSE_FORMAT = {
  type: "json_schema",
  name: "analytics_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["text", "data"] },
      title: { type: "string" },
      content: { type: "string" },
      suggestedQuestions: { type: "array", items: { type: "string" } },
    },
    required: ["type", "title", "content", "suggestedQuestions"],
    additionalProperties: false,
  },
} as const;

export function parseAgentResponse(outputText: string): AgentResponse {
  return agentResponseSchema.parse(JSON.parse(outputText));
}

import { validator } from "hono/validator";
import type { z } from "zod";

export function validateJson<TSchema extends z.ZodType>(schema: TSchema) {
  return validator("json", (value, context) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      return context.json(
        {
          error: "Invalid request body.",
          details: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        400,
      );
    }

    return parsed.data;
  });
}

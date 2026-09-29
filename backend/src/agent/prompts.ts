import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const promptPath = fileURLToPath(new URL("./agent-instructions.md", import.meta.url));
const agentInstructionsTemplate = readFileSync(promptPath, "utf8").trim();

export function createAgentInstructions(dataset: string): string {
  return agentInstructionsTemplate.replaceAll("{{DATASET}}", dataset);
}

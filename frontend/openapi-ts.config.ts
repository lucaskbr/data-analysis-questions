import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./openapi.json",
  output: {
    path: "./src/api/generated",
    tsConfigPath: "./tsconfig.app.json",
  },
  plugins: ["@hey-api/sdk", "@tanstack/react-query"],
});

import { client } from "./generated/client.gen";

/**
 * Configure the generated Fetch client once, before any generated hook runs.
 * VITE_API_URL is optional; local development uses the backend default.
 */
client.setConfig({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
});

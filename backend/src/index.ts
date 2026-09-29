import { serve } from "@hono/node-server";

import { createApp } from "./server.js";

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

serve({ fetch: app.fetch, port }, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

import "dotenv/config";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { app as api } from "./app.js";

const port = Number(process.env.PORT ?? 3001);

const app = new Hono();
app.route("/", api);

// In production the built frontend is served from the same origin. On Cloudflare
// this is handled by the platform's static assets instead.
app.use("/*", serveStatic({ root: "./web/dist" }));

serve({ fetch: app.fetch, port }, () => {
  const configured = process.env.ELEVENLABS_API_KEY ? "configured" : "MISSING - voice will fail";
  console.log(`interview api on http://localhost:${port}  (ELEVENLABS_API_KEY ${configured})`);
});

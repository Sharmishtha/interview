import { Hono } from "hono";
import { app as api, type Env } from "../server/app.js";
import { passwordGate } from "../server/gate.js";

/**
 * Cloudflare entry point.
 *
 * The Worker runs before static assets are served (run_worker_first in
 * wrangler.toml) so the password gate covers the page itself, not just the API.
 * Without that the HTML would load for anyone and only the quota-spending calls
 * would be refused.
 */
const worker = new Hono<{ Bindings: Env }>();

worker.use("*", passwordGate());
worker.route("/", api);

// Anything the API did not handle is a static file.
worker.all("*", (c) => {
  if (!c.env.ASSETS) return c.notFound();
  return c.env.ASSETS.fetch(c.req.raw);
});

export default worker;

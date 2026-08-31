import { app } from "../server/app.js";

// Cloudflare serves the built frontend from the [assets] binding in
// wrangler.toml; this Worker only handles /api routes.
export default app;

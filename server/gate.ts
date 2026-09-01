import { basicAuth } from "hono/basic-auth";
import type { MiddlewareHandler } from "hono";
import type { Env } from "./app.js";

/**
 * Password gate for a deployed instance.
 *
 * A public URL backed by a real ElevenLabs key means anyone who finds it can
 * spend the quota: every question asked is a text-to-speech call and every
 * answer a transcription call. This is the stopgap until Cloudflare Access can
 * be put in front, which needs a domain on the account.
 *
 * Any username is accepted - only the password is checked, so there is one
 * thing to share. When APP_PASSWORD is unset the gate is inert, which is what
 * keeps local development friction-free.
 */
export function passwordGate(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const password = c.env?.APP_PASSWORD ?? process.env.APP_PASSWORD;
    if (!password) return next();

    return basicAuth({
      verifyUser: (_username, supplied) => timingSafeEqual(supplied, password),
      realm: "Interview practice",
    })(c, next);
  };
}

/**
 * Compares in time independent of how many characters match, so the response
 * time cannot be used to recover the password one character at a time.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let differing = 0;
  for (let i = 0; i < a.length; i++) {
    differing |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return differing === 0;
}

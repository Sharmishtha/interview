#!/usr/bin/env node
/**
 * Post-deploy smoke test.
 *
 *   npm run smoke -- https://staging.getoutloud.ai
 *   APP_PASSWORD=... npm run smoke -- https://staging.getoutloud.ai
 *
 * Checks a deployment answers correctly on the things that are easy to get
 * wrong and quiet when they break: a missing secret, a flag left on, an asset
 * that did not upload. It uses nothing but Node's own fetch, so it runs on any
 * machine that can run the app, and it never spends money - it asserts what the
 * paid route *refuses*, never what it returns.
 *
 * Exits non-zero on the first real failure, so it can gate a promotion.
 */

const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!base) {
  console.error("usage: npm run smoke -- https://staging.getoutloud.ai");
  process.exit(2);
}

// The gate is Basic Auth, so every request carries it when a password is given.
const password = process.env.APP_PASSWORD ?? "";
const headers = password
  ? { Authorization: `Basic ${Buffer.from(`out:${password}`).toString("base64")}` }
  : {};

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${detail ? `  — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function get(path) {
  return fetch(base + path, { headers, redirect: "manual" });
}

async function postJson(path, body) {
  return fetch(base + path, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

console.log(`\nSmoke test: ${base}\n`);

// --- the page and its assets ----------------------------------------------
const page = await get("/");
if (page.status === 401) {
  console.error(
    "  FAIL  the app is password-gated and no password was given.\n" +
      "        Re-run with APP_PASSWORD=... npm run smoke -- " +
      base,
  );
  process.exit(1);
}
const html = await page.text();
check("page responds 200", page.status === 200, `status ${page.status}`);
check("page is the app", html.includes("Get Out Loud"));
check("favicon uploaded", (await get("/favicon.svg")).status === 200);

const script = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
check("bundle referenced", Boolean(script), script ?? "no /assets/*.js in the HTML");
if (script) check("bundle uploaded", (await get(script)).status === 200, script);

// --- configuration ---------------------------------------------------------
const health = await (await get("/api/health")).json();
check("health responds", health.ok === true);
check(
  "voice configured",
  health.elevenlabs === true,
  health.elevenlabs ? "" : "ELEVENLABS_API_KEY is not set on this environment",
);
console.log(
  `        second opinion: ${health.secondOpinion}   sponsor slot: ${health.sponsor ? "filled" : "empty"}`,
);

// --- the interview ---------------------------------------------------------
const interview = await (await get("/api/interview?seed=1")).json();
check("interview has three questions", interview.questions?.length === 3);
check("rubric has eight dimensions", interview.rubric?.dimensions?.length === 8);
check("panel has two seats", interview.panelists?.length === 2);

// --- scoring, which must work with no key anywhere -------------------------
const answer =
  "When I joined Gracenote in 2021 the pipeline was three days behind. I owned 40 engineers " +
  "and a $12m budget. Priya pushed back and she was right, so I rebuilt only the ingest path. " +
  "We went from 210 channels to 10,000 in nine months. What I learned was to size the smallest fix first.";

const scored = await postJson("/api/score", {
  candidateName: "smoke",
  answers: [{ questionId: interview.questions[0].id, answer, turns: [] }],
});
const card = scored.ok ? await scored.json() : null;
check("free scoring works", scored.status === 200, `status ${scored.status}`);
check("scored by the heuristic", card?.evaluatedBy?.name === "heuristic");
check("rubric row per dimension", card?.guidance?.[0]?.rubric?.length === 8);
check(
  "every row coaches",
  card?.guidance?.[0]?.rubric?.every((r) => r.suggestion && r.example),
);
check(
  "narrative present",
  typeof card?.narrative?.headline === "string" && card.narrative.headline.length > 0,
);

// --- the paid route matches what health advertises -------------------------
// Deliberately asserts the refusal, never the result: this must not spend money.
const llm = await postJson("/api/score/llm", {
  answers: [{ questionId: interview.questions[0].id, answer: "x", turns: [] }],
});
if (health.secondOpinion) {
  check(
    "second opinion is reachable (not 503)",
    llm.status !== 503,
    `status ${llm.status} — a 503 here means the flag is on but ANTHROPIC_API_KEY is missing`,
  );
} else {
  check("second opinion is refused", llm.status === 503, `status ${llm.status}`);
}

// --- input handling --------------------------------------------------------
check(
  "empty scoring request refused",
  (await postJson("/api/score", { answers: [] })).status === 400,
);
check(
  "unknown question refused",
  (await postJson("/api/score", { answers: [{ questionId: "nope", answer, turns: [] }] }))
    .status === 400,
);
check(
  "custom question needs a principle",
  (await postJson("/api/custom-question", { text: "Tell me about a hard decision you made." }))
    .status === 400,
);

console.log(failures ? `\n${failures} check(s) failed.\n` : "\nAll checks passed.\n");
process.exit(failures ? 1 : 0);

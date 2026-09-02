# Working on this repo

Voice-based VP+ executive interview **practice**. The person being interviewed is the person
using it. Read `README.md` for what it does and `BACKLOG.md` for what is next and why.

## The boundary that governs the product

This rehearses *you*. It does not assess a third-party candidate for an employer.

The moment it scores a candidate on an employer's behalf it becomes an automated employment
decision tool, picking up NYC Local Law 144 bias audits, EU AI Act high-risk obligations, and the
Illinois AI Video Interview Act — plus a duty to demonstrate the scoring is not discriminatory,
which the heuristic evaluator could not meet. Treat any feature that reports on someone else as
blocked pending legal review. In copy, say "rehearsal" and "coaching", never "assessment" or
"screening".

## Decisions worth not relitigating

**The interview guide is authoritative.** The three pillars, nine competencies, top-line
questions, probes, and positive/negative signals in `src/rubric/` and `src/questions/bank.ts` are
transcribed from a real Executive Leadership Principles guide. The signals are verbatim and drive
the band descriptors. Do not "improve" this wording — if the guide and the code disagree, the
guide wins.

**Conversation and evaluation are decoupled, with the transcript as the seam.** Scoring never
touches audio. This is what lets old sessions be re-scored when the rubric changes, rubrics be
A/B tested, and the voice layer be swapped without touching scoring.

**One Hono app, two adapters.** `server/app.ts` holds every route; `server/node.ts` and
`worker/index.ts` mount it. Never add a route to only one — they must not drift. Secrets reach
the two runtimes differently (bound to the request context on Workers, environment on Node),
which is why the speech wrappers take the API key as an argument rather than reading
`process.env` themselves.

**Every score cites spans.** `tests/evaluator.test.ts` asserts
`answer.slice(span.start, span.end) === span.text`. When the LLM evaluator lands, that constraint
is what stops it inventing evidence. Do not relax it.

**The eval corpus is the scorer's test suite.** `npm run eval` fails if tier means stop
separating, if any strong answer scores below any weak one, or if a case leaves its band. Change
a pattern, run it. Two cases are marked `knownLimitation` and are reported but not enforced —
`keyword-stuffed` (8.36) and `fake-humility` (6.29). They are documented rather than asserted
away, and they are the argument for the LLM evaluator. Do not tune thresholds to hide them.

**Coaching lifts are priced, not guessed.** The composite is a weighted sum of dimensions, so the
value of any single improvement is exactly computable. Keep it that way — a suggestion without a
number is worth much less.

## Gotchas found the hard way

Each of these cost real debugging time. They are not theoretical.

- **The ElevenLabs SDK returns a web `ReadableStream`, not a Node stream.** Draining it with
  `for await` is fragile; use `getReader()`. See `src/tts/elevenlabs.ts`.
- **Scribe returns `text: ""` for silence or unusable audio.** An empty string is falsy, so
  passing it on renders as nothing and reads as a hang. Rejected on the server and again in the
  browser. Never let an empty transcript through.
- **An ElevenLabs key ID is not the API key.** The dashboard only shows the secret at creation or
  rotation; the list afterwards shows a much shorter ID. Using the ID returns
  `api_key_id_used_as_api_key`.
- **Error severity ordering matters.** The UI once preferred a voice-unavailable note over a
  failed recording, hiding the actionable message behind an informational one. Blocking problems
  render prominently; notices sit separately.
- **`run_worker_first` in `wrangler.toml` is load-bearing.** Without it Cloudflare serves static
  assets before the Worker runs, so the password gate would leave the page open and only block
  the API.
- **Question selection must be decorrelated per pillar.** Indexing all three with the same
  seed-derived value left only 3 of 27 sets reachable. A test asserts all 27.
- **`EADDRINUSE` on :3001 looks like a hang,** because the frontend half of `npm run dev` keeps
  running after the API half crashes.
- **`.wrangler/`, `.env`, and `.dev.vars` must stay untracked.** The first was committed by
  accident once.

## Conventions

- TypeScript throughout, `strict`. Imports use `.js` extensions (NodeNext) in `src/` and
  `server/`; the web app uses bundler resolution and extensionless imports.
- The frontend declares its own view types in `web/src/types.ts` rather than importing server
  code. The API is the contract; keep them decoupled.
- Comments explain *why*, not *what*. Several in this codebase record a bug that was fixed —
  leave those in place.
- Verify in the running app, not just via types. Playwright against `dist` has caught several
  things tests did not.

## Commands

```bash
npm run dev      # API :3001 + UI :5173
npm test         # 78 tests
npm run eval     # scorer against the labelled corpus
npm run lint
npm run build
npm run deploy   # build + wrangler deploy
```

`?seed=0` pins the question set for repeatable rehearsal; `?intensity=pressure` draws the harder
failure-owning questions.

## Secrets

`ELEVENLABS_API_KEY` and `APP_PASSWORD`, in `.env` locally and `wrangler secret put` on
Cloudflare. Never in the repo, never in a commit message, never echoed into logs.

## History

Built in one session, September 2026: <https://claude.ai/code/session_01S5nRV3hwcfEb1A6Bp7MUEF>

The commit messages carry the reasoning behind each change and are worth reading before altering
the rubric, the evaluator, or the deployment setup.

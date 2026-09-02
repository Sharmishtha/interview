# interview

Voice-based **VP+ executive interview practice**, built on the Executive Leadership Principles
interview guide.

A CTO and a CEO ask you one top-line question per pillar, out loud, then probe. You answer out
loud. At the end you choose to reveal a scorecard that shows what you scored, the evidence
behind it, and exactly what would have taken each answer to an 8.

Built as a **rehearsal tool** — you are the interviewee. The output is coaching feedback and
progress across sessions, not a hire/no-hire verdict.

## How it works

Conversation and evaluation are deliberately decoupled, with the **transcript as the seam**.
Old interviews can be re-scored when the rubric changes, rubrics can be A/B tested, and the
voice layer can be swapped without touching the scoring logic.

```
Question bank (competency-tagged, each with probe triggers)
      |
Browser UI  --->  /api/tts   --->  ElevenLabs TTS      (panelist asks)
      ^           /api/stt   --->  ElevenLabs Scribe   (you answer)
      +--- Transcript
                |
      Evaluator      -> citable spans + per-dimension scores
                |
      Scorer         -> competency scores against BARS anchors
                |
      Scorecard      -> strengths, gaps, answer-level coaching
```

The ElevenLabs API key lives only on the server; the browser never sees it.

## The panel

| Seat | Asks about |
| --- | --- |
| **Ravi Menon**, CTO | Raise the Bar, Act with Courage, Build Resilience, Be Real, Grow Groundbreakers |
| **Claire Whitfield**, CEO | Turns Vision Into Action, Makes Smart Decisions, Energizes the Team, Lead Across |

## The rubric

Straight from the interview guide: three pillars, three competencies each, nine in total. A
session asks **one top-line question per pillar**, as the guide's process requires.

| Pillar | Competencies |
| --- | --- |
| **Plan with Purpose** | Turns Vision Into Action · Makes Smart Decisions · Energizes the Team |
| **Pursue Excellence** | Raise the Bar · Act with Courage · Build Resilience |
| **Prioritize People** | Be Real · Lead Across · Grow Groundbreakers |

All nine carry equal weight, because the guide treats the three pillars as equally required.

Each competency carries the guide's **positive and negative signals verbatim**, and those drive
the five band descriptors: the bottom band describes the negative signals, the top band describes
the positive signals fully realised. Detected negative signals are surfaced on the scorecard in
the guide's own wording.

**Evidence dimensions** — how each answer is graded (`src/rubric/dimensions.ts`). The guide asks
interviewers to establish the Situation, Task, Action, Result and Learning, so the dimensions are
aligned to STAR-L:

| Dimension | Weight |
| --- | --- |
| STAR-L structure | 0.20 |
| Specificity | 0.18 |
| Quantified outcomes | 0.18 |
| Learning | 0.17 |
| Ownership | 0.15 |
| Scope & scale | 0.12 |

**Probes are data, not improvisation.** Every question carries the guide's optional probing
questions, one of which the panel asks live as a follow-up. The rest appear on the scorecard so
you can rehearse them.

**Pressure questions.** Alongside the guide's nine top-line questions there is a harder variant
for each principle, every one of which requires owning a failure rather than narrating a success
- a failed strategy, a promotion that did not work out, a time you stayed silent. That is where
the guide's negative signals actually surface, because a rehearsed candidate can carry the
standard questions on prepared material. Request them with `?intensity=pressure`, or
`?intensity=mixed` to draw from both pools.

## Coaching: how to reach 8+

The scorecard's centrepiece. For every answer it lists the highest-leverage changes, **priced
exactly**: because the composite is a weighted sum of the dimensions, the value of any single
improvement is computable rather than guessed at.

```
2.6 -> 6.5  with the 3 changes below

+1.44  Specificity  0.0 -> 8
       Cut the philosophy and open with one named situation instead: the
       business, the year, and who was involved.

+1.26  Quantified outcomes  1.0 -> 8
       State the Result as a number with a before and an after.

+1.20  STAR-L structure  2.0 -> 8
       Add the Situation, then the Task, then the Action, then the Result,
       then the Learning. The interviewer is explicitly working to establish
       all five.
```

Each answer also shows the negative signals it appears to trigger, the interviewer's follow-ups
(marked where the answer likely never touched them), and what the interviewer is listening for.

The score is deliberately withheld until you ask for it — the interview ends, then a **See my
score** button reveals the scorecard.

## Evaluation set

Scoring systems need their own tests. `src/eval/cases.ts` is a labelled corpus of answers —
weak, mixed, and strong — with expected score ranges per case and per dimension.

```bash
npm run eval
```

```
means   weak 2.55   mixed 5.13   strong 7.87   separation 5.32
ranking accuracy (every strong > every weak): 100%
```

The suite fails if tier means stop separating, if any strong answer scores below any weak
one, or if a case leaves its expected band. It also runs inside `npm test`.

Two cases are marked `knownLimitation` — reported but not enforced:

| Case | Scores | Why it is wrong |
| --- | --- | --- |
| `keyword-stuffed` | 8.36 | Semantically empty but hits every surface pattern — outscores three of four genuine strong answers |
| `fake-humility` | 6.29 | A humblebrag in hindsight language reads as real self-awareness |

These are the standing argument for the LLM evaluator in phase 4, and they are documented
rather than asserted away.

## Project layout

```
src/
  types.ts              domain types
  rubric/               9 competencies with signals and 5 bands each; 6 STAR-L dimensions
  questions/bank.ts     9 guide questions + 9 harder pressure variants, all with probes
  panel/                CTO + CEO panel, session lifecycle
  scoring/
    evaluator.ts         Evaluator interface + deterministic HeuristicEvaluator
    scorer.ts            dimension -> competency -> overall roll-up
    coach.ts             priced lifts to 8+, negative-signal flags, open probes
  eval/                 labelled corpus + harness + CLI runner
  tts/ stt/             ElevenLabs speech synthesis and Scribe transcription
  report/render.ts      terminal scorecard
server/
  app.ts                Hono API: /api/interview, /api/tts, /api/stt, /api/score
  node.ts               Node adapter for local dev, also serves web/dist
worker/index.ts         Cloudflare Worker adapter
wrangler.toml           Worker + static asset config
web/                    Vite + React frontend
tests/                  74 tests: rubric, scoring math, evaluator, coaching, voice wrappers, eval corpus
```

## Setup

### The whole sequence, in order

Every command below is run **on your own machine, inside the `interview` folder** — there is no
web console involved. `wrangler` is installed with the project and talks to Cloudflare over the
network. The two callouts are the failures this actually hit in practice.

```bash
# 1. Prerequisites
node --version                                  # must be v20 or higher

# 2. Get the code
git clone https://github.com/Sharmishtha/interview
cd interview
npm install

# 3. Add the key
cp .env.example .env                            # then edit: ELEVENLABS_API_KEY=sk_...

# 4. Run it locally
npm run dev                                     # API on :3001, UI on :5173
#    open http://localhost:5173 - you should HEAR the first question

# 5. Deploy (a second terminal, same folder)
npx wrangler login                              # opens a browser, click Allow
npx wrangler secret put ELEVENLABS_API_KEY      # paste the same key
npx wrangler secret put APP_PASSWORD            # gates the deployed app
npx wrangler secret put ANTHROPIC_API_KEY       # optional: the second-opinion score
npm run deploy                                  # prints your live URL
```

> **The key must be the secret, not the key ID.** ElevenLabs shows the secret only once, at the
> moment you create or rotate the key; the dashboard list afterwards shows a much shorter ID.
> Using the ID returns `invalid_api_key` with `api_key_id_used_as_api_key`.

> **`npm run dev` fails with an error object containing `port: 3001`?** That is `EADDRINUSE` - an
> earlier run is still holding the port, and the terminal looks frozen because the frontend half
> kept going. Free it and start again:
> ```bash
> lsof -ti:3001 | xargs kill -9                 # macOS / Linux
> ```
> ```powershell
> Get-NetTCPConnection -LocalPort 3001 | Select-Object -Expand OwningProcess |
>   ForEach-Object { Stop-Process -Id $_ -Force }   # Windows
> ```

Everything above is expanded below.

### Prerequisites

- **Node.js 20 or newer** (`node --version`). Node 20 is required for the global `File` class the
  transcription upload uses.
- **An ElevenLabs API key** — optional. Without one the app still runs; see
  [Running without a key](#running-without-a-key).
- **A microphone** — optional. There is a **Type instead** button on every question.

### 1. Clone and install

```bash
git clone https://github.com/Sharmishtha/interview
cd interview
npm install
```

### 2. Add your ElevenLabs key

Get one from [elevenlabs.io](https://elevenlabs.io) → your profile → **API Keys**. Then:

```bash
cp .env.example .env
```

Open `.env` and fill it in:

```
ELEVENLABS_API_KEY=sk_your_key_here

# Optional. Enables the second-opinion score; everything else works without it.
ANTHROPIC_API_KEY=sk-ant-your_key_here
```

`.env` is listed in `.gitignore`, so it is never committed. The key is read by the server only
and is never sent to the browser: the page calls `/api/tts` and `/api/stt`, and the server makes
the ElevenLabs calls on its behalf.

### 3. Run it

```bash
npm run dev
```

That starts both processes — the API on **:3001** and the UI on **:5173**. Open:

```
http://localhost:5173
```

Use `localhost`, not your machine's LAN IP: browsers only grant microphone access on a secure
origin, and `localhost` counts as one while `192.168.x.x` does not.

### 4. Check it is working

Enter a name and press **Begin interview**. You should hear Claire Whitfield read the first
question aloud, and Ravi Menon sound different on his. If a grey notice appears under the
buttons instead, voice is not reaching ElevenLabs — see [Troubleshooting](#troubleshooting).

For a faster check that skips the UI:

```bash
curl -X POST localhost:3001/api/tts \
  -H 'Content-Type: application/json' \
  -d '{"text":"testing one two three","panelistId":"ceo"}' \
  -o test.mp3
```

A playable MP3 means voice works. A file containing JSON means it failed, and the JSON says why.

### Running without a key

The app degrades rather than breaking. It reports that voice is unavailable, shows each question
on screen, and you answer with **Type instead**. Everything downstream — scoring, the rubric,
the coaching — works identically, because they run on the transcript rather than the audio.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | API + frontend with reload — the one you want day to day |
| `npm run build` | Type-check the server, build the frontend |
| `npm start` | Serve the built app from the API alone on :3001 |
| `npm run deploy` | Build, then `wrangler deploy` to Cloudflare |
| `npm run cf:dev` | Run the Worker locally under workerd |
| `npm run demo` | Print a scorecard in the terminal, no browser or key needed |
| `npm run eval` | Run the evaluation set against the rubric |
| `npm test` | Full test suite (74 tests) |
| `npm run lint` / `npm run format` | Lint / format |

Two useful details:

- **`?seed=0`** — `http://localhost:5173/?seed=0` pins the question set, so you can rehearse the
  same three questions repeatedly and watch your scores move. Omit it and you get a rotating set.
- **`PORT=4000 npm run dev:api`** — moves the API if :3001 is taken. Update the `proxy` target in
  `web/vite.config.ts` to match.

## Deploying to Cloudflare

The API is written with [Hono](https://hono.dev) and runs unchanged in both places: under
Node locally (`server/node.ts`) and as a Cloudflare Worker (`worker/index.ts`). There is one
set of routes in `server/app.ts`, so the two cannot drift.

```bash
npx wrangler login
npx wrangler secret put ELEVENLABS_API_KEY    # paste the key when prompted
npm run deploy                                # builds, then wrangler deploy
```

`wrangler.toml` serves `web/dist` through the `[assets]` binding, so Cloudflare returns the
frontend directly and the Worker runs only for `/api/*`. `npm run cf:dev` runs the Worker
locally under workerd if you want to check it before shipping.

The key is a Wrangler **secret**, never a `[vars]` entry and never in the repo — `.env` and
`dotenv` do not exist on Workers.

### Lock it down before you share the URL

**This matters more than the deploy.** A public URL backed by your key means anyone who finds
it spends your ElevenLabs quota: every question asked is a TTS call, every answer a Scribe call.

**Password gate (built in).** Set one secret and the whole app sits behind a browser password
prompt:

```bash
npx wrangler secret put APP_PASSWORD
npm run deploy
```

Any username works - only the password is checked, so there is a single thing to share. The
Worker runs ahead of the static assets (`run_worker_first` in `wrangler.toml`), so the prompt
appears before the page loads rather than only blocking the API. Leave `APP_PASSWORD` unset and
the gate is inert, which is what keeps local development free of prompts; add `APP_PASSWORD=...`
to `.env` to gate locally too.

This is a stopgap, and an honest one: Basic Auth over HTTPS keeps strangers off a personal tool,
but it is a single shared password with no per-person revocation and no audit trail. For
anything beyond that, use Access.

**Cloudflare Access (better, needs a domain).**
[Access](https://developers.cloudflare.com/cloudflare-one/applications/) gates the app at the
edge with real identity - per-person email policies, revocation, and logs - and needs no code.

**Check this prerequisite first:** Access policies apply to hostnames in a zone *you* have added
to Cloudflare. A `*.workers.dev` URL sits in Cloudflare's own zone, so **you cannot put Access in
front of it**. You need a domain on your account, with the Worker bound to it as a custom domain.
If you do not have one, either add a domain or keep the deployment private another way.

Once the Worker answers on your own hostname:

1. Cloudflare dashboard → **Zero Trust** → **Access** → **Applications** → **Add an application**
2. Choose **Self-hosted**, and enter that hostname
3. Add a policy — action **Allow**, include **Emails** → your own address
4. Save

Visitors then get a one-time PIN by email before the app loads, and unauthenticated requests
never reach the Worker, so they cannot spend your quota.

Until you have a domain on the account, the password gate above is the control to use.

## Troubleshooting

| What you see | What it means |
| --- | --- |
| `ELEVENLABS_API_KEY is not set` | No `.env`, or it is not in the repo root, or the server was started before you created it. Fix it and restart. |
| `Status code: 401` / `invalid_api_key` | The key is wrong, revoked, or has trailing whitespace. Check for a stray quote — the value needs no quotes. |
| `Host not in allowlist` or a proxy 403 | Your network is blocking `api.elevenlabs.io`, usually a corporate proxy or VPN. The key is fine; the request never left your machine. |
| `Status code: 429` | ElevenLabs rate limit or an exhausted character quota on your plan. |
| `The second-opinion evaluator is not configured` | No `ANTHROPIC_API_KEY`. The ordinary score is unaffected — that evaluator needs no key and never calls out. |
| Question text appears but no audio | Browser autoplay blocking. Press **Replay**; a click counts as the gesture browsers require. |
| **Record answer** is greyed out | The browser exposes no recorder. Use **Type instead**, and check you are on `localhost` rather than a LAN IP. |
| Microphone permission never prompts | Same secure-origin rule — use `http://localhost:5173`. |
| `EADDRINUSE :3001` | Something already holds the port. `PORT=4000 npm run dev:api`, or stop the other process. |

## Roadmap

- [x] **Phase 0 — Rubric.** Competencies with behavioural anchors, question bank with probes,
      scoring pipeline, deterministic evaluator, scorecard.
- [x] **Phase 1 — Voice out.** ElevenLabs TTS asks the questions in distinct panelist voices.
- [x] **Phase 2 — Voice in.** Browser mic capture → Scribe → transcript → score, with one
      panel follow-up probe per question, and coaching to 8+ on every answer. Confirmed working
      end to end against the live ElevenLabs API.
- [ ] **Phase 3 — Natural conversation.** ElevenLabs Agents Platform for real-time turn-taking
      and adaptive probing; agent prompt generated from the question bank.
- [ ] **Phase 4 — LLM evaluator + trends.** Claude reads the band descriptors and scores with
      cited spans, closing the two known limitations above; per-competency progress across
      sessions and targeted drills.

### About the heuristic evaluator

`HeuristicEvaluator` does not understand your answer. It detects the surface features that
separate strong answers from weak ones — numbers, named situations, I/we ratio, hindsight
language, a complete situation→action→result arc. That is enough for useful rehearsal
feedback and to regression-test the pipeline with no API calls. Ownership deliberately
penalises both extremes: all-"we" hides your contribution, all-"I" gives the team no credit.

Every score cites spans, and a test asserts `answer.slice(span.start, span.end) === span.text`.
When the LLM evaluator lands, that constraint is what stops it inventing evidence.

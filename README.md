# interview

Voice-based interview practice for **VP of Engineering candidates at a public company**.

A CTO and a CEO ask you questions out loud. You answer out loud. Your transcript is scored
against a behaviourally-anchored rubric, and you get the evidence behind every score.

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

| Seat | Pushes on |
| --- | --- |
| **Ravi Menon**, CTO | Architecture and build-vs-buy judgment, reliability and incident ownership, tech debt, org design |
| **Claire Whitfield**, CEO | Hitting committed dates when guidance depends on them, R&D spend, conflict with product, board communication |

## The rubric

Two layers, which is what makes scoring consistent rather than vibes-based.

**Competencies** — what is assessed, each with five written band descriptors
(`src/rubric/competencies.ts`). Several are deliberately public-company specific:

| Competency | Weight |
| --- | --- |
| Technical judgment | 0.16 |
| Org design & talent | 0.16 |
| Delivery predictability | 0.16 |
| Reliability, quality & risk | 0.13 |
| R&D efficiency | 0.12 |
| Cross-functional & executive influence | 0.12 |
| Scaling & change leadership | 0.08 |
| Judgment & self-awareness | 0.07 |

Delivery predictability carries real weight because dates get tied to guidance; R&D
efficiency because R&D as a percentage of revenue is a number the street watches;
reliability includes the SOX and disclosure overlay a private-company VP never meets.

**Evidence dimensions** — how each answer is graded (`src/rubric/dimensions.ts`):
specificity · scope & scale · ownership · quantified outcomes · reflection · structure.

Answers are scored on the six dimensions; those composites roll up into the competencies
their question was tagged with. Written band anchors — rather than a bare 0–10 scale — are
the single biggest lever on scoring consistency.

**Probes are data, not improvisation.** Every question carries the follow-ups that turn a
rehearsed narrative into evidence: *"put a number on it"*, *"what was the strongest case for
the option you rejected?"*, *"was that date tied to anything we had said publicly?"*

## Evaluation set

Scoring systems need their own tests. `src/eval/cases.ts` is a labelled corpus of answers —
weak, mixed, and strong — with expected score ranges per case and per dimension.

```bash
npm run eval
```

```
means   weak 2.54   mixed 5.32   strong 7.88   separation 5.34
ranking accuracy (every strong > every weak): 100%
```

The suite fails if tier means stop separating, if any strong answer scores below any weak
one, or if a case leaves its expected band. It also runs inside `npm test`.

Two cases are marked `knownLimitation` — reported but not enforced:

| Case | Scores | Why it is wrong |
| --- | --- | --- |
| `keyword-stuffed` | 8.46 | Semantically empty but hits every surface pattern — outscores three of four genuine strong answers |
| `fake-humility` | 6.04 | A humblebrag in hindsight language reads as real self-awareness |

These are the standing argument for the LLM evaluator in phase 4, and they are documented
rather than asserted away.

## Project layout

```
src/
  types.ts              domain types
  rubric/               8 competencies with 5 behavioural bands each; 6 evidence dimensions
  questions/bank.ts     13 VP-Eng questions, competency-tagged, with probes
  panel/                CTO + CEO panel, session lifecycle
  scoring/
    evaluator.ts         Evaluator interface + deterministic HeuristicEvaluator
    scorer.ts            dimension -> competency -> overall roll-up
  eval/                 labelled corpus + harness + CLI runner
  tts/ stt/             ElevenLabs speech synthesis and Scribe transcription
  report/render.ts      terminal scorecard
server/index.ts         Express API: /api/interview, /api/tts, /api/stt, /api/score
web/                    Vite + React frontend
tests/                  34 tests: rubric integrity, scoring math, evaluator discrimination, eval corpus
```

## Setup

```bash
npm install
cp .env.example .env   # add your ELEVENLABS_API_KEY
npm run dev            # API on :3001, UI on :5173
```

| Command | Description |
| --- | --- |
| `npm run dev` | API + frontend with reload |
| `npm run build` | Type-check server, build frontend |
| `npm start` | Serve the built app from the API on :3001 |
| `npm run demo` | Terminal scorecard from the eval corpus |
| `npm run eval` | Run the evaluation set |
| `npm test` | Full test suite |
| `npm run lint` / `npm run format` | Lint / format |

Without an `ELEVENLABS_API_KEY` the app still works: it reports that voice is unavailable and
falls back to reading questions on screen with a **Type instead** option, which is also the
path to use when no microphone is available.

## Roadmap

- [x] **Phase 0 — Rubric.** Competencies with behavioural anchors, question bank with probes,
      scoring pipeline, deterministic evaluator, scorecard.
- [x] **Phase 1 — Voice out.** ElevenLabs TTS asks the questions in distinct panelist voices.
- [x] **Phase 2 — Voice in.** Browser mic capture → Scribe → transcript → score, with one
      panel follow-up probe per question.
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

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
  questions/bank.ts     9 top-line questions, one per competency, with the guide's probes
  panel/                CTO + CEO panel, session lifecycle
  scoring/
    evaluator.ts         Evaluator interface + deterministic HeuristicEvaluator
    scorer.ts            dimension -> competency -> overall roll-up
    coach.ts             priced lifts to 8+, negative-signal flags, open probes
  eval/                 labelled corpus + harness + CLI runner
  tts/ stt/             ElevenLabs speech synthesis and Scribe transcription
  report/render.ts      terminal scorecard
server/index.ts         Express API: /api/interview, /api/tts, /api/stt, /api/score
web/                    Vite + React frontend
tests/                  48 tests: rubric integrity, scoring math, evaluator discrimination, eval corpus
```

## Setup

```bash
npm install
cp .env.example .env   # add your ELEVENLABS_API_KEY
npm run dev            # API on :3001, UI on :5173
# ?seed=0 on the UI pins the question set so you can rehearse the same three
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
      panel follow-up probe per question, and coaching to 8+ on every answer.
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

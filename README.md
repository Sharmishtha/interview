# interview

A virtual executive interview panel that asks you questions by voice, listens to your
answers, and scores them against a behaviourally-anchored rubric.

Built as a **rehearsal tool**: you are the interviewee. The output is coaching feedback and
progress across sessions, not a hire/no-hire verdict.

## How it works

Conversation and evaluation are deliberately decoupled, with the **transcript as the seam**.
That means old interviews can be re-scored when the rubric changes, rubrics can be A/B
tested, and the voice layer can be swapped without touching the scoring logic.

```
Question bank (competency-tagged, each with probe triggers)
      |
Interview runner ---> ElevenLabs TTS (panelist asks)
      ^               ElevenLabs Scribe STT (you answer)
      +--- Transcript
                |
      Evaluator      -> citable spans + per-dimension scores
                |
      Scorer         -> competency scores against BARS anchors
                |
      Scorecard      -> strengths, gaps, answer-level coaching
```

## The rubric

Two layers, which is what makes scoring consistent rather than vibes-based.

**Competencies** — what is being assessed, each with five written band descriptors
(`src/rubric/competencies.ts`):

| Competency | Weight |
| --- | --- |
| Strategic thinking | 0.20 |
| Leadership & talent | 0.18 |
| Business & financial acumen | 0.15 |
| Execution & operational rigor | 0.15 |
| Board & stakeholder influence | 0.12 |
| Change leadership | 0.10 |
| Judgment & self-awareness | 0.10 |

**Evidence dimensions** — how each individual answer is graded
(`src/rubric/dimensions.ts`): specificity · scope & scale · ownership · quantified
outcomes · reflection · structure.

Answers are scored on the six dimensions; those composites roll up into the competencies
their question was tagged with. Written band anchors — rather than a bare 0–10 scale —
are the single biggest lever on scoring consistency.

**Probes are data, not improvisation.** Every question in the bank carries the follow-ups
that turn a rehearsed narrative into evidence ("put a number on it", "what was the
strongest case for the option you rejected?"). Probing is where executive interviews are
won or lost.

## Project layout

```
src/
  types.ts              domain types
  rubric/
    competencies.ts      7 competencies with 5 behavioural bands each
    dimensions.ts        6 evidence dimensions
  questions/bank.ts      12 executive questions, competency-tagged, with probes
  panel/
    panelist.ts          4-seat exec panel (chair, CEO, CHRO, CFO)
    session.ts           session lifecycle
  scoring/
    evaluator.ts         Evaluator interface + deterministic HeuristicEvaluator
    scorer.ts            dimension -> competency -> overall roll-up
  report/render.ts       terminal scorecard
  tts/elevenlabs.ts      ElevenLabs text-to-speech
tests/                   24 tests: rubric integrity, scoring math, evaluator discrimination
```

## Setup

```bash
npm install
cp .env.example .env   # add your ELEVENLABS_API_KEY
npm run dev            # scores a weak vs. strong answer to show the rubric working
```

| Command | Description |
| --- | --- |
| `npm run dev` | Run the demo scorecard |
| `npm run build` | Type-check and compile to `dist/` |
| `npm test` | Run the test suite |
| `npm run lint` | Lint |
| `npm run format` | Format with Prettier |

## Roadmap

- [x] **Phase 0 — Rubric.** Competencies with behavioural anchors, question bank with
      probes, scoring pipeline, deterministic evaluator, scorecard. No audio dependencies.
- [ ] **Phase 1 — Voice out.** ElevenLabs TTS asks the questions; you type answers.
      Distinct voice per panelist.
- [ ] **Phase 2 — Voice in.** Browser mic capture → ElevenLabs Scribe → transcript → score.
      Turn-based, press to record.
- [ ] **Phase 3 — Natural conversation.** ElevenLabs Agents Platform for real-time
      turn-taking and adaptive probing; agent prompt generated from the question bank.
- [ ] **Phase 4 — LLM evaluator + trends.** Claude reads the band descriptors and scores
      with cited spans; per-competency progress across sessions and targeted drills.

### About the heuristic evaluator

`HeuristicEvaluator` does not understand your answer. It detects the surface features that
separate strong executive answers from weak ones — numbers, named situations, I/we ratio,
hindsight language, a complete situation→action→result arc. That is enough to give useful
rehearsal feedback and to regression-test the pipeline with no API calls. The LLM evaluator
in phase 4 implements the same `Evaluator` interface and slots in behind it.

# interview

A virtual interview panel with an automated scoring mechanism.

## Concept

- A panel of virtual **panelists** (technical, behavioral, domain-expert) asks a candidate
  questions.
- Panelist questions can be spoken aloud via **ElevenLabs** text-to-speech
  (`src/tts/elevenlabs.ts`).
- Candidate responses are scored against a weighted **rubric** (`src/scoring/criteria.ts`),
  producing a per-question and overall session score.

## Project layout

```
src/
  types.ts           domain types: Panelist, InterviewQuestion, ResponseScore, InterviewSession...
  panel/
    panelist.ts       panelist definitions / default panel
    session.ts         interview session lifecycle
  scoring/
    criteria.ts        default scoring rubric
    scorer.ts           weighted scoring logic
  tts/
    elevenlabs.ts       ElevenLabs text-to-speech integration
  index.ts             example wiring
tests/
  scorer.test.ts       unit tests for the scoring mechanism
```

## Setup

```bash
npm install
cp .env.example .env   # add your ELEVENLABS_API_KEY
```

## Scripts

| Command         | Description                          |
| ---------------- | ------------------------------------ |
| `npm run dev`    | Run `src/index.ts` with auto-reload   |
| `npm run build`  | Type-check and compile to `dist/`     |
| `npm test`       | Run the test suite (vitest)           |
| `npm run lint`   | Lint the codebase                     |
| `npm run format` | Format the codebase with Prettier     |

## Status

Early scaffold: domain types, a default panel, a weighted scorer, and an ElevenLabs
TTS wrapper are in place. Not yet implemented: real-time interview orchestration,
speech-to-text for candidate answers, and a persistence layer.

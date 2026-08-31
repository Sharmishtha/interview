import "dotenv/config";
import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { executivePanel, panelistById } from "../src/panel/panelist.js";
import { questionById, selectQuestions } from "../src/questions/bank.js";
import { competencies, pillars } from "../src/rubric/competencies.js";
import { dimensions } from "../src/rubric/dimensions.js";
import { HeuristicEvaluator } from "../src/scoring/evaluator.js";
import { buildScorecard, scoreAnswers } from "../src/scoring/scorer.js";
import { synthesize } from "../src/tts/elevenlabs.js";
import { transcribe } from "../src/stt/elevenlabs.js";
import type { AnswerRecord, InterviewSession } from "../src/types.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(express.json({ limit: "2mb" }));
app.use(express.raw({ type: "audio/*", limit: "50mb" }));

/** The interview to run: panel, questions, and the rubric it will be scored against. */
app.get("/api/interview", (req, res) => {
  // The guide's process: one top-line question per pillar.
  const seed = Number(req.query.seed ?? Date.now());

  res.json({
    panelists: executivePanel,
    questions: selectQuestions(seed),
    rubric: {
      pillars,
      competencies: competencies.map(({ id, name, pillar, description, positiveSignals }) => ({
        id,
        name,
        pillar,
        description,
        positiveSignals,
      })),
      dimensions,
    },
  });
});

/** Speaks a panelist's line. The API key stays here and never reaches the browser. */
app.post("/api/tts", async (req, res) => {
  try {
    const { text, panelistId } = req.body as { text?: string; panelistId?: string };
    if (!text?.trim()) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const audio = await synthesize(text, panelistId ? panelistById.get(panelistId)?.voiceId : undefined);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(audio);
  } catch (error) {
    res.status(502).json({ error: message(error) });
  }
});

/** Transcribes a recorded answer. Body is the raw audio blob from MediaRecorder. */
app.post("/api/stt", async (req, res) => {
  try {
    const audio = req.body as Buffer;
    if (!Buffer.isBuffer(audio) || audio.length === 0) {
      res.status(400).json({ error: "Expected a non-empty audio body." });
      return;
    }

    const result = await transcribe(audio, req.headers["content-type"] ?? "audio/webm");
    res.json(result);
  } catch (error) {
    res.status(502).json({ error: message(error) });
  }
});

/** Scores a completed set of answers and returns the scorecard. */
app.post("/api/score", async (req, res) => {
  try {
    const { candidateName, answers } = req.body as {
      candidateName?: string;
      answers?: AnswerRecord[];
    };

    if (!Array.isArray(answers) || answers.length === 0) {
      res.status(400).json({ error: "answers is required" });
      return;
    }

    const questions = answers
      .map((a) => questionById.get(a.questionId))
      .filter((q): q is NonNullable<typeof q> => Boolean(q));

    if (questions.length !== answers.length) {
      res.status(400).json({ error: "One or more answers reference an unknown question." });
      return;
    }

    const session: InterviewSession = {
      id: `session-${Date.now()}`,
      candidateName: candidateName?.trim() || "Practice run",
      panelists: executivePanel,
      questions,
      answers,
      startedAt: new Date().toISOString(),
    };

    const answerScores = await scoreAnswers(session, new HeuristicEvaluator());
    res.json(buildScorecard(session, answerScores));
  } catch (error) {
    res.status(500).json({ error: message(error) });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY) });
});

// In production the built frontend is served from the same origin.
const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");
app.use(express.static(webDist));

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

app.listen(port, () => {
  const configured = process.env.ELEVENLABS_API_KEY ? "configured" : "MISSING - voice will fail";
  console.log(`interview api on http://localhost:${port}  (ELEVENLABS_API_KEY ${configured})`);
});

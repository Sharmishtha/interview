import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "./api";
import { useRecorder } from "./useRecorder";
import type { AnswerRecord, Interview, Panelist, Scorecard } from "./types";

type Screen = "setup" | "interview" | "complete" | "scoring" | "report";
type Stage = "asking" | "answering" | "transcribing" | "review" | "probing";

export default function App() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [candidateName, setCandidateName] = useState("");
  const [interview, setInterview] = useState<Interview | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (name: string) => {
    setError(null);
    try {
      // ?seed= pins the question set, so the same three can be rehearsed again.
      const pinned = new URLSearchParams(window.location.search).get("seed");
      setInterview(await api.fetchInterview(pinned === null ? undefined : Number(pinned)));
      setCandidateName(name);
      setAnswers([]);
      setScorecard(null);
      setScreen("interview");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the interview.");
    }
  }, []);

  // The interview ends without a score; revealing it is a deliberate second step.
  const finish = useCallback((collected: AnswerRecord[]) => {
    setAnswers(collected);
    setScreen("complete");
  }, []);

  const reveal = useCallback(async () => {
    setScreen("scoring");
    try {
      setScorecard(await api.score(candidateName, answers));
      setScreen("report");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scoring failed.");
      setScreen("complete");
    }
  }, [answers, candidateName]);

  if (screen === "setup" || !interview) {
    return <Setup onStart={start} error={error} />;
  }
  if (screen === "complete") {
    return <Complete count={answers.length} onReveal={reveal} error={error} />;
  }
  if (screen === "scoring") {
    return <Centered title="Scoring your interview" subtitle="Reading your answers against the rubric." />;
  }
  if (screen === "report" && scorecard) {
    return <Report scorecard={scorecard} interview={interview} onRestart={() => setScreen("setup")} />;
  }
  return <Room interview={interview} onFinish={finish} error={error} />;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function Setup({ onStart, error }: { onStart: (name: string) => void; error: string | null }) {
  const [name, setName] = useState("");

  return (
    <main className="shell shell--center">
      <div className="setup">
        <p className="eyebrow">Executive Leadership Principles</p>
        <h1 className="display">
          VP+ Interview
          <span className="display__sub">Three questions. One per pillar.</span>
        </h1>
        <p className="lede">
          A CTO and a CEO each ask you a top-line question out loud, then probe. You answer out
          loud. Afterwards you can reveal a scorecard that shows what you scored, and exactly what
          would have taken each answer to an 8.
        </p>

        <div className="pillars">
          {[
            ["Plan with Purpose", "Vision, decisions, energy"],
            ["Pursue Excellence", "Results, courage, resilience"],
            ["Prioritize People", "Trust, influence, growing leaders"],
          ].map(([name, sub]) => (
            <div className="pillar-card" key={name}>
              <strong>{name}</strong>
              <span>{sub}</span>
            </div>
          ))}
        </div>

        <div className="panel-preview">
          <div className="panel-preview__seat">
            <span className="avatar avatar--cto">RM</span>
            <div>
              <strong>Ravi Menon</strong>
              <span>Chief Technology Officer</span>
            </div>
          </div>
          <div className="panel-preview__seat">
            <span className="avatar avatar--ceo">CW</span>
            <div>
              <strong>Claire Whitfield</strong>
              <span>Chief Executive Officer</span>
            </div>
          </div>
        </div>

        <form
          className="setup__form"
          onSubmit={(event) => {
            event.preventDefault();
            onStart(name.trim() || "Practice run");
          }}
        >
          <input
            className="input"
            placeholder="Your name (optional)"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button className="button button--primary button--lg" type="submit">
            Begin interview
          </button>
        </form>

        {error && <p className="alert">{error}</p>}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Interview room
// ---------------------------------------------------------------------------

function Room({
  interview,
  onFinish,
  error,
}: {
  interview: Interview;
  onFinish: (answers: AnswerRecord[]) => void;
  error: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("asking");
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [transcript, setTranscript] = useState("");
  const [probeTranscript, setProbeTranscript] = useState("");
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const recorder = useRecorder();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const question = interview.questions[index];
  const panelist = interview.panelists.find((p) => p.id === question.askedBy);
  const pillar = interview.rubric.pillars.find((p) => p.id === question.pillar);
  const probe = question.probes[0];
  const isLast = index === interview.questions.length - 1;

  const say = useCallback(async (text: string, speaker: Panelist | undefined) => {
    if (!speaker) return;
    try {
      const audio = await api.speak(text, speaker.id);
      const url = URL.createObjectURL(audio);
      audioRef.current?.pause();
      const element = new Audio(url);
      audioRef.current = element;
      element.onended = () => URL.revokeObjectURL(url);
      await element.play();
      setVoiceNote(null);
    } catch (cause) {
      // Voice is a nicety; the interview continues in text if it fails.
      setVoiceNote(cause instanceof Error ? cause.message : "Voice unavailable.");
    }
  }, []);

  // Ask each question aloud as it comes up.
  useEffect(() => {
    setStage("asking");
    setTranscript("");
    setProbeTranscript("");
    setDraft("");
    void say(question.text, panelist).finally(() => setStage("answering"));
    return () => audioRef.current?.pause();
  }, [question.id]);

  const handleStop = useCallback(
    async (target: "answer" | "probe") => {
      const blob = await recorder.stop();
      if (!blob || blob.size === 0) {
        setNotice("No audio captured. Try again, or switch to typing.");
        setStage(target === "probe" ? "probing" : "answering");
        return;
      }

      setStage("transcribing");
      try {
        const text = await api.transcribe(blob);
        if (target === "probe") setProbeTranscript(text);
        else setTranscript(text);
        setStage("review");
      } catch (cause) {
        setNotice(cause instanceof Error ? cause.message : "Transcription failed.");
        setStage(target === "probe" ? "probing" : "answering");
      }
    },
    [recorder],
  );

  const commit = useCallback(() => {
    const record: AnswerRecord = {
      questionId: question.id,
      answer: [transcript, probeTranscript].filter(Boolean).join("\n\n"),
      turns: [
        { speaker: "panelist", speakerId: question.askedBy, text: question.text },
        { speaker: "candidate", text: transcript },
        ...(probeTranscript
          ? [
              { speaker: "panelist" as const, speakerId: question.askedBy, text: probe?.question ?? "" },
              { speaker: "candidate" as const, text: probeTranscript },
            ]
          : []),
      ],
    };

    const next = [...answers, record];
    setAnswers(next);
    if (isLast) onFinish(next);
    else setIndex((i) => i + 1);
  }, [answers, isLast, onFinish, probe, probeTranscript, question, transcript]);

  const askProbe = useCallback(() => {
    if (!probe) return;
    setStage("probing");
    setDraft("");
    void say(probe.question, panelist);
  }, [probe, panelist, say]);

  const busy = stage === "transcribing";
  const probing = stage === "probing";

  return (
    <main className="shell">
      <header className="topbar">
        <div className="progress">
          {interview.questions.map((q, i) => (
            <span
              key={q.id}
              className={`pip ${i < index ? "pip--done" : ""} ${i === index ? "pip--active" : ""}`}
            />
          ))}
        </div>
        <span className="topbar__count">
          {index + 1} of {interview.questions.length}
        </span>
      </header>

      <section className="room">
        <div className="asker">
          <span className={`avatar ${panelist?.id === "ceo" ? "avatar--ceo" : "avatar--cto"}`}>
            {initials(panelist?.name)}
          </span>
          <div>
            <strong>{panelist?.name}</strong>
            <span>{panelist?.role}</span>
          </div>
          <span className="tag">{pillar?.name ?? question.pillar}</span>
        </div>

        <p className="question">{question.text}</p>

        {probing && probe && (
          <div className="probe">
            <span className="probe__label">Follow-up</span>
            <p>{probe.question}</p>
          </div>
        )}

        {transcript && stage !== "asking" && (
          <div className="transcript">
            <span className="transcript__label">Your answer</span>
            <p>{transcript}</p>
          </div>
        )}

        {probeTranscript && (
          <div className="transcript">
            <span className="transcript__label">Your follow-up</span>
            <p>{probeTranscript}</p>
          </div>
        )}

        <div className="controls">
          {typing ? (
            <div className="typing">
              <textarea
                className="textarea"
                rows={7}
                autoFocus
                placeholder="Type your answer..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <div className="controls__row">
                <button
                  className="button button--primary"
                  disabled={!draft.trim()}
                  onClick={() => {
                    if (probing) setProbeTranscript(draft.trim());
                    else setTranscript(draft.trim());
                    setDraft("");
                    setTyping(false);
                    setStage("review");
                  }}
                >
                  Submit answer
                </button>
                <button className="button" onClick={() => setTyping(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : recorder.recording ? (
            <div className="recording">
              <Meter level={recorder.level} />
              <button
                className="button button--stop"
                onClick={() => void handleStop(probing ? "probe" : "answer")}
              >
                Stop · {formatTime(recorder.seconds)}
              </button>
            </div>
          ) : busy ? (
            <p className="status">Transcribing…</p>
          ) : stage === "review" ? (
            <div className="controls__row">
              {probe && !probeTranscript && (
                <button className="button button--primary" onClick={askProbe}>
                  Take the follow-up
                </button>
              )}
              <button
                className={`button ${probeTranscript || !probe ? "button--primary" : ""}`}
                onClick={commit}
              >
                {isLast ? "Finish interview" : "Next question"}
              </button>
              <button
                className="button button--ghost"
                onClick={() => {
                  if (probeTranscript) setProbeTranscript("");
                  else setTranscript("");
                  setStage(probeTranscript ? "probing" : "answering");
                }}
              >
                Redo
              </button>
            </div>
          ) : (
            <div className="controls__row">
              <button
                className="button button--record"
                disabled={!recorder.supported}
                onClick={() => void recorder.start()}
              >
                <span className="dot" /> {probing ? "Answer the follow-up" : "Record answer"}
              </button>
              <button className="button button--ghost" onClick={() => setTyping(true)}>
                Type instead
              </button>
              <button
                className="button button--ghost"
                onClick={() => void say(probing && probe ? probe.question : question.text, panelist)}
              >
                Replay
              </button>
            </div>
          )}
        </div>

        {(voiceNote || recorder.error || notice || error) && (
          <p className="alert alert--soft">{voiceNote ?? recorder.error ?? notice ?? error}</p>
        )}
      </section>
    </main>
  );
}

function Meter({ level }: { level: number }) {
  const bars = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div className="meter">
      {bars.map((i) => (
        <span
          key={i}
          className="meter__bar"
          style={{
            height: `${8 + Math.max(0, level * 40 - Math.abs(i - 14) * 1.5) * 1.4}px`,
            opacity: level > (Math.abs(i - 14) / 14) * 0.8 ? 1 : 0.25,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Completion — the score is revealed only on request
// ---------------------------------------------------------------------------

function Complete({
  count,
  onReveal,
  error,
}: {
  count: number;
  onReveal: () => void;
  error: string | null;
}) {
  return (
    <main className="shell shell--center">
      <div className="complete">
        <p className="eyebrow">Interview complete</p>
        <h1 className="display">
          That&apos;s all three.
          <span className="display__sub">{count} answers recorded.</span>
        </h1>
        <p className="lede">
          Your answers have been scored against the nine Executive Leadership Principles. The
          scorecard also shows, for each answer, the specific changes that would have moved it to an
          8 — and what each one is worth.
        </p>
        <button className="button button--primary button--lg" onClick={onReveal}>
          See my score
        </button>
        {error && <p className="alert">{error}</p>}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function Report({
  scorecard,
  interview,
  onRestart,
}: {
  scorecard: Scorecard;
  interview: Interview;
  onRestart: () => void;
}) {
  const competency = useMemo(
    () => new Map(interview.rubric.competencies.map((c) => [c.id, c])),
    [interview],
  );
  const pillarName = useMemo(
    () => new Map(interview.rubric.pillars.map((p) => [p.id, p.name])),
    [interview],
  );
  const dimensionName = useMemo(
    () => new Map(interview.rubric.dimensions.map((d) => [d.id, d.name])),
    [interview],
  );
  const questionText = useMemo(
    () => new Map(interview.questions.map((q) => [q.id, q.text])),
    [interview],
  );

  return (
    <main className="shell">
      <section className="report">
        <header className="report__head">
          <div>
            <p className="eyebrow">Scorecard</p>
            <h1 className="display display--sm">{scorecard.candidateName}</h1>
          </div>
          <div className="overall">
            <span className={`overall__value score--${tier(scorecard.overall)}`}>
              {scorecard.overall.toFixed(1)}
            </span>
            <span className="overall__scale">/ 10 overall</span>
          </div>
        </header>

        <div className="callouts">
          <div className="callout callout--good">
            <span>Strengths</span>
            <p>{scorecard.strengths.map((id) => competency.get(id)?.name ?? id).join(" · ") || "—"}</p>
          </div>
          <div className="callout callout--warn">
            <span>Work on</span>
            <p>{scorecard.gaps.map((id) => competency.get(id)?.name ?? id).join(" · ") || "—"}</p>
          </div>
        </div>

        <h2 className="section">Principles</h2>
        <div className="competencies">
          {scorecard.competencyScores.map((score) => (
            <div className="competency" key={score.competency}>
              <p className="competency__pillar">{pillarName.get(score.pillar) ?? score.pillar}</p>
              <div className="competency__head">
                <strong>{competency.get(score.competency)?.name ?? score.competency}</strong>
                <span className={`score score--${tier(score.value)}`}>{score.value.toFixed(1)}</span>
              </div>
              <div className="track">
                <span className={`fill fill--${tier(score.value)}`} style={{ width: `${score.value * 10}%` }} />
              </div>
              <p className="competency__band">{score.band}</p>
            </div>
          ))}
        </div>

        <h2 className="section">How to reach 8+</h2>
        <div className="answers">
          {scorecard.guidance.map((guidance) => (
            <article className="guide" key={guidance.questionId}>
              <p className="guide__question">{questionText.get(guidance.questionId) ?? guidance.questionId}</p>

              <div className="jump">
                <span className={`score score--${tier(guidance.composite)}`}>
                  {guidance.composite.toFixed(1)}
                </span>
                <span className="jump__arrow">→</span>
                <span className={`score score--${tier(guidance.reachable)}`}>
                  {guidance.reachable.toFixed(1)}
                </span>
                <span className="jump__label">
                  with the {guidance.lifts.length} change{guidance.lifts.length === 1 ? "" : "s"} below
                </span>
              </div>

              {guidance.flags.length > 0 && (
                <ul className="flags">
                  {guidance.flags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              )}

              <ol className="lifts">
                {guidance.lifts.map((lift) => (
                  <li key={lift.dimension}>
                    <div className="lift__head">
                      <span className="gain">+{lift.compositeGain.toFixed(2)}</span>
                      <span className="lift__dim">
                        {dimensionName.get(lift.dimension) ?? lift.dimension}
                        <em>
                          {lift.from.toFixed(1)} → {lift.to}
                        </em>
                      </span>
                    </div>
                    <p>{lift.suggestion}</p>
                  </li>
                ))}
              </ol>

              <details className="drawer">
                <summary>The interviewer&apos;s follow-ups ({guidance.probes.length})</summary>
                <ul className="probes">
                  {guidance.probes.map((probe) => (
                    <li key={probe.question} className={probe.likelyUncovered ? "probes--open" : ""}>
                      {probe.question}
                      {probe.likelyUncovered && <em> likely not covered</em>}
                    </li>
                  ))}
                </ul>
              </details>

              <details className="drawer">
                <summary>What the interviewer is listening for</summary>
                <ul className="signals">
                  {guidance.listeningFor.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </div>

        <h2 className="section">Answer detail</h2>
        <div className="answers">
          {scorecard.answerScores.map((answer) => (
            <article className="answer" key={answer.questionId}>
              <div className="answer__head">
                <span className={`score score--${tier(answer.composite)}`}>
                  {answer.composite.toFixed(1)}
                </span>
                <p>{questionText.get(answer.questionId) ?? answer.questionId}</p>
              </div>
              <ul className="notes">
                {[...answer.dimensionScores]
                  .sort((a, b) => a.value - b.value)
                  .map((dimension) => (
                    <li key={dimension.dimension}>
                      <span className={`chip chip--${tier(dimension.value)}`}>
                        {dimensionName.get(dimension.dimension) ?? dimension.dimension}{" "}
                        {dimension.value.toFixed(1)}
                      </span>
                      <span className="notes__text">{dimension.rationale}</span>
                    </li>
                  ))}
              </ul>
            </article>
          ))}
        </div>

        <button className="button button--primary" onClick={onRestart}>
          Run another interview
        </button>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------

function Centered({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <main className="shell shell--center">
      <div className="centered">
        <div className="spinner" />
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </main>
  );
}

function tier(value: number): "low" | "mid" | "high" {
  if (value < 4) return "low";
  if (value < 7) return "mid";
  return "high";
}

function initials(name?: string): string {
  if (!name) return "··";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

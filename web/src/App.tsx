import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "./api";
import { PRINCIPLE_GROUPS } from "./principles";
import {
  Page,
  RailBrand,
  RailContents,
  RailHow,
  RailListening,
  RailProgress,
  RailTrend,
  Sponsor,
  useConfig,
} from "./Rails";
import * as storage from "./storage";
import { useRecorder } from "./useRecorder";
import type {
  AnswerRecord,
  Interview,
  Panelist,
  Question,
  RubricRow,
  Scorecard,
  SecondOpinion,
} from "./types";

type Screen = "setup" | "compose" | "interview" | "complete" | "scoring" | "report" | "past";
type Stage = "asking" | "answering" | "transcribing" | "review" | "probing";
type Kind = "guide" | "custom";

export default function App() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [candidateName, setCandidateName] = useState("");
  const [interview, setInterview] = useState<Interview | null>(null);
  const [kind, setKind] = useState<Kind>("guide");
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The stored attempt being re-read, if any. */
  const [pastId, setPastId] = useState<string | null>(null);

  /**
   * A question the candidate wrote travels with every scoring request, because
   * the server's bank has never heard of it. Empty for a normal interview.
   */
  const customQuestions = useMemo(
    () => (kind === "custom" && interview ? interview.questions : []),
    [interview, kind],
  );

  const begin = useCallback((name: string, loaded: Interview, asKind: Kind) => {
    setInterview(loaded);
    setKind(asKind);
    setCandidateName(name);
    setAnswers([]);
    setScorecard(null);
    setError(null);
    setScreen("interview");
  }, []);

  const start = useCallback(
    async (name: string) => {
      setError(null);
      try {
        // ?seed= pins the question set, so the same three can be rehearsed again.
        const pinned = new URLSearchParams(window.location.search).get("seed");
        begin(
          name,
          await api.fetchInterview(pinned === null ? undefined : Number(pinned)),
          "guide",
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not load the interview.");
      }
    },
    [begin],
  );

  // The interview ends without a score; revealing it is a deliberate second step.
  const finish = useCallback((collected: AnswerRecord[]) => {
    setAnswers(collected);
    setScreen("complete");
  }, []);

  const reveal = useCallback(async () => {
    setScreen("scoring");
    try {
      // Always the free evaluator. It is deterministic, instant, costs nothing
      // and needs no key, which makes it the right default for every answer.
      // A model score is a deliberate second step behind its own button.
      const scored = await api.score(candidateName, answers, customQuestions);
      setScorecard(scored);
      storage.saveAttempt(scored, interview?.questions ?? [], kind, answers);
      setScreen("report");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scoring failed.");
      setScreen("complete");
    }
  }, [answers, candidateName, customQuestions, interview, kind]);

  if (screen === "past" && pastId) {
    return <PastAttempt id={pastId} onBack={() => setScreen("setup")} />;
  }

  if (screen === "compose") {
    return (
      <Compose
        candidateName={candidateName}
        onCancel={() => setScreen("setup")}
        onReady={(name, loaded) => begin(name, loaded, "custom")}
      />
    );
  }

  if (screen === "setup" || !interview) {
    return (
      <Setup
        onStart={start}
        onCompose={(name) => {
          setCandidateName(name);
          setScreen("compose");
        }}
        onOpenPast={(id) => {
          setPastId(id);
          setScreen("past");
        }}
        error={error}
      />
    );
  }
  if (screen === "complete") {
    return <Complete count={answers.length} onReveal={reveal} error={error} />;
  }
  if (screen === "scoring") {
    return (
      <Centered
        title={kind === "custom" ? "Scoring your question" : "Scoring your interview"}
        subtitle={
          kind === "custom"
            ? "Reading your answer against the principle you chose. This one takes a few seconds longer."
            : "Reading your answers against the rubric."
        }
      />
    );
  }
  if (screen === "report" && scorecard) {
    return (
      <Report
        scorecard={scorecard}
        interview={interview}
        candidateName={candidateName}
        answers={answers}
        customQuestions={customQuestions}
        onRestart={() => setScreen("setup")}
      />
    );
  }
  return <Room interview={interview} onFinish={finish} error={error} />;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function Setup({
  onStart,
  onCompose,
  onOpenPast,
  error,
}: {
  onStart: (name: string) => void;
  onCompose: (name: string) => void;
  onOpenPast: (id: string) => void;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [past, setPast] = useState<storage.StoredAttempt[]>([]);
  const { sponsor } = useConfig();

  useEffect(() => setPast(storage.history()), []);

  return (
    <Page
      center
      left={<RailBrand tagline="Rehearse the interview out loud, before it happens." />}
      right={
        <>
          <RailHow
            steps={[
              ["Three questions", "One per pillar, asked out loud by a CTO and a CEO."],
              ["You answer out loud", "Or type, if you would rather not be heard."],
              ["Then the scorecard", "Eight dimensions, and what would move each one."],
            ]}
          />
          <Sponsor sponsor={sponsor} />
        </>
      }
    >
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
            <button
              className="button button--lg"
              type="button"
              onClick={() => onCompose(name.trim() || "Practice run")}
            >
              Practise one question
            </button>
          </form>

          {error && <p className="alert">{error}</p>}

          {past.length > 0 && (
            <History
              entries={past}
              onOpen={onOpenPast}
              onClear={() => {
                storage.clearHistory();
                setPast([]);
              }}
            />
          )}
        </div>
      </main>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Practice history
// ---------------------------------------------------------------------------

/**
 * Past attempts, from this browser's own store. Shown on the way in rather than
 * on the way out: the point of keeping them is to see whether you are getting
 * better, and that question is worth asking before you start, not after.
 */
function History({
  entries,
  onOpen,
  onClear,
}: {
  entries: storage.StoredAttempt[];
  onOpen: (id: string) => void;
  onClear: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="history">
      <div className="history__head">
        <h2 className="history__title">Your practice history</h2>
        {confirming ? (
          <span className="history__confirm">
            <button
              className="button button--ghost button--sm"
              onClick={() => {
                onClear();
                setConfirming(false);
              }}
            >
              Delete everything
            </button>
            <button
              className="button button--ghost button--sm"
              onClick={() => setConfirming(false)}
            >
              Keep it
            </button>
          </span>
        ) : (
          <button className="button button--ghost button--sm" onClick={() => setConfirming(true)}>
            Clear
          </button>
        )}
      </div>

      <ul className="history__list">
        {entries.slice(0, 8).map((entry) => (
          <li key={entry.id}>
            {/* Entries written before full scorecards were stored have nothing
                to open, so they stay readable but inert rather than dead links. */}
            {entry.scorecard ? (
              <button className="history__row history__row--open" onClick={() => onOpen(entry.id)}>
                <HistoryRow entry={entry} />
                <span className="history__go" aria-hidden="true">
                  →
                </span>
              </button>
            ) : (
              <span className="history__row">
                <HistoryRow entry={entry} />
              </span>
            )}
          </li>
        ))}
      </ul>

      <p className="history__note">
        Kept in this browser only — never sent anywhere, and gone when you clear site data.
      </p>
    </section>
  );
}

function HistoryRow({ entry }: { entry: storage.StoredAttempt }) {
  return (
    <>
      <span className={`score score--${tier(entry.overall)}`}>{entry.overall.toFixed(1)}</span>
      <span className="history__what">
        {entry.kind === "custom" ? entry.questions[0]?.text : entry.headline}
      </span>
      <span className="history__when">{shortDate(entry.at)}</span>
    </>
  );
}

/**
 * A stored attempt, reopened.
 *
 * Renders the same report the candidate saw on the day, from the scorecard kept
 * in this browser. The rubric wording is fetched rather than stored, so an old
 * attempt reads against the rubric as it stands now - which is the version they
 * are about to be interviewed against.
 */
function PastAttempt({ id, onBack }: { id: string; onBack: () => void }) {
  const entry = useMemo(() => storage.attempt(id), [id]);
  const [rubric, setRubric] = useState<Interview["rubric"] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void api
      .fetchInterview()
      .then((interview) => live && setRubric(interview.rubric))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  if (!entry?.scorecard) {
    return (
      <Dead
        title="That attempt is no longer stored"
        detail="History is kept in this browser, and this one has been cleared or aged out."
        onBack={onBack}
      />
    );
  }

  if (failed) {
    return (
      <Dead
        title="Could not load the rubric"
        detail="Your attempt is safe — the page needs the server to label it. Try again in a moment."
        onBack={onBack}
      />
    );
  }

  if (!rubric) {
    return <Centered title="Opening your attempt" subtitle="Reading it back from this browser." />;
  }

  return (
    <Report
      scorecard={entry.scorecard}
      interview={{ panelists: [], questions: entry.questions as Question[], rubric }}
      candidateName={entry.candidateName}
      answers={entry.answers ?? []}
      customQuestions={[]}
      readOnly={{ at: entry.at, onBack }}
      onRestart={onBack}
    />
  );
}

function Dead({ title, detail, onBack }: { title: string; detail: string; onBack: () => void }) {
  return (
    <main className="shell shell--center">
      <div className="centered">
        <h2>{title}</h2>
        <p>{detail}</p>
        <div className="controls__row" style={{ justifyContent: "center", marginTop: 20 }}>
          <button className="button" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Write your own question
// ---------------------------------------------------------------------------

/**
 * Rehearsing one specific question you expect to be asked.
 *
 * The principle is chosen rather than guessed at. The same answer reads
 * differently depending on what the interviewer was listening for, so picking one
 * on someone's behalf would score them against a rubric they did not choose.
 */
function Compose({
  candidateName,
  onCancel,
  onReady,
}: {
  candidateName: string;
  onCancel: () => void;
  onReady: (name: string, interview: Interview) => void;
}) {
  const [text, setText] = useState("");
  const [competency, setCompetency] = useState("");
  const [askedBy, setAskedBy] = useState("cto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      onReady(candidateName, await api.customQuestion({ text, competency, askedBy }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not set that question up.");
      setBusy(false);
    }
  };

  const ready = text.trim().length >= 12 && competency !== "";

  return (
    <main className="shell">
      <div className="compose">
        <p className="eyebrow">Practise one question</p>
        <h1 className="display">
          What do you want to be asked?
          <span className="display__sub">
            Type the question you are dreading. The panel will ask it, then probe.
          </span>
        </h1>

        <label className="field">
          <span className="field__label">The question</span>
          <textarea
            className="textarea"
            rows={4}
            autoFocus
            placeholder="Tell me about a time you had to shut down a project your team believed in."
            maxLength={400}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <span className="field__hint">{400 - text.length} characters left</span>
        </label>

        <div className="field">
          <span className="field__label">Score it against</span>
          <span className="field__hint field__hint--above">
            The same answer reads differently depending on what the interviewer was listening for.
          </span>
          {/* Every option on screen at once. This used to be a dropdown that
              could not render until a request landed, which meant it sometimes
              rendered empty; the list is nine short strings that change roughly
              never, so it ships in the bundle instead. */}
          {PRINCIPLE_GROUPS.map((group) => (
            <div className="pgroup" key={group.pillar}>
              <span className="pgroup__name">{group.name}</span>
              <div className="pgrid">
                {group.principles.map((principle) => (
                  <button
                    key={principle.id}
                    type="button"
                    className={`pcard ${competency === principle.id ? "pcard--on" : ""}`}
                    aria-pressed={competency === principle.id}
                    onClick={() => setCompetency(principle.id)}
                  >
                    <span className="pcard__name">{principle.name}</span>
                    <span className="pcard__about">{principle.about}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="field">
          <span className="field__label">Who asks it</span>
          <div className="choices">
            {[
              ["cto", "Ravi Menon \u00b7 CTO"],
              ["ceo", "Claire Whitfield \u00b7 CEO"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`choice ${askedBy === id ? "choice--on" : ""}`}
                onClick={() => setAskedBy(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="controls__row">
          <button
            className="button button--primary button--lg"
            disabled={!ready || busy}
            onClick={() => void submit()}
          >
            {busy ? "Setting it up\u2026" : "Ask me this"}
          </button>
          <button className="button button--ghost" onClick={onCancel}>
            Back
          </button>
        </div>

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
  // Object URLs for playing your own recording back. Revoked when replaced so a
  // long session does not accumulate blobs.
  const [answerAudio, setAnswerAudio] = useState<string | null>(null);
  const [probeAudio, setProbeAudio] = useState<string | null>(null);

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
      // Voice is a nicety; the interview continues in text if it fails. The raw
      // error is kept, but after a sentence saying what it means for you.
      const detail = cause instanceof Error ? cause.message : String(cause);
      setVoiceNote(
        `The panel could not say this one out loud, so read it above and answer as normal. (${detail})`,
      );
    }
  }, []);

  const keepAudio = useCallback((blob: Blob, target: "answer" | "probe") => {
    const url = URL.createObjectURL(blob);
    if (target === "probe") {
      setProbeAudio((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
    } else {
      setAnswerAudio((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
    }
  }, []);

  // Ask each question aloud as it comes up.
  useEffect(() => {
    setStage("asking");
    setTranscript("");
    setProbeTranscript("");
    setDraft("");
    setAnswerAudio((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setProbeAudio((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    void say(question.text, panelist).finally(() => setStage("answering"));
    return () => audioRef.current?.pause();
  }, [question.id]);

  const handleStop = useCallback(
    async (target: "answer" | "probe") => {
      const blob = await recorder.stop();
      if (!blob || blob.size === 0) {
        setNotice(
          "That recording came through empty - your microphone may be muted or blocked. Try again, or type your answer instead.",
        );
        setStage(target === "probe" ? "probing" : "answering");
        return;
      }

      setStage("transcribing");
      try {
        const text = await api.transcribe(blob);
        if (!text.trim()) {
          // Belt and braces: the server already rejects an empty transcript, but
          // an empty string here would render as nothing and read as a hang.
          throw new Error(
            "We could not hear anything in that recording. Check your microphone is not muted and try again, or type your answer instead.",
          );
        }
        if (target === "probe") setProbeTranscript(text);
        else setTranscript(text);
        // Only kept once transcription succeeded, so playback never appears
        // beside an answer that did not register.
        keepAudio(blob, target);
        setStage("review");
      } catch (cause) {
        setNotice(cause instanceof Error ? cause.message : "Transcription failed.");
        setStage(target === "probe" ? "probing" : "answering");
      }
    },
    [keepAudio, recorder],
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
              {
                speaker: "panelist" as const,
                speakerId: question.askedBy,
                text: probe?.question ?? "",
              },
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

  const competency = interview.rubric.competencies.find((c) => c.id === question.competency);

  return (
    <Page
      left={
        <>
          <RailBrand />
          <RailProgress
            questions={interview.questions}
            index={index}
            pillarName={(id) => interview.rubric.pillars.find((p) => p.id === id)?.name ?? id}
          />
        </>
      }
      right={<RailListening signals={competency?.positiveSignals ?? []} />}
    >
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
              {answerAudio && <Playback src={answerAudio} />}
            </div>
          )}

          {probeTranscript && (
            <div className="transcript">
              <span className="transcript__label">Your follow-up</span>
              <p>{probeTranscript}</p>
              {probeAudio && <Playback src={probeAudio} />}
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
                    if (probeTranscript) {
                      setProbeTranscript("");
                      setProbeAudio((previous) => {
                        if (previous) URL.revokeObjectURL(previous);
                        return null;
                      });
                    } else {
                      setTranscript("");
                      setAnswerAudio((previous) => {
                        if (previous) URL.revokeObjectURL(previous);
                        return null;
                      });
                    }
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
                  onClick={() => {
                    setNotice(null);
                    void recorder.start();
                  }}
                >
                  <span className="dot" /> {probing ? "Answer the follow-up" : "Record answer"}
                </button>
                <button className="button button--ghost" onClick={() => setTyping(true)}>
                  Type instead
                </button>
                <button
                  className="button button--ghost"
                  onClick={() =>
                    void say(probing && probe ? probe.question : question.text, panelist)
                  }
                >
                  Replay
                </button>
              </div>
            )}
          </div>

          {/* A problem that stops you progressing outranks a note about voice
            playback, which is only a nicety. Both can be true at once. */}
          {(notice || recorder.error || error) && (
            <p className="alert" role="alert">
              {notice ?? recorder.error ?? error}
            </p>
          )}
          {voiceNote && <p className="alert alert--soft">{voiceNote}</p>}
        </section>
      </main>
    </Page>
  );
}

/**
 * Plays your own recording back. Hearing yourself is often a sharper coaching
 * signal than the score: pace, filler words and rambling are obvious out loud
 * and invisible in a transcript.
 */
function Playback({ src }: { src: string }) {
  return (
    <div className="playback">
      <span className="playback__label">Hear it back</span>
      <audio className="playback__audio" controls preload="metadata" src={src} />
    </div>
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
  candidateName,
  answers,
  customQuestions,
  readOnly,
  onRestart,
}: {
  scorecard: Scorecard;
  interview: Interview;
  candidateName: string;
  answers: AnswerRecord[];
  customQuestions: Question[];
  /** Set when re-reading a stored attempt: no re-scoring, no spending. */
  readOnly?: { at: string; onBack: () => void };
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
  /**
   * Dimensions this evaluator could only estimate. Marked in the detail rather
   * than hidden: a score someone is being coached against should say how
   * confident it is entitled to be.
   */
  const { sponsor } = useConfig();
  const answerText = useMemo(
    () => new Map(answers.map((a) => [a.questionId, a.answer])),
    [answers],
  );
  const approximated = useMemo(
    () => new Set(scorecard.evaluatedBy?.approximates ?? []),
    [scorecard],
  );
  const estimatedNames = useMemo(
    () => [...approximated].map((id) => dimensionName.get(id) ?? id).join(" and "),
    [approximated, dimensionName],
  );

  return (
    <Page
      left={
        <>
          <RailBrand />
          <RailContents
            items={[
              { id: "read", label: "The read" },
              { id: "reach", label: "How to reach 8+" },
              { id: "rubric", label: "Your rubric" },
            ]}
          />
        </>
      }
      right={
        <>
          <RailTrend scorecard={scorecard} dimensionName={(id) => dimensionName.get(id) ?? id} />
          <Sponsor sponsor={sponsor} />
        </>
      }
    >
      <main className="shell">
        <section className="report">
          <header className="report__head">
            <div className="coach">
              <p className="eyebrow">Nicely done — here is where you landed</p>
              <h1 className="coach__headline">{scorecard.narrative.headline}</h1>
            </div>
            <div className="overall">
              <span className={`overall__value score--${tier(scorecard.overall)}`}>
                {scorecard.overall.toFixed(1)}
              </span>
              <span className="overall__scale">/ 10 overall</span>
            </div>
          </header>

          {/* One human line per principle, before any bar chart asks to be read. */}
          <div className="reads" id="read">
            {scorecard.competencyScores.map((score) => (
              <div className="read" key={score.competency}>
                <span className="read__name">
                  {competency.get(score.competency)?.name ?? score.competency}
                </span>
                <span className={`read__score score--${tier(score.value)}`}>
                  {score.value.toFixed(1)}
                </span>
                <span className="read__text">
                  {scorecard.narrative.reads.find((r) => r.competency === score.competency)?.text ??
                    score.band}
                </span>
              </div>
            ))}
          </div>

          {scorecard.narrative.oneThing && (
            <div className="onething">
              <h2 className="onething__title">One thing to change next time</h2>
              <p className="onething__prose">{scorecard.narrative.oneThing.prose}</p>
              <div className="onething__worth">
                <span className="worth">worth +{scorecard.narrative.oneThing.gain.toFixed(2)}</span>
                <span className="worth__note">on that answer, next attempt</span>
              </div>
            </div>
          )}

          {readOnly ? (
            <p className="provenance">
              Re-reading your attempt from {shortDate(readOnly.at)}. Nothing here is re-scored, so
              the numbers are exactly what you saw on the day.
            </p>
          ) : (
            <SecondOpinionPanel
              candidateName={candidateName}
              answers={answers}
              customQuestions={customQuestions}
              heuristicOverall={scorecard.overall}
              sessionId={scorecard.sessionId}
            />
          )}

          <h2 className="section">Strengths and gaps</h2>
          <div className="callouts">
            <div className="callout callout--good">
              <span>Strengths</span>
              <p>
                {scorecard.strengths.map((id) => competency.get(id)?.name ?? id).join(" · ") || "—"}
              </p>
            </div>
            <div className="callout callout--warn">
              <span>Work on</span>
              <p>{scorecard.gaps.map((id) => competency.get(id)?.name ?? id).join(" · ") || "—"}</p>
            </div>
          </div>

          <details className="drawer drawer--section">
            <summary>The rubric&apos;s own words, principle by principle</summary>
            <div className="competencies">
              {scorecard.competencyScores.map((score) => (
                <div className="competency" key={score.competency}>
                  <p className="competency__pillar">
                    {pillarName.get(score.pillar) ?? score.pillar}
                  </p>
                  <div className="competency__head">
                    <strong>{competency.get(score.competency)?.name ?? score.competency}</strong>
                    <span className={`score score--${tier(score.value)}`}>
                      {score.value.toFixed(1)}
                    </span>
                  </div>
                  <div className="track">
                    <span
                      className={`fill fill--${tier(score.value)}`}
                      style={{ width: `${score.value * 10}%` }}
                    />
                  </div>
                  <p className="competency__band">{score.band}</p>
                </div>
              ))}
            </div>
          </details>

          <h2 className="section" id="reach">
            How to reach 8+
          </h2>
          <div className="answers">
            {scorecard.guidance.map((guidance) => (
              <article className="guide" key={guidance.questionId}>
                <p className="guide__question">
                  {questionText.get(guidance.questionId) ?? guidance.questionId}
                </p>

                <div className="jump">
                  <span className={`score score--${tier(guidance.composite)}`}>
                    {guidance.composite.toFixed(1)}
                  </span>
                  <span className="jump__arrow">→</span>
                  <span className={`score score--${tier(guidance.reachable)}`}>
                    {guidance.reachable.toFixed(1)}
                  </span>
                  <span className="jump__label">
                    with the {guidance.lifts.length} change{guidance.lifts.length === 1 ? "" : "s"}{" "}
                    below
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
                      <li
                        key={probe.question}
                        className={probe.likelyUncovered ? "probes--open" : ""}
                      >
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

          <h2 className="section" id="rubric">
            Your rubric, question by question
          </h2>
          {approximated.size > 0 && (
            <p className="estimate-note">
              {estimatedNames} {approximated.size === 1 ? "is" : "are"} estimated here. They are
              judgements about how the answer lands, and this evaluator matches surface features
              rather than reading it — a named person, a vivid phrase, a turn of events. Everything
              else below is measured from what the answer contains.
            </p>
          )}
          <div className="answers">
            {scorecard.guidance.map((guidance) => (
              <article className="answer" key={guidance.questionId}>
                <div className="answer__head">
                  <span className={`score score--${tier(guidance.composite)}`}>
                    {guidance.composite.toFixed(1)}
                  </span>
                  <p>{questionText.get(guidance.questionId) ?? guidance.questionId}</p>
                </div>

                <div className="rubric">
                  {guidance.rubric.map((row) => (
                    <RubricRowView
                      key={row.dimension}
                      row={row}
                      name={dimensionName.get(row.dimension) ?? row.dimension}
                    />
                  ))}
                </div>

                {answerText.get(guidance.questionId) && (
                  <details className="drawer">
                    <summary>What you said</summary>
                    <p className="said">{answerText.get(guidance.questionId)}</p>
                  </details>
                )}
              </article>
            ))}
          </div>

          <div className="controls__row">
            <button className="button button--primary" onClick={onRestart}>
              {readOnly ? "Back to practice" : "Run another interview"}
            </button>
          </div>
        </section>
      </main>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// One line of the rubric
// ---------------------------------------------------------------------------

/**
 * A dimension, its score, and what to do about it.
 *
 * The rationale says what is missing; on its own that leaves someone to invent
 * the fix, which is the hard part. So every row carries a suggestion and a
 * worked example - "quantify the outcome" and "churn went from 9% to 3.5% over
 * two quarters" are not the same instruction.
 */
function RubricRowView({ row, name }: { row: RubricRow; name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rrow rrow--${tier(row.value)} ${row.atTarget ? "rrow--met" : ""}`}>
      <button className="rrow__head" onClick={() => setOpen((was) => !was)} aria-expanded={open}>
        <span className="rrow__bar" style={{ width: `${row.value * 10}%` }} />
        <span className="rrow__name">
          {name}
          {row.estimated && (
            <em className="estimate" title="Matched on surface features, not read">
              estimated
            </em>
          )}
        </span>
        <span className={`rrow__score score--${tier(row.value)}`}>{row.value.toFixed(1)}</span>
        {row.compositeGain > 0 && (
          <span className="rrow__gain">+{row.compositeGain.toFixed(2)}</span>
        )}
        <span className="rrow__toggle">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="rrow__body">
          <p className="rrow__why">{row.rationale}</p>
          <p className="rrow__label">Suggestion</p>
          <p className="rrow__suggestion">{row.suggestion}</p>
          {row.example && (
            <>
              <p className="rrow__label">What that sounds like</p>
              <p className="rrow__example">{row.example}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Second opinion
// ---------------------------------------------------------------------------

/**
 * The paid evaluator, offered as a second opinion rather than as the score.
 *
 * The free scorecard is deterministic, instant, and costs nothing to run. This
 * one reads the answers, catches the things pattern matching cannot - a fluent
 * answer that means nothing - and costs money every time it runs. Presenting it
 * as an addition rather than an upgrade is the honest framing: it has not been
 * proven against the eval corpus, so it does not get to overwrite a number the
 * candidate has already been shown.
 *
 * The button hides itself entirely where no key is configured. A button that
 * cannot work is worse than no button.
 */
function SecondOpinionPanel({
  candidateName,
  answers,
  customQuestions,
  heuristicOverall,
  sessionId,
}: {
  candidateName: string;
  answers: AnswerRecord[];
  customQuestions: Question[];
  heuristicOverall: number;
  sessionId: string;
}) {
  const { secondOpinion: available } = useConfig();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SecondOpinion | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!available) return null;

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const opinion = await api.secondOpinion(candidateName, answers, customQuestions);
      setResult(opinion);
      storage.recordSecondOpinion(sessionId, opinion.overall);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The second opinion could not be reached.");
    } finally {
      setRunning(false);
    }
  };

  const delta = result ? result.overall - heuristicOverall : 0;

  return (
    <section className="second">
      <div className="second__head">
        <h2 className="second__title">Second opinion</h2>
        <span className="second__badge">Coming to the paid plan</span>
      </div>
      <p className="second__blurb">
        Your score above is worked out from what your answers contain. This one has a model read
        them instead, which catches what patterns cannot — a fluent answer that says nothing. It
        does not replace your score; the two are shown side by side so you can see where they
        disagree.
      </p>

      {result ? (
        <>
          <div className="second__result">
            <span className={`overall__value score--${tier(result.overall)}`}>
              {result.overall.toFixed(1)}
            </span>
            <span className="second__delta">
              {Math.abs(delta) < 0.05
                ? "the same as your score above"
                : `${delta > 0 ? "above" : "below"} your score above by ${Math.abs(delta).toFixed(1)}`}
            </span>
          </div>
          <ul className="second__headlines">
            {result.headlines.map((entry) => (
              <li key={entry.questionId}>{entry.headline}</li>
            ))}
          </ul>
        </>
      ) : (
        <div className="controls__row">
          <button className="button" onClick={() => void run()} disabled={running}>
            {running ? "Reading your answers…" : "Get a second opinion"}
          </button>
        </div>
      )}

      {error && <p className="alert">{error}</p>}
    </section>
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

/** "3 Sep" for this year, "3 Sep 2025" otherwise. */
function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import * as api from "./api";
import { Logo } from "./Logo";
import type { Question, Scorecard, Sponsor as SponsorConfig } from "./types";
import * as storage from "./storage";

/**
 * The page, with a rail either side of the column.
 *
 * The rule for what may live out here: it must be worth reading *while* you are
 * doing the thing in the middle, and it must never compete with the one action
 * on screen. That rules out navigation, upsells and anything that moves. What is
 * left is orientation on the left - where you are, what is coming - and context
 * on the right: what the interviewer is listening for, how you are trending.
 *
 * Both rails vanish below 1120px rather than stacking. Content that only earns
 * its place in the margin has not earned a place above the fold on a phone.
 *
 * A rail with nothing in it still renders. That is deliberate: the grid is what
 * centres the column, and dropping an empty rail would shunt the whole page
 * sideways between screens. Empty margin is the correct state for a screen with
 * nothing worth saying in it - during the interview, that is most of them.
 */
export function Page({
  left,
  right,
  center = false,
  children,
}: {
  left?: ReactNode;
  right?: ReactNode;
  center?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`page ${center ? "page--center" : ""}`}>
      <aside className="rail rail--left">{left}</aside>
      {children}
      <aside className="rail rail--right">{right}</aside>
    </div>
  );
}

/** Always the top of the left rail. The one fixed point on every screen. */
export function RailBrand({ tagline }: { tagline?: string }) {
  return (
    <div className="rail__brand">
      <Logo />
      {tagline && <p className="rail__tagline">{tagline}</p>}
    </div>
  );
}

export function RailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rail__block">
      <h2 className="rail__title">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Where you are in the interview.
 *
 * The main column carries three small pips, which say how far along you are and
 * nothing else. Out here there is room to say what is coming without putting it
 * in front of the question you are supposed to be answering.
 */
export function RailProgress({
  questions,
  index,
  pillarName,
}: {
  questions: Question[];
  index: number;
  pillarName: (id: string) => string;
}) {
  return (
    <RailBlock title="This interview">
      <ol className="steps">
        {questions.map((question, i) => (
          <li
            key={question.id}
            className={`steps__step ${i < index ? "steps__step--done" : ""} ${
              i === index ? "steps__step--now" : ""
            }`}
          >
            <span className="steps__dot" aria-hidden="true" />
            <span className="steps__label">
              {pillarName(question.pillar)}
              <em>{i < index ? "answered" : i === index ? "now" : "to come"}</em>
            </span>
          </li>
        ))}
      </ol>
    </RailBlock>
  );
}

/** Jump links for the report, which is long by the time it is worth reading. */
export function RailContents({ items }: { items: { id: string; label: string }[] }) {
  return (
    <RailBlock title="On this page">
      <ul className="toc">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`}>{item.label}</a>
          </li>
        ))}
      </ul>
    </RailBlock>
  );
}

/**
 * Movement across attempts, per dimension.
 *
 * Only appears from the second attempt, because a single score is not a trend
 * and drawing one from it would be a lie told with a chart.
 */
export function RailTrend({
  scorecard,
  dimensionName,
}: {
  scorecard: Scorecard;
  dimensionName: (id: string) => string;
}) {
  const entries = storage.history();
  if (entries.length < 2) return null;

  const rows = scorecard.answerScores[0]?.dimensionScores
    .map((score) => {
      const points = storage.trendFor(score.dimension, entries);
      if (!points || points.length < 2) return null;
      const move = points[points.length - 1]! - points[points.length - 2]!;
      return { dimension: score.dimension, move, latest: points[points.length - 1]! };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null && row.move !== 0)
    .sort((a, b) => Math.abs(b.move) - Math.abs(a.move))
    .slice(0, 5);

  if (!rows || rows.length === 0) return null;

  return (
    <RailBlock title={`Since your last of ${entries.length}`}>
      <ul className="trend">
        {rows.map((row) => (
          <li key={row.dimension}>
            <span className="trend__name">{dimensionName(row.dimension)}</span>
            <span className={`trend__move trend__move--${row.move > 0 ? "up" : "down"}`}>
              {row.move > 0 ? "↑" : "↓"} {Math.abs(row.move).toFixed(1)}
            </span>
          </li>
        ))}
      </ul>
    </RailBlock>
  );
}

/** The three steps, for someone who has not done this before. */
export function RailHow({ steps }: { steps: [string, string][] }) {
  return (
    <RailBlock title="How it works">
      <ol className="how">
        {steps.map(([title, body]) => (
          <li key={title}>
            <strong>{title}</strong>
            <span>{body}</span>
          </li>
        ))}
      </ol>
    </RailBlock>
  );
}

/**
 * The sponsor slot: bottom of the right rail, out of the way of the work.
 *
 * Text only, one box, no image and no animation - the brief was "not flashy",
 * and a slot that cannot carry a banner cannot later be filled with one by
 * accident. It renders nothing at all unless a sponsor is configured, so no
 * empty "advertisement" frame is ever shown to anyone.
 */
export function Sponsor({ sponsor }: { sponsor?: SponsorConfig | null }) {
  if (!sponsor) return null;

  return (
    <aside className="sponsor">
      <span className="sponsor__label">Sponsored</span>
      <p className="sponsor__title">{sponsor.title}</p>
      <p className="sponsor__body">{sponsor.body}</p>
      {sponsor.url && (
        <a
          className="sponsor__link"
          href={sponsor.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          {sponsor.linkText || "Find out more"} →
        </a>
      )}
    </aside>
  );
}

/**
 * This deployment's configuration, fetched once per screen that needs it.
 *
 * Failure is silent and returns the off state, which is correct: nothing here
 * gates the interview, so a config request that never lands should cost a
 * button and a box and nothing else.
 */
export function useConfig(): api.Config {
  const [config, setConfig] = useState<api.Config>({ secondOpinion: false, sponsor: null });

  useEffect(() => {
    let live = true;
    void api.config().then((loaded) => {
      if (live) setConfig(loaded);
    });
    return () => {
      live = false;
    };
  }, []);

  return config;
}

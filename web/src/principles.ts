/**
 * The nine principles, in the frontend bundle.
 *
 * This is a deliberate copy of what `src/rubric/competencies.ts` holds on the
 * server, and `tests/principles.test.ts` fails if the two ever drift.
 *
 * The reason to copy rather than fetch: choosing which principle a question is
 * scored against is the *first* thing someone does on the compose screen, and a
 * control that cannot render until a network round-trip lands is a control that
 * shows up empty when the round-trip does not. It did. Nine short strings that
 * change roughly never are not worth a request, a spinner, and a failure mode.
 *
 * The server still rebuilds and validates every custom question, so this list
 * decides what is offered, never what is accepted.
 */

export interface Principle {
  id: string;
  name: string;
  /** Plain-language cue for what this one is about, so the label is enough. */
  about: string;
}

export interface PrincipleGroup {
  pillar: string;
  name: string;
  principles: Principle[];
}

export const PRINCIPLE_GROUPS: PrincipleGroup[] = [
  {
    pillar: "plan-with-purpose",
    name: "Plan with Purpose",
    principles: [
      {
        id: "turns-vision-into-action",
        name: "Turns Vision Into Action",
        about: "Setting a direction and getting people moving behind it",
      },
      {
        id: "makes-smart-decisions",
        name: "Makes Smart Decisions",
        about: "Deciding well without all the facts, and at pace",
      },
      {
        id: "energizes-the-team",
        name: "Energizes the Team",
        about: "Bringing people with you when the work is hard",
      },
    ],
  },
  {
    pillar: "pursue-excellence",
    name: "Pursue Excellence",
    principles: [
      {
        id: "raise-the-bar",
        name: "Raise the Bar",
        about: "Holding a standard higher than the one you inherited",
      },
      {
        id: "act-with-courage",
        name: "Act with Courage",
        about: "The unpopular call, the hard message, the thing you stopped",
      },
      {
        id: "build-resilience",
        name: "Build Resilience",
        about: "Setbacks, recoveries, and what you did after one",
      },
    ],
  },
  {
    pillar: "prioritize-people",
    name: "Prioritize People",
    principles: [
      { id: "be-real", name: "Be Real", about: "Candour, trust, and owning your own part" },
      {
        id: "lead-across",
        name: "Lead Across",
        about: "Influence without authority, and peers who did not report to you",
      },
      {
        id: "grow-groundbreakers",
        name: "Grow Groundbreakers",
        about: "Developing people past where you found them",
      },
    ],
  },
];

/** Flattened, for lookups. */
export const PRINCIPLES: Principle[] = PRINCIPLE_GROUPS.flatMap((g) => g.principles);

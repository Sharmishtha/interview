import type { DimensionId } from "../types.js";

export type Tier = "weak" | "mixed" | "strong";

export interface EvalCase {
  id: string;
  questionId: string;
  tier: Tier;
  answer: string;
  /** What this case is here to prove. */
  note: string;
  expect?: {
    compositeMin?: number;
    compositeMax?: number;
    dimensions?: Partial<Record<DimensionId, { min?: number; max?: number }>>;
  };
  /**
   * Set when the heuristic evaluator is known to score this case wrongly. These
   * are reported but do not fail the suite - they are the standing argument for
   * the LLM evaluator in phase 4.
   */
  knownLimitation?: string;
}

/** Expected composite range for each tier, used for aggregate separation checks. */
export const tierBounds: Record<Tier, { min: number; max: number }> = {
  weak: { min: 0, max: 4.5 },
  mixed: { min: 3.5, max: 7.5 },
  strong: { min: 6.5, max: 10 },
};

export const evalCases: EvalCase[] = [
  // -------------------------------------------------------------------------
  // Weak
  // -------------------------------------------------------------------------
  {
    id: "platitude-delivery",
    questionId: "predictability-system",
    tier: "weak",
    note: "Pure leadership philosophy with no situation, no numbers, no arc. The floor case.",
    expect: {
      compositeMax: 4,
      dimensions: { specificity: { max: 2 }, "quantified-outcomes": { max: 2 } },
    },
    answer: `
I always believe in setting realistic expectations with the business. My philosophy
is that you communicate early and often, and that if you trust your teams they will
tell you when something is slipping. We plan carefully every quarter and at the end
of the day the team delivered what mattered most to the company.
`,
  },
  {
    id: "too-short",
    questionId: "missed-date",
    tier: "weak",
    note: "Technically responsive but far too thin to be an executive answer.",
    expect: { compositeMax: 4, dimensions: { structure: { max: 4 } } },
    answer: `We missed the date because QA took longer than expected. We fixed it in the next sprint.`,
  },
  {
    id: "deflecting",
    questionId: "missed-date",
    tier: "weak",
    note: "Every failure belongs to another function. Should score near the floor on reflection.",
    expect: { compositeMax: 4.5, dimensions: { reflection: { max: 3 } } },
    answer: `
Honestly that one was not really an engineering problem. Product kept changing the
requirements on us and sales had already promised the customer a date nobody in
engineering had agreed to. We were doing our best with what we were given, and once
the requirements finally settled down we shipped it.
`,
  },
  {
    id: "all-we",
    questionId: "org-design",
    tier: "weak",
    note: "Hides entirely behind the team; the candidate's own contribution is invisible.",
    expect: { dimensions: { ownership: { max: 3.5 } } },
    answer: `
We restructured the organisation into platform and product groups. We agreed the
team boundaries together and we rolled it out over a quarter. We saw attrition come
down afterwards and we were pleased with how the teams settled.
`,
  },

  // -------------------------------------------------------------------------
  // Mixed
  // -------------------------------------------------------------------------
  {
    id: "specific-no-numbers",
    questionId: "incident",
    tier: "mixed",
    note: "A real, concrete story with a clear personal role, but nothing is measured.",
    expect: { dimensions: { "quantified-outcomes": { max: 3 }, specificity: { min: 4 } } },
    answer: `
When I joined Latchford the payments service went down during a Black Friday peak.
I personally took incident command because our on-call lead was new and visibly
struggling. I decided to fail over to the read replica before we had finished
diagnosing, which was a judgement call. As a result we got orders flowing again
well before the postmortem told us what had actually broken, which was a connection
pool exhaustion in the checkout path.
`,
  },
  {
    id: "numbers-no-reflection",
    questionId: "rd-budget",
    tier: "mixed",
    note: "Strong command of the numbers, but no hindsight and nothing they would change.",
    expect: {
      dimensions: { reflection: { max: 3 }, "quantified-outcomes": { min: 6 } },
    },
    answer: `
I owned a $46 million R&D budget across 210 engineers, which ran at about 22% of
revenue. Cloud was $9 million of that and had been growing 30% year over year while
revenue grew 14%. I moved us onto committed-use pricing and killed two redundant
observability vendors, which took $3 million out within 2 quarters and brought R&D
to roughly 19% of revenue.
`,
  },
  {
    id: "rambling",
    questionId: "scaling",
    tier: "mixed",
    note: "Real substance buried in an unfocused narrative. Structure should be penalised.",
    expect: { compositeMax: 7.5 },
    answer: `
So there is a lot to say here. We grew a lot, I think we went from something like 60
engineers to maybe 190 over about two years, though the exact numbers moved around
depending on contractors. There were a lot of things happening at once. Hiring was
hard, the market was competitive, we tried a few agencies. The architecture was also
a problem, though that was somewhat separate. People talk about Conway's law and I
think there is something to that. We reorganised twice, the second one worked better
than the first, mostly because we had learned from the first one, although some
people would say the first one was necessary to get to the second. Onboarding was
another area. We wrote a lot of documentation. Overall it went reasonably well and
the teams are in a better place now than when we started, which I think is the main
thing.
`,
  },
  {
    id: "no-team-credit",
    questionId: "architecture-bet",
    tier: "mixed",
    note: "Fully evidenced but takes every ounce of credit, which reads badly at VP level.",
    expect: { dimensions: { ownership: { max: 7 } } },
    answer: `
I decided to move us off the monolith in 2022. I designed the service boundaries, I
wrote the migration plan, and I personally rebuilt the identity service over 4
months. I cut deploy times from 70 minutes to 9 minutes and I brought Sev1 incidents
down from 12 a quarter to 2. I should have started sooner, that is on me.
`,
  },

  // -------------------------------------------------------------------------
  // Strong
  // -------------------------------------------------------------------------
  {
    id: "architecture-evidenced",
    questionId: "architecture-bet",
    tier: "strong",
    note: "The reference strong answer: named situation, scale, rejected alternative, numbers, hindsight.",
    expect: { compositeMin: 7.5 },
    answer: `
When I took over the platform group in 2021 we were running a single Rails monolith
serving 40 million monthly actives with an org of 180 engineers, and deploys had
grown to 90 minutes. I decided to extract the billing and identity domains rather
than attempt a full rewrite, because those two carried 70% of our incident load. The
strongest case against it came from Priya, who argued a clean rewrite would cost
less over 3 years, and she was not obviously wrong. As a result we went from 90
minutes to 11 minutes within 8 months and Sev1 incidents fell from 14 a quarter to
3. In hindsight I should have sequenced identity first - I underestimated how much
the billing extraction would couple to our SOX change controls, and what I learned
is that compliance surface belongs in the sequencing decision, not the rollout plan.
`,
  },
  {
    id: "missed-date-owned",
    questionId: "missed-date",
    tier: "strong",
    note: "Owns a public-company miss with escalation timing and the systemic fix.",
    expect: { compositeMin: 7 },
    answer: `
We committed to shipping the billing migration by the end of Q3 in 2023, and it was
in the guidance the CEO gave the street. When I took over the tracking I saw in week
4 that our integration test suite was failing 30% of runs, which meant we had no
real signal. I escalated to Claire 6 weeks before the date rather than at the date,
and I recommended we cut the reporting module instead of slipping the whole release.
As a result we shipped the core migration on time and the cut scope landed 7 weeks
later. In hindsight I should have raised it in week 2 - I underestimated how long
the flakiness had been masking real failures, and we now gate every commitment on a
green suite before it goes into a quarterly plan.
`,
  },
  {
    id: "org-design-evidenced",
    questionId: "org-design",
    tier: "strong",
    note: "Structure with a rationale, real numbers on span and attrition, an owned bad hire.",
    expect: { compositeMin: 7 },
    answer: `
When I arrived in 2020 we had 140 engineers in 6 teams with managers carrying 23
reports each, and regretted attrition was running at 19%. I restructured into 14
teams of 8 to 10 with a platform group underneath them, deliberately mapping team
boundaries to the service boundaries so we stopped needing 4 teams in a room to ship
anything. I hired 5 managers against a defined bar and I promoted 3 from inside. As
a result attrition came down to 8% within 18 months and our change failure rate
halved. One of those manager hires was a mistake - I over-weighted their scale
experience and under-weighted whether they could operate without a support structure,
and looking back I should have moved 4 months sooner than I did.
`,
  },
  {
    id: "board-case",
    questionId: "board-technical",
    tier: "strong",
    note: "Translates a technical investment into business language with a number attached.",
    expect: { compositeMin: 6.5 },
    answer: `
I would not lead with the architecture. When I made this case at Halden in 2022 I
opened with the fact that we were spending 34% of engineering capacity on work that
produced nothing a customer could see, and that the number had risen from 19% over 2
years. I framed the platform investment as buying back roughly 60 engineers worth of
capacity by 2024 without hiring them. I decided to bring 3 scenarios rather than one
ask, and our chair pushed hard on the middle one. In hindsight I should have brought
the do-nothing cost curve to the first meeting rather than the second - I
underestimated how much the board needed to see the downside quantified.
`,
  },

  // -------------------------------------------------------------------------
  // Known limitations of the heuristic evaluator
  // -------------------------------------------------------------------------
  {
    id: "keyword-stuffed",
    questionId: "architecture-bet",
    tier: "weak",
    note: "Semantically empty but hits every surface pattern the heuristic looks for.",
    knownLimitation:
      "The heuristic scores surface features, so a fluent answer with no substance grades high. Only a semantic evaluator can catch this.",
    answer: `
When I took over in 2021 we were at 40 million users with a team of 180 engineers. I
decided to restructure. As a result we went from 20% to 80% within 12 months and cut
deploys from 90 minutes to 5 minutes across $12 million of spend. In hindsight I
should have done it differently, and what I learned is that I underestimated it.
`,
  },
  {
    id: "fake-humility",
    questionId: "expensive-mistake",
    tier: "weak",
    note: "A humblebrag disguised as a failure. Reflection language is present but hollow.",
    knownLimitation:
      "Reflection is detected lexically, so a non-failure dressed in hindsight language scores as genuine self-awareness.",
    answer: `
My biggest mistake was caring too much about quality. In hindsight I should have let
some things ship less polished. I underestimated how much the team wanted to move
faster, and what I learned is that my own high standards were holding us back. We
still hit 99.99% availability that year across 30 million users.
`,
  },
];

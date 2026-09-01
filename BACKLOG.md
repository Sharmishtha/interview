# Backlog

Ordered by return on effort. Effort is calendar days for one person; impact is
argued rather than scored, because a number invented for a feature nobody has
shipped is false precision.

**Product boundary: this is a practice tool.** The person being interviewed is the
person using it. It rehearses *you*; it does not assess a third-party candidate.
That boundary is what keeps this out of automated-hiring regulation — see
[Positioning](#positioning-practice-not-assessment) before accepting any feature
that crosses it.

---

## Shipped

| Feature | Notes |
| --- | --- |
| Behaviourally-anchored rubric | 9 Executive Leadership Principles, signals verbatim from the guide |
| Voice questions and answers | ElevenLabs TTS out, Scribe v2 in; confirmed against the live API |
| Priced coaching to 8+ | Each lift costed in composite points, because the composite is a weighted sum |
| Evaluation set | 14 labelled cases; the suite fails if tier separation degrades |
| Pressure questions | A harder failure-owning variant per principle |
| Password gate | Basic Auth at the edge, covering the page and the API |
| **Answer playback** | Hear your own recording back beside the transcript |

---

## Next

### 1. Persist sessions and show progress — 2–3 days

The core loop is *rehearse → score → improve*, and the third step does not exist:
a refresh erases everything. This is the single largest gap between what the app
does and what it is for.

- **Build:** Cloudflare D1 (SQL, queryable for trends) or KV (simpler, but awkward
  for "show me my last ten scores"). D1 is the right call.
- **Payoff:** per-competency trend lines, "your Learning score has moved 2.5 → 6.1
  over four sessions", and re-scoring old transcripts when the rubric changes —
  which the decoupled architecture already allows but nothing currently uses.
- **Trade-off:** storing transcripts makes retention a real question. Needs a
  stated policy and a delete control before any customer touches it.

### 2. Mobile support — 1 day

Practising for fifteen minutes on a phone is the most natural use of this, and it
has **never been tested on a real device**. iOS Safari records `audio/mp4` rather
than `audio/webm`; the code handles that but the path is unproven.

- **Trade-off:** may surface real Safari bugs. Cheap to find out, expensive to
  discover from a customer.

### 3. Delivery metrics — 1 day

Pace (words per minute), filler words, and long pauses. The transcript and the
recording duration are both already in hand, so this is arithmetic.

- **Payoff:** an entire axis the rubric ignores. You can be strong on substance and
  still land badly by speaking at 200 wpm.
- **Trade-off:** delivery is easier to measure than substance, so it will attract
  more attention than it deserves. Keep it as a side panel, never in the composite.

### 4. LLM evaluator — 3–4 days

Closes the two documented holes: `keyword-stuffed` scores **8.36** today and
`fake-humility` **6.29**. Neither is fixable with pattern matching, because both
are fluent — the problem is that they mean nothing.

- **Build:** implement the existing `Evaluator` interface, so it drops in behind
  the heuristic with no other changes. Must cite spans; a test already asserts
  every span appears verbatim in the answer, which is what stops invented evidence.
- **Payoff:** judges whether the strategy described was actually sound — something
  no regex reaches.
- **Trade-off:** per-scoring cost, non-deterministic scores, and it must be proven
  against the eval corpus before replacing the heuristic. Keep the heuristic as the
  offline fallback.

### 5. Onboarding and empty states — 1–2 days

A first-time visitor is told "Executive Leadership Principles" and nothing about
what that is, what the nine principles are, or what a good answer looks like.

- **Payoff:** the difference between a tool you get and one you bounce off.
- **Trade-off:** none of substance; it is the cheapest thing on this list that a
  customer would notice.

### 6. Adaptive probing — 1–2 weeks

The largest realism gap. The panel asks one stored follow-up regardless of what
you said; a real interviewer reacts. This matters more than any visual change.

- **Build:** ElevenLabs Agents Platform for real-time turn-taking, with the agent
  prompt generated from the question bank, or an LLM turn between recordings.
- **Trade-off:** hardest item here. Real-time voice is fiddly, and an agent
  improvising loses the guide's exact probe wording, which is currently a
  deliberate feature — the probes are what the real interviewers ask.

### 7. Export and share a scorecard — 1 day

PDF or a read-only link.

- **Trade-off:** a shareable scorecard is one step from a scorecard about someone
  else. See the boundary below.

---

## If this goes to public customers

Practice-only, still. These are prerequisites, not enhancements.

| | Item | Effort | Why it blocks launch |
| --- | --- | --- | --- |
| **P0** | Accounts and data isolation | 1–2 wk | One person's transcripts must be unreachable by another. Blocks everything else. |
| **P0** | Retention policy and delete control | 2–3 d | You would be holding recordings of people rehearsing their career failures. They need to be able to erase that. |
| **P0** | Per-user rate limiting | 2–3 d | One shared password cannot meter anything. Every question is a paid synthesis call; a single abusive user drains the quota for everyone. |
| **P1** | Usage metering / billing | 1–2 wk | Voice cost scales linearly with use. Free-for-all does not survive contact with real traffic. |
| **P1** | Privacy notice | 1 d | Say plainly what is recorded, what is sent to ElevenLabs, and what is kept. |
| **P2** | Rubric customisation | 1 wk | The nine principles are one company's framework. Other users will want their own. |

### Positioning: practice, not assessment

Keep the product aimed at the person answering. The moment it scores *a candidate
on behalf of an employer*, it becomes an automated employment decision tool and
picks up NYC Local Law 144 bias audits, the EU AI Act's high-risk obligations, and
Illinois' AI Video Interview Act — plus a duty to show the scoring is not
discriminatory, which the heuristic evaluator could not survive.

Concretely, that means:

- **No candidate-facing mode** where a third party sets the questions and reads the
  results.
- **The scorecard belongs to the person who answered.** Sharing is their choice,
  never a default or an employer feature.
- **Say what it is.** "Rehearsal and coaching" in the copy, not "assessment" or
  "screening".
- Revisit this with counsel before any feature that reports on someone else.

---

## Not planned

**Video avatars.** They cost per minute, add seconds of latency before every
question, and contribute nothing to the scorecard, which is the actual product. The
realism bottleneck is that the panel does not react to what you said (item 6), not
that it has no face. A still portrait with a speaking animation buys most of the
felt presence for half a day and no running cost.

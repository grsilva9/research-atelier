# Design principles

This document explains why Atelier is shaped the way it is. It's meant for two audiences: future-you, when you wonder why a feature works a certain way; and anyone else reading the repo who wants to understand the design rather than just the code.

---

## 1. The core insight: idea ≠ text

Research writing fails most often not because the writer lacks skill but because they confuse two separate states:

- **Understanding what you want to say.**
- **Having written what you want to say down.**

These states are independent. You can have one without the other. Weeks of a researcher's time are lost because they sit down to "work on the methods section" when the real problem is that the method isn't clear in their head yet — so they end up either polishing text on top of foggy thinking (which produces worse work) or staring at the screen, unable to start (which produces no work at all).

Atelier's central design choice is to force these two states into separate, explicit surfaces. The Ideation sub-stages on each paper carry a 0–4 *maturity* score for the idea itself ("how well-formed is the hypothesis in my head?"). The task layer carries everything that is actual production work — drafting, code, experiments, figures. The two never mix into one progress bar. The UI refuses to let you.

The consequence: before writing, you declare what state the idea is in. This tiny act of classification is more valuable than it sounds. It's the difference between "I should work on methods today" (vague, aversive) and "the method is a 3/4 in my head but nothing is written — the right task is a Drafting task for that section" (concrete, achievable).

---

## 2. Why deterministic suggestions

Task suggestions come from a hand-written rules engine, not an LLM. This is a deliberate choice and worth defending because LLM-generated suggestions would be the obvious and fashionable thing to build.

**Legibility.** Every suggestion carries a short rationale derived mechanically from state. You can read the rule that produced it. You can disagree with the rule. If the rule is wrong, you can change it by editing a small, pure-function file.

**Predictability.** Same state in, same suggestions out. The tool doesn't surprise you on Tuesday with advice it didn't give on Monday. Stability is a feature for a tool you rely on daily.

**No pretense of understanding.** An LLM can produce plausible-sounding research advice that is actually generic or wrong. The rules engine makes no claim to understand your paper — it only applies mechanical rules to the numbers you provided. This honesty matters when you're stressed and looking for authoritative guidance. The tool will not give it to you. You make the real decisions.

**Fast and free.** No API calls, no latency, no cost, no privacy concerns about shipping your research plans to a third party.

If at some point an LLM layer would genuinely help — for example, generating richer rationale text for a suggestion — it can be added on top of the rules engine, not in place of it. The rules remain the substrate.

---

## 3. Why a WIP limit matters more than it seems

The single most consistent predictor of flow in knowledge work is limiting the number of things actively in progress. This comes from the Kanban tradition, originally from Toyota's manufacturing lines, and it transfers cleanly to research:

- Context switching is expensive. Each active paper carries a mental model. Loading that model has a fixed cost. The more papers you juggle, the more of your day is swap overhead.
- Partially-done work doesn't compound. Half a methods section is worth zero until it's finished. Shipping one paper matters more than making marginal progress on five.
- Solo workers have no external forcing function. In a team, pull requests, standups, and dependencies create natural pressure to close out in-flight work. Solo researchers have none of this. Nothing stops you from adding a fifth, sixth, seventh paper to your list except a number you set yourself.

Atelier sets a default WIP limit of 3 for the "Drafting" and "Revising" stages combined. You can change it in Settings. When the number in the sidebar turns red, it's not a warning about productivity; it's a warning that you've lost the ability to choose what to finish next.

The limit does not apply to Ideation (you can have many papers in the gestation phase) or to Paused, Submitted, Published (these don't consume active attention). This is intentional. The limit protects *active* work.

---

## 4. One thing today

The Focus view shows a single task. Not three, not "your top five." One.

This is the single most-requested design decision for knowledge-work tools, and also the most-resisted, because a list of ten feels more thorough. It isn't — it's exactly the overwhelm pattern we're trying to break. Research on choice architecture is clear here: the probability of starting a task goes *down* as the number of available tasks goes *up*, above a very small threshold.

The rules engine still ranks and shows secondary suggestions below the focus. You can always scroll. But the *visual weight* of the page goes to one task, with one rationale. That's the thing you're going to do next.

---

## 5. Concrete next actions

Compare:

- "Work on the hypothesis section" ← aversive, vague, no entry point
- "Draft a one-sentence hypothesis for ContraShift" ← you could start in the next five seconds

The rules engine only generates tasks of the second kind. Every suggestion template starts with a verb and names a concrete output. This is borrowed from Getting Things Done, where the "next physical action" is the unit of planning. The brain resists vague tasks because it can't simulate the first motion; it accepts concrete tasks because it can.

When you add manual tasks, the UI's placeholder text prompts you to phrase them this way. It doesn't enforce it, but the nudge is there.

---

## 6. Stale detection without nagging

Papers that haven't been touched in 14 days get a small warning indicator on their card. That's it. No red banner, no email, no nag. The point is not to shame you into working — the point is to surface stalling so you can consciously decide what to do with the paper.

For each stale paper, there are exactly three healthy responses:

1. **Resume.** Pick it up this week. The warning goes away as soon as you touch it.
2. **Reshape.** The paper stalled because something is wrong with its framing, methods, or scope. Open it, note the problem in the blockers field, and plan one concrete step to unblock.
3. **Pause.** The paper isn't the right thing to work on right now. Move it to the Paused stage. This is honorable, not a failure. It also removes it from the WIP count, freeing attention for work you will actually do.

The worst response is the default one — leave it stale, don't look at it, feel a low-grade guilt every time you see it. That's the state Atelier is trying to end.

---

## 7. The log: writing for future you

The log serves a specific purpose that is not "writing a journal." It's writing short notes that your future self will read when they need context.

Two moments when the log pays off:

- **Coming back to a paper after two weeks away.** The first question is always "wait, what was I doing here?" The last three log entries usually answer it in thirty seconds. Without a log, it takes thirty minutes.
- **Writing the weekly review.** Scrolling through a week of log entries is the fastest way to remember what actually happened. Memory of work is surprisingly bad; recency bias dominates.

The friction to write a log entry is deliberately low — it's a text box at the bottom of the paper detail view, and nothing is required. Two sentences is fine. One sentence is fine. Empty days are fine. The tool doesn't count streaks and doesn't punish absence, because guilt-driven logging produces bad entries.

---

## 8. The weekly review

Of all the practices that correlate with sustained knowledge-work output over years, the weekly review is the most consistently recommended across methodologies — GTD, agile, lean, academic writing advice, even the psychological literature on deliberate practice converge on it.

Atelier's weekly review is minimal: a template with four prompts.

- **What moved?** Forces you to recognize progress. The app prefills a numeric summary (papers touched, tasks completed) so you don't under-count.
- **What's stuck?** Forces you to name the stall. Just naming it is usually enough to unblock it.
- **What am I avoiding?** The most important question. There is almost always a task you have deliberately not looked at because it's unpleasant or ambiguous. Naming it breaks the spell.
- **Next week's one focus.** Sets the theme. Not a list of goals; the single priority that should survive the week's chaos.

The review is stored as a diary entry so you can re-read past ones. Patterns emerge. The paper you're avoiding in week 3 is still the paper you're avoiding in week 7. That recognition is itself useful data.

---

## 9. Aesthetic choices

A tool you open every day should feel calm. The design aims for:

- **Warm off-white background**, not stark white. Reduces glare, feels less like a spreadsheet.
- **One accent color**, applied sparingly. Burnt orange reads as focused rather than alarming.
- **Serif for paper titles and headings**, sans-serif for UI chrome. This mirrors the typographic hierarchy of actual academic papers and subtly reinforces that the thing being tracked is writing, not tickets.
- **Generous spacing and no dense tables.** Information density is the enemy of sustained use.
- **No celebratory UI.** No confetti, no streak counters, no gamification. These reward the *wrong* thing. The reward for good research is the paper, not the app.

The aesthetic is minimal but not cold. That's the target.

---

## 10. What was deliberately left out

A negative design document is often as useful as a positive one.

- **Gantt charts.** Look impressive; rot within a week. The maintenance cost exceeds the informational value for solo work. A board with stages and a per-paper activity timeline communicates the same thing more honestly.
- **Time tracking.** Useful for contractors, actively harmful for researchers. Tracking time invites optimizing it, which invites proxy measures (hours logged), which invites the wrong work (sitting at the desk regardless of whether anything is happening). Output is the metric, and the board already shows output.
- **Multi-user features.** This is a personal tool. Shared state would require a backend, which would kill the local-first philosophy, and would turn every design decision into a negotiation.
- **Cloud sync.** The file-based model is the feature, not a limitation. You own the data, you know where it is, you can back it up with `cp`, you can diff it with `git`, and it will still work in ten years when your cloud provider has been acquired three times.
- **Mobile app.** You don't write papers on your phone. You write them on a laptop. Optimizing for mobile would force compromises on the primary surface.
- **Notifications.** The tool should not interrupt you. You open it deliberately; it does not demand attention.

---

## 11. Failure modes this tool is designed to resist

Every productivity tool eventually gets abandoned. The question is why. A few common failure modes, and how Atelier is built against them:

- **Maintenance burden exceeds value.** Tools that need to be constantly tended become work themselves. Atelier is designed so that a minimum-viable use (just update section levels occasionally) is genuinely useful, and every further feature is optional.
- **The tool becomes theater.** You update the board instead of doing the work. Guarded against by: no reward signals for updating, no public sharing features, WIP limits that bite rather than celebrate.
- **Loss of trust in the data.** If the tool ever loses state, you abandon it. Guarded against by: explicit export, readable JSON, auto-save to localStorage, no silent schema migrations without a version bump.
- **Fashion obsolescence.** The tool looks dated in two years and you replace it. Guarded against, partially, by: classical typographic choices, restrained color palette, and the fact that you can fork the repo and restyle it yourself.

---

## 12. For the future maintainer

If you extend Atelier, the invariants worth preserving are:

1. The idea/production separation is the core. Ideation maturity and task status must stay in separate surfaces — don't collapse them into one progress bar.
2. Suggestions must remain deterministic and carry their rationale.
3. State must stay in a single serializable JSON file. No databases, no indexedDB layer, no "just this one exception."
4. Don't add rewards. No streaks, no badges, no celebratory animations.
5. Don't add notifications. The user opens the tool on their own schedule.

Everything else is negotiable.

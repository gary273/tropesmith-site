# Trend Radar — FAQ (TS-0966 phase 3b)

The public FAQ (identical copy) is embedded on `/trend-radar/` as both visible `.faq-item`
markup and an `FAQPage` JSON-LD block, grouped by author tier. Reproduced here for the doc set,
plus internal-only answers below the line.

## New authors

**What is the Trend Radar, in plain terms?**
A weekly-refreshed list of tropes whose reader search interest is rising right now, or measured
to rise within the next few weeks, ranked by how strong and how reliable each signal has been
historically. It answers one question: what will readers be searching for by the time this book
is ready?

**I've never written a data-driven book before — do I need to understand the math?**
No. Every forecast reduces to one line you can act on: a trope name, whether it's rising now or
rising in N weeks, and a confidence word (low, medium or high). The free board shows exactly
that, nothing else, for the top 10 tropes each week.

**I'm just starting out — should I write straight off the radar?**
Use it to shortlist, not to decide alone. A rising trope with high confidence is a reasonable
tiebreaker between two ideas you're already excited about; it is not a substitute for writing a
book you can finish and defend. Pair it with a Tropesmith Map for the full demand-vs-supply read
on the exact lane you're considering.

## Mid-career authors

**How far ahead can it actually see?**
Measured, not promised: search interest leads reader demand by a median of 8 to 14 weeks across
the tropes we've tested. Some signals resolve in a week or two; the radar states the specific
lead time per forecast, it never gives one number for everything.

**I'm juggling a few series — what's the read for me?**
Watch your own lanes specifically. If a trope you already write is showing "rising now" or a
short lead time, that's a signal to bring forward a book you were planning anyway, or to lean
into that trope in your next release's marketing, rather than chase an unrelated lane cold.

**How is this different from the Trope Pulse or a Tropesmith Map?**
The Trope Pulse reports what's already moving this week. A Map reads today's demand-vs-supply
for a lane you specify. The Trend Radar is the leading-indicator layer underneath both: it
exists to catch a rise before it shows up in either of those.

## Big pen-name builders

**I write under an established pen name on a release schedule — how do I use this?**
Treat the radar as a scheduling input, not a pivot command. With a typical 8-14 week runway from
spike to rise, check it when choosing which of your next contracted books to write first, or
which trope to lean into for a launch dated a couple of months out.

**What does "+44pp lift" mean, exactly?**
Percentage points, not percent. When a search-interest spike fires for a trope, that trope goes
on to actually rise in reader demand about 44 percentage points more often than the base rate
for tropes with no spike — the event-by-event read of whether the signal means anything.

**Why is the walk-forward number (+12pp) lower than the event-test number (+44pp)?**
The event test looks at one spike and one trope in isolation. The walk-forward test replays a
full year of forecasts in order, no hindsight, and checks precision against the same-period base
rate — a stricter, harder-won number (58% vs. 45% base, 607 forecasts), and the one we'd trust
to size a real decision.

**What do I get free versus as a member?**
Free: the top 10 active forecasts, refreshed continuously — trope, rise label, lead time and
confidence, no signup required. Members (any active Live Board subscription, or a Map credit
balance) get the full active radar, the measured lift for every forecast, the evidence line
behind it, and the current backtest headline.

---

## Internal-only

**Why does `lane_display` never show anything today?** Every active forecast measured
2026-09-10 has `lane=''` (empty). `trend_signals.lane` isn't being populated by the collectors
yet — a real gap in the forecast pipeline, not a display bug. The page and API both render
`null`/omit rather than fabricate a lane.

**Why doesn't `tmdb_attribution` ever flip true right now?** Only 3/231 TMDB rows match the
registry (3a finding), and none of those 3 have propagated into an *active* forecast's signals
array as of this run. The flag is coded and will start firing the moment a TMDB-sourced signal
clears into `trend_forecasts.signals`.

**Why is the member gate `checkEntitlement()` and not a `pulse_monthly` check?** Grepped the
whole `tropesmith-api` repo — `pulse_monthly` appears nowhere in any deployed function. The WO's
own instruction is to reuse the existing gate, never invent one; `checkEntitlement()` (Live
Board active sub OR credit balance ≥1) is what `format-match`/`format-unlock` already use, so
that's what `trend-radar` reuses, unchanged.

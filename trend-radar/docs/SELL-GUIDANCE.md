# Trend Radar — SELL GUIDANCE (TS-0966 phase 3b)

**End price: Gary's alone.** This doc gives the pitch per tier, the objections, what it must
never claim, and the cost floor — no price is proposed here (PRICING SPLIT, Gary 08-30).

## Who buys it, per tier

**Beginner author (no backlist, deciding what to write next).** Buys the free tier first — the
top-10 board is the hook. Converts to membership when they hit the wall of "which of these
should I actually trust" and want the evidence line + confidence band behind a specific call,
usually paired with their first Tropesmith Map.

**Mid-career author (a few live series, writes on a cadence).** The most natural buyer. Already
has lanes they write in; the radar's value to them is narrow and personal — "is one of MY tropes
about to move" — not the general top-10. Pitch: check it when picking which of your next few
books to write first, or which trope to lean into for a launch dated a couple of months out.

**Big pen-name builder (runs writing like a small studio, plans releases quarters ahead).** Buys
for scheduling leverage, not discovery — they already know their lanes. Pitch: an 8-14 week
runway is exactly the lead time a contracted release calendar can act on; treat it as a
scheduling input, never a pivot command mid-contract.

## The pitch per tier

- **Beginner:** "See what readers will be searching for before they do — free, no signup, top
  10 refreshed continuously."
- **Mid-career:** "Know when YOUR lane is about to move, with the actual evidence — not a
  vibe, a measured lead time and a confidence band."
- **Big pen name:** "An 8-14 week early-warning system for your release calendar, backed by a
  walk-forward backtest across a year of forecasts, not a one-off correlation."

## Objections, answered honestly

- **"Is this just Google Trends with extra steps?"** Partly, by design — Google Trends search
  interest is the ONLY signal that has cleared a backtest so far. What the radar adds: the lag
  (how many weeks ahead, measured per trope), the strength gate (spikes below a threshold are
  excluded, not shown), and the confidence band. That's the paid-for synthesis, not the raw
  Trends number itself.
- **"44pp lift sounds too good."** It's an event-test number (does a spike predict a rise, at
  all) — the harder, whole-year walk-forward number is +12pp precision over base, and that's the
  one the page leads with as "the one we'd trust to size a real decision." Never quote the
  event-test number alone without the walk-forward number beside it.
- **"Why should I trust a forecast on my specific trope?"** You shouldn't blindly — the
  confidence band exists exactly for this. Low-confidence forecasts still ship (honesty over
  hiding weak signal) but are labeled as such; the pitch is "size your trust to the label,"
  never "every forecast is equally solid."
- **"News/adaptation buzz should count for more."** Not yet — GDELT and TMDB signals are
  evidence-only until they clear their own backtest (GDELT's 24-month history backfill didn't
  land yet, per-IP throttling; TMDB's registry match rate is 3/231 measured). Selling copy must
  not imply news/adaptation evidence carries the same weight as the search-interest lift.

## What it must NOT claim

- Never "predicts" without stating the lift number and the confidence caveat in the same
  breath.
- Never implies GDELT or TMDB evidence lines carry a measured lift — only Google Trends does,
  today.
- Never claims a lane-level read — `lane_display` is null on every forecast measured
  2026-09-10; don't sell a capability that isn't populated yet.
- Never a guarantee of "will sell" — the radar forecasts search interest leading reader demand,
  not sales.

## Cost floor (reported, not priced)

- **Infra:** six `ts0964-*` systemd timers, longest measured run 103s (`forecast.py`), running
  on the existing box — no dedicated compute, effectively $0 marginal.
  - Haiku calls for TMDB title/author mapping: ~$0.05/day per the WO's own floor note (rapidfuzz
    does the matching in-process; Haiku is only used where the WO already budgeted it).
  - Total estimated infra + LLM floor: **under $3.50/month**, run continuously, regardless of
    subscriber count.
- **Per-subscriber marginal cost:** effectively **$0** — `v_trend_radar` is one shared read,
  cached 60 seconds server-side in `labs-api`; a member request costs one extra `app_authors` /
  `app_subscriptions` / `app_credit_ledger` lookup (`checkEntitlement()`, already paid for by
  every other gated labs-api action).
- **No new infrastructure was added** to ship this — same edge function, same Postgres project,
  same timer fleet.

## GARY: packaging + end price decision needed

Options (cost floor above applies to every option — near-zero marginal, so the decision is
purely positioning):

**(a) Member-gated inside Live Board $7/mo or Trope Pulse $9/mo, as-is.** Zero new billing work
— `checkEntitlement()` already grants access to any Live Board subscriber or credit holder. Risk:
the radar rides for free inside an existing price with no separate signal of its value.

**(b) Its own add-on.** New Stripe price, new `app_products` row, new webhook wiring, new
entitlement branch in `checkEntitlement()` (currently binary pro/not-pro — would need a
third product-specific check). More engineering, clearer standalone value signal.

**(c) Bundle — sell it as the headline feature of the NEXT membership tier up**, using it to
justify a price point Live Board/Pulse don't currently have. No new engineering beyond (a);
positioning-only decision.

Cost floor is near-zero under every option — the decision is packaging and price, not
feasibility.

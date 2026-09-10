# Trend Radar — PRODUCT PAGE brief (TS-0966 phase 3b)

Internal brief backing the public `/trend-radar/` page copy. No price is stated here or on the
public page — end price is Gary's (PRICING SPLIT, 08-30).

## What it does

Forecasts which tropes reader search interest is about to move on, ahead of that demand showing
up anywhere else in the Tropesmith corpus. Free tier: top-10 active forecasts, refreshed
continuously, trope + rise label + lead time + confidence, no signup. Member tier: the full
active radar, the measured lift per forecast, the evidence line behind it (signal type, date,
strength), TMDB-adaptation attribution when present, and the current whole-year backtest
headline.

## How it works

1. Daily collectors write `trend_signals` from Google Trends (search interest), GDELT (news
   volume/shocks) and TMDB (screen-adaptation calendar).
2. `trend_lag_library` measures, per trope and signal source, whether that signal type actually
   leads that trope's reader-demand rise, and by how many weeks — cross-correlation over
   historical weeks, not assumed.
3. A minimum-strength gate excludes noise-level spikes before a forecast is ever written.
4. `trend_forecasts` carries a status (active/weak), a plain-English label ("rising now" /
   "rises in ~N weeks"), a lift (hit rate over base rate) and a confidence band.
5. A rolling 52-week walk-forward backtest re-measures precision/recall against a same-period
   base rate — the honesty check that catches an event-test number flattering itself.
6. `labs-api` reads the resulting view, resolves trope/lane ids to real display names, and
   splits the response by membership tier.

## Base cost (reported, no price proposed)

Under $3.50/month total (six existing systemd timers on the existing box + ~$0.05/day of Haiku
calls for TMDB title/author matching), effectively $0 marginal per additional subscriber — see
SELL-GUIDANCE.md for the full breakdown. No new infrastructure was stood up to ship this.

## Competitor comparison

**Data source note (per WO step 1's Ahrefs-spend rule):** the estate's Ahrefs plan is on a RED
runway today (`ahrefs-runway-guard.service`, checked 2026-09-10: 325,318/400,000 units used,
projected to exceed the 400,000 cap before the 2026-09-19 reset) — so this comparison reuses the
**cached Ahrefs competitor pull from IN-1138 (pulled 2026-08-29, 12 days old)** rather than
spending fresh units, and says so here plainly. Traffic/keyword figures are Ahrefs-measured
organic search metrics for each competitor's site as a whole (not a per-feature figure — none of
these competitors expose a "trend forecast" feature Ahrefs can isolate).

| Competitor | What it actually sells | Leading-indicator forecast? | Ahrefs org. traffic/mo (cached 2026-08-29) | Ahrefs org. keywords |
|---|---|---|---|---|
| **K-lytics** (k-lytics.com) | Written quarterly/periodic genre trend reports, human-analyst authored | No — retrospective written analysis, not a live forecast; report value decays with its publish date | 208 | 42 |
| **Publisher Rocket** (publisherrocket.com) | Keyword/category research tool, one-off snapshot | No — a snapshot at purchase time, no tracking or forecasting over time | 5,168 | 48 |
| **BookBeam** | Rank/category tracking over time | No — tracks what already happened (rank movement), not what's about to | not in the cached IN-1138 pull (domain not covered) | not in the cached IN-1138 pull |
| **ScribeCount** (scribecount.com) | Royalty/sales aggregation across retailers | No — a reporting tool for sales that already happened | 2,157 | 200 |
| **Kindlepreneur** (kindlepreneur.com) | Publishing education + tool bundle (incl. Publisher Rocket) | No — the site itself is content/education, not a forecasting product | 49,708 | 8,265 |
| **Tropesmith Trend Radar** | Leading-indicator forecast: measured lead time, event-test + walk-forward backtested lift, confidence band per forecast | **Yes** — the only product in this set that forecasts forward rather than reporting present/past state | n/a (new page) | n/a |

**The honest gap this fills:** every tool in the comparison set reports *what already happened*
(rank, royalties, a static report) or *what's true right now* (a keyword snapshot). None of them
publish a forward lead time with a measured lift and an honest confidence band. That's the
specific, narrow claim the Trend Radar makes — not "better data," a genuinely different
temporal position (ahead of the market, not a read of it).

**What this comparison is NOT:** a claim that Tropesmith's overall site traffic or SEO position
beats any of these — several (Kindlepreneur, Publisher Rocket) substantially outrank Tropesmith
on raw organic traffic. The comparison is scoped to the one feature category (forward-looking
trend forecasting), where none of them compete.

## Sources

- Ahrefs organic metrics: cached pull `/root/estate/in1138/ahrefs_competitor_pull.json`,
  pulled 2026-08-29 (IN-1138, "the domains resolve, Ahrefs traffic/keyword numbers are
  live-pulled (not estimated)"). Not re-pulled for this WO — Ahrefs runway RED as of
  2026-09-10 (see above).
- Competitor feature descriptions: the estate's own existing comparison pages
  (`/k-lytics-alternative/`, `/publisher-rocket-alternative/`, `/bookbeam-alternative/`,
  already live on tropesmith.com) plus each vendor's own public site copy.
- Radar's own measured numbers: `/root/estate/v2/runs/TS-0966/evidence.json` (3a) and
  `evidence-b.json` (3b), sourced from live `trend_backtest_runs` / `trend_lag_library` rows,
  queried 2026-09-10.

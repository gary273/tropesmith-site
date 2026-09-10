# Trend Radar — README (TS-0966 phase 3b)

## What it is

A leading-indicator trope-demand forecast, built on top of TS-0964's trend-signal pipeline
(3a hardened it: strength gate, honest labels, lift, confidence bands, fuzzy TMDB matching).
The radar answers: *which trope will readers be searching for in the next few weeks, and how
confident are we?*

## Data flow

```
trend_signals (google_trends / gdelt / tmdb, daily collectors)
  -> trend_lag_library (cross-correlation: does this signal type lead this trope's demand,
     and by how many weeks? per trope/lane/source/event_type)
  -> trend_demand_weekly (the trope's own weekly reader-demand series, the thing being predicted)
  -> forecast.py: for each trope with a proven lag, project forward using the latest signal
     strength; gate out anything below MIN_STRENGTH; label horizon_weeks (0 = "rising now",
     >0 = "rises in ~N weeks"); write status/label/lift/confidence to trend_forecasts
  -> v_trend_radar (view): trend_forecasts WHERE status='active' AND not expired, ranked by
     rank_score = p_rise * (hit_rate - base_rate), LIMIT 30
  -> labs-api action="trend-radar" (this WO): joins trope/lane ids to ref_tropes/ref_subgenres
     display_name (never a raw id), splits free (top 10, no lift/evidence) vs member (full
     list + lift + evidence[] + backtest headline), 60s in-module cache
  -> /trend-radar/ on tropesmith.com: client-side fetch, renders the free board always,
     unlocks the member panel on a verified-entitled email
```

## Tables

- `trend_signals` — raw daily signal observations (google_trends, gdelt, tmdb), FK'd to
  `ref_tropes.id` / `ref_subgenres.id`.
- `trend_lag_library` — per (trope, lane, signal_source, signal_event_type): best_lag_weeks,
  lift_pct, hit_rate, base_rate, n_events — "does this signal type predict this trope, and how
  far ahead."
- `trend_backtest_runs` — one row per walk-forward replay: precision/recall/lift_vs_base over
  a rolling window, by_source breakdown in jsonb.
- `trend_forecasts` — the live forecast table: trope, lane, horizon_weeks, p_rise, hit_rate,
  base_rate, n_events, **status** (active/weak, added 3a), **label**, **lift**, **confidence**
  (added 3a), signals (jsonb evidence array), made_at, expires_at.
- `v_trend_radar` — `SELECT ... FROM trend_forecasts WHERE expires_at > now() AND
  status = 'active' ORDER BY rank_score DESC LIMIT 30`. The strength gate lives here: a weak
  row never reaches this view, so nothing downstream has to re-filter it.

## Timers

Six `ts0964-*` systemd timers (unchanged by 3b): the daily collectors
(`gdelt_shocks.py`, `trends_intent.py`, `tmdb_adaptations.py`), `lag_library.py`,
`backtest.py`, and `forecast.py` (the one that writes `trend_forecasts`). Freshness tracked
via `data_freshness_report()` — `trend_forecasts`, `trend_signals_gdelt`,
`trend_signals_google_trends`, `trend_signals_tmdb` all green as of this run.

## The API: labs-api action `trend-radar`

`POST https://vsbytdonbuwrrlmwteaw.supabase.co/functions/v1/labs-api`
`{"action": "trend-radar", "email": "optional@example.com"}`

- No email, or an email with no active entitlement: `{pro:false, forecasts:[{trope_display,
  lane_display, label, horizon_weeks, confidence}]}` — top 10, no lift, no evidence.
- An email that passes `checkEntitlement()` (active `live_board_monthly` subscription OR a
  positive `app_credit_ledger` balance — the SAME check `format-match`/`format-unlock` already
  use, unmodified): `{pro:true, source, forecasts:[...all active, +lift +evidence[]
  +tmdb_attribution], backtest_headline:{window,n_forecasts,precision,recall,lift_vs_base}}`.
- 60-second in-module cache (`trendRadarCache`) on the underlying `v_trend_radar` /
  `ref_tropes` / `ref_subgenres` / `trend_backtest_runs` joins — both tiers read the same
  cached join, the entitlement check itself is never cached (always live).
- A forecast whose `trope` id has no live `ref_tropes.display_name` is **dropped**, never
  shown as a raw id.

## Re-running / re-measuring

- Recompute forecasts: `cd /root/ts0964 && venv/bin/python3 forecast.py`
- Recompute lag library: `venv/bin/python3 lag_library.py`
- Recompute backtest: `venv/bin/python3 backtest.py`
- Check freshness: `psql "$(cat /root/.coral-voice-secrets/vsbyt_db_url)" -c "select * from data_freshness_report();"`
- Re-fetch the live edge function before editing it again:
  `python3 /root/mapforge/deploy_edge_fn.py --fn labs-api --fetch-live /tmp/live.ts`

## What is NOT done yet (honest residual)

- `lane` is empty on every active forecast measured 2026-09-10 — lane attribution in the
  forecast pipeline is thin (3a's finding); `lane_display` will read `null` on the page and in
  the API until that's built. The page and API both handle this gracefully (lane line simply
  omitted), never fabricated.
- GDELT history backfill did not land (sustained per-IP 429, estate proxy disabled) — news
  signals exist going forward but carry little history yet.
- TMDB match rate is measured at 3/231 (rapidfuzz correct, registry coverage thin — see 3a
  evidence.json) — `tmdb_attribution` will read `false` on nearly every row until that
  improves.
- Neither GDELT nor TMDB has cleared its own backtest — only the Google Trends search-interest
  signal carries a measured lift. The page states this explicitly (the caveat panel).

# tropesmith-site

Marketing + funnel site for Tropesmith - market intelligence for romance authors.

Live: https://tropesmith.com
Preview: https://tropesmith-site.pages.dev

No server, no build step, no framework. HTML + CSS + JS on Cloudflare Pages.

## Structure

tropesmith-site/
  index.html
  how-it-works/index.html
  sample/index.html
  pricing/index.html
  intake/index.html
  status/index.html
  order-complete/index.html
  assets/
    styles.css
    tropesmith.js
  _headers
  _redirects

## Backend wiring (assets/tropesmith.js)

Include on pages that need Stripe or Supabase:

  <script src="https://js.stripe.com/v3/"></script>
  <script src="/assets/tropesmith.js"></script>

Then call:
  Tropesmith.buyProduct('starter')
  Tropesmith.submitIntake({email, subgenre, heat_level, format})
  Tropesmith.pollMapStatus(mapId, {onUpdate: fn})

## Free tools (functions/)

Pages Functions, not static HTML -- server-rendered per request from data baked into the
Function bundle at generator-refresh time (see /root/in0790-gen, `tropesmith-generators.service`).
Each free tool lives in its own `functions/<slug>/` with `shared.js` (render), `data.js` (baked
counts) and usually `[[path]].js` (route). All of them import `functions/_gen/chrome.js` for the
shared header/footer/`tieBack()` cross-link block -- edit that file to change a link across every
tool at once, not each shared.js individually.

  functions/trope-demand/   The Trope Demand Checker (TS-0587/TS-0592, live 2026-08-25).
                            Type a genre + trope, get counted mentions/share/rank/direction at
                            teaser depth; no signup to read it (moat depth stays paid, per Map/
                            Board upsell). $0 cost to the reader -- it is the top-of-funnel link
                            magnet, not a revenue line itself (TS-0576). FAQ + positioning:
                            /root/ts0576/TOOL-BUILD-DOCTRINE.md.
  functions/trope-pairs/, booktok-hashtags/, lane-score/, pulse/, reader-demand/, market/,
  hook-lab/, rejection-radar/, trending/, embed/, category-checker/
                            The other 11 free tools (IN-0797). Same `_gen/chrome.js` pattern;
                            no per-tool README entries yet -- gap, not scope for TS-0576.

## Product IDs

  starter         $15   1 Map
  author_pack     $39   3 Maps
  series_pack     $69   6 Maps
  workhorse_pack  $129  12 Maps

## Brand tokens

  --ts-ink: #10122F
  --ts-violet: #8B5CF6
  --ts-coral: #FF6B7A
  --ts-cream: #FFF9F3
  --ts-mauve: #5b4a59

Fonts: Source Serif Pro, Inter, JetBrains Mono.

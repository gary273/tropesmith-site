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

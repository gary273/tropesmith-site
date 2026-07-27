# Graph Report - tropesmith-site  (2026-07-22)

## Corpus Check
- 6 files · ~103,495 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 39 nodes · 51 edges · 8 communities (6 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- analytics.js
- page-event-tracker.js
- tropesmith.js
- buyProduct
- createCheckoutModal
- tropesmith-site

## God Nodes (most connected - your core abstractions)
1. `grantConsent()` - 5 edges
2. `tropesmith-site` - 5 edges
3. `gtag()` - 4 edges
4. `track()` - 4 edges
5. `buyProduct()` - 4 edges
6. `loadGA()` - 3 edges
7. `wireConversions()` - 3 edges
8. `showBanner()` - 3 edges
9. `enqueue()` - 3 edges
10. `scheduleFlush()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `buyProduct()` --calls--> `createCheckoutModal()`  [EXTRACTED]
  assets/tropesmith.js → assets/tropesmith.js  _Bridges community 3 → community 5_

## Import Cycles
- None detected.

## Communities (8 total, 2 thin omitted)

### Community 0 - "analytics.js"
Cohesion: 0.47
Nodes (8): grantConsent(), gtag(), loadGA(), readConsent(), showBanner(), track(), wireConversions(), writeConsent()

### Community 1 - "page-event-tracker.js"
Cohesion: 0.33
Nodes (7): checkScroll(), enqueue(), flush(), getOrCreate(), scheduleFlush(), uuid(), RFC-4122

### Community 3 - "buyProduct"
Cohesion: 0.67
Nodes (3): buyProduct(), getDiscountCode(), getStripe()

### Community 7 - "tropesmith-site"
Cohesion: 0.33
Nodes (5): Backend wiring (assets/tropesmith.js), Brand tokens, Product IDs, Structure, tropesmith-site

## Knowledge Gaps
- **5 isolated node(s):** `RFC-4122`, `Structure`, `Backend wiring (assets/tropesmith.js)`, `Product IDs`, `Brand tokens`
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `buyProduct()` connect `buyProduct` to `tropesmith.js`, `createCheckoutModal`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `RFC-4122`, `Structure`, `Backend wiring (assets/tropesmith.js)` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
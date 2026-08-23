/**
 * IN-0778 — /lane-score/<lane> served SAME-ORIGIN.
 *
 * Before: a _redirects 302 sent every visitor (and every link anyone shared) to
 * vsbytdonbuwrrlmwteaw.supabase.co. The free tool worked; the link magnet did not,
 * because the URL people ended up on — and linked to — was supabase.co, not us.
 *
 * Now: this Pages Function fetches the same Supabase edge function server-side and
 * answers under https://tropesmith.com/lane-score/<lane>. The shareable URL stays ours.
 *
 * Content negotiation is deliberate and load-bearing:
 *   Accept: text/html (browsers, Googlebot, ClaudeBot, GPTBot)  -> crawlable HTML page
 *   anything else (fetch(), curl, the TS-0540 self-heal probe)  -> the edge fn JSON, verbatim
 * so no existing JSON consumer breaks. ?format=json / ?format=html force either.
 *
 * The 18-24s cold start fixed in IN-0753 must not come back: every upstream response is
 * held in the Cloudflare edge cache for 15 minutes, so a cold Deno isolate is paid for by
 * one visitor per lane per quarter hour, not by every visitor.
 */

const EDGE = 'https://vsbytdonbuwrrlmwteaw.supabase.co/functions/v1/lane-score';
const SITE = 'https://tropesmith.com';
const REPORT = 'https://plotprose.com/classroom/2026-romance-demand-report.html';
const STATS = 'https://vsbytdonbuwrrlmwteaw.supabase.co/functions/v1/public-stats';

/* The lanes the opportunity engine actually covers. `market` is true where a
   /market/<slug>/ page exists to link on to (checked 2026-08-21). */
const LANES = {
	'thriller.mystery_suspense_crime': ['Mystery, Thriller, Suspense & Crime', 1],
	'romance.romcom': ['Romantic Comedy', 1],
	'romance.contemporary': ['Contemporary Romance', 1],
	'fantasy.urban': ['Urban Fantasy', 1],
	'romance.paranormal': ['Paranormal Romance', 1],
	'thriller.psychological_domestic': ['Psychological & Domestic Thrillers', 1],
	'romance.suspense': ['Romantic Suspense', 1],
	'romance.historical': ['Historical Romance', 1],
	'romance.historical.regency': ['Regency Romance', 1],
	'romance.romantasy.romantic_fantasy': ['Romantic Fantasy', 1],
	'romance.contemporary.small_town': ['Small Town Romance', 1],
	'mystery.cozy': ['Cozy Mystery', 1],
	'romance.clean_wholesome': ['Clean & Wholesome Romance', 1],
	'romance.scifi': ['Sci-Fi Romance', 1],
	'romance.lgbtq.mm': ['M/M Romance', 1],
	'romance.romantasy': ['Romantasy', 1],
	'romance.contemporary.billionaire': ['Billionaire Romance', 1],
	'romance.dark.mafia': ['Mafia Romance', 1],
	'romance.contemporary.sports': ['Sports Romance', 1],
	'romance.contemporary.second_chance': ['Second Chance Romance', 1],
	'romance.dark': ['Dark Romance', 1],
	'fantasy.epic': ['Epic Fantasy', 1],
	'romance.contemporary.workplace': ['Workplace Romance', 1],
	'romance.contemporary.later_in_life': ['Later in Life Romance', 1],
	'romance.paranormal.demons_devils': ['Demons & Devils Romance', 1],
	'romance.historical.scottish': ['Scottish Historical Romance', 1],
	'historical_fiction.twentieth_century': ['20th Century Historical Fiction', 1],
	'romance.lgbtq.sapphic': ['Sapphic Romance', 1],
	'romance.contemporary.polyamory': ['Why Choose / Polyamory Romance', 1],
	'scifi.fantasy_combined': ['Science Fiction & Fantasy', 1],
	'romance.cozy_fantasy': ['Cozy Fantasy', 1],
	'thriller.domestic': ['Domestic Thrillers', 1],
	'romance.contemporary.fake_dating': ['Fake Dating Romance', 1],
	'mystery.cozy.paranormal': ['Paranormal Cozy Mystery', 1],
	'romance.adaptation': ['Romance Adaptations', 1],
	'romance.lgbtq': ['Queer / LGBTQ+ Romance', 1],
	'horror.general': ['Horror', 1],
	'romance.paranormal.womens_fiction': ["Paranormal Women's Fiction", 1],
	'thriller.historical': ['Historical Thrillers', 1],
	'romance.contemporary.sports.hockey': ['Hockey Romance', 0],
	'romance.contemporary.single_parent': ['Single Parent Romance', 0],
	'romance.enemies_to_lovers': ['Enemies to Lovers Romance', 0],
	'romance.domestic_discipline': ['Domestic Discipline', 0]
};

const ALIAS = (function () {
	const m = {};
	for (const id of Object.keys(LANES)) m[id.replace(/[._]/g, '-')] = id;
	return m;
})();

function marketSlug(id) {
	return id.replace(/[._]/g, '-');
}

function esc(s) {
	return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function num(n) {
	if (n == null || isNaN(n)) return null;
	return Number(n).toLocaleString('en-US');
}

function usd(n) {
	if (n == null || isNaN(n)) return null;
	return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: Number(n) < 100 ? 2 : 0 });
}

async function cachedJson(url, key, ttl) {
	const cache = caches.default;
	const ck = new Request(SITE + '/__cache/' + key, { method: 'GET' });
	const hit = await cache.match(ck);
	if (hit) {
		try {
			const t = await hit.clone().text();
			return { data: JSON.parse(t), raw: t, cached: true };
		} catch (_e) {}
	}
	let r;
	try {
		r = await fetch(url, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(20000),
			/* cacheEverything is the reliable subrequest cache; caches.default below is a
			   second layer. Without this a cold Supabase isolate (~20s) is paid on every
			   miss, which is the IN-0753 regression we must not reintroduce. */
			cf: { cacheTtl: ttl, cacheEverything: true }
		});
	} catch (e) {
		return { data: null, error: String(e && e.message ? e.message : e) };
	}
	const text = await r.text();
	let data = null;
	try {
		data = JSON.parse(text);
	} catch (_e) {}
	if (r.ok && data) {
		const store = new Response(text, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=' + ttl } });
		try {
			await cache.put(ck, store);
		} catch (_e) {}
	}
	return { data, status: r.status, raw: text };
}

function jsonResponse(body, status) {
	return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
		status: status || 200,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600',
			'access-control-allow-origin': '*',
			'x-lane-score-origin': 'tropesmith-pages-function'
		}
	});
}

/* ---------- shared chrome ---------------------------------------------------- */

const CSS = `*{box-sizing:border-box}body{margin:0;background:#FFF9F3;color:#10122F;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.7}
a{color:#6D28D9}
.topnav{background:linear-gradient(180deg,#141636,#1b1d40);padding:14px 0}
.topnav .in{max-width:900px;margin:0 auto;padding:0 22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.topnav img{height:34px;width:auto}
.topnav nav a{color:#e8e5ff;text-decoration:none;font-size:14px;font-weight:600;margin-left:18px}
.topnav .cta{background:linear-gradient(135deg,#8B5CF6,#FF6B7A);color:#fff;padding:9px 16px;border-radius:999px}
.wrap{max-width:820px;margin:0 auto;padding:36px 22px 30px}
.eyebrow{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#8B5CF6;font-weight:700}
h1{font-family:Fraunces,Georgia,serif;font-size:34px;line-height:1.14;margin:8px 0 10px}
h2{font-family:Fraunces,Georgia,serif;font-size:23px;margin:34px 0 8px}
h3{font-size:15px;margin:22px 0 6px}
.lede{color:#5b4a59;font-size:17px;margin:0 0 22px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin:18px 0}
.cell{background:#FFFEFB;border:1px solid rgba(16,18,47,.1);border-radius:14px;padding:15px 17px}
.cell .t{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#a39395;font-weight:800}
.cell .b{display:block;font-family:Fraunces,Georgia,serif;font-size:26px;line-height:1.2;margin:4px 0 2px}
.cell .s{font-size:13px;color:#5b4a59}
table{width:100%;border-collapse:collapse;margin:10px 0 4px;font-size:14.5px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid rgba(16,18,47,.09)}
th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#a39395}
.note{background:#FFFEFB;border:1px solid rgba(16,18,47,.1);border-radius:14px;padding:16px 18px;font-size:14.5px;color:#3a3450}
.cta-row{margin:26px 0 6px}
.btn{display:inline-block;background:linear-gradient(135deg,#8B5CF6,#FF6B7A);color:#fff;font-weight:700;text-decoration:none;border-radius:999px;padding:13px 22px}
.lanes{columns:2;column-gap:26px;font-size:14.5px;padding:0;list-style:none;margin:10px 0}
.lanes li{break-inside:avoid;padding:3px 0}
pre.embed{background:#141636;color:#e8e5ff;border-radius:12px;padding:14px 16px;font-size:12.5px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace}
.foot{max-width:820px;margin:0 auto;padding:0 22px 60px;color:#a39395;font-size:13px}
.foot a{color:#6D28D9;text-decoration:none}
@media(max-width:640px){.lanes{columns:1}h1{font-size:27px}}`;

function head(title, desc, canonical, ld) {
	return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:url" content="${esc(canonical)}">
<meta property="og:site_name" content="Tropesmith">
<meta property="og:image" content="https://r2-media-server.plotprose-scraper.workers.dev/tropesmith-assets/logo-og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="https://r2-media-server.plotprose-scraper.workers.dev/tropesmith-assets/logo-icon-512.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
${ld.map((o) => '<script type="application/ld+json">' + JSON.stringify(o) + '</script>').join('\n')}
<style>${CSS}</style></head><body>
<div class="topnav"><div class="in">
<a href="/"><img src="https://r2-media-server.plotprose-scraper.workers.dev/tropesmith-assets/logo-header.png" alt="Tropesmith"></a>
<nav><a href="/free-tools/">Free tools</a><a href="/trending/">Trending</a><a href="/reader-demand/">Reader Demand</a><a href="/pricing/">Pricing</a><a class="cta" href="/intake/">Build my Map &rarr;</a></nav>
</div></div>`;
}

function foot() {
	return `<div class="foot">&copy; 2026 Tropesmith &middot; <a href="/">Home</a> &middot; <a href="/free-tools/">Free tools</a> &middot; <a href="/pricing/">Pricing</a> &middot; <a href="/blog/">Blog</a><br>
Scores are produced by the Tropesmith demand engine and move as the market moves. Published by Coral Hart Group.</div></body></html>`;
}

function tieBack(extra) {
	return `<h2>Keep going &mdash; free</h2>
<ul>
${extra || ''}
<li><a href="/free-tools/">Every free Tropesmith tool</a> &mdash; trope opportunity check, reader demand, category &amp; rank checker, lane scores, sample maps.</li>
<li><a href="${REPORT}">The 2026 Romance Demand Report</a> &mdash; the full year&rsquo;s read on where romance demand is heading, from the same engine.</li>
<li><a href="/trending/">Free Romance Trope Opportunity Check</a> &mdash; the tropes to write into in this lane right now.</li>
<li><a href="/reader-demand/">Reader demand by subgenre</a> &mdash; what readers are actually asking for.</li>
</ul>`;
}

function embedBlock(lane) {
	const snip = `<div id="tropesmith-live-board"></div>\n<script src="${SITE}/embed/live-board.js?lane=${encodeURIComponent(lane)}" async></script>`;
	return `<h2>Embed this on your site</h2>
<p class="note">Free to use on any site, newsletter template or author blog. The widget renders live from the Tropesmith engine and must keep its visible &ldquo;Data: Tropesmith&rdquo; credit link &mdash; that attribution link back to tropesmith.com is the licence.</p>
<pre class="embed">${esc(snip)}</pre>
<p style="font-size:14px">Prefer an iframe? <code>&lt;iframe src="${esc(SITE + '/embed/live-board?lane=' + encodeURIComponent(lane))}" width="100%" height="320" style="border:0" loading="lazy" title="Tropesmith live lane board"&gt;&lt;/iframe&gt;</code></p>`;
}

/* ---------- index page ------------------------------------------------------- */

function indexPage(stats) {
	const covered = Object.keys(LANES).filter((k) => LANES[k][1]);
	const canonical = SITE + '/lane-score/';
	const items = covered.map((id, i) => ({
		'@type': 'ListItem',
		position: i + 1,
		name: LANES[id][0] + ' lane score',
		url: SITE + '/lane-score/' + id
	}));
	const ld = [
		{
			'@context': 'https://schema.org',
			'@type': 'WebApplication',
			name: 'Tropesmith Lane Score',
			applicationCategory: 'BusinessApplication',
			operatingSystem: 'Any (web)',
			url: canonical,
			isAccessibleForFree: true,
			offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
			featureList: [
				'Opportunity score and rank for a subgenre lane',
				'Greenlight band with confidence',
				'Lane economics: typical price, Kindle Unlimited share, 30-day demand',
				'Reader heat-level expectation mix',
				'Length and series-shape sweet spot'
			],
			publisher: { '@type': 'Organization', name: 'Coral Hart Group', url: 'https://coralhart.com/' }
		},
		{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Tropesmith lane scores', numberOfItems: covered.length, itemListElement: items },
		{
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Tropesmith', item: SITE + '/' },
				{ '@type': 'ListItem', position: 2, name: 'Free tools', item: SITE + '/free-tools/' },
				{ '@type': 'ListItem', position: 3, name: 'Lane Score', item: canonical }
			]
		}
	];
	const s = stats || {};
	return (
		head(
			'Free Lane Score — is your subgenre worth writing? | Tropesmith',
			'Free lane score for ' + covered.length + ' fiction subgenres: opportunity rank, greenlight band, typical price, Kindle Unlimited share and 30-day demand — live from the Tropesmith engine.',
			canonical,
			ld
		) +
		`<div class="wrap">
<div class="eyebrow">Free tool &middot; Live engine data &middot; No card needed</div>
<h1>Lane Score &mdash; is this subgenre worth writing?</h1>
<p class="lede">One number per lane, built from what readers are actually doing. Pick a lane below and you get its opportunity score and rank, the greenlight band, the money shape of the lane (typical price, Kindle Unlimited share, 30-day demand), the heat level readers expect, and the length and series shape that sell there.</p>
<div class="grid">
<div class="cell"><span class="t">Lanes scored</span><span class="b">${covered.length}</span><span class="s">subgenres with a live score</span></div>
<div class="cell"><span class="t">Reader signals behind it</span><span class="b">${num(s.reader_signals_total) || '&mdash;'}</span><span class="s">reviews, shelves, BookTok and demand signals</span></div>
<div class="cell"><span class="t">Books analysed</span><span class="b">${num(s.books_analyzed) || '&mdash;'}</span><span class="s">titles tagged trope by trope</span></div>
</div>
<h2>Pick your lane</h2>
<ul class="lanes">${covered.map((id) => `<li><a href="/lane-score/${esc(id)}">${esc(LANES[id][0])}</a></li>`).join('')}</ul>
<h2>How the score is built</h2>
<p>Every lane score is composed from engines that already run nightly: relative opportunity across every covered lane, the absolute greenlight board used by the Opportunity Finder, the reader heat-expectation profile, and the length/series sweet spot. Nothing here is an opinion or an estimate typed in by hand &mdash; each number is counted from the corpus below and moves when the corpus moves.</p>
<div class="grid">
<div class="cell"><span class="t">Reviews read</span><span class="b">${num(s.reviews_analyzed) || '&mdash;'}</span><span class="s">Goodreads reviews held</span></div>
<div class="cell"><span class="t">Demand signals</span><span class="b">${num(s.demand_signals_analyzed) || '&mdash;'}</span><span class="s">reader asks parsed</span></div>
<div class="cell"><span class="t">Tropes tracked</span><span class="b">${num(s.tropes_tracked) || '&mdash;'}</span><span class="s">distinct tropes in the tag set</span></div>
<div class="cell"><span class="t">BookTok videos</span><span class="b">${num(s.booktok_videos_analyzed) || '&mdash;'}</span><span class="s">parsed for what readers shout about</span></div>
</div>
${tieBack('<li><a href="/market/">Market snapshots for every lane</a> &mdash; the economics page behind each score.</li>')}
<div class="cta-row"><a class="btn" href="/intake/">Build my Map &rarr;</a> &nbsp; <a href="/pricing/">See pricing</a></div>
</div>` +
		foot()
	);
}

/* ---------- lane page -------------------------------------------------------- */

function lanePage(lane, name, d, stats, hasMarket) {
	const canonical = SITE + '/lane-score/' + lane;
	const o = d.opportunity || {};
	const g = d.greenlight || {};
	const e = d.economics || {};
	const h = d.heat || {};
	const len = d.length || {};
	const s = stats || {};

	const now = new Date();
	const from = new Date(now.getTime() - 30 * 86400000);
	const iso = (x) => x.toISOString().slice(0, 10);

	const vars = [];
	const pv = (n, v, unit, desc) => {
		if (v == null || v === '' || isNaN(Number(v))) return;
		const o2 = { '@type': 'PropertyValue', name: n, value: Number(v) };
		if (unit) o2.unitText = unit;
		if (desc) o2.description = desc;
		vars.push(o2);
	};
	pv('Opportunity score', o.score, 'score 0-100', 'Relative opportunity across every scored lane');
	pv('Opportunity rank', o.rank, 'rank', 'Rank of ' + (o.of || '') + ' scored lanes');
	pv('Greenlight score', g.score, 'score 0-100', 'Absolute greenlight score, band: ' + (g.band || 'n/a'));
	pv('30-day reader demand', e.demand_30d, 'signals', 'Demand signals counted for this lane in the trailing 30 days');
	pv('Top-title monthly revenue', e.top_title_monthly_usd, 'USD/month', 'Modelled ceiling for a chart-topping title in this lane');
	pv('Typical list price', e.typical_price_usd, 'USD', 'Median list price of titles in this lane');
	pv('Kindle Unlimited share', e.kindle_unlimited_pct, 'percent', 'Share of titles in this lane enrolled in Kindle Unlimited');
	pv('Heat sample size', h.n, 'titles', 'Titles behind the reader heat-expectation mix');
	pv('Steamy or hotter', h.steamy_or_hotter_pct, 'percent', 'Share of the lane at steamy heat or above');

	const desc =
		name +
		' lane score: ' +
		(o.score != null ? 'opportunity ' + o.score + '/100' + (o.rank ? ' (rank ' + o.rank + ' of ' + o.of + ')' : '') : 'live opportunity read') +
		(g.band ? ', greenlight band ' + g.band : '') +
		(e.demand_30d != null ? ', ' + num(e.demand_30d) + ' reader demand signals in 30 days' : '') +
		'. Free, live, no sign-up.';

	const ld = [
		{
			'@context': 'https://schema.org',
			'@type': 'Dataset',
			name: name + ' — lane score and market economics',
			description: desc,
			url: canonical,
			isAccessibleForFree: true,
			license: 'https://tropesmith.com/terms/',
			creator: { '@type': 'Organization', name: 'Coral Hart Group', url: 'https://coralhart.com/' },
			publisher: { '@type': 'Organization', name: 'Coral Hart Group', url: 'https://coralhart.com/' },
			temporalCoverage: iso(from) + '/' + iso(now),
			dateModified: now.toISOString(),
			keywords: [name, 'reader demand', 'subgenre opportunity', 'Kindle Unlimited', 'book market data'],
			measurementTechnique:
				'Counted from the Tropesmith corpus: Goodreads reviews and shelf signals, parsed reader demand signals, BookTok video metadata and Amazon category economics, aggregated per subgenre lane.',
			variableMeasured: vars,
			distribution: [
				{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: canonical + '?format=json' }
			],
			// IN-0873: the parent's licence is a real property of it, so stating it here is true
			// rather than invented. This is the only Dataset in the tree without one, and it is a
			// REFERENCE to the lane-score index rather than a separate dataset.
			isPartOf: {
				'@type': 'Dataset',
				name: 'Tropesmith lane scores',
				url: SITE + '/lane-score/',
				license: 'https://tropesmith.com/terms/'
			}
		},
		{
			'@context': 'https://schema.org',
			'@type': 'WebApplication',
			name: 'Tropesmith Lane Score',
			applicationCategory: 'BusinessApplication',
			operatingSystem: 'Any (web)',
			url: canonical,
			isAccessibleForFree: true,
			offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
			featureList: [
				'Opportunity score and rank for a subgenre lane',
				'Greenlight band with confidence',
				'Lane economics: typical price, Kindle Unlimited share, 30-day demand',
				'Reader heat-level expectation mix',
				'Length and series-shape sweet spot',
				'Embeddable widget with attribution'
			],
			publisher: { '@type': 'Organization', name: 'Coral Hart Group', url: 'https://coralhart.com/' }
		},
		{
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Tropesmith', item: SITE + '/' },
				{ '@type': 'ListItem', position: 2, name: 'Free tools', item: SITE + '/free-tools/' },
				{ '@type': 'ListItem', position: 3, name: 'Lane Score', item: SITE + '/lane-score/' },
				{ '@type': 'ListItem', position: 4, name: name, item: canonical }
			]
		}
	];

	const cells = [];
	if (o.score != null)
		cells.push(
			`<div class="cell"><span class="t">Opportunity score</span><span class="b">${o.score}/100</span><span class="s">${esc(o.label || '')}${o.rank ? ' &middot; rank ' + o.rank + ' of ' + o.of : ''}</span></div>`
		);
	if (g.score != null)
		cells.push(
			`<div class="cell"><span class="t">Greenlight</span><span class="b">${esc(g.band || g.score)}</span><span class="s">score ${g.score}/100${g.confidence ? ' &middot; ' + esc(g.confidence) : ''}</span></div>`
		);
	if (e.demand_30d != null)
		cells.push(`<div class="cell"><span class="t">Reader demand, 30 days</span><span class="b">${num(e.demand_30d)}</span><span class="s">signals counted in this lane</span></div>`);
	if (e.typical_price_usd != null)
		cells.push(
			`<div class="cell"><span class="t">Typical list price</span><span class="b">${usd(e.typical_price_usd)}</span><span class="s">${e.kindle_unlimited_pct != null ? e.kindle_unlimited_pct + '% of the lane is in Kindle Unlimited' : 'median across the lane'}</span></div>`
		);
	if (e.top_title_monthly_usd != null)
		cells.push(
			`<div class="cell"><span class="t">Chart-topper ceiling</span><span class="b">${usd(e.top_title_monthly_usd)}</span><span class="s">per month, modelled at ${usd(e.typical_price_usd) || 'list price'}</span></div>`
		);

	let heatTable = '';
	if (h.distribution && h.distribution.length) {
		heatTable =
			`<h2>What heat level readers expect here</h2>
<p>Counted across ${num(h.n) || 'the'} titles in this lane${h.steamy_or_hotter_pct != null ? ' &mdash; <b>' + h.steamy_or_hotter_pct + '%</b> sit at steamy or hotter' : ''}.</p>
<table><thead><tr><th>Heat level</th><th>Share of the lane</th></tr></thead><tbody>` +
			h.distribution.map((x) => `<tr><td>${esc(x.heat_level)}</td><td>${x.pct}%</td></tr>`).join('') +
			'</tbody></table>';
	}

	let lenBlock = '';
	if (len.trend || len.format || len.series) {
		const t = len.trend || {},
			f = len.format || {},
			se = len.series || {};
		const rows = [];
		if (f.kindle_median_pages != null) rows.push(['Median Kindle length', num(f.kindle_median_pages) + ' pages']);
		if (f.overall_median_pages != null) rows.push(['Median length, all formats', num(f.overall_median_pages) + ' pages']);
		if (t.recent_median_pages != null) rows.push(['Recent releases', num(t.recent_median_pages) + ' pages (was ' + num(t.older_median_pages) + ')']);
		if (t.direction) rows.push(['Length is trending', String(t.direction)]);
		if (t.recent_novella_pct != null) rows.push(['Novella-length share, recent', t.recent_novella_pct + '% (was ' + t.older_novella_pct + '%)']);
		if (se.dominant_shape) rows.push(['Dominant series shape', String(se.dominant_shape)]);
		if (rows.length)
			lenBlock =
				'<h2>Length and series shape that sell here</h2><table><tbody>' +
				rows.map((r) => `<tr><td>${esc(r[0])}</td><td><b>${esc(r[1])}</b></td></tr>`).join('') +
				'</tbody></table>';
	}

	return (
		head(name + ' — free lane score & market data | Tropesmith', desc, canonical, ld) +
		`<div class="wrap">
<div class="eyebrow">Free tool &middot; Live engine data &middot; No card needed</div>
<h1>${esc(name)} &mdash; lane score</h1>
<p class="lede">${esc(desc)}</p>
<div class="grid">${cells.join('')}</div>
${g.reason ? '<div class="note"><b>Why this band:</b> ' + esc(g.reason) + '</div>' : ''}
${
	o.demand_pctl != null
		? `<h2>Where the score comes from</h2>
<table><thead><tr><th>Component</th><th>Percentile in this lane</th></tr></thead><tbody>
<tr><td>Reader demand</td><td>${Math.round(o.demand_pctl * 100)}th</td></tr>
<tr><td>Revenue</td><td>${Math.round(o.revenue_pctl * 100)}th</td></tr>
<tr><td>Scarcity (how little is published against that demand)</td><td>${Math.round(o.scarcity_pctl * 100)}th</td></tr>
<tr><td>Momentum</td><td>${Math.round(o.momentum_pctl * 100)}th</td></tr>
</tbody></table>`
		: ''
}
${heatTable}
${lenBlock}
<h2>How this number is measured</h2>
<p>Counted &mdash; not estimated &mdash; from the Tropesmith corpus, and recounted as the corpus grows: ${num(s.reviews_analyzed) || 'millions of'} Goodreads reviews, ${num(s.shelf_signals_analyzed) || 'over a million'} shelf signals, ${num(s.demand_signals_analyzed) || 'over a million'} parsed reader demand signals and ${num(s.booktok_videos_analyzed) || 'tens of thousands of'} BookTok videos, across ${num(s.books_analyzed) || 'thousands of'} trope-tagged titles and ${num(s.tropes_tracked) || 'thousands of'} distinct tropes in ${num(s.romance_lanes_tracked) || '138'} demand lanes. The raw response for this lane is available as <a href="${esc(canonical)}?format=json">JSON</a>.</p>
${embedBlock(lane)}
${tieBack(hasMarket ? `<li><a href="/market/${esc(marketSlug(lane))}/">${esc(name)} market snapshot</a> &mdash; price, Kindle Unlimited share, entrants and rising tropes for this exact lane.</li>` : '')}
<div class="cta-row"><a class="btn" href="/intake/">Build my ${esc(name)} Map &rarr;</a> &nbsp; <a href="/pricing/">See pricing</a> &nbsp; <a href="/lane-score/">All lane scores</a></div>
</div>` +
		foot()
	);
}

/* ---------- handler ---------------------------------------------------------- */

export async function handle(context) {
	const { request } = context;
	const url = new URL(request.url);
	const segs = [].concat(context.params.lane || []).filter(Boolean);
	const fmt = (url.searchParams.get('format') || '').toLowerCase();
	const accept = request.headers.get('accept') || '';
	// HTML IS THE DEFAULT, deliberately. Googlebot, ClaudeBot and GPTBot all send an
	// `Accept` of star-slash-star; the first cut of this Function read that as "a machine"
	// and served them raw JSON, so no crawler ever saw the page, the Dataset schema, the
	// canonical or the attribution — i.e. the link magnet earned nothing.
	// JSON now requires an EXPLICIT signal: ?format=json, or an Accept that asks for
	// application/json and does NOT accept text/html. Every JSON consumer in the estate was
	// moved onto ?format=json BEFORE this default flipped (self-heal monitor x2,
	// ai-radar/verify_all_findings.sh, and the two scripts that rewrite the monitor).
	const wantsJson = fmt === 'json' || (fmt !== 'html' && accept.includes('application/json') && !accept.includes('text/html'));
	const wantsHtml = !wantsJson;

	let raw = decodeURIComponent(segs[0] || url.searchParams.get('subgenre_id') || '').trim().toLowerCase();

	/* dashed alias -> canonical dotted id, 301 so the link equity lands on one URL */
	if (raw && !LANES[raw] && ALIAS[raw]) {
		return Response.redirect(SITE + '/lane-score/' + ALIAS[raw] + url.search, 301);
	}

	if (!raw) {
		if (!wantsHtml) return jsonResponse({ ok: false, error: 'valid subgenre_id required', lanes: Object.keys(LANES) }, 400);
		const st = await cachedJson(STATS, 'stats', 1800);
		return new Response(indexPage(st.data), {
			headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400' }
		});
	}

	if (!/^[a-z0-9._-]{2,80}$/.test(raw)) {
		return wantsHtml
			? new Response(head('Lane not found | Tropesmith', 'That lane is not one we score.', SITE + '/lane-score/', []) +
					'<div class="wrap"><h1>That lane is not one we score</h1><p class="lede">Pick one from the <a href="/lane-score/">full list of scored lanes</a>.</p></div>' + foot(), {
					status: 404,
					headers: { 'content-type': 'text/html; charset=utf-8' }
			  })
			: jsonResponse({ ok: false, error: 'valid subgenre_id required' }, 400);
	}

	/* Fire both upstreams together: serialising them added the public-stats latency on
	   top of the lane-score cold start (25s measured on the first UAT run). */
	const stP = wantsHtml ? cachedJson(STATS, 'stats', 1800) : null;
	const up = await cachedJson(EDGE + '/' + encodeURIComponent(raw), 'ls-' + raw, 900);

	if (!wantsHtml) {
		/* verbatim passthrough — every existing JSON consumer keeps working */
		return jsonResponse(up.raw != null ? up.raw : JSON.stringify({ ok: false, error: up.error || 'upstream unavailable' }), up.data ? 200 : 502);
	}

	const d = up.data;
	if (!d || d.ok !== true) {
		const body =
			head('Lane score unavailable | Tropesmith', 'We do not have a score for this lane yet.', SITE + '/lane-score/' + raw, []) +
			`<div class="wrap"><h1>No score for this lane yet</h1>
<p class="lede">We score ${Object.keys(LANES).filter((k) => LANES[k][1]).length} lanes today and this is not one of them &mdash; or the engine is briefly unreachable. Nothing has been guessed in its place.</p>
<p><a href="/lane-score/">See every lane we do score &rarr;</a></p>${tieBack('')}</div>` +
			foot();
		return new Response(body, { status: d ? 404 : 503, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'retry-after': '120' } });
	}

	const meta = LANES[raw];
	const name = (meta && meta[0]) || d.display_name || raw;
	/* IN-0800: never block the page on public-stats.
	   stP was fired in parallel above, but awaiting it outright put its full
	   AbortSignal.timeout(20000) on the visitor's critical path — 20.147s TTFB measured on
	   /lane-score/romance.dark, and the corpus paragraph then degraded to "millions of
	   Goodreads reviews" regardless, so the reader waited 20s AND got the vague copy.
	   Wait a short budget; if the numbers are not back, render without them and let the fetch
	   finish in the background so it warms the cache for the next visitor. */
	const STATS_BUDGET_MS = 1200;
	let st = { data: null };
	if (stP) {
		const settled = stP.catch(() => ({ data: null }));
		const raced = await Promise.race([
			settled,
			new Promise((res) => setTimeout(() => res(null), STATS_BUDGET_MS))
		]);
		if (raced) {
			st = raced;
		} else if (context && typeof context.waitUntil === 'function') {
			/* still in flight: keep it alive past this response so cachedJson's cache.put lands */
			context.waitUntil(settled);
		}
	}

	return new Response(lanePage(raw, name, d, st.data, !!(meta && meta[1])), {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
			'x-lane-score-origin': 'tropesmith-pages-function'
		}
	});
}

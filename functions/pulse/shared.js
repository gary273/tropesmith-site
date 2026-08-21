/**
 * IN-0778 — /pulse/<lane>[/<date>] served SAME-ORIGIN.
 *
 * Same defect lane-score had: the _redirects rules for /pulse/:sub used status 200, and CF
 * Pages cannot 200-proxy to an external origin (only 301/302), so every one of these URLs
 * has simply 404'd. There are 11 real Trope Pulse issues behind that dead route.
 *
 * Scope is deliberately narrow. Only lanes that actually HAVE issues are routed; everything
 * else gets an honest 404 rather than a thin "no issue yet" page, because publishing 138
 * empty pages would cost us more than the dead route did.
 *
 * /pulse/ itself is NOT handled here — it is excluded in _routes.json and stays a static
 * asset, with env.ASSETS as a belt-and-braces fallback if that exclusion is ever lost.
 */

const ARCHIVE = 'https://vsbytdonbuwrrlmwteaw.supabase.co/functions/v1/pulse-archive';
const SITE = 'https://tropesmith.com';
const REPORT = 'https://plotprose.com/classroom/2026-romance-demand-report.html';

/* slug -> the `subgenre` value pulse_issues actually stores (a display name, not a slug).
   null = the general romance feed (rows with subgenre IS NULL). Counted 2026-08-21:
   11 issues, 4 tagged "Dark Romance", 7 general. */
const FEEDS = {
	'romance': null,
	'latest': null,
	'dark-romance': 'Dark Romance'
};

function esc(s) {
	return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function assetFallback(context) {
	try {
		if (context.env && context.env.ASSETS) return await context.env.ASSETS.fetch(context.request);
	} catch (_e) {}
	try {
		return await context.next();
	} catch (_e) {}
	return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } });
}

function notFound(slug) {
	const lanes = Object.keys(FEEDS).filter((k) => k !== 'latest');
	return new Response(
		`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>No Trope Pulse issue for that lane | Tropesmith</title><meta name="robots" content="noindex">
<style>body{margin:0;background:#FFF9F3;color:#10122F;font-family:Inter,-apple-system,sans-serif;line-height:1.7}
.wrap{max-width:640px;margin:0 auto;padding:60px 22px}h1{font-family:Fraunces,Georgia,serif;font-size:30px;margin:0 0 12px}a{color:#6D28D9}</style></head><body>
<div class="wrap"><h1>No Trope Pulse issue for that lane yet</h1>
<p>The Trope Pulse currently runs for ${lanes.map((l) => '<a href="/pulse/' + esc(l) + '">' + esc(l.replace(/-/g, ' ')) + '</a>').join(' and ')}. Nothing has been invented to fill this page.</p>
<p><a href="/pulse/">The Trope Pulse &rarr;</a> &middot; <a href="/free-tools/">Every free Tropesmith tool &rarr;</a> &middot; <a href="/lane-score/">Lane scores &rarr;</a></p>
</div></body></html>`,
		{ status: 404, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=600' } }
	);
}

/* The archive fn already returns a complete, styled page. We only add what makes it OURS
   and indexable: a canonical on tropesmith.com, Article schema, and a way back in. */
function enrich(html, canonical, feedName, date) {
	const title = (html.match(/<title>([^<]*)<\/title>/i) || [, 'Trope Pulse'])[1].replace(/ · Trope Pulse$/, '');
	const ld = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: title,
		url: canonical,
		isAccessibleForFree: true,
		inLanguage: 'en',
		articleSection: feedName || 'Romance',
		publisher: { '@type': 'Organization', name: 'Coral Hart Group', url: 'https://coralhart.com/' },
		author: { '@type': 'Organization', name: 'Coral Hart Group', url: 'https://coralhart.com/' },
		isPartOf: { '@type': 'CreativeWorkSeries', name: 'The Trope Pulse', url: SITE + '/pulse/' }
	};
	if (date) {
		ld.datePublished = date;
		ld.dateModified = date;
	}
	const head =
		`<link rel="canonical" href="${esc(canonical)}">` +
		`<meta property="og:url" content="${esc(canonical)}"><meta property="og:type" content="article">` +
		`<meta property="og:site_name" content="Tropesmith">` +
		'<script type="application/ld+json">' + JSON.stringify(ld) + '</script>';
	const foot = `<div style="max-width:640px;margin:28px auto 60px;padding:16px 20px;background:#FFFEFB;border:1px solid rgba(16,18,47,.1);border-radius:16px;font:400 14.5px/1.7 Inter,system-ui,sans-serif;color:#3a3450">
<b>Keep going &mdash; free.</b><br>
<a href="/pulse/" style="color:#6D28D9">Every Trope Pulse issue</a> &middot;
<a href="/lane-score/" style="color:#6D28D9">Is your subgenre worth writing?</a> &middot;
<a href="/free-tools/" style="color:#6D28D9">Every free Tropesmith tool</a> &middot;
<a href="${REPORT}" style="color:#6D28D9">The 2026 Romance Demand Report</a></div>`;

	let out = html;
	out = out.includes('</head>') ? out.replace('</head>', head + '</head>') : head + out;
	out = out.includes('</body>') ? out.replace('</body>', foot + '</body>') : out + foot;
	return out;
}

export async function handle(context) {
	const { request } = context;
	const url = new URL(request.url);
	const segs = [].concat(context.params && context.params.path ? context.params.path : []).filter(Boolean);

	/* /pulse and /pulse/ are the static archive index — never this Function. */
	if (!segs.length) return assetFallback(context);

	const slug = decodeURIComponent(segs[0]).trim().toLowerCase();
	if (!(slug in FEEDS)) return notFound(slug);

	const date = segs[1] && /^\d{4}-\d{2}-\d{2}$/.test(segs[1]) ? segs[1] : null;
	const subgenre = FEEDS[slug];

	const q = new URLSearchParams();
	if (subgenre) q.set('subgenre', subgenre);
	if (date) q.set('date', date);
	const upstream = ARCHIVE + (q.toString() ? '?' + q.toString() : '');

	const cache = caches.default;
	const ck = new Request(SITE + '/__cache/pulse-' + slug + '-' + (date || 'latest'), { method: 'GET' });
	let html = null,
		status = 200;
	const hit = await cache.match(ck);
	if (hit) {
		html = await hit.text();
	} else {
		let r;
		try {
			r = await fetch(upstream, { signal: AbortSignal.timeout(20000), cf: { cacheTtl: 900, cacheEverything: true } });
		} catch (_e) {
			return new Response('Trope Pulse is briefly unreachable. Try again shortly.', {
				status: 503,
				headers: { 'content-type': 'text/plain; charset=utf-8', 'retry-after': '120' }
			});
		}
		status = r.status;
		html = await r.text();
		if (r.ok && html) {
			try {
				await cache.put(ck, new Response(html, { headers: { 'content-type': 'text/html', 'cache-control': 'public, max-age=900' } }));
			} catch (_e) {}
		}
	}

	/* upstream says there is no issue -> pass the 404 through, do NOT publish a thin page */
	if (status !== 200) return notFound(slug);

	const canonical = SITE + '/pulse/' + slug + (date ? '/' + date : '');
	return new Response(enrich(html, canonical, subgenre, date), {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
			'x-pulse-origin': 'tropesmith-pages-function'
		}
	});
}

/**
 * IN-0778 — embeddable Tropesmith Live Board.
 *
 * This is the actual link mechanism. A tool people use is a visit; a widget people paste
 * into their own site is a permanent, crawlable <a href="https://tropesmith.com/..."> on
 * somebody else's domain, refreshed by us. The attribution link is not decoration — it is
 * the licence, and it is rendered server-side into the payload so a publisher cannot ship
 * the widget without it.
 *
 * Routes
 *   /embed/                     documentation page (crawlable, links back into the free tools)
 *   /embed/live-board.js        <script> embed. Data is baked in server-side: one request,
 *                               no client-side fetch, no dependency, no CORS round trip.
 *   /embed/live-board           standalone HTML for an <iframe> (noindex).
 * Query
 *   ?lane=<subgenre_id>         default romance.contemporary
 *   ?theme=light|dark
 */

import { PAIRS as TP_PAIRS, TROPES as TP_TROPES, LANE_NAMES as TP_LANES, AS_OF as TP_AS_OF } from '../trope-pairs/data.js';
import { TAGS as BT_TAGS, LANE_NAMES as BT_LANES, AS_OF as BT_AS_OF } from '../booktok-hashtags/data.js';

const EDGE = 'https://vsbytdonbuwrrlmwteaw.supabase.co/functions/v1/lane-score';
const STATS = 'https://vsbytdonbuwrrlmwteaw.supabase.co/functions/v1/public-stats';
const SITE = 'https://tropesmith.com';
const REPORT = 'https://plotprose.com/classroom/2026-romance-demand-report.html';
const DEFAULT_LANE = 'romance.contemporary';

function esc(s) {
	return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function num(n) {
	if (n == null || isNaN(n)) return null;
	return Number(n).toLocaleString('en-US');
}

async function cachedJson(url, key, ttl) {
	const cache = caches.default;
	const ck = new Request(SITE + '/__cache/' + key, { method: 'GET' });
	const hit = await cache.match(ck);
	if (hit) {
		try {
			return await hit.json();
		} catch (_e) {}
	}
	try {
		const r = await fetch(url, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(20000),
			cf: { cacheTtl: ttl, cacheEverything: true }
		});
		const text = await r.text();
		const data = JSON.parse(text);
		if (r.ok) {
			try {
				await cache.put(ck, new Response(text, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=' + ttl } }));
			} catch (_e) {}
		}
		return data;
	} catch (_e) {
		return null;
	}
}

/* The widget markup. Kept to one <a> per row plus the attribution link, no scripts,
   no webfonts, no images — it has to be safe to paste into somebody else's page. */
function card(lane, d, stats, theme) {
	const dark = theme === 'dark';
	const bg = dark ? '#141636' : '#FFFEFB';
	const ink = dark ? '#f4f1ff' : '#10122F';
	const dim = dark ? '#b3aad6' : '#5b4a59';
	const line = dark ? 'rgba(255,255,255,.14)' : 'rgba(16,18,47,.12)';
	const accent = '#8B5CF6';

	const o = (d && d.opportunity) || {};
	const g = (d && d.greenlight) || {};
	const e = (d && d.economics) || {};
	const h = (d && d.heat) || {};
	const name = (d && d.display_name) || lane;
	const href = SITE + '/lane-score/' + encodeURIComponent(lane) + '?utm_source=embed&utm_medium=widget&utm_campaign=live-board';

	const rows = [];
	if (o.score != null) rows.push(['Opportunity', o.score + '/100', (o.label || '') + (o.rank ? ' · rank ' + o.rank + ' of ' + o.of : '')]);
	if (g.band) rows.push(['Greenlight', String(g.band), g.score != null ? 'score ' + g.score + '/100' : '']);
	if (e.demand_30d != null) rows.push(['Reader demand · 30d', num(e.demand_30d), 'signals counted in this lane']);
	if (h.steamy_or_hotter_pct != null) rows.push(['Heat readers expect', h.steamy_or_hotter_pct + '% steamy+', num(h.n) ? 'across ' + num(h.n) + ' titles' : '']);

	const cells = rows
		.map(
			(r) =>
				`<div style="padding:10px 12px;border-top:1px solid ${line}"><div style="font:700 10px/1.4 system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:${dim}">${esc(
					r[0]
				)}</div><div style="font:700 19px/1.3 system-ui,sans-serif;color:${ink};margin:2px 0 1px">${esc(r[1])}</div><div style="font:400 12px/1.45 system-ui,sans-serif;color:${dim}">${esc(
					r[2]
				)}</div></div>`
		)
		.join('');

	const corpus = stats && stats.reader_signals_total ? num(stats.reader_signals_total) + ' reader signals' : 'live reader signals';

	return `<div class="ts-lb" style="max-width:420px;background:${bg};border:1px solid ${line};border-radius:16px;overflow:hidden;box-shadow:0 12px 30px -20px rgba(20,22,54,.5)">
<div style="padding:12px 12px 10px;background:linear-gradient(135deg,${accent},#FF6B7A)">
<div style="font:700 10px/1.4 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.85)">Live Board · refreshed continuously</div>
<div style="font:700 17px/1.3 system-ui,sans-serif;color:#fff;margin-top:2px">${esc(name)}</div>
</div>
${cells || `<div style="padding:14px 12px;font:400 13px/1.6 system-ui,sans-serif;color:${dim}">This lane has no score yet.</div>`}
<div style="padding:9px 12px;border-top:1px solid ${line};font:400 11.5px/1.5 system-ui,sans-serif;color:${dim}">Data: <a href="${esc(
		href
	)}" rel="noopener" style="color:${accent};font-weight:700;text-decoration:none">Tropesmith</a> · built from ${esc(corpus)} · <a href="${esc(
		SITE
	)}/free-tools/?utm_source=embed" rel="noopener" style="color:${accent};text-decoration:none">free tools</a></div>
</div>`;
}


/* ---------- IN-0790: two more widgets, same licence ---------------------------------
   Both render from data baked into the bundle, so a publisher's page never waits on an
   upstream and never shows an empty card. The "Data: Tropesmith" link is written in
   server-side and is the condition of use. */

function shell(title, sub, rowsHtml, href, credit, theme) {
	const dark = theme === 'dark';
	const bg = dark ? '#141636' : '#FFFEFB';
	const ink = dark ? '#f4f1ff' : '#10122F';
	const dim = dark ? '#b3aad6' : '#5b4a59';
	const line = dark ? 'rgba(255,255,255,.14)' : 'rgba(16,18,47,.12)';
	const accent = '#8B5CF6';
	return `<div class="ts-w" style="max-width:460px;background:${bg};border:1px solid ${line};border-radius:16px;overflow:hidden;box-shadow:0 12px 30px -20px rgba(20,22,54,.5)">
<div style="padding:12px 12px 10px;background:linear-gradient(135deg,${accent},#FF6B7A)">
<div style="font:700 10px/1.4 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.85)">${esc(sub)}</div>
<div style="font:700 17px/1.3 system-ui,sans-serif;color:#fff;margin-top:2px">${esc(title)}</div>
</div>
${rowsHtml || `<div style="padding:14px 12px;font:400 13px/1.6 system-ui,sans-serif;color:${dim}">No data for this lane yet.</div>`}
<div style="padding:9px 12px;border-top:1px solid ${line};font:400 11.5px/1.5 system-ui,sans-serif;color:${dim}">Data: <a href="${esc(
		href
	)}" rel="noopener" style="color:${accent};font-weight:700;text-decoration:none">Tropesmith</a> &middot; ${esc(credit)} &middot; <a href="${esc(
		SITE
	)}/free-tools/?utm_source=embed" rel="noopener" style="color:${accent};text-decoration:none">free tools</a></div>
</div>`;
}

function wRow(left, right, note, theme) {
	const dark = theme === 'dark';
	const ink = dark ? '#f4f1ff' : '#10122F';
	const dim = dark ? '#b3aad6' : '#5b4a59';
	const line = dark ? 'rgba(255,255,255,.14)' : 'rgba(16,18,47,.12)';
	return `<div style="padding:9px 12px;border-top:1px solid ${line};display:flex;justify-content:space-between;gap:10px;align-items:baseline">
<div style="font:600 13.5px/1.4 system-ui,sans-serif;color:${ink}">${esc(left)}${
		note ? `<div style="font:400 11.5px/1.4 system-ui,sans-serif;color:${dim};margin-top:1px">${esc(note)}</div>` : ''
	}</div>
<div style="font:700 14px/1.3 system-ui,sans-serif;color:${ink};white-space:nowrap">${esc(right)}</div></div>`;
}

function tropePairsCard(lane, theme) {
	const rows = TP_PAIRS[lane] || [];
	const scored = rows
		.slice()
		.sort((a, b) => (b[3] === 0 ? Infinity : b[2] / b[3]) - (a[3] === 0 ? Infinity : a[2] / a[3]))
		.slice(0, 5);
	const name = TP_LANES[lane] || lane;
	const href = SITE + '/trope-pairs/' + encodeURIComponent(lane) + '?utm_source=embed&utm_medium=widget&utm_campaign=trope-pairs';
	const html = scored
		.map((p) => {
			const a = TP_TROPES[p[0]] || p[0];
			const b = TP_TROPES[p[1]] || p[1];
			const note = p[3] === 0 ? 'no published title carries both' : p[3] + ' published title' + (p[3] === 1 ? '' : 's') + ' carry both';
			return wRow(a + ' + ' + b, num(p[2]) + ' asks', note, theme);
		})
		.join('');
	return shell(name + ' — what readers ask for', 'Trope pairings · counted', html, href, 'counted ' + TP_AS_OF, theme);
}

function booktokCard(lane, theme) {
	let rows = BT_TAGS.filter((t) => (lane ? t[1] === lane : !t[1]));
	if (!rows.length) rows = BT_TAGS.filter((t) => !t[1]);
	rows = rows.slice().sort((a, b) => b[6] - a[6]).slice(0, 5);
	const name = lane ? (BT_LANES[lane] || lane) + ' — BookTok hashtags' : 'BookTok hashtags by measured reach';
	const href = SITE + '/booktok-hashtags/' + (lane ? encodeURIComponent(lane) : '') + '?utm_source=embed&utm_medium=widget&utm_campaign=booktok-tags';
	const html = rows.map((t) => wRow('#' + t[0], num(t[6]) + ' plays/video', t[3] + ' videos scanned · ' + t[2], theme)).join('');
	return shell(name, 'Dated snapshot · measured', html, href, 'snapshot ' + BT_AS_OF, theme);
}

function docsPage() {
	const snip = `<div id="tropesmith-live-board"></div>\n<script src="${SITE}/embed/live-board.js?lane=romance.dark" async></script>`;
	const ld = [
		{
			'@context': 'https://schema.org',
			'@type': 'WebApplication',
			name: 'Tropesmith Live Board embed',
			applicationCategory: 'BusinessApplication',
			operatingSystem: 'Any (web)',
			url: SITE + '/embed/',
			isAccessibleForFree: true,
			offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
			featureList: ['Embeddable live lane board', 'Script or iframe embed', 'Light and dark themes', 'No dependencies', 'Attribution link required'],
			publisher: { '@type': 'Organization', name: 'Coral Hart Group', url: 'https://coralhart.com/' }
		}
	];
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Embed the Tropesmith Live Board — free widget | Tropesmith</title>
<meta name="description" content="Put live romance lane data on your own site free: opportunity score, greenlight band, 30-day reader demand and heat mix. One script tag, no dependencies, attribution required.">
<link rel="canonical" href="${SITE}/embed/">
<script type="application/ld+json">${JSON.stringify(ld[0])}</script>
<style>body{margin:0;background:#FFF9F3;color:#10122F;font-family:Inter,-apple-system,sans-serif;line-height:1.7}
.wrap{max-width:760px;margin:0 auto;padding:40px 22px 60px}
h1{font-family:Fraunces,Georgia,serif;font-size:32px;line-height:1.15;margin:6px 0 12px}
h2{font-family:Fraunces,Georgia,serif;font-size:22px;margin:32px 0 8px}
a{color:#6D28D9}
pre{background:#141636;color:#e8e5ff;border-radius:12px;padding:14px 16px;font-size:12.5px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace}
.eyebrow{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#8B5CF6;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:14.5px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid rgba(16,18,47,.09)}th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#a39395}</style></head><body>
<div class="wrap">
<div class="eyebrow">Free widget &middot; No card, no key, no account</div>
<h1>Put the Live Board on your own site</h1>
<p>One script tag. It renders a live card for any lane we score &mdash; opportunity score and rank, greenlight band, 30-day reader demand and the heat level readers expect &mdash; and it updates itself as the market moves. No libraries, no build step, nothing to maintain.</p>
<h2>The snippet</h2>
<pre>${esc(snip)}</pre>
<h2>Options</h2>
<table><thead><tr><th>Parameter</th><th>What it does</th></tr></thead><tbody>
<tr><td><code>lane</code></td><td>Any lane from <a href="/lane-score/">the scored lane list</a>, e.g. <code>romance.dark</code>. Defaults to <code>${DEFAULT_LANE}</code>.</td></tr>
<tr><td><code>theme</code></td><td><code>light</code> (default) or <code>dark</code>.</td></tr>
</tbody></table>
<h2>Two more free widgets</h2>
<p><b>Trope pairings</b> &mdash; the trope pairings readers in a lane ask for, with how many published titles actually carry both. Counted, not estimated.</p>
<pre>${esc('<div id="tropesmith-trope-pairs"></div>\n<script src="' + SITE + '/embed/trope-pairs.js?lane=romance.dark" async></script>')}</pre>
<p><b>BookTok hashtags</b> &mdash; measured plays per video for the hashtags in a lane, each with its scan date. A dated snapshot, never presented as live.</p>
<pre>${esc('<div id="tropesmith-booktok-tags"></div>\n<script src="' + SITE + '/embed/booktok-tags.js?lane=romance.dark" async></script>')}</pre>
<p>Both take the same <code>lane</code> and <code>theme</code> parameters, both have iframe equivalents at <code>/embed/trope-pairs</code> and <code>/embed/booktok-tags</code>, and both carry the same one condition: keep the visible credit link.</p>
<h2>Prefer an iframe?</h2>
<pre>${esc('<iframe src="' + SITE + '/embed/live-board?lane=romance.dark" width="100%" height="320" style="border:0" loading="lazy" title="Tropesmith live lane board"></iframe>')}</pre>
<h2>The licence</h2>
<p>Free to use on any site, blog or newsletter template, commercial or not. The one condition: keep the visible <b>&ldquo;Data: Tropesmith&rdquo;</b> credit link back to tropesmith.com. Do not strip it, hide it or <code>nofollow</code> it &mdash; that link is what pays for the data.</p>
<h2>Where the numbers come from</h2>
<p>Counted from the Tropesmith corpus &mdash; Goodreads reviews and shelf signals, parsed reader demand signals, BookTok video metadata and Amazon category economics &mdash; and recounted as the corpus grows. See <a href="/free-tools/">every free Tropesmith tool</a>, the full <a href="/lane-score/">lane score list</a>, or the <a href="${REPORT}">2026 Romance Demand Report</a>.</p>
</div></body></html>`;
}

export async function handle(context) {
	const { request } = context;
	const url = new URL(request.url);
	const segs = [].concat(context.params.widget || []).filter(Boolean);
	const what = (segs[0] || '').toLowerCase();
	const lane = (url.searchParams.get('lane') || DEFAULT_LANE).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
	const theme = url.searchParams.get('theme') === 'dark' ? 'dark' : 'light';

	const common = {
		'access-control-allow-origin': '*',
		'cache-control': 'public, max-age=900, s-maxage=1800, stale-while-revalidate=86400',
		'x-robots-tag': 'noindex'
	};

	if (!what) {
		return new Response(docsPage(), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
	}

	/* IN-0790 */
	if (what === 'trope-pairs' || what === 'trope-pairs.js' || what === 'booktok-tags' || what === 'booktok-tags.js') {
		const isPairs = what.indexOf('trope-pairs') === 0;
		const html2 = isPairs ? tropePairsCard(lane, theme) : booktokCard(url.searchParams.get('lane') ? lane : '', theme);
		if (what.slice(-3) === '.js') {
			const id = isPairs ? 'tropesmith-trope-pairs' : 'tropesmith-booktok-tags';
			const js2 =
				'(function(){var h=' +
				JSON.stringify(html2) +
				';var s=document.currentScript;var t=document.getElementById(' +
				JSON.stringify(id) +
				');if(!t&&s){t=document.createElement("div");s.parentNode.insertBefore(t,s);}if(t){t.innerHTML=h;}})();';
			return new Response(js2, { headers: Object.assign({ 'content-type': 'application/javascript; charset=utf-8' }, common) });
		}
		const page2 = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tropesmith widget</title><meta name="robots" content="noindex">
<style>body{margin:0;padding:8px;background:transparent;font-family:system-ui,-apple-system,sans-serif}a{text-decoration:none}</style></head>
<body>${html2.replace(/<a /g, '<a target="_top" ')}</body></html>`;
		return new Response(page2, {
			headers: Object.assign({ 'content-type': 'text/html; charset=utf-8', 'content-security-policy': 'frame-ancestors *' }, common)
		});
	}

	if (what !== 'live-board' && what !== 'live-board.js') {
		return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } });
	}

	const [d, stats] = await Promise.all([cachedJson(EDGE + '/' + encodeURIComponent(lane), 'ls-' + lane, 900), cachedJson(STATS, 'stats', 1800)]);
	const html = card(lane, d && d.ok ? d : null, stats, theme);

	if (what === 'live-board.js') {
		const js =
			'(function(){var h=' +
			JSON.stringify(html) +
			';var s=document.currentScript;var t=document.getElementById("tropesmith-live-board");if(!t&&s){t=document.createElement("div");s.parentNode.insertBefore(t,s);}if(t){t.innerHTML=h;}})();';
		return new Response(js, { headers: Object.assign({ 'content-type': 'application/javascript; charset=utf-8' }, common) });
	}

	const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tropesmith Live Board</title><meta name="robots" content="noindex">
<style>body{margin:0;padding:8px;background:transparent;font-family:system-ui,-apple-system,sans-serif}a{text-decoration:none}</style></head>
<body>${html.replace(/<a /g, '<a target="_top" ')}</body></html>`;
	return new Response(page, {
		headers: Object.assign({ 'content-type': 'text/html; charset=utf-8', 'content-security-policy': "frame-ancestors *" }, common)
	});
}

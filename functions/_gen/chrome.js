/**
 * IN-0790 — shared page chrome for the free data generators.
 *
 * Deliberately the same shell as /lane-score/: same nav, same CSS, same footer, so a new
 * tool does not read as a bolt-on. Nothing here fetches anything at request time — the
 * generators render from data baked into the bundle, so the page is byte-identical with
 * JavaScript off and there is no cold start to hide behind a spinner.
 */
export const SITE = 'https://tropesmith.com';
// IN-0873: the @id alone is a cross-domain reference Google will not resolve — it saw an
// untyped object on 88 Dataset nodes. The type and name now travel WITH the @id rather
// than replacing it: repointing this at a local tropesmith org node would clear the alert
// and undo IN-0781's one-organisation-one-@id graph across the estate.
export const ORG = {
	'@id': 'https://coralhart.com/#organization',
	'@type': 'Organization',
	name: 'Coral Hart Group',
	url: 'https://coralhart.com/'
};
export const REPORT = 'https://plotprose.com/classroom/2026-romance-demand-report.html';

export function esc(s) {
	return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function num(n) {
	if (n == null || isNaN(n)) return '&mdash;';
	return Number(n).toLocaleString('en-US');
}

/* 15.6 billion plays is unreadable as 15,604,005,653. */
export function big(n) {
	n = Number(n);
	if (!isFinite(n)) return '&mdash;';
	if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 1 : 2) + 'B';
	if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + 'M';
	if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
	return String(n);
}

export const CSS = `*{box-sizing:border-box}body{margin:0;background:#FFF9F3;color:#10122F;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.7}
a{color:#6D28D9}
.topnav{background:linear-gradient(180deg,#141636,#1b1d40);padding:14px 0}
.topnav .in{max-width:900px;margin:0 auto;padding:0 22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.topnav img{height:34px;width:auto}
.topnav nav a{color:#e8e5ff;text-decoration:none;font-size:14px;font-weight:600;margin-left:18px}
.topnav .cta{background:linear-gradient(135deg,#8B5CF6,#FF6B7A);color:#fff;padding:9px 16px;border-radius:999px}
.wrap{max-width:860px;margin:0 auto;padding:36px 22px 30px}
.eyebrow{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#8B5CF6;font-weight:700}
h1{font-family:Fraunces,Georgia,serif;font-size:34px;line-height:1.14;margin:8px 0 10px}
h2{font-family:Fraunces,Georgia,serif;font-size:23px;margin:34px 0 8px}
.lede{color:#5b4a59;font-size:17px;margin:0 0 22px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:18px 0}
.cell{background:#FFFEFB;border:1px solid rgba(16,18,47,.1);border-radius:14px;padding:15px 17px}
.cell .t{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#a39395;font-weight:800}
.cell .b{display:block;font-family:Fraunces,Georgia,serif;font-size:26px;line-height:1.2;margin:4px 0 2px}
.cell .s{font-size:13px;color:#5b4a59}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
table{width:100%;border-collapse:collapse;margin:10px 0 4px;font-size:14.5px;min-width:520px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid rgba(16,18,47,.09);vertical-align:top}
th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#a39395}
td.n,th.n{text-align:right;white-space:nowrap}
.pill{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:2px 9px}
.pill.open{color:#1E7A43;background:#E9F9EE;border:1px solid #BEE9CC}
.pill.tight{color:#8A5A00;background:#FFF4DF;border:1px solid #F2DCA9}
.pill.crowded{color:#8B2942;background:#FDECF0;border:1px solid #F4C6D2}
.note{background:#FFFEFB;border:1px solid rgba(16,18,47,.1);border-radius:14px;padding:16px 18px;font-size:14.5px;color:#3a3450}
.cta-row{margin:26px 0 6px}
.btn{display:inline-block;background:linear-gradient(135deg,#8B5CF6,#FF6B7A);color:#fff;font-weight:700;text-decoration:none;border-radius:999px;padding:13px 22px}
.lanes{columns:2;column-gap:26px;font-size:14.5px;padding:0;list-style:none;margin:10px 0}
.lanes li{break-inside:avoid;padding:3px 0}
pre.embed{background:#141636;color:#e8e5ff;border-radius:12px;padding:14px 16px;font-size:12.5px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace}
.foot{max-width:860px;margin:0 auto;padding:0 22px 60px;color:#a39395;font-size:13px}
.foot a{color:#6D28D9;text-decoration:none}
@media(max-width:640px){.lanes{columns:1}h1{font-size:27px}}`;

export function head(title, desc, canonical, ld) {
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
${ld.map((o) => '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>').join('\n')}
<style>${CSS}</style></head><body>
<div class="topnav"><div class="in">
<a href="/"><img src="https://r2-media-server.plotprose-scraper.workers.dev/tropesmith-assets/logo-header.png" alt="Tropesmith"></a>
<nav><a href="/free-tools/">Free tools</a><a href="/trending/">Trending</a><a href="/reader-demand/">Reader Demand</a><a href="/pricing/">Pricing</a><a class="cta" href="/intake/">Build my Map &rarr;</a></nav>
</div></div>`;
}

export function foot() {
	return `<div class="foot">&copy; 2026 Tropesmith &middot; <a href="/">Home</a> &middot; <a href="/free-tools/">Free tools</a> &middot; <a href="/pricing/">Pricing</a> &middot; <a href="/blog/">Blog</a><br>
Published by Coral Hart Group. Figures on this page are counted rows from the Tropesmith corpus, not estimates, and are restated each time the corpus is recounted.</div></body></html>`;
}

export function breadcrumb(name, url, parentName, parentUrl) {
	const items = [
		{ '@type': 'ListItem', position: 1, name: 'Tropesmith', item: SITE + '/' },
		{ '@type': 'ListItem', position: 2, name: 'Free tools', item: SITE + '/free-tools/' }
	];
	if (parentName) items.push({ '@type': 'ListItem', position: items.length + 1, name: parentName, item: parentUrl });
	items.push({ '@type': 'ListItem', position: items.length + 1, name, item: url });
	return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

export function app(cfg) {
	const o = {
		'@context': 'https://schema.org',
		'@type': ['SoftwareApplication', 'WebApplication'],
		'@id': cfg.url + '#tool',
		name: cfg.name,
		url: cfg.url,
		description: cfg.description,
		applicationCategory: 'BusinessApplication',
		applicationSubCategory: 'Book market research tool',
		operatingSystem: 'Any (web browser)',
		browserRequirements: 'None - the page renders without JavaScript',
		isAccessibleForFree: true,
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
		featureList: cfg.featureList,
		inLanguage: 'en',
		provider: ORG,
		publisher: ORG,
		creator: ORG,
		dateModified: cfg.asOf
	};
	if (cfg.dataset) o.isBasedOn = { '@id': cfg.dataset };
	return o;
}

export function pv(name, value, unit, description) {
	return { '@type': 'PropertyValue', name, value, unitText: unit, description };
}

export function tieBack(extra) {
	return `<h2>Keep going &mdash; free</h2>
<ul>
${extra || ''}
<li><a href="/free-tools/">Every free Tropesmith tool</a> &mdash; lane scores, trope opportunity check, reader demand, category &amp; rank checker, Hook Lab.</li>
<li><a href="${REPORT}">The 2026 Romance Demand Report</a> &mdash; the full year&rsquo;s read on where romance demand is heading, from the same engine.</li>
<li><a href="/lane-score/">Lane Score</a> &mdash; is the subgenre worth writing at all?</li>
</ul>`;
}

export function jsonResponse(body, status) {
	return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
		status: status || 200,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
			'access-control-allow-origin': '*'
		}
	});
}

export function htmlResponse(body, status) {
	return new Response(body, {
		status: status || 200,
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
			'x-tropesmith-origin': 'pages-function'
		}
	});
}

/* HTML IS THE DEFAULT. Googlebot, ClaudeBot and GPTBot all send Accept: star/star; the
   first cut of /lane-score/ read that as "a machine", served JSON, and the link magnet
   earned nothing for a day. JSON requires an explicit ask. */
export function wantsJson(request, url) {
	const fmt = (url.searchParams.get('format') || '').toLowerCase();
	if (fmt === 'json') return true;
	if (fmt === 'html') return false;
	const accept = request.headers.get('accept') || '';
	return accept.includes('application/json') && !accept.includes('text/html');
}

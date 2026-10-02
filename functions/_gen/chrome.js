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
<nav><a href="/free-tools/">Free tools</a><a href="/finder/">Opportunity Finder</a><a href="/trending/">Trending</a><a href="/reader-demand/">Reader Demand</a><a href="/pricing/">Pricing</a><a class="cta" href="/intake/">Build my Map &rarr;</a></nav>
</div></div>`;
}

export function foot() {
	return `<div class="foot">Published by Coral Hart Group. Figures on this page are counted rows from the Tropesmith corpus, not estimates, and are restated each time the corpus is recounted.</div><style>footer.chgf{--ink:#231B20;--mute:#6E6268;--rule:#E5DACD;--bg:#F8F3EC;--band:#F1E9DE;container-type:inline-size;container-name:chgf;display:block;margin:0;padding:0;background:var(--bg);color:var(--ink);border:0;border-top:3px solid var(--acc);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;text-align:left;letter-spacing:normal;text-transform:none}
footer.chgf *{box-sizing:border-box}
footer.chgf a{color:inherit;text-decoration:none;font-weight:inherit;border:0;background:none}
footer.chgf a:hover,footer.chgf a:focus-visible{color:var(--acc);text-decoration:underline;text-underline-offset:3px}
footer.chgf .chgf-in{max-width:1200px;margin:0 auto;padding-left:32px;padding-right:32px}
footer.chgf .chgf-top{display:grid;grid-template-columns:minmax(240px,1.35fr) 3fr;gap:40px;padding-top:44px;padding-bottom:36px}
footer.chgf .chgf-logo{display:inline-flex;line-height:0}
footer.chgf .chgf-logo img{width:auto;max-width:100%;display:block}
footer.chgf .chgf-blurb{margin:14px 0 16px;padding:0;color:var(--mute);font-size:14px;line-height:1.5;max-width:36ch}
footer.chgf .chgf-sub{margin:0 0 16px;max-width:340px}
footer.chgf .chgf-sub-k{margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink)}
footer.chgf .chgf-sub form{display:flex;flex-direction:row;flex-wrap:wrap;align-items:stretch;gap:6px;margin:0;padding:0;background:none;border:0;max-width:none}
footer.chgf .chgf-sub input[type=email]{flex:1 1 160px;min-width:0;min-height:0;max-height:none;height:40px;margin:0;border:1px solid var(--rule);background:#fff;border-radius:8px;padding:0 11px;font:14px/1 inherit;font-family:inherit;color:var(--ink);box-shadow:none}
footer.chgf .chgf-sub button{flex:none;min-height:0;max-width:none;height:40px;margin:0;border:0;border-radius:8px;background:var(--acc);color:#fff;font-family:inherit;font-size:13.5px;font-weight:600;letter-spacing:normal;text-transform:none;padding:0 16px;cursor:pointer;white-space:nowrap;box-shadow:none;width:auto}
footer.chgf .chgf-sub [role=status],footer.chgf .chgf-sub .pp-note{flex:1 1 100%;margin:4px 0 0;font-size:13px;color:var(--mute)}
footer.chgf .chgf-sub [data-pp-state=ok]{color:#0A7A54}
footer.chgf .chgf-sub [data-pp-state=err]{color:#B8384F}
footer.chgf .chgf-soc{display:flex;gap:8px;margin:0;padding:0}
footer.chgf .chgf-soc a{width:34px;height:34px;border-radius:50%;border:1px solid var(--rule);display:inline-flex;align-items:center;justify-content:center;background:#fff}
footer.chgf .chgf-soc svg{width:16px;height:16px;fill:var(--ink);display:block}
footer.chgf .chgf-soc a:hover svg,footer.chgf .chgf-soc a:focus-visible svg{fill:var(--acc)}
footer.chgf .chgf-cols{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:28px;margin:0;padding:0}
footer.chgf .chgf-col h4{margin:2px 0 12px;padding:0;font-family:inherit;font-size:11.5px;line-height:1.3;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--acc);border:0;background:none}
footer.chgf ul{list-style:none;margin:0;padding:0}
footer.chgf li{margin:0;padding:0;list-style:none;background:none}
footer.chgf li::before,footer.chgf li::after{content:none;display:none}
footer.chgf .chgf-col li{margin:0 0 8px;font-size:14.5px;line-height:1.35}
footer.chgf .chgf-group{background:var(--band);border-top:1px solid var(--rule)}
footer.chgf .chgf-group .chgf-in{padding-top:22px;padding-bottom:24px}
footer.chgf .chgf-gk{display:flex;align-items:center;justify-content:center;gap:12px;margin:0 auto 16px;width:max-content;max-width:100%}
footer.chgf .chgf-gk small{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}
footer.chgf .chgf-gk img{height:34px;width:auto;display:block}
footer.chgf .chgf-fam{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));align-items:center;gap:14px 18px}
footer.chgf .chgf-fam li{display:flex;align-items:center;justify-content:center;height:48px;min-width:0}
footer.chgf .chgf-fam li>a{display:flex;align-items:center;justify-content:center;max-width:100%}
footer.chgf .chgf-fam img{width:auto;max-width:100%;object-fit:contain;display:block;opacity:.92;transition:opacity .15s,transform .15s}
footer.chgf .chgf-fam a:hover img,footer.chgf .chgf-fam a:focus-visible img{opacity:1;transform:translateY(-1px)}
footer.chgf .chgf-fam [aria-current] img{opacity:1}
footer.chgf .chgf-legal{background:var(--band)}
footer.chgf .chgf-legal .chgf-in{display:flex;justify-content:space-between;gap:10px 24px;flex-wrap:wrap;padding-top:12px;padding-bottom:18px;border-top:1px solid var(--rule);font-size:13px;color:var(--mute)}
footer.chgf .chgf-legal nav{display:flex;gap:18px;flex-wrap:wrap}
footer.chgf.chgf-compact{background:var(--band)}
footer.chgf.chgf-compact .chgf-legal .chgf-in{border-top:0;padding-top:16px;padding-bottom:16px;align-items:center}
footer.chgf .chgf-cm{display:inline-flex;align-items:center;gap:10px}
footer.chgf .chgf-cm img{height:22px;width:auto;display:block}
footer.chgf .chgf-note{margin:0 0 6px;font-size:12.5px;color:var(--mute);max-width:none}
@container chgf (max-width:1000px){footer.chgf .chgf-fam{grid-template-columns:repeat(4,minmax(0,1fr))}}
@container chgf (max-width:760px){
footer.chgf .chgf-in{padding-left:18px;padding-right:18px}
footer.chgf .chgf-top{grid-template-columns:1fr;gap:28px;padding-top:32px;padding-bottom:24px}
footer.chgf .chgf-cols{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 18px}
footer.chgf .chgf-fam{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px}
footer.chgf .chgf-gk{flex-direction:column;gap:6px}
footer.chgf .chgf-legal .chgf-in{flex-direction:column}
}</style><footer class="chgf" style="--acc:#B0305F"><div class="chgf-in chgf-top"><div class="chgf-brand"><a class="chgf-logo" href="/"><img src="https://coralhart.com/cdn/coral-group/tropesmith.png" alt="TropeSmith" style="height:56px" height="56"></a><p class="chgf-blurb">Market intelligence for romance authors. We read the readers so you can write the book.</p><div class="chgf-soc"><a href="https://www.facebook.com/1127938723743976" target="_blank" rel="noopener" aria-label="TropeSmith on Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg></a><a href="https://www.instagram.com/tropesmith/" target="_blank" rel="noopener" aria-label="TropeSmith on Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.58 0 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58 0-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s0-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zm0 4.86a4.94 4.94 0 1 0 0 9.88 4.94 4.94 0 0 0 0-9.88zm0 8.15a3.21 3.21 0 1 1 0-6.42 3.21 3.21 0 0 1 0 6.42zm5.13-9.5a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3z"/></svg></a></div></div><nav class="chgf-cols" style="--n:4" aria-label="TropeSmith footer"><div class="chgf-col"><h4>Product</h4><ul><li><a href="/how-it-works/">How it works</a></li><li><a href="/sample/">Sample Maps</a></li><li><a href="/pricing/">Pricing</a></li><li><a href="/intake/">Build my Map</a></li></ul></div><div class="chgf-col"><h4>Free tools</h4><ul><li><a href="/lane-score/">Lane Score</a></li><li><a href="/trope-demand/">Trope Demand</a></li><li><a href="/trope-pairs/">Trope Pairs</a></li><li><a href="/trend-radar/">Trend Radar</a></li><li><a href="/free-tools/">All twelve</a></li></ul></div><div class="chgf-col"><h4>Read</h4><ul><li><a href="/romance-tropes/">Romance tropes</a></li><li><a href="/booktok-books/">BookTok books</a></li><li><a href="/market/">Market snapshots</a></li><li><a href="/blog/">Blog</a></li></ul></div><div class="chgf-col"><h4>Company</h4><ul><li><a href="mailto:support@tropesmith.com">Contact</a></li><li><a href="/privacy/">Privacy</a></li><li><a href="/terms/">Terms</a></li></ul></div></nav></div><div class="chgf-group"><div class="chgf-in"><a class="chgf-gk" href="https://coralhart.com/?utm_source=tropesmith&amp;utm_medium=family&amp;utm_campaign=chg_footer" target="_blank" rel="noopener"><small>Part of</small><img src="https://coralhart.com/cdn/coral-group/coral-hart-group-lockup-h.png" alt="The Coral Hart Group" height="34" loading="lazy" decoding="async"></a><ul class="chgf-fam" aria-label="The Coral Hart Group family"><li><a href="https://plotprose.com/?utm_source=tropesmith&amp;utm_medium=family&amp;utm_campaign=chg_footer" title="PlotProse" target="_blank" rel="noopener"><img src="https://coralhart.com/cdn/coral-group/plotprose.png" alt="PlotProse" height="30" style="height:30px" loading="lazy" decoding="async"></a></li><li aria-current="page"><img src="https://coralhart.com/cdn/coral-group/tropesmith.png" alt="TropeSmith" height="42" style="height:42px" loading="lazy" decoding="async"></li><li><a href="https://perfectyearhq.com/?utm_source=tropesmith&amp;utm_medium=family&amp;utm_campaign=chg_footer" title="Perfect Year" target="_blank" rel="noopener"><img src="https://coralhart.com/cdn/coral-group/perfect-year.png" alt="Perfect Year" height="30" style="height:30px" loading="lazy" decoding="async"></a></li><li><a href="https://bookadpack.com/?utm_source=tropesmith&amp;utm_medium=family&amp;utm_campaign=chg_footer" title="BookAdPack" target="_blank" rel="noopener"><img src="https://coralhart.com/cdn/coral-group/book-ad-pack.png" alt="BookAdPack" height="30" style="height:30px" loading="lazy" decoding="async"></a></li><li><a href="https://authorsstarport.com/?utm_source=tropesmith&amp;utm_medium=family&amp;utm_campaign=chg_footer" title="Authors Starport" target="_blank" rel="noopener"><img src="https://coralhart.com/cdn/coral-group/authors-starport.png" alt="Authors Starport" height="34" style="height:34px" loading="lazy" decoding="async"></a></li><li><a href="https://coralwire.ai/?utm_source=tropesmith&amp;utm_medium=family&amp;utm_campaign=chg_footer" title="Coral Wire" target="_blank" rel="noopener"><img src="https://coralhart.com/cdn/coral-group/coral-wire.png" alt="Coral Wire" height="32" style="height:32px" loading="lazy" decoding="async"></a></li><li><a href="https://coralhart.com/author-services?utm_source=tropesmith&amp;utm_medium=family&amp;utm_campaign=chg_footer" title="Author Services" target="_blank" rel="noopener"><img src="https://coralhart.com/cdn/coral-group/author-services.png" alt="Author Services" height="28" style="height:28px" loading="lazy" decoding="async"></a></li><li><a href="https://coralhart.com/author-services/micro-drama-studio?utm_source=tropesmith&amp;utm_medium=family&amp;utm_campaign=chg_footer" title="Micro Drama Studio" target="_blank" rel="noopener"><img src="https://coralhart.com/cdn/coral-group/micro-drama-studio.png" alt="Micro Drama Studio" height="36" style="height:36px" loading="lazy" decoding="async"></a></li></ul></div></div><div class="chgf-legal"><div class="chgf-in"><div><span>&copy; 2026 TropeSmith &middot; a Coral Hart Group company</span></div><nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav></div></div></footer></body></html>`;
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
<li><a href="/finder/">Opportunity Finder</a> &mdash; every romance lane, ranked by one Green-Light verdict.</li>
<li><a href="/free-tools/">Every free Tropesmith tool</a> &mdash; lane scores, trope opportunity check, reader demand, category &amp; rank checker, Hook Lab.</li>
<li><a href="${REPORT}">The 2026 Romance Demand Report</a> &mdash; the full year&rsquo;s read on where romance demand is heading, from the same engine.</li>
<li><a href="/lane-score/">Lane Score</a> &mdash; is the subgenre worth writing at all?</li>
<li><a href="/trope-demand/">Trope Demand Checker</a> &mdash; pick a genre and a trope, see the counted conversation volume.</li>
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

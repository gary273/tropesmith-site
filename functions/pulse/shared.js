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
// TS-POSTHOG-1124: the shared analytics tag (PostHog snippet v3, sha256 27b66d3857f4111c) as ONE plain string constant, printed unchanged right before </head>. Not edited by hand.
const TS_PH_TAG = "<script>window.CH_PH_CONSENT=function(){try{return localStorage.getItem('ts_analytics_consent')==='granted';}catch(e){return false;}};</script>\n<script>/* Coral Hart Group shared PostHog snippet v3 (24 Nov 2026, Studio Quality; Head RULINGS 1707). PAGE VIEWS ONLY.\n * Same public project key and loader as coralhart.com. No autocapture, no session recording, no surveys, no heatmaps, no feature flags, no identify/alias calls, person_profiles identified_only,\n * respects Do Not Track and Global Privacy Control. Every URL property sent has its query string and fragment removed (no token, email or key can leave the page in a URL).\n * It does NOT LOAD AT ALL on sign-in, HQ, study, account, checkout, cart, order, unsubscribe, token and intake pages (by path), nor on any URL whose query carries a token-like key or whose path holds a long token segment.\n * v3: persistence is 'memory' (no cookie, no localStorage, no id kept between pages). A site with a consent manager sets window.CH_PH_CONSENT=function(){return true/false} BEFORE this tag: nothing loads until it returns exactly true (if CH_PH_CONSENT exists but is not a function, that counts as NO consent),\n * events are sent one by one with no batching queue (so nothing queued can outlive a withdrawn consent); it is re-checked every 2 s for up to 3 minutes, and when the site dispatches window.dispatchEvent(new Event('ch-ph-consent-changed')), and events are dropped while it returns anything but true.\n * A site may add path prefixes BEFORE this tag: window.CH_PH_BLOCK=['/members','/portal']. Remove the tag to undo. Release/review notes: README.md. */\n(function(){\n  try{\n    var L=window.location,P=L.pathname||'/',Q=L.search||'',N=navigator;\n    if(N.doNotTrack==='1'||window.doNotTrack==='1'||N.msDoNotTrack==='1'||N.globalPrivacyControl===true)return;\n    if(/PY-UAT-E2E/i.test(N.userAgent||''))return;\n    var BLOCK=/^\\/(?:sign-?in|log-?in|log-?out|sign-?up|register|my-account|account|hq|study|checkout|cart|order|orders|unsub(?:scribe)?|pp-unsub|reset|recover|magic|token|auth|intake|class-choice|thank-you|invite|invites|invitation|share|shared|redeem|claim|verify|confirm|activate|accept|join|password|billing|invoice|receipt|payment|pay|download|view-order|portal-login)(?:[\\/?#.-]|$)/i;\n    if(BLOCK.test(P))return;\n    var X=window.CH_PH_BLOCK;if(X&&X.length){for(var i=0;i<X.length;i++){var x=String(X[i]).toLowerCase();if(x&&(P.toLowerCase()===x||P.toLowerCase().indexOf(x.replace(/\\/$/,'')+'/')===0))return;}}\n    if(/[?&](?:token|tok|t|key|k|e|email|mail|order|session_id|sid|code|auth|nonce|sig|hq|pyhq|ticket|invite|reset)=/i.test(Q))return;\n    if(/\\/[A-Za-z0-9]{24,}(?:[\\/?#]|$)/.test(P)||/\\/(?:pyhq|hq|tok|token|pp|inv)-[A-Za-z0-9]{10,}/i.test(P))return;\n    var PD=P;try{PD=decodeURIComponent(P);}catch(e){}\n    if(/@/.test(PD)||/%40/i.test(P))return;\n    if(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(P))return;\n    var segs=P.split('/');for(var j=0;j<segs.length;j++){var g=segs[j];if(g.length>=10&&/^[A-Za-z0-9]+$/.test(g)&&/[0-9]/.test(g)&&/[A-Za-z]/.test(g)&&((g.replace(/[^0-9]/g,'').length/g.length>=0.2)||(/[A-Z]/.test(g)&&/[a-z]/.test(g))))return;if(g.length>=20&&/^[A-Za-z0-9_-]+$/.test(g)&&/[0-9]/.test(g)&&/[A-Za-z]/.test(g)&&((g.replace(/[^0-9]/g,'').length/g.length>=0.2)||(/[A-Z]/.test(g)&&/[a-z]/.test(g))))return;}\n    var POLL_MS=2000,POLL_MAX_MS=180000;\n    var gated=function(){return Object.prototype.hasOwnProperty.call(window,'CH_PH_CONSENT')||window.CH_PH_CONSENT!==undefined;};\n    var REF0=document.referrer||'$direct',PN0=L.pathname||'/',PATH0=L.protocol+'//'+L.host+PN0,U0={};\n    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){var m=Q.match(new RegExp('[?&]'+k+'=([^&#]*)'));if(m){try{U0[k]=decodeURIComponent(m[1].replace(/\\+/g,' '));}catch(e){U0[k]=m[1];}}});\n    var ok=function(){if(!gated())return true;var c=window.CH_PH_CONSENT;if(typeof c!=='function')return false;try{return c()===true;}catch(e){return false;}};\n    var started=false;\n    var start=function(){if(started||!ok())return;started=true;\n    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(\".\");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement(\"script\")).type=\"text/javascript\",p.crossOrigin=\"anonymous\",p.async=!0,p.src=s.api_host.replace(\".i.posthog.com\",\"-assets.i.posthog.com\")+\"/static/array.js\",(r=t.getElementsByTagName(\"script\")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a=\"posthog\",u.people=u.people||[],u.toString=function(t){var e=\"posthog\";return\"posthog\"!==a&&(e+=\".\"+a),t||(e+=\" (stub)\"),e},u.people.toString=function(){return u.toString(1)+\".people (stub)\"},o=\"init capture register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled getFeatureFlag identify alias people.set set_config\".split(\" \"),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);\n    var strip=function(v){if(typeof v!=='string')return v;var a=v.search(/[?#]/);return a<0?v:v.slice(0,a);};\n    var origin=function(v){if(typeof v!=='string')return v;var m=v.match(/^([a-z][a-z0-9+.-]*:\\/\\/[^\\/?#]+)/i);return m?m[1]:v;};\n    var CLICKIDS=/^(?:\\$initial_|\\$session_entry_)?(?:gclid|gbraid|wbraid|fbclid|msclkid|ttclid|dclid|twclid|li_fat_id|igshid|mc_cid|mc_eid|_hsenc|_hsmi|ph_keyword)$/i;\n    var UTM=/^(?:\\$initial_|\\$session_entry_)?utm_/i;\n    var campaign=function(v){if(v&&typeof v==='object')return '[redacted]';if(typeof v!=='string')return v;var d=v;try{d=decodeURIComponent(v);}catch(e){}if(v.length>100||/@/.test(d)||/[A-Za-z0-9_-]{32,}/.test(d)||/^[0-9a-f-]{20,}$/i.test(d))return '[redacted]';return v;};\n    var EMAIL=/[A-Za-z0-9._%+\\-]+(?:@|%40)[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}/;\n    var clean=function(o,depth){if(!o||typeof o!=='object')return;if((depth||0)>6){for(var q in o)if(Object.prototype.hasOwnProperty.call(o,q))delete o[q];return;}for(var k in o){if(!Object.prototype.hasOwnProperty.call(o,k))continue;var v=o[k];if(CLICKIDS.test(k)||/^\\$?(?:page_)?title$/i.test(k)){delete o[k];continue;}if(UTM.test(k)){o[k]=campaign(v);continue;}if(v&&typeof v==='object'){clean(v,(depth||0)+1);continue;}if(typeof v==='string'&&k.indexOf('referring_domain')<0){if(/referrer/i.test(k))v=origin(v);else if(/url/i.test(k))v=strip(v);var dv=v;try{dv=decodeURIComponent(v);}catch(e){}if(EMAIL.test(v)||EMAIL.test(dv))v='[redacted]';o[k]=v;}}};\n    posthog.init(\"phc_o4czvFKYyo9fUA5SVBaux5MF2uGftiigq7kpos3XJdhZ\",{\n      api_host:\"https://us.i.posthog.com\",\n      person_profiles:\"identified_only\",\n      persistence:\"memory\",\n      request_batching:false,\n      autocapture:false,\n      capture_pageview:false,\n      capture_pageleave:true,\n      disable_session_recording:true,\n      disable_surveys:true,\n      capture_dead_clicks:false,\n      capture_heatmaps:false,\n      disable_web_experiments:true,\n      advanced_disable_decide:true,\n      advanced_disable_flags:true,\n      respect_dnt:true,\n      before_send:function(cr){if(!cr||!ok())return null;clean(cr,0);return cr;},\n      loaded:function(ph){ph.identify=function(){};ph.alias=function(){};ph.setPersonProperties=function(){};var p={$current_url:PATH0,$pathname:PN0,$referrer:REF0};for(var k in U0)p[k]=U0[k];ph.capture('$pageview',p);}\n    });\n  \n    };\n    start();\n    if(gated()){window.addEventListener('ch-ph-consent-changed',start);if(!started){var t0=Date.now(),iv=setInterval(function(){if(started||Date.now()-t0>=POLL_MAX_MS){clearInterval(iv);return;}start();if(started)clearInterval(iv);},POLL_MS);}}\n  }catch(e){}\n})();</script>\n";

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
.wrap{max-width:640px;margin:0 auto;padding:60px 22px}h1{font-family:Fraunces,Georgia,serif;font-size:30px;margin:0 0 12px}a{color:#6D28D9}</style>${TS_PH_TAG}</head><body>
<div class="wrap"><h1>No Trope Pulse issue for that lane yet</h1>
<p>The Trope Pulse currently runs for ${lanes.map((l) => '<a href="/pulse/' + esc(l) + '">' + esc(l.replace(/-/g, ' ')) + '</a>').join(' and ')}. Nothing has been invented to fill this page.</p>
<p><a href="/pulse/">The Trope Pulse &rarr;</a> &middot; <a href="/free-tools/">Every Tropesmith tool &rarr;</a> &middot; <a href="/lane-score/">Lane scores &rarr;</a></p>
</div></body></html>`,
		{ status: 404, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=600' } }
	);
}

/* TS-1095: these issues were sent in July-August 2026 under metric definitions that were retired on 7 October 2026. They stay (history is not deleted) but say so, and the
   one play total they quote is cut: BookTok play totals are not published. */
const ARCHIVE_NOTICE =
	'<div style="max-width:600px;margin:0 auto;padding:12px 16px;background:#FFF3E3;border:1px solid #E5DACD;color:#3a3450;font:400 14px/1.6 Inter,system-ui,sans-serif">' +
	'<b>Archived issue.</b> Written before TropeSmith&rsquo;s 7 October 2026 recount, using metric definitions that have since been retired. Its counts and labels are shown as sent and ' +
	'are not comparable with current demand-signal counts; the trend and supply labels in it are classifier output over dated windows, not evidence of growth or of anything missing from the shelf; recent windows read low because reviews are read some time after they are posted. ' +
	'Current counts: <a href="/romance-tropes/" style="color:#6D28D9">romance tropes, ranked by demand signals</a>.</div>';
const ARCHIVE_HEAD = '<meta name="robots" content="noindex,follow">';
const RECOUNT = '2026-10-07';
const MONTHS = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
/* the issue's own date: the dated URL segment, else the "July 27, 2026" line the archive page prints; unknown = treat as an old issue only if it names a date before the recount */
function issueIso(html, date) {
	if (date) return date;
	const m = String(html).match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(20\d\d)\b/);
	return m ? m[3] + '-' + MONTHS[m[1].toLowerCase()] + '-' + ('0' + m[2]).slice(-2) : null;
}

const PLAY_TOTAL = /(?:\s*\u00b7\s*)?\b(?:a source video|this niche) pulled [\d,.]+[KMB]? views[^<.]*\.?/gi;

/* The archive fn already returns a complete, styled page. We only add what makes it OURS
   and indexable: a canonical on tropesmith.com, Article schema, and a way back in. */
function enrich(html, canonical, feedName, date) {
	const archived = (function () { const i = issueIso(html, date); return !i || i < RECOUNT; })();
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
		`<meta property="og:site_name" content="Tropesmith">` + (archived ? ARCHIVE_HEAD : '') +
		'<script type="application/ld+json">' + JSON.stringify(ld) + '</script>';
	const foot = `<div style="max-width:640px;margin:28px auto 60px;padding:16px 20px;background:#FFFEFB;border:1px solid rgba(16,18,47,.1);border-radius:16px;font:400 14.5px/1.7 Inter,system-ui,sans-serif;color:#3a3450">
<b>Keep going.</b><br>
<a href="/pulse/" style="color:#6D28D9">Every Trope Pulse issue</a> &middot;
<a href="/lane-score/" style="color:#6D28D9">Is your subgenre worth writing?</a> &middot;
<a href="/free-tools/" style="color:#6D28D9">Every Tropesmith tool</a> &middot;
<a href="${REPORT}" style="color:#6D28D9">The 2026 Romance Demand Report</a></div><script src="/chg-deals-promo.js" defer data-site="tropesmith" data-popup="on" data-nav="header.desk-header nav.desk-nav, .topnav nav" data-push="#desk-header" data-no-popup="(checkout|[/]cart|[/]basket|[/]pay(ment)?s?(?![a-z0-9_])|order|login|log-in|sign-?in|account|[/]hq(?![a-z0-9_])|[/]app(?![a-z0-9_])|classroom|[/]tools?(?![a-z0-9_])|dashboard|[/]studio(?![a-z0-9_])|^[/](pricing|find-your-lane|intake)(?![a-z0-9_-]))"></script>`;

	let out = archived ? html.replace(PLAY_TOTAL, '') : html;
	out = out.replace(/<a\b[^>]*href="__[A-Z_]+__"[^>]*>([\s\S]*?)<\/a>/g, '$1');
	if (archived) out = /<body[^>]*>/i.test(out) ? out.replace(/(<body[^>]*>)/i, '$1' + ARCHIVE_NOTICE) : ARCHIVE_NOTICE + out;
	out = out.includes('</head>') ? out.replace('</head>', head + '</head>') : head + out;
	if (out.includes('</head>')) out = out.replace('</head>', () => TS_PH_TAG + '</head>');
	out = out.includes('</body>') ? out.replace('</body>', foot + '</body>') : out + foot;
	return out;
}


/* IN-0860: is this dated issue still the CURRENT one?
   /pulse/<lane> serves the latest issue, so while a dated copy is byte-identical to it the two
   URLs are the same page and only one may claim to be canonical. Returns the latest issue's
   HTML, or null if it cannot be established — in which case the caller keeps the old
   self-canonical behaviour rather than guessing. Shares the cache key that real undated
   requests populate, so this is normally a cache hit rather than a second origin call. */
async function latestHtml(slug, subgenre, cache) {
	const ck = new Request(SITE + '/__cache/pulse-' + slug + '-latest', { method: 'GET' });
	try {
		const hit = await cache.match(ck);
		if (hit) return await hit.text();
	} catch (_e) {}
	const q = new URLSearchParams();
	if (subgenre) q.set('subgenre', subgenre);
	try {
		const r = await fetch(ARCHIVE + (q.toString() ? '?' + q.toString() : ''), {
			signal: AbortSignal.timeout(8000),
			cf: { cacheTtl: 900, cacheEverything: true }
		});
		if (!r.ok) return null;
		const t = await r.text();
		try {
			await cache.put(ck, new Response(t, { headers: { 'content-type': 'text/html', 'cache-control': 'public, max-age=900' } }));
		} catch (_e) {}
		return t;
	} catch (_e) {
		return null;
	}
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

	/* IN-0860: a dated copy that is byte-identical to the live page is the SAME page, and two
	   URLs cannot both be the original. Point it at the undated page while that is true; once the
	   next issue publishes it stops matching and self-canonicalises again on its own. Superseded
	   archives are untouched — the control page /pulse/romance/2026-08-10 indexes cleanly today
	   precisely because it is self-canonical, so this must not become a blanket rule. */
	let canonical = SITE + '/pulse/' + slug + (date ? '/' + date : '');
	if (date) {
		const latest = await latestHtml(slug, subgenre, cache);
		if (latest && latest === html) canonical = SITE + '/pulse/' + slug;
	}
	return new Response(enrich(html, canonical, subgenre, date), {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
			'x-pulse-origin': 'tropesmith-pages-function'
		}
	});
}

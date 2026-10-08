/**
 * TS-0591 — /trending/, consolidated onto the TS-0587 baked pattern.
 *
 * WAS: a static page whose entire content came from a POST, per visitor, to the
 * trope-trend-tool Supabase edge function (get_trending_tropes + plotmap_opportunity_window
 * against trope_trend_history) — JS-only, so a crawler saw an empty form and nothing else
 * (the authorsstarport starvation pattern, TS-0591 finding).
 *
 * NOW: every subgenre's read (the tropes near the top of the lane's ranking by likes and upvotes, plus the five tropes
 * with the most demand signals in the latest month of the lane trend table) is baked nightly by /root/ts0591/export_trending_data.py, calling
 * the SAME two SQL functions the edge function called, into ./data.js. This file only
 * renders what is already in memory. Zero database reads per visitor.
 *
 * The email-capture lead magnet (Trope Pulse signup) is a WRITE, not a read, and cannot be
 * baked — it still posts client-side, but now it never blocks or drives the visible result:
 * the opportunity read is already server-rendered before any JavaScript runs. See the
 * TS-0591 handover for the staged, undeployed capture-only edge function that would let this
 * drop the trend-computation from that POST entirely (a Supabase function deploy is a live
 * flip and is out of scope for this WO — reserved surface, stopped at staged).
 */
/* TS-1095: every label below is literally what the SQL does (see patchers/patch_f10_trending.py). plotmap_opportunity_window ranks a lane's tropes each month by the likes and
   upvotes attached to their demand signals; it has no measure of books or supply, and its rising/cooling lists and the share-vs-last-month arrow compare recent windows that
   read low (CONTRACT.md RECENCY CORRECTION), so they are not rendered. data.js is generated: never edit it. */
import { AS_OF, SUBGENRES, DATA } from './data.js';
import { SITE, ORG, esc, num, head, foot, breadcrumb, app, jsonResponse, wantsJson } from '../_gen/chrome.js';

const PATH = '/trending';
const IDS = Object.keys(SUBGENRES);

function slugOk(s) {
	return /^[a-z0-9._-]{2,80}$/.test(s);
}
function laneLabel(id) {
	return SUBGENRES[id] || id;
}

// 'Dark Romance' + ' romance' read as 'Dark Romance romance' on 5 of 18 lane pages; only append the word when the label lacks it.
const ROMANCE_WORD = /\b(romance|romances|romantasy|rom-?com|romantic)\b/i;
export function lanePhrase(label) {
	const s = String(label == null ? '' : label).trim();
	if (!s) return 'romance';
	return ROMANCE_WORD.test(s) ? s : s + ' romance';
}

// The nightly bake title-cases slugs, so 'ddlg' arrives as 'Ddlg'. Restore the acronyms readers actually write.
const ACRONYMS = new Set(['DDLG', 'MFM', 'MMF', 'FFM', 'MMC', 'FMC', 'MM', 'FF', 'BDSM', 'HEA', 'HFN', 'CEO', 'MC', 'CNC', 'LGBTQ', 'YA', 'NA', 'PNR', 'RH']);
export function tropeLabel(name) {
	// A token counts only when nothing letter-like or an apostrophe touches it ("Na'vi" stays "Na'vi").
	return String(name == null ? '' : name).replace(/(?<![A-Za-z'\u2019])([A-Za-z]{2,5})(?![A-Za-z'\u2019])/g, (w) => (ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : w));
}

// A lane's own name is a genre label, not a trope; keep it out of that lane's trope lists.
export function isLaneSelfLabel(name, laneLabelText) {
	const a = String(name == null ? '' : name).trim().toLowerCase();
	const b = String(laneLabelText == null ? '' : laneLabelText).trim().toLowerCase();
	return !!a && a === b;
}

const SOURCES = 'Goodreads reviews, BookTok comments and captions, and Reddit posts';
const LAG_NOTE = 'The table’s latest month is the last month with rows and is usually only partly read in (reviews and posts are read some time after they are written), so its counts read low next to earlier months; compare tropes with each other, not with earlier months.';
const GLOSS_UNIT = "A demand signal is one specific thing a reader asked for or praised in a review, comment or post, picked out by Tropesmith's classifier. One review can give several.";
const METHOD = '/how-to-read-trope-demand-data/';

function toolApp(url) {
	return app({
		url,
		name: 'Tropesmith Trope Opportunity Check',
		description:
			'Free tool: for a romance subgenre, the tropes with the most demand signals in the latest month of the lane trend table, and the tropes near the top of the lane’s ranking by likes and upvotes. Counts and ranks are from the trend table; reviews are read some time after they are posted, so recent months read low.',
		featureList: [
			'The tropes with the most demand signals in the lane trend table’s latest month',
			'Tropes near the top of the lane’s ranking by likes and upvotes, with little change from earlier months',
			'Counts and ranks from the lane trend table, rebuilt nightly'
		],
		asOf: AS_OF,
		dataset: SITE + PATH + '/#dataset'
	});
}

function datasetFor(id) {
	const d = id ? DATA[id] : null;
	return {
		'@type': 'Dataset',
		name: 'Romance trope demand signals and ranking by subgenre' + (d ? ' — ' + laneLabel(id) : ''),
		description: 'For each romance subgenre: the tropes with the most demand signals in the latest month of the lane trend table, and the tropes near the top of the lane’s ranking by likes and upvotes. Demand signals come from Goodreads reviews, BookTok comments and captions, and Reddit posts.',
		url: SITE + PATH + (id ? '/' + id : '/'),
		isAccessibleForFree: true,
		license: SITE + '/terms/',
		creator: ORG,
		publisher: ORG,
		measurementTechnique: 'Demand signals that name the trope as a main trope, counted per lane and calendar month in the Tropesmith lane trend table; ranks are percentile ranks within each month by the likes and upvotes attached to the signals.',
		dateModified: AS_OF
	};
}

function opBlock(cls, emoji, label, arr, laneLabelText) {
	const items = (arr || []).filter((n) => !isLaneSelfLabel(n, laneLabelText));
	if (!items.length) return '';
	return `<div class="ob ${cls}"><div class="lab">${emoji} ${esc(label)}</div>${items.map((n) => `<span class="chip">${esc(tropeLabel(n))}</span>`).join('')}</div>`;
}

function trendList(tropes, laneLabelText) {
	const items = (tropes || []).filter((t) => t && !isLaneSelfLabel(t.name, laneLabelText));
	if (!items.length) return '<p class="note">No tropes have three or more demand signals in this lane’s latest month.</p>';
	return `<ul class="trlist">${items
		.map((t) => `<li>${esc(tropeLabel(t.name))} <span style="color:#a39395">(${num(t.mentions)} demand signals, ${t.share_pct}% of the lane’s main-trope tags)</span></li>`)
		.join('')}</ul>`;
}

const CARD_CSS = `<style>.opwrap{background:#FFFEFB;border:1px solid rgba(16,18,47,.1);border-radius:18px;padding:22px 24px;box-shadow:0 12px 30px -18px rgba(20,22,54,.4);margin:20px 0}
.ob{border-radius:13px;padding:14px 16px;margin-bottom:10px}
.ob .lab{font-size:11px;text-transform:uppercase;letter-spacing:.07em;font-weight:800;margin-bottom:8px}
.ob.w{background:#E9F9EE;border:1px solid #BEE9CC}.ob.w .lab{color:#1E7A43}
.ob.c{background:#FFF3D8;border:1px solid #F1DCA4}.ob.c .lab{color:#B4741A}
.ob.k{background:#F1EEFB;border:1px solid #DDD5F5}.ob.k .lab{color:#6D28D9}
.chip{display:inline-block;font-family:Fraunces,Georgia,serif;font-size:14.5px;font-weight:600;background:#fff;border:1px solid rgba(16,18,47,.1);border-radius:999px;padding:5px 12px;margin:0 6px 6px 0}
.trlist{margin:6px 0 0;padding:0;list-style:none}
.trlist li{font-size:14.5px;color:#3a3450;padding:6px 0;border-bottom:1px solid rgba(16,18,47,.06)}
.trlist li b{color:#C2334A}
.lanepick{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
.lanepick a{font-size:13.5px;font-weight:600;background:#EDE9FE;color:#5B21B6;padding:6px 13px;border-radius:999px;text-decoration:none}
.lanepick a.on{background:#5B21B6;color:#fff}
.leadform{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:18px 0 6px}
.leadform input{flex:1 1 240px;padding:12px 14px;border:1px solid rgba(16,18,47,.16);border-radius:11px;font-size:15px}
.leadform button{background:linear-gradient(135deg,#8B5CF6,#FF6B7A);color:#fff;font-weight:700;font-size:15px;border:none;border-radius:999px;padding:13px 22px;cursor:pointer}
.leadnote{font-size:12px;color:#a39395;margin-top:6px}
.leadok{display:none;font-size:14px;color:#1E7A43;margin-top:8px;font-weight:600}</style>`;

function leadForm(subgenreId) {
	return `<div class="leadform-wrap">
<form class="leadform" id="lp-f" data-subgenre="${esc(subgenreId || '')}">
<input type="email" id="lp-em" placeholder="you@email.com" required autocomplete="email">
<button type="submit">Send me the weekly Trope Pulse &rarr;</button>
</form>
<div class="leadnote">Free. One email a week: the Trope Pulse. Unsubscribe anytime. <span id="lp-err" style="color:#C2334A"></span></div>
<div class="leadok" id="lp-ok">&#10003; You're in — check your inbox.</div>
</div>
<script>(function(){
var f=document.getElementById('lp-f');if(!f)return;
f.addEventListener('submit',function(e){
e.preventDefault();
var em=document.getElementById('lp-em').value.trim();
var err=document.getElementById('lp-err');err.textContent='';
if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(em)){err.textContent='Enter a valid email.';return;}
var btn=f.querySelector('button');btn.disabled=true;btn.textContent='Sending…';
/* WRITE ONLY - lead capture, not a data read. The opportunity content above already
   rendered server-side before this script ran, so this call never gates or blocks it. */
fetch('https://vsbytdonbuwrrlmwteaw.supabase.co/functions/v1/trope-trend-tool',{method:'POST',headers:{'content-type':'application/json','apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYnl0ZG9uYnV3cnJsbXd0ZWF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODg5MDksImV4cCI6MjA5MjM2NDkwOX0.EGgGUQfCcQ3tul-LKuAQR3-hALTZOOo3cEeq5Ha2aM0','authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYnl0ZG9uYnV3cnJsbXd0ZWF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODg5MDksImV4cCI6MjA5MjM2NDkwOX0.EGgGUQfCcQ3tul-LKuAQR3-hALTZOOo3cEeq5Ha2aM0'},body:JSON.stringify({email:em,subgenre_id:f.dataset.subgenre||'romance.contemporary',source:'trending_bake'})})
.then(function(){document.getElementById('lp-ok').style.display='block';f.style.display='none';})
.catch(function(){btn.disabled=false;btn.textContent='Send me the weekly Trope Pulse →';err.textContent='Network error — please try again.';});
});
})();</script>`;
}

function lanePicker(current) {
	return `<div class="lanepick">${IDS.map((id) => `<a class="${id === current ? 'on' : ''}" href="${PATH}/${esc(id)}">${esc(laneLabel(id))}</a>`).join('')}</div>`;
}

function opportunityCard(id) {
	const d = DATA[id];
	const near = opBlock('c', '&#9670;', 'Near the top of the lane’s ranking by likes and upvotes, with little change from earlier months', d.opportunity.crowded, laneLabel(id));
	const how = near ? `<p class="note">How the list above is worked out: each month, every trope in a lane is ranked by the likes and upvotes attached to its demand signals (a post’s likes count once for each signal drawn from it), taken from Goodreads reviews, BookTok comments and captions, and Reddit posts. A trope is listed when its average position in the later part of its monthly history is in the lane’s top fifth and differs from its average in the earlier part by less than 12 percentile points. Tropes need at least 12 demand signals in the lane. The ranking is by reader likes and upvotes, not by books, so it says nothing about how many books already cover a trope; check comp titles before you commit.</p>` : '';
	return `<div class="opwrap">
${near}
<h2 style="margin-top:22px">The tropes with the most demand signals in the latest month of the trend table for ${esc(laneLabel(id))}</h2>
${trendList(d.tropes, laneLabel(id))}
${how}
<p class="note">Counts are demand signals from ${SOURCES} (Amazon reviews and Amazon Q&amp;A are not in this read) that name the trope as a main trope. ${esc(GLOSS_UNIT)} <a href="${METHOD}">How we count</a>.</p>
</div>`;
}

function pageBody(id) {
	const d = DATA[id];
	const ln = laneLabel(id);
	return `<div class="wrap">
<div class="eyebrow">Free tool &middot; Rebuilt nightly from the lane trend table &middot; No card needed</div>
<h1>Which tropes should your next ${esc(lanePhrase(ln))} lean into?</h1>
<p class="lede">The latest month of the ${esc(ln)} trend table holds ${num(d.month_total_mentions)} main-trope tags on demand signals. Baked from the lane trend table on ${esc(AS_OF)}. ${LAG_NOTE}</p>
${lanePicker(id)}
${opportunityCard(id)}
${leadForm(id)}
<div class="cta-row"><a class="btn" href="/intake/">Build my ${esc(ln)} Map &mdash; $15 &rarr;</a> &nbsp; <a href="/sample/">See a real sample &rarr;</a></div>
<h2>What this check does not tell you</h2>
<p>A high count says a trope is talked about at scale. It does not say how many books already cover it, or whether the angle you would write is one readers want. Check the comp titles on Amazon and in a <a href="/sample/">sample Map</a> before you commit. This is a thin slice of what a full <a href="/how-it-works/">Tropesmith Map</a> does for your specific book.</p>
</div>`;
}

function indexBody() {
	return `<div class="wrap">
<div class="eyebrow">Free tool &middot; Rebuilt nightly from the lane trend table &middot; No card needed</div>
<h1>Which tropes should your next romance actually lean into?</h1>
<p class="lede">Pick your subgenre and get a free read: the tropes with the most demand signals in the latest month of the lane trend table, and the tropes near the top of the lane's ranking by likes and upvotes. Each lane page says which date its counts and ranks are from.</p>
${lanePicker('')}
<p class="note">Pick a subgenre above to see its read.</p>
${leadForm('')}
</div>`;
}

function stageHead(title, desc, canonical, ld, isProd) {
	let h = head(title, desc, canonical, ld).replace('<style>', CARD_CSS + '<style>');
	if (!isProd) h = h.replace('<title>', '<meta name="robots" content="noindex,nofollow">\n<title>');
	return h;
}

export async function handle(context) {
	const { request } = context;
	const url = new URL(request.url);
	const isProd = url.hostname === 'tropesmith.com' || url.hostname === 'www.tropesmith.com';
	const noindex = !isProd;
	const json = wantsJson(request, url);

	const segs = decodeURIComponent(url.pathname)
		.replace(/^\/+|\/+$/g, '')
		.split('/')
		.slice(1)
		.filter(Boolean)
		.map((s) => s.trim().toLowerCase());

	let id = segs[0] || '';
	if (id && !slugOk(id)) {
		return notFound(url, json, 'That is not a subgenre we recognise. Subgenres are lower-case identifiers such as "romance.dark".');
	}
	if (id && !DATA[id]) {
		return notFound(url, json, 'We do not publish a read for that subgenre yet.');
	}

	if (!id) {
		const canonical = SITE + PATH + '/';
		if (json) return jsonResponse({ ok: true, as_of: AS_OF, subgenres: IDS.map((i) => ({ id: i, label: laneLabel(i) })) });
		const ld = [Object.assign({ '@context': 'https://schema.org' }, datasetFor(null)), toolApp(canonical), breadcrumb('Trope Opportunity Check', canonical)];
		return htmlOut(stageHead('Free Romance Trope Opportunity Check | Tropesmith', "Free for your subgenre: tropes with the most demand signals in the trend table's latest month, and those near the top of its likes-and-upvotes ranking.", canonical, ld, isProd) + indexBody() + foot(), { noindex });
	}

	const canonical = SITE + PATH + '/' + id;
	const d = DATA[id];
	if (json) {
		return jsonResponse({ ok: true, as_of: AS_OF, subgenre_id: id, subgenre_label: laneLabel(id), newest_captured_row: d.data_as_of, month_total_mentions: d.month_total_mentions, tropes: d.tropes.map((t) => ({ name: t.name, mentions: t.mentions, share_pct: t.share_pct })), opportunity: { near_top_of_ranking_by_likes_and_upvotes: d.opportunity.crowded }, note: LAG_NOTE });
	}
	const ln = laneLabel(id);
	const ld = [Object.assign({ '@context': 'https://schema.org' }, datasetFor(id)), toolApp(canonical), breadcrumb(ln, canonical, 'Trope Opportunity Check', SITE + PATH + '/')];
	const desc = `${ln} tropes by demand signals in the trend table's latest month, plus those near the top of its likes-and-upvotes ranking. Baked ${AS_OF}.`;
	return htmlOut(stageHead(`${ln} trope opportunity check | Tropesmith`, desc, canonical, ld, isProd) + pageBody(id) + foot(), { noindex });
}

function notFound(url, json, why) {
	if (json) return jsonResponse({ ok: false, error: why }, 404);
	const canonical = SITE + PATH + '/';
	return htmlOut(
		head('Not one we publish | Tropesmith', why, canonical, [])
			.replace('<title>', '<meta name="robots" content="noindex,nofollow">\n<title>')
			.replace('<style>', CARD_CSS + '<style>') +
			`<div class="wrap"><h1>Not one we publish</h1><p class="lede">${esc(why)}</p>${lanePicker('')}<p><a href="${PATH}/">Start again from every subgenre we do cover &rarr;</a></p></div>` +
			foot(),
		{ status: 404, noindex: true }
	);
}

function htmlOut(body, opts) {
	opts = opts || {};
	const hdrs = {
		'content-type': 'text/html; charset=utf-8',
		'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
		'x-tropesmith-origin': 'pages-function'
	};
	if (opts.noindex) hdrs['x-robots-tag'] = 'noindex, nofollow';
	return new Response(body, { status: opts.status || 200, headers: hdrs });
}

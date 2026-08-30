/**
 * TS-0591 — /trending/, consolidated onto the TS-0587 baked pattern.
 *
 * WAS: a static page whose entire content came from a POST, per visitor, to the
 * trope-trend-tool Supabase edge function (get_trending_tropes + plotmap_opportunity_window
 * against trope_trend_history) — JS-only, so a crawler saw an empty form and nothing else
 * (the authorsstarport starvation pattern, TS-0591 finding).
 *
 * NOW: every subgenre's opportunity read (write-into / hot-but-crowded / cooling, plus the
 * top-5 trending tropes) is baked nightly by /root/ts0591/export_trending_data.py, calling
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

function toolApp(url) {
	return app({
		url,
		name: 'Tropesmith Trope Opportunity Check',
		description:
			'Free tool: for a romance subgenre, which tropes to write into (rising, not yet crowded), which are hot but crowded, and which are cooling off — plus the top-5 trending tropes this month.',
		featureList: [
			'Write-into trope list for the exact subgenre',
			'Hot-but-crowded warnings',
			'Cooling-off list',
			'Top-5 trending tropes this month',
			'Baked nightly from the Tropesmith demand engine'
		],
		asOf: AS_OF,
		dataset: SITE + PATH + '/#dataset'
	});
}

function datasetFor(id) {
	const d = id ? DATA[id] : null;
	return {
		'@type': 'Dataset',
		name: 'Romance trope momentum by subgenre' + (d ? ' — ' + laneLabel(id) : ''),
		description: 'Which tropes are rising, crowded or cooling in each romance subgenre, counted from reader reviews, shelf signals, parsed reader demand and BookTok video metadata.',
		url: SITE + PATH + (id ? '/' + id : '/'),
		isAccessibleForFree: true,
		license: SITE + '/terms/',
		creator: ORG,
		publisher: ORG,
		temporalCoverage: '2026-01-01/..',
		measurementTechnique: 'Counted from the Tropesmith corpus and re-aggregated per subgenre lane; no estimates.',
		dateModified: d ? d.data_as_of : AS_OF
	};
}

function opBlock(cls, emoji, label, arr) {
	if (!arr || !arr.length) return '';
	return `<div class="ob ${cls}"><div class="lab">${emoji} ${esc(label)}</div>${arr.map((n) => `<span class="chip">${esc(n)}</span>`).join('')}</div>`;
}

function trendList(tropes) {
	if (!tropes || !tropes.length) return '<p class="note">Not enough dated signal to call a top-5 for this lane yet.</p>';
	return `<ul class="trlist">${tropes
		.map((t) => `<li>${t.rising ? '<b>&#9650; </b>' : ''}${esc(t.name)} <span style="color:#a39395">(${num(t.mentions)} mentions, ${t.share_pct}% share)</span></li>`)
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
<div class="leadnote">Free. One email a week with the rising tropes across every lane. Unsubscribe anytime. <span id="lp-err" style="color:#C2334A"></span></div>
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
	return `<div class="opwrap">
${opBlock('w', '&#9989;', 'Write into these — rising, not yet crowded', d.opportunity.rising)}
${opBlock('c', '&#9888;&#65039;', 'Hot but crowded — enter only with a twist', d.opportunity.crowded)}
${opBlock('k', '&#128309;', 'Cooling off — think twice', d.opportunity.cooling)}
<h2 style="margin-top:22px">Top 5 trending in ${esc(laneLabel(id))} this month</h2>
${trendList(d.tropes)}
</div>`;
}

function pageBody(id) {
	const d = DATA[id];
	const ln = laneLabel(id);
	return `<div class="wrap">
<div class="eyebrow">Free tool &middot; Baked nightly from live engine data &middot; No card needed</div>
<h1>Which tropes should your next ${esc(ln)} romance lean into?</h1>
<p class="lede">Reader-demand mentions counted this month across ${num(d.month_total_mentions)} total mentions in ${esc(ln)}. As of ${esc(d.data_as_of)}.</p>
${lanePicker(id)}
${opportunityCard(id)}
${leadForm(id)}
<div class="cta-row"><a class="btn" href="/intake/">Build my ${esc(ln)} Map &mdash; $15 &rarr;</a> &nbsp; <a href="/sample/">See a real sample &rarr;</a></div>
<h2>Why &ldquo;rising&rdquo; beats &ldquo;popular&rdquo;</h2>
<p>Most &ldquo;trending tropes&rdquo; lists tell you what's popular &mdash; which is often the same as telling you what's already saturated. This checker separates the tropes gaining momentum in ${esc(ln)} (where there's still room) from the ones that are hot-but-crowded and the ones quietly cooling off. This is a thin slice of what a full <a href="/how-it-works/">Tropesmith Map</a> does for your specific book.</p>
</div>`;
}

function indexBody() {
	return `<div class="wrap">
<div class="eyebrow">Free tool &middot; Baked nightly from live engine data &middot; No card needed</div>
<h1>Which tropes should your next romance actually lean into?</h1>
<p class="lede">Pick your subgenre and get a free read on where the opportunity is right now &mdash; not just what's popular. For your exact lane you'll see write-into tropes, hot-but-crowded warnings, cooling-off calls and the top 5 trending this month.</p>
${lanePicker('')}
<p class="note">Pick a subgenre above to see its opportunity read.</p>
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
		return notFound(url, json, 'We do not publish a trending read for that subgenre yet.');
	}

	if (!id) {
		const canonical = SITE + PATH + '/';
		if (json) return jsonResponse({ ok: true, as_of: AS_OF, subgenres: IDS.map((i) => ({ id: i, label: laneLabel(i) })) });
		const ld = [Object.assign({ '@context': 'https://schema.org' }, datasetFor(null)), toolApp(canonical), breadcrumb('Trope Opportunity Check', canonical)];
		return htmlOut(stageHead('Free Romance Trope Opportunity Check | Tropesmith', "Free for your subgenre: the tropes to write INTO right now, the ones too crowded to bother, and the ones cooling off — plus this month's top 5 trending.", canonical, ld, isProd) + indexBody() + foot(), { noindex });
	}

	const canonical = SITE + PATH + '/' + id;
	const d = DATA[id];
	if (json) {
		return jsonResponse({ ok: true, as_of: AS_OF, subgenre_id: id, subgenre_label: laneLabel(id), data_as_of: d.data_as_of, month_total_mentions: d.month_total_mentions, tropes: d.tropes, opportunity: d.opportunity });
	}
	const ln = laneLabel(id);
	const ld = [Object.assign({ '@context': 'https://schema.org' }, datasetFor(id)), toolApp(canonical), breadcrumb(ln, canonical, 'Trope Opportunity Check', SITE + PATH + '/')];
	const desc = `Free for ${ln}: the tropes to write into right now, the ones too crowded to bother, and the ones cooling off — plus this month's top 5 trending. Counted, not estimated, as of ${d.data_as_of}.`;
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

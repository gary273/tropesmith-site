/**
 * TS-0587 — THE TROPE DEMAND CHECKER.
 *
 * Pick a genre lane and a trope; get the measured reader demand for that trope in that
 * lane out of the Tropesmith corpus. Free. The link-bait play of IN-0913 campaign 1:
 * Reedsy's ONE character-name generator holds 3,322 referring domains, more than the whole
 * Coral Hart estate. The difference here is that a name generator runs over a word list and
 * this runs over counted rows that change as the market changes.
 *
 * THREE THINGS ABOUT THIS FILE ARE LOAD-BEARING. Do not "simplify" any of them.
 *
 * 1. NOTHING IS FETCHED AT REQUEST TIME. Every figure comes from ./data.js, baked nightly
 *    by /root/ts0587/export_demand_data.py. The shared academy_v2 database is saturated
 *    (TS-0583 §2.1: a single group-by on app_demand_signals cannot finish in 90s; TS-0584
 *    is a live P0 on paid delivery caused by the same wall). A free tool aimed at an
 *    18,000/mo keyword must not put a query on that database per pageview. The one
 *    exception is the depth gate below, which calls the AUTH service — never the corpus —
 *    and only for a visitor who already carries a session cookie.
 *
 * 2. THE PAGE IS SERVER-RENDERED AND WORKS WITH JAVASCRIPT OFF. authorsstarport starved
 *    because its content was JS-only. Every number a crawler needs is in the HTML.
 *
 * 3. THE DEPTH GATE CANNOT BE OPENED ON PRODUCTION BY A FLAG. free-requires-signup means
 *    the full readout is behind a free account; the headline is not. `isProd` is computed
 *    from the request hostname, and the staging unlock is `!isProd && ...`, so no constant
 *    in this file — set wrongly or edited later — can open the gate on tropesmith.com.
 *
 * HONESTY RULES THIS FILE ENFORCES
 *   - Direction is computed from SHARE, never a raw weekly move (the ticker-share ruling
 *     exists because a raw-move ticker once published a wall of clamped 99s). Both shares
 *     are printed next to the verdict so a reader can redo the division.
 *   - A direction is NOT stated below FLOORS.dir_mentions. "We can't call it" is printed
 *     instead. A null state is not a pass.
 *   - Demand (dated weekly mentions) and co-asks (all reader asks, dated or not) are
 *     DIFFERENT RAILS. They are labelled differently and never summed.
 *   - Supply is registry-wide and says so: app_book_tropes.primary_subgenre is a different
 *     vocabulary from subgenre_id and the two do not join.
 *   - A thin or sparse lane says it is thin. Scarcity is the finding, not a hole to fill.
 */
import { AS_OF, WIN, WEEKS, CORPUS, FLOORS, TROPES, LANES, D, S, SW, SUPPLY, ADJ, T, LS } from './data.js';
import { SITE, ORG, esc, num, head, foot, breadcrumb, app, pv, tieBack, jsonResponse, wantsJson } from '../_gen/chrome.js';

/* STAGING: TS-0587 ships on a preview branch, unlinked and noindex, until Gary says go.
   Flip to false in the same commit that merges to main. Note that flipping it is NOT what
   protects production — `isProd` below is. */
const STAGE = true;
const PATH = '/trope-demand';
/* The window START we print is the first week the rail actually holds. WIN.from is the
   band boundary the arithmetic uses; printing that would claim a week we do not have. */
const WFROM = WIN.observed_from || WIN.from;

const LANE_IDS = Object.keys(D).sort((a, b) => LANES[a].n.localeCompare(LANES[b].n));
/* Genres that actually have a /lane-score/ page. The list is read out of the deployed
   lane-score Function at bake time, not copied here, so these links cannot rot into 404s
   when that Function's coverage changes. */
const LANE_SCORE = new Set(LS || []);

/* Tropes that already have a guide page on the site. Linking to them from the readouts is
   the point of the whole exercise as much as the tool is: internal links from a page that
   earns external ones are how a free tool lifts the pages that sell. Verified present in
   the repo 2026-08-25; a wrong entry costs a 404, so add only directories that exist. */
const TROPE_PAGE = {
	'age-gap': '/age-gap-trope/',
	'dark-romance': '/dark-romance-tropes/',
	'enemies-to-lovers': '/enemies-to-lovers-trope/',
	'fake-dating': '/fake-dating-trope/',
	'fated-mates': '/fated-mates-trope/',
	'forbidden-romance': '/forbidden-romance/',
	'forced-proximity': '/forced-proximity-trope/',
	'friends-to-lovers': '/friends-to-lovers-trope/',
	'grumpy-sunshine': '/grumpy-sunshine-trope/',
	'marriage-of-convenience': '/marriage-of-convenience-trope/',
	'second-chance': '/second-chance-romance/',
	'slow-burn': '/slow-burn-romance/',
	'small-town': '/small-town-romance/'
};

/* ------------------------------------------------------------------ small helpers --- */

function laneName(id) {
	return (LANES[id] && LANES[id].n) || id;
}
function tropeName(id) {
	return TROPES[id] || id;
}
/* A growing corpus count is printed as a floor with a "+" (estate convention IN-0803 /
   PP-4425): an exact figure is false the moment the next row lands, a floor only gets more
   conservative. The per-trope mention counts are NOT floored - they sit inside a closed,
   dated window, they do not grow, and the window is printed beside them. */
function floorNum(n) {
	return num(n) + '+';
}
function pct(x, dp) {
	return (x * 100).toFixed(dp == null ? 2 : dp) + '%';
}
function slugOk(s) {
	return /^[a-z0-9._-]{2,80}$/.test(s);
}

/* A lane's published trope list, and the row for one trope in it. */
function laneRows(lane) {
	return D[lane] || [];
}
function rowFor(lane, trope) {
	const rows = laneRows(lane);
	for (let i = 0; i < rows.length; i++) if (rows[i][0] === trope) return { row: rows[i], rank: i + 1, of: rows.length };
	return null;
}

/* Supply rank inside the SAME published set, so demand-rank vs supply-rank is a like-for-
   like comparison. Supply itself is registry-wide; the ranking is not a claim that it is
   lane-scoped, only that these are the tropes this page publishes for this lane. */
function supplyRank(lane, trope) {
	const rows = laneRows(lane).slice().sort((a, b) => (SUPPLY[b[0]] || 0) - (SUPPLY[a[0]] || 0));
	for (let i = 0; i < rows.length; i++) if (rows[i][0] === trope) return i + 1;
	return null;
}

/* DIRECTION. Share of the lane's trope mentions in the recent 12 weeks against the 12
   weeks before it. Share, not count: a lane that simply got noisier would otherwise read
   as every trope rising. Refuses to call it under the floor. */
/* Both bands must carry real counts, not just their sum. A trope that went 2 -> 40 has a
   share change north of +1,500%, and printing that as "rising fastest" is how a page ends
   up publishing a number nobody can defend. The sum floor alone let exactly that through
   on the first cut of the index board. */
const DIR_BAND_MIN = 10;
/* The index board is the most quotable surface on the tool, so its floors are higher than
   an individual readout's: a genre with a small lane total can swing on one busy week. */
const MOVER_BAND_MIN = 30;
const MOVER_LANE_MIN = 500;

function direction(lane, row) {
	const L = LANES[lane];
	const mR = row[2], mP = row[3];
	if (!L || !L.totR || !L.totP || mR + mP < FLOORS.dir_mentions || mR < DIR_BAND_MIN || mP < DIR_BAND_MIN) {
		return {
			state: 'unknown',
			label: 'Not enough dated signal to call it',
			why:
				'A direction here would be noise. We call one only when each twelve-week band holds at least ' +
				DIR_BAND_MIN + ' mentions and the two hold ' + FLOORS.dir_mentions +
				' between them; this trope has ' + num(mR) + ' and ' + num(mP) + '.'
		};
	}
	const sR = mR / L.totR, sP = mP / L.totP;
	const delta = sP === 0 ? null : (sR - sP) / sP;
	let state = 'steady', label = 'Holding steady';
	if (delta != null && delta >= 0.15) { state = 'up'; label = 'Rising'; }
	else if (delta != null && delta <= -0.15) { state = 'down'; label = 'Cooling'; }
	return {
		state, label, sR, sP, delta,
		why:
			pct(sR) + ' of ' + laneName(lane) + ' trope mentions in the last ' + WIN.band_weeks +
			' weeks, against ' + pct(sP) + ' in the ' + WIN.band_weeks + ' weeks before that' +
			(delta == null ? '' : ' — a ' + (delta >= 0 ? 'rise' : 'fall') + ' of ' + Math.abs(delta * 100).toFixed(0) + '% in share')
	};
}

/* EVIDENCE WEIGHT, on every readout, derived from the printed numbers.
   Not a rare warning box: 58% of published readouts sit under 60 mentions, so a box that
   fires on "thin" would fire on more than half the tool and be read as decoration. The
   honest form is one sentence that is always there and always says which band this
   particular readout is in - so an author cannot mistake a 31-mention read for a
   900-mention one just because both are rendered in the same big type. */
function evidence(row) {
	const m = row[1], w = row[4];
	if (m >= 200 && w >= 20)
		return 'That is a solid read for this genre: ' + num(m) + ' mentions spread across ' + w + ' of the ' + WIN.weeks + ' weeks.';
	if (m >= 60)
		return 'That is a modest sample &mdash; ' + num(m) + ' mentions across ' + w + ' of the ' + WIN.weeks +
			' weeks. Enough to rank it, not enough to bet a series on by itself.';
	return 'That is a <b>small sample</b> &mdash; ' + num(m) + ' mentions across ' + w + ' of the ' + WIN.weeks +
		' weeks. Read it as a hint, not a verdict. Scarcity of asks is itself a finding: it can mean a niche nobody is serving, or a niche nobody wants.';
}

/* Thin-lane honesty. mv_lane_scorecard already encodes the doctrine per lane; we restate
   it in the author's words rather than hiding it. */
function laneCaveat(lane) {
	const adv = (LANES[lane] && LANES[lane].adv) || '';
	if (/^SPARSE/i.test(adv))
		return 'This is an underserved niche. The counts below are real but small, and the scarcity is itself the finding — treat a direction here as a hint, not a verdict.';
	if (/^THIN/i.test(adv))
		return 'This lane is thin on its own and is supplemented from its parent lane elsewhere in Tropesmith. The mentions counted below are exact-lane only, so they are a floor on the real picture, not the whole of it.';
	return '';
}

function stageHead(title, desc, canonical, ld, isProd) {
	let h = head(title, desc, canonical, ld);
	if (STAGE || !isProd) h = h.replace('<title>', '<meta name="robots" content="noindex,nofollow">\n<title>');
	return h;
}

function htmlOut(body, opts) {
	const o = opts || {};
	const hdrs = {
		'content-type': 'text/html; charset=utf-8',
		'x-tropesmith-origin': 'pages-function',
		'x-tropesmith-tool': 'trope-demand-checker'
	};
	/* A signed-in render must never enter a shared cache; an anonymous one should. */
	hdrs['cache-control'] = o.private
		? 'private, no-store'
		: 'public, max-age=1800, s-maxage=43200, stale-while-revalidate=604800';
	if (o.noindex) hdrs['x-robots-tag'] = 'noindex, nofollow';
	return new Response(body, { status: o.status || 200, headers: hdrs });
}

/* ------------------------------------------------------------------- the gate ------- */
/**
 * free-requires-signup, applied as a DEPTH gate rather than a wall: the headline number,
 * the share, the rank and the method are public (that is what earns the links); the full
 * readout is for people with a free account.
 *
 * The check is server-side and costs nothing for anyone who is not already signed in: no
 * tsm_session cookie in the request means no upstream call at all. That matters because
 * every crawler and every first-time visitor is in that group.
 *
 * NO EMAIL IS SENT FROM HERE. The signed-out state links to the existing /login/ page,
 * which owns the magic-link rail. This tool adds no ESP integration of its own.
 */
async function session(request, url, isProd) {
	const cookie = request.headers.get('cookie') || '';
	if (!isProd && STAGE) {
		/* Staging preview only — the pages.dev host never receives the tropesmith.com
		   cookie, so Gary could not otherwise see the unlocked readout. isProd is derived
		   from the hostname, so this branch is unreachable on tropesmith.com no matter
		   what STAGE is set to. */
		if (url.searchParams.get('stage_signedin') === '1') return { ok: true, staged: true };
	}
	if (!/(^|;\s*)tsm_session=/.test(cookie)) return { ok: false };
	try {
		const r = await fetch(SITE + '/api/functions/v1/library/me', {
			headers: { cookie, accept: 'application/json' },
			signal: AbortSignal.timeout(4000)
		});
		if (!r.ok) return { ok: false };
		const d = await r.json();
		return d && d.ok ? { ok: true, email: d.email } : { ok: false };
	} catch (_e) {
		/* Auth unreachable is not "signed out for good" and is certainly not "signed in".
		   Show the locked state and say why, rather than silently downgrading. */
		return { ok: false, degraded: true };
	}
}

/* ------------------------------------------------------------------ page: readout --- */

function readoutBody(lane, trope, hit, unlocked, gateNote) {
	const L = LANES[lane], row = hit.row;
	const mAll = row[1], weeksSeen = row[4];
	const share = L.tot ? mAll / L.tot : 0;
	const dir = direction(lane, row);
	const caveat = laneCaveat(lane);
	const tn = tropeName(trope), ln = laneName(lane);

	const cells = [
		`<div class="cell"><span class="t">Reader-demand mentions</span><span class="b">${num(mAll)}</span><span class="s">counted in ${esc(ln)}, ${esc(WFROM)} to ${esc(WIN.to)}</span></div>`,
		`<div class="cell"><span class="t">Share of the lane</span><span class="b">${pct(share)}</span><span class="s">of ${num(L.tot)} trope mentions counted in this lane</span></div>`,
		`<div class="cell"><span class="t">Rank in this lane</span><span class="b">#${hit.rank}</span><span class="s">of ${hit.of} tropes we publish for ${esc(ln)}</span></div>`,
		`<div class="cell"><span class="t">Direction</span><span class="b">${esc(dir.label)}</span><span class="s">${esc(dir.why)}</span></div>`
	].join('');

	let depth;
	if (unlocked) {
		const series = (S[lane] && S[lane][trope]) || [];
		const laneWeeks = SW[lane] || [];
		const rowsHtml = WEEKS.map((w, i) => {
			const m = series[i] || 0, p = laneWeeks[i] || 0;
			return `<tr><td>${esc(w)}</td><td class="n">${num(m)}</td><td class="n">${num(p)}</td><td class="n">${p ? pct(m / p) : '&mdash;'}</td></tr>`;
		}).join('');

		const titles = SUPPLY[trope];
		const sRank = supplyRank(lane, trope);
		const gap = sRank == null ? null : sRank - hit.rank;
		const gapRead =
			gap == null
				? 'We hold no tagged-title count for this trope yet, so there is no supply side to compare against. That is a gap in our tagging, not evidence that nobody writes it.'
				: gap > 0
					? 'It ranks <b>#' + hit.rank + ' by reader demand</b> in this lane but only <b>#' + sRank +
					  ' by how many tagged titles carry it</b> — ' + gap + ' places further down the shelf than it sits in the asks.'
					: gap < 0
						? 'It ranks <b>#' + hit.rank + ' by reader demand</b> and <b>#' + sRank +
						  ' by tagged titles</b> — better served on the shelf than the asks alone would suggest.'
						: 'Demand rank and supply rank are the same (<b>#' + hit.rank + '</b>): the shelf and the asks agree about this one.';

		const adj = ((ADJ[lane] || {})[trope] || []).filter((a) => a[0] !== trope);
		const adjHtml = adj.length
			? `<div class="scroll"><table><thead><tr><th>Asked for alongside</th><th class="n">Reader asks naming both</th></tr></thead><tbody>` +
			  adj.map((a) => `<tr><td>${esc(tropeName(a[0]))}</td><td class="n">${num(a[1])}</td></tr>`).join('') +
			  '</tbody></table></div>' +
			  `<p style="font-size:13.5px;color:#5b4a59">These are a <b>different count</b> from the mentions above: reader asks in ${esc(ln)} naming both tropes in the same request, across the whole ask corpus rather than the dated weekly window. Do not add the two together.</p>`
			: `<p class="note">No co-asked trope clears our floor for this one in ${esc(ln)}. That is an absence of counted pairs, not proof that readers never ask for them together.</p>`;

		depth = `
<h2>Week by week, and the share behind it</h2>
<p>Every direction on this page is this table divided out. ${WIN.band_weeks} weeks to ${esc(WIN.to)}.</p>
<div class="scroll"><table><thead><tr><th>Week beginning</th><th class="n">${esc(tn)} mentions</th><th class="n">All trope mentions in lane</th><th class="n">Share</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>

<h2>What is already on the shelf</h2>
<div class="grid">
<div class="cell"><span class="t">Tagged titles carrying it</span><span class="b">${titles == null ? '&mdash;' : num(titles)}</span><span class="s">across our whole trope-tagged registry of ${floorNum(CORPUS.tagged_titles_floor)} titles</span></div>
<div class="cell"><span class="t">Demand rank vs supply rank</span><span class="b">${gap == null ? '&mdash;' : (gap > 0 ? '+' + gap : gap)}</span><span class="s">places of daylight between the asks and the shelf</span></div>
</div>
<p>${gapRead}</p>
<p style="font-size:13.5px;color:#5b4a59"><b>Read this carefully.</b> The title count is <b>registry-wide, not lane-scoped</b>. Our tagged-title records use a different subgenre vocabulary from the reader-ask records and the two do not join, so we count titles carrying the trope <i>anywhere</i> rather than fake a lane join and print &ldquo;nobody has written it&rdquo; about books that exist.</p>

<h2>Asked for alongside, in ${esc(ln)}</h2>
${adjHtml}

<h2>What we actually read for ${esc(ln)}</h2>
<div class="scroll"><table><tbody>
<tr><td>Reader-demand signals held for this lane</td><td class="n"><b>${num(L.sig)}</b></td></tr>
<tr><td>Signals in the last 30 days</td><td class="n"><b>${num(L.sig30)}</b></td></tr>
<tr><td>Signals in the last 7 days</td><td class="n"><b>${num(L.sig7)}</b></td></tr>
<tr><td>Newest signal in this lane</td><td class="n"><b>${esc(L.last || 'unknown')}</b></td></tr>
<tr><td>Titles we hold for this lane</td><td class="n"><b>${num(L.books)}</b></td></tr>
<tr><td>Of those, trope-tagged</td><td class="n"><b>${num(L.bwt)} (${L.cov}%)</b></td></tr>
<tr><td>Our own read of this lane's data</td><td class="n"><b>${esc(L.adv || 'unstated')}</b></td></tr>
<tr><td>Lane scorecard last recomputed</td><td class="n"><b>${esc(L.ref || 'unknown')}</b></td></tr>
</tbody></table></div>
<p style="font-size:13.5px;color:#5b4a59">We print the recompute time because the job behind it does occasionally fail. If that date is old, this strip is old, and you should read it as such.</p>`;
	} else {
		depth = `
<h2 id="full">The full readout</h2>
<div class="note">
<p style="margin-top:0"><b>Four more things sit behind a free Tropesmith account</b>, for ${esc(tn)} in ${esc(ln)}:</p>
<ul style="margin:8px 0 14px">
<li>the <b>week-by-week table</b> the direction above is divided out of — ${WIN.band_weeks} weeks, mentions and lane total side by side, so you can check our arithmetic</li>
<li>how many <b>tagged titles already carry this trope</b>, and how far its demand rank sits from its supply rank</li>
<li>the tropes readers <b>ask for alongside it</b> in ${esc(ln)}, with the counts</li>
<li>the <b>evidence strip for ${esc(ln)}</b>: signals held, signals this week, newest signal, tagging coverage, and when we last recomputed it</li>
</ul>
<p style="margin-bottom:0"><a class="btn" href="/login/?next=${esc(encodeURIComponent(PATH + '/' + lane + '/' + trope))}">Get the full readout &mdash; free</a></p>
${gateNote ? '<p style="font-size:13px;color:#8B2942;margin:12px 0 0">' + esc(gateNote) + '</p>' : ''}
</div>`;
	}

	return `<div class="wrap">
<div class="eyebrow">Free tool &middot; Counted, not estimated &middot; as of ${esc(AS_OF)}</div>
<h1>${esc(tn)} in ${esc(ln)}</h1>
<p class="lede">Over the ${WIN.weeks} weeks to ${esc(WIN.to)} we counted <b>${num(mAll)}</b> reader-demand mentions of ${esc(tn)} in ${esc(ln)} &mdash; ${pct(share)} of every trope mention we counted in the lane, ranking it <b>#${hit.rank} of ${hit.of}</b>. ${esc(dir.label)}.</p>
<div class="grid">${cells}</div>
<div class="note"><b>How much evidence is behind that?</b> ${evidence(row)}</div>
${caveat ? '<div class="note"><b>About this lane:</b> ' + caveat + '</div>' : ''}
${depth}

<h2>Where these numbers come from</h2>
<p>Mentions are counted rows, not estimates and not a model. We read reader demand from Goodreads reviews and shelves, parsed reader requests, BookTok video metadata and Reddit, resolve each one to a subgenre lane and to tropes in our published taxonomy, and total them by week. This page shows the ${WIN.weeks} weeks from ${esc(WFROM)} to ${esc(WIN.to)}; ${esc(tn)} appeared in ${weeksSeen} of the ${WIN.weeks}.</p>
<p>Only tropes from our <b>canonical taxonomy</b> of ${num(CORPUS.tropes_taxonomy)} appear here, and only the ${num(CORPUS.tropes_published)} of them that clear our publication floor somewhere. Raw scrape labels are excluded on purpose: publish those and the same trope ends up listed twice under two spellings and the ranking becomes fiction.</p>
<p>Direction is a change in <b>share</b>, never a raw weekly move, because a genre that simply gets busier would otherwise make every trope in it look like it is rising. We state no direction at all unless each ${WIN.band_weeks}-week band holds at least ${DIR_BAND_MIN} mentions and the two hold ${FLOORS.dir_mentions} between them &mdash; a trope that went from two mentions to forty is a small number moving, not a trend.</p>
<p>Figures restate each time the corpus is recounted. This page: <b>${esc(AS_OF)}</b>.</p>

<h2>Check another trope</h2>
${picker(lane, trope)}
${tieBack(
	'<li><a href="' + PATH + '/' + esc(lane) + '">Every trope we publish for ' + esc(ln) + '</a> &mdash; ranked by counted reader demand.</li>' +
	(TROPE_PAGE[trope] ? '<li><a href="' + TROPE_PAGE[trope] + '">The ' + esc(tn) + ' guide</a> &mdash; what the trope is, how it is written, and the titles that own it.</li>' : '') +
	(LANE_SCORE.has(lane) ? '<li><a href="/lane-score/' + esc(lane) + '">Lane score for ' + esc(ln) + '</a> &mdash; is the genre worth writing at all?</li>' : '')
)}
<div class="cta-row"><a class="btn" href="/intake/">Build my ${esc(ln)} Map &rarr;</a> &nbsp; <a href="/pricing/">See pricing</a></div>
</div>`;
}

/* ------------------------------------------------------------------- the picker ----- */
/* A GET form. No JavaScript: submitting lands on /trope-demand/?lane=..&trope=.. and the
   handler 302s to the canonical path, so the shareable URL is always the clean one. */
function picker(lane, trope) {
	const rows = lane ? laneRows(lane) : [];
	return `<form method="get" action="${PATH}/" style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:14px 0">
<label style="flex:1 1 240px"><span class="t" style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#a39395;font-weight:800">Genre / subgenre</span>
<select name="lane" style="width:100%;padding:11px 12px;border-radius:10px;border:1px solid rgba(16,18,47,.2);font:inherit;background:#FFFEFB">
${LANE_IDS.map((id) => `<option value="${esc(id)}"${id === lane ? ' selected' : ''}>${esc(laneName(id))}</option>`).join('')}
</select></label>
<label style="flex:1 1 240px"><span class="t" style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#a39395;font-weight:800">Trope</span>
<select name="trope" style="width:100%;padding:11px 12px;border-radius:10px;border:1px solid rgba(16,18,47,.2);font:inherit;background:#FFFEFB">
${rows.length
	? rows.map((r) => `<option value="${esc(r[0])}"${r[0] === trope ? ' selected' : ''}>${esc(tropeName(r[0]))}</option>`).join('')
	: '<option value="">Pick a genre first</option>'}
</select></label>
<button type="submit" class="btn" style="border:0;cursor:pointer;flex:0 0 auto">Check demand</button>
</form>
<p style="font-size:13px;color:#a39395;margin-top:-4px">Changing the genre and pressing <i>Check demand</i> reloads the trope list for that lane. ${num(CORPUS.readouts)} trope-and-lane readouts are published today.</p>`;
}

/* ------------------------------------------------------------------- page: lane ----- */

function laneBody(lane, notFoundTrope) {
	const L = LANES[lane], rows = laneRows(lane), caveat = laneCaveat(lane);
	const ln = laneName(lane);
	/* The picker cannot repopulate its trope list without JavaScript, so a reader can ask
	   for a trope this genre does not publish. Silently showing the genre page instead
	   would answer a question they did not ask; we say what happened. */
	const miss = notFoundTrope
		? '<div class="note"><b>We do not publish ' + esc(tropeName(notFoundTrope)) + ' for ' + esc(ln) +
		  '.</b> Either it is not in our canonical taxonomy, or it has fewer than ' + FLOORS.mentions +
		  ' counted mentions in this genre &mdash; and we would rather say so than print a number we cannot stand behind. Everything we <i>do</i> publish for ' +
		  esc(ln) + ' is below.</div>'
		: '';
	const body = rows
		.map((r, i) => {
			const dir = direction(lane, r);
			const cls = dir.state === 'up' ? 'open' : dir.state === 'down' ? 'crowded' : 'tight';
			return `<tr><td class="n">${i + 1}</td><td><a href="${PATH}/${esc(lane)}/${esc(r[0])}">${esc(tropeName(r[0]))}</a></td><td class="n">${num(r[1])}</td><td class="n">${L.tot ? pct(r[1] / L.tot) : '&mdash;'}</td><td><span class="pill ${cls}">${esc(dir.label === 'Not enough dated signal to call it' ? 'Not called' : dir.label)}</span></td><td class="n">${SUPPLY[r[0]] == null ? '&mdash;' : num(SUPPLY[r[0]])}</td></tr>`;
		})
		.join('');
	return `<div class="wrap">
<div class="eyebrow">Free tool &middot; Counted, not estimated &middot; as of ${esc(AS_OF)}</div>
<h1>${esc(ln)} &mdash; what readers are actually asking for</h1>
<p class="lede">Every trope we publish for ${esc(ln)}, ranked by reader-demand mentions counted over the ${WIN.weeks} weeks to ${esc(WIN.to)}. ${num(L.tot)} trope mentions counted in the lane in that window. Pick one for the full readout.</p>
${miss}
${picker(lane, rows.length ? rows[0][0] : '')}
${caveat ? '<div class="note"><b>About this lane:</b> ' + caveat + '</div>' : ''}
<div class="scroll"><table><thead><tr><th class="n">#</th><th>Trope</th><th class="n">Mentions</th><th class="n">Share of lane</th><th>Direction</th><th class="n">Tagged titles</th></tr></thead><tbody>${body}</tbody></table></div>
<p style="font-size:13.5px;color:#5b4a59">Direction is the change in each trope&rsquo;s <b>share</b> of the lane between the last ${WIN.band_weeks} weeks and the ${WIN.band_weeks} before &mdash; never a raw weekly move. &ldquo;Not called&rdquo; means the two bands hold fewer than ${FLOORS.dir_mentions} mentions between them and we will not pretend otherwise. Tagged titles are counted across our whole registry, not just this lane.</p>
${tieBack(LANE_SCORE.has(lane) ? '<li><a href="/lane-score/' + esc(lane) + '">Lane score for ' + esc(ln) + '</a> &mdash; is the genre worth writing at all?</li>' : '')}
<div class="cta-row"><a class="btn" href="/intake/">Build my ${esc(ln)} Map &rarr;</a> &nbsp; <a href="${PATH}/">All genres</a></div>
</div>`;
}

/* ------------------------------------------------------------------ page: index ----- */

function indexBody() {
	/* The movers list is computed from the same data every readout uses. It is a view, not
	   a second source of truth. */
	const movers = [];
	for (const lane of LANE_IDS) {
		const L = LANES[lane];
		/* A lane whose own volume swung between the bands makes every share in it move.
		   Both lane totals have to be big enough for a share to mean something. */
		if (L.totR < MOVER_LANE_MIN || L.totP < MOVER_LANE_MIN) continue;
		for (const r of laneRows(lane)) {
			const d = direction(lane, r);
			if (d.state === 'up' && r[2] >= MOVER_BAND_MIN && r[3] >= MOVER_BAND_MIN)
				movers.push([lane, r[0], r[1], d.delta, d.sR, d.sP]);
		}
	}
	movers.sort((a, b) => b[3] - a[3]);
	const top = movers.slice(0, 12);

	return `<div class="wrap">
<div class="eyebrow">Free tool &middot; No card needed &middot; as of ${esc(AS_OF)}</div>
<h1>The Trope Demand Checker</h1>
<p class="lede">Pick your genre and a trope. We tell you how many readers actually asked for it, what share of the genre that is, and whether it is rising or cooling &mdash; counted from ${floorNum(CORPUS.signals_floor)} reader-demand signals, not guessed. ${num(CORPUS.readouts)} trope-and-genre readouts across ${num(CORPUS.lanes_published)} genres.</p>
${picker(LANE_IDS[0], (laneRows(LANE_IDS[0])[0] || [''])[0])}
<div class="grid">
<div class="cell"><span class="t">Reader-demand signals held</span><span class="b">${floorNum(CORPUS.signals_floor)}</span><span class="s">reviews, shelves, BookTok and reader requests</span></div>
<div class="cell"><span class="t">Mentions counted in this window</span><span class="b">${num(CORPUS.mentions_counted)}</span><span class="s">${WIN.weeks} weeks, ${esc(WFROM)} to ${esc(WIN.to)}</span></div>
<div class="cell"><span class="t">Tropes in our taxonomy</span><span class="b">${num(CORPUS.tropes_taxonomy)}</span><span class="s">canonical only &mdash; no raw scrape labels</span></div>
<div class="cell"><span class="t">Genres covered</span><span class="b">${num(CORPUS.lanes_published)}</span><span class="s">each with its own counted lane total</span></div>
</div>

<h2>Rising fastest right now</h2>
<p>Biggest gains in <b>share</b> of their own genre between the last ${WIN.band_weeks} weeks and the ${WIN.band_weeks} before. Both halves of the comparison are printed, so you can do the division yourself.</p>
${top.length >= 5
	? `<div class="scroll"><table><thead><tr><th>Trope</th><th>Genre</th><th class="n">Mentions</th><th class="n">Share, last ${WIN.band_weeks}w</th><th class="n">Share, ${WIN.band_weeks}w before</th><th class="n">Change</th></tr></thead><tbody>
${top.map((m) => `<tr><td><a href="${PATH}/${esc(m[0])}/${esc(m[1])}">${esc(tropeName(m[1]))}</a></td><td>${esc(laneName(m[0]))}</td><td class="n">${num(m[2])}</td><td class="n">${pct(m[4])}</td><td class="n">${pct(m[5])}</td><td class="n">+${(m[3] * 100).toFixed(0)}%</td></tr>`).join('')}
</tbody></table></div>
<p style="font-size:13.5px;color:#5b4a59">Only tropes with at least ${MOVER_BAND_MIN} counted mentions in <i>each</i> twelve-week band, in genres holding at least ${num(MOVER_LANE_MIN)} trope mentions in each band. Without those floors a trope that went from two mentions to forty tops this table with a four-figure percentage, and that is not a trend &mdash; it is a small number moving.</p>`
	: `<p class="note">Fewer than five tropes clear our floors for a rising call this week, so there is no board to show. The floors are ${MOVER_BAND_MIN} counted mentions in <i>each</i> twelve-week band, in a genre holding at least ${num(MOVER_LANE_MIN)} trope mentions in each. We would rather show nothing than pad it.</p>`}

<h2>Pick your genre</h2>
<ul class="lanes">${LANE_IDS.map((id) => `<li><a href="${PATH}/${esc(id)}">${esc(laneName(id))}</a> <span style="color:#a39395">&middot; ${laneRows(id).length} tropes</span></li>`).join('')}</ul>

<h2>What this is, and what it is not</h2>
<p>It is a count. Every mention figure on these pages is rows we hold, over a window we name, from sources we name &mdash; and each readout shows you the week-by-week table those mentions add up from, so you can check the arithmetic yourself. Nothing is modelled, extrapolated or rounded up for effect, and every figure carries the date it was counted.</p>
<p>It is <b>not</b> a sales forecast. Reader demand is not the same thing as money, and a trope readers shout about is not automatically a trope that sells &mdash; that depends on the price, the shelf and the competition in your lane, which is what a <a href="/pricing/">Tropesmith Map</a> is for. It is also not a complete census of the internet: it is our corpus, and where a genre is thin the page says so instead of filling the gap.</p>
${tieBack(
	'<li><a href="/romance-tropes/">The romance trope list</a> &mdash; every romance trope we track, explained.</li>' +
	'<li><a href="/book-tropes-list/">Book tropes across every genre</a> &mdash; the wider list this tool counts against.</li>' +
	'<li><a href="/booktok-books/">BookTok books</a> &mdash; what is actually moving on BookTok right now.</li>'
)}
<div class="cta-row"><a class="btn" href="/intake/">Build my Map &rarr;</a> &nbsp; <a href="/lane-score/">Lane scores</a></div>
</div>`;
}

/* ---------------------------------------------------------------------- schema ------ */

function datasetFor(lane, trope, hit) {
	const ln = laneName(lane);
	const base = {
		'@type': 'Dataset',
		isAccessibleForFree: true,
		inLanguage: 'en',
		license: SITE + '/terms/',
		creator: ORG,
		publisher: ORG,
		dateModified: AS_OF,
		temporalCoverage: WFROM + '/' + WIN.to,
		measurementTechnique:
			'Reader-demand signals (Goodreads reviews and shelves, parsed reader requests, BookTok video metadata, Reddit) resolved to a subgenre lane and to tropes in the published Tropesmith taxonomy, then totalled by week. Counted rows only - nothing modelled or estimated.'
	};
	if (!lane) {
		return Object.assign(base, {
			'@id': SITE + PATH + '/#dataset',
			name: 'Tropesmith trope demand by genre',
			url: SITE + PATH + '/',
			description:
				'Counted reader demand for ' + CORPUS.tropes_published + ' tropes across ' + CORPUS.lanes_published +
				' fiction subgenres: mentions counted over the ' + WIN.weeks + ' weeks to ' + WIN.to +
				', each trope’s share of its genre, the direction of that share against the previous ' +
				WIN.band_weeks + ' weeks, and how many tagged titles already carry the trope. ' +
				CORPUS.readouts + ' published trope-and-genre readouts.',
			variableMeasured: [
				pv('Trope-and-genre readouts published', CORPUS.readouts, 'readouts', 'Distinct trope-in-genre pages with a counted demand figure'),
				pv('Tropes published', CORPUS.tropes_published, 'tropes', 'Canonical tropes clearing the publication floor in at least one genre'),
				pv('Genres covered', CORPUS.lanes_published, 'genres', 'Subgenre lanes with a published demand ranking'),
				pv('Reader-demand mentions counted', CORPUS.mentions_counted, 'mentions', 'Total mentions counted across every published readout in the window')
			]
		});
	}
	if (!trope) {
		return Object.assign(base, {
			'@id': SITE + PATH + '/' + lane + '#dataset',
			name: ln + ' — trope demand',
			url: SITE + PATH + '/' + lane,
			description:
				'Every trope Tropesmith publishes for ' + ln + ' ranked by reader-demand mentions counted over the ' +
				WIN.weeks + ' weeks to ' + WIN.to + ', with each trope’s share of the genre, the direction of that share and the number of tagged titles carrying it.',
			isPartOf: { '@id': SITE + PATH + '/#dataset' },
			variableMeasured: [pv('Reader-demand mentions', LANES[lane].tot, 'mentions', 'Trope mentions counted in ' + ln + ' over the window')]
		});
	}
	const L = LANES[lane], row = hit.row;
	return Object.assign(base, {
		'@id': SITE + PATH + '/' + lane + '/' + trope + '#dataset',
		name: tropeName(trope) + ' in ' + ln + ' — reader demand',
		url: SITE + PATH + '/' + lane + '/' + trope,
		description:
			num(row[1]).replace(/&mdash;/, '') + ' reader-demand mentions of ' + tropeName(trope) + ' counted in ' + ln +
			' over the ' + WIN.weeks + ' weeks to ' + WIN.to + ', ' + pct(L.tot ? row[1] / L.tot : 0) +
			' of all trope mentions counted in the genre, ranked #' + hit.rank + ' of ' + hit.of + '.',
		isPartOf: { '@id': SITE + PATH + '/' + lane + '#dataset' },
		variableMeasured: [
			pv('Reader-demand mentions', row[1], 'mentions', 'Counted in ' + ln + ' from ' + WFROM + ' to ' + WIN.to),
			pv('Share of genre', Number((L.tot ? (row[1] / L.tot) * 100 : 0).toFixed(3)), 'percent', 'Of ' + L.tot + ' trope mentions counted in the genre'),
			pv('Rank in genre', hit.rank, 'rank', 'Of ' + hit.of + ' tropes published for this genre'),
			pv('Weeks present', row[4], 'weeks', 'Of ' + WIN.weeks + ' weeks in the window')
		]
	});
}

function toolApp(url) {
	return app({
		url,
		name: 'Tropesmith Trope Demand Checker',
		description:
			'Free tool: pick a genre and a trope and get the reader demand Tropesmith has counted for it - mentions, share of the genre, direction of travel and how many tagged titles already carry it.',
		featureList: [
			'Counted reader-demand mentions for a trope in a genre',
			'That trope’s share of all trope mentions in the genre',
			'Rank against every other trope published for the genre',
			'Direction of travel measured on share, not raw counts',
			'Week-by-week working behind the direction',
			'Tagged titles already carrying the trope',
			'Tropes readers ask for alongside it'
		],
		asOf: AS_OF,
		dataset: SITE + PATH + '/#dataset'
	});
}

/* ---------------------------------------------------------------------- handler ----- */

export async function handle(context) {
	const { request } = context;
	const url = new URL(request.url);
	const isProd = url.hostname === 'tropesmith.com' || url.hostname === 'www.tropesmith.com';
	const noindex = STAGE || !isProd;

	const segs = decodeURIComponent(url.pathname)
		.replace(/^\/+|\/+$/g, '')
		.split('/')
		.slice(1)
		.filter(Boolean)
		.map((s) => s.trim().toLowerCase());

	let lane = segs[0] || (url.searchParams.get('lane') || '').trim().toLowerCase();
	let trope = segs[1] || (url.searchParams.get('trope') || '').trim().toLowerCase();
	const fromQuery = !segs.length && (lane || trope);
	const json = wantsJson(request, url);

	/* Empty input is a normal state, not an error: the form posts back here with nothing
	   chosen when a browser has no JavaScript and the lane has no tropes yet.
	   MALFORMED input is NOT the same thing as empty. Blanking a junk segment and then
	   rendering the lane page would answer a question nobody asked - a silent fallback.
	   A segment that was supplied and does not validate gets a 404 that says so. */
	const junk = (lane && !slugOk(lane)) || (trope && !slugOk(trope));
	if (lane && !slugOk(lane)) lane = '';
	if (trope && !slugOk(trope)) trope = '';
	if (junk) {
		return notFound(url, noindex, json,
			'That is not a genre and trope we recognise. Genres and tropes are lower-case identifiers such as "romance.dark" and "grumpy-sunshine".');
	}
	if (lane && !D[lane]) {
		return notFound(url, noindex, json, 'We do not publish a demand readout for that genre.');
	}

	/* Canonicalise: the query-string form is an entry point, never a URL we publish. */
	if (fromQuery && lane) {
		if (trope && !rowFor(lane, trope))
			return Response.redirect(url.origin + PATH + '/' + lane + '?nf=' + encodeURIComponent(trope), 302);
		return Response.redirect(url.origin + PATH + '/' + lane + (trope ? '/' + trope : ''), 302);
	}

	/* ---- depth payload (the gated JSON the page's own blocks are rendered from) ---- */
	if (url.searchParams.get('depth') === '1') {
		if (!lane || !trope) return jsonResponse({ ok: false, error: 'lane and trope required' }, 400);
		const hit = rowFor(lane, trope);
		if (!hit) return jsonResponse({ ok: false, error: 'no readout for that trope in that genre' }, 404);
		const s = await session(request, url, isProd);
		if (!s.ok)
			return new Response(
				JSON.stringify({ ok: false, gated: true, degraded: !!s.degraded, signup: '/login/?next=' + encodeURIComponent(PATH + '/' + lane + '/' + trope) }),
				{ status: 401, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' } }
			);
		return new Response(
			JSON.stringify({
				ok: true, as_of: AS_OF, window: WIN, weeks: WEEKS,
				lane, lane_name: laneName(lane), trope, trope_name: tropeName(trope),
				mentions: hit.row[1], rank: hit.rank, of: hit.of,
				series: (S[lane] || {})[trope] || [], lane_weekly_total: SW[lane] || [],
				titles_registry_wide: SUPPLY[trope] == null ? null : SUPPLY[trope],
				supply_rank: supplyRank(lane, trope),
				co_asked: (ADJ[lane] || {})[trope] || [],
				lane_evidence: LANES[lane]
			}),
			{ status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' } }
		);
	}

	/* ---- index ---- */
	if (!lane) {
		const canonical = SITE + PATH + '/';
		if (json)
			return jsonResponse({
				ok: true, as_of: AS_OF, window: WIN, corpus: CORPUS,
				genres: LANE_IDS.map((id) => ({ lane: id, name: laneName(id), tropes: laneRows(id).length, lane_total_mentions: LANES[id].tot }))
			});
		const ld = [
			Object.assign({ '@context': 'https://schema.org' }, datasetFor(null, null, null)),
			toolApp(canonical),
			breadcrumb('Trope Demand Checker', canonical)
		];
		return htmlOut(
			stageHead(
				'Trope Demand Checker — what readers actually ask for | Tropesmith',
				'Free: pick a genre and a trope, see the reader demand we counted for it — mentions, share of the genre and direction of travel, from ' +
					num(CORPUS.signals_floor) + '+ reader-demand signals. No card needed.',
				canonical, ld, isProd
			) + indexBody() + foot(),
			{ noindex }
		);
	}

	/* ---- lane ---- */
	if (!trope) {
		const nfRaw = (url.searchParams.get('nf') || '').trim().toLowerCase();
		const nfTrope = nfRaw && slugOk(nfRaw) ? nfRaw : '';
		const canonical = SITE + PATH + '/' + lane;
		if (json)
			return jsonResponse({
				ok: true, as_of: AS_OF, window: WIN, lane, lane_name: laneName(lane),
				lane_total_mentions: LANES[lane].tot, advisory: LANES[lane].adv,
				tropes: laneRows(lane).map((r, i) => ({
					trope: r[0], name: tropeName(r[0]), rank: i + 1, mentions: r[1],
					mentions_recent: r[2], mentions_prior: r[3], weeks_seen: r[4],
					direction: direction(lane, r).state, titles_registry_wide: SUPPLY[r[0]] == null ? null : SUPPLY[r[0]]
				}))
			});
		const ln = laneName(lane);
		const ld = [
			Object.assign({ '@context': 'https://schema.org' }, datasetFor(lane, null, null)),
			toolApp(canonical),
			breadcrumb(ln, canonical, 'Trope Demand Checker', SITE + PATH + '/')
		];
		return htmlOut(
			stageHead(
				ln + ' trope demand — what readers are asking for | Tropesmith',
				'Every trope we publish for ' + ln + ', ranked by reader-demand mentions counted over the ' + WIN.weeks +
					' weeks to ' + WIN.to + ', with share of the genre and direction of travel. Free.',
				canonical, ld, isProd
			) + laneBody(lane, nfTrope) + foot(),
			{ noindex }
		);
	}

	/* ---- readout ---- */
	const hit = rowFor(lane, trope);
	if (!hit) {
		return notFound(url, noindex, json,
			'We hold no published readout for that trope in ' + laneName(lane) +
			'. Either it is not in our canonical taxonomy, or it has fewer than ' + FLOORS.mentions +
			' counted mentions in this genre — and we would rather say so than print a number we cannot stand behind.');
	}
	const s = await session(request, url, isProd);
	const gateNote = s.degraded ? 'Our sign-in service did not answer just now, so we cannot tell whether you are signed in. Nothing below has been guessed in its place.' : '';
	const canonical = SITE + PATH + '/' + lane + '/' + trope;

	if (json) {
		/* Public JSON mirrors the public HTML exactly - the gate is not something the
		   Accept header can step around. */
		const L = LANES[lane], d = direction(lane, hit.row);
		return jsonResponse({
			ok: true, as_of: AS_OF, window: WIN, lane, lane_name: laneName(lane), trope, trope_name: tropeName(trope),
			mentions: hit.row[1], lane_total_mentions: L.tot, share_pct: L.tot ? Number(((hit.row[1] / L.tot) * 100).toFixed(3)) : null,
			rank: hit.rank, of: hit.of, weeks_seen: hit.row[4], direction: d.state, direction_label: d.label,
			advisory: L.adv,
			full_readout: { gated: true, free_account_required: true, signup: SITE + '/login/?next=' + encodeURIComponent(PATH + '/' + lane + '/' + trope) }
		});
	}

	const ld = [
		Object.assign({ '@context': 'https://schema.org' }, datasetFor(lane, trope, hit)),
		toolApp(canonical),
		breadcrumb(tropeName(trope) + ' in ' + laneName(lane), canonical, laneName(lane), SITE + PATH + '/' + lane)
	];
	const L = LANES[lane];
	const desc =
		num(hit.row[1]).replace(/&mdash;/, '') + ' reader-demand mentions of ' + tropeName(trope) + ' counted in ' + laneName(lane) +
		' over the ' + WIN.weeks + ' weeks to ' + WIN.to + ' — ' + pct(L.tot ? hit.row[1] / L.tot : 0) +
		' of the genre, rank #' + hit.rank + ' of ' + hit.of + '. ' + direction(lane, hit.row).label + '. Free, counted, dated.';

	return htmlOut(
		stageHead(tropeName(trope) + ' in ' + laneName(lane) + ' — reader demand | Tropesmith', desc, canonical, ld, isProd) +
			readoutBody(lane, trope, hit, s.ok, gateNote) +
			foot(),
		{ noindex, private: s.ok }
	);
}

function notFound(url, noindex, json, why) {
	if (json) return jsonResponse({ ok: false, error: why }, 404);
	const canonical = SITE + PATH + '/';
	return htmlOut(
		head('Not one we publish | Tropesmith', why, canonical, []).replace(
			'<title>',
			'<meta name="robots" content="noindex,nofollow">\n<title>'
		) +
			`<div class="wrap"><h1>Not one we publish</h1><p class="lede">${esc(why)}</p>
<p>Nothing has been guessed in its place.</p>
${picker(LANE_IDS[0], (laneRows(LANE_IDS[0])[0] || [''])[0])}
<p><a href="${PATH}/">Start again from every genre we do cover &rarr;</a></p></div>` +
			foot(),
		{ status: 404, noindex: true }
	);
}

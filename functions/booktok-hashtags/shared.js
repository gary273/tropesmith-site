/**
 * IN-0790 — BOOKTOK HASHTAG PICKER.
 *
 * Hashtags are ranked by their SHARE of the on-tag BookTok videos we sampled — within a subgenre
 * lane, and across the whole ranked set on the index. TS-UX-04 (2026-10-21): the picker used to
 * headline "plays per video" as "reach". That figure is the total of the lifetime plays of the
 * ~60 videos one scan saw on a tag page, not TikTok's hashtag counter, and it was ~30x inflated
 * for 18 Sep-6 Oct (scraper fault, TS-1088). A play total is never shown as reach any more; the
 * mean plays per sampled video survives only as a small, labelled detail and ranks nothing.
 *
 * HONESTY CONSTRAINT, and it shapes every label on the page: these are NOT lifetime hashtag
 * counts and they are NOT live. They are a dated sample - the videos we scanned for that
 * hashtag on that date. TikTok counters move hourly. Every figure is therefore printed with its
 * own scan date, and the page says the word "snapshot" before it shows a single number. Data
 * baked at build time by /root/in0790-gen/export_gen_data.py.
 */
import { AS_OF, META, LANE_NAMES, TAGS } from './data.js';
import { PAIRS } from '../trope-pairs/data.js';
import { SITE, ORG, esc, num, head, foot, breadcrumb, app, pv, tieBack, jsonResponse, htmlResponse, wantsJson } from '../_gen/chrome.js';

/* [hashtag, lane, scanned_on, videos, total_plays, total_likes, avg_plays, lane_share, all_share, sample_size]
   The first seven positions are read by functions/embed/shared.js and must not move. */
const H = 0, LANE = 1, ON = 2, VIDS = 3, AVG = 6, LSH = 7, ASH = 8, SAMPLE = 9;

/* TS-1095 / TS-1088: scans before 2026-10-06 came from a tag-page scraper that did not filter for book content, so off-topic viral videos sit inside them. They stay on the page with their scan date, labelled, but are NOT ranked and carry no share; only scans from the on-tag filter are. */
const CLEAN_FROM = '2026-10-06';

/* The exporter bakes the shares. If this module is ever deployed against a data.js from before
   TS-UX-04 (no share columns), derive the same two shares here from the same on-tag video counts,
   so deploy order does not matter. */
(function deriveShares() {
	if (TAGS.length && TAGS[0].length >= 10) return;
	const clean = TAGS.filter((t) => t[ON] >= CLEAN_FROM);
	const pool = {};
	let all = 0;
	for (const t of clean) {
		pool[t[LANE] || ''] = (pool[t[LANE] || ''] || 0) + t[VIDS];
		all += t[VIDS];
	}
	for (const t of TAGS) {
		const ok = t[ON] >= CLEAN_FROM;
		t[LSH] = ok && pool[t[LANE] || ''] > 0 ? t[VIDS] / pool[t[LANE] || ''] : null;
		t[ASH] = ok && all > 0 ? t[VIDS] / all : null;
		t[SAMPLE] = null;
	}
})();

const isClean = (t) => t[LSH] != null;
const CLEAN = TAGS.filter(isClean);
const N_SCANNED = META['hashtags'];
const N_SHOWN = CLEAN.length;
const N_VIDEOS = CLEAN.reduce((s, t) => s + t[VIDS], 0);

/* A lane page needs its own reason to exist. 39 of the mapped lanes carry a single
   hashtag and 52 carry two; publishing those as pages would have been 91 near-duplicates
   of the same general-hashtag table — the thin-page problem the 2026-08-21 crawl audit
   already found on this domain (86 of 130 crawled pages under 300 words). Three mapped
   hashtags is the floor; below it the lane is not a page, and the index says so.
   The same floor applies to a share: a hashtag's share of a pool of one or two ranked
   hashtags says nothing, so it is not printed (the row keeps its video count). */
const MIN_TAGS = 3;

/* ranked first, then by share of on-tag videos (= by on-tag videos within a pool), then A-Z so ties are stable */
const byShare = (a, b) => (isClean(b) - isClean(a)) || (b[VIDS] - a[VIDS]) || String(a[H]).localeCompare(String(b[H]));

export const BY_LANE = (function () {
	const m = {};
	for (const t of TAGS) if (t[LANE]) (m[t[LANE]] = m[t[LANE]] || []).push(t);
	for (const k of Object.keys(m)) {
		if (m[k].length < MIN_TAGS) delete m[k];
		else m[k].sort(byShare);
	}
	return m;
})();
const LANES = Object.keys(BY_LANE).sort((a, b) => (LANE_NAMES[a] || a).localeCompare(LANE_NAMES[b] || b));
const GENERAL = TAGS.filter((t) => !t[LANE]).sort(byShare);

/* how many ranked hashtags share each pool ('' = the general, lane-less tags) */
const POOL_N = (function () {
	const m = {};
	for (const t of CLEAN) m[t[LANE] || ''] = (m[t[LANE] || ''] || 0) + 1;
	return m;
})();
const poolN = (t) => POOL_N[t[LANE] || ''] || 0;
const shareable = (t) => isClean(t) && poolN(t) >= MIN_TAGS;

function laneName(id) {
	return LANE_NAMES[id] || id;
}

function pct(x) {
	return (Number(x) * 100).toFixed(1) + '%';
}

const latest = (rows) => rows.filter(isClean).reduce((m, t) => (t[ON] > m ? t[ON] : m), '');

/* A share is compared against an even split of its pool (1 / ranked hashtags in the lane), and the
   comparison is stated on the page. No tuned thresholds, no per-lane fudge. */
function sharePill(t) {
	if (!isClean(t)) return ['tight', 'Older scan, not ranked'];
	if (!t[VIDS]) return ['crowded', 'Not measured'];
	const n = poolN(t);
	if (n < MIN_TAGS) return ['tight', 'Too few ranked to compare'];
	const even = 1 / n;
	if (t[LSH] >= even * 2) return ['open', 'Share leader'];
	if (t[LSH] >= even) return ['tight', 'Above even split'];
	return ['crowded', 'Below even split'];
}

function row(t, scope) {
	const p = sharePill(t);
	const sh = scope === 'all' ? t[ASH] : shareable(t) ? t[LSH] : null;
	const detail = isClean(t) && t[AVG] ? ` &middot; mean plays per video we sampled: ${num(t[AVG])}` : '';
	return `<tr><td><b>#${esc(t[H])}</b>${t[LANE] ? `<br><span style="font-size:12.5px;color:#a39395">${esc(laneName(t[LANE]))}</span>` : ''}</td><td class="n">${
		sh != null ? pct(sh) : '&mdash;'
	}</td><td class="n">${isClean(t) ? num(t[VIDS]) : '&mdash;'}</td><td><span class="pill ${p[0]}">${esc(p[1])}</span><br><span style="font-size:12px;color:#a39395">scanned ${esc(
		t[ON]
	)}${detail}</span></td></tr>`;
}

/* scope: 'all' = share of every ranked hashtag's on-tag videos (index); 'lane' = share of the lane (or of the general pool) */
function table(rows, scope, shareHead) {
	return `<div class="scroll"><table><thead><tr><th>Hashtag</th><th class="n">${esc(shareHead)}</th><th class="n">On-tag videos sampled</th><th>Against an even split</th></tr></thead><tbody>${rows
		.map((t) => row(t, scope))
		.join('')}</tbody></table></div>`;
}

function methodNote(rows, what) {
	const d = latest(rows);
	return `<p class="note" style="margin:10px 0 4px">Ranked by share of on-tag BookTok videos we sampled for ${esc(what)}${d ? ', latest scan ' + esc(d) : ''}. Play counts are not TikTok&rsquo;s hashtag totals.</p>`;
}

function methodBlock() {
	return `<h2>What these numbers are &mdash; and what they are not</h2>
<p>Every row is a <b>dated snapshot</b>, not a live counter and not a lifetime total. For each hashtag we read a sample of the videos TikTok lists first on its page, on the date shown, and counted the ones that are actually on that hashtag&rsquo;s book content: those are the <b>on-tag videos sampled</b>. TikTok moves by the hour; a figure scanned in October is an October figure and is labelled as one.</p>
<p><b>Share</b> is a hashtag&rsquo;s on-tag videos divided by the on-tag videos of every ranked hashtag in the same pool: the lane on a lane page, all ${num(
		N_SHOWN
	)} ranked hashtags (${num(N_VIDEOS)} on-tag videos) on the index, or the general hashtags that belong to no lane. It is a share of what we sampled, so it tells you which of a lane&rsquo;s hashtags carry the most on-tag BookTok activity relative to the others; it does not tell you how many videos use the hashtag, and the sample is capped at about sixty videos per hashtag, so several busy hashtags tie near the top. <b>Against an even split</b> compares a share with 1 divided by the number of ranked hashtags in the pool: twice that or better is a share leader, at or above it is above the even split, below it is below. A pool of fewer than three ranked hashtags shows no share. That is the whole rule.</p>
<p>The <b>mean plays per video we sampled</b> beside each scan date is a small detail and ranks nothing. It is the average of the lifetime plays of the sampled videos, so a few viral videos can lift it; it is not TikTok&rsquo;s play count for the hashtag. Scans dated before 6 October 2026 came from a scraper that did not filter for book content, so they are shown with their date and are not ranked. It is a measurement, not a promise &mdash; nothing here predicts what your video will do.</p>
<p>${num(META.snapshot_rows)} scans across ${num(META.hashtags)} hashtags and ${num(
		META.lanes
	)} subgenre lanes, first scan ${esc(META.first_scrape)}, most recent ${esc(META.last_scrape)}. The same figures are available as JSON with <code>?format=json</code>.</p>`;
}

function embedBlock(lane) {
	const q = lane ? '?lane=' + encodeURIComponent(lane) : '';
	const snip = `<div id="tropesmith-booktok-tags"></div>\n<script src="${SITE}/embed/booktok-tags.js${q}" async></script>`;
	return `<h2>Put this on your own site</h2>
<p class="note">Free to embed anywhere. The widget keeps a visible &ldquo;Data: Tropesmith&rdquo; credit link back to tropesmith.com &mdash; that link is the licence, and it is rendered into the payload server-side so it cannot be shipped without it.</p>
<pre class="embed">${esc(snip)}</pre>`;
}

function datasetNode(id, name, description, url, rows) {
	const ranked = rows.filter(isClean);
	return {
		'@context': 'https://schema.org',
		'@type': 'Dataset',
		'@id': id,
		name,
		description,
		url,
		isAccessibleForFree: true,
		license: SITE + '/terms/',
		creator: ORG,
		publisher: ORG,
		temporalCoverage: META.first_scrape + '/' + META.last_scrape,
		dateModified: AS_OF,
		measurementTechnique:
			'For each tracked BookTok hashtag a sample of the videos listed first on its tag page is read on a dated scan and the on-tag book videos in that sample are counted. A hashtag\'s share is its on-tag videos divided by the on-tag videos of all ranked hashtags in the same pool. Figures are counted from the scanned sample on the stated date - they are not lifetime hashtag totals and not live counters.',
		keywords: ['BookTok', 'hashtags', 'TikTok', 'book marketing', 'share of on-tag videos'],
		variableMeasured: [
			pv('Hashtags tracked', META.hashtags, 'hashtags', 'Distinct BookTok hashtags with at least one scan'),
			pv('Scans held', META.snapshot_rows, 'scans', 'Dated hashtag scans in the corpus'),
			pv('Subgenre lanes mapped', META.lanes, 'lanes', 'Lanes at least one hashtag is mapped to'),
			pv('Hashtags shown here', rows.length, 'hashtags', 'Rows published on this page'),
			pv('On-tag videos sampled here', ranked.reduce((s, t) => s + t[VIDS], 0), 'videos', 'On-tag videos in the ranked scans that the shares are computed from')
		],
		distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: url + '?format=json' }]
	};
}

function indexPage() {
	const canonical = SITE + '/booktok-hashtags/';
	const top = CLEAN.slice().sort(byShare).slice(0, 40);
	const ld = [
		app({
			name: 'BookTok Hashtag Picker',
			url: canonical,
			description:
				'Free tool: ' + META.hashtags + ' BookTok hashtags, ranked by their share of the on-tag BookTok videos we sampled in a dated scan, so you can pick hashtags on measured activity instead of on guesswork.',
			featureList: [
				'Share of on-tag BookTok videos sampled for every ranked hashtag',
				'On-tag videos in the scan (a sample of the tag page, not a count of videos using the hashtag)',
				'Each share compared against an even split of its lane',
				'Per-subgenre hashtag sets',
				'Every figure carries its own scan date',
				'Embeddable widget with attribution',
				'JSON output',
				'No account, no card, works with JavaScript off'
			],
			asOf: AS_OF,
			dataset: canonical + '#dataset'
		}),
		datasetNode(
			canonical + '#dataset',
			'Tropesmith BookTok hashtag scans',
			META.snapshot_rows + ' dated scans across ' + META.hashtags + ' BookTok hashtags, each recording the on-tag videos found in the sample and the hashtag\'s share of the on-tag videos sampled.',
			canonical,
			TAGS
		),
		{
			'@context': 'https://schema.org',
			'@type': 'ItemList',
			name: 'BookTok hashtags by subgenre',
			numberOfItems: LANES.length,
			itemListElement: LANES.map((l, i) => ({ '@type': 'ListItem', position: i + 1, name: laneName(l) + ' BookTok hashtags', url: SITE + '/booktok-hashtags/' + l }))
		},
		breadcrumb('BookTok Hashtag Picker', canonical)
	];

	return (
		head(
			'BookTok Hashtag Picker - which hashtags carry the most book activity | Tropesmith',
			N_SHOWN + ' ranked BookTok hashtags (of ' + N_SCANNED + ' scanned), ranked by their share of the on-tag BookTok videos we sampled in a dated scan: pick hashtags on measured activity, not on guesswork. Free, no sign-up.',
			canonical,
			ld
		) +
		`<div class="wrap">
<div class="eyebrow">Free tool &middot; Dated snapshot &middot; No account</div>
<h1>BookTok Hashtag Picker</h1>
<p class="lede">Everyone tells authors to &ldquo;use BookTok hashtags&rdquo;. Nobody tells them which ones are full of actual book content. We scan book hashtags and, for each one, count the videos in our sample that are really on that hashtag &mdash; then rank each hashtag by its share of all the on-tag videos we sampled, so you can see which tags carry the most BookTok activity as a measured number instead of folklore. ${num(N_SCANNED)} hashtags have been scanned; the ${num(N_SHOWN)} ranked below have a scan from the on-tag filter that began on 6 October 2026, and older scans are shown with their date but not ranked. Every figure below is a snapshot with its own scan date.</p>
<div class="grid">
<div class="cell"><span class="t">Hashtags ranked</span><span class="b">${num(N_SHOWN)}</span><span class="s">of ${num(N_SCANNED)} scanned (scans from 6 October 2026 onwards)</span></div>
<div class="cell"><span class="t">Dated scans held</span><span class="b">${num(META.snapshot_rows)}</span><span class="s">since ${esc(META.first_scrape)}</span></div>
<div class="cell"><span class="t">On-tag videos sampled</span><span class="b">${num(N_VIDEOS)}</span><span class="s">across the ranked hashtags; every share below is a slice of this</span></div>
</div>
<h2>Most on-tag BookTok activity</h2>
<p>The forty hashtags with the largest share of the on-tag videos we sampled. Counted from the scan dates shown.</p>
${methodNote(CLEAN, 'all the ranked hashtags')}
${table(top, 'all', 'Share of all sampled')}
<h2>By subgenre</h2>
<p>${LANES.length} lanes carry at least ${MIN_TAGS} hashtags of their own, which is the floor for giving a lane its own page &mdash; below that there is nothing on it you would not already have from the general list above. The general hashtags apply to every lane.</p>
<ul class="lanes">${LANES.map((l) => `<li><a href="/booktok-hashtags/${esc(l)}">${esc(laneName(l))}</a> <span style="color:#a39395">&middot; ${BY_LANE[l].length}</span></li>`).join('')}</ul>
${methodBlock()}
${embedBlock('')}
${tieBack('<li><a href="/trope-pairs/">Trope Pair Finder</a> &mdash; the trope pairings named together in reader reviews and posts, set against the tagged titles that carry both.</li>')}
<div class="cta-row"><a class="btn" href="/intake/">Build my Map &rarr;</a> &nbsp; <a href="/pricing/">See pricing</a></div>
</div>` +
		foot()
	);
}

function lanePage(lane) {
	const canonical = SITE + '/booktok-hashtags/' + lane;
	const rows = BY_LANE[lane];
	const name = laneName(lane);
	const general = GENERAL.filter(isClean).slice(0, 15);
	const bestClean = rows.find(isClean);
	const best = bestClean || rows[0];
	const shared = bestClean && shareable(bestClean);
	const laneRanked = rows.filter(isClean).length;
	const desc =
		name +
		' BookTok hashtags: ' +
		rows.length +
		' mapped to this lane' +
		(bestClean
			? ', led by #' + best[H] + (shared ? ' with ' + pct(best[LSH]) + ' of the on-tag BookTok videos we sampled for the lane' : ' (' + best[VIDS] + ' on-tag videos sampled)') + ', scanned ' + best[ON]
			: ', none yet with a ranked scan (scans from 6 October 2026 onwards)') +
		'. Measured, dated, free.';

	const ld = [
		app({
			name: name + ' BookTok hashtags',
			url: canonical,
			description: desc,
			featureList: [
				'BookTok hashtags mapped to ' + name,
				'Share of the lane\'s on-tag BookTok videos sampled, per hashtag',
				'On-tag videos in the scan (a sample of the tag page, not a count of videos using the hashtag)',
				'General BookTok hashtags with the most on-tag activity alongside',
				'Every figure carries its scan date',
				'JSON output'
			],
			asOf: AS_OF,
			dataset: canonical + '#dataset'
		}),
		datasetNode(
			canonical + '#dataset',
			name + ' - BookTok hashtag scans',
			'Dated scans of the ' + rows.length + ' BookTok hashtags mapped to ' + name + ', each recording the on-tag videos found in the sample and the hashtag\'s share of the lane\'s on-tag videos.',
			canonical,
			rows
		),
		breadcrumb(name, canonical, 'BookTok Hashtag Picker', SITE + '/booktok-hashtags/')
	];

	return (
		head(name + ' BookTok hashtags - share of on-tag activity | Tropesmith', desc, canonical, ld) +
		`<div class="wrap">
<div class="eyebrow">Free tool &middot; Dated snapshot &middot; No account</div>
<h1>${esc(name)} &mdash; BookTok hashtags, measured</h1>
<p class="lede">${esc(desc)}</p>
<div class="grid">
<div class="cell"><span class="t">Hashtags in this lane</span><span class="b">${num(rows.length)}</span><span class="s">mapped to ${esc(name)}; ${num(laneRanked)} with a ranked scan</span></div>
<div class="cell"><span class="t">Largest share of the lane</span><span class="b">${shared ? pct(best[LSH]) : '&mdash;'}</span><span class="s">${
			bestClean
				? (shared ? '' : 'not shown: fewer than ' + MIN_TAGS + ' ranked hashtags &middot; ') + '#' + esc(best[H]) + ' &middot; ' + num(best[VIDS]) + ' on-tag videos sampled'
				: 'no scan from 6 October 2026 onwards yet'
		}</span></div>
<div class="cell"><span class="t">On-tag videos sampled</span><span class="b">${num(rows.filter(isClean).reduce((s, t) => s + t[VIDS], 0))}</span><span class="s">in this lane&rsquo;s ranked scans (latest ${esc(latest(rows) || 'none')})</span></div>
</div>
${methodNote(rows, 'this lane')}
${table(rows, 'lane', 'Share of this lane')}
<h2>General BookTok hashtags worth pairing with these</h2>
<p>Not tied to a subgenre; ranked scans only (6 October 2026 onwards), by their share of the general hashtags&rsquo; on-tag videos.</p>
${table(general, 'lane', 'Share of general hashtags')}
${methodBlock()}
${embedBlock(lane)}
${tieBack(
	(PAIRS[lane] ? `<li><a href="/trope-pairs/${esc(lane)}">${esc(name)} trope pairings</a> &mdash; the trope pairings named together in reader reviews and posts in this lane, set against the tagged titles that carry both.</li>` : '') +
		`<li><a href="/lane-score/${esc(lane)}">${esc(name)} lane score</a> &mdash; is the lane worth writing at all.</li>`
)}
<div class="cta-row"><a class="btn" href="/intake/">Build my ${esc(name)} Map &rarr;</a> &nbsp; <a href="/booktok-hashtags/">All hashtags</a></div>
</div>` +
		foot()
	);
}

function toJson(rows, lane) {
	return {
		ok: true,
		as_of: AS_OF,
		lane: lane || null,
		display_name: lane ? laneName(lane) : null,
		method:
			'Each row is a dated scan of a sample of that hashtag videos. on_tag_videos_sampled = videos in the sample that are on the hashtag\'s book content. share_of_lane = on_tag_videos_sampled divided by the on-tag videos of all ranked hashtags in the same lane (hashtags with no lane share the general pool); share_of_all is the same over every ranked hashtag. null = older unfiltered scan, not ranked. mean_plays_per_sampled_video is detail only: the mean of the sampled videos\' lifetime plays, not a hashtag total, not live.',
		ranked_hashtags: N_SHOWN,
		on_tag_videos_sampled_total: N_VIDEOS,
		corpus: META,
		attribution: { source: 'Tropesmith', url: SITE + '/booktok-hashtags/' + (lane || ''), publisher: 'Coral Hart Group' },
		hashtags: rows.map((t) => ({
			hashtag: t[H],
			lane: t[LANE] || null,
			scanned_on: t[ON],
			ranked: isClean(t),
			on_tag_videos_sampled: isClean(t) ? t[VIDS] : null,
			share_of_lane: shareable(t) ? Math.round(t[LSH] * 1e5) / 1e5 : null,
			share_of_all: isClean(t) ? Math.round(t[ASH] * 1e6) / 1e6 : null,
			mean_plays_per_sampled_video: isClean(t) ? t[AVG] : null
		}))
	};
}

export async function handle(context) {
	const { request } = context;
	const url = new URL(request.url);
	const segs = [].concat(context.params.lane || []).filter(Boolean);
	const json = wantsJson(request, url);
	const raw = decodeURIComponent(segs[0] || url.searchParams.get('lane') || '').trim().toLowerCase();

	if (raw && !BY_LANE[raw]) {
		const dotted = LANES.find((l) => l.replace(/[._]/g, '-') === raw);
		if (dotted) return Response.redirect(SITE + '/booktok-hashtags/' + dotted + url.search, 301);
	}

	if (!raw) {
		if (json) return jsonResponse(toJson(TAGS, ''));
		return htmlResponse(indexPage());
	}
	if (!BY_LANE[raw]) {
		if (json) return jsonResponse({ ok: false, error: 'no hashtags mapped to that lane', lanes: LANES }, 404);
		return htmlResponse(
			head('Lane not mapped | Tropesmith', 'No BookTok hashtags are mapped to that lane yet.', SITE + '/booktok-hashtags/', []) +
				`<div class="wrap"><h1>No hashtags mapped to that lane yet</h1>
<p class="lede">${LANES.length} lanes carry at least ${MIN_TAGS} hashtags of their own, which is what it takes for a lane to get its own page. The rest of the ${num(
					META.hashtags
				)} hashtags we scan are general BookTok tags, and nothing has been invented to fill the gap.</p>
<p><a href="/booktok-hashtags/">See every hashtag we scan &rarr;</a></p>${tieBack('')}</div>` +
				foot(),
			404
		);
	}
	if (json) return jsonResponse(toJson(BY_LANE[raw], raw));
	return htmlResponse(lanePage(raw));
}

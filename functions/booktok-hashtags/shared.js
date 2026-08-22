/**
 * IN-0790 — BOOKTOK HASHTAG PICKER.
 *
 * 564 BookTok hashtags, each scanned on a date, each with the number of videos we read and
 * the plays those videos carried. Nobody else in the author-tools category publishes a
 * measured reach-per-video figure for a book hashtag — the usual article says "use
 * #booktok" and stops.
 *
 * HONESTY CONSTRAINT, and it shapes every label on the page: these are NOT lifetime
 * hashtag view counts and they are NOT live. They are a dated sample — the videos we
 * scanned for that hashtag on that date. TikTok counters move hourly. Every figure is
 * therefore printed with its own scan date, and the page says the word "snapshot" before
 * it shows a single number. Data baked at build time by /root/in0790-gen/export_gen_data.py.
 */
import { AS_OF, META, LANE_NAMES, TAGS } from './data.js';
import { SITE, ORG, esc, num, big, head, foot, breadcrumb, app, pv, tieBack, jsonResponse, htmlResponse, wantsJson } from '../_gen/chrome.js';

/* [hashtag, lane, scanned_on, videos, total_plays, total_likes, avg_plays] */
const H = 0, LANE = 1, ON = 2, VIDS = 3, PLAYS = 4, LIKES = 5, AVG = 6;

/* A lane page needs its own reason to exist. 39 of the mapped lanes carry a single
   hashtag and 52 carry two; publishing those as pages would have been 91 near-duplicates
   of the same general-hashtag table — the thin-page problem the 2026-08-21 crawl audit
   already found on this domain (86 of 130 crawled pages under 300 words). Three mapped
   hashtags is the floor; below it the lane is not a page, and the index says so. */
const MIN_TAGS = 3;

const BY_LANE = (function () {
	const m = {};
	for (const t of TAGS) if (t[LANE]) (m[t[LANE]] = m[t[LANE]] || []).push(t);
	for (const k of Object.keys(m)) {
		if (m[k].length < MIN_TAGS) delete m[k];
		else m[k].sort((a, b) => b[AVG] - a[AVG]);
	}
	return m;
})();
const LANES = Object.keys(BY_LANE).sort((a, b) => (LANE_NAMES[a] || a).localeCompare(LANE_NAMES[b] || b));
const GENERAL = TAGS.filter((t) => !t[LANE]).sort((a, b) => b[AVG] - a[AVG]);
const MEDIAN_AVG = (function () {
	const v = TAGS.map((t) => t[AVG]).filter((x) => x > 0).sort((a, b) => a - b);
	return v.length ? v[Math.floor(v.length / 2)] : 0;
})();

function laneName(id) {
	return LANE_NAMES[id] || id;
}

/* Reach is compared against the median of every hashtag we track, and the comparison is
   stated. No tuned thresholds, no per-lane fudge. */
function reachPill(avg) {
	if (!avg) return ['crowded', 'Not measured'];
	if (avg >= MEDIAN_AVG * 3) return ['open', 'High reach'];
	if (avg >= MEDIAN_AVG) return ['tight', 'Above median'];
	return ['crowded', 'Below median'];
}

function row(t) {
	const p = reachPill(t[AVG]);
	return `<tr><td><b>#${esc(t[H])}</b>${t[LANE] ? `<br><span style="font-size:12.5px;color:#a39395">${esc(laneName(t[LANE]))}</span>` : ''}</td><td class="n">${num(
		t[VIDS]
	)}</td><td class="n">${big(t[PLAYS])}</td><td class="n">${num(t[AVG])}</td><td><span class="pill ${p[0]}">${esc(p[1])}</span><br><span style="font-size:12px;color:#a39395">scanned ${esc(
		t[ON]
	)}</span></td></tr>`;
}

function table(rows) {
	return `<div class="scroll"><table><thead><tr><th>Hashtag</th><th class="n">Videos scanned</th><th class="n">Plays in those videos</th><th class="n">Plays per video</th><th>Reach vs median</th></tr></thead><tbody>${rows
		.map(row)
		.join('')}</tbody></table></div>`;
}

function methodBlock() {
	return `<h2>What these numbers are &mdash; and what they are not</h2>
<p>Every row is a <b>dated snapshot</b>, not a live counter and not a lifetime total. For each hashtag we read a sample of its videos on the date shown and counted the plays those videos carried. &ldquo;Plays per video&rdquo; is that total divided by that sample. TikTok counters move by the hour; a figure scanned in May is a May figure and is labelled as one.</p>
<p><b>Reach vs median</b> compares a hashtag&rsquo;s plays per video against the median across all ${num(
		META.hashtags
	)} hashtags we track, which is <b>${num(MEDIAN_AVG)}</b> plays per video. Three times the median or better is called high reach; at or above the median, above median; below it, below median. That is the whole rule.</p>
<p>Use it the way it is built: a hashtag with high plays per video and few videos is reach you can still get into; high plays and very many videos is a hashtag you will be shouting under. It is a measurement, not a promise &mdash; nothing here predicts what your video will do.</p>
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
			'For each tracked BookTok hashtag a sample of its videos is read on a dated scan and the plays, likes and video count of that sample are recorded. Figures are counted from the scanned sample on the stated date - they are not lifetime hashtag totals and not live counters.',
		keywords: ['BookTok', 'hashtags', 'TikTok', 'book marketing', 'reach'],
		variableMeasured: [
			pv('Hashtags tracked', META.hashtags, 'hashtags', 'Distinct BookTok hashtags with at least one scan'),
			pv('Scans held', META.snapshot_rows, 'scans', 'Dated hashtag scans in the corpus'),
			pv('Subgenre lanes mapped', META.lanes, 'lanes', 'Lanes at least one hashtag is mapped to'),
			pv('Hashtags shown here', rows.length, 'hashtags', 'Rows published on this page'),
			pv('Median plays per video across all tracked hashtags', MEDIAN_AVG, 'plays per video', 'The comparison point the reach labels use')
		],
		distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: url + '?format=json' }]
	};
}

function indexPage() {
	const canonical = SITE + '/booktok-hashtags/';
	const top = TAGS.slice().sort((a, b) => b[AVG] - a[AVG]).slice(0, 40);
	const ld = [
		app({
			name: 'BookTok Hashtag Picker',
			url: canonical,
			description:
				'Free tool: ' + META.hashtags + ' BookTok hashtags with the measured plays per video from a dated scan, so you can pick hashtags on reach instead of on guesswork.',
			featureList: [
				'Measured plays per video for every tracked BookTok hashtag',
				'Videos scanned, so you can see how crowded a hashtag is',
				'Reach compared against the median of all tracked hashtags',
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
			META.snapshot_rows + ' dated scans across ' + META.hashtags + ' BookTok hashtags, each recording the videos read, the plays those videos carried and the resulting plays per video.',
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
			'BookTok Hashtag Picker - measured reach per hashtag | Tropesmith',
			META.hashtags + ' BookTok hashtags with the measured plays per video from a dated scan of their videos: pick hashtags on reach and crowding, not on guesswork. Free, no sign-up.',
			canonical,
			ld
		) +
		`<div class="wrap">
<div class="eyebrow">Free tool &middot; Dated snapshot &middot; No account</div>
<h1>BookTok Hashtag Picker</h1>
<p class="lede">Everyone tells authors to &ldquo;use BookTok hashtags&rdquo;. Nobody tells them which ones carry anything. We scan ${num(
			META.hashtags
		)} book hashtags and record, for each one, how many videos we read and how many plays those videos carried &mdash; so you can see reach and crowding as measured numbers instead of folklore. Every figure below is a snapshot with its own scan date.</p>
<div class="grid">
<div class="cell"><span class="t">Hashtags tracked</span><span class="b">${num(META.hashtags)}</span><span class="s">book hashtags under scan</span></div>
<div class="cell"><span class="t">Dated scans held</span><span class="b">${num(META.snapshot_rows)}</span><span class="s">since ${esc(META.first_scrape)}</span></div>
<div class="cell"><span class="t">Median reach</span><span class="b">${num(MEDIAN_AVG)}</span><span class="s">plays per video, across all tracked hashtags</span></div>
</div>
<h2>Highest measured reach per video</h2>
<p>The forty hashtags whose scanned videos carried the most plays each. Counted from the scan dates shown.</p>
${table(top)}
<h2>By subgenre</h2>
<p>${LANES.length} lanes carry at least ${MIN_TAGS} hashtags of their own, which is the floor for giving a lane its own page &mdash; below that there is nothing on it you would not already have from the general list above. The general hashtags apply to every lane.</p>
<ul class="lanes">${LANES.map((l) => `<li><a href="/booktok-hashtags/${esc(l)}">${esc(laneName(l))}</a> <span style="color:#a39395">&middot; ${BY_LANE[l].length}</span></li>`).join('')}</ul>
${methodBlock()}
${embedBlock('')}
${tieBack('<li><a href="/trope-pairs/">Trope Pair Finder</a> &mdash; the trope pairings readers ask for that nobody has written.</li>')}
<div class="cta-row"><a class="btn" href="/intake/">Build my Map &rarr;</a> &nbsp; <a href="/pricing/">See pricing</a></div>
</div>` +
		foot()
	);
}

function lanePage(lane) {
	const canonical = SITE + '/booktok-hashtags/' + lane;
	const rows = BY_LANE[lane];
	const name = laneName(lane);
	const general = GENERAL.slice(0, 15);
	const best = rows[0];
	const desc =
		name + ' BookTok hashtags: ' + rows.length + ' mapped to this lane, the strongest carrying ' + Number(best[AVG]).toLocaleString('en-US') +
		' plays per video when scanned on ' + best[ON] + '. Measured, dated, free.';

	const ld = [
		app({
			name: name + ' BookTok hashtags',
			url: canonical,
			description: desc,
			featureList: [
				'BookTok hashtags mapped to ' + name,
				'Measured plays per video per hashtag',
				'Videos scanned, showing how crowded each hashtag is',
				'General high-reach BookTok hashtags alongside',
				'Every figure carries its scan date',
				'JSON output'
			],
			asOf: AS_OF,
			dataset: canonical + '#dataset'
		}),
		datasetNode(
			canonical + '#dataset',
			name + ' - BookTok hashtag scans',
			'Dated scans of the ' + rows.length + ' BookTok hashtags mapped to ' + name + ', each recording videos read, plays carried and plays per video.',
			canonical,
			rows
		),
		breadcrumb(name, canonical, 'BookTok Hashtag Picker', SITE + '/booktok-hashtags/')
	];

	return (
		head(name + ' BookTok hashtags - measured reach | Tropesmith', desc, canonical, ld) +
		`<div class="wrap">
<div class="eyebrow">Free tool &middot; Dated snapshot &middot; No account</div>
<h1>${esc(name)} &mdash; BookTok hashtags, measured</h1>
<p class="lede">${esc(desc)}</p>
<div class="grid">
<div class="cell"><span class="t">Hashtags in this lane</span><span class="b">${num(rows.length)}</span><span class="s">mapped to ${esc(name)}</span></div>
<div class="cell"><span class="t">Best measured reach</span><span class="b">${num(best[AVG])}</span><span class="s">plays per video &middot; #${esc(best[H])}</span></div>
<div class="cell"><span class="t">Median across all hashtags</span><span class="b">${num(MEDIAN_AVG)}</span><span class="s">plays per video, ${num(META.hashtags)} tracked</span></div>
</div>
${table(rows)}
<h2>General BookTok hashtags worth pairing with these</h2>
<p>Not tied to a subgenre, and the highest measured reach we hold.</p>
${table(general)}
${methodBlock()}
${embedBlock(lane)}
${tieBack(
	`<li><a href="/trope-pairs/${esc(lane)}">${esc(name)} trope pairings</a> &mdash; what readers in this lane ask for that nobody has written.</li>` +
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
		method: 'Each row is a dated scan of a sample of that hashtag videos. Not a lifetime hashtag total, not live. plays_per_video = plays in the scanned videos divided by the number scanned.',
		median_plays_per_video: MEDIAN_AVG,
		corpus: META,
		attribution: { source: 'Tropesmith', url: SITE + '/booktok-hashtags/' + (lane || ''), publisher: 'Coral Hart Group' },
		hashtags: rows.map((t) => ({
			hashtag: t[H],
			lane: t[LANE] || null,
			scanned_on: t[ON],
			videos_scanned: t[VIDS],
			plays_in_scanned_videos: t[PLAYS],
			likes_in_scanned_videos: t[LIKES],
			plays_per_video: t[AVG]
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

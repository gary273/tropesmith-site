/**
 * IN-0790 — TROPE PAIR FINDER.
 *
 * The thing none of the rivals can build. Reedsy, ProWritingAid and Sudowrite earn their
 * links with generators over a word list; this one is over two counted corpora and the
 * answer changes as the market changes:
 *
 *   asks  — reader asks IN THIS LANE naming both tropes in the same request (app_demand_signals)
 *   books — published titles carrying BOTH tropes, REGISTRY-WIDE            (app_book_tropes)
 *
 * The supply side is deliberately registry-wide and not lane-scoped: app_demand_signals
 * uses canonical lane ids and app_book_tropes.primary_subgenre is a different free-text
 * vocabulary, so the two do not join. Faking that join would have printed "nobody has
 * written it" about pairings that are written. A pairing is also only published when both
 * of its tropes carry at least 5 tagged titles on their own, so a zero in the "carry both"
 * column is a real absence rather than a hole in our tagging.
 *
 * Demand in a lane against supply on the shelf. A word-list generator cannot produce a single
 * row of it. Data is baked at build time by /root/in0790-gen/export_gen_data.py — see the
 * comment at the head of that file for why baked and not live.
 */
import { AS_OF, CORPUS, TROPES, LANE_NAMES, PAIRS } from './data.js';
import { SITE, ORG, esc, num, head, foot, breadcrumb, app, pv, tieBack, jsonResponse, htmlResponse, wantsJson } from '../_gen/chrome.js';

const LANES = Object.keys(PAIRS).sort((a, b) => (LANE_NAMES[a] || a).localeCompare(LANE_NAMES[b] || b));

function laneName(id) {
	return LANE_NAMES[id] || id;
}
function tropeName(id) {
	return TROPES[id] || id;
}

/* The verdict is a RULE applied to two counted numbers, and the rule is printed on the
   page. It is not a score, not a model, and nothing about it is tuned by hand per lane. */
function verdict(asks, books) {
	if (books === 0) return ['open', 'Never written together', 'both tropes are published; no tagged title carries both'];
	const r = asks / books;
	if (r >= 10) return ['open', 'Open gap', r.toFixed(1) + ' asks per published title'];
	if (r >= 3) return ['tight', 'Thin on the shelf', r.toFixed(1) + ' asks per published title'];
	return ['crowded', 'Well served', r.toFixed(1) + ' asks per published title'];
}

/* The true ratio, used for the verdict. Undefined at zero supply, hence the Infinity. */
function ratio(p) {
	return p[3] === 0 ? Infinity : p[2] / p[3];
}

/* Ranking uses asks / (titles + 1) instead. Ranking on the true ratio sorts every
   zero-supply pairing to the top regardless of how few readers asked, which buries the
   pairings with 300 asks against 14 titles under pairings with 6 asks against none. The
   +1 keeps a genuine zero at the top only when the demand behind it is genuinely large. */
function sortByGap(a, b) {
	const ra = a[2] / (a[3] + 1), rb = b[2] / (b[3] + 1);
	if (ra === rb) return b[2] - a[2];
	return rb - ra;
}

function laneDataset(lane, rows) {
	const url = SITE + '/trope-pairs/' + lane;
	return {
		'@context': 'https://schema.org',
		'@type': 'Dataset',
		'@id': url + '#dataset',
		name: laneName(lane) + ' - trope pairings by reader demand and published supply',
		description:
			'For every trope pairing readers ask for in ' + laneName(lane) +
			', the number of parsed reader asks in that lane naming both tropes together and the number of trope-tagged published titles carrying both anywhere in the registry. ' +
			rows.length + ' pairings, counted ' + AS_OF + '.',
		url,
		isAccessibleForFree: true,
		license: SITE + '/terms/',
		creator: ORG,
		publisher: ORG,
		temporalCoverage: '2001-08-06/' + AS_OF,
		dateModified: AS_OF,
		measurementTechnique:
			'Reader posts and reviews are parsed one at a time into a structured ask and resolved to a subgenre lane and to canonical tropes; every unordered pair of tropes named in the same ask is counted once. Published supply is counted the same way over titles tagged trope by trope, across the whole registry rather than per lane, because the demand and tagging vocabularies do not join. A pairing is published only when both of its tropes carry at least five tagged titles independently. Both sides are counted rows - nothing is modelled, sampled or estimated.',
		keywords: [laneName(lane), 'trope pairings', 'reader demand', 'underserved tropes', 'book market data'],
		variableMeasured: [
			pv('Trope pairings listed', rows.length, 'pairings', 'Pairings shown for this lane'),
			pv('Reader asks behind the top pairing', rows[0][2], 'asks', 'Asks naming ' + tropeName(rows[0][0]) + ' and ' + tropeName(rows[0][1]) + ' together'),
			pv('Published titles carrying the top pairing', rows[0][3], 'titles', 'Trope-tagged titles carrying both, counted across the whole registry'),
			pv('Reader demand signals in the corpus', CORPUS.signals, 'signals', 'Total parsed reader asks the pairing counts are drawn from'),
			pv('Trope-tagged titles in the corpus', CORPUS.tagged_titles, 'titles', 'Distinct published titles tagged trope by trope')
		],
		distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: url + '?format=json' }],
		isPartOf: { '@id': SITE + '/trope-pairs/#dataset' }
	};
}

function embedBlock(lane) {
	const snip = `<div id="tropesmith-trope-pairs"></div>\n<script src="${SITE}/embed/trope-pairs.js?lane=${encodeURIComponent(lane)}" async></script>`;
	return `<h2>Put this on your own site</h2>
<p class="note">Free to embed on any blog, newsletter template or author site. The widget renders the pairing board for this lane and must keep its visible &ldquo;Data: Tropesmith&rdquo; credit link &mdash; that link back to tropesmith.com is the licence, and it is written into the payload server-side so it cannot be shipped without it.</p>
<pre class="embed">${esc(snip)}</pre>
<p style="font-size:14px">Prefer an iframe? <code>&lt;iframe src="${esc(SITE + '/embed/trope-pairs?lane=' + encodeURIComponent(lane))}" width="100%" height="440" style="border:0" loading="lazy" title="Tropesmith trope pairings"&gt;&lt;/iframe&gt;</code></p>`;
}

function methodBlock() {
	return `<h2>How these numbers are made</h2>
<p><b>Reader asks</b> is a counted number: parsed reader requests &mdash; from Goodreads and Amazon reviews and Q&amp;A, Reddit and BookTok &mdash; in which a reader writing about <em>this lane</em> named <em>both</em> tropes in the same request. ${num(
		CORPUS.signals
	)} reader signals sit behind it. <b>Titles carrying both</b> is counted the same way over published titles tagged trope by trope: ${num(
		CORPUS.tagged_titles
	)} distinct titles, ${num(CORPUS.tag_rows)} trope tags. Neither number is modelled, sampled or estimated.</p>
<p>Two things to be straight about. The supply count is <b>registry-wide, not lane-scoped</b> &mdash; our demand data and our title tagging use different subgenre vocabularies, and rather than fake a join we count titles carrying both tropes anywhere in the tagged registry. And a pairing is only listed when <b>both of its tropes carry at least five tagged titles on their own</b> (the two figures are printed under each pairing), so a zero in the &ldquo;carrying both&rdquo; column means the pairing really is unwritten in what we have tagged, not that we simply never tagged the trope.</p>
<p>The verdict column is a <b>rule</b>, printed here so you can apply it yourself: ten or more asks per published title is an <b>open gap</b>; three to ten is <b>thin on the shelf</b>; below three is <b>well served</b>; and a pairing readers ask for that no tagged title in the lane carries at all is called out as such. Pairings with fewer than three asks are not listed &mdash; too few to mean anything.</p>
<p><b>What it is not.</b> It is not a sales forecast and it is not advice to write anything. A gap can be a gap because readers ask and nobody delivers, or because the pairing does not work. That judgement is yours; the counting is ours. Counted ${esc(
		AS_OF
	)} and restated whenever the corpus is recounted &mdash; the raw JSON behind any lane is one query string away.</p>`;
}

function indexPage() {
	const canonical = SITE + '/trope-pairs/';
	let totalPairs = 0;
	for (const l of LANES) totalPairs += PAIRS[l].length;

	/* the strongest gaps across every lane - this is the screenshot */
	const best = [];
	for (const l of LANES) for (const p of PAIRS[l]) best.push([l, p]);
	best.sort((a, b) => sortByGap(a[1], b[1]));
	/* One row per lane and at most two per trope. Without this the table is five rows of
	   "Whodunit" from five different mystery lanes: true, but it reads as one finding
	   repeated rather than twelve, and it hides every romance lane below the fold. */
	const seenLane = new Set();
	const tropeUse = {};
	const top = [];
	for (const [l, p] of best) {
		if (top.length >= 12) break;
		if (seenLane.has(l)) continue;
		if ((tropeUse[p[0]] || 0) >= 2 || (tropeUse[p[1]] || 0) >= 2) continue;
		seenLane.add(l);
		tropeUse[p[0]] = (tropeUse[p[0]] || 0) + 1;
		tropeUse[p[1]] = (tropeUse[p[1]] || 0) + 1;
		top.push([l, p]);
	}

	const ld = [
		app({
			name: 'Trope Pair Finder',
			url: canonical,
			description:
				'Free tool: for any fiction subgenre, the trope pairings readers ask for together and how many published titles in our trope-tagged registry actually deliver them - counted reader asks against counted published supply.',
			featureList: [
				'Trope pairings ranked by reader demand against published supply',
				'Counted reader asks per pairing, not estimates',
				'Counted published titles carrying the same pairing',
				'Open-gap / thin / well-served verdict from a published rule',
				'Embeddable widget with attribution',
				'JSON output',
				'No account, no card, works with JavaScript off'
			],
			asOf: AS_OF,
			dataset: canonical + '#dataset'
		}),
		{
			'@context': 'https://schema.org',
			'@type': 'Dataset',
			'@id': canonical + '#dataset',
			name: 'Tropesmith trope-pairing demand-vs-supply index',
			description:
				totalPairs + ' trope pairings across ' + LANES.length +
				' fiction subgenre lanes, each with the number of parsed reader asks naming both tropes together and the number of trope-tagged published titles carrying both. Counted ' + AS_OF + '.',
			url: canonical,
			isAccessibleForFree: true,
			license: SITE + '/terms/',
			creator: ORG,
			publisher: ORG,
			temporalCoverage: '2001-08-06/' + AS_OF,
			dateModified: AS_OF,
			measurementTechnique:
				'Reader posts and reviews are parsed into structured asks, resolved to a subgenre lane and to canonical tropes; every unordered pair named in the same ask is counted once. Published supply is counted the same way over trope-tagged titles. Counted rows only.',
			keywords: ['trope pairings', 'reader demand', 'underserved tropes', 'book market data', 'romance tropes'],
			variableMeasured: [
				pv('Trope pairings published', totalPairs, 'pairings', 'Pairings listed across all covered lanes'),
				pv('Subgenre lanes covered', LANES.length, 'lanes', 'Lanes with enough pairings to publish'),
				pv('Reader demand signals in the corpus', CORPUS.signals, 'signals', 'Parsed reader asks the demand side is counted from'),
				pv('Named tropes in the taxonomy', CORPUS.tropes_taxonomy, 'tropes', 'Canonical tropes a pairing can be built from'),
				pv('Trope-tagged titles in the corpus', CORPUS.tagged_titles, 'titles', 'Published titles the supply side is counted from'),
				pv('Distinct pairings counted on the demand side', CORPUS.pair_demand_rows, 'pairings', 'Lane-and-pair combinations with at least one reader ask')
			],
			distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: canonical + '?format=json' }]
		},
		{
			'@context': 'https://schema.org',
			'@type': 'ItemList',
			name: 'Trope pairings by subgenre',
			numberOfItems: LANES.length,
			itemListElement: LANES.map((l, i) => ({ '@type': 'ListItem', position: i + 1, name: laneName(l) + ' trope pairings', url: SITE + '/trope-pairs/' + l }))
		},
		breadcrumb('Trope Pair Finder', canonical)
	];

	const rows = top
		.map(([l, p]) => {
			const v = verdict(p[2], p[3]);
			return `<tr><td><a href="/trope-pairs/${esc(l)}">${esc(laneName(l))}</a></td><td><b>${esc(tropeName(p[0]))}</b> + <b>${esc(
				tropeName(p[1])
			)}</b></td><td class="n">${num(p[2])}</td><td class="n">${num(p[3])}</td><td><span class="pill ${v[0]}">${esc(v[1])}</span></td></tr>`;
		})
		.join('');

	return (
		head(
			'Trope Pair Finder - what readers ask for and nobody writes | Tropesmith',
			'Free trope pairing tool: ' + totalPairs + ' trope pairings across ' + LANES.length +
				' subgenres, each with the counted reader asks naming both tropes together and the counted published titles that carry both.',
			canonical,
			ld
		) +
		`<div class="wrap">
<div class="eyebrow">Free tool &middot; Counted, not estimated &middot; No account</div>
<h1>Trope Pair Finder</h1>
<p class="lede">Readers do not ask for one trope. They ask for two at once &mdash; and the pairing they ask for is very often not the pairing on the shelf. This puts the two counts side by side: how many readers in a lane asked for both tropes together, and how many published titles in our trope-tagged registry actually carry both.</p>
<div class="grid">
<div class="cell"><span class="t">Pairings published</span><span class="b">${num(totalPairs)}</span><span class="s">across ${LANES.length} subgenre lanes</span></div>
<div class="cell"><span class="t">Reader signals behind them</span><span class="b">${num(CORPUS.signals)}</span><span class="s">parsed reader asks</span></div>
<div class="cell"><span class="t">Titles on the supply side</span><span class="b">${num(CORPUS.tagged_titles)}</span><span class="s">tagged trope by trope</span></div>
</div>
<h2>The widest gaps we can currently count</h2>
<p>One pairing per lane, ranked by reader asks against what is on the shelf. Every row is two counted numbers and the rule below applied to them. Counted ${esc(AS_OF)}.</p>
<div class="scroll"><table><thead><tr><th>Lane</th><th>Pairing readers ask for</th><th class="n">Reader asks</th><th class="n">Titles carrying both</th><th>Verdict</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2>Pick your lane</h2>
<ul class="lanes">${LANES.map((l) => `<li><a href="/trope-pairs/${esc(l)}">${esc(laneName(l))}</a> <span style="color:#a39395">&middot; ${PAIRS[l].length}</span></li>`).join('')}</ul>
${methodBlock()}
${tieBack('<li><a href="/trending/">Free Romance Trope Opportunity Check</a> &mdash; single tropes rising, crowded and cooling in your lane.</li><li><a href="/booktok-hashtags/">BookTok Hashtag Picker</a> &mdash; measured reach per book hashtag.</li>')}
<div class="cta-row"><a class="btn" href="/intake/">Build my Map &rarr;</a> &nbsp; <a href="/pricing/">See pricing</a></div>
</div>` +
		foot()
	);
}

function lanePage(lane) {
	const canonical = SITE + '/trope-pairs/' + lane;
	const rows = PAIRS[lane].slice().sort(sortByGap);
	const name = laneName(lane);
	const openCount = rows.filter((p) => ratio(p) >= 10).length;
	const unwritten = rows.filter((p) => p[3] === 0).length;

	const desc =
		name + ': ' + rows.length + ' trope pairings readers ask for, each with the counted reader asks in this lane naming both tropes together and the counted trope-tagged titles carrying both. ' +
		(openCount ? openCount + ' are open gaps. ' : '') + 'Free, no sign-up.';

	const ld = [
		app({
			name: name + ' Trope Pair Finder',
			url: canonical,
			description: desc,
			featureList: [
				'Trope pairings for ' + name + ' ranked by demand against supply',
				'Counted reader asks per pairing',
				'Counted published titles carrying the same pairing',
				'Open-gap / thin / well-served verdict from a published rule',
				'Embeddable widget with attribution',
				'JSON output'
			],
			asOf: AS_OF,
			dataset: canonical + '#dataset'
		}),
		laneDataset(lane, rows),
		breadcrumb(name, canonical, 'Trope Pair Finder', SITE + '/trope-pairs/')
	];

	const body = rows
		.map((p) => {
			const v = verdict(p[2], p[3]);
			return `<tr><td><b>${esc(tropeName(p[0]))}</b> + <b>${esc(tropeName(p[1]))}</b><br><span style="font-size:12px;color:#a39395">separately: ${num(
				p[4]
			)} and ${num(p[5])} tagged titles</span></td><td class="n">${num(p[2])}</td><td class="n">${num(
				p[3]
			)}</td><td><span class="pill ${v[0]}">${esc(v[1])}</span><br><span style="font-size:12.5px;color:#a39395">${esc(v[2])}</span></td></tr>`;
		})
		.join('');

	const others = LANES.filter((l) => l !== lane).slice(0, 12);

	return (
		head(name + ' trope pairings - reader demand vs what is published | Tropesmith', desc, canonical, ld) +
		`<div class="wrap">
<div class="eyebrow">Free tool &middot; Counted, not estimated &middot; No account</div>
<h1>${esc(name)} &mdash; trope pairings readers ask for</h1>
<p class="lede">${esc(desc)}</p>
<div class="grid">
<div class="cell"><span class="t">Pairings counted</span><span class="b">${num(rows.length)}</span><span class="s">in this lane, three asks or more</span></div>
<div class="cell"><span class="t">Open gaps</span><span class="b">${num(openCount)}</span><span class="s">ten or more asks per published title</span></div>
<div class="cell"><span class="t">Never written together</span><span class="b">${num(unwritten)}</span><span class="s">both tropes published, no tagged title carries both</span></div>
</div>
<div class="scroll"><table><thead><tr><th>Pairing readers ask for</th><th class="n">Reader asks<br>in this lane</th><th class="n">Titles carrying<br>both</th><th>Verdict</th></tr></thead><tbody>${body}</tbody></table></div>
${methodBlock()}
${embedBlock(lane)}
${tieBack(
	`<li><a href="/lane-score/${esc(lane)}">${esc(name)} lane score</a> &mdash; is the lane itself worth writing: opportunity rank, typical price, Kindle Unlimited share.</li>` +
		`<li><a href="/booktok-hashtags/${esc(lane)}">${esc(name)} BookTok hashtags</a> &mdash; measured reach per hashtag in this lane.</li>`
)}
<h2>Other lanes</h2>
<ul class="lanes">${others.map((l) => `<li><a href="/trope-pairs/${esc(l)}">${esc(laneName(l))}</a></li>`).join('')}</ul>
<div class="cta-row"><a class="btn" href="/intake/">Build my ${esc(name)} Map &rarr;</a> &nbsp; <a href="/pricing/">See pricing</a> &nbsp; <a href="/trope-pairs/">All lanes</a></div>
</div>` +
		foot()
	);
}

function laneJson(lane) {
	const rows = PAIRS[lane].slice().sort(sortByGap);
	return {
		ok: true,
		lane,
		display_name: laneName(lane),
		as_of: AS_OF,
		method: 'reader_asks = parsed reader requests in this lane naming both tropes together. published_titles_carrying_both = trope-tagged titles carrying both, counted across the whole registry (demand and tagging use different subgenre vocabularies and are not joined). A pairing is only published when both tropes carry at least 5 tagged titles independently. Counted rows, not estimates.',
		attribution: { source: 'Tropesmith', url: SITE + '/trope-pairs/' + lane, publisher: 'Coral Hart Group' },
		corpus: CORPUS,
		pairs: rows.map((p) => {
			const v = verdict(p[2], p[3]);
			return {
				trope_a: p[0],
				trope_a_name: tropeName(p[0]),
				trope_b: p[1],
				trope_b_name: tropeName(p[1]),
				reader_asks: p[2],
				published_titles_carrying_both: p[3],
				published_titles_with_trope_a: p[4],
				published_titles_with_trope_b: p[5],
				asks_per_title: p[3] === 0 ? null : Number((p[2] / p[3]).toFixed(2)),
				verdict: v[1]
			};
		})
	};
}

export async function handle(context) {
	const { request } = context;
	const url = new URL(request.url);
	const segs = [].concat(context.params.lane || []).filter(Boolean);
	const json = wantsJson(request, url);
	const raw = decodeURIComponent(segs[0] || url.searchParams.get('lane') || '').trim().toLowerCase();

	/* dashed alias -> canonical dotted id, 301 so link equity lands on one URL */
	if (raw && !PAIRS[raw]) {
		const dotted = LANES.find((l) => l.replace(/[._]/g, '-') === raw);
		if (dotted) return Response.redirect(SITE + '/trope-pairs/' + dotted + url.search, 301);
	}

	if (!raw) {
		if (json)
			return jsonResponse({
				ok: true,
				as_of: AS_OF,
				corpus: CORPUS,
				attribution: { source: 'Tropesmith', url: SITE + '/trope-pairs/', publisher: 'Coral Hart Group' },
				lanes: LANES.map((l) => ({ lane: l, display_name: laneName(l), pairs: PAIRS[l].length, url: SITE + '/trope-pairs/' + l }))
			});
		return htmlResponse(indexPage());
	}

	if (!PAIRS[raw]) {
		if (json) return jsonResponse({ ok: false, error: 'no pairing data for that lane', lanes: LANES }, 404);
		return htmlResponse(
			head('Lane not covered | Tropesmith', 'We do not publish trope pairings for that lane yet.', SITE + '/trope-pairs/', []) +
				`<div class="wrap"><h1>No pairings for that lane yet</h1>
<p class="lede">We publish pairings for ${LANES.length} lanes. A lane appears here once it carries at least eight pairings with three or more reader asks each &mdash; below that the numbers are too thin to mean anything, and we would rather show you nothing than something invented.</p>
<p><a href="/trope-pairs/">See every lane we do cover &rarr;</a></p>${tieBack('')}</div>` +
				foot(),
			404
		);
	}

	if (json) return jsonResponse(laneJson(raw));
	return htmlResponse(lanePage(raw));
}

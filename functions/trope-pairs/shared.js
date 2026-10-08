/**
 * IN-0790 — TROPE PAIR FINDER.
 *
 * The thing none of the rivals can build. Reedsy, ProWritingAid and Sudowrite earn their
 * links with generators over a word list; this one is over two counted corpora and the
 * answer changes as the market changes:
 *
 *   signals — demand signals IN THIS LANE naming both tropes (app_demand_signals; a demand signal is one specific thing a reader asked for or praised in a review, comment or post)
 *   books — published titles carrying BOTH tropes, REGISTRY-WIDE            (app_book_tropes)
 *
 * The supply side is deliberately registry-wide and not lane-scoped: app_demand_signals
 * uses canonical lane ids and app_book_tropes.primary_subgenre is a different free-text
 * vocabulary, so the two do not join. Faking that join would have printed "nobody has
 * written it" about pairings that are written. A pairing is also only published when both
 * of its tropes carry at least 5 tagged titles on their own, so a zero in the "carry both"
 * column is a pairing absent from the TAGGED registry, not proof that no book on the shelf has it.
 *
 * TS-1095: the old labels (asks, reader asks, gap verdicts) were wrong words for what is counted (rows are signals from
 * reviews and posts, 95% reviews; the supply side is a registry of tagged titles). The verdicts now name the ratio they apply.
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
	if (books === 0) return ['open', 'No tagged title carries both', 'both tropes have tagged titles; none of them carries both'];
	const r = asks / books;
	if (r >= 10) return ['open', '10+ signals per tagged title', r.toFixed(1) + ' demand signals per tagged title'];
	if (r >= 3) return ['tight', '3-10 signals per tagged title', r.toFixed(1) + ' demand signals per tagged title'];
	return ['crowded', 'under 3 signals per tagged title', r.toFixed(1) + ' demand signals per tagged title'];
}

/* The true ratio, used for the verdict. Undefined at zero supply, hence the Infinity. */
function ratio(p) {
	return p[3] === 0 ? Infinity : p[2] / p[3];
}

/* Ranking uses signals / (titles + 1) instead. Ranking on the true ratio sorts every
   zero-supply pairing to the top regardless of how few signals sit behind it, which buries the
   pairings with 300 signals against 14 titles under pairings with 6 signals against none. The
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
		name: laneName(lane) + ' - trope pairings by demand signals and tagged titles',
		description:
			'For every trope pairing named together in reader reviews, comments and posts in ' + laneName(lane) +
			', the number of demand signals in that lane naming both tropes and the number of trope-tagged titles carrying both anywhere in the registry. ' +
			rows.length + ' pairings, counted ' + AS_OF + '.',
		url,
		isAccessibleForFree: true,
		license: SITE + '/terms/',
		creator: ORG,
		publisher: ORG,
		temporalCoverage: '2001-08-06/' + AS_OF,
		dateModified: AS_OF,
		measurementTechnique:
			'Reader reviews, comments and posts are parsed one at a time into demand signals (a specific thing a reader asked for or praised) and resolved to a subgenre lane and to canonical tropes; every unordered pair of tropes named in the same signal is counted once. Published supply is counted the same way over titles tagged trope by trope, across the whole registry rather than per lane, because the demand and tagging vocabularies do not join. A pairing is published only when both of its tropes carry at least five tagged titles independently. Both sides are counted rows - nothing is modelled, sampled or estimated.',
		keywords: [laneName(lane), 'trope pairings', 'demand signals', 'tagged titles', 'book market data'],
		variableMeasured: [
			pv('Trope pairings listed', rows.length, 'pairings', 'Pairings shown for this lane'),
			pv('Demand signals behind the top pairing', rows[0][2], 'signals', 'Signals naming ' + tropeName(rows[0][0]) + ' and ' + tropeName(rows[0][1]) + ' together'),
			pv('Published titles carrying the top pairing', rows[0][3], 'titles', 'Trope-tagged titles carrying both, counted across the whole registry'),
			pv('Demand-signal records in the corpus', CORPUS.signals, 'records', 'Rows of the demand-signal table the pairing counts are drawn from'),
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
<p><b>Demand signals</b> is a counted number: specific things readers asked for or praised &mdash; picked out of Goodreads and Amazon reviews and Q&amp;A, Reddit posts and BookTok comments &mdash; in which a reader writing about <em>this lane</em> named <em>both</em> tropes. Most come from reviews, not from readers asking for a book. ${num(
		CORPUS.signals
	)} demand-signal records are in the corpus the counts are drawn from. <b>Titles carrying both</b> is counted the same way over published titles tagged trope by trope: ${num(
		CORPUS.tagged_titles
	)} distinct titles, ${num(CORPUS.tag_rows)} trope tags. Neither number is modelled, sampled or estimated.</p>
<p>Two things to be straight about. The supply count is <b>registry-wide, not lane-scoped</b> &mdash; our demand data and our title tagging use different subgenre vocabularies, and rather than fake a join we count titles carrying both tropes anywhere in the tagged registry. And a pairing is only listed when <b>both of its tropes carry at least five tagged titles on their own</b> (the two figures are printed under each pairing), so a zero in the &ldquo;carrying both&rdquo; column means no title in our tagged registry carries the pairing &mdash; not that no book on the shelf does, since the registry holds only the titles Tropesmith has tagged.</p>
<p>The verdict column is a <b>rule</b>, printed here so you can apply it yourself: ten or more demand signals per tagged title is the top band, three to ten the middle band and below three the bottom band; and a pairing that no tagged title carries at all is called out as such. It describes the ratio of two counts, not the market. Pairings with fewer than three signals are not listed &mdash; too few to mean anything.</p>
<p><b>What it is not.</b> It is not a sales forecast and it is not advice to write anything. A low count of tagged titles can mean few books deliver the pairing, that few titles have been tagged, or that the pairing does not work. That judgement is yours; the counting is ours. Counted ${esc(
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
				'Free tool: for any fiction subgenre, the trope pairings named together in reader reviews, comments and posts and how many titles in our trope-tagged registry carry both - counted demand signals against counted tagged titles.',
			featureList: [
				'Trope pairings ranked by demand signals against tagged titles',
				'Counted demand signals per pairing, not estimates',
				'Counted tagged titles carrying the same pairing',
				'Signals-per-tagged-title band from a published rule',
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
				' fiction subgenre lanes, each with the number of demand signals naming both tropes together and the number of trope-tagged titles carrying both. Counted ' + AS_OF + '.',
			url: canonical,
			isAccessibleForFree: true,
			license: SITE + '/terms/',
			creator: ORG,
			publisher: ORG,
			temporalCoverage: '2001-08-06/' + AS_OF,
			dateModified: AS_OF,
			measurementTechnique:
				'Reader reviews, comments and posts are parsed into demand signals, resolved to a subgenre lane and to canonical tropes; every unordered pair named in the same signal is counted once. Tagged titles are counted the same way over trope-tagged titles. Counted rows only.',
			keywords: ['trope pairings', 'demand signals', 'tagged titles', 'book market data', 'romance tropes'],
			variableMeasured: [
				pv('Trope pairings published', totalPairs, 'pairings', 'Pairings listed across all covered lanes'),
				pv('Subgenre lanes covered', LANES.length, 'lanes', 'Lanes with enough pairings to publish'),
				pv('Demand-signal records in the corpus', CORPUS.signals, 'records', 'Rows of the demand-signal table the demand side is counted from'),
				pv('Named tropes in the taxonomy', CORPUS.tropes_taxonomy, 'tropes', 'Canonical tropes a pairing can be built from'),
				pv('Trope-tagged titles in the corpus', CORPUS.tagged_titles, 'titles', 'Published titles the supply side is counted from'),
				pv('Distinct pairings counted on the demand side', CORPUS.pair_demand_rows, 'pairings', 'Lane-and-pair combinations with at least one demand signal')
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
			'Trope Pair Finder - trope pairings in reader reviews vs tagged titles | Tropesmith',
			'Free trope pairing tool: ' + totalPairs + ' trope pairings across ' + LANES.length +
				' subgenres, each with the counted demand signals naming both tropes together and the counted tagged titles that carry both.',
			canonical,
			ld
		) +
		`<div class="wrap">
<div class="eyebrow">Free tool &middot; Counted, not estimated &middot; No account</div>
<h1>Trope Pair Finder</h1>
<p class="lede">Readers rarely write about one trope at a time. This puts two counts side by side: how many demand signals in a lane name both tropes together, and how many titles in our trope-tagged registry carry both. A demand signal is one specific thing a reader asked for or praised in a review, comment or post.</p>
<div class="grid">
<div class="cell"><span class="t">Pairings published</span><span class="b">${num(totalPairs)}</span><span class="s">across ${LANES.length} subgenre lanes</span></div>
<div class="cell"><span class="t">Demand-signal records in the corpus</span><span class="b">${num(CORPUS.signals)}</span><span class="s">rows of the demand-signal table, from reviews, comments and posts</span></div>
<div class="cell"><span class="t">Titles on the supply side</span><span class="b">${num(CORPUS.tagged_titles)}</span><span class="s">tagged trope by trope</span></div>
</div>
<h2>Pairings with many demand signals and few tagged titles</h2>
<p>One pairing per lane, ranked by demand signals divided by (tagged titles + 1). Every row is two counted numbers and the rule below applied to them. Counted ${esc(AS_OF)}.</p>
<div class="scroll"><table><thead><tr><th>Lane</th><th>Pairing named together</th><th class="n">Demand signals</th><th class="n">Tagged titles carrying both</th><th>Verdict</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2>Pick your lane</h2>
<ul class="lanes">${LANES.map((l) => `<li><a href="/trope-pairs/${esc(l)}">${esc(laneName(l))}</a> <span style="color:#a39395">&middot; ${PAIRS[l].length}</span></li>`).join('')}</ul>
${methodBlock()}
${tieBack('<li><a href="/trending/">Free Romance Trope Opportunity Check</a> &mdash; single tropes in your lane.</li><li><a href="/booktok-hashtags/">BookTok Hashtag Picker</a> &mdash; measured reach per book hashtag.</li>')}
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
		name + ': ' + rows.length + ' trope pairings named together in reader reviews, comments and posts, each with the counted demand signals in this lane naming both tropes and the counted trope-tagged titles carrying both. ' +
		(openCount ? openCount + ' have 10 or more demand signals per tagged title. ' : '') + 'Free, no sign-up.';

	const ld = [
		app({
			name: name + ' Trope Pair Finder',
			url: canonical,
			description: desc,
			featureList: [
				'Trope pairings for ' + name + ' ranked by demand signals against tagged titles',
				'Counted demand signals per pairing',
				'Counted tagged titles carrying the same pairing',
				'Signals-per-tagged-title band from a published rule',
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
		head(name + ' trope pairings - demand signals vs tagged titles | Tropesmith', desc, canonical, ld) +
		`<div class="wrap">
<div class="eyebrow">Free tool &middot; Counted, not estimated &middot; No account</div>
<h1>${esc(name)} &mdash; trope pairings in reader reviews and posts</h1>
<p class="lede">${esc(desc)}</p>
<div class="grid">
<div class="cell"><span class="t">Pairings counted</span><span class="b">${num(rows.length)}</span><span class="s">in this lane, three demand signals or more</span></div>
<div class="cell"><span class="t">10+ signals per tagged title</span><span class="b">${num(openCount)}</span><span class="s">pairings in this lane</span></div>
<div class="cell"><span class="t">No tagged title carries both</span><span class="b">${num(unwritten)}</span><span class="s">both tropes have tagged titles, none carries both</span></div>
</div>
<div class="scroll"><table><thead><tr><th>Pairing named together</th><th class="n">Demand signals<br>in this lane</th><th class="n">Tagged titles<br>carrying both</th><th>Verdict</th></tr></thead><tbody>${body}</tbody></table></div>
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
		method: 'demand_signals = demand signals (specific things readers asked for or praised in reviews, comments and posts) in this lane naming both tropes together. tagged_titles_carrying_both = trope-tagged titles carrying both, counted across the whole registry (demand and tagging use different subgenre vocabularies and are not joined). A pairing is only published when both tropes carry at least 5 tagged titles independently. Counted rows, not estimates.',
		attribution: { source: 'Tropesmith', url: SITE + '/trope-pairs/' + lane, publisher: 'Coral Hart Group' },
		corpus: CORPUS,
		pairs: rows.map((p) => {
			const v = verdict(p[2], p[3]);
			return {
				trope_a: p[0],
				trope_a_name: tropeName(p[0]),
				trope_b: p[1],
				trope_b_name: tropeName(p[1]),
				demand_signals: p[2],
				tagged_titles_carrying_both: p[3],
				tagged_titles_with_trope_a: p[4],
				tagged_titles_with_trope_b: p[5],
				demand_signals_per_tagged_title: p[3] === 0 ? null : Number((p[2] / p[3]).toFixed(2)),
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
<p class="lede">We publish pairings for ${LANES.length} lanes. A lane appears here once it carries at least eight pairings with three or more demand signals each &mdash; below that the numbers are too thin to mean anything, and we would rather show you nothing than something invented.</p>
<p><a href="/trope-pairs/">See every lane we do cover &rarr;</a></p>${tieBack('')}</div>` +
				foot(),
			404
		);
	}

	if (json) return jsonResponse(laneJson(raw));
	return htmlResponse(lanePage(raw));
}

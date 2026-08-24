#!/usr/bin/env node
/**
 * TS-0578 — Dataset JSON-LD guard for tropesmith.com.
 *
 * Google Search Console rejects a Dataset with no `description` (critical — the page
 * cannot appear as a dataset result) and warns on a missing `creator`. Both are easy to
 * lose in a NESTED node: an `isPartOf` / `hasPart` / ItemList item that is typed
 * '@type': 'Dataset' but carries only a name and a url is a Dataset as far as Google is
 * concerned, and it inherits nothing from its parent. That is exactly how 43 lane pages
 * shipped the alert of 2026-08-24.
 *
 * This walks EVERY ld+json block on EVERY sitemap URL, recurses into every nested object,
 * and exits non-zero if any Dataset node is missing name, description or creator, or if
 * its creator is a bare cross-domain {'@id': …} with nothing travelling alongside it
 * (IN-0873). Run it after any deploy that touches schema:
 *
 *     node tools/check-dataset-schema.mjs                      # live site, full sitemap
 *     node tools/check-dataset-schema.mjs https://…/sitemap.xml
 */
const SITEMAP = process.argv[2] || 'https://tropesmith.com/sitemap.xml';
const UA = 'TropesmithSchemaGuard/1.0 (+https://tropesmith.com/)';
const REQUIRED = ['name', 'description', 'creator'];

async function get(url) {
	const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,application/xml' } });
	if (!r.ok) throw new Error('HTTP ' + r.status);
	return r.text();
}

async function urlsFrom(sm) {
	const xml = await get(sm);
	const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1]);
	if (!xml.includes('<sitemapindex')) return locs;
	const out = [];
	for (const l of locs) out.push(...(await urlsFrom(l)));
	return out;
}

function walk(node, path, hits) {
	if (Array.isArray(node)) node.forEach((v, i) => walk(v, path + '[' + i + ']', hits));
	else if (node && typeof node === 'object') {
		const t = node['@type'];
		const types = Array.isArray(t) ? t : t ? [t] : [];
		if (types.includes('Dataset')) hits.push([path, node]);
		for (const [k, v] of Object.entries(node)) if (k !== '@type' && k !== '@context') walk(v, path + '.' + k, hits);
	}
}

function faults(node) {
	const missing = REQUIRED.filter((f) => {
		const v = node[f];
		return v == null || (typeof v === 'string' && !v.trim());
	});
	const c = node.creator;
	if (c && typeof c === 'object' && !Array.isArray(c) && Object.keys(c).length === 1 && c['@id']) missing.push('creator-is-a-bare-@id');
	return missing;
}

async function checkPage(url) {
	let html;
	try {
		html = await get(url);
	} catch (e) {
		return { url, fetchError: String(e.message || e), datasets: 0, bad: [] };
	}
	const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].replace(/\\u003c/g, '<'));
	const bad = [];
	let datasets = 0;
	blocks.forEach((b, i) => {
		let data;
		try {
			data = JSON.parse(b);
		} catch (e) {
			bad.push({ path: 'block[' + i + ']', missing: ['JSON_PARSE_FAIL: ' + e.message], name: '' });
			return;
		}
		const hits = [];
		walk(data, 'block[' + i + ']', hits);
		for (const [path, node] of hits) {
			datasets++;
			const missing = faults(node);
			if (missing.length) bad.push({ path, missing, name: node.name || node['@id'] || '(unnamed)' });
		}
	});
	return { url, datasets, bad };
}

async function pool(items, n, fn) {
	const out = [];
	let i = 0;
	await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) out.push(await fn(items[i++])); }));
	return out;
}

const urls = [...new Set(await urlsFrom(SITEMAP))].sort();
console.log('checking ' + urls.length + ' URL(s) from ' + SITEMAP);
const results = await pool(urls, 8, checkPage);

let datasets = 0, badPages = 0, fetchFails = 0;
for (const r of results.sort((a, b) => a.url.localeCompare(b.url))) {
	datasets += r.datasets;
	if (r.fetchError) { fetchFails++; console.log('FETCH-FAIL ' + r.url + ' — ' + r.fetchError); continue; }
	if (r.bad.length) {
		badPages++;
		console.log('FAIL ' + r.url);
		for (const b of r.bad) console.log('   ' + b.path + '  missing=' + b.missing.join(',') + '  name=' + b.name);
	}
}
console.log('\n' + datasets + ' Dataset node(s) across ' + urls.length + ' page(s) — ' + badPages + ' page(s) with an incomplete Dataset, ' + fetchFails + ' unreachable');
if (badPages) {
	console.log('A Dataset with no description cannot appear as a dataset result in Google Search. Fix it at the GENERATOR, never in a baked page.');
	process.exit(1);
}
if (fetchFails) {
	console.log('Some sitemap URLs did not answer — 404/5xx is UNREACHABLE, not a schema pass. Fix the sitemap or the route.');
	process.exit(2);
}
console.log('PASS — every Dataset node carries name, description and a named creator.');

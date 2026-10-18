/* TS-1142: one place that decides whether an auto-made page may be indexed.
   Wraps a family's existing handle(); changes nothing about the page a human gets (still 200, same body,
   so the free tools keep working) except: retired URLs carry X-Robots-Tag + a robots meta of noindex,follow.
   Data comes from ./index-policy-data.js (generated from the TS-1142 classification). */
import { POLICY } from './index-policy-data.js';

const TAG = 'noindex, follow';
const META = '<meta name="robots" content="noindex,follow">';

function parts(pathname, family) {
	let p;
	try { p = decodeURIComponent(pathname); } catch (e) { p = pathname; }
	return p.replace(/^\/+|\/+$/g, '').toLowerCase().split('/').filter(Boolean).slice(1).map((s) => s.trim());
}

/* 'keep' | 'noindex'. Anything unknown to the policy is kept (fail open: never hide a page by accident),
   EXCEPT trope readouts in allow mode, which are default-deny on purpose: the nightly recount makes new
   thin trope pages appear and the allow-list is the only way one gets indexed. */
export function decide(family, pathname) {
	const pol = POLICY[family];
	if (!pol) return 'keep';
	const s = parts(pathname, family);
	if (!s.length) return 'keep';
	if (family === 'trope-demand' && s.length >= 2) {
		const t = pol.tropes;
		if (!t) return 'keep';
		const key = s[0] + '/' + s[1];
		if (t.mode === 'allow') return t.keep.indexOf(key) >= 0 ? 'keep' : 'noindex';
		return t.retire.indexOf(key) >= 0 ? 'noindex' : 'keep';
	}
	if (s.length === 1 && pol.lanes && pol.lanes.indexOf(s[0]) >= 0) return 'noindex';
	return 'keep';
}

export function withIndexPolicy(handle, family) {
	return async function (context) {
		const res = await handle(context);
		if (!res || res.status !== 200) return res;
		const ct = res.headers.get('content-type') || '';
		if (ct.indexOf('text/html') < 0) return res;
		if (decide(family, new URL(context.request.url).pathname) === 'keep') return res;
		const h = new Headers(res.headers);
		h.set('x-robots-tag', TAG);
		h.delete('content-length');
		let body = await res.text();
		if (!/<meta[^>]+name=["']robots["']/i.test(body)) body = body.replace('</title>', '</title>\n' + META);
		return new Response(body, { status: 200, headers: h });
	};
}

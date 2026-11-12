/* Coral Hart Group: Almost Black Friday promo kit (coordinator, 11 Nov 2026).
   ONE script tag per site. It adds (1) a visible bar across the very top of every page, above the site header,
   (2) optionally a starred link inside the site's own menu, and (3) a one-time pop-up. Everything links to the
   deals page. It shows itself only inside its date window and removes itself afterwards. No cookies, no tracking.
   The only network request is two display fonts from Google Fonts (data-fonts="off" removes it); the only thing stored is one localStorage flag saying the visitor closed the pop-up.

   <script src="/path/chg-deals-promo.js" defer
           data-site="tropesmith"            (label only, for the lane's own checks)
           data-popup="on"                   ("off" on coralwire.ai: a news site gets the bar and the link, no pop-up)
           data-nav="header nav ul"          (optional CSS selector of the menu list to add the starred link to)
           data-push="header.site-header"    (optional: a FIXED, STICKY or ABSOLUTE header that must move down by the bar's height)
           data-anchor="#fyl"                (optional: land on one package; default is the top of the deals page)
           data-from="2026-11-13T00:30:00Z"  (optional: show earlier once the deals page is live, e.g. Thu afternoon)
   ></script>
*/
(function () {
  'use strict';
  var me = document.currentScript; if (!me) return;
  var d = me.dataset || {};
  var OPEN = Date.parse('2026-11-13T00:30:00Z'), END = Date.parse('2026-12-03T23:59:59Z');
  var FROM = d.from ? Date.parse(d.from) : OPEN;
  var now = Date.now();
  // test hook: only when the tag itself says data-test="1" (never set in production)
  if (d.test === '1') { var m = /[?&]chgd_now=([^&]+)/.exec(location.search); if (m) now = Date.parse(decodeURIComponent(m[1])); }
  if (!(now >= FROM && now <= END) || isNaN(FROM)) return;                 // outside the window: do nothing at all
  if (document.getElementById('chgd-bar')) return;                          // never twice on one page
  var path = location.pathname + location.search;
  var NO_BAR = /(checkout|\/cart|\/basket|\/pay(ment)?s?\b|order-received)/i;       // never where someone is paying
  var NO_POP = /(checkout|\/cart|\/basket|\/pay(ment)?s?\b|order|login|log-in|sign-?in|account|\/hq\b|\/app\b|classroom|\/tools?\b|dashboard|\/studio\b)/i;
  if (d.noBar) { try { NO_BAR = new RegExp(d.noBar, 'i'); } catch (e) {} }
  if (d.noPopup) { try { NO_POP = new RegExp(d.noPopup, 'i'); } catch (e) {} }
  if (NO_BAR.test(path)) return;
  var URL = 'https://coralhart.com/latest-deals' + (d.anchor && /^#[a-z0-9-]+$/i.test(d.anchor) ? d.anchor : '');
  if (/(^|\.)coralhart\.com$/i.test(location.hostname) && /^\/latest-deals/.test(location.pathname)) return;  // not on the deals page itself
  var open = now >= OPEN;
  var LINE = open ? 'Up to 30% off for romance authors, until 3 December' : 'Up to 30% off for romance authors. Opens Friday 13 November';

  var css = ''
  + '#chgd-bar{position:relative;z-index:2147483000;display:flex;align-items:center;justify-content:center;gap:10px 18px;flex-wrap:wrap;margin:0;padding:10px 44px 10px 16px;'
  + 'background:linear-gradient(100deg,#4A0A22,#7A0D30 50%,#4A0A22);color:#FFF3DC;font:600 15px/1.3 Figtree,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;text-align:center;box-sizing:border-box;border-bottom:1px solid #E2C794}'
  + '#chgd-bar b{font:italic 700 18px/1.1 "Bodoni Moda",Didot,"Bodoni 72",Georgia,serif;color:#F6DDA8;letter-spacing:.01em;white-space:nowrap}'
  + '#chgd-bar a.chgd-go{display:inline-block;background:linear-gradient(135deg,#F3D592,#C9973F);color:#33091A;font-weight:800;font-size:14px;text-decoration:none;padding:7px 16px;border-radius:999px;white-space:nowrap}'
  + '#chgd-bar a.chgd-go:hover{filter:brightness(1.06)}'
  + '#chgd-bar a:focus-visible,#chgd-pop a:focus-visible,#chgd-pop button:focus-visible,.chgd-nav a:focus-visible{outline:3px solid #F6DDA8;outline-offset:2px}'
  + '.chgd-star{color:#F6DDA8;margin-right:6px}'
  + '.chgd-nav a{display:inline-block;background:#6F0B2A;color:#FFF3DC!important;font-weight:800;text-decoration:none;padding:6px 14px;border-radius:999px;border:1px solid #E2C794;white-space:nowrap}'
  + '.chgd-nav a:hover{background:#4A0A22}'
  + '#chgd-veil{position:fixed;inset:0;z-index:2147483600;background:rgba(42,14,26,.55);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}'
  + '#chgd-pop{position:relative;max-width:460px;width:100%;background:#FBF4E8;color:#2A0E1A;border-radius:22px;padding:38px 30px 30px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.45);border:1px solid #B98A3E;font:500 16px/1.45 Figtree,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;box-sizing:border-box;'
  + 'background-image:radial-gradient(ellipse 70% 60% at 50% 105%,#FFE9B8 0,rgba(255,233,184,0) 70%)}'
  + '#chgd-pop .chgd-k{font-weight:800;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#6F0B2A}'
  + '#chgd-pop .chgd-s{display:block;font:400 54px/.8 "Pinyon Script","Snell Roundhand","Apple Chancery",cursive;color:#6F0B2A;transform:rotate(-4deg);margin:14px 0 -2px}'
  + '#chgd-pop .chgd-t{display:block;font:800 34px/1 "Bodoni Moda",Didot,"Bodoni 72",Georgia,serif;letter-spacing:.03em;text-transform:uppercase;color:#6F0B2A}'
  + '#chgd-pop p{margin:14px 0 0}'
  + '#chgd-pop .chgd-big{font:800 22px/1.2 "Bodoni Moda",Didot,Georgia,serif;color:#2A0E1A}'
  + '#chgd-pop a.chgd-cta{display:block;margin-top:20px;background:#6F0B2A;color:#fff;font-weight:800;font-size:17px;text-decoration:none;padding:15px 20px;border-radius:999px}'
  + '#chgd-pop a.chgd-cta:hover{background:#4A0A22}'
  + '#chgd-pop button.chgd-no{margin-top:12px;background:none;border:0;color:#6F5A55;font:600 14px Figtree,Arial,sans-serif;text-decoration:underline;cursor:pointer;padding:6px}'
  + '#chgd-pop button.chgd-x,#chgd-bar button.chgd-x{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:50%;border:0;background:rgba(255,243,220,.14);color:#FFF3DC;font:400 20px/1 Arial,sans-serif;cursor:pointer}'
  + '#chgd-pop button.chgd-x{top:10px;right:10px;transform:none;background:rgba(111,11,42,.08);color:#6F0B2A}'
  + '#chgd-bar .chgd-m{display:none}@media (max-width:520px){#chgd-bar .chgd-l{display:none}#chgd-bar .chgd-m{display:inline}#chgd-bar{font-size:13.5px;padding:8px 10px;gap:6px 10px}#chgd-bar a.chgd-go{padding:6px 12px;font-size:13px}#chgd-bar b{font-size:16px}#chgd-pop .chgd-t{font-size:28px}#chgd-pop .chgd-s{font-size:46px}}'
  + '@media (prefers-reduced-motion:no-preference){#chgd-veil{animation:chgdIn .25s ease-out}@keyframes chgdIn{from{opacity:0}to{opacity:1}}}';
  if (d.fonts !== 'off') { var gf = document.createElement('link'); gf.rel = 'stylesheet'; gf.href = 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,700;0,800;1,700&family=Pinyon+Script&display=swap'; document.head.appendChild(gf); }
  var st = document.createElement('style'); st.id = 'chgd-style'; st.textContent = css; document.head.appendChild(st);

  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }

  // 1. the bar, first thing in the body, above the site's own header
  var bar = el('div', { id: 'chgd-bar', role: 'region', 'aria-label': 'Almost Black Friday sale' },
    '<b><span class="chgd-star" aria-hidden="true">★</span>Almost Black Friday</b><span class="chgd-l">' + LINE + '</span><span class="chgd-m">Up to 30% off</span>'
    + '<a class="chgd-go" href="' + URL + '">See the deals →</a>');
  function place() {
    document.body.insertBefore(bar, document.body.firstChild);
    if (d.push) { var h = document.querySelector(d.push); if (h) { var pos = getComputedStyle(h).position; if (pos === 'fixed' || pos === 'sticky') {
      bar.style.position = 'fixed'; bar.style.top = '0'; bar.style.left = '0'; bar.style.right = '0';
      var fit = function () { var bh = bar.offsetHeight; h.style.top = bh + 'px'; document.documentElement.style.scrollPaddingTop = (bh + h.offsetHeight) + 'px'; if (pos === 'fixed') document.body.style.paddingTop = bh + 'px'; else document.body.style.marginTop = bh + 'px'; };
      fit(); window.addEventListener('resize', fit); window.addEventListener('load', fit); if (window.ResizeObserver) new ResizeObserver(fit).observe(bar); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit); }
      else if (pos === 'absolute') { var base = parseFloat(getComputedStyle(h).top) || 0; var fitA = function () { h.style.top = (base + bar.offsetHeight) + 'px'; }; fitA(); window.addEventListener('resize', fitA); window.addEventListener('load', fitA); if (window.ResizeObserver) new ResizeObserver(fitA).observe(bar); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitA); } } }
    // 2. the starred link in the site's own menu
    if (d.nav) { var nav = document.querySelector(d.nav); if (nav && !nav.querySelector('.chgd-nav')) {
      var isList = /^(UL|OL)$/.test(nav.tagName); var item = el(isList ? 'li' : 'span', { 'class': 'chgd-nav' }, '<a href="' + URL + '"><span class="chgd-star" aria-hidden="true">★</span>Black Friday deals</a>');
      nav.appendChild(item); } }
    // 3. the one-time pop-up
    var seen = false; try { seen = localStorage.getItem('chgd-abf-2026') === '1'; } catch (e) {}
    if (d.popup === 'off' || seen || NO_POP.test(path)) return;
    setTimeout(pop, 6000);
  }
  function pop() {
    if (document.getElementById('chgd-veil')) return;
    var veil = el('div', { id: 'chgd-veil' });
    var box = el('div', { id: 'chgd-pop', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'chgd-h' },
      '<button class="chgd-x" type="button" aria-label="Close">×</button>'
      + '<span class="chgd-k">Almost Black Friday</span>'
      + '<span id="chgd-h"><span class="chgd-s">Fall for</span><span class="chgd-t">your next book</span></span>'
      + '<p class="chgd-big">Up to 30% off for romance authors</p>'
      + '<p>Books written for you, Coral Hart’s classes and reader-demand Maps. ' + (open ? 'Until Thursday 3 December.' : 'Opens Friday 13 November.') + '</p>'
      + '<a class="chgd-cta" href="' + URL + '">See the deals</a>'
      + '<button class="chgd-no" type="button">No thanks</button>');
    veil.appendChild(box); document.body.appendChild(veil);
    var prev = document.activeElement;
    function close() { try { localStorage.setItem('chgd-abf-2026', '1'); } catch (e) {} veil.remove(); document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus(); }
    function key(e) { if (e.key === 'Escape') close(); if (e.key === 'Tab') { var f = box.querySelectorAll('a,button'); var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } } }
    box.querySelector('.chgd-x').addEventListener('click', close);
    box.querySelector('.chgd-no').addEventListener('click', close);
    box.querySelector('.chgd-cta').addEventListener('click', function () { try { localStorage.setItem('chgd-abf-2026', '1'); } catch (e) {} });
    veil.addEventListener('click', function (e) { if (e.target === veil) close(); });
    document.addEventListener('keydown', key);
    box.querySelector('.chgd-cta').focus();
  }
  if (document.body) place(); else document.addEventListener('DOMContentLoaded', place);
})();

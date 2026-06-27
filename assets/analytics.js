/*
 * Tropesmith analytics — Google Analytics 4 (GA4) with consent.
 * Self-contained: cookie-consent banner + Consent Mode v2 + auto-wired
 * conversion events. Drop this file in and add ONE script tag per page:
 *   <script src="/assets/analytics.js?v=YYYYMMDD" defer></script>
 *
 * GA loads ONLY after the visitor clicks "Accept" — matches the privacy
 * policy. Declining keeps everything off. Measurement ID: G-VBSQTCMLFP.
 */
(function () {
  'use strict';

  var GA_ID = 'G-VBSQTCMLFP';
  var CONSENT_KEY = 'ts_analytics_consent'; // 'granted' | 'denied'

  // --- gtag + Consent Mode v2 defaults (set BEFORE GA loads) ---
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });

  function readConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function writeConsent(v) {
    try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {}
  }

  var gaLoaded = false;
  function loadGA() {
    if (gaLoaded) return;
    gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    // anonymize_ip: IP anonymisation (promised in the privacy policy)
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  function grantConsent() {
    gtag('consent', 'update', {
      ad_storage: 'denied',          // Tropesmith runs no ads
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted'
    });
    loadGA();
    wireConversions();
  }

  // --- Public helper: fire a GA4 event (no-op until consent granted) ---
  function track(name, params) {
    if (readConsent() !== 'granted') return;
    gtag('event', name, params || {});
  }
  window.tsTrack = track;

  // --- Auto-wired conversion events (page-based, markup-agnostic) ---
  var conversionsWired = false;
  function wireConversions() {
    if (conversionsWired) return;
    conversionsWired = true;

    var path = location.pathname.replace(/\/index\.html$/, '/');

    // Purchase — the "Payment received" page
    if (path.indexOf('/order-complete') === 0) {
      track('purchase', { currency: 'USD' });
    }

    // Ran a Map — successful intake redirects here with ?map_id=
    if (path.indexOf('/status') === 0) {
      var hasMap = false;
      try { hasMap = !!new URLSearchParams(location.search).get('map_id'); } catch (e) {}
      if (hasMap) track('ran_map', { method: 'intake' });
    }

    // Sign-in — the magic-link verify page is the actual login moment
    if (path.indexOf('/verify') === 0) {
      track('login', { method: 'magic_link' });
    }
  }

  // Newsletter signup — fires when the Trope Pulse opt-in box is ticked at
  // intake. Delegated submit listener so it survives markup changes.
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.id !== 'intake-form') return;
    var cb = form.querySelector('#newsletter_opt_in');
    if (cb && cb.checked) track('newsletter_signup', { list: 'trope_pulse' });
  }, true);

  // --- Cookie-consent banner ---
  function showBanner() {
    if (document.getElementById('ts-consent')) return;

    var bar = document.createElement('div');
    bar.id = 'ts-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie consent');
    bar.innerHTML =
      '<div class="ts-consent-inner">' +
        '<p class="ts-consent-text">We use Google Analytics to understand how the site is used. ' +
          'Analytics cookies load only if you accept. ' +
          '<a href="/privacy/">Privacy policy</a>.</p>' +
        '<div class="ts-consent-btns">' +
          '<button type="button" id="ts-consent-decline" class="ts-consent-btn ts-consent-decline">Decline</button>' +
          '<button type="button" id="ts-consent-accept" class="ts-consent-btn ts-consent-accept">Accept</button>' +
        '</div>' +
      '</div>';

    var css = document.createElement('style');
    css.textContent =
      '#ts-consent{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;' +
        'background:#fff;border-top:1px solid rgba(0,0,0,.12);' +
        'box-shadow:0 -6px 24px rgba(0,0,0,.10);font-family:inherit;' +
        'animation:tsConsentUp .35s ease-out}' +
      '@keyframes tsConsentUp{from{transform:translateY(100%)}to{transform:translateY(0)}}' +
      '.ts-consent-inner{max-width:1100px;margin:0 auto;padding:14px 20px;' +
        'display:flex;align-items:center;gap:18px;flex-wrap:wrap;justify-content:center}' +
      '.ts-consent-text{margin:0;font-size:14px;line-height:1.5;color:#2b2b3a;flex:1 1 360px}' +
      '.ts-consent-text a{color:#e0518d;text-decoration:underline}' +
      '.ts-consent-btns{display:flex;gap:10px;flex:0 0 auto}' +
      '.ts-consent-btn{cursor:pointer;border-radius:999px;padding:10px 22px;' +
        'font-size:14px;font-weight:600;border:1px solid transparent;font-family:inherit}' +
      '.ts-consent-decline{background:transparent;border-color:rgba(0,0,0,.20);color:#2b2b3a}' +
      '.ts-consent-decline:hover{background:rgba(0,0,0,.04)}' +
      '.ts-consent-accept{background:#e0518d;color:#fff}' +
      '.ts-consent-accept:hover{background:#cc417c}' +
      '@media(max-width:560px){.ts-consent-btns{width:100%}.ts-consent-btn{flex:1}}';
    document.head.appendChild(css);

    function close() { if (bar.parentNode) bar.parentNode.removeChild(bar); }

    bar.querySelector('#ts-consent-accept').addEventListener('click', function () {
      writeConsent('granted');
      grantConsent();
      close();
    });
    bar.querySelector('#ts-consent-decline').addEventListener('click', function () {
      writeConsent('denied');
      close();
    });

    document.body.appendChild(bar);
  }

  // --- Boot ---
  var consent = readConsent();
  if (consent === 'granted') {
    grantConsent();
  } else if (consent === 'denied') {
    // stay off
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();

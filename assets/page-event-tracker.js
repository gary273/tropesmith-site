/* ============================================================
 * Tropesmith page-event tracker
 * Cookieless, fire-and-forget. Batches events per 2s flush.
 * Endpoint: page-event Supabase edge function.
 * ============================================================ */
(function () {
  'use strict';
  var ENDPOINT = '/api/functions/v1/page-event';
  var FLUSH_INTERVAL_MS = 2000;
  var SCROLL_MILESTONES = [25, 50, 75, 100];
  // -------- UUID v4 (RFC 4122, cryptographically random) --------
  function uuid() {
    if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = '0123456789abcdef';
    var s = '';
    for (var i = 0; i < 16; i++) {
      s += h[b[i] >> 4] + h[b[i] & 0xf];
      if (i === 3 || i === 5 || i === 7 || i === 9) s += '-';
    }
    return s;
  }
  // -------- IDs (cookieless via Storage) --------
  function getOrCreate(storage, key) {
    try {
      var v = storage.getItem(key);
      if (v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return v;
      v = uuid();
      storage.setItem(key, v);
      return v;
    } catch (_) { return uuid(); }
  }
  var visitorId = getOrCreate(localStorage, 'ts_visitor_id');
  var sessionId = getOrCreate(sessionStorage, 'ts_session_id');
  var pagePath = window.location.pathname;
  // -------- Outgoing queue --------
  var queue = [];
  var flushTimer = null;
  function enqueue(eventType, opts) {
    var ev = {
      session_id: sessionId,
      visitor_id: visitorId,
      event_type: eventType,
      page_path: pagePath
    };
    if (opts) {
      if (opts.value != null) ev.event_value = String(opts.value);
      if (opts.section) ev.section_label = String(opts.section);
      if (opts.viewport_w) ev.viewport_w = opts.viewport_w;
      if (opts.viewport_h) ev.viewport_h = opts.viewport_h;
    }
    queue.push(ev);
    scheduleFlush();
  }
  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
  }
  function flush(useBeacon) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (queue.length === 0) return;
    var batch = queue.splice(0, 50);
    var payload = JSON.stringify({ events: batch });
    if (useBeacon && navigator.sendBeacon) {
      try {
        var blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(ENDPOINT, blob);
        return;
      } catch (_) {}
    }
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
        credentials: 'omit'
      }).catch(function () { /* swallow — fire and forget */ });
    } catch (_) {}
  }
  // Flush on page hide (uses sendBeacon for reliability)
  window.addEventListener('pagehide', function () { flush(true); });
  window.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush(true);
  });
  // -------- 1. page_view (fires once at load) --------
  enqueue('page_view', {
    viewport_w: window.innerWidth,
    viewport_h: window.innerHeight
  });
  // -------- 2. scroll_depth (fires at 25/50/75/100%) --------
  var scrollFired = {};
  function checkScroll() {
    var doc = document.documentElement;
    var scrolled = (window.scrollY + window.innerHeight);
    var total = doc.scrollHeight;
    if (total <= window.innerHeight) {
      // Page shorter than viewport — fire 100 once
      if (!scrollFired[100]) { scrollFired[100] = true; enqueue('scroll_depth', { value: 100 }); }
      return;
    }
    var pct = Math.round((scrolled / total) * 100);
    SCROLL_MILESTONES.forEach(function (m) {
      if (pct >= m && !scrollFired[m]) {
        scrollFired[m] = true;
        enqueue('scroll_depth', { value: m });
      }
    });
  }
  var scrollTimer = null;
  window.addEventListener('scroll', function () {
    if (scrollTimer) return;
    scrollTimer = setTimeout(function () { scrollTimer = null; checkScroll(); }, 250);
  }, { passive: true });
  setTimeout(checkScroll, 100); // initial check for short pages
  // -------- 3. section_view (IntersectionObserver on data-screen-label) --------
  if ('IntersectionObserver' in window) {
    var seenSections = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var label = e.target.getAttribute('data-screen-label');
        if (!label || seenSections[label]) return;
        seenSections[label] = true;
        enqueue('section_view', { section: label });
      });
    }, { threshold: 0.4 });
    function bindSections() {
      var sections = document.querySelectorAll('[data-screen-label]');
      for (var i = 0; i < sections.length; i++) io.observe(sections[i]);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindSections);
    } else {
      bindSections();
    }
  }
  // -------- 4. click (delegated listener for CTAs + nav + footer) --------
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document.body) {
      // Track if it's a button, anchor, or marked with data-track
      if (t.tagName === 'A' || t.tagName === 'BUTTON' || (t.hasAttribute && t.hasAttribute('data-track'))) {
        // Identify what was clicked
        var label =
          (t.getAttribute && t.getAttribute('data-track')) ||
          (t.getAttribute && t.getAttribute('aria-label')) ||
          (t.textContent && t.textContent.trim().slice(0, 60)) ||
          (t.getAttribute && t.getAttribute('href')) ||
          t.tagName.toLowerCase();
        // Include containing section if any
        var section = null;
        var sec = t.closest && t.closest('[data-screen-label]');
        if (sec) section = sec.getAttribute('data-screen-label');
        enqueue('click', { value: label, section: section });
        return; // stop bubbling further up
      }
      t = t.parentElement;
    }
  }, { capture: false, passive: true });
})();

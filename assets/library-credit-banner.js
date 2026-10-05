/* TS-1081: "you have credits, build your Map" banner for /library.
   Pure logic + a tiny renderer so it can be unit-tested in node and used as a plain script in the browser. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TSLibraryBanner = api;
})(typeof self !== 'undefined' ? self : this, function () {
  var INTAKE_URL = '/intake/';
  /* A map the author already has under way, or is waiting to start with their credit: either way
     the library already shows what to do next, so the banner stays out of the way. */
  var IN_FLIGHT = { pending: 1, queued: 1, rendering: 1, synthesising: 1, awaiting_payment: 1 };

  function isInFlight(m) {
    if (!m) return false;
    var s = String(m.status || '').toLowerCase();
    var t = String(m.tier || '').toLowerCase();
    return !!(IN_FLIGHT[s] || t === 'awaiting_payment');
  }
  /* A locked series book already offers "Unlock with 1 credit" on its own row; the banner would compete with it. */
  function isUnlockable(m) {
    return !!m && String(m.tier || '').toLowerCase() === 'locked';
  }
  function shouldShowBanner(credits, maps) {
    var n = Number(credits);
    if (!isFinite(n) || n < 1) return false;
    return !(maps || []).some(function (m) { return isInFlight(m) || isUnlockable(m); });
  }
  function bannerText(credits) {
    var n = Number(credits);
    return 'You have ' + n + ' ' + (n === 1 ? 'credit' : 'credits') + ' ready';
  }
  function bannerHtml(credits) {
    return '<a class="credit-banner" href="' + INTAKE_URL + '" data-testid="credit-banner">' +
      '<span class="credit-banner-text"><strong>' + bannerText(credits) + '</strong> &mdash; build your Map</span>' +
      '<span class="credit-banner-cta">Build my Map <span class="arrow">&rarr;</span></span></a>';
  }
  function render(container, credits, maps) {
    if (!container) return false;
    if (!shouldShowBanner(credits, maps)) { container.innerHTML = ''; container.style.display = 'none'; return false; }
    container.innerHTML = bannerHtml(credits);
    container.style.display = '';
    return true;
  }
  return { INTAKE_URL: INTAKE_URL, isInFlight: isInFlight, isUnlockable: isUnlockable, shouldShowBanner: shouldShowBanner, bannerText: bannerText, bannerHtml: bannerHtml, render: render };
});

// Tropesmith — session-aware nav (TS-0472)
// Every page except /library/ (already correct) and /order-complete/ (already
// wires its own #oc-nav-cta swap) hardcodes a "Sign in" link regardless of
// session state. A signed-in customer clicking off /library/ sees "Sign in"
// and concludes they were logged out, even though the 30-day tsm_session
// cookie is still valid (customer Paula, 2026-07-28: three magic links used
// within 11-17 seconds each, because the nav lied to her).
//
// On a valid session, swap the "Sign in" anchor inside .nav-cta for
// "My library" + "Sign out". On no session / any error, leave the nav
// exactly as it was rendered — fail silent, no console noise (site
// convention, see pricing/index.html's own library/me call).
(function () {
  if (window.__tsSessionNav) return;
  window.__tsSessionNav = true;
  var API = '/api';

  function isSignInAnchor(a) {
    var href = a.getAttribute('href') || '';
    var text = (a.textContent || '').trim();
    return text === 'Sign in' || /(^|\/)login\/?$/.test(href);
  }

  function swapNav() {
    // TS-1128: desk-theme pages hide the old header (.nav-cta), so the visible menu is swapped too.
    var navs = document.querySelectorAll('.nav-cta, .desk-header nav.desk-nav');
    for (var i = 0; i < navs.length; i++) {
      var nav = navs[i];
      var links = nav.querySelectorAll('a');
      var signInLink = null;
      for (var j = 0; j < links.length; j++) {
        if (isSignInAnchor(links[j])) { signInLink = links[j]; break; }
      }
      if (!signInLink) continue;

      var linkClass = signInLink.className.indexOf('btn') === -1 ? '' : 'btn btn-link';
      var gap = nav.classList.contains('desk-nav') ? '' : '12px';

      var myLibrary = document.createElement('a');
      myLibrary.className = linkClass;
      myLibrary.href = '/library/';
      myLibrary.style.marginRight = gap;
      myLibrary.textContent = 'My library';

      var signOut = document.createElement('a');
      signOut.className = linkClass;
      signOut.href = '#';
      signOut.style.marginRight = gap;
      signOut.textContent = 'Sign out';
      signOut.addEventListener('click', function (e) {
        e.preventDefault();
        fetch(API + '/functions/v1/library/signout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }).finally(function () { window.location.href = '/'; });
      });

      signInLink.parentNode.insertBefore(myLibrary, signInLink);
      signInLink.parentNode.insertBefore(signOut, signInLink);
      signInLink.parentNode.removeChild(signInLink);
    }
  }

  // Every page view by a logged-out visitor used to cost one 401 (the only console error on the
  // site, ~53 a day in the function log). Remember an anonymous answer per tab for ten minutes;
  // a sign-in (verify page) or a 200 anywhere clears it, so a signed-in customer is never shown
  // "Sign in" for longer than that window.
  var NAV_KEY = 'tsm_nav_anon_until';
  function anonymousRecently() {
    try {
      var until = Number(window.sessionStorage.getItem(NAV_KEY) || 0);
      return until > Date.now();
    } catch (e) { return false; }
  }
  function remember(isAnonymous) {
    try {
      if (isAnonymous) window.sessionStorage.setItem(NAV_KEY, String(Date.now() + 10 * 60 * 1000));
      else window.sessionStorage.removeItem(NAV_KEY);
    } catch (e) { /* storage unavailable - fall back to checking every page */ }
  }
  if (anonymousRecently()) return;

  fetch(API + '/functions/v1/library/me', { credentials: 'include' })
    .then(function (resp) { remember(resp.status === 401); return resp.ok ? resp.json() : null; })
    .then(function (data) { if (data && data.ok) swapNav(); })
    .catch(function () { /* anonymous or network error - leave nav as-is */ });
})();

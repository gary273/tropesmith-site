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
  var API = '/api';

  function isSignInAnchor(a) {
    var href = a.getAttribute('href') || '';
    var text = (a.textContent || '').trim();
    return text === 'Sign in' || /(^|\/)login\/?$/.test(href);
  }

  function swapNav() {
    var navs = document.querySelectorAll('.nav-cta');
    for (var i = 0; i < navs.length; i++) {
      var nav = navs[i];
      var links = nav.querySelectorAll('a');
      var signInLink = null;
      for (var j = 0; j < links.length; j++) {
        if (isSignInAnchor(links[j])) { signInLink = links[j]; break; }
      }
      if (!signInLink) continue;

      var myLibrary = document.createElement('a');
      myLibrary.className = 'btn btn-link';
      myLibrary.href = '/library/';
      myLibrary.style.marginRight = '12px';
      myLibrary.textContent = 'My library';

      var signOut = document.createElement('a');
      signOut.className = 'btn btn-link';
      signOut.href = '#';
      signOut.style.marginRight = '12px';
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

  fetch(API + '/functions/v1/library/me', { credentials: 'include' })
    .then(function (resp) { return resp.ok ? resp.json() : null; })
    .then(function (data) { if (data && data.ok) swapNav(); })
    .catch(function () { /* anonymous or network error - leave nav as-is */ });
})();

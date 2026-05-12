// Minimal vanilla JS. Loaded site-wide via <script defer>.

(function () {
  // Sticky-nav scrolled state
  var nav = document.querySelector('.nav-shell');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('scrolled', window.scrollY > 4);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Year stamping (for footer ©)
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();

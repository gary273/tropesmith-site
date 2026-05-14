// Tropesmith hero Map carousel
// Builds a Map trope-by-trope, then rotates through 4 subgenres.
// After 3 full cycles, stops on the final Map (prevents endless slot-machine loop).
// Pauses on hover. Honors prefers-reduced-motion and mobile breakpoint.

(function () {
  'use strict';

  const PROD_TIMING = {
    tropeRevealMs: 300,
    verdictDelayMs: 200,
    pauseOnCompleteMs: 3500,
    fadeMs: 400,
    maxCycles: Infinity,
  };

  const MAPS = [
    {
      genre: "Billionaire · Contemporary · Spicy",
      tropes: [
        { rank: "01", title: "Grumpy-sunshine", desc: "billionaire MMC, sunshine FMC", lane: "Hot",          laneClass: "hero-map-lane-hot" },
        { rank: "02", title: "Fish-out-of-water", desc: "glamorous FMC, his small-town", lane: "Hot",        laneClass: "hero-map-lane-hot" },
        { rank: "03", title: "Provider MMC", desc: "acts-of-service love language", lane: "Undersupplied",   laneClass: "hero-map-lane-hot" },
        { rank: "04", title: "Forced proximity", desc: "second-act escalator", lane: "Warming",              laneClass: "hero-map-lane-warm" },
        { rank: "05", title: "Opposites attract", desc: "wealth + grounded", lane: "Warming",                laneClass: "hero-map-lane-warm" },
      ],
    },
    {
      genre: "Dark · Cruel Shifterverse · Trilogy",
      tropes: [
        { rank: "01", title: "Captivity + fated mates", desc: "morally-black alpha, transformation FMC", lane: "Hot",      laneClass: "hero-map-lane-hot" },
        { rank: "02", title: "Reverse harem", desc: "inter-male bonds, distinct pack", lane: "Hot",                       laneClass: "hero-map-lane-hot" },
        { rank: "03", title: "Feral FMC arc", desc: "broken to dangerous, not victim", lane: "Undersupplied",             laneClass: "hero-map-lane-hot" },
        { rank: "04", title: "Shifterverse politics", desc: "pack hierarchy + alliances", lane: "Warming",                laneClass: "hero-map-lane-warm" },
        { rank: "05", title: "Bond-mark stakes", desc: "marking as commitment device", lane: "Warming",                   laneClass: "hero-map-lane-warm" },
      ],
    },
    {
      genre: "Regency · Sweet · Four-book Series",
      tropes: [
        { rank: "01", title: "Scandal + reputation stakes", desc: "society as the ticking clock", lane: "Hot",       laneClass: "hero-map-lane-hot" },
        { rank: "02", title: "Marriage of convenience", desc: "with genuine wit, not duty alone", lane: "Hot",        laneClass: "hero-map-lane-hot" },
        { rank: "03", title: "Found family ensemble", desc: "supportive cast across all 4", lane: "Undersupplied",    laneClass: "hero-map-lane-hot" },
        { rank: "04", title: "Wallflower FMC", desc: "overlooked, then unmissable", lane: "Warming",                  laneClass: "hero-map-lane-warm" },
        { rank: "05", title: "Rake redemption", desc: "earned, not assumed", lane: "Warming",                         laneClass: "hero-map-lane-warm" },
      ],
    },
    {
      genre: "Paranormal · Women's Fiction · Steamy",
      tropes: [
        { rank: "01", title: "Morally-grey paranormal MMC", desc: "with depth, not cruelty", lane: "Hot",            laneClass: "hero-map-lane-hot" },
        { rank: "02", title: "FMC with her own power", desc: "not just love-interest", lane: "Hot",                   laneClass: "hero-map-lane-hot" },
        { rank: "03", title: "Midlife heroine", desc: "underserved + spending heavily", lane: "Undersupplied",        laneClass: "hero-map-lane-hot" },
        { rank: "04", title: "Witches + ghosts", desc: "punching above supply share", lane: "Warming",                laneClass: "hero-map-lane-warm" },
        { rank: "05", title: "Emotional interiority", desc: "WF depth + PNR creature heat", lane: "Warming",          laneClass: "hero-map-lane-warm" },
      ],
    },
  ];

  function init() {
    const carousel = document.querySelector('.hero-map-carousel');
    if (!carousel) return;

    // Honor prefers-reduced-motion + mobile — show static first Map, no animation
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 760px)').matches;
    if (prefersReduced || isMobile) return;

    const card = carousel.querySelector('.hero-map-card');
    const genreEl = carousel.querySelector('.hero-map-genre');
    const tropesEl = carousel.querySelector('.hero-map-tropes');
    const counterEl = carousel.querySelector('.hero-map-counter');
    const verdictEl = carousel.querySelector('.hero-map-verdict');

    if (!card || !genreEl || !tropesEl || !counterEl || !verdictEl) return;

    let mapIdx = 0;
    let cycleCount = 0;
    let paused = false;
    let nextTimer = null;

    function clearTimer() {
      if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
    }

    function buildMap() {
      if (paused) { nextTimer = setTimeout(buildMap, 500); return; }

      const map = MAPS[mapIdx];
      genreEl.textContent = map.genre;
      tropesEl.innerHTML = '';
      verdictEl.classList.remove('is-shown');
      counterEl.textContent = '0 / 5';

      map.tropes.forEach(t => {
        const li = document.createElement('li');
        li.className = 'hero-map-trope';
        li.innerHTML =
          '<span class="hero-map-rank">' + t.rank + '</span>' +
          '<span class="hero-map-trope-name"><b>' + t.title + '</b> · ' + t.desc + '</span>' +
          '<span class="hero-map-lane ' + t.laneClass + '">' + t.lane + '</span>';
        tropesEl.appendChild(li);
      });

      const items = tropesEl.querySelectorAll('.hero-map-trope');
      let i = 0;

      function reveal() {
        if (paused) { nextTimer = setTimeout(reveal, 500); return; }
        if (i < items.length) {
          items[i].classList.add('is-shown');
          i++;
          counterEl.textContent = i + ' / 5';
          nextTimer = setTimeout(reveal, PROD_TIMING.tropeRevealMs);
        } else {
          nextTimer = setTimeout(() => {
            if (paused) { return; }
            verdictEl.classList.add('is-shown');
            nextTimer = setTimeout(advanceMap, PROD_TIMING.pauseOnCompleteMs);
          }, PROD_TIMING.verdictDelayMs);
        }
      }
      reveal();
    }

    function advanceMap() {
      if (paused) { nextTimer = setTimeout(advanceMap, 500); return; }
      // Stop after maxCycles full rotations
      const totalShown = (cycleCount * MAPS.length) + mapIdx + 1;
      const targetTotal = PROD_TIMING.maxCycles * MAPS.length;
      if (totalShown >= targetTotal) {
        return; // stay on final Map
      }
      card.style.opacity = '0.25';
      nextTimer = setTimeout(() => {
        mapIdx = (mapIdx + 1) % MAPS.length;
        if (mapIdx === 0) cycleCount++;
        card.style.opacity = '1';
        buildMap();
      }, PROD_TIMING.fadeMs);
    }

    // Pause on hover
    carousel.addEventListener('mouseenter', () => { paused = true; });
    carousel.addEventListener('mouseleave', () => { paused = false; });

    setTimeout(buildMap, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

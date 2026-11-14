(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");

  // Header border once the page scrolls
  var header = document.querySelector(".site-header");
  var onScroll = function () {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Gentle reveal on scroll. One-way: once a card is shown it stays shown,
  // whichever way the page scrolls. IntersectionObserver can miss cards
  // (fast flicks, momentum scroll, back/forward cache, Safari quirks), so a
  // scroll/resize check and a timeout also reveal anything at or above the
  // bottom of the viewport. Nothing ever removes the "in" class.
  var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var showAll = function () { items.forEach(function (el) { el.classList.add("in"); }); };
  var revealPassed = function () {
    var vh = window.innerHeight || doc.clientHeight;
    items.forEach(function (el) {
      if (!el.classList.contains("in") && el.getBoundingClientRect().top < vh) el.classList.add("in");
    });
  };
  if (!("IntersectionObserver" in window) || reduce) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px", threshold: 0 });
    items.forEach(function (el) { io.observe(el); });
    var ticking = false;
    var onRevealScroll = function () {
      if (ticking) return;
      ticking = true;
      (window.requestAnimationFrame || setTimeout)(function () { ticking = false; revealPassed(); });
    };
    window.addEventListener("scroll", onRevealScroll, { passive: true });
    window.addEventListener("resize", onRevealScroll, { passive: true });
    window.addEventListener("pageshow", revealPassed);
    window.addEventListener("hashchange", revealPassed);
    revealPassed();
    // Last-resort safety: never leave a card hidden for long.
    setTimeout(showAll, 2500);
  }

  // Screenshot gallery arrows
  var gallery = document.querySelector(".gallery");
  document.querySelectorAll(".gbtn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!gallery) return;
      var dir = parseInt(btn.getAttribute("data-dir"), 10) || 1;
      var card = gallery.querySelector(".gallery-track li");
      var step = card ? card.getBoundingClientRect().width + 28 : 280;
      gallery.scrollBy({ left: dir * step * 2, behavior: reduce ? "auto" : "smooth" });
    });
  });
})();

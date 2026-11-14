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

  // Gentle reveal on scroll
  var items = document.querySelectorAll(".reveal");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("IntersectionObserver" in window) || reduce) {
    items.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
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

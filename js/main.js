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

  // Game preview clips. This file never pauses them, and the hero
  // "play once" change only dropped loop on the studio logo video.
  // iOS Safari does not start autoplay for a muted playsinline video that
  // is below the fold (preload=metadata never buffers it), and it does not
  // retry when the card scrolls into view. Everest is in the first screen,
  // so it plays; James Furniture Rebellion stays on its poster. Low Power
  // Mode refuses play() until a gesture, and the poster stays until a tap.
  var previews = Array.prototype.slice.call(document.querySelectorAll("video.game-preview"));
  var playPreview = function (video) {
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    if (!video.paused && !video.ended) return;
    if (video.getAttribute("preload") !== "auto") video.preload = "auto";
    if (video.readyState === 0 && video.networkState === 0) video.load();
    var pending = video.play();
    if (pending && typeof pending.catch === "function") pending.catch(function () {});
  };
  var previewInView = function (video) {
    var rect = video.getBoundingClientRect();
    var vh = window.innerHeight || doc.clientHeight;
    return Math.min(rect.bottom, vh) - Math.max(rect.top, 0) > 8;
  };
  if (previews.length) {
    if ("IntersectionObserver" in window) {
      var videoIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) playPreview(entry.target);
        });
      }, { threshold: 0.25 });
      previews.forEach(function (video) { videoIo.observe(video); });
    } else {
      previews.forEach(playPreview);
    }
    previews.forEach(function (video) {
      var onTap = function () { playPreview(video); };
      video.addEventListener("click", onTap);
      video.addEventListener("touchend", onTap);
    });
    var unlocked = false;
    var onFirstGesture = function () {
      if (unlocked) return;
      unlocked = true;
      previews.forEach(function (video) { if (previewInView(video)) playPreview(video); });
      window.removeEventListener("pointerup", onFirstGesture, true);
      window.removeEventListener("touchend", onFirstGesture, true);
    };
    window.addEventListener("pointerup", onFirstGesture, true);
    window.addEventListener("touchend", onFirstGesture, true);
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

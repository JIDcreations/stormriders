/* Stormriders — site behaviour (no dependencies) */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  /* Header: solid white once the page scrolls past the top */
  var header = document.querySelector(".site-header");
  if (header && !header.classList.contains("site-header--solid")) {
    var onScroll = function () { header.classList.toggle("is-solid", window.scrollY > 40); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Mobile menu */
  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    var setOpen = function (open) {
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Menu sluiten" : "Menu openen");
    };
    toggle.addEventListener("click", function () {
      setOpen(!document.body.classList.contains("nav-open"));
    });
    document.querySelectorAll(".site-nav a").forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  }

  /* Reveal on scroll */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Hero video: only load/play on wider screens (mobile shows the still image) */
  document.querySelectorAll("video[data-desktop-only]").forEach(function (v) {
    var mq = window.matchMedia("(min-width: 810px)");
    var sync = function () {
      if (mq.matches) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else {
        v.pause();
      }
    };
    sync();
    mq.addEventListener ? mq.addEventListener("change", sync) : mq.addListener(sync);
  });

  /* Lightbox for any [data-lightbox] gallery */
  var galleries = document.querySelectorAll("[data-lightbox]");
  if (galleries.length) {
    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML =
      '<button class="lightbox__close" aria-label="Sluiten">&times;</button>' +
      '<button class="lightbox__prev" aria-label="Vorige">&#8249;</button>' +
      '<img alt="">' +
      '<button class="lightbox__next" aria-label="Volgende">&#8250;</button>';
    document.body.appendChild(box);
    var img = box.querySelector("img");
    var items = [], index = 0, lastFocus = null;

    var show = function (i) {
      index = (i + items.length) % items.length;
      img.src = items[index].getAttribute("href") || items[index].querySelector("img").src;
      img.alt = (items[index].querySelector("img") || {}).alt || "";
    };
    var close = function () {
      box.classList.remove("is-open");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    };

    galleries.forEach(function (g) {
      var links = Array.prototype.slice.call(g.querySelectorAll("a[href]"));
      links.forEach(function (a, i) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          items = links;
          lastFocus = a;
          show(i);
          box.classList.add("is-open");
          document.body.style.overflow = "hidden";
          box.querySelector(".lightbox__close").focus();
        });
      });
    });
    box.querySelector(".lightbox__close").addEventListener("click", close);
    box.querySelector(".lightbox__prev").addEventListener("click", function () { show(index - 1); });
    box.querySelector(".lightbox__next").addEventListener("click", function () { show(index + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
  }
})();

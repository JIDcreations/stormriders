/* Stormriders — site behaviour (no dependencies) */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header: solid once scrolled. Hides after a deliberate scroll down and returns on a clear
     scroll up — small trackpad wobbles in either direction are ignored. Updates once per frame. */
  var header = document.querySelector(".site-header");
  if (header) {
    var lastY = window.scrollY, travel = 0, ticking = false;
    var update = function () {
      ticking = false;
      var y = window.scrollY, dy = y - lastY;
      lastY = y;
      header.classList.toggle("is-solid", y > 40);
      if (document.body.classList.contains("nav-open") || y < 400) { travel = 0; header.classList.remove("is-hidden"); return; }
      travel = (dy > 0) === (travel > 0) ? travel + dy : dy;   // reset when the direction flips
      if (travel > 80) header.classList.add("is-hidden");
      else if (travel < -50) header.classList.remove("is-hidden");
    };
    update();
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  }

  /* Mobile menu */
  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    var setOpen = function (open) {
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Menu sluiten" : "Menu openen");
      if (open && header) header.classList.remove("is-hidden");
    };
    toggle.addEventListener("click", function () { setOpen(!document.body.classList.contains("nav-open")); });
    document.querySelectorAll(".site-nav a").forEach(function (a) { a.addEventListener("click", function () { setOpen(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    window.matchMedia("(min-width: 1100px)").addEventListener("change", function (mq) { if (mq.matches) setOpen(false); });
  }

  /* Reveal on scroll. Siblings get a small stagger. Anything already scrolled past is shown too,
     so a fast fling or a jump link never leaves content invisible. */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  reveals.forEach(function (el) {
    var sibs = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, function (c) { return c.classList.contains("reveal"); }) : [];
    var i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty("--d", Math.min(i, 3) * 0.06 + "s");
  });
  var show = function (el) { el.classList.add("is-visible"); };
  reveals = reveals.filter(function (el) {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) { el.style.transition = "none"; show(el); requestAnimationFrame(function () { el.style.transition = ""; }); return false; }
    return true;
  });
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) { show(entry.target); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
    var sweep = function () {
      reveals = reveals.filter(function (el) {
        if (el.classList.contains("is-visible")) return false;
        if (el.getBoundingClientRect().top < window.innerHeight) { show(el); return false; }
        return true;
      });
      if (!reveals.length) window.removeEventListener("scroll", sweepSoon);
    };
    var t; var sweepSoon = function () { clearTimeout(t); t = setTimeout(sweep, 120); };
    window.addEventListener("scroll", sweepSoon, { passive: true });
  } else {
    reveals.forEach(show);
  }

  /* Hero video: only load/play on wider screens (mobile shows the still image) */
  document.querySelectorAll("video[data-desktop-only]").forEach(function (v) {
    var mq = window.matchMedia("(min-width: 810px)");
    var inView = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { inView = e[0].isIntersecting; sync(); }).observe(v);
    }
    var sync = function () {
      if (mq.matches && !reduceMotion && inView) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else { v.pause(); }
    };
    sync();
    mq.addEventListener ? mq.addEventListener("change", sync) : mq.addListener(sync);
  });

  /* Marquee: duplicate the track once so the loop is seamless */
  document.querySelectorAll(".marquee").forEach(function (m) {
    var track = m.querySelector(".marquee__track");
    if (!track) return;
    var clone = track.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("a").forEach(function (a) { a.tabIndex = -1; });
    m.appendChild(clone);
  });

  /* Event status from a date window: <span data-window="2026-09-01/2026-10-31">fallback</span> */
  document.querySelectorAll("[data-window]").forEach(function (el) {
    var parts = el.getAttribute("data-window").split("/");
    var start = new Date(parts[0] + "T00:00:00"), end = new Date(parts[1] + "T23:59:59"), now = new Date();
    var day = 864e5;
    if (now < start) {
      var d = Math.ceil((start - now) / day);
      el.textContent = d === 1 ? "Start morgen" : "Start over " + d + " dagen";
      el.dataset.state = "upcoming";
    } else if (now <= end) {
      var left = Math.ceil((end - now) / day);
      el.textContent = (el.dataset.liveLabel || "Nu bezig") + " · nog " + left + (left === 1 ? " dag" : " dagen");
      el.dataset.state = "live";
    } else {
      el.textContent = el.dataset.doneLabel || "Afgelopen";
      el.dataset.state = "done";
    }
  });

  /* Live wind at the coast (Open-Meteo, no key). Fills [data-wind] widgets; hides them on failure. */
  var winds = document.querySelectorAll("[data-wind]");
  if (winds.length && window.fetch) {
    var url = "https://api.open-meteo.com/v1/forecast?latitude=51.27&longitude=3.03&current=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn&timezone=Europe%2FBrussels";
    var dirs = ["N", "NNO", "NO", "ONO", "O", "OZO", "ZO", "ZZO", "Z", "ZZW", "ZW", "WZW", "W", "WNW", "NW", "NNW"];
    fetch(url).then(function (r) { if (!r.ok) throw r; return r.json(); }).then(function (data) {
      var c = data.current;
      winds.forEach(function (w) {
        var set = function (k, v) { var n = w.querySelector("[data-wind-" + k + "]"); if (n) n.textContent = v; };
        set("speed", Math.round(c.wind_speed_10m));
        set("gust", Math.round(c.wind_gusts_10m));
        set("dir", dirs[Math.round(c.wind_direction_10m / 22.5) % 16]);
        var arrow = w.querySelector("[data-wind-arrow]");
        /* direction is where wind comes FROM; arrow points where it blows TO */
        if (arrow) arrow.style.transform = "rotate(" + (c.wind_direction_10m + 180) + "deg)";
        var kn = c.wind_speed_10m;
        set("verdict", kn >= 25 ? "Stormriders-weer" : kn >= 16 ? "Surfbaar" : kn >= 10 ? "Licht" : "Flat");
        w.dataset.level = kn >= 25 ? "storm" : kn >= 16 ? "good" : "low";
        w.classList.add("is-loaded");
      });
    }).catch(function () { winds.forEach(function (w) { w.hidden = true; }); });
  }

  /* Lightbox for any [data-lightbox] gallery: keyboard, buttons, swipe */
  var galleries = document.querySelectorAll("[data-lightbox]");
  if (galleries.length) {
    var icon = function (id) { return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; };
    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Foto");
    box.innerHTML =
      '<button class="lightbox__close" aria-label="Sluiten">' + icon("i-close") + "</button>" +
      '<button class="lightbox__prev" aria-label="Vorige foto">' + icon("i-arrow-left") + "</button>" +
      '<img alt="">' +
      '<button class="lightbox__next" aria-label="Volgende foto">' + icon("i-arrow") + "</button>" +
      '<p class="lightbox__count" aria-live="polite"></p>';
    document.body.appendChild(box);
    var img = box.querySelector("img"), count = box.querySelector(".lightbox__count");
    var items = [], index = 0, lastFocus = null;

    var showItem = function (i) {
      index = (i + items.length) % items.length;
      var thumb = items[index].querySelector("img");
      img.src = items[index].getAttribute("href") || thumb.src;
      img.alt = thumb ? thumb.alt : "";
      count.textContent = index + 1 + " / " + items.length;
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
          items = links; lastFocus = a;
          showItem(i);
          box.classList.add("is-open");
          document.body.style.overflow = "hidden";
          box.querySelector(".lightbox__close").focus();
        });
      });
    });
    box.querySelector(".lightbox__close").addEventListener("click", close);
    box.querySelector(".lightbox__prev").addEventListener("click", function () { showItem(index - 1); });
    box.querySelector(".lightbox__next").addEventListener("click", function () { showItem(index + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") showItem(index - 1);
      if (e.key === "ArrowRight") showItem(index + 1);
    });
    var x0 = null;
    box.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) showItem(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }
})();

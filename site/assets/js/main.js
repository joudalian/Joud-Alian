/* ═══════════════════════════════════════════════════════════
   العهد للديكور والأدوات الصحية — سكربت الموقع
   لتعديل رقم الواتساب والمعلومات: افتح assets/js/config.js
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── أدوات ─────────────────────────────────────────────── */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  function waLink(msg) {
    var num = String(CFG.whatsapp || "").replace(/[^0-9]/g, "");
    var base = "https://wa.me/" + num;
    return msg ? base + "?text=" + encodeURIComponent(msg) : base;
  }

  /* ── تعبئة بيانات المحل ────────────────────────────────── */
  function hydrate() {
    $$("[data-wa]").forEach(function (el) {
      el.setAttribute("href", waLink(el.getAttribute("data-wa-msg") || ""));
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    });
    $$("[data-site-phone]").forEach(function (el) { el.textContent = CFG.phoneDisplay || ""; });
    $$("[data-site-hours]").forEach(function (el) { el.textContent = CFG.hours || ""; });
    $$("[data-site-address]").forEach(function (el) {
      el.textContent = CFG.address || "";
      if (CFG.mapsUrl && el.tagName !== "A") {
        var a = document.createElement("a");
        a.href = CFG.mapsUrl; a.target = "_blank"; a.rel = "noopener";
        a.textContent = CFG.address || ""; a.style.color = "inherit";
        el.textContent = ""; el.appendChild(a);
      }
    });

    var y = $("#year"); if (y) y.textContent = new Date().getFullYear();

    /* روابط التواصل الاجتماعي */
    var wrap = $("#footerSocial");
    if (wrap) {
      var icons = {
        instagram: '<path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.43.37 1 .42 2.2.06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.05 1.2-.25 1.8-.42 2.2-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.17-1 .37-2.2.42-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.05-1.8-.25-2.2-.42a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.17-.43-.37-1-.42-2.2C2.21 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.05-1.2.25-1.8.42-2.2.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.17 1-.37 2.2-.42C8.4 2.21 8.8 2.2 12 2.2zm0 1.8c-3.14 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17C2.4 10.1 2.4 10.46 2.4 12s0 1.9.06 3.14c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.6.06 4.74.06s3.5 0 4.74-.06c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.06-1.6.06-3.14s0-1.9-.06-3.14c-.05-1.14-.24-1.76-.4-2.17a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4C15.5 4.01 15.14 4 12 4zm0 3.05a4.95 4.95 0 1 1 0 9.9 4.95 4.95 0 0 1 0-9.9zm0 8.17a3.22 3.22 0 1 0 0-6.44 3.22 3.22 0 0 0 0 6.44zm6.3-8.37a1.16 1.16 0 1 1-2.32 0 1.16 1.16 0 0 1 2.32 0z"/>',
        facebook:  '<path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.29-.04-1.27-.12-2.41-.12-2.38 0-4.02 1.46-4.02 4.13V9.9H7.5V13h2.77v8h3.23z"/>',
        tiktok:    '<path d="M16.6 5.82a4.28 4.28 0 0 1-1.02-2.82h-3.1v11.6a2.42 2.42 0 1 1-1.73-2.32V9.1a5.52 5.52 0 1 0 4.83 5.48V9.06a7.3 7.3 0 0 0 4.27 1.37V7.33a4.28 4.28 0 0 1-3.25-1.5z"/>'
      };
      var social = CFG.social || {};
      Object.keys(icons).forEach(function (k) {
        if (!social[k]) return;
        var a = document.createElement("a");
        a.href = social[k]; a.target = "_blank"; a.rel = "noopener";
        a.setAttribute("aria-label", k);
        a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[k] + "</svg>";
        wrap.appendChild(a);
      });
    }
  }

  /* ── شاشة البداية ──────────────────────────────────────── */
  function preloader() {
    var el = $("#preloader");
    if (!el) return;
    var hide = function () { el.classList.add("is-done"); };
    if (REDUCED) { hide(); return; }
    window.addEventListener("load", function () { setTimeout(hide, 420); });
    setTimeout(hide, 2600); /* شبكة أمان */
  }

  /* ── تقسيم العنوان لكلمات ──────────────────────────────── */
  function splitWords() {
    $$("[data-split]").forEach(function (el) {
      if (el.dataset.splitDone) return;
      var words = el.textContent.trim().split(/\s+/);
      el.textContent = "";
      words.forEach(function (w, i) {
        var s = document.createElement("span");
        s.className = "word";
        s.textContent = w;
        s.style.transitionDelay = (i * 70) + "ms";
        el.appendChild(s);
        if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      });
      el.dataset.splitDone = "1";
    });
  }

  /* ── الظهور عند التمرير ────────────────────────────────── */
  function reveals() {
    var items = $$("[data-reveal]").concat($$("[data-split]"));
    if (REDUCED || !("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-in");
        $$(".word", el).forEach(function (w) { w.classList.add("is-in"); });
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var d = parseInt(el.getAttribute("data-reveal-delay") || "0", 10);
        setTimeout(function () {
          el.classList.add("is-in");
          $$(".word", el).forEach(function (w) { w.classList.add("is-in"); });
        }, d);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ── العدّادات ─────────────────────────────────────────── */
  function counters() {
    var nodes = $$("[data-count]");
    if (!nodes.length) return;
    var run = function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      var suffix = el.getAttribute("data-suffix") || "";
      if (REDUCED) { el.textContent = target.toLocaleString("ar-EG") + suffix; return; }
      var start = null, dur = 1700;
      var tick = function (t) {
        if (!start) start = t;
        var p = Math.min((t - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString("ar-EG") + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) { nodes.forEach(run); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ── الهيدر + التقدّم + زر الأعلى + البارالاكس ─────────── */
  function scrollFx() {
    var header = $("#header");
    var bar = $("#scrollProgress");
    var toTop = $("#toTop");
    var parallax = $$("[data-parallax]");
    var links = $$(".nav a");
    var sections = links.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
    var last = 0, ticking = false;

    function frame() {
      var y = window.pageYOffset;
      var h = document.documentElement.scrollHeight - window.innerHeight;

      if (header) {
        header.classList.toggle("is-stuck", y > 40);
        header.classList.toggle("is-hidden", y > 420 && y > last && !document.body.classList.contains("is-locked"));
      }
      if (bar) bar.style.transform = "scaleX(" + (h > 0 ? Math.min(y / h, 1) : 0) + ")";
      if (toTop) toTop.classList.toggle("is-on", y > 700);

      if (!REDUCED) {
        parallax.forEach(function (el) {
          var r = el.parentElement.getBoundingClientRect();
          if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
          var speed = parseFloat(el.getAttribute("data-parallax")) || 0.2;
          el.style.transform = "translate3d(0," + ((r.top * -1) * speed).toFixed(2) + "px,0)";
        });
      }

      /* تحديد القسم الحالي في القائمة */
      var current = null;
      sections.forEach(function (sec) {
        if (sec.getBoundingClientRect().top <= window.innerHeight * 0.38) current = sec.id;
      });
      links.forEach(function (a) {
        a.classList.toggle("is-current", current && a.getAttribute("href") === "#" + current);
      });

      last = y;
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) { requestAnimationFrame(frame); ticking = true; }
    }, { passive: true });
    window.addEventListener("resize", frame, { passive: true });
    frame();

    if (toTop) toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
    });
  }

  /* ── قائمة الجوال ──────────────────────────────────────── */
  function mobileMenu() {
    var burger = $("#burger"), menu = $("#mobileMenu");
    if (!burger || !menu) return;

    function setOpen(open) {
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
      document.body.classList.toggle("is-locked", open);
      if (open) {
        menu.hidden = false;
        requestAnimationFrame(function () {
          menu.classList.add("is-open");
          $$("nav a", menu).forEach(function (a, i) { a.style.animationDelay = (90 + i * 60) + "ms"; });
        });
      } else {
        menu.classList.remove("is-open");
        setTimeout(function () { menu.hidden = true; }, 400);
      }
    }

    burger.addEventListener("click", function () { setOpen(menu.hidden); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setOpen(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) setOpen(false); });
  }

  /* ── تصفية المعرض ──────────────────────────────────────── */
  function galleryFilter() {
    var btns = $$(".filter"), items = $$(".g-item");
    if (!btns.length) return;
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        btns.forEach(function (x) { x.classList.remove("is-active"); x.setAttribute("aria-selected", "false"); });
        b.classList.add("is-active"); b.setAttribute("aria-selected", "true");
        var f = b.getAttribute("data-filter");
        items.forEach(function (it) {
          var show = f === "all" || it.getAttribute("data-cat") === f;
          it.classList.toggle("is-hidden", !show);
        });
      });
    });
  }

  /* ── معرض الصور (Lightbox) ─────────────────────────────── */
  function lightbox() {
    var box = $("#lightbox"), img = $("#lbImg"), cap = $("#lbCap");
    if (!box) return;
    var items = $$(".g-item"), idx = 0, lastFocus = null;

    function visible() { return items.filter(function (i) { return !i.classList.contains("is-hidden"); }); }

    function show(i) {
      var list = visible();
      if (!list.length) return;
      idx = (i + list.length) % list.length;
      var el = list[idx];
      img.src = el.getAttribute("data-src");
      img.alt = el.getAttribute("data-caption") || "";
      cap.textContent = el.getAttribute("data-caption") || "";
    }

    function open(el) {
      lastFocus = document.activeElement;
      var list = visible();
      show(list.indexOf(el));
      box.hidden = false;
      document.body.classList.add("is-locked");
      requestAnimationFrame(function () { box.classList.add("is-open"); });
      $("#lbClose").focus();
    }

    function close() {
      box.classList.remove("is-open");
      document.body.classList.remove("is-locked");
      setTimeout(function () { box.hidden = true; img.src = ""; }, 350);
      if (lastFocus) lastFocus.focus();
    }

    items.forEach(function (el) { el.addEventListener("click", function () { open(el); }); });
    $("#lbClose").addEventListener("click", close);
    $("#lbPrev").addEventListener("click", function () { show(idx - 1); });
    $("#lbNext").addEventListener("click", function () { show(idx + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      /* في الواجهة العربية: السهم الأيسر = التالي */
      if (e.key === "ArrowLeft") show(idx + 1);
      if (e.key === "ArrowRight") show(idx - 1);
    });
  }

  /* ── نموذج الطلب → واتساب ──────────────────────────────── */
  function orderForm() {
    var form = $("#orderForm");
    if (!form) return;
    var err = $("#formErr");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var area = form.area.value.trim();
      var cat = form.cat.value;
      var notes = form.notes.value.trim();

      if (!name || !area || !cat) {
        err.textContent = "الرجاء تعبئة الاسم والمنطقة والقسم المطلوب.";
        err.hidden = false;
        (!name ? form.name : !area ? form.area : form.cat).focus();
        return;
      }
      err.hidden = true;

      var msg =
        "*طلب جديد من الموقع*\n" +
        "──────────────\n" +
        "*الاسم:* " + name + "\n" +
        "*المنطقة:* " + area + "\n" +
        "*القسم:* " + cat + "\n" +
        (notes ? "*التفاصيل:* " + notes + "\n" : "") +
        "──────────────\n" +
        "بانتظار ردكم، شكراً.";

      window.open(waLink(msg), "_blank", "noopener");
    });
  }

  /* ── التشغيل ───────────────────────────────────────────── */
  function init() {
    hydrate();
    preloader();
    splitWords();
    reveals();
    counters();
    scrollFx();
    mobileMenu();
    galleryFilter();
    lightbox();
    orderForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();

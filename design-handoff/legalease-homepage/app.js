/* LegalEase homepage - interactions */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Header scroll state + logo swap ---- */
  var header = document.getElementById('header');
  var headerLogo = document.getElementById('headerLogo');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (y > 24) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu ---- */
  var mMenu = document.getElementById('mMenu');
  var openBtn = document.getElementById('menuOpen');
  var closeBtn = document.getElementById('menuClose');
  function setMenu(open) {
    mMenu.classList.toggle('open', open);
    mMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
    openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (openBtn) openBtn.addEventListener('click', function () { setMenu(true); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setMenu(false); });
  Array.prototype.forEach.call(document.querySelectorAll('.m-menu a'), function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });

  /* ---- Sticky mobile CTA (after hero) ---- */
  var sticky = document.getElementById('stickyCta');
  var hero = document.getElementById('top');
  function updateSticky() {
    if (!sticky) return;
    var y = window.scrollY || window.pageYOffset;
    sticky.classList.toggle('show', y > 620);
  }
  window.addEventListener('scroll', updateSticky, { passive: true });
  window.addEventListener('resize', updateSticky);
  updateSticky();

  /* ---- Scroll reveal ---- */
  var reveals = document.querySelectorAll('.reveal');
  if (reduce) {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('in'); });
  } else if ('IntersectionObserver' in window) {
    var revObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(reveals, function (el) { revObs.observe(el); });
  } else {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('in'); });
  }

  /* ---- FAQ category tabs ---- */
  var tabs = document.querySelectorAll('.faq-tab');
  var cats = document.querySelectorAll('.faq-cat');
  Array.prototype.forEach.call(tabs, function (tab) {
    tab.addEventListener('click', function () {
      var c = tab.getAttribute('data-cat');
      Array.prototype.forEach.call(tabs, function (t) {
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      Array.prototype.forEach.call(cats, function (cat) {
        cat.classList.toggle('active', cat.getAttribute('data-cat') === c);
      });
    });
  });

  /* ---- Guided-path spine progress ---- */
  var fill = document.getElementById('spineFill');
  var node = document.getElementById('spineNode');
  if (fill && node && !reduce) {
    var ticking = false;
    function updateSpine() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var p = max > 0 ? (window.scrollY || window.pageYOffset) / max : 0;
      p = Math.max(0, Math.min(1, p));
      var vh = doc.clientHeight;
      fill.style.height = (p * vh) + 'px';
      node.style.top = (p * vh) + 'px';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(updateSpine); ticking = true; }
    }, { passive: true });
    window.addEventListener('resize', updateSpine);
    updateSpine();
  }

  /* ---- Dashboard count-up (once, when visible) ---- */
  if (!reduce && 'IntersectionObserver' in window) {
    var counted = false;
    var dnEls = document.querySelectorAll('.dash .dn');
    if (dnEls.length) {
      var countObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !counted) {
            counted = true;
            Array.prototype.forEach.call(dnEls, function (el) {
              var raw = el.textContent.replace(/[^0-9]/g, '');
              var target = parseInt(raw, 10);
              if (!target) return;
              var dur = 1100, start = null;
              function tick(ts) {
                if (!start) start = ts;
                var t = Math.min((ts - start) / dur, 1);
                var eased = 1 - Math.pow(1 - t, 3);
                el.textContent = Math.round(target * eased).toLocaleString();
                if (t < 1) requestAnimationFrame(tick);
                else el.textContent = target.toLocaleString();
              }
              requestAnimationFrame(tick);
            });
          }
        });
      }, { threshold: 0.4 });
      countObs.observe(dnEls[0].closest('.dash'));
    }
  }

  /* ---- Hero selector self-assembles, then flagship flips to Eligible ---- */
  var heroSel = document.getElementById('heroSel');
  if (heroSel) {
    if (reduce) {
      heroSel.classList.add('run', 'flipped');
    } else if ('IntersectionObserver' in window) {
      var heroObs = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            heroSel.classList.add('run');
            setTimeout(function () { heroSel.classList.add('flipped'); }, 1050);
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.3 });
      heroObs.observe(heroSel);
    } else {
      heroSel.classList.add('run', 'flipped');
    }
  }

  /* ---- Guided-path diagram draws itself when scrolled into view ---- */
  var gpath = document.getElementById('gpath');
  if (gpath) {
    if (reduce) {
      gpath.classList.add('run');
    } else if ('IntersectionObserver' in window) {
      var gpObs = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            gpath.classList.add('run');
            var motion = gpath.querySelector('animateMotion');
            if (motion && motion.beginElement) { try { motion.beginElement(); } catch (err) {} }
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.4 });
      gpObs.observe(gpath);
    } else {
      gpath.classList.add('run');
    }
  }

  /* ---- Market-stat metrics count up once when visible ---- */
  if (!reduce && 'IntersectionObserver' in window) {
    var mCounted = false;
    var metricEls = document.querySelectorAll('.metric .num');
    if (metricEls.length) {
      var mObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !mCounted) {
            mCounted = true;
            Array.prototype.forEach.call(metricEls, function (el) {
              var full = el.textContent.trim();
              var m = full.match(/^([^0-9]*)([0-9]+(?:\.[0-9]+)?)(.*)$/);
              if (!m) return;
              var pre = m[1], target = parseFloat(m[2]), suf = m[3];
              var decimals = (m[2].split('.')[1] || '').length;
              var dur = 1300, start = null;
              function tick(ts) {
                if (!start) start = ts;
                var t = Math.min((ts - start) / dur, 1);
                var eased = 1 - Math.pow(1 - t, 3);
                el.textContent = pre + (target * eased).toFixed(decimals) + suf;
                if (t < 1) requestAnimationFrame(tick);
                else el.textContent = full;
              }
              requestAnimationFrame(tick);
            });
          }
        });
      }, { threshold: 0.5 });
      mObs.observe(metricEls[0].closest('.proof-grid'));
    }
  }

  // Founder story expand/collapse
  var storyBtn = document.getElementById('storyToggle');
  var storyEl = document.getElementById('founderStory');
  if (storyBtn && storyEl) {
    storyBtn.addEventListener('click', function () {
      var open = storyEl.hasAttribute('hidden');
      if (open) { storyEl.removeAttribute('hidden'); }
      else { storyEl.setAttribute('hidden', ''); }
      storyBtn.setAttribute('aria-expanded', String(open));
      storyBtn.textContent = open ? 'Hide the story' : 'Read the story';
    });
  }




  // Meet Wilma: sequential chat reveal
  var wChat = document.getElementById('wilmaChat');
  if (wChat) {
    var rows = [...wChat.querySelectorAll('.wc-row')];
    var userRow = wChat.querySelector('[data-msg="0"]');
    var typingRow = wChat.querySelector('.wc-typing');
    var botRow = wChat.querySelector('[data-msg="2"]');
    function playChat() {
      if (reduce) { rows.forEach(function (r) { if (!r.classList.contains('wc-typing')) r.classList.add('shown'); }); return; }
      // 1) user message appears
      setTimeout(function () { userRow.classList.add('shown'); }, 250);
      // 2) typing indicator appears
      setTimeout(function () { typingRow.classList.add('shown'); }, 1100);
      // 3) typing disappears, Wilma reply appears
      setTimeout(function () {
        typingRow.classList.remove('shown');
        botRow.classList.add('shown');
      }, 2400);
    }
    if (!('IntersectionObserver' in window)) { playChat(); }
    else {
      var wObs = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) { if (e.isIntersecting) { playChat(); obs.disconnect(); } });
      }, { threshold: 0.4 });
      wObs.observe(wChat);
    }
  }

})();

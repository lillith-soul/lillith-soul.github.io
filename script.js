// Lillith Soul home page interactions. No dependencies.
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  ready(function () {
    initNav();
    initReveal();
    initFilters();
    initLightbox();
    initKnowledge();
    if (!reduceMotion) {
      initSky();
      if (finePointer) {
        initTilt();
        initParallax();
      }
    }
  });

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // Scroll progress bar, nav shadow and current-section highlight
  function initNav() {
    var nav = document.querySelector('.nav');
    var bar = document.querySelector('.progress');
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-right a[href^="#"]'));
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (nav) nav.classList.toggle('is-scrolled', y > 40);
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      var current = -1;
      sections.forEach(function (s, i) {
        if (s && s.getBoundingClientRect().top < window.innerHeight * 0.4) current = i;
      });
      links.forEach(function (a, i) { a.classList.toggle('is-current', i === current); });
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // Fade/slide elements in as they enter the viewport, staggered per row
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (e, i) {
        e.target.style.setProperty('--d', (i * 0.08) + 's');
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  // Product category filter
  function initFilters() {
    var chips = document.querySelectorAll('.chip');
    var cards = document.querySelectorAll('#products .card');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var f = chip.getAttribute('data-filter');
        chips.forEach(function (c) {
          var on = c === chip;
          c.classList.toggle('is-active', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        cards.forEach(function (card, i) {
          var show = f === 'all' || card.getAttribute('data-kind') === f;
          card.classList.toggle('is-hidden', !show);
          if (show && !reduceMotion && card.animate) {
            card.animate(
              [{ opacity: 0, transform: 'translateY(16px) scale(.97)' }, { opacity: 1, transform: 'none' }],
              { duration: 450, delay: i * 40, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }
            );
          }
        });
      });
    });
  }

  // "Krag wiedzy": stone categories on the left switch the panel on the right (all panels stay visible without JS)
  function initKnowledge() {
    var nav = document.querySelector('.kcats');
    if (!nav) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('.kpanel'));
    function show(id, animate) {
      var found = false;
      panels.forEach(function (p) {
        var on = p.id === id;
        p.hidden = !on;
        if (on) {
          found = true;
          if (animate && !reduceMotion && p.animate) {
            p.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
              { duration: 350, easing: 'cubic-bezier(.2,.7,.2,1)' });
          }
        }
      });
      links.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      return found;
    }
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var id = a.getAttribute('href').slice(1);
        show(id, true);
        if (history.replaceState) history.replaceState(null, '', '#' + id);
      });
    });
    // Text search: filters the list by stone name and article text (ignores Polish diacritics and the "coming soon" placeholder)
    var input = document.querySelector('.ksearch input');
    var none = document.querySelector('.knone');
    function norm(s) { return s.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    var texts = panels.map(function (p) {
      var t = p.querySelector('h2').textContent;
      p.querySelectorAll('.article').forEach(function (a) { t += ' ' + a.textContent; });
      return norm(t);
    });
    function filter() {
      var q = norm(input.value.trim());
      var first = -1, activeVisible = false;
      links.forEach(function (a, i) {
        var match = !q || texts[i].indexOf(q) !== -1;
        a.classList.toggle('is-hidden', !match);
        if (match && first < 0) first = i;
        if (match && a.classList.contains('is-active')) activeVisible = true;
      });
      if (first < 0) {
        panels.forEach(function (p) { p.hidden = true; });
        none.hidden = false;
        return;
      }
      none.hidden = true;
      var shown = panels.some(function (p) { return !p.hidden; });
      if (!activeVisible) {
        show(panels[first].id, true);
      } else if (!shown) {
        // panels were hidden by an earlier "no results": bring back the one that is still marked active
        links.forEach(function (a, i) { if (a.classList.contains('is-active')) show(panels[i].id, true); });
      }
    }
    if (input && none) {
      input.addEventListener('input', filter);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var vis = links.filter(function (a) { return !a.classList.contains('is-hidden'); });
          if (vis.length) vis[0].click();
        }
      });
    }

    var start = location.hash.slice(1);
    if (!start || !show(start, false)) show(panels[0].id, false);
  }

  // Click a product photo to see it larger
  function initLightbox() {
    var box = document.querySelector('.lightbox');
    if (!box || !box.showModal) return;
    var img = box.querySelector('img');
    document.querySelectorAll('[data-full]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        img.src = btn.getAttribute('data-full');
        img.alt = btn.getAttribute('aria-label') || '';
        box.showModal();
      });
    });
    box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('.lightbox-close')) box.close(); });
  }

  // 3D tilt and cursor spotlight on cards
  function initTilt() {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', ((px - 0.5) * 8).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - py) * 8).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  // Logo and hexagons drift with the cursor, each by its own amount (data-parallax in px)
  function initParallax() {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]')).map(function (el) {
      return { el: el, amount: parseFloat(el.getAttribute('data-parallax')) || 12, cx: 0, cy: 0 };
    });
    if (!items.length) return;
    var nx = 0, ny = 0, raf = 0;
    window.addEventListener('pointermove', function (e) {
      nx = e.clientX / window.innerWidth - 0.5;
      ny = e.clientY / window.innerHeight - 0.5;
      if (!raf) raf = requestAnimationFrame(step);
    }, { passive: true });
    function step() {
      var moving = false;
      items.forEach(function (it) {
        var tx = nx * it.amount, ty = ny * it.amount;
        it.cx += (tx - it.cx) * 0.08;
        it.cy += (ty - it.cy) * 0.08;
        // `translate` stacks with the reveal/float transforms instead of replacing them
        it.el.style.translate = it.cx.toFixed(2) + 'px ' + it.cy.toFixed(2) + 'px';
        if (Math.abs(tx - it.cx) > 0.05 || Math.abs(ty - it.cy) > 0.05) moving = true;
      });
      raf = moving ? requestAnimationFrame(step) : 0;
    }
  }

  // Twinkling sparkles with constellation lines that gather around the cursor
  function initSky() {
    var canvas = document.querySelector('.hero-sky');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var hero = canvas.parentElement;
    var colors = ['246,221,160', '212,175,106', '197,143,211', '239,232,246'];
    var stars = [], w = 0, h = 0, dpr = 1, running = true, mouse = { x: -9999, y: -9999 };

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(120, Math.round(w * h / 10000));
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
          r: Math.random() * 1.6 + 0.4,
          c: colors[(Math.random() * colors.length) | 0],
          p: Math.random() * Math.PI * 2
        });
      }
    }

    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      var near = [];
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.x += s.vx; s.y += s.vy;
        if (s.x < 0) s.x += w; else if (s.x > w) s.x -= w;
        if (s.y < 0) s.y += h; else if (s.y > h) s.y -= h;
        var dx = s.x - mouse.x, dy = s.y - mouse.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 160) { s.x += dx / d * 0.6; s.y += dy / d * 0.6; near.push(s); }
        var a = 0.4 + 0.45 * Math.sin(t / 900 + s.p);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + s.c + ',' + a.toFixed(2) + ')';
        ctx.fill();
      }
      ctx.lineWidth = 0.7;
      for (var j = 0; j < near.length; j++) {
        for (var k = j + 1; k < near.length; k++) {
          var ex = near[j].x - near[k].x, ey = near[j].y - near[k].y, e = Math.sqrt(ex * ex + ey * ey);
          if (e < 110) {
            ctx.strokeStyle = 'rgba(212,175,106,' + (0.5 * (1 - e / 110)).toFixed(2) + ')';
            ctx.beginPath(); ctx.moveTo(near[j].x, near[j].y); ctx.lineTo(near[k].x, near[k].y); ctx.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    }

    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
    window.addEventListener('resize', resize);

    // Pause when the hero is off screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        var vis = en[0].isIntersecting;
        if (vis && !running) { running = true; requestAnimationFrame(frame); }
        running = vis;
      }).observe(hero);
    }

    resize();
    requestAnimationFrame(frame);
  }
})();

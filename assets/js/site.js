/* COSMIC Lab — site behaviour.
   Progressive enhancement only: every page is readable with this file absent. */
(function () {
  'use strict';

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var mqDesktop = window.matchMedia('(min-width:720px)');

  /* ---------------------------------------------------------------------
     Header: transparent over the hero, solid once past it.
     Derived from a live rect read rather than a cached offset, so it stays
     correct after layout changes. rAF is starved in background frames, so
     the measure also runs synchronously — gating on rAF alone can latch the
     header in a stale state permanently.
     --------------------------------------------------------------------- */
  (function () {
    var bar  = $('[data-appbar]');
    var hero = $('[data-hero]');
    if (!bar) return;
    var raf = 0;

    function measure() {
      raf = 0;
      if (!mqDesktop.matches) {           // pinned in flow on phones; always dark
        bar.classList.add('is-over');
        bar.classList.remove('is-solid');
        return;
      }
      var solid = !hero || hero.getBoundingClientRect().bottom <= 64;
      bar.classList.toggle('is-solid', solid);
      bar.classList.toggle('is-over', !solid);
    }
    function onScroll() {
      measure();
      if (!raf) raf = requestAnimationFrame(measure);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', measure);
    measure();
  })();

  /* ---------------------------------------------------------------------
     How much is permanently covered at the top of the viewport: the fixed
     header plus whichever sticky bar the page carries. Deep-link targets sit
     below it. It is measured rather than hard-coded because the publication
     filter bar grows a row whenever the chips wrap, which depends on the
     viewport width and on how many research areas exist.
     --------------------------------------------------------------------- */
  (function () {
    var bar = $('[data-filterbar]') || $('[data-subbar]');
    var appbar = $('[data-appbar]');

    function measure() {
      var offset = 0;
      if (bar) {
        var cs = getComputedStyle(bar);
        if (cs.position === 'sticky') offset = (parseFloat(cs.top) || 0) + bar.offsetHeight;
        else offset = bar.offsetHeight;
      } else if (appbar && /^(fixed|sticky)$/.test(getComputedStyle(appbar).position)) {
        offset = appbar.offsetHeight;
      }
      document.documentElement.style.setProperty('--sticky-offset', Math.round(offset) + 'px');
    }
    measure();
    window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    window.addEventListener('load', measure, { once: true });
  })();

  /* ---------------------------------------------------------------------
     Bottom sheets — one behaviour contract shared by the menu and the
     publication filters.
     --------------------------------------------------------------------- */
  function Sheet(dimmer, trigger, opts) {
    opts = opts || {};
    var panel = $('.sheet', dimmer);
    var lastFocus = null;

    function focusables() {
      return $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', panel)
        .filter(function (el) { return el.offsetParent !== null || el === panel; });
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function onDim(e) {
      // Only when the click target *is* the dimmer, so clicks inside stay put.
      if (e.target === dimmer) close();
    }
    function open() {
      // Safari does not focus a button on click, so fall back to the trigger —
      // otherwise closing would drop focus to the top of the document.
      var a = document.activeElement;
      lastFocus = (a && a !== document.body) ? a : trigger;
      dimmer.hidden = false;
      document.body.style.overflow = 'hidden';
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
      if (opts.onOpen) opts.onOpen();
      panel.focus();
      dimmer.addEventListener('keydown', onKey);
      dimmer.addEventListener('click', onDim);
    }
    function close() {
      dimmer.hidden = true;
      document.body.style.overflow = '';
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      dimmer.removeEventListener('keydown', onKey);
      dimmer.removeEventListener('click', onDim);
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
      if (opts.onClose) opts.onClose();
    }
    return { open: open, close: close, isOpen: function () { return !dimmer.hidden; } };
  }

  /* Mobile menu */
  (function () {
    var dimmer = $('[data-menu-sheet]');
    var btn    = $('[data-menu-open]');
    if (!dimmer || !btn) return;
    var icMenu = $('[data-ic-menu]', btn), icClose = $('[data-ic-close]', btn);

    var sheet = Sheet(dimmer, btn, {
      onOpen:  function () { icMenu.hidden = true;  icClose.hidden = false; btn.setAttribute('aria-label', 'Close menu'); },
      onClose: function () { icMenu.hidden = false; icClose.hidden = true;  btn.setAttribute('aria-label', 'Open menu'); }
    });
    btn.addEventListener('click', function () { sheet.isOpen() ? sheet.close() : sheet.open(); });
    // Picking a destination closes the sheet; the navigation does the rest.
    $$('a', dimmer).forEach(function (a) { a.addEventListener('click', function () { sheet.close(); }); });
  })();

  /* ---------------------------------------------------------------------
     Home — "show earlier items"
     --------------------------------------------------------------------- */
  (function () {
    var btn = $('[data-news-toggle]');
    if (!btn) return;
    var rows = $$('[data-older]');
    btn.addEventListener('click', function () {
      var showing = btn.getAttribute('aria-expanded') === 'true';
      rows.forEach(function (r) { r.hidden = showing; });
      btn.setAttribute('aria-expanded', String(!showing));
      btn.textContent = showing ? 'Show earlier items' : 'Hide earlier items';
    });
  })();

  /* ---------------------------------------------------------------------
     Research — area tabs

     Three things have to hold for the tabs to feel right on every screen:

     1. Every section can reach the top. On a tall window the last sections
        run out of page below them, so a click would stop short and two tabs
        could land on the same spot. The last section is padded by exactly
        the shortfall, measured, so nothing is added where it is not needed.

     2. The underline follows one rule. The current section is the last one
        whose top has crossed a line a quarter of the way down the visible
        area (capped, so a short section on a very tall window still counts).
        While a click's smooth scroll is still travelling, that rule is
        paused, so the underline does not flick through the sections passed
        on the way; it resumes once scrolling settles or the reader takes
        over with the wheel, touch or keys.

     3. The underlined tab is on screen. On a phone the tab strip scrolls
        sideways, so the active tab is brought into view whenever it changes.
     --------------------------------------------------------------------- */
  (function () {
    var tabs = $$('[data-area-tab]');
    if (!tabs.length) return;
    var strip = tabs[0].parentNode;
    var sections = tabs.map(function (t) { return document.getElementById(t.getAttribute('data-area-tab')); })
                       .filter(Boolean);
    if (!sections.length) return;
    var last = sections[sections.length - 1];
    var locked = null, settleTimer = 0, current = null;

    function offset() {
      var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sticky-offset'));
      return (isNaN(v) ? 120 : v) + 12;   // matches scroll-margin-top in main.css
    }

    function revealInStrip(tab) {
      var sr = strip.getBoundingClientRect(), tr = tab.getBoundingClientRect(), pad = 20;
      if (tr.left < sr.left + pad) strip.scrollLeft -= (sr.left + pad - tr.left);
      else if (tr.right > sr.right - pad) strip.scrollLeft += (tr.right - (sr.right - pad));
    }

    function setActive(id) {
      if (id === current) return;
      current = id;
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-area-tab') === id;
        t.classList.toggle('is-active', on);
        if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
        var ul = $('.ul', t);
        if (on && !ul) { ul = document.createElement('span'); ul.className = 'ul'; ul.setAttribute('aria-hidden', 'true'); t.appendChild(ul); }
        if (!on && ul) ul.remove();
        if (on) revealInStrip(t);
      });
    }

    function spy() {
      if (locked) return;
      var root = document.documentElement;
      if (window.scrollY + window.innerHeight >= root.scrollHeight - 2) { setActive(last.id); return; }
      var off = offset();
      // A quarter of the way down, but never more than 96px below the bar: on a
      // very tall window a whole short section would otherwise fit above it.
      var line = off + Math.min((window.innerHeight - off) * 0.25, 96);
      var id = sections[0].id;
      sections.forEach(function (sec) { if (sec.getBoundingClientRect().top <= line) id = sec.id; });
      setActive(id);
    }

    function padLast() {
      last.style.minHeight = '';
      var root = document.documentElement;
      var wanted = last.getBoundingClientRect().top + window.scrollY - offset();
      var shortfall = wanted - (root.scrollHeight - window.innerHeight);
      if (shortfall > 0) last.style.minHeight = Math.ceil(last.offsetHeight + shortfall) + 'px';
    }

    function release() { locked = null; clearTimeout(settleTimer); spy(); }

    tabs.forEach(function (t) {
      t.addEventListener('click', function (e) {
        var id = t.getAttribute('data-area-tab');
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        locked = id;
        setActive(id);
        history.replaceState(null, '', '#' + id);
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.focus({ preventScroll: true });
        clearTimeout(settleTimer);
        settleTimer = setTimeout(release, 200);   // released sooner if no scrolling happens
        window.dispatchEvent(new Event('scroll'));
      });
    });

    window.addEventListener('scroll', function () {
      if (locked) { clearTimeout(settleTimer); settleTimer = setTimeout(release, 160); return; }
      spy();
    }, { passive: true });
    ['wheel', 'touchstart', 'keydown'].forEach(function (type) {
      window.addEventListener(type, function () { if (locked) release(); }, { passive: true });
    });

    function refresh() { padLast(); spy(); }
    refresh();
    window.addEventListener('resize', refresh);
    window.addEventListener('load', refresh, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  })();

  /* ---------------------------------------------------------------------
     Publications — three independent facets that intersect
     --------------------------------------------------------------------- */
  (function () {
    var list = $('[data-publist]');
    if (!list) return;

    var arts    = $$('.grid-pub', list);
    var empty   = $('[data-pub-empty]');
    var count   = $('#pubcount');
    var exportA = $('[data-export]');
    var expCount= $('[data-export-count]');
    var filterBtn = $('[data-filter-open]');
    var filterLbl = $('[data-filter-btn-label]');
    var sheetDim  = $('[data-filter-sheet]');
    var applyBtn  = $('[data-filter-apply]');
    var facetHost = $('[data-sheet-facets]');
    var total = arts.length;

    var f = { year: 'all', thrust: 'all', type: 'all' };
    var pubs = [];
    try { pubs = JSON.parse($('#pubdata').textContent) || []; } catch (e) { pubs = []; }

    function matches(el) {
      if (f.year   !== 'all' && el.getAttribute('data-year') !== f.year) return false;
      if (f.type   !== 'all' && el.getAttribute('data-type') !== f.type) return false;
      if (f.thrust !== 'all') {
        var t = (el.getAttribute('data-thrust') || '').split(/\s+/);
        if (t.indexOf(f.thrust) === -1) return false;
      }
      return true;
    }

    function apply() {
      var n = 0;
      arts.forEach(function (el) {
        var ok = matches(el);
        el.hidden = !ok;
        if (ok) n++;
      });
      if (empty) empty.hidden = n !== 0;
      if (count) {
        count.textContent = n === 0
          ? 'No publications match the current filters'
          : n + ' of ' + total + ' publications match the current filters';
      }
      if (expCount) expCount.textContent = n;
      var nSel = ['year', 'thrust', 'type'].filter(function (k) { return f[k] !== 'all'; }).length;
      if (filterLbl) filterLbl.textContent = nSel ? 'Filters (' + nSel + ')' : 'Filters';
      if (applyBtn) applyBtn.textContent = 'Show ' + n;
      // Keep both chip sets in sync — the sheet mirrors the desktop rows.
      $$('.chip[data-facet]').forEach(function (c) {
        c.setAttribute('aria-pressed', String(f[c.getAttribute('data-facet')] === c.getAttribute('data-value')));
      });
    }

    document.addEventListener('click', function (e) {
      var chip = e.target.closest ? e.target.closest('.chip[data-facet]') : null;
      if (chip) {
        f[chip.getAttribute('data-facet')] = chip.getAttribute('data-value');
        apply();
        return;                                   // selecting a chip never closes the sheet
      }
      var clear = e.target.closest ? e.target.closest('[data-clear-filters]') : null;
      if (clear) { f = { year: 'all', thrust: 'all', type: 'all' }; apply(); }
    });

    /* The sheet mirrors the desktop chip rows at the larger size. */
    if (sheetDim && filterBtn && facetHost) {
      $$('[data-chiprows] .chiprow').forEach(function (row) {
        var wrap = document.createElement('div');
        var head = document.createElement('p');
        head.className = 't-13b c-slate';
        head.textContent = $('.facet', row).textContent;
        var chips = document.createElement('div');
        chips.className = 'chips';
        chips.style.marginTop = '8px';
        $$('.chip', row).forEach(function (c) {
          var copy = c.cloneNode(true);
          copy.classList.add('chip-md');
          chips.appendChild(copy);
        });
        wrap.appendChild(head); wrap.appendChild(chips);
        facetHost.appendChild(wrap);
      });
      var sheet = Sheet(sheetDim, filterBtn);
      filterBtn.addEventListener('click', function () { sheet.isOpen() ? sheet.close() : sheet.open(); });
      if (applyBtn) applyBtn.addEventListener('click', function () { sheet.close(); });
    }

    /* BibTeX export follows the filtered set, not the whole list. */
    if (exportA) {
      exportA.addEventListener('click', function (e) {
        e.preventDefault();
        var wanted = {};
        arts.forEach(function (el) { if (!el.hidden) wanted[el.id] = true; });
        var out = pubs.filter(function (p) { return wanted[p.id]; }).map(function (p) {
          // Entries carry their official record in `bibtex`. The stub below is
          // only a last resort for one added without it.
          if (p.bibtex) return p.bibtex.trim();
          var key = (p.id || '').replace(/^p-/, '');
          var authors = (p.authors || []).map(function (a) { return a.name.replace(/\*/g, ''); }).join(' and ');
          var kind = p.type === 'journal' ? 'article'
                   : p.type === 'conference' ? 'inproceedings' : 'misc';
          var where = p.type === 'journal' ? '  journal   = {' + p.venue + '},\n'
                    : p.type === 'conference' ? '  booktitle = {' + p.venue + '},\n'
                    : '  howpublished = {' + p.venue + '},\n';
          return '@' + kind + '{' + key + ',\n' +
                 '  title     = {' + p.title + '},\n' +
                 '  author    = {' + authors + '},\n' +
                 where +
                 '  year      = {' + p.year + '}\n}';
        }).join('\n\n');
        var blob = new Blob([out + '\n'], { type: 'text/plain;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'cosmic-lab.bib';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      });
    }

    /* Per-publication BibTeX: reveal the entry's own record in place, and copy
       it on request. The bulk export above hands out the filtered set. */
    $$('[data-bib-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        btn.setAttribute('aria-expanded', String(!open));
        if (panel) panel.hidden = open;
      });
    });
    $$('[data-bib-copy]').forEach(function (btn) {
      if (!navigator.clipboard) { btn.hidden = true; return; }
      btn.addEventListener('click', function () {
        var pre = btn.parentNode.querySelector('pre');
        navigator.clipboard.writeText(pre.textContent.trim()).then(function () {
          btn.textContent = 'Copied';
          setTimeout(function () { btn.textContent = 'Copy'; }, 1400);
        });
      });
    });

    apply();
  })();

  /* ---------------------------------------------------------------------
     Join — FAQ accordion
     --------------------------------------------------------------------- */
  (function () {
    $$('[data-faq]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (panel) panel.hidden = open;
        var plus = $('[data-ic-plus]', btn), minus = $('[data-ic-minus]', btn);
        if (plus && minus) { plus.hidden = !open; minus.hidden = open; }
      });
    });
  })();

  /* ---------------------------------------------------------------------
     Deep links — #p-… from a Research "Selected work" row, or a shared URL.

     The browser jumps to the anchor while the page is still in the fallback
     font. When Pretendard swaps in, every line above the target re-flows and
     the target slides out from under the viewport — so the reader lands near
     the right entry rather than on it. Re-anchor once the font and the rest of
     the page have settled, and move focus there so keyboard users land with
     it. Stop as soon as the reader scrolls for themselves.
     --------------------------------------------------------------------- */
  (function () {
    if (!location.hash) return;
    var el;
    try { el = document.getElementById(decodeURIComponent(location.hash.slice(1))); }
    catch (e) { return; }
    if (!el) return;

    var readerMoved = false;
    var release = function () { readerMoved = true; };
    ['wheel', 'touchmove', 'keydown', 'mousedown'].forEach(function (t) {
      window.addEventListener(t, release, { passive: true, once: true });
    });
    setTimeout(release, 3000);

    /* Correct until the target actually sits where it should, rather than
       guessing when the page has stopped moving. Every reflow above the
       target — the font swap most of all — shifts it, and a single
       re-anchor can land before the last of them. */
    var deadline = Date.now() + 2500;

    function wanted() {
      var m = parseFloat(getComputedStyle(el).scrollMarginTop);
      return isNaN(m) ? 0 : m;
    }
    function settle() {
      if (readerMoved) return;
      var off = el.getBoundingClientRect().top - wanted();
      // Ignore sub-pixel drift, and the case where the page simply cannot
      // scroll far enough because the target sits at the very bottom.
      var atEnd = Math.ceil(window.scrollY + window.innerHeight) >=
                  document.documentElement.scrollHeight;
      if (Math.abs(off) > 1 && !(off < 0 && atEnd)) el.scrollIntoView({ block: 'start' });
      if (Date.now() < deadline) requestAnimationFrame(settle);
    }

    if (el.hasAttribute('tabindex')) el.focus({ preventScroll: true });
    settle();
    window.addEventListener('load', function () { deadline = Date.now() + 1200; settle(); }, { once: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { deadline = Date.now() + 1200; settle(); });
    }
  })();
})();

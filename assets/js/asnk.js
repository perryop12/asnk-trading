/* ==========================================================================
   ASNK Trading Limited — site script (vanilla JS, no dependencies)
   Redesign by Vexon Labs.
   - Shared: header, mega menu, mobile menu, search palette (/ or Cmd/Ctrl+K),
     quick-view drawer, scroll reveal, counters, tilt, parallax, back-to-top,
     credit pill, image skeletons, toast.
   - Page modules (by <body data-page>): home, products, product, brand, contact.
   ========================================================================== */
(function () {
  'use strict';

  var D = document;
  var ROOT = D.body.getAttribute('data-root') || '';
  var PRODUCTS = (window.ASNK_PRODUCTS || []).slice();
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var PHONE = '+233206606219';
  var EMAIL = 'info@asnktrading.com';

  /* ---------- Brand facts (from the old About page) ---------- */
  var BRAND_ORDER = ['arm-and-hammer', 'oxiclean', 'fino', 'paclan', 'kyknos'];
  var BRANDS = {
    'arm-and-hammer': { name: 'Arm & Hammer', tagline: 'Oral and Personal Care Products', maker: 'Church and Dwight Ltd', country: 'UK',
      img: 'assets/img/products/charcoal-white-toothpaste.webp', subcats: ['Arm and Hammer', 'Dental Care And Personal Hygiene'] },
    'oxiclean': { name: 'OxiClean', tagline: 'Laundry and stain removal', maker: null, country: null,
      img: 'assets/img/brand/oxi-power-paks.webp', subcats: [] },
    'fino': { name: 'Fino', tagline: 'FINO Household Products', maker: 'Sarantis', country: 'Greece',
      img: 'assets/img/products/classic-line.webp',
      subcats: ['Fino Food Packaging', 'Fino Alu Foil', 'Fino Food Bags', 'Fino Broom', 'Fino Garbage Bags', 'Fino Gloves', 'Fino Microfibre Towel', 'Fino Sponges'] },
    'paclan': { name: 'Paclan', tagline: 'Paclan Household Products', maker: 'CeDo', country: 'Poland',
      img: 'assets/img/products/multitop.webp', subcats: ['Paclan Garbage Bags', 'Paclan Sponges'] },
    'kyknos': { name: 'Kyknos', tagline: 'Kyknos Tomato products', maker: 'Greek Canning Company', country: 'Greece',
      img: 'assets/img/brand/kyknos-crushed.webp', subcats: [] }
  };
  var LATEST = ['kyknos-tomatoes', 'arm-hammer-plus-oxiclean-with-odor-blasters-5-in-1-power-paks',
    'arm-hammer-plus-oxiclean-5-in-1-power-paks', 'oxi-clean-versatile-stain-remover'];

  /* ---------- Small helpers ---------- */
  function $(sel, ctx) { return (ctx || D).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || D).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function icon(name, cls) { return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>'; }
  function url(p) { return ROOT + p; }
  function productHref(slug) { return url('product.html?p=' + encodeURIComponent(slug)); }
  function brandHref(id) { return url('brands/' + id + '.html'); }
  function bySlug(slug) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].slug === slug) return PRODUCTS[i]; return null; }
  function primaryBrand(p) { return p.brands.indexOf('oxiclean') > -1 ? 'oxiclean' : p.brands[0]; }
  function brandLabel(p) { return p.brands.map(function (b) { return BRANDS[b] ? BRANDS[b].name : b; }).join(' × '); }
  /* Sub-categories of a product within one brand. The old site's "Arm and Hammer"
     sub-category held the Arm & Hammer products that had no other category. */
  function subcatsFor(p, brandId) {
    if (brandId === 'arm-and-hammer' && !p.categories.length) return ['Arm and Hammer'];
    if (brandId && BRANDS[brandId]) return p.categories.filter(function (c) { return BRANDS[brandId].subcats.indexOf(c) > -1; });
    return p.categories.slice();
  }
  function catLine(p) {
    var cats = p.categories.filter(function (c) { return !(c === 'Fino Food Packaging' && p.categories.length > 1); });
    return cats.length ? cats.join(' · ') : BRANDS[primaryBrand(p)].tagline;
  }
  function byName(a, b) { return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }); }
  function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }

  /* Product card markup (kept identical to the statically generated cards) */
  function cardHTML(p, i) {
    var b = primaryBrand(p);
    return '<article class="card th-' + b + '" data-slug="' + esc(p.slug) + '" style="--i:' + (i || 0) + '">' +
      '<a class="card-link" href="' + productHref(p.slug) + '">' +
      '<div class="stage"><img src="' + url(p.image) + '" alt="' + esc(p.name) + '" width="600" height="600" loading="lazy" decoding="async"></div>' +
      '<div class="card-body"><span class="card-brand">' + esc(brandLabel(p)) + '</span>' +
      '<h3 class="card-title">' + esc(p.name) + '</h3><span class="card-cat">' + esc(catLine(p)) + '</span></div></a>' +
      '<button class="card-qv" type="button" data-qv="' + esc(p.slug) + '" aria-label="Quick view: ' + esc(p.name) + '">' + icon('eye') + '</button>' +
      '</article>';
  }

  /* ---------- Description formatter ----------
     Turns the old site's plain-text copy into structured HTML without changing
     the words: re-joins lines that WordPress had split around bold/italic runs,
     then maps "–"/"•" lines to lists, "1." lines to ordered lists or headings,
     ALL-CAPS lines to headings, "Label: value" lines to a spec list. */
  function formatDescription(text) {
    var raw = String(text || '').replace(/\r/g, '').split('\n')
      .map(function (s) { return s.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
    var isShort = function (s) { return s && s.length <= 12 && !/^[–•-]/.test(s) && !/^\d+\./.test(s); };
    var lines = [];
    raw.forEach(function (L, i) {
      var prev = lines[lines.length - 1];
      if (prev !== undefined) {
        var join =
          /^[a-z]/.test(L) ||
          /^[.,:;&)]/.test(L) ||
          /&$/.test(prev) ||
          (/^\S+[.!]$/.test(L) && L.length < 12 && !/[.!?:…]$/.test(prev)) ||
          (/:$/.test(prev) && prev.length <= 30 && !/^\d+\./.test(L) && !/^[–•-]/.test(L) && !(isShort(L) && isShort(raw[i + 1])));
        if (join) { lines[lines.length - 1] = prev + (/^[.,:;)]/.test(L) ? '' : ' ') + L; return; }
      }
      lines.push(L);
    });

    var capsRatio = function (s) { var l = s.replace(/[^A-Za-z]/g, ''); return l.length ? l.replace(/[^A-Z]/g, '').length / l.length : 0; };
    var items = lines.map(function (L) {
      var m;
      if ((m = L.match(/^[–•-]\s*(.+)$/))) return { t: 'bullet', v: m[1] };
      if ((m = L.match(/^(\d+)\.\s*(.+)$/))) return { t: 'num', n: m[1], v: m[2] };
      if (L.replace(/[^A-Za-z]/g, '').length >= 6 && capsRatio(L) > 0.85 && !/[.:]$/.test(L)) return { t: 'h3', v: L };
      if ((m = L.match(/^([^:.]{2,30}):\s+(.+)$/))) return { t: 'label', k: m[1], v: m[2] };
      if (isShort(L)) return { t: 'short', v: L };
      if (!/[.!?…:]$/.test(L) && L.length < 110) return { t: 'feat', v: L };
      return { t: 'p', v: L };
    });
    // Numbered lines: list items when they come in runs, headings when they stand alone or are in caps.
    items.forEach(function (it, i) {
      if (it.t !== 'num') return;
      var prevNum = items[i - 1] && items[i - 1].t === 'num';
      var nextNum = items[i + 1] && items[i + 1].t === 'num';
      if (capsRatio(it.v) > 0.7 || (!prevNum && !nextNum)) it.t = 'h4';
    });

    var out = '', i = 0;
    var run = function (type) { var r = []; while (i < items.length && items[i].t === type) r.push(items[i++]); return r; };
    var bulletText = function (v) {
      var m = v.match(/^([A-Z][A-Z ]{2,}) – (.+)$/);
      return m ? '<strong>' + esc(m[1]) + '</strong> – ' + esc(m[2]) : esc(v);
    };
    while (i < items.length) {
      var it = items[i], r;
      switch (it.t) {
        case 'bullet': r = run('bullet'); out += '<ul>' + r.map(function (x) { return '<li>' + bulletText(x.v) + '</li>'; }).join('') + '</ul>'; break;
        case 'num': r = run('num'); out += '<ol>' + r.map(function (x) { return '<li>' + esc(x.v) + '</li>'; }).join('') + '</ol>'; break;
        case 'h3': out += '<h3>' + esc(it.v) + '</h3>'; i++; break;
        case 'h4': out += '<h4><span class="n">' + esc(it.n) + '</span><span>' + esc(it.v) + '</span></h4>'; i++; break;
        case 'label':
          r = run('label');
          if (r.length > 1) out += '<dl>' + r.map(function (x) { return '<div><dt>' + esc(x.k) + '</dt><dd>' + esc(x.v) + '</dd></div>'; }).join('') + '</dl>';
          else out += '<p><strong>' + esc(r[0].k) + ':</strong> ' + esc(r[0].v) + '</p>';
          break;
        case 'short':
          r = run('short');
          out += r.length > 1 ? '<ul class="sizes">' + r.map(function (x) { return '<li>' + esc(x.v) + '</li>'; }).join('') + '</ul>' : '<p>' + esc(r[0].v) + '</p>';
          break;
        case 'feat':
          r = run('feat');
          out += r.length > 1 ? '<ul>' + r.map(function (x) { return '<li>' + esc(x.v) + '</li>'; }).join('') + '</ul>' : '<p>' + esc(r[0].v) + '</p>';
          break;
        default: out += '<p>' + esc(it.v) + '</p>'; i++;
      }
    }
    return out;
  }

  /* ---------- Search scoring (shared by palette + catalogue) ---------- */
  function tokens(q) { return String(q || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9&+]+/).filter(Boolean); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var INDEX = PRODUCTS.map(function (p) {
    return {
      p: p, name: norm(p.name),
      brand: norm(p.brands.map(function (b) { return (BRANDS[b] ? BRANDS[b].name : '') + ' ' + b; }).join(' ') + (p.brands.indexOf('arm-and-hammer') > -1 ? ' arm and hammer' : '') + (p.brands.indexOf('oxiclean') > -1 ? ' oxi clean' : '')),
      cats: norm(p.categories.join(' ')), desc: norm(p.description)
    };
  });
  function scoreProduct(entry, toks) {
    var s = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], ts = 0;
      if (entry.name.indexOf(t) > -1) ts += (new RegExp('(^|\\W)' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(entry.name)) ? 14 : 9;
      if (entry.brand.indexOf(t) > -1) ts += 6;
      if (entry.cats.indexOf(t) > -1) ts += 5;
      if (entry.desc.indexOf(t) > -1) ts += 1;
      if (!ts) return 0;
      s += ts;
    }
    return s;
  }
  function search(q) {
    var toks = tokens(q);
    if (!toks.length) return [];
    return INDEX.map(function (e) { return { p: e.p, s: scoreProduct(e, toks) }; })
      .filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s || byName(a.p, b.p); });
  }
  function highlight(text, q) {
    var html = esc(text), toks = tokens(q);
    toks.forEach(function (t) {
      if (t.length < 2) return;
      html = html.replace(new RegExp('(' + esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![^<]*>)', 'ig'), '<mark>$1</mark>');
    });
    return html;
  }

  /* ---------- Layers: focus trap, Esc, scroll lock ---------- */
  var layers = [];
  function lockScroll(on) {
    var h = D.documentElement;
    if (on) { var w = window.innerWidth - h.clientWidth; h.style.overflow = 'hidden'; if (w > 0) h.style.paddingRight = w + 'px'; }
    else { h.style.overflow = ''; h.style.paddingRight = ''; }
  }
  function focusables(el) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', el)
      .filter(function (n) { return n.offsetParent !== null || n === D.activeElement; });
  }
  function openLayer(el, onClose, focusEl) {
    layers.push({ el: el, onClose: onClose, ret: D.activeElement });
    lockScroll(true);
    setTimeout(function () { (focusEl || focusables(el)[0] || el).focus(); }, 30);
  }
  function closeLayer(el) {
    for (var i = layers.length - 1; i >= 0; i--) {
      if (layers[i].el === el) {
        var L = layers.splice(i, 1)[0];
        if (L.onClose) L.onClose();
        if (!layers.length) lockScroll(false);
        if (L.ret && L.ret.focus) L.ret.focus({ preventScroll: true });
        return;
      }
    }
  }
  D.addEventListener('keydown', function (e) {
    if (!layers.length) return;
    var top = layers[layers.length - 1].el;
    if (e.key === 'Escape') { e.preventDefault(); closeLayer(top); return; }
    if (e.key === 'Tab') {
      var f = focusables(top); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (D.activeElement === first || !top.contains(D.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (D.activeElement === last || !top.contains(D.activeElement))) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Toast ---------- */
  var toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = D.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); D.body.appendChild(toastEl); }
    toastEl.innerHTML = icon('check') + '<span>' + esc(msg) + '</span>';
    toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) {
      var ta = D.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      D.body.appendChild(ta); ta.select();
      try { D.execCommand('copy') ? res() : rej(); } catch (err) { rej(err); } finally { ta.remove(); }
    });
  }

  /* ---------- Header: shrink on scroll + mega menu ---------- */
  function initHeader() {
    var hdr = $('.site-header'); if (!hdr) return;
    var onScroll = function () { hdr.classList.toggle('is-scrolled', window.scrollY > 20); };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

    var trig = $('.mega-trigger'), mega = $('#mega'); if (!trig || !mega) return;
    var closeT;
    var setOpen = function (open) { trig.setAttribute('aria-expanded', open ? 'true' : 'false'); mega.hidden = !open; };
    trig.addEventListener('click', function () { setOpen(trig.getAttribute('aria-expanded') !== 'true'); });
    if (FINE_POINTER) {
      var li = trig.parentElement;
      [li, mega].forEach(function (el) {
        el.addEventListener('mouseenter', function () { clearTimeout(closeT); setOpen(true); });
        el.addEventListener('mouseleave', function () { closeT = setTimeout(function () { setOpen(false); }, 180); });
      });
    }
    D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !mega.hidden) { setOpen(false); trig.focus(); } });
    D.addEventListener('click', function (e) { if (!mega.hidden && !mega.contains(e.target) && !trig.contains(e.target)) setOpen(false); });
    hdr.addEventListener('focusout', function (e) { if (!hdr.contains(e.relatedTarget) && !mega.contains(e.relatedTarget)) setOpen(false); });
  }

  /* ---------- Mobile full-screen menu ---------- */
  function initMobileMenu() {
    var btn = $('.burger'), menu = $('#mobile-menu'); if (!btn || !menu) return;
    var close = function () { closeLayer(menu); };
    btn.addEventListener('click', function () {
      menu.hidden = false; menu.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
      openLayer(menu, function () { menu.hidden = true; menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }, $('.mm-close', menu));
    });
    $$('[data-mm-close]', menu).forEach(function (b) { b.addEventListener('click', close); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { if (a.getAttribute('href').charAt(0) !== '#') setTimeout(close, 0); }); });
  }

  /* ---------- Command-palette search ---------- */
  var pal, palOverlay, palInput, palBody, palActive = -1, palOpts = [];
  function buildPalette() {
    palOverlay = D.createElement('div'); palOverlay.className = 'overlay'; palOverlay.hidden = true;
    pal = D.createElement('div'); pal.className = 'palette'; pal.hidden = true;
    pal.setAttribute('role', 'dialog'); pal.setAttribute('aria-modal', 'true'); pal.setAttribute('aria-label', 'Search products');
    pal.innerHTML =
      '<div class="pal-head">' + icon('search') +
      '<input type="search" id="pal-input" placeholder="Search products, brands, sizes…" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="pal-body" aria-autocomplete="list" aria-label="Search products">' +
      '<button class="pal-esc" type="button" aria-label="Close search"><kbd>esc</kbd></button></div>' +
      '<div class="pal-body" id="pal-body" role="listbox" aria-label="Results"></div>' +
      '<div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>↵</kbd> to open</span><span><kbd>esc</kbd> to close</span></div>';
    D.body.appendChild(palOverlay); D.body.appendChild(pal);
    palInput = $('input', pal); palBody = $('.pal-body', pal);
    palOverlay.addEventListener('click', closePalette);
    $('.pal-esc', pal).addEventListener('click', closePalette);
    palInput.addEventListener('input', function () { renderPalette(palInput.value); });
    palInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!palOpts.length) return;
        setPalActive((palActive + (e.key === 'ArrowDown' ? 1 : -1) + palOpts.length) % palOpts.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var o = palOpts[palActive]; if (o) { o.click(); }
        else if (palInput.value.trim()) location.href = url('products.html?q=' + encodeURIComponent(palInput.value.trim()));
      }
    });
    palBody.addEventListener('mousemove', function (e) {
      var o = e.target.closest('.pal-opt'); if (o) { var idx = palOpts.indexOf(o); if (idx !== palActive) setPalActive(idx, true); }
    });
  }
  function setPalActive(i, noScroll) {
    palOpts.forEach(function (o, j) { o.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
    palActive = i;
    var o = palOpts[i];
    if (o) { palInput.setAttribute('aria-activedescendant', o.id); if (!noScroll) o.scrollIntoView({ block: 'nearest' }); }
    else palInput.removeAttribute('aria-activedescendant');
  }
  function palProduct(p, q) {
    return '<a class="pal-opt th-' + primaryBrand(p) + '" role="option" href="' + productHref(p.slug) + '">' +
      '<img src="' + url(p.image) + '" alt="" width="48" height="48" loading="lazy">' +
      '<span class="t"><b>' + highlight(p.name, q) + '</b><small>' + esc(brandLabel(p)) + ' · ' + esc(catLine(p)) + '</small></span>' + icon('arrow-right', 'go') + '</a>';
  }
  function palBrand(id) {
    var b = BRANDS[id];
    return '<a class="pal-opt th-' + id + '" role="option" href="' + brandHref(id) + '"><span class="sw" aria-hidden="true"></span>' +
      '<span class="t"><b>' + esc(b.name) + '</b><small>' + esc(b.tagline) + (b.maker ? ' · Made by ' + esc(b.maker) + ', ' + esc(b.country) : '') + '</small></span>' + icon('arrow-right', 'go') + '</a>';
  }
  function renderPalette(q) {
    q = q.trim(); var html = '';
    if (!q) {
      html += '<div class="pal-group" role="presentation">Brands</div><div class="pal-list" role="group" aria-label="Brands">' + BRAND_ORDER.map(palBrand).join('') + '</div>';
      html += '<div class="pal-group" role="presentation">Latest products</div><div class="pal-list" role="group" aria-label="Latest products">' +
        LATEST.map(bySlug).filter(Boolean).map(function (p) { return palProduct(p, ''); }).join('') + '</div>';
    } else {
      var toks = tokens(q);
      var brands = BRAND_ORDER.filter(function (id) { var h = norm(BRANDS[id].name + ' ' + id + ' ' + BRANDS[id].tagline); return toks.every(function (t) { return h.indexOf(t) > -1; }); });
      var res = search(q);
      if (brands.length) html += '<div class="pal-group" role="presentation">Brands</div><div class="pal-list" role="group" aria-label="Brands">' + brands.map(palBrand).join('') + '</div>';
      if (res.length) html += '<div class="pal-group" role="presentation">Products · ' + res.length + '</div><div class="pal-list" role="group" aria-label="Products">' + res.slice(0, 12).map(function (r) { return palProduct(r.p, q); }).join('') + '</div>';
      if (res.length) html += '<div class="pal-list" role="group"><a class="pal-opt" role="option" href="' + url('products.html?q=' + encodeURIComponent(q)) + '"><span class="t"><b>See all results for “' + esc(q) + '”</b><small>Open the full catalogue with this search</small></span>' + icon('arrow-right', 'go') + '</a></div>';
      if (!brands.length && !res.length) html = '<div class="pal-empty" role="presentation"><p><b>No products match “' + esc(q) + '”.</b></p><p>Try a brand (Fino, Paclan, Kyknos…) or an item like “sponges”, “toothpaste”, “60L”.</p></div>';
    }
    palBody.innerHTML = html;
    palOpts = $$('.pal-opt', palBody);
    palOpts.forEach(function (o, i) { o.id = 'pal-opt-' + i; });
    setPalActive(palOpts.length ? 0 : -1);
  }
  function openPalette(prefill) {
    if (!pal) buildPalette();
    if (!pal.hidden) return;
    palOverlay.hidden = false; pal.hidden = false;
    palOverlay.classList.add('open'); pal.classList.add('open');
    palInput.value = prefill || '';
    renderPalette(palInput.value);
    openLayer(pal, function () { pal.hidden = true; palOverlay.hidden = true; pal.classList.remove('open'); palOverlay.classList.remove('open'); }, palInput);
  }
  function closePalette() { closeLayer(pal); }
  function initSearchShortcuts() {
    $$('[data-open-search]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openPalette(); }); });
    var isMac = /Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent);
    $$('.search-btn kbd').forEach(function (k) { k.textContent = isMac ? '⌘K' : 'Ctrl K'; });
    D.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault(); if (pal && !pal.hidden) closePalette(); else openPalette();
      } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        var local = $('#q'); // catalogue has its own search field
        e.preventDefault();
        if (local && !layers.length) { local.focus(); local.select(); } else if (!layers.length) openPalette();
      }
    });
  }

  /* ---------- Quick-view drawer ---------- */
  var drawer, drawerOverlay;
  function buildDrawer() {
    drawerOverlay = D.createElement('div'); drawerOverlay.className = 'overlay'; drawerOverlay.hidden = true;
    drawer = D.createElement('div'); drawer.className = 'drawer'; drawer.hidden = true;
    drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true'); drawer.setAttribute('aria-labelledby', 'qv-title');
    D.body.appendChild(drawerOverlay); D.body.appendChild(drawer);
    drawerOverlay.addEventListener('click', function () { closeLayer(drawer); });
    drawer.addEventListener('click', function (e) { if (e.target.closest('[data-drawer-close]')) closeLayer(drawer); });
  }
  function openQuickView(slug) {
    var p = bySlug(slug); if (!p) return;
    if (!drawer) buildDrawer();
    var b = primaryBrand(p);
    drawer.className = 'drawer th-' + b;
    drawer.innerHTML =
      '<div class="drawer-head"><p class="eyebrow">' + icon('star', 'star icon--fill') + 'Quick view</p>' +
      '<button class="icon-btn" type="button" data-drawer-close aria-label="Close quick view">' + icon('close') + '</button></div>' +
      '<div class="drawer-body"><div class="qv-img"><img src="' + url(p.image) + '" alt="' + esc(p.name) + '" width="600" height="600"></div>' +
      '<div class="pd-tags">' + p.brands.map(function (id) { return '<a class="tag th-' + id + '" href="' + brandHref(id) + '">' + esc(BRANDS[id].name) + '</a>'; }).join('') +
      p.categories.map(function (c) { return '<span class="tag">' + esc(c) + '</span>'; }).join('') + '</div>' +
      '<h2 id="qv-title">' + esc(p.name) + '</h2><div class="rich">' + formatDescription(p.description) + '</div></div>' +
      '<div class="drawer-foot">' +
      '<a class="btn btn--red" href="tel:' + PHONE + '">' + icon('phone') + 'Call</a>' +
      '<a class="btn btn--ghost" href="mailto:' + EMAIL + '?subject=' + encodeURIComponent('Enquiry: ' + p.name) + '">' + icon('mail') + 'Email</a>' +
      '<a class="btn btn--wide" href="' + productHref(p.slug) + '">View full details' + icon('arrow-right', 'icon--arrow') + '</a></div>';
    drawer.hidden = false; drawerOverlay.hidden = false;
    drawer.classList.add('open'); drawerOverlay.classList.add('open');
    openLayer(drawer, function () { drawer.hidden = true; drawerOverlay.hidden = true; drawer.classList.remove('open'); drawerOverlay.classList.remove('open'); }, $('[data-drawer-close]', drawer));
  }
  function initQuickView() {
    D.addEventListener('click', function (e) {
      var b = e.target.closest('[data-qv]'); if (!b) return;
      e.preventDefault(); openQuickView(b.getAttribute('data-qv'));
    });
  }

  /* ---------- Images: skeleton until loaded ---------- */
  function initImages(ctx) {
    $$('.stage img', ctx).forEach(function (img) {
      var st = img.parentElement;
      var done = function () { st.classList.add('is-loaded'); };
      if (img.complete && img.naturalWidth) done();
      else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
    });
  }
  /* Shared-element transition: the clicked card image morphs into the product page image */
  function initCardTransitions() {
    D.addEventListener('click', function (e) {
      var a = e.target.closest('.card-link'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      $$('.stage img').forEach(function (i) { i.style.viewTransitionName = ''; });
      var img = $('.stage img', a); if (img) img.style.viewTransitionName = 'product-image';
    });
    window.addEventListener('pageshow', function () { $$('.stage img').forEach(function (i) { i.style.viewTransitionName = ''; }); });
  }

  /* ---------- Scroll reveal ---------- */
  var revealIO;
  function initReveal(ctx) {
    var els = $$('[data-reveal]:not(.in)', ctx);
    if (REDUCED || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    if (!revealIO) revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { revealIO.observe(el); });
  }

  /* ---------- Counters (true numbers computed from the data) ---------- */
  function computedCount(key) {
    if (key === 'products') return PRODUCTS.length;
    if (key === 'brands') { var s = {}; PRODUCTS.forEach(function (p) { p.brands.forEach(function (b) { s[b] = 1; }); }); return Object.keys(s).length; }
    var set = {};
    BRAND_ORDER.forEach(function (id) { var b = BRANDS[id]; if (b.maker) set[key === 'partners' ? b.maker : b.country] = 1; });
    return Object.keys(set).length;
  }
  function initCounters() {
    var els = $$('[data-count]');
    els.forEach(function (el) { var k = el.getAttribute('data-count'); var n = computedCount(k); if (n) el.textContent = n; el.setAttribute('data-target', n || el.textContent); });
    if (REDUCED || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return; io.unobserve(en.target);
        var el = en.target, target = +el.getAttribute('data-target'), t0 = performance.now(), dur = 1400;
        var tick = function (t) {
          var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          el.textContent = Math.round(target * e); if (k < 1) requestAnimationFrame(tick);
        };
        el.textContent = '0'; requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Tilt + pointer parallax ---------- */
  function initTilt() {
    if (REDUCED || !FINE_POINTER) return;
    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', (x * 8).toFixed(2) + 'deg'); el.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); });
    });
  }
  function initParallax() {
    if (REDUCED || !FINE_POINTER) return;
    $$('[data-parallax]').forEach(function (stack) {
      var zone = stack.closest('section, header, .brand-hero') || stack, raf;
      zone.addEventListener('pointermove', function (e) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          var r = zone.getBoundingClientRect();
          stack.style.setProperty('--px', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
          stack.style.setProperty('--py', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
        });
      });
      zone.addEventListener('pointerleave', function () { stack.style.setProperty('--px', 0); stack.style.setProperty('--py', 0); });
    });
  }

  /* ---------- Back to top + credit pill ---------- */
  function initToTop() {
    var b = D.createElement('button');
    b.className = 'to-top'; b.type = 'button'; b.setAttribute('aria-label', 'Back to top'); b.innerHTML = icon('arrow-up');
    D.body.appendChild(b);
    var on = function () { b.classList.toggle('show', window.scrollY > 700); };
    on(); window.addEventListener('scroll', on, { passive: true });
    b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); var s = $('#main'); if (s) s.focus({ preventScroll: true }); });
  }
  function initPill() {
    var pill = $('.vx-pill'); if (!pill) return;
    var KEY = 'asnk-vx-pill-hidden';
    try { if (sessionStorage.getItem(KEY)) { pill.remove(); return; } } catch (e) { /* storage unavailable: keep pill */ }
    var btn = $('button', pill);
    if (btn) btn.addEventListener('click', function () { pill.remove(); try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ } });
  }

  /* ---------- Rails (horizontal product rows) ---------- */
  function initRails(ctx) {
    $$('[data-rail]:not([data-rail-ready])', ctx).forEach(function (wrap) {
      wrap.setAttribute('data-rail-ready', '');
      var rail = $('.rail', wrap), prev = $('[data-rail-prev]', wrap), next = $('[data-rail-next]', wrap);
      if (!rail || !prev || !next) return;
      var upd = function () { prev.disabled = rail.scrollLeft < 8; next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8; };
      prev.addEventListener('click', function () { rail.scrollBy({ left: -rail.clientWidth * 0.85, behavior: REDUCED ? 'auto' : 'smooth' }); });
      next.addEventListener('click', function () { rail.scrollBy({ left: rail.clientWidth * 0.85, behavior: REDUCED ? 'auto' : 'smooth' }); });
      rail.addEventListener('scroll', debounce(upd, 60), { passive: true }); window.addEventListener('resize', debounce(upd, 120)); upd();
    });
  }

  /* ---------- Accessible tabs (roving arrows) ---------- */
  function initTabs(root, onChange) {
    var tabs = $$('[role="tab"]', root);
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
        var panel = D.getElementById(t.getAttribute('aria-controls')); if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      if (onChange) onChange(tab);
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); select(tabs[j], true); }
      });
    });
  }

  /* =========================================================================
     Page: Home
     ========================================================================= */
  function initHome() {
    // Products block tabs (recreates the old KYKNOS / Oxi Clean / Fino / Paclan / Arm and Hammer tabs)
    var tabRoot = $('[data-product-tabs]');
    if (tabRoot) initTabs(tabRoot, function (tab) {
      var panel = D.getElementById(tab.getAttribute('aria-controls'));
      if (panel && !REDUCED) $$('.card', panel).forEach(function (c, i) { c.classList.remove('pop'); void c.offsetWidth; c.style.setProperty('--i', i); c.classList.add('pop'); });
      if (panel) { var r = $('.rail', panel); if (r) { r.scrollLeft = 0; r.dispatchEvent(new Event('scroll')); } }
    });

    // Spotlight slider (the old Fino / Paclan / Arm & Hammer slides)
    var slider = $('[data-slider]'); if (!slider) return;
    var slides = $$('.slide', slider), dots = $$('.slider-dots button', slider), toggle = $('.slider-toggle', slider);
    var idx = 0, timer = null, MS = 6000, playing = !REDUCED, hover = false;
    slider.style.setProperty('--slide-ms', MS + 'ms');
    var go = function (n) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { var on = i === idx; s.classList.toggle('is-active', on); s.setAttribute('aria-hidden', on ? 'false' : 'true'); $$('a', s).forEach(function (a) { a.tabIndex = on ? 0 : -1; }); });
      dots.forEach(function (d, i) { d.setAttribute('aria-current', i === idx ? 'true' : 'false'); var sp = $('span', d); if (sp) { sp.style.animation = 'none'; void sp.offsetWidth; sp.style.animation = ''; } });
      slider.className = slider.className.replace(/\bth-[\w-]+/g, '').trim() + ' th-' + slides[idx].getAttribute('data-brand');
      schedule();
    };
    var schedule = function () {
      clearTimeout(timer);
      slider.classList.toggle('is-playing', playing && !hover);
      if (playing && !hover) timer = setTimeout(function () { go(idx + 1); }, MS);
    };
    dots.forEach(function (d, i) {
      d.addEventListener('click', function () { go(i); });
      d.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { go(idx + 1); dots[idx].focus(); } if (e.key === 'ArrowLeft') { go(idx - 1); dots[idx].focus(); } });
    });
    if (toggle) {
      var setToggle = function () { toggle.innerHTML = icon(playing ? 'pause' : 'play'); toggle.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow'); };
      setToggle();
      toggle.addEventListener('click', function () { playing = !playing; setToggle(); schedule(); });
    }
    slider.addEventListener('mouseenter', function () { hover = true; schedule(); });
    slider.addEventListener('mouseleave', function () { hover = false; schedule(); });
    slider.addEventListener('focusin', function () { hover = true; schedule(); });
    slider.addEventListener('focusout', function (e) { if (!slider.contains(e.relatedTarget)) { hover = false; schedule(); } });
    D.addEventListener('visibilitychange', function () { if (D.hidden) clearTimeout(timer); else schedule(); });
    // Swipe on touch screens
    var sx = null;
    slider.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1)); sx = null; });
    go(0);
  }

  /* =========================================================================
     Page: Products catalogue (search, brand + sub-category filters, sort, URL sync)
     ========================================================================= */
  function initCatalogue() {
    var grid = $('#grid'); if (!grid) return;
    var q = $('#q'), clear = $('#q-clear'), sort = $('#sort'), count = $('#count'), empty = $('#empty');
    var brandRow = $('#brand-chips'), subRow = $('#sub-chips');
    var cards = {}; $$('.card', grid).forEach(function (c) { cards[c.getAttribute('data-slug')] = c; });
    var params = new URLSearchParams(location.search);
    var state = { brand: params.get('brand') || '', cat: params.get('cat') || '', q: params.get('q') || '', sort: params.get('sort') || 'az' };
    if (state.brand && !BRANDS[state.brand]) state.brand = '';
    q.value = state.q;
    if (['az', 'za', 'brand', 'relevance'].indexOf(state.sort) < 0) state.sort = 'az';
    if (state.q && !params.get('sort')) state.sort = 'relevance';
    sort.value = state.sort;

    var renderSubs = function () {
      var b = state.brand;
      if (!b || !BRANDS[b].subcats.length) { subRow.hidden = true; subRow.innerHTML = ''; if (state.cat) state.cat = ''; return; }
      var inBrand = PRODUCTS.filter(function (p) { return p.brands.indexOf(b) > -1; });
      var avail = BRANDS[b].subcats.filter(function (c) { return inBrand.some(function (p) { return subcatsFor(p, b).indexOf(c) > -1; }); });
      if (state.cat && avail.indexOf(state.cat) < 0) state.cat = '';
      subRow.className = 'chip-row chip-row--sub th-' + b;
      subRow.innerHTML = '<span class="legend">' + esc(BRANDS[b].name) + ' range</span>' +
        '<button type="button" class="chip" data-cat="" aria-pressed="' + (!state.cat) + '">All ' + esc(BRANDS[b].name) + '</button>' +
        avail.map(function (c) {
          var n = inBrand.filter(function (p) { return subcatsFor(p, b).indexOf(c) > -1; }).length;
          return '<button type="button" class="chip" data-cat="' + esc(c) + '" aria-pressed="' + (state.cat === c) + '">' + esc(c) + ' <span class="count">' + n + '</span></button>';
        }).join('');
      subRow.hidden = false;
    };

    var syncURL = function () {
      var p = new URLSearchParams();
      if (state.brand) p.set('brand', state.brand);
      if (state.cat) p.set('cat', state.cat);
      if (state.q) p.set('q', state.q);
      if (state.sort !== 'az' && !(state.sort === 'relevance' && state.q)) p.set('sort', state.sort);
      var s = p.toString();
      history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
    };

    var apply = function (animate) {
      $$('button', brandRow).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-brand') === state.brand ? 'true' : 'false'); });
      renderSubs();
      var sc2 = {};
      if (state.q) search(state.q).forEach(function (r) { sc2[r.p.slug] = r.s; });
      var list = PRODUCTS.filter(function (p) {
        if (state.q && !sc2[p.slug]) return false;
        if (state.brand && p.brands.indexOf(state.brand) < 0) return false;
        if (state.cat && subcatsFor(p, state.brand).indexOf(state.cat) < 0) return false;
        return true;
      });
      if (state.sort === 'za') list.sort(function (a, b) { return byName(b, a); });
      else if (state.sort === 'brand') list.sort(function (a, b) { return BRAND_ORDER.indexOf(primaryBrand(a)) - BRAND_ORDER.indexOf(primaryBrand(b)) || byName(a, b); });
      else if (state.sort === 'relevance' && state.q) list.sort(function (a, b) { return (sc2[b.slug] || 0) - (sc2[a.slug] || 0) || byName(a, b); });
      else list.sort(byName);

      var show = {}; list.forEach(function (p) { show[p.slug] = 1; });
      var frag = D.createDocumentFragment();
      list.forEach(function (p, i) {
        var c = cards[p.slug]; if (!c) return;
        c.hidden = false; c.style.setProperty('--i', i);
        if (animate && !REDUCED) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
        frag.appendChild(c);
      });
      Object.keys(cards).forEach(function (s) { if (!show[s]) { cards[s].hidden = true; frag.appendChild(cards[s]); } });
      grid.appendChild(frag);

      var label = state.brand ? BRANDS[state.brand].name : '';
      count.innerHTML = 'Showing <b>' + list.length + '</b> of ' + PRODUCTS.length + ' products' +
        (label ? ' from <b>' + esc(label) + '</b>' : '') + (state.cat ? ' in <b>' + esc(state.cat) + '</b>' : '') + (state.q ? ' matching <b>“' + esc(state.q) + '”</b>' : '');
      [brandRow, subRow].forEach(function (row) { // keep the active chip visible in scrollable rows
        var on = $('[aria-pressed="true"]', row); if (!on || row.hidden) return;
        var l = on.offsetLeft, r = l + on.offsetWidth;
        if (l < row.scrollLeft || r > row.scrollLeft + row.clientWidth) row.scrollLeft = Math.max(0, l - 40);
      });
      empty.hidden = list.length > 0;
      $('#empty-q').textContent = state.q ? '“' + state.q + '”' : 'these filters';
      clear.hidden = !state.q;
      var relOpt = $('option[value="relevance"]', sort); if (relOpt) relOpt.disabled = !state.q;
      syncURL();
    };

    brandRow.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-brand]'); if (!b) return;
      var v = b.getAttribute('data-brand'); state.brand = v; state.cat = ''; apply(true);
    });
    subRow.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-cat]'); if (!b) return;
      state.cat = b.getAttribute('data-cat'); apply(true);
    });
    var onInput = debounce(function () {
      var had = !!state.q; state.q = q.value.trim();
      if (state.q && !had && state.sort === 'az') { state.sort = 'relevance'; sort.value = 'relevance'; }
      if (!state.q && state.sort === 'relevance') { state.sort = 'az'; sort.value = 'az'; }
      apply(true);
    }, 140);
    q.addEventListener('input', onInput);
    q.addEventListener('keydown', function (e) { if (e.key === 'Escape' && q.value) { e.stopPropagation(); q.value = ''; onInput(); } });
    clear.addEventListener('click', function () { q.value = ''; state.q = ''; if (state.sort === 'relevance') { state.sort = 'az'; sort.value = 'az'; } apply(true); q.focus(); });
    sort.addEventListener('change', function () { state.sort = sort.value; apply(true); });
    $$('[data-reset]').forEach(function (b) { b.addEventListener('click', function () { state = { brand: '', cat: '', q: '', sort: 'az' }; q.value = ''; sort.value = 'az'; apply(true); }); });
    apply(false);
  }

  /* =========================================================================
     Page: Product detail (rendered from data)
     ========================================================================= */
  function setMeta(sel, attr, val) { var m = $(sel); if (m) m.setAttribute(attr, val); }
  function initProduct() {
    var root = $('#pd-root'); if (!root) return;
    var slug = new URLSearchParams(location.search).get('p');
    var p = slug && bySlug(slug);
    if (!p) {
      D.title = 'Product not found | ASNK Trading – Real Value Everyday';
      root.innerHTML = '<div class="empty" style="margin-top:24px">' + icon('star', 'icon--fill') +
        '<h1 class="h-md">We couldn’t find that product</h1><p>It may have been renamed. Browse the full catalogue or search by name.</p>' +
        '<p><a class="btn" href="' + url('products.html') + '">Browse all products' + icon('arrow-right', 'icon--arrow') + '</a> ' +
        '<button class="btn btn--ghost" type="button" data-open-search>' + icon('search') + 'Search</button></p></div>';
      $$('[data-open-search]', root).forEach(function (b) { b.addEventListener('click', function () { openPalette(slug || ''); }); });
      return;
    }
    var b = primaryBrand(p), B = BRANDS[b];
    D.body.classList.add('th-' + b);
    var title = p.name + (norm(p.name).indexOf(norm(B.name)) > -1 ? '' : ' — ' + brandLabel(p)) + ' | ASNK Trading';
    var desc = p.description.replace(/\s+/g, ' ').trim().slice(0, 155);
    D.title = title;
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('link[rel="canonical"]', 'href', 'https://asnktrading.com/product/' + p.slug + '/');

    var sorted = PRODUCTS.slice().sort(function (a, c) { return BRAND_ORDER.indexOf(primaryBrand(a)) - BRAND_ORDER.indexOf(primaryBrand(c)) || byName(a, c); });
    var at = sorted.indexOf(p), prev = sorted[(at - 1 + sorted.length) % sorted.length], next = sorted[(at + 1) % sorted.length];
    var related = PRODUCTS.filter(function (x) { return x !== p && x.brands.some(function (id) { return p.brands.indexOf(id) > -1; }); })
      .sort(function (x, y) {
        var sx = x.categories.some(function (c) { return p.categories.indexOf(c) > -1; }) ? 0 : 1;
        var sy = y.categories.some(function (c) { return p.categories.indexOf(c) > -1; }) ? 0 : 1;
        return sx - sy || byName(x, y);
      }).slice(0, 10);
    var relTitle = 'More from ' + p.brands.map(function (id) { return BRANDS[id].name; }).join(' & ');
    if (related.length < 3) { // single-product brands (e.g. Kyknos): suggest the latest arrivals instead
      relTitle = 'More from ASNK Trading';
      related = related.concat(LATEST.map(bySlug).filter(function (x) { return x && x !== p && related.indexOf(x) < 0; }));
    }
    var subcat = subcatsFor(p, b)[0];
    var mailto = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Enquiry: ' + p.name);

    root.innerHTML =
      '<nav aria-label="Breadcrumb"><ol class="crumbs"><li><a href="' + url('index.html') + '">Home</a></li><li><a href="' + url('products.html') + '">Products</a></li>' +
      '<li><a href="' + brandHref(b) + '">' + esc(B.name) + '</a></li>' +
      (subcat ? '<li><a href="' + brandHref(b) + '?cat=' + encodeURIComponent(subcat) + '">' + esc(subcat) + '</a></li>' : '') +
      '<li aria-current="page">' + esc(p.name) + '</li></ol></nav>' +
      '<div class="pd">' +
      '<div class="pd-media"><div class="pd-media-wrap"><div class="zoom" id="zoom"><img src="' + url(p.image) + '" alt="' + esc(p.name) + '" width="800" height="800" fetchpriority="high">' +
      '<span class="zoom-hint">' + icon('zoom') + 'Hover to zoom</span></div><div class="pd-accent" aria-hidden="true"></div></div></div>' +
      '<div class="pd-info">' +
      '<div class="pd-tags">' + p.brands.map(function (id) { return '<a class="tag th-' + id + '" href="' + brandHref(id) + '">' + esc(BRANDS[id].name) + '</a>'; }).join('') +
      p.categories.map(function (c) { return '<a class="tag" href="' + url('products.html?brand=' + b + '&cat=' + encodeURIComponent(c)) + '">' + esc(c) + '</a>'; }).join('') + '</div>' +
      '<h1>' + esc(p.name) + '</h1>' +
      (B.maker ? '<p class="muted">' + esc(B.name) + ' is made by ' + esc(B.maker) + ', ' + esc(B.country) + ' — distributed in Ghana by ASNK Trading Limited.</p>' : '<p class="muted">Distributed in Ghana by ASNK Trading Limited.</p>') +
      '<div class="pd-actions">' +
      '<a class="btn btn--red" href="tel:' + PHONE + '">' + icon('phone') + 'Call</a>' +
      '<a class="btn btn--ghost" href="' + mailto + '">' + icon('mail') + 'Email</a>' +
      '<a class="btn btn--wide" href="' + url('contact.html?product=' + encodeURIComponent(p.slug)) + '">Send an enquiry' + icon('arrow-right', 'icon--arrow') + '</a>' +
      '<button class="btn btn--ghost btn--wide" type="button" id="share">' + icon('link') + '<span>Share or copy link</span></button>' +
      '</div><p class="pd-note">Call or email ASNK Trading for availability and trade enquiries — +233206606219 · info@asnktrading.com</p>' +
      '<section class="pd-panel" aria-labelledby="pd-desc-h"><h2 id="pd-desc-h">Product details</h2><div class="rich">' + formatDescription(p.description) + '</div></section>' +
      '</div></div>' +
      (related.length ?
        '<section class="section--tight" aria-labelledby="rel-h" data-rail style="padding-bottom:0"><div class="subhead"><h2 class="h-md" id="rel-h">' + esc(relTitle) + '</h2>' +
        '<div class="rail-nav"><button type="button" data-rail-prev aria-label="Scroll left">' + icon('arrow-left') + '</button><button type="button" data-rail-next aria-label="Scroll right">' + icon('arrow-right') + '</button></div></div>' +
        '<div class="rail">' + related.map(cardHTML).join('') + '</div></section>' : '') +
      '<nav class="pd-pager" aria-label="Previous and next product">' +
      '<a class="prev" href="' + productHref(prev.slug) + '"><img src="' + url(prev.image) + '" alt="" width="64" height="64" loading="lazy"><span><small>Previous</small><b>' + esc(prev.name) + '</b></span></a>' +
      '<a class="next" href="' + productHref(next.slug) + '"><img src="' + url(next.image) + '" alt="" width="64" height="64" loading="lazy"><span><small>Next</small><b>' + esc(next.name) + '</b></span></a></nav>';

    // Zoom on hover (fine pointers)
    var z = $('#zoom');
    if (FINE_POINTER) {
      z.addEventListener('pointermove', function (e) {
        var r = z.getBoundingClientRect();
        z.style.setProperty('--zx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        z.style.setProperty('--zy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        z.classList.add('is-zooming');
      });
      z.addEventListener('pointerleave', function () { z.classList.remove('is-zooming'); });
    }
    // Share / copy
    $('#share').addEventListener('click', function () {
      var link = location.href;
      if (navigator.share && !FINE_POINTER) { navigator.share({ title: p.name + ' — ASNK Trading', url: link }).catch(function () {}); return; }
      copyText(link).then(function () { toast('Link copied to clipboard'); }, function () { toast('Copy failed — use the address bar'); });
    });
    initRails(root); initImages(root);
  }

  /* =========================================================================
     Page: Brand (sub-category tabs filter a static grid)
     ========================================================================= */
  function initBrand() {
    var grid = $('#brand-grid'), row = $('#brand-subs'); if (!grid) return;
    var brand = D.body.getAttribute('data-brand');
    var cards = $$('.card', grid), count = $('#brand-count');
    var cat = new URLSearchParams(location.search).get('cat') || '';
    var apply = function (animate) {
      var n = 0;
      if (row) $$('button', row).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-cat') === cat ? 'true' : 'false'); });
      cards.forEach(function (c) {
        var p = bySlug(c.getAttribute('data-slug'));
        var on = !cat || (p && subcatsFor(p, brand).indexOf(cat) > -1);
        c.hidden = !on;
        if (on) { c.style.setProperty('--i', n++); if (animate && !REDUCED) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); } }
      });
      if (count) count.textContent = n + (n === 1 ? ' product' : ' products') + (cat ? ' in ' + cat : '');
      var sp = new URLSearchParams(location.search); if (cat) sp.set('cat', cat); else sp.delete('cat');
      history.replaceState(null, '', location.pathname + (sp.toString() ? '?' + sp : ''));
    };
    if (row) {
      if (cat && !$('button[data-cat="' + (window.CSS && CSS.escape ? CSS.escape(cat) : cat) + '"]', row)) cat = '';
      row.addEventListener('click', function (e) { var b = e.target.closest('button[data-cat]'); if (!b) return; cat = b.getAttribute('data-cat'); apply(true); });
    } else cat = '';
    apply(false);
  }

  /* =========================================================================
     Page: Contact (validated form -> mailto:)
     ========================================================================= */
  function initContact() {
    var form = $('#contact-form'); if (!form) return;
    var f = { name: $('#f-name'), email: $('#f-email'), phone: $('#f-phone'), msg: $('#f-msg') };
    var pre = new URLSearchParams(location.search).get('product'), prod = pre && bySlug(pre);
    if (prod && !f.msg.value) f.msg.value = 'Hello ASNK Trading,\n\nI would like to enquire about: ' + prod.name + ' (' + brandLabel(prod) + ').\n\n';
    var rules = {
      name: function (v) { return v.trim().length < 2 ? 'Please enter your name.' : ''; },
      email: function (v) { return !v.trim() ? 'Please enter your email address.' : (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'That email address doesn’t look right — check for typos.' : ''); },
      phone: function (v) { var d = v.replace(/[^\d]/g, ''); return v.trim() && (d.length < 9 || d.length > 15 || /[^\d\s+()-]/.test(v)) ? 'Enter a valid phone number, e.g. +233 20 000 0000.' : ''; },
      msg: function (v) { return v.trim().length < 10 ? 'Please write a short message (at least 10 characters).' : ''; }
    };
    var check = function (k) {
      var el = f[k], msg = rules[k](el.value), err = D.getElementById(el.getAttribute('aria-describedby').split(' ')[0]);
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      err.innerHTML = msg ? icon('alert') + '<span>' + esc(msg) + '</span>' : '';
      return !msg;
    };
    Object.keys(f).forEach(function (k) {
      f[k].addEventListener('blur', function () { if (f[k].value || f[k].getAttribute('aria-invalid')) check(k); });
      f[k].addEventListener('input', function () { if (f[k].getAttribute('aria-invalid') === 'true') check(k); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = Object.keys(f).filter(function (k) { return !check(k); });
      if (bad.length) { f[bad[0]].focus(); return; }
      var body = 'Name: ' + f.name.value.trim() + '\nEmail: ' + f.email.value.trim() + '\nPhone: ' + (f.phone.value.trim() || '—') + '\n\n' + f.msg.value.trim() + '\n';
      var href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Website enquiry from ' + f.name.value.trim()) + '&body=' + encodeURIComponent(body);
      var ok = $('#form-success'); ok.hidden = false;
      ok.focus();
      window.location.href = href;
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    initHeader(); initMobileMenu(); initSearchShortcuts(); initQuickView(); initCardTransitions();
    initPill(); initToTop();
    var page = D.body.getAttribute('data-page');
    if (page === 'home') initHome();
    if (page === 'products') initCatalogue();
    if (page === 'product') initProduct();
    if (page === 'brand') initBrand();
    if (page === 'contact') initContact();
    initImages(); initReveal(); initCounters(); initTilt(); initParallax(); initRails();
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();

  // Small public surface for debugging in the console.
  window.ASNK = { formatDescription: formatDescription, search: search, openPalette: openPalette, openQuickView: openQuickView };
})();

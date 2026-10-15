/* ==========================================================================
   雅思词块复习站 — 交互脚本
   零依赖原生 JS。不做任何数据存储（除主题偏好），
   禁用 JS 时所有词块仍然完整可读、可打印。
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  /* ---------- 主题 ---------- */
  var THEME_KEY = 'er-theme';

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    var m = doc.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#0d1117' : '#ffffff');
  }

  (function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (stored === 'dark' || stored === 'light') {
      applyTheme(stored);
      return;
    }
    var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(mq && mq.matches ? 'dark' : 'light');
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', function (e) {
        var s = null;
        try { s = localStorage.getItem(THEME_KEY); } catch (err) {}
        if (s !== 'dark' && s !== 'light') applyTheme(e.matches ? 'dark' : 'light');
      });
    }
  })();

  var themeBtn = doc.querySelector('[data-theme-toggle]');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      themeBtn.setAttribute('aria-label', next === 'dark' ? '切换到浅色主题' : '切换到深色主题');
    });
  }

  /* ---------- 当前页高亮 ---------- */
  (function activeNav() {
    var cur = doc.body.getAttribute('data-page');
    if (!cur) return;
    Array.prototype.forEach.call(doc.querySelectorAll('[data-page]'), function (a) {
      if (a.getAttribute('data-page') === cur && (a.tagName === 'A')) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
    });
  })();

  /* ---------- 移动端侧栏 ---------- */
  (function sidebar() {
    var toggle = doc.querySelector('[data-menu-toggle]');
    var side = doc.querySelector('[data-sidebar]');
    if (!toggle || !side) return;

    var back = doc.createElement('div');
    back.className = 'sidebar-backdrop';
    doc.body.appendChild(back);

    function close() {
      side.classList.remove('is-open');
      back.classList.remove('is-visible');
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.addEventListener('click', function () {
      var open = side.classList.toggle('is-open');
      back.classList.toggle('is-visible', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    back.addEventListener('click', close);
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    side.addEventListener('click', function (e) {
      if (e.target.closest('a') && window.innerWidth <= 1080) close();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1080) close();
    });
  })();

  /* ---------- 词块库筛选 ---------- */
  (function chunkFilter() {
    var cards = Array.prototype.slice.call(doc.querySelectorAll('.chunk-card'));
    if (!cards.length) return;

    var sections = Array.prototype.slice.call(doc.querySelectorAll('[data-cat-section]'));
    var inputs = Array.prototype.slice.call(doc.querySelectorAll('[data-search]'));
    var chips = Array.prototype.slice.call(doc.querySelectorAll('.tag-chip'));
    var countEl = doc.querySelector('[data-count]');
    var noResult = doc.querySelector('[data-no-result]');
    var clearBtn = doc.querySelector('[data-clear]');

    var state = { q: '', tag: null };

    function match(card) {
      if (state.tag && (card.getAttribute('data-tags') || '').split(' ').indexOf(state.tag) === -1) return false;
      if (!state.q) return true;
      return (card.getAttribute('data-text') || '').indexOf(state.q) !== -1;
    }

    function apply() {
      var shown = 0;
      for (var i = 0; i < cards.length; i++) {
        var ok = match(cards[i]);
        cards[i].hidden = !ok;
        if (ok) shown++;
      }

      // 隐藏没有可见卡片的分类区块
      for (var j = 0; j < sections.length; j++) {
        var sec = sections[j];
        var vis = sec.querySelectorAll('.chunk-card:not([hidden])').length;
        sec.hidden = vis === 0;
        var badge = sec.querySelector('[data-cat-count]');
        if (badge) badge.textContent = vis + ' 条';
      }

      if (countEl) countEl.textContent = shown + ' / ' + cards.length + ' 条';
      if (noResult) noResult.hidden = shown !== 0;
      if (clearBtn) clearBtn.hidden = !state.q && !state.tag;

      // 同步所有搜索框
      for (var k = 0; k < inputs.length; k++) {
        if (inputs[k].value !== state.q) inputs[k].value = state.q;
      }
    }

    inputs.forEach(function (inp) {
      inp.addEventListener('input', function () {
        state.q = inp.value.trim().toLowerCase();
        apply();
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { state.q = ''; apply(); }
      });
    });

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var t = chip.getAttribute('data-tag');
        state.tag = state.tag === t ? null : t;
        chips.forEach(function (c) {
          c.classList.toggle('is-on', c.getAttribute('data-tag') === state.tag);
        });
        apply();
      });
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        state.q = '';
        state.tag = null;
        chips.forEach(function (c) { c.classList.remove('is-on'); });
        apply();
      });
    }

    apply();

    /* 遮挡中文（自测模式）：纯显示切换，不写入任何存储 */
    var maskBtn = doc.querySelector('[data-mask-toggle]');
    if (maskBtn) {
      maskBtn.addEventListener('click', function () {
        var on = doc.body.classList.toggle('is-masked');
        maskBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        var lbl = maskBtn.querySelector('[data-mask-label]');
        if (lbl) lbl.textContent = on ? '显示中文' : '遮挡中文（自测）';
        if (!on) {
          Array.prototype.forEach.call(doc.querySelectorAll('.chunk-card.is-revealed'), function (c) {
            c.classList.remove('is-revealed');
          });
        }
      });
    }

    // 自测模式下点击卡片展开该条
    cards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (!doc.body.classList.contains('is-masked')) return;
        if (e.target.closest('a')) return;
        card.classList.add('is-revealed');
      });
    });

    var printBtn = doc.querySelector('[data-print]');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
  })();

  /* ---------- 页内锚点标题 ---------- */
  (function anchors() {
    Array.prototype.forEach.call(doc.querySelectorAll('.content h2[id], .content h3[id]'), function (h) {
      h.classList.add('anchor-heading');
      var a = doc.createElement('a');
      a.className = 'anchor';
      a.href = '#' + h.id;
      a.textContent = '#';
      a.setAttribute('aria-label', '本节链接');
      h.insertBefore(a, h.firstChild);
    });
  })();

  /* ---------- 代码复制 ---------- */
  (function copyButtons() {
    Array.prototype.forEach.call(doc.querySelectorAll('.code-block'), function (block) {
      var pre = block.querySelector('pre');
      if (!pre) return;
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.textContent = '复制';
      block.appendChild(btn);
      btn.addEventListener('click', function () {
        var text = pre.innerText;
        var done = function () {
          btn.textContent = '已复制';
          btn.classList.add('is-copied');
          setTimeout(function () {
            btn.textContent = '复制';
            btn.classList.remove('is-copied');
          }, 1600);
        };
        function fallback() {
          var ta = doc.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.top = '-1000px';
          doc.body.appendChild(ta);
          ta.select();
          try { doc.execCommand('copy'); done(); } catch (e) {}
          doc.body.removeChild(ta);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, fallback);
        } else { fallback(); }
      });
    });
  })();

  /* ---------- 阅读进度 + 回到顶部 ---------- */
  (function scrollUi() {
    var bar = doc.querySelector('[data-progress]');
    var top = doc.querySelector('[data-to-top]');
    var ticking = false;

    function update() {
      var y = window.pageYOffset || root.scrollTop;
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
      if (top) top.classList.toggle('is-visible', y > 400);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();

    if (top) top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();
})();

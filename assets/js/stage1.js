/* ==========================================================================
   阶段一改造脚本
   ② 移动端顶栏自动隐藏
   ④ 翻卡模式（上一个 / 下一个 / 分类筛选 / 键盘 / 滑动 / URL 锚点）

   与 app.js 的分工：
   - app.js 负责主题、侧栏、搜索与标签筛选（写 hidden 属性）、遮挡中文、复制、进度条
   - 本文件负责顶栏隐藏与翻卡；分类筛选用 data-cat-hidden 属性，
     与 app.js 的 hidden 互不干扰（两者是与关系）。
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var MOBILE_MAX = 1080;

  /* ---------------- ② 顶栏自动隐藏 ---------------- */
  (function headerAutoHide() {
    var header = doc.querySelector('.site-header');
    if (!header) return;

    var lastY = window.pageYOffset || 0;
    var hidden = false;
    var ticking = false;

    function setHidden(v) {
      if (v === hidden) return;
      hidden = v;
      doc.body.classList.toggle('is-header-hidden', v);
    }

    function onScroll() {
      var y = window.pageYOffset || root.scrollTop;

      // 桌面端不隐藏，避免影响导航可达性
      if (window.innerWidth > MOBILE_MAX) {
        setHidden(false);
        lastY = y;
        ticking = false;
        return;
      }

      var dy = y - lastY;

      if (y < 80) setHidden(false);          // 顶部区域内始终显示
      else if (dy > 6) setHidden(true);      // 下滑收起
      else if (dy < -6) setHidden(false);    // 上滑立即出现

      lastY = y;
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(onScroll);
      }
    }, { passive: true });

    window.addEventListener('resize', function () {
      if (window.innerWidth > MOBILE_MAX) setHidden(false);
    });

    // 打开侧栏抽屉时必须让顶栏可见，否则汉堡按钮被藏起来就回不去了
    var toggle = doc.querySelector('[data-menu-toggle]');
    if (toggle) {
      toggle.addEventListener('click', function () { setHidden(false); });
    }
  })();

  /* ---------------- ④ 翻卡模式 ---------------- */
  (function pager() {
    var stage = doc.querySelector('[data-card-stage]');
    if (!stage) return;

    var cards = Array.prototype.slice.call(stage.querySelectorAll('.chunk-card'));
    if (!cards.length) return;

    var posEl = doc.querySelector('[data-pager-pos]');
    var catEl = doc.querySelector('[data-pager-cat]');
    var prevBtn = doc.querySelector('[data-prev]');
    var nextBtn = doc.querySelector('[data-next]');
    var noRes = doc.querySelector('[data-no-result]');

    var catLinks = Array.prototype.slice.call(doc.querySelectorAll('[data-cat-filter]'));
    var searchInputs = Array.prototype.slice.call(doc.querySelectorAll('[data-search]'));
    var chips = Array.prototype.slice.call(doc.querySelectorAll('.tag-chip'));
    var clearBtn = doc.querySelector('[data-clear]');

    var current = 0;
    var catFilter = null;

    stage.classList.add('is-ready');

    function visible() {
      return cards.filter(function (c) {
        return !c.hidden && !c.hasAttribute('data-cat-hidden');
      });
    }

    function catNameOf(id) {
      for (var i = 0; i < catLinks.length; i++) {
        if (catLinks[i].getAttribute('data-cat-filter') === id) {
          return catLinks[i].getAttribute('data-cat-name') || id;
        }
      }
      return id;
    }

    function applyCat() {
      cards.forEach(function (c) {
        if (catFilter && c.getAttribute('data-cat') !== catFilter) {
          c.setAttribute('data-cat-hidden', '');
        } else {
          c.removeAttribute('data-cat-hidden');
        }
      });
      catLinks.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('data-cat-filter') === catFilter);
      });
    }

    function clearReveal() {
      cards.forEach(function (c) { c.classList.remove('is-revealed'); });
    }

    function render(syncHash) {
      var vis = visible();

      if (!vis.length) {
        cards.forEach(function (c) { c.classList.remove('is-current'); });
        if (posEl) posEl.textContent = '0 / 0';
        if (catEl) catEl.textContent = catFilter ? catNameOf(catFilter) : '全部词块';
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        if (noRes) noRes.hidden = false;
        return;
      }

      if (noRes) noRes.hidden = true;

      if (current < 0) current = 0;
      if (current > vis.length - 1) current = vis.length - 1;

      cards.forEach(function (c) { c.classList.remove('is-current'); });
      var card = vis[current];
      card.classList.add('is-current');

      if (posEl) posEl.textContent = (current + 1) + ' / ' + vis.length;
      if (catEl) catEl.textContent = catNameOf(card.getAttribute('data-cat'));
      if (prevBtn) prevBtn.disabled = current === 0;
      if (nextBtn) nextBtn.disabled = current === vis.length - 1;

      if (syncHash !== false) {
        if (card.id) {
          try { history.replaceState(null, '', '#' + card.id); } catch (e) { /* file:// 下可能失败 */ }
        }
        // 换卡后回到顶部，避免长卡片停在一半
        if ((window.pageYOffset || root.scrollTop) > 0) {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      }
    }

    function go(delta) {
      var vis = visible();
      var next = current + delta;
      if (next < 0 || next > vis.length - 1) return;
      current = next;
      clearReveal();
      render();
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { go(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(1); });

    // 侧栏分类：在翻卡页拦截，改为筛选
    catLinks.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var id = a.getAttribute('data-cat-filter');
        catFilter = (catFilter === id) ? null : id;
        applyCat();
        current = 0;
        clearReveal();
        render();
        // 移动端选完分类顺手把抽屉收起来
        var side = doc.querySelector('[data-sidebar]');
        if (side && window.innerWidth <= MOBILE_MAX) {
          side.classList.remove('is-open');
          var back = doc.querySelector('.sidebar-backdrop');
          if (back) back.classList.remove('is-visible');
        }
      });
    });

    // 搜索 / 标签 / 清除筛选：app.js 已先改完 hidden，这里重新对齐位置
    searchInputs.forEach(function (inp) {
      inp.addEventListener('input', function () { current = 0; clearReveal(); render(); });
    });
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () { current = 0; clearReveal(); render(); });
    });
    if (clearBtn) clearBtn.addEventListener('click', function () {
      catFilter = null;
      applyCat();
      current = 0;
      clearReveal();
      render();
    });

    // 初始定位：支持 /chunks.html#make-a-decision 直接打开某一张，
    // 也支持 /chunks.html#cat-other 直接筛到某个分类
    var h = (location.hash || '').replace(/^#/, '');
    if (h.indexOf('cat-') === 0) {
      var wantCat = h.slice(4);
      for (var k = 0; k < catLinks.length; k++) {
        if (catLinks[k].getAttribute('data-cat-filter') === wantCat) {
          catFilter = wantCat;
          applyCat();
          current = 0;
          break;
        }
      }
    } else if (h) {
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].id === h) {
          var at = visible().indexOf(cards[i]);
          if (at >= 0) current = at;
          break;
        }
      }
    }

    // 键盘
    doc.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t && /^(input|textarea|select)$/i.test(t.tagName)) return;

      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); go(-1); break;
        case 'ArrowRight': e.preventDefault(); go(1); break;
        case ' ':
        case 'Spacebar': {
          e.preventDefault();
          var fab = doc.querySelector('[data-mask-toggle]');
          if (fab) fab.click();
          break;
        }
        case 'Home': e.preventDefault(); current = 0; clearReveal(); render(); break;
        case 'End': e.preventDefault(); current = visible().length - 1; clearReveal(); render(); break;
        default: break;
      }
    });

    // 触屏左右滑动
    var sx = 0;
    var sy = 0;
    stage.addEventListener('touchstart', function (e) {
      if (!e.touches || e.touches.length !== 1) return;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (!e.changedTouches || e.changedTouches.length !== 1) return;
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        go(dx < 0 ? 1 : -1);
      }
    }, { passive: true });

    render(false);
  })();
})();

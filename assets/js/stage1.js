/* ==========================================================================
   阶段一改造（阶段二已适配）
   ② 移动端顶栏自动隐藏
   ④ 翻卡模式：上一个 / 下一个 / 键盘 / 滑动 / URL 锚点

   与其它脚本的分工：
   - app.js   主题、侧栏、搜索（写 hidden 属性）、遮挡中文、复制、进度条
   - stage2.js 话题 / 动词 / 难度三组筛选项（写 data-facet-hidden 属性），
               以及复习引擎
   - 本文件   顶栏隐藏与翻卡

   可见判定 = 无 hidden 属性 且 无 data-facet-hidden 属性（两者是与关系）。
   筛选变化时 stage2.js 会派发 er:filters 事件，本文件据此重新对齐当前位置。
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

    var searchInputs = Array.prototype.slice.call(doc.querySelectorAll('[data-search]'));

    var current = 0;

    stage.classList.add('is-ready');

    function visible() {
      return cards.filter(function (c) {
        return !c.hidden && !c.hasAttribute('data-facet-hidden');
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
        if (catEl) catEl.textContent = '没有匹配的词块';
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
      if (catEl) catEl.textContent = card.getAttribute('data-topic-name') || '全部词块';
      if (prevBtn) prevBtn.disabled = current === 0;
      if (nextBtn) nextBtn.disabled = current === vis.length - 1;

      if (syncHash !== false) {
        if (card.id) {
          try { history.replaceState(null, '', '#' + card.id); } catch (e) { /* file:// 下可能失败 */ }
        }
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

    // 搜索：app.js 已先改完 hidden，这里重新对齐
    searchInputs.forEach(function (inp) {
      inp.addEventListener('input', function () { current = 0; clearReveal(); render(); });
    });

    // 话题 / 动词 / 难度筛选由 stage2.js 处理，处理完会派发 er:filters
    doc.addEventListener('er:filters', function () {
      current = 0;
      clearReveal();
      render();
    });

    // 初始定位：支持 /chunks.html#make-a-decision 直接打开某一张
    var h = (location.hash || '').replace(/^#/, '');
    if (h) {
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

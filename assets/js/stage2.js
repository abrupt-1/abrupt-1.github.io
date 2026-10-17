/* ==========================================================================
   阶段二：话题/动词/难度筛选 + 间隔重复复习引擎
   ==========================================================================
   分工：
   - 本文件写 data-facet-hidden 属性做三组筛选，app.js 写 hidden 属性做搜索，
     两者是与关系，互不覆盖
   - 筛选变化后派发 er:filters 事件，stage1.js 的翻卡据此重新对齐
   - 复习进度存在 localStorage（键 er-review-v1），不联网、不上传
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var STORE_KEY = 'er-review-v1';
  var NEW_PER_DAY = 10;

  /* ================= 日期工具 ================= */

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function addDays(iso, n) {
    var p = iso.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    d.setDate(d.getDate() + n);
    return ymd(d);
  }

  /* ================= 存储 ================= */

  function blankStore() {
    return { v: 1, direction: 'zh2en', items: {} };
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return blankStore();
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object' || !s.items) return blankStore();
      if (s.direction !== 'zh2en' && s.direction !== 'en2zh') s.direction = 'zh2en';
      return s;
    } catch (e) {
      return blankStore();
    }
  }

  function saveStore(s) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(s));
      return true;
    } catch (e) {
      return false;
    }
  }

  function storageOK() {
    try {
      localStorage.setItem('er-probe', '1');
      localStorage.removeItem('er-probe');
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ================= 排期规则 ================= */

  // 忘了 → 1 天后；模糊 → 3 天后；记住 → 首次 7 天，连续第二次 14 天，三次以上 30 天
  function plan(prev, grade, base) {
    if (grade === 'forgot') return { streak: 0, due: addDays(base, 1) };
    if (grade === 'vague') return { streak: prev ? prev.streak || 0 : 0, due: addDays(base, 3) };
    var streak = (prev ? prev.streak || 0 : 0) + 1;
    var gap = streak >= 3 ? 30 : (streak === 2 ? 14 : 7);
    return { streak: streak, due: addDays(base, gap) };
  }

  function dueCount(store) {
    var t = today();
    var n = 0;
    for (var id in store.items) {
      if (store.items[id] && store.items[id].due && store.items[id].due <= t) n++;
    }
    return n;
  }

  function dueBadge() {
    var el = doc.querySelector('[data-due-badge]');
    if (!el) return;
    if (!storageOK()) { el.hidden = true; return; }
    var n = dueCount(loadStore());
    if (!n) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = n > 99 ? '99+' : String(n);
  }

  function dueLine() {
    var el = doc.querySelector('[data-due-line]');
    if (!el) return;
    if (!storageOK()) {
      el.hidden = false;
      el.textContent = '浏览器禁用了本地存储，复习进度无法保存。';
      return;
    }
    var s = loadStore();
    var n = dueCount(s);
    var learned = Object.keys(s.items).length;
    el.hidden = false;
    el.innerHTML = n
      ? '今天有 <strong>' + n + '</strong> 条到期 · <a href="review.html">开始复习 →</a>'
      : (learned ? '今天没有到期的词块 · <a href="chunks.html">去翻卡看看 →</a>'
                 : '还没开始复习 · <a href="review.html">开始第一次复习 →</a>');
  }

  /* ================= 四组筛选（动词 / 难度 / 类型 / 用途） ================= */

  (function facets() {
    var cards = Array.prototype.slice.call(doc.querySelectorAll('.chunk-card'));
    if (!cards.length) return;

    var ATTR = {
      verb: 'data-verb',
      level: 'data-level',
      type: 'data-type',
      purpose: 'data-purpose'
    };

    var GROUPS = {
      verb: Array.prototype.slice.call(doc.querySelectorAll('.facet-chip[data-verb]')),
      level: Array.prototype.slice.call(doc.querySelectorAll('.facet-chip[data-level]')),
      type: Array.prototype.slice.call(doc.querySelectorAll('.facet-chip[data-type]')),
      purpose: Array.prototype.slice.call(doc.querySelectorAll('.facet-chip[data-purpose]'))
    };

    var searchInputs = Array.prototype.slice.call(doc.querySelectorAll('[data-search]'));
    var noRes = doc.querySelector('[data-no-result]');
    var activeBox = doc.querySelector('[data-active-filters]');
    var clearBtn = doc.querySelector('[data-clear-filters]');
    var countEl = doc.querySelector('[data-count]');

    var state = { verb: null, level: null, type: null, purpose: null };

    function matches(c) {
      for (var k in ATTR) {
        if (state[k] && c.getAttribute(ATTR[k]) !== state[k]) return false;
      }
      return true;
    }

    function labelOf(key) {
      var chips = GROUPS[key];
      for (var i = 0; i < chips.length; i++) {
        if (chips[i].getAttribute(ATTR[key]) === state[key]) {
          return chips[i].getAttribute('data-name') || state[key];
        }
      }
      return state[key];
    }

    function apply() {
      var visAfterSearch = 0;

      cards.forEach(function (c) {
        var ok = matches(c);
        if (ok) c.removeAttribute('data-facet-hidden');
        else c.setAttribute('data-facet-hidden', '');
        if (!c.hidden && ok) visAfterSearch++;
      });

      if (countEl) countEl.textContent = visAfterSearch + ' / ' + cards.length + ' 条';

      for (var key in GROUPS) {
        (function (key) {
          GROUPS[key].forEach(function (b) {
            b.classList.toggle('is-on', b.getAttribute(ATTR[key]) === state[key]);
          });
        })(key);
      }

      if (activeBox) {
        var parts = [];
        for (var k in ATTR) {
          if (state[k]) parts.push('<span class="facet-pill">' + labelOf(k) + '</span>');
        }
        activeBox.innerHTML = parts.length
          ? parts.join('')
          : '<span class="facet-none">未筛选</span>';
      }

      var any = false;
      for (var k2 in state) if (state[k2]) any = true;
      if (clearBtn) clearBtn.hidden = !any;
      if (noRes) noRes.hidden = visAfterSearch !== 0;

      doc.dispatchEvent(new CustomEvent('er:filters'));
    }

    function bind(key) {
      GROUPS[key].forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute(ATTR[key]);
          state[key] = (state[key] === v) ? null : v;
          apply();
        });
      });
    }

    bind('verb');
    bind('level');
    bind('type');
    bind('purpose');

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        for (var k in state) state[k] = null;
        apply();
      });
    }

    // 搜索变化后（app.js 已改完 hidden）重新评估计数与空态
    searchInputs.forEach(function (inp) {
      inp.addEventListener('input', function () { apply(); });
    });

    apply();
  })();

  /* ================= 复习引擎 ================= */

  (function review() {
    var panel = doc.querySelector('[data-review-panel]');
    if (!panel) return;

    var statusEl = doc.querySelector('[data-review-status]');
    var posEl = doc.querySelector('[data-review-pos]');
    var kindEl = doc.querySelector('[data-review-kind]');
    var dirBtn = doc.querySelector('[data-direction-toggle]');
    var cardEl = doc.querySelector('[data-review-card]');
    var labelEl = doc.querySelector('[data-review-label]');
    var promptEl = doc.querySelector('[data-review-prompt]');
    var answerEl = doc.querySelector('[data-review-answer]');
    var enEl = doc.querySelector('[data-review-en]');
    var zhEl = doc.querySelector('[data-review-zh]');
    var exEnEl = doc.querySelector('[data-review-ex-en]');
    var exZhEl = doc.querySelector('[data-review-ex-zh]');
    var noteEl = doc.querySelector('[data-review-note]');
    var revealBtn = doc.querySelector('[data-reveal]');
    var gradeRow = doc.querySelector('[data-grade-row]');
    var doneEl = doc.querySelector('[data-review-done]');
    var summaryEl = doc.querySelector('[data-review-summary]');
    var statsEl = doc.querySelector('[data-review-stats]');
    var toolsEl = doc.querySelector('[data-review-tools]');
    var msgEl = doc.querySelector('[data-tools-msg]');
    var noscriptEl = doc.querySelector('[data-noscript]');

    var dataEl = doc.getElementById('chunk-data');
    var data = [];
    try { data = JSON.parse(dataEl.textContent); } catch (e) { data = []; }

    if (!data.length) {
      statusEl.textContent = '词块数据读取失败。';
      return;
    }

    if (!storageOK()) {
      statusEl.textContent = '浏览器禁用了本地存储，复习进度无法保存。请关闭无痕模式或调整隐私设置后重试。';
      if (noscriptEl) noscriptEl.hidden = false;
      return;
    }

    var store = loadStore();
    var byId = {};
    data.forEach(function (c) { byId[c.i] = c; });

    var queue = [];
    var idx = 0;
    var session = { forgot: 0, vague: 0, got: 0 };

    function buildQueue() {
      var t = today();
      var due = [];
      for (var id in store.items) {
        var it = store.items[id];
        if (it && it.due && it.due <= t && byId[id]) due.push(id);
      }
      due.sort(function (a, b) {
        return (store.items[a].due || '').localeCompare(store.items[b].due || '');
      });

      var newToday = 0;
      for (var id2 in store.items) {
        if (store.items[id2] && store.items[id2].first === t) newToday++;
      }
      var room = Math.max(0, (store.newPerDay || NEW_PER_DAY) - newToday);
      var fresh = [];
      for (var i = 0; i < data.length && fresh.length < room; i++) {
        if (!store.items[data[i].i]) fresh.push(data[i].i);
      }

      queue = due.concat(fresh);
      idx = 0;
      session = { forgot: 0, vague: 0, got: 0 };
    }

    function setDirectionLabel() {
      dirBtn.textContent = store.direction === 'zh2en' ? '中 → 英' : '英 → 中';
      dirBtn.title = store.direction === 'zh2en'
        ? '当前：看中文，回想英文。点击切换为「英 → 中」'
        : '当前：看英文，回想中文。点击切换为「中 → 英」';
    }

    function renderStats() {
      if (!statsEl) return;
      var learned = Object.keys(store.items).length;
      var mastered = 0;
      var nextDue = null;
      var t = today();
      for (var id in store.items) {
        var it = store.items[id];
        if (it.streak >= 2) mastered++;
        if (it.due && it.due > t && (!nextDue || it.due < nextDue)) nextDue = it.due;
      }
      var due = dueCount(store);

      statsEl.hidden = false;
      statsEl.innerHTML =
        '<h2 class="review-tools-title">总体进度</h2>' +
        '<div class="stat-row stat-row--compact">' +
        '<div class="stat"><strong>' + learned + '</strong><span>已开始 / ' + data.length + ' 条</span></div>' +
        '<div class="stat"><strong>' + mastered + '</strong><span>已掌握（连对 2 次）</span></div>' +
        '<div class="stat"><strong>' + due + '</strong><span>今日到期</span></div>' +
        '<div class="stat"><strong>' + (nextDue || '—') + '</strong><span>下次到期</span></div>' +
        '</div>';
    }

    function finish() {
      panel.hidden = true;
      doneEl.hidden = false;
      var total = session.forgot + session.vague + session.got;
      summaryEl.textContent = total
        ? '本次复习 ' + total + ' 条：记住 ' + session.got + ' 条、模糊 ' + session.vague +
          ' 条、忘了 ' + session.forgot + ' 条。忘了的明天会再出现。'
        : '';
      renderStats();
      if (toolsEl) toolsEl.hidden = false;
      dueBadge();
    }

    function render() {
      if (idx >= queue.length) { finish(); return; }

      var c = byId[queue[idx]];
      var isNew = !store.items[c.i];

      panel.hidden = false;
      doneEl.hidden = true;
      if (posEl) posEl.textContent = (idx + 1) + ' / ' + queue.length;
      if (kindEl) {
        kindEl.textContent = isNew ? '新词块' : '复习';
        kindEl.className = 'review-kind' + (isNew ? ' is-new' : '');
      }

      answerEl.hidden = true;
      revealBtn.hidden = false;
      gradeRow.hidden = true;

      if (store.direction === 'zh2en') {
        labelEl.textContent = '中文意图 → 说出英文搭配';
        promptEl.textContent = c.z;
        promptEl.className = 'review-prompt';
        enEl.textContent = c.e;
        zhEl.textContent = '';
      } else {
        labelEl.textContent = '英文搭配 → 说出中文意图';
        promptEl.textContent = c.e;
        promptEl.className = 'review-prompt review-prompt--en';
        enEl.textContent = '';
        zhEl.textContent = c.z;
      }

      exEnEl.textContent = c.x;
      exZhEl.textContent = c.t;
      noteEl.textContent = c.n;
    }

    function reveal() {
      answerEl.hidden = false;
      revealBtn.hidden = true;
      gradeRow.hidden = false;
    }

    function grade(g) {
      var id = queue[idx];
      var c = byId[id];
      if (!c) { idx++; render(); return; }

      var t = today();
      var prev = store.items[id] || null;
      var next = plan(prev, g, t);

      store.items[id] = {
        due: next.due,
        streak: next.streak,
        seen: (prev ? prev.seen || 0 : 0) + 1,
        last: t,
        first: prev ? (prev.first || t) : t,
        lastGrade: g
      };

      if (g === 'forgot') session.forgot++;
      else if (g === 'vague') session.vague++;
      else session.got++;

      if (!saveStore(store)) {
        if (msgEl) msgEl.textContent = '保存失败：浏览器未允许本地存储。';
      }

      idx++;
      render();
    }

    /* --- 事件 --- */
    revealBtn.addEventListener('click', reveal);
    cardEl.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      if (answerEl.hidden) reveal();
    });

    Array.prototype.forEach.call(doc.querySelectorAll('[data-grade]'), function (b) {
      b.addEventListener('click', function () { grade(b.getAttribute('data-grade')); });
    });

    dirBtn.addEventListener('click', function () {
      store.direction = store.direction === 'zh2en' ? 'en2zh' : 'zh2en';
      saveStore(store);
      setDirectionLabel();
      render();
    });

    doc.addEventListener('keydown', function (e) {
      if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') {
        if (!answerEl.hidden) return;
        e.preventDefault();
        reveal();
      } else if (answerEl.hidden === false) {
        if (e.key === '1') grade('forgot');
        else if (e.key === '2') grade('vague');
        else if (e.key === '3') grade('got');
      }
    });

    /* --- 导出 / 导入 / 清空 --- */
    var exportBtn = doc.querySelector('[data-export]');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var payload = {
          app: 'english-review',
          v: 1,
          exportedAt: new Date().toISOString(),
          total: data.length,
          store: store
        };
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = doc.createElement('a');
        a.href = url;
        a.download = 'english-review-progress-' + today() + '.json';
        doc.body.appendChild(a);
        a.click();
        doc.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        if (msgEl) msgEl.textContent = '已导出。换设备时用「导入进度」恢复。';
      });
    }

    var importInput = doc.querySelector('[data-import]');
    if (importInput) {
      importInput.addEventListener('change', function () {
        var f = importInput.files && importInput.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var obj = JSON.parse(String(reader.result));
            var incoming = obj && obj.store ? obj.store : obj;
            if (!incoming || !incoming.items || typeof incoming.items !== 'object') {
              throw new Error('文件里没有找到 items');
            }
            var n = Object.keys(incoming.items).length;
            if (!window.confirm('将用导入文件覆盖当前进度（' + n + ' 条记录）。确定吗？')) {
              importInput.value = '';
              return;
            }
            var merged = blankStore();
            merged.direction = (incoming.direction === 'en2zh') ? 'en2zh' : 'zh2en';
            merged.items = incoming.items;
            if (!saveStore(merged)) throw new Error('写入本地存储失败');
            store = merged;
            syncLimit();
            setDirectionLabel();
            buildQueue();
            renderStats();
            if (msgEl) msgEl.textContent = '导入成功，共 ' + n + ' 条记录。';
            if (queue.length) render(); else finish();
            dueBadge();
          } catch (err) {
            if (msgEl) msgEl.textContent = '导入失败：' + err.message;
          }
          importInput.value = '';
        };
        reader.readAsText(f, 'utf-8');
      });
    }

    var resetBtn = doc.querySelector('[data-reset]');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (!window.confirm('清空所有复习进度？此操作不可撤销，建议先导出备份。')) return;
        try { localStorage.removeItem(STORE_KEY); } catch (e) {}
        store = blankStore();
        syncLimit();
        setDirectionLabel();
        buildQueue();
        renderStats();
        if (msgEl) msgEl.textContent = '进度已清空。';
        if (queue.length) render(); else finish();
        dueBadge();
      });
    }

    /* --- 每天新卡上限 --- */
    var limitSel = doc.querySelector('[data-newlimit]');
    function syncLimit() {
      if (limitSel) limitSel.value = String(store.newPerDay || NEW_PER_DAY);
    }
    if (limitSel) {
      limitSel.addEventListener('change', function () {
        var v = parseInt(limitSel.value, 10);
        store.newPerDay = (v > 0 && v <= 200) ? v : NEW_PER_DAY;
        saveStore(store);
        if (msgEl) msgEl.textContent = '每天新卡已设为 ' + store.newPerDay + ' 条，下次进入复习页生效。';
      });
    }

    /* --- 启动 --- */
    syncLimit();
    setDirectionLabel();
    renderStats();
    buildQueue();
    statusEl.hidden = true;

    if (queue.length) {
      render();
      if (toolsEl) toolsEl.hidden = false;
    } else {
      finish();
    }
  })();

  /* ================= 全站通用：到期徽标 / 首页提示 ================= */
  dueBadge();
  dueLine();
})();

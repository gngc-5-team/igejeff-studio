// 사이트의 작은 동작: 메인 타이틀 더미, 게임 목록 미리보기와 필터, 플레이어, 스튜디오 목차
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  setTimeout(function () { document.documentElement.classList.add('settled'); }, 1600);

  initDeck();
  initShelf();
  initPlayer();
  initSectionNav();

  // 메인의 게임 타이틀 더미. 5초마다 한 장씩 넘기고, 마우스를 올리거나 정지하면 멈춘다
  function initDeck() {
    var deck = document.querySelector('[data-deck]');
    if (!deck) return;

    var TICK = 5000;
    var hero = deck.closest('.hero');
    var tilt = deck.querySelector('[data-tilt]');
    var cards = Array.prototype.slice.call(deck.querySelectorAll('[data-card]'));
    var total = cards.length;
    var text = hero.querySelector('[data-now-text]');
    var nameEl = hero.querySelector('[data-now-name]');
    var lineEl = hero.querySelector('[data-now-line]');
    var goEl = hero.querySelector('[data-now-go]');
    var countEl = hero.querySelector('[data-now-count]');
    var clock = hero.querySelector('[data-now-clock]');
    var pauseBtn = hero.querySelector('[data-now-pause]');
    var current = 0;
    var timer = null;
    var remaining = TICK;
    var startedAt = 0;
    var hovering = false;
    var stopped = reduced;

    function place() {
      cards.forEach(function (card, index) {
        if (card.dataset.pos === 'out') return;
        var pos = (index - current + total) % total;
        card.dataset.pos = pos < 3 ? String(pos) : 'rest';
        var top = pos === 0;
        card.tabIndex = top ? 0 : -1;
        card.setAttribute('aria-hidden', top ? 'false' : 'true');
      });
    }

    function describe() {
      var card = cards[current];
      text.classList.add('is-swap');
      setTimeout(function () {
        nameEl.textContent = card.dataset.name;
        lineEl.textContent = card.dataset.line;
        goEl.href = card.getAttribute('href');
        countEl.textContent = String(current + 1).padStart(2, '0');
        text.classList.remove('is-swap');
      }, 180);
    }

    function settle(card) {
      card.classList.add('no-anim');
      card.dataset.pos = 'rest';
      void card.offsetWidth;
      card.classList.remove('no-anim');
    }

    function next() {
      var leaving = cards[current];
      leaving.dataset.pos = 'out';
      leaving.tabIndex = -1;
      current = (current + 1) % total;
      place();
      setTimeout(function () {
        if (leaving.dataset.pos === 'out') { settle(leaving); place(); }
      }, reduced ? 0 : 520);
      describe();
    }

    function previous() {
      var coming = cards[(current - 1 + total) % total];
      coming.classList.add('no-anim');
      coming.dataset.pos = 'out';
      void coming.offsetWidth;
      coming.classList.remove('no-anim');
      current = (current - 1 + total) % total;
      coming.dataset.pos = '0';
      place();
      describe();
    }

    function restartClock() {
      clock.classList.remove('is-run');
      void clock.offsetWidth;
      if (!stopped) clock.classList.add('is-run');
    }

    function arm(delay) {
      clearTimeout(timer);
      if (stopped || hovering || document.hidden) return;
      startedAt = Date.now();
      remaining = delay;
      timer = setTimeout(function () {
        next();
        restartClock();
        arm(TICK);
      }, delay);
    }

    function hold() {
      clearTimeout(timer);
      remaining = Math.max(400, remaining - (Date.now() - startedAt));
      hero.classList.add('is-held');
    }

    function resume() {
      hero.classList.remove('is-held');
      arm(remaining);
    }

    function step(forward) {
      if (forward) next();
      else previous();
      remaining = TICK;
      restartClock();
      if (hovering || stopped) hero.classList.add('is-held');
      else arm(TICK);
    }

    function setStopped(value) {
      stopped = value;
      pauseBtn.innerHTML = stopped
        ? '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 0l9 6-9 6z"/></svg>'
        : '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 0h3.5v12H1zM7.5 0H11v12H7.5z"/></svg>';
      pauseBtn.setAttribute('aria-label', stopped ? '타이틀 넘기기 다시 시작' : '타이틀 넘기기 멈추기');
      if (stopped) {
        clearTimeout(timer);
        clock.classList.remove('is-run');
      } else {
        remaining = TICK;
        hero.classList.remove('is-held');
        restartClock();
        arm(TICK);
      }
    }

    hero.querySelector('[data-now-prev]').addEventListener('click', function () { step(false); });
    hero.querySelector('[data-now-next]').addEventListener('click', function () { step(true); });
    pauseBtn.addEventListener('click', function () { setStopped(!stopped); });

    deck.addEventListener('pointerenter', function (event) {
      if (event.pointerType !== 'mouse') return;
      hovering = true;
      if (!stopped) hold();
    });
    deck.addEventListener('pointerleave', function (event) {
      if (event.pointerType !== 'mouse') return;
      hovering = false;
      if (!stopped) resume();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight') step(true);
      if (event.key === 'ArrowLeft') step(false);
    });

    var touchX = null;
    deck.addEventListener('touchstart', function (event) { touchX = event.touches[0].clientX; }, { passive: true });
    deck.addEventListener('touchend', function (event) {
      if (touchX === null) return;
      var dx = event.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 40) step(dx < 0);
    });

    document.addEventListener('visibilitychange', function () {
      if (stopped || hovering) return;
      if (document.hidden) hold();
      else resume();
    });

    // 마우스를 따라 더미가 살짝 기울고 빛이 움직인다
    if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var target = { rx: 0, ry: 0, gx: 30, gy: 16 };
      var state = { rx: 0, ry: 0, gx: 30, gy: 16 };
      var frame = null;

      function render() {
        var moving = false;
        Object.keys(target).forEach(function (key) {
          var gap = target[key] - state[key];
          if (Math.abs(gap) > .01) moving = true;
          state[key] += gap * .09;
        });
        tilt.style.setProperty('--rx', state.rx.toFixed(2) + 'deg');
        tilt.style.setProperty('--ry', state.ry.toFixed(2) + 'deg');
        tilt.style.setProperty('--gx', state.gx.toFixed(1) + '%');
        tilt.style.setProperty('--gy', state.gy.toFixed(1) + '%');
        frame = moving ? requestAnimationFrame(render) : null;
      }

      hero.addEventListener('pointermove', function (event) {
        if (event.pointerType !== 'mouse') return;
        var box = deck.getBoundingClientRect();
        var x = (event.clientX - (box.left + box.width / 2)) / window.innerWidth;
        var y = (event.clientY - (box.top + box.height / 2)) / window.innerHeight;
        target.ry = Math.max(-7, Math.min(7, x * 14));
        target.rx = Math.max(-6, Math.min(6, -y * 12));
        target.gx = 50 + x * 90;
        target.gy = 40 + y * 90;
        if (!frame) frame = requestAnimationFrame(render);
      });
      hero.addEventListener('pointerleave', function () {
        target.rx = 0; target.ry = 0; target.gx = 30; target.gy = 16;
        if (!frame) frame = requestAnimationFrame(render);
      });
    }

    place();
    if (stopped) setStopped(true);
    else { restartClock(); arm(TICK); }
  }

  // 게임 목록: 줄에 마우스를 올리면 오른쪽 미리보기가 바뀌고, 바로 플레이하거나 개발 중인 게임만 추릴 수 있다
  function initShelf() {
    var shelf = document.querySelector('[data-shelf]');
    if (!shelf) return;
    var rows = Array.prototype.slice.call(shelf.querySelectorAll('[data-row]'));
    var slides = Array.prototype.slice.call(shelf.querySelectorAll('[data-slide]'));
    var infos = Array.prototype.slice.call(shelf.querySelectorAll('[data-info]'));
    var filter = document.querySelector('[data-filter]');

    function show(id) {
      rows.forEach(function (row) { row.classList.toggle('is-on', row.dataset.row === id); });
      slides.forEach(function (slide) { slide.classList.toggle('is-on', slide.dataset.slide === id); });
      infos.forEach(function (info) { info.hidden = info.dataset.info !== id; });
    }

    rows.forEach(function (row) {
      row.addEventListener('pointerenter', function (event) {
        if (event.pointerType === 'mouse') show(row.dataset.row);
      });
      row.addEventListener('focus', function () { show(row.dataset.row); });
    });

    if (filter) {
      var buttons = Array.prototype.slice.call(filter.querySelectorAll('button'));
      filter.hidden = false;
      buttons.forEach(function (button) {
        button.addEventListener('click', function () {
          var mode = button.dataset.show;
          buttons.forEach(function (b) { b.setAttribute('aria-pressed', b === button ? 'true' : 'false'); });
          var first = null;
          rows.forEach(function (row) {
            var visible = mode === 'all' || row.dataset[mode] === 'yes';
            row.parentElement.hidden = !visible;
            if (visible && !first) first = row;
          });
          if (first) show(first.dataset.row);
        });
      });
    }
  }

  // 웹 게임은 누를 때에만 불러와 전체 화면에서 돌린다
  function initPlayer() {
    var dialog = document.querySelector('[data-player]');
    var button = document.querySelector('[data-play]');
    if (!dialog || !button) return;
    var frame = dialog.querySelector('[data-player-frame]');

    button.addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = button.dataset.play;
      iframe.title = button.dataset.name + ' 플레이 화면';
      iframe.allow = 'autoplay; fullscreen *; gamepad; accelerometer; gyroscope';
      frame.appendChild(iframe);
      dialog.showModal();
      iframe.focus();
    });
    dialog.querySelector('[data-player-close]').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('close', function () { frame.textContent = ''; });
  }

  // 스튜디오 목차: 지금 읽는 구역을 표시한다
  function initSectionNav() {
    var nav = document.querySelector('[data-lnav]');
    if (!nav || !('IntersectionObserver' in window)) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));

    function mark(id) {
      links.forEach(function (link) {
        var on = link.getAttribute('href') === '#' + id;
        if (on) {
          link.setAttribute('aria-current', 'true');
          var strip = link.closest('ul');
          if (strip.scrollWidth > strip.clientWidth) {
            strip.scrollLeft = link.offsetLeft - strip.offsetLeft - 20;
          }
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    // 목차로 이동한 직후에는 고른 칸을 유지한다. 짧은 섹션은 판정선에 닿지 않아 다음 칸이 켜지기 때문이다
    var pinnedUntil = 0;
    function pin(id, ms) {
      pinnedUntil = Date.now() + ms;
      mark(id);
    }

    var observer = new IntersectionObserver(function (entries) {
      if (Date.now() < pinnedUntil) return;
      entries.forEach(function (entry) {
        if (entry.isIntersecting) mark(entry.target.id);
      });
    }, { root: document, rootMargin: '-35% 0px -60% 0px' }); // root를 문서로 지정해야 iframe 안에서도 rootMargin이 적용된다

    links.forEach(function (link) {
      var section = document.querySelector(link.getAttribute('href'));
      if (section) observer.observe(section);
      link.addEventListener('click', function () { pin(link.getAttribute('href').slice(1), 1200); });
    });
    if (nav.querySelector('a[href="' + location.hash + '"]')) pin(location.hash.slice(1), 2500); // 페이지를 읽어 들인 뒤 스크롤이 끝날 때까지
  }
})();

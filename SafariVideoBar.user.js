// ==UserScript==
// @name         Safari VideoBar
// @namespace    https://github.com/dinosaur65/safarivideobar
// @version      1.0.1
// @description  Bottom control bar for videos on any site in iOS Safari: tap ⛶ for page fullscreen, progress bar, speed, X-style multi-tap seek, swipe to scrub.
// @author       dinosaur65
// @license      MIT
// @homepageURL  https://github.com/dinosaur65/safarivideobar
// @downloadURL  https://raw.githubusercontent.com/dinosaur65/safarivideobar/main/SafariVideoBar.user.js
// @updateURL    https://raw.githubusercontent.com/dinosaur65/safarivideobar/main/SafariVideoBar.user.js
// @match        *://*/*
// @run-at       document-idle
// ==/UserScript==
// To disable the script on a site, add its domain to EXCLUDE_HOSTS below.

(function () {
  'use strict';

  // X (Twitter)-style video gestures: double-tap the left/right side to seek SEEK_STEP seconds,
  // then keep tapping the same side to add SEEK_STEP seconds per tap (20, 30, 40...)
  const SEEK_STEP = 10;
  const SEEK_WINDOW = 800;    // Max gap between taps (ms) to count as a streak; the total resets after this long without a tap
  const SPEEDS = [0.75, 1, 1.25, 1.5, 2];         // Playback speed steps
  // Press and swipe left/right anywhere to scrub: a swipe across the full screen width equals
  // video duration x SWIPE_RATIO seconds, clamped between SWIPE_MIN and SWIPE_MAX
  const SWIPE_RATIO = 0.05;   // A full swipe is about 90 s for a 30-minute video, 3 min for 1 hour, capped at 5 min from 2 hours
  const SWIPE_MIN = 60;
  const SWIPE_MAX = 300;
  const SCRUB_LIVE = false;   // false: jump when you lift your finger (recommended, avoids repeated buffering); true: seek while swiping
  const HIDE_AFTER = 3500;                        // Auto-hide delay for the control bar (ms)
  const EXCLUDE_HOSTS = [];                       // e.g. ['youtube.com', 'bilibili.com']

  // On-screen text follows the device language (navigator.language). Falls back to English.
  // To add a language, copy one entry and add a branch in pickLang().
  const I18N = {
    en:     { hint: 'Swipe up',          hintSub: 'to hide the address bar',          sec: (n) => `${n} s` },
    zhHans: { hint: '向上轻扫一下',        hintSub: '可以收起地址栏',                    sec: (n) => `${n} 秒` },
    zhHant: { hint: '向上輕掃一下',        hintSub: '可以收起網址列',                    sec: (n) => `${n} 秒` },
    ja:     { hint: '上にスワイプ',        hintSub: 'アドレスバーを隠せます',            sec: (n) => `${n} 秒` },
    ko:     { hint: '위로 살짝 밀기',      hintSub: '주소 표시줄을 숨길 수 있어요',      sec: (n) => `${n}초` },
  };
  function pickLang() {
    const l = String((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase();
    if (l.startsWith('zh')) return /hant|-tw|-hk|-mo/.test(l) ? 'zhHant' : 'zhHans';
    if (l.startsWith('ja')) return 'ja';
    if (l.startsWith('ko')) return 'ko';
    return 'en';
  }
  const T = I18N[pickLang()];

  const host = location.hostname;
  if (EXCLUDE_HOSTS.some((h) => host === h || host.endsWith('.' + h))) return;
  if (window.__vbLoaded) return;
  window.__vbLoaded = true;

  const inFrame = window !== window.top;
  const done = new WeakSet();
  const states = new WeakMap();

  const style = document.createElement('style');
  style.textContent = `
    .vb-full{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;max-width:none!important;max-height:none!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;z-index:2147483000!important;background:#000!important;object-fit:contain!important;transform:none!important;}
    .vb-anc{transform:none!important;filter:none!important;perspective:none!important;contain:none!important;backdrop-filter:none!important;will-change:auto!important;}
    .vb-hide,.vb-hide *{visibility:hidden!important;pointer-events:none!important;}
    .vb-child-full .vb-root{display:none!important;}
    .vb-root{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;overflow:visible!important;pointer-events:none!important;z-index:2147483647;-webkit-tap-highlight-color:transparent;}
    .vb-root *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
    .vb-bar{position:fixed;left:0;right:0;bottom:0;display:none;align-items:center;gap:8px;padding:10px calc(14px + env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left));background:linear-gradient(transparent,rgba(0,0,0,.8));color:#fff;font:14px -apple-system,sans-serif;pointer-events:auto;}
    .vb-bar.vb-on{display:flex;flex-direction:column;align-items:stretch;gap:2px;}
    .vb-row{display:flex;align-items:center;gap:8px;}
    .vb-seek{position:fixed;top:50%;transform:translateY(-50%);display:none;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.45);color:#fff;font:600 15px -apple-system,sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap;pointer-events:none;}
    .vb-seek.vb-on{display:flex;}
    .vb-seek.vb-l{left:calc(8% + env(safe-area-inset-left));}
    .vb-seek.vb-r{right:calc(8% + env(safe-area-inset-right));}
    .vb-seek b{font-size:12px;letter-spacing:-2px;}
    .vb-bar button{background:none;border:0;color:#fff;font-size:15px;padding:8px 6px;min-width:40px;touch-action:manipulation;}
    .vb-bar input{flex:1;height:28px;min-width:0;}
    .vb-bar span{font-variant-numeric:tabular-nums;white-space:nowrap;}
    .vb-fs{position:fixed;top:0;left:0;width:44px;height:44px;border-radius:22px;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:20px;opacity:.8;pointer-events:auto;touch-action:manipulation;}
    .vb-fs.vb-off{display:none;}
    .vb-gesture{position:fixed;left:0;right:0;top:0;bottom:0;display:none;pointer-events:auto;touch-action:pan-y;}
    .vb-spacer{display:block!important;width:1px!important;height:150vh!important;pointer-events:none!important;}
    .vb-gesture.vb-on{display:block;}
    .vb-scrub{position:fixed;left:50%;top:42%;transform:translate(-50%,-50%);display:none;padding:12px 22px;border-radius:12px;background:rgba(0,0,0,.65);color:#fff;font:600 28px -apple-system,sans-serif;font-variant-numeric:tabular-nums;text-align:center;pointer-events:none;}
    .vb-scrub small{display:block;margin-top:4px;font-size:15px;font-weight:500;opacity:.85;}
    .vb-scrub.vb-on{display:block;}
  `;
  document.documentElement.appendChild(style);

  const fmt = (s) => {
    if (!isFinite(s)) return '--:--';
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(x).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  // Respond on pointerup; ignore the click that follows so the action doesn't fire twice
  function onTap(el, fn) {
    let last = 0;
    el.addEventListener('pointerup', (e) => {
      last = Date.now();
      e.stopPropagation();
      fn(e);
    });
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (Date.now() - last > 500) fn(e);
    });
  }

  // In landscape, let the page extend under the notch: add viewport-fit=cover to the page's viewport while fullscreen, restore it on exit
  let savedViewport = null;
  function setViewportCover(on) {
    const m = document.querySelector('meta[name="viewport"]');
    if (!m) return;
    if (on) {
      if (savedViewport === null) savedViewport = m.getAttribute('content') || '';
      const next = /viewport-fit\s*=/i.test(savedViewport)
        ? savedViewport.replace(/viewport-fit\s*=\s*\w+/i, 'viewport-fit=cover')
        : (savedViewport ? savedViewport + ', ' : '') + 'viewport-fit=cover';
      m.setAttribute('content', next);
    } else if (savedViewport !== null) {
      m.setAttribute('content', savedViewport);
      savedViewport = null;
    }
  }

  // Collapsing the address bar: Safari only collapses it when the user scrolls the page up
  // (in landscape it hides completely). So during fullscreen we don't lock scrolling; instead we
  // add blank space at the bottom of the page so it can always scroll up.
  // Inside an iframe we lock its own scroll so the swipe is passed on to the outer page.
  const fullEls = new Set();
  let spacer = null, savedScroll = 0;
  function setPageFull(el, on) {
    const before = fullEls.size;
    if (on) fullEls.add(el); else fullEls.delete(el);
    if (before === 0 && fullEls.size > 0) {
      savedScroll = window.scrollY;
      if (inFrame) {
        document.documentElement.style.overflow = 'hidden';
      } else {
        spacer = document.createElement('div');
        spacer.className = 'vb-spacer';
        document.body.appendChild(spacer);
      }
      setViewportCover(true);
    } else if (before > 0 && fullEls.size === 0) {
      if (spacer) { spacer.remove(); spacer = null; }
      document.documentElement.style.overflow = '';
      setViewportCover(false);
      window.scrollTo(0, savedScroll);
    }
  }

  // Stretch an element (video or iframe) to fill the page and hide the site's own elements around it (old controls, overlays, etc.)
  function setElFull(el, on) {
    let st = states.get(el);
    if (!st) { st = { hidden: new Set(), anc: new Set(), iv: null }; states.set(el, st); }
    el.classList.toggle('vb-full', on);
    setPageFull(el, on);
    clearInterval(st.iv);

    const hide = () => {
      let node = el;
      while (node && node !== document.body && node !== document.documentElement) {
        const parent = node.parentElement;
        if (!parent) break;
        if (parent !== document.body && parent !== document.documentElement) {
          parent.classList.add('vb-anc'); // Ancestor transforms and similar break position:fixed, so remove them while fullscreen
          st.anc.add(parent);
        }
        for (const sib of parent.children) {
          if (sib === node || sib.classList.contains('vb-root')) continue;
          const t = sib.tagName;
          if (t === 'STYLE' || t === 'SCRIPT' || t === 'LINK') continue;
          sib.classList.add('vb-hide');
          st.hidden.add(sib);
        }
        node = parent;
      }
    };

    if (on) {
      hide();
      st.iv = setInterval(hide, 500); // Also hides new elements the site renders later
    } else {
      st.hidden.forEach((e) => e.classList.remove('vb-hide'));
      st.hidden.clear();
      st.anc.forEach((e) => e.classList.remove('vb-anc'));
      st.anc.clear();
    }
  }

  // Player inside an iframe: tell the outer page to stretch this iframe to fill the page (nested iframes pass it up level by level)
  function notifyParent(on) {
    if (!inFrame) return;
    try { window.parent.postMessage({ __vb: 1, on: !!on }, '*'); } catch (_) {}
  }
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.__vb !== 1) return;
    let frameEl = null;
    for (const f of document.querySelectorAll('iframe')) {
      if (f.contentWindow === e.source) { frameEl = f; break; }
    }
    if (!frameEl) return;
    const on = !!d.on;
    setElFull(frameEl, on);
    document.documentElement.classList.toggle('vb-child-full', on);
    if (on) {
      // If the player page navigates, its exit button is gone, so restore automatically
      frameEl.addEventListener('load', () => {
        setElFull(frameEl, false);
        document.documentElement.classList.remove('vb-child-full');
        notifyParent(false);
      }, { once: true });
    }
    notifyParent(on);
  });

  function attach(v) {
    if (done.has(v)) return;
    done.add(v);

    // Put all UI in one root node and promote it to the browser's top layer so no z-index overlay can cover it
    const root = document.createElement('div');
    root.className = 'vb-root';
    root.setAttribute('popover', 'manual');

    const bar = document.createElement('div');
    bar.className = 'vb-bar';
    bar.innerHTML = `
      <div class="vb-row">
      <button data-a="play">▶︎</button>
      <input type="range" min="0" max="1000" step="1" value="0">
      <span class="vb-time">0:00 / 0:00</span>
      <button data-a="speed">1x</button>
      <button data-a="exit">✕</button>
      </div>`;
    const fsBtn = document.createElement('button');
    fsBtn.className = 'vb-fs vb-off';
    fsBtn.textContent = '⛶';
    const gesture = document.createElement('div');
    gesture.className = 'vb-gesture';
    const scrubEl = document.createElement('div');
    scrubEl.className = 'vb-scrub';
    const seekEl = document.createElement('div');
    seekEl.className = 'vb-seek';
    root.append(gesture, seekEl, scrubEl, bar, fsBtn);
    document.documentElement.appendChild(root);

    const showTopLayer = () => {
      try {
        if (root.showPopover && !root.matches(':popover-open')) root.showPopover();
      } catch (_) { /* not supported: fall back to z-index */ }
    };
    showTopLayer();

    const playBtn = bar.querySelector('[data-a=play]');
    const speedBtn = bar.querySelector('[data-a=speed]');
    const range = bar.querySelector('input');
    const timeEl = bar.querySelector('.vb-time');
    let full = false, shown = false, hideTimer = null, dragging = false;
    let btnVisible = false, prevControls = false, raf = 0, tick = 0, iv = null;

    function render() {
      bar.classList.toggle('vb-on', full && shown);
      gesture.classList.toggle('vb-on', full);
      fsBtn.classList.toggle('vb-off', full ? !shown : !btnVisible);
      fsBtn.textContent = full ? '✕' : '⛶';
    }
    function showUI() {
      shown = true;
      render();
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!v.paused && !dragging) { shown = false; render(); }
      }, HIDE_AFTER);
    }
    function toggleUI() {
      if (shown) { shown = false; clearTimeout(hideTimer); render(); } else showUI();
    }

    function placeBtn() {
      const vw = window.innerWidth;
      if (full) {
        fsBtn.style.left = 'calc(100vw - 56px - env(safe-area-inset-right, 0px))';
        fsBtn.style.top = 'calc(12px + env(safe-area-inset-top, 0px))';
        return;
      }
      const r = v.getBoundingClientRect();
      const vh = window.innerHeight;
      btnVisible = r.width >= 200 && r.height >= 100 &&
        r.bottom > 60 && r.top < vh - 60 && r.right > 60 && r.left < vw - 60;
      fsBtn.style.left = Math.max(0, Math.min(r.right, vw) - 52) + 'px';
      fsBtn.style.top = Math.max(r.top, 0) + 8 + 'px';
    }
    function update() {
      raf = 0;
      if (!v.isConnected) { cleanup(); return; }
      placeBtn();
      render();
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };

    function setFull(on) {
      full = on;
      if (on) { prevControls = v.controls; v.controls = false; }
      else { v.controls = prevControls; }
      setElFull(v, on);
      notifyParent(on);
      placeBtn();
      if (on) { showUI(); showHint(); } else { shown = false; render(); schedule(); }
    }

    // Show a hint the first time fullscreen is entered on each page
    function showHint() {
      if (window.__vbHinted) return;
      window.__vbHinted = true;
      scrubEl.innerHTML = `${T.hint}<small>${T.hintSub}</small>`;
      scrubEl.classList.add('vb-on');
      setTimeout(() => { if (!scrubbing) scrubEl.classList.remove('vb-on'); }, 2500);
    }

    function cleanup() {
      clearInterval(iv);
      clearTimeout(hideTimer);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      if (full) { setElFull(v, false); notifyParent(false); }
      root.remove();
    }

    onTap(fsBtn, () => setFull(!full));
    onTap(bar, (e) => {
      const btn = e.target.closest && e.target.closest('button');
      const a = btn && btn.dataset.a;
      if (!a) return;
      showUI();
      if (a === 'play') v.paused ? v.play() : v.pause();
      if (a === 'speed') {
        const i = SPEEDS.indexOf(v.playbackRate);
        v.playbackRate = SPEEDS[(i + 1) % SPEEDS.length];
        speedBtn.textContent = v.playbackRate + 'x';
      }
      if (a === 'exit') setFull(false);
    });

    range.addEventListener('input', () => {
      dragging = true;
      showUI();
      if (isFinite(v.duration)) v.currentTime = (range.value / 1000) * v.duration;
    });
    range.addEventListener('change', () => { dragging = false; showUI(); });

    // Single tap shows/hides the control bar; double-tap the middle to play/pause.
    // Double-tap the left/right side to seek SEEK_STEP seconds, then keep tapping the same side to add SEEK_STEP per tap; tapping the other side switches direction and restarts the count
    let lastTap = 0, tapTimer = null;
    let seekDir = 0, seekTotal = 0, seekBase = 0, seekTimer = null;
    const zoneOf = (e) => {
      const x = e.clientX / window.innerWidth;
      return x < 0.35 ? -1 : x > 0.65 ? 1 : 0;
    };
    function endSeek() {
      clearTimeout(seekTimer);
      seekDir = 0;
      seekTotal = 0;
      seekEl.classList.remove('vb-on');
    }
    function seekTap(dir) {
      if (seekDir !== dir) { seekDir = dir; seekTotal = 0; seekBase = v.currentTime; }
      seekTotal += SEEK_STEP;
      const dur = isFinite(v.duration) ? v.duration : Infinity;
      const t = Math.min(dur, Math.max(0, seekBase + dir * seekTotal));
      v.currentTime = t;
      seekEl.className = 'vb-seek vb-on ' + (dir < 0 ? 'vb-l' : 'vb-r');
      seekEl.innerHTML = `<b>${dir < 0 ? '◀◀' : '▶▶'}</b>${T.sec(seekTotal)}`;
      clearTimeout(seekTimer);
      seekTimer = setTimeout(endSeek, SEEK_WINDOW);
    }
    const handleTap = (e) => {
      const zone = zoneOf(e);
      if (seekDir !== 0) {
        if (zone !== 0) {           // Mid-streak: a single tap adds to the total
          clearTimeout(tapTimer);
          lastTap = 0;
          seekTap(zone);
          return;
        }
        endSeek();                  // Tapped the middle: end the streak and handle it as a normal tap
      }
      const now = Date.now();
      if (now - lastTap < 300) {
        clearTimeout(tapTimer);
        lastTap = 0;
        if (zone !== 0) seekTap(zone);
        else { v.paused ? v.play() : v.pause(); showUI(); }
      } else {
        lastTap = now;
        tapTimer = setTimeout(toggleUI, 300);
      }
    };

    // Press and swipe left/right anywhere: the progress bar follows your finger and seeks on release (or while swiping if SCRUB_LIVE is true)
    let scrubbing = false, down = null, scrubTarget = 0, lastLiveSeek = 0;
    const secPerWidth = () => Math.min(SWIPE_MAX, Math.max(SWIPE_MIN, v.duration * SWIPE_RATIO));
    function showScrub(t) {
      const delta = Math.round(t - down.startTime);
      scrubEl.innerHTML = `${delta < 0 ? '-' : '+'}${fmt(Math.abs(delta))}<small>${fmt(t)} / ${fmt(v.duration)}</small>`;
      scrubEl.classList.add('vb-on');
      range.value = Math.round((t / v.duration) * 1000);
      timeEl.textContent = `${fmt(t)} / ${fmt(v.duration)}`;
    }
    function endScrub(commit) {
      const was = scrubbing;
      if (was && commit) v.currentTime = scrubTarget;
      scrubbing = false;
      down = null;
      scrubEl.classList.remove('vb-on');
      if (was) { showUI(); sync(); }
    }
    gesture.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary || down) return;
      down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), ox: e.clientX, startTime: v.currentTime };
      try { gesture.setPointerCapture(e.pointerId); } catch (_) {}
    });
    gesture.addEventListener('pointermove', (e) => {
      if (!down || e.pointerId !== down.id) return;
      if (!scrubbing) {
        const dx0 = e.clientX - down.x, dy0 = e.clientY - down.y;
        if (!isFinite(v.duration) || v.duration <= 0) return;
        if (Math.abs(dx0) < 12 || Math.abs(dx0) < Math.abs(dy0) * 1.5) return;
        scrubbing = true;
        endSeek();
        down.ox = e.clientX;             // Measure from where the swipe starts, so the position doesn't jump at the beginning
        down.startTime = v.currentTime;
        clearTimeout(tapTimer);
        lastTap = 0;
        shown = true;                    // Keep the control bar visible while swiping
        clearTimeout(hideTimer);
        render();
      }
      const w = Math.max(window.innerWidth, 1);
      const t = down.startTime + ((e.clientX - down.ox) / w) * secPerWidth();
      scrubTarget = Math.round(Math.min(v.duration, Math.max(0, t)));
      showScrub(scrubTarget);
      if (SCRUB_LIVE) {
        const now = Date.now();
        if (now - lastLiveSeek > 200) { lastLiveSeek = now; v.currentTime = scrubTarget; }
      }
      e.preventDefault();
    });
    gesture.addEventListener('pointerup', (e) => {
      if (!down || e.pointerId !== down.id) return;
      e.stopPropagation();
      if (scrubbing) { endScrub(true); return; }
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = Date.now() - down.t < 500;
      down = null;
      if (moved < 10 && quick) handleTap(e);
    });
    gesture.addEventListener('pointercancel', () => { if (down) endScrub(false); });

    const sync = () => {
      playBtn.textContent = v.paused ? '▶︎' : '❚❚';
      if (!dragging && !scrubbing && isFinite(v.duration) && v.duration > 0) {
        range.value = Math.round((v.currentTime / v.duration) * 1000);
      }
      if (!scrubbing) timeEl.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`;
      if (full && v.controls) v.controls = false; // If the site re-enables native controls during fullscreen, turn them off again
    };
    ['timeupdate', 'play', 'pause', 'durationchange', 'loadedmetadata', 'seeked'].forEach((ev) => v.addEventListener(ev, sync));
    sync();

    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    iv = setInterval(() => {
      tick++;
      schedule();
      if (tick % 4 === 0) showTopLayer(); // If a dialog or similar enters the top layer, bring our UI back on top
    }, 500);
    update();
  }

  function scan() {
    document.querySelectorAll('video').forEach((v) => {
      if (done.has(v)) return;
      const r = v.getBoundingClientRect();
      if (r.width >= 200 && r.height >= 100) attach(v);
    });
  }

  let scanTimer = 0;
  const scheduleScan = () => {
    if (scanTimer) return;
    scanTimer = setTimeout(() => { scanTimer = 0; scan(); }, 400);
  };

  scan();
  new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(scan, 2000);
})();

/* 에브리티켓 · 인터랙션 */
(function () {
  'use strict';

  /* ---------- 모바일 메뉴 ---------- */
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('nav');

  hamburger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  });

  nav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- 헤더 그림자 · 맨 위로 버튼 ---------- */
  const header = document.getElementById('header');
  const toTop = document.getElementById('toTop');

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-stuck', y > 10);
    toTop.classList.toggle('is-show', y > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- 접수현황 필터 ---------- */
  const tabs = document.querySelectorAll('.tab');
  const shows = document.querySelectorAll('#showList .show');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      const filter = tab.dataset.filter;
      shows.forEach((show) => {
        const match = filter === 'all' || show.dataset.status === filter;
        show.classList.toggle('is-hidden', !match);
        if (match) {
          show.style.animation = 'none';
          void show.offsetWidth;
          show.style.animation = '';
        }
      });
    });
  });

  /* ---------- 성공내역 더 보기 ---------- */
  const moreBtn = document.getElementById('moreBtn');
  const hiddenSucc = document.querySelectorAll('#successGrid .succ.is-hidden');

  if (moreBtn) {
    let expanded = false;
    moreBtn.addEventListener('click', () => {
      expanded = !expanded;
      hiddenSucc.forEach((el) => el.classList.toggle('is-hidden', !expanded));
      moreBtn.classList.toggle('is-open', expanded);
      moreBtn.innerHTML = expanded
        ? '성공내역 접기 <i aria-hidden="true">▾</i>'
        : '성공내역 더 보기 <i aria-hidden="true">▾</i>';
    });
  }

  /* ---------- 누적 성공 건수 (매일 +1 × 13회, 8시~22시 랜덤) ---------- */
  const SUCCESS_BASE = 12731;
  const SUCCESS_PER_DAY = 13;
  const SUCCESS_START = Date.UTC(2026, 7, 21) - 9 * 3600 * 1000;
  const DAY_MS = 24 * 3600 * 1000;
  const WINDOW_START = 8 * 3600 * 1000;
  const WINDOW_END = 22 * 3600 * 1000;
  const MIN_GAP = 30 * 60 * 1000;

  const mulberry32 = (seed) => {
    let a = seed | 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const kstYmd = (dayStartMs) => {
    const kst = new Date(dayStartMs + 9 * 3600 * 1000);
    return kst.getUTCFullYear() * 10000 + (kst.getUTCMonth() + 1) * 100 + kst.getUTCDate();
  };

  const incrementOffsetsForDay = (ymd) => {
    const rand = mulberry32(ymd ^ 0x51ed);
    const span = WINDOW_END - WINDOW_START;
    const times = [];
    let guard = 0;
    while (times.length < SUCCESS_PER_DAY && guard < 5000) {
      guard += 1;
      const t = WINDOW_START + Math.floor(rand() * span);
      if (times.some((p) => Math.abs(p - t) < MIN_GAP)) continue;
      times.push(t);
    }
    if (times.length < SUCCESS_PER_DAY) {
      const slot = span / SUCCESS_PER_DAY;
      times.length = 0;
      for (let i = 0; i < SUCCESS_PER_DAY; i += 1) {
        times.push(Math.floor(WINDOW_START + i * slot + rand() * slot * 0.65));
      }
    }
    times.sort((a, b) => a - b);
    return times;
  };

  const successAt = (nowMs) => {
    if (nowMs < SUCCESS_START) {
      return { count: SUCCESS_BASE, nextAt: SUCCESS_START + incrementOffsetsForDay(kstYmd(SUCCESS_START))[0] };
    }
    const fullDays = Math.floor((nowMs - SUCCESS_START) / DAY_MS);
    const dayStart = SUCCESS_START + fullDays * DAY_MS;
    const times = incrementOffsetsForDay(kstYmd(dayStart));
    let today = 0;
    let nextAt = null;
    for (let i = 0; i < times.length; i += 1) {
      const at = dayStart + times[i];
      if (nowMs >= at) today += 1;
      else if (nextAt === null) nextAt = at;
    }
    if (nextAt === null) {
      const nextDay = dayStart + DAY_MS;
      nextAt = nextDay + incrementOffsetsForDay(kstYmd(nextDay))[0];
    }
    return { count: SUCCESS_BASE + fullDays * SUCCESS_PER_DAY + today, nextAt };
  };

  const formatCount = (n) => n.toLocaleString('ko-KR');

  const paintSuccess = (el, n) => {
    el.dataset.count = String(n);
    el.textContent = formatCount(n);
  };

  const spawnPlus = (el) => {
    const host = el.parentElement;
    if (!host) return;
    const plus = document.createElement('em');
    plus.className = 'stats__plus';
    plus.textContent = '+1';
    plus.setAttribute('aria-hidden', 'true');
    host.appendChild(plus);
    plus.addEventListener('animationend', () => plus.remove());
    window.setTimeout(() => plus.remove(), 1000);
  };

  const scheduleSuccessTick = (el) => {
    let shown = Number(el.dataset.count) || successAt(Date.now()).count;

    const bumpOne = (done) => {
      const from = shown;
      const to = shown + 1;
      if (reduceMotion) {
        shown = to;
        paintSuccess(el, to);
        if (done) done();
        return;
      }
      spawnPlus(el);
      el.classList.remove('is-bump');
      void el.offsetWidth;
      el.classList.add('is-bump');
      const start = performance.now();
      const dur = 480;
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = formatCount(Math.round(from + (to - from) * eased));
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          shown = to;
          paintSuccess(el, to);
          el.classList.remove('is-bump');
          if (done) done();
        }
      };
      requestAnimationFrame(step);
    };

    const catchUp = (target) => {
      if (shown >= target) {
        arm();
        return;
      }
      bumpOne(() => catchUp(target));
    };

    const arm = () => {
      const { nextAt } = successAt(Date.now());
      const wait = Math.max(400, nextAt - Date.now() + 40);
      window.setTimeout(onTick, Math.min(wait, 10 * 60 * 1000));
    };

    const onTick = () => {
      const { count } = successAt(Date.now());
      if (count > shown) catchUp(count);
      else arm();
    };

    arm();
  };

  /* ---------- 숫자 카운트업 ---------- */
  const counters = document.querySelectorAll('.stats strong');
  const liveSuccess = document.getElementById('successCount');
  if (liveSuccess) {
    liveSuccess.dataset.count = String(successAt(Date.now()).count);
  }

  const runCount = (el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const duration = 1200;
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('ko-KR') + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else if (el.dataset.liveSuccess) scheduleSuccessTick(el);
    };
    requestAnimationFrame(tick);
  };

  /* ---------- 스크롤 등장 효과 ---------- */
  const revealTargets = document.querySelectorAll(
    '.card, .step, .show, .succ, .why, .faq__item, .sec-head, .hero__copy, .hero__visual, .contact__card, .process__note'
  );
  revealTargets.forEach((el) => el.classList.add('reveal'));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const siblings = Array.from(el.parentElement.children).indexOf(el);
          el.style.transitionDelay = Math.min(siblings, 5) * 70 + 'ms';
          el.classList.add('is-in');
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealTargets.forEach((el) => io.observe(el));

    const statsIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          runCount(entry.target);
          statsIo.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => statsIo.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-in'));
    counters.forEach((el) => {
      el.textContent = Number(el.dataset.count).toLocaleString('ko-KR') + (el.dataset.suffix || '');
      if (el.dataset.liveSuccess) scheduleSuccessTick(el);
    });
  }

  /* ---------- 현재 섹션 메뉴 하이라이트 ---------- */
  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const navLinks = new Map();
  nav.querySelectorAll('a[href^="#"]').forEach((a) => navLinks.set(a.getAttribute('href').slice(1), a));

  if ('IntersectionObserver' in window) {
    const navIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((l) => l.classList.remove('is-active'));
          const link = navLinks.get(entry.target.id);
          if (link) link.classList.add('is-active');
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((s) => navIo.observe(s));
  }

  /* ---------- 카카오톡 문의 모달 ---------- */
  const kakaoModal = document.getElementById('kakaoModal');
  const kakaoCopyBtn = document.getElementById('kakaoCopyBtn');
  const kakaoId = (kakaoModal && kakaoModal.dataset.kakaoId) || 'ticket411';

  document.querySelectorAll('[data-kakao-id-text]').forEach((el) => {
    el.textContent = kakaoId;
  });

  const openKakaoModal = () => {
    if (!kakaoModal || typeof kakaoModal.showModal !== 'function') return;
    if (!kakaoModal.open) kakaoModal.showModal();
    const closeBtn = kakaoModal.querySelector('[data-kakao-close]');
    if (closeBtn) closeBtn.focus();
  };

  const closeKakaoModal = () => {
    if (kakaoModal && kakaoModal.open) kakaoModal.close();
  };

  document.querySelectorAll('[data-kakao-open]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openKakaoModal();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (el.tagName === 'A' || el.tagName === 'BUTTON') return;
      e.preventDefault();
      openKakaoModal();
    });
  });

  if (kakaoModal) {
    kakaoModal.querySelectorAll('[data-kakao-close]').forEach((btn) => {
      btn.addEventListener('click', closeKakaoModal);
    });
    kakaoModal.addEventListener('click', (e) => {
      if (!e.target.closest('.kakao-modal__panel')) closeKakaoModal();
    });
  }

  const copyKakaoId = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(kakaoId);
      ok = true;
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = kakaoId;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand('copy');
      ta.remove();
    }
    if (!kakaoCopyBtn) return;
    const prev = kakaoCopyBtn.textContent;
    kakaoCopyBtn.textContent = ok ? '아이디가 복사되었습니다' : '복사에 실패했습니다';
    kakaoCopyBtn.classList.toggle('is-copied', ok);
    window.setTimeout(() => {
      kakaoCopyBtn.textContent = prev;
      kakaoCopyBtn.classList.remove('is-copied');
    }, 1800);
  };

  if (kakaoCopyBtn) kakaoCopyBtn.addEventListener('click', copyKakaoId);

  const kakaoOpenBtn = document.getElementById('kakaoOpenBtn');
  const openKakaoApp = () => {
    const ua = navigator.userAgent || '';
    const android = /Android/i.test(ua);
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const scheme = 'kakaotalk://launch';

    if (android) {
      window.location.href = 'intent://launch#Intent;scheme=kakaotalk;package=com.kakao.talk;end';
      return;
    }
    if (ios) {
      window.location.href = scheme;
      return;
    }

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none';
    frame.src = scheme;
    document.body.appendChild(frame);
    window.setTimeout(() => frame.remove(), 2000);
  };
  if (kakaoOpenBtn) kakaoOpenBtn.addEventListener('click', openKakaoApp);
})();

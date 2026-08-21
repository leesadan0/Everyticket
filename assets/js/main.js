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

  /* ---------- 누적 성공 건수 (매일 13건, 랜덤 간격) ---------- */
  const SUCCESS_BASE = 12731;
  const SUCCESS_PER_DAY = 13;
  const SUCCESS_START = Date.UTC(2026, 7, 21) - 9 * 3600 * 1000;

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

  const incrementMinutesForDay = (ymd) => {
    const rand = mulberry32(ymd ^ 0x51ed);
    const startMin = 8 * 60;
    const endMin = 23 * 60 + 40;
    const slot = (endMin - startMin) / SUCCESS_PER_DAY;
    const times = [];
    for (let i = 0; i < SUCCESS_PER_DAY; i += 1) {
      times.push(Math.floor(startMin + i * slot + rand() * slot * 0.85));
    }
    return times;
  };

  const successAt = (nowMs) => {
    if (nowMs < SUCCESS_START) return { count: SUCCESS_BASE, nextAt: SUCCESS_START + incrementMinutesForDay(kstYmd(SUCCESS_START))[0] * 60000 };
    const dayMs = 24 * 3600 * 1000;
    const fullDays = Math.floor((nowMs - SUCCESS_START) / dayMs);
    const dayStart = SUCCESS_START + fullDays * dayMs;
    const times = incrementMinutesForDay(kstYmd(dayStart));
    const elapsedMin = (nowMs - dayStart) / 60000;
    let today = 0;
    let nextMin = null;
    for (let i = 0; i < times.length; i += 1) {
      if (elapsedMin >= times[i]) today += 1;
      else if (nextMin === null) nextMin = times[i];
    }
    let nextAt;
    if (nextMin !== null) {
      nextAt = dayStart + nextMin * 60000;
    } else {
      const nextDay = dayStart + dayMs;
      nextAt = nextDay + incrementMinutesForDay(kstYmd(nextDay))[0] * 60000;
    }
    return { count: SUCCESS_BASE + fullDays * SUCCESS_PER_DAY + today, nextAt };
  };

  const formatCount = (n) => n.toLocaleString('ko-KR');

  const paintSuccess = (el, n) => {
    el.dataset.count = String(n);
    el.textContent = formatCount(n);
  };

  const scheduleSuccessTick = (el) => {
    const { count, nextAt } = successAt(Date.now());
    paintSuccess(el, count);
    const wait = Math.max(1000, nextAt - Date.now() + 80);
    window.setTimeout(() => scheduleSuccessTick(el), Math.min(wait, 60 * 60 * 1000));
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

  /* ---------- 카카오톡 링크 미설정 안내 ---------- */
  document.querySelectorAll('[data-placeholder="kakao"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (el.getAttribute('href') === '#') {
        e.preventDefault();
        alert('카카오톡 채널 주소를 아직 연결하지 않았습니다.\nindex.html에서 data-placeholder="kakao" 링크의 href를 채널 URL로 바꿔주세요.');
      }
    });
  });
})();

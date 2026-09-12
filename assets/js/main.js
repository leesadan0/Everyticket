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

  /* ---------- 섹션 앵커 이동 ---------- */
  const ANCHOR_GAP = 12;

  /* transform(등장 효과)에 영향받지 않는 문서 기준 위치 */
  const docTop = (el) => {
    let y = 0;
    for (let node = el; node; node = node.offsetParent) y += node.offsetTop;
    return y;
  };

  const scrollToAnchor = (id) => {
    if (!id || id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    }
    const sec = document.getElementById(id);
    if (!sec) return false;
    const mark = sec.querySelector('.sec-head, .contact__copy') || sec;
    const headerH = header ? header.getBoundingClientRect().height : 74;
    const top = docTop(mark) - headerH - ANCHOR_GAP;
    window.scrollTo({ top: Math.max(0, Math.round(top)), behavior: 'smooth' });
    return true;
  };

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || link.classList.contains('skip-link')) return;
    if (link.hasAttribute('data-kakao-open')) return;
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    const id = decodeURIComponent(href.slice(1));
    if (id !== 'top' && !document.getElementById(id)) return;
    e.preventDefault();
    scrollToAnchor(id);
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    else location.hash = id;
  });

  if (location.hash) {
    const landing = () => scrollToAnchor(decodeURIComponent(location.hash.slice(1)));
    window.setTimeout(landing, 0);
    window.addEventListener('load', () => window.setTimeout(landing, 0), { once: true });
  }

  /* ---------- 페이지 ---------- */
  const SHOW_PAGE_SIZE = 9;
  const PROOF_PAGE_SIZE = 6;
  const SUCC_PAGE_SIZE = 9;

  const pageNums = (cur, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set([1, total, cur - 1, cur, cur + 1]);
    if (cur <= 3) [2, 3, 4].forEach((n) => set.add(n));
    if (cur >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => set.add(n));
    return Array.from(set).filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  };

  const paintPager = (nav, page, total, go) => {
    if (!nav) return;
    if (total <= 1) {
      nav.hidden = true;
      nav.innerHTML = '';
      return;
    }
    nav.hidden = false;
    const nums = pageNums(page, total);
    let html = '<button type="button" class="pager__btn" data-go="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + ' aria-label="이전 페이지">‹</button>';
    let prev = 0;
    nums.forEach((n) => {
      if (prev && n > prev + 1) html += '<span class="pager__gap" aria-hidden="true">…</span>';
      html += '<button type="button" class="pager__btn' + (n === page ? ' is-active' : '') + '" data-go="' + n + '"' + (n === page ? ' aria-current="page"' : '') + ' aria-label="' + n + '페이지">' + n + '</button>';
      prev = n;
    });
    html += '<button type="button" class="pager__btn" data-go="' + (page + 1) + '"' + (page >= total ? ' disabled' : '') + ' aria-label="다음 페이지">›</button>';
    nav.innerHTML = html;
    nav.querySelectorAll('[data-go]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const p = Number(btn.getAttribute('data-go'));
        if (!p || p === page) return;
        go(p);
      });
    });
  };

  const scrollSection = (id) => scrollToAnchor(id);

  /* ---------- 접수현황 필터 ---------- */
  const tabs = document.querySelectorAll('#status .tab');
  const showList = document.getElementById('showList');
  const showPager = document.getElementById('showPager');
  const showSearch = document.getElementById('showSearch');
  const showEmpty = document.getElementById('showEmpty');
  let showPage = 1;

  const normQ = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, '');
  const textMatch = (el, q) => {
    if (!q) return true;
    const t = String((el && el.textContent) || '').toLowerCase().replace(/\s+/g, '');
    return t.indexOf(q) !== -1;
  };
  const activeShowFilter = () => {
    const active = document.querySelector('#status .tab.is-active');
    return (active && active.dataset.filter) || 'all';
  };

  const applyShowFilter = (filter) => {
    if (!showList) return;
    const q = normQ(showSearch && showSearch.value);
    const matches = [];
    showList.querySelectorAll('.show').forEach((show) => {
      const match = (filter === 'all' || show.dataset.status === filter) && textMatch(show, q);
      show.classList.toggle('is-hidden', !match);
      if (match) matches.push(show);
    });
    const totalPages = Math.max(1, Math.ceil(matches.length / SHOW_PAGE_SIZE));
    if (showPage > totalPages) showPage = totalPages;
    const start = (showPage - 1) * SHOW_PAGE_SIZE;
    matches.forEach((show, i) => {
      show.classList.toggle('is-folded', i < start || i >= start + SHOW_PAGE_SIZE);
    });
    if (showEmpty) showEmpty.hidden = matches.length > 0;
    paintPager(showPager, showPage, totalPages, (p) => {
      showPage = p;
      applyShowFilter(filter);
      scrollSection('status');
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      showPage = 1;
      applyShowFilter(tab.dataset.filter);
    });
  });
  if (showSearch) {
    showSearch.addEventListener('input', () => {
      showPage = 1;
      applyShowFilter(activeShowFilter());
    });
  }

  const features = window.ET_FEATURES || {};
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const mdLabel = (iso) => {
    const p = String(iso || '').split('-');
    if (p.length < 3) return '';
    return Number(p[1]) + '.' + Number(p[2]);
  };

  const dateRangeLabel = (s) => {
    if (!s || !s.date) return '';
    if (s.endDate && s.endDate !== s.date) return mdLabel(s.date) + '-' + mdLabel(s.endDate);
    return mdLabel(s.date);
  };

  const placeOf = (s) => {
    const meta = String((s && s.meta) || '');
    const first = meta.split(' · ')[0].trim();
    if (!first || /^티켓오픈/.test(first) || /^티켓팅/.test(first)) return '';
    return first;
  };

  const formatShowMetaHtml = (s) => {
    const place = escapeHtml(placeOf(s));
    const o = parseOpenIso(s);
    const range = dateRangeLabel(s);
    const bits = [];
    if (place) bits.push('<span class="show__place">' + place + '</span>');
    const dates = [];
    if (o) {
      dates.push('<span class="show__when show__when--open"><span class="show__when-k">티켓팅</span><b>' + escapeHtml(mdLabel(o)) + '</b></span>');
    }
    if (range) {
      dates.push('<span class="show__when show__when--play"><span class="show__when-k">공연일</span><b>' + escapeHtml(range) + '</b></span>');
    }
    if (dates.length) bits.push('<span class="show__dates">' + dates.join('') + '</span>');
    if (!bits.length) return escapeHtml(String((s && s.meta) || ''));
    return bits.join('');
  };

  const isSoonShow = (s, today) => {
    const o = parseOpenIso(s);
    if (!o) return s.kind === 'soon' || s.status === 'soon';
    const openAt = String(s.openAt || '').trim();
    if (openAt) {
      const t = Date.parse(openAt);
      if (!isNaN(t)) return t > Date.now();
    }
    return o > today;
  };

  const isStartedShow = (s, today) => {
    const o = parseOpenIso(s);
    if (o && isSoonShow(s, today)) return false;
    const last = String((s && (s.endDate || s.date)) || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(last)) return false;
    if (o && last < o) return false;
    const p = last.split('-').map(Number);
    const prevMs = Date.UTC(p[0], p[1] - 1, p[2]) - 86400000;
    const prev = new Date(prevMs);
    const pad = (n) => String(n).padStart(2, '0');
    const prevDay = prev.getUTCFullYear() + '-' + pad(prev.getUTCMonth() + 1) + '-' + pad(prev.getUTCDate());
    const cutoff = Date.parse(prevDay + 'T21:00:00+09:00');
    if (isNaN(cutoff)) return false;
    return Date.now() >= cutoff;
  };

  const loadAutoShows = () => {
    if (!features.autoShows) return;
    if (!showList && !document.getElementById('successGrid')) return;
    fetch('assets/data/shows.json?v=38')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const pad = (n) => String(n).padStart(2, '0');
        const today = start.getFullYear() + '-' + pad(start.getMonth() + 1) + '-' + pad(start.getDate());
        const raw = Array.isArray(data.shows) ? data.shows : (data.shows && data.shows.value) || [];
        const seenKey = {};
        const showKey = (s) => {
          const t = String(s.title || '').toLowerCase()
            .replace(/[〈〉<>\[］\[\]「」『』［］]/g, ' ')
            .replace(/가을냄새|with friends|추가 오픈 안내|티켓오픈 안내|티켓 오픈 안내/g, ' ')
            .replace(/\s+/g, ' ').trim();
          return t + '|' + String(s.date || '');
        };
        const popular = raw.filter((s) => {
          if (!s || !s.title) return false;
          if (s.status === 'done') return false;
          if (/뮤지컬|연극|전시|오페라|토크쇼|토크콘서트|토크\s*콘서트|노콘쇼|토크\s*&|뮤직 토크|발레페스티벌|수급|물량|일정 공개/.test(s.title)) return false;
          if (!String(s.poster || '').trim()) return false;
          if (!s.open && !parseOpenIso(s)) return false;
          const soon = isSoonShow(s, today);
          if (!s.date && !soon) return false;
          const view = Number(s.view);
          const hot = s.isHot === true || s.isHot === 'true' || s.isHot === 1;
          if (!hot && !isNaN(view) && view > 0 && view < 500) return false;
          if (isStartedShow(s, today)) return false;
          const k = showKey(s);
          if (seenKey[k]) return false;
          seenKey[k] = true;
          return true;
        });
        const opened = popular.filter((s) => !isSoonShow(s, today) && s.date).sort((a, b) => {
          return (a.date || '9999').localeCompare(b.date || '9999') || a.title.localeCompare(b.title, 'ko');
        });
        const soonList = popular.filter((s) => isSoonShow(s, today)).sort((a, b) => {
          const ao = parseOpenIso(a) || a.date || '9999';
          const bo = parseOpenIso(b) || b.date || '9999';
          return ao.localeCompare(bo) || (a.date || '').localeCompare(b.date || '') || a.title.localeCompare(b.title, 'ko');
        });
        const soonDated = soonList.filter((s) => s.date);
        renderSuccess(opened.concat(soonList));
        const ordered = opened.concat(soonDated);
        if (!showList || !ordered.length) return;
        const cardHtml = (s, i) => {
          const soon = isSoonShow(s, today);
          const title = escapeHtml(s.title);
          const meta = formatShowMetaHtml(s);
          const rawTitle = String(s.title).replace(/"/g, '&quot;');
          let poster = String(s.poster || '').trim();
          if (poster.indexOf('//') === 0) poster = 'https:' + poster;
          const posterHtml = poster
            ? '<div class="show__poster-wrap"><img class="show__poster" src="' + escapeHtml(poster) + '" alt="" loading="lazy" onerror="this.onerror=null;this.remove()"></div>'
            : '';
          const badge = soon
            ? '<span class="show__badge show__badge--soon">오픈예정</span>'
            : '<span class="show__badge show__badge--open">접수중</span>';
          return (
            '<article class="show' + (soon ? ' show--soon' : '') + '" data-status="' + (soon ? 'soon' : 'open') + '">' +
              posterHtml +
              '<div class="show__body">' +
                badge +
                '<h3>' + title + '</h3>' +
                '<p class="show__meta">' + meta + '</p>' +
                '<a class="show__btn" href="#contact" data-kakao-open data-show-title="' + rawTitle + '">대행 신청</a>' +
              '</div>' +
            '</article>'
          );
        };
        showList.innerHTML = ordered.map(cardHtml).join('');
        showPage = 1;
        const active = document.querySelector('#status .tab.is-active');
        applyShowFilter((active && active.dataset.filter) || 'all');
      })
      .catch(() => {
        const active = document.querySelector('#status .tab.is-active');
        applyShowFilter((active && active.dataset.filter) || 'all');
      });
  };
  if (showList) {
    const active = document.querySelector('#status .tab.is-active');
    applyShowFilter((active && active.dataset.filter) || 'all');
  }

  /* ---------- 고객 후기 페이지 ---------- */
  const succPager = document.getElementById('succPager');
  const succSearch = document.getElementById('succSearch');
  const succEmpty = document.getElementById('succEmpty');
  const succTabs = document.querySelectorAll('#succTabs .tab');
  let succPage = 1;
  const activeSuccKind = () => {
    const active = document.querySelector('#succTabs .tab.is-active');
    return (active && active.dataset.kind) || 'all';
  };
  const paintSuccPage = (scroll) => {
    const grid = document.getElementById('successGrid');
    if (!grid) return;
    const q = normQ(succSearch && succSearch.value);
    const kind = activeSuccKind();
    const all = Array.from(grid.querySelectorAll('.succ'));
    const matches = all.filter((el) => {
      const k = el.getAttribute('data-kind') || (el.classList.contains('succ--soon') ? 'delta' : 'move');
      return (kind === 'all' || k === kind) && textMatch(el, q);
    });
    all.forEach((el) => {
      el.classList.toggle('is-hidden', matches.indexOf(el) < 0);
    });
    const totalPages = Math.max(1, Math.ceil(matches.length / SUCC_PAGE_SIZE));
    if (succPage > totalPages) succPage = totalPages;
    const start = (succPage - 1) * SUCC_PAGE_SIZE;
    matches.forEach((el, i) => {
      el.classList.toggle('is-hidden', i < start || i >= start + SUCC_PAGE_SIZE);
    });
    if (succEmpty) succEmpty.hidden = matches.length > 0;
    paintPager(succPager, succPage, totalPages, (p) => {
      succPage = p;
      paintSuccPage(true);
    });
    if (scroll) scrollSection('success');
  };
  succTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      succTabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      succPage = 1;
      paintSuccPage(false);
    });
  });
  if (succSearch) {
    succSearch.addEventListener('input', () => {
      succPage = 1;
      paintSuccPage(false);
    });
  }

  /* ---------- 예매 인증 페이지 · 크게 보기 ---------- */
  const proofPager = document.getElementById('proofPager');
  const proofsGrid = document.getElementById('proofsGrid');
  let proofPage = 1;
  const paintProofPage = (scroll) => {
    const grid = proofsGrid;
    if (!grid) return;
    const items = Array.from(grid.querySelectorAll('.proof'));
    const totalPages = Math.max(1, Math.ceil(items.length / PROOF_PAGE_SIZE));
    if (proofPage > totalPages) proofPage = totalPages;
    const start = (proofPage - 1) * PROOF_PAGE_SIZE;
    items.forEach((el, i) => {
      el.classList.toggle('is-hidden', i < start || i >= start + PROOF_PAGE_SIZE);
    });
    paintPager(proofPager, proofPage, totalPages, (p) => {
      proofPage = p;
      paintProofPage(true);
    });
    if (scroll) scrollSection('proofs');
  };

  const proofModal = document.getElementById('proofModal');
  const proofModalImg = document.getElementById('proofModalImg');
  const proofModalTitle = document.getElementById('proofModalTitle');
  const openProof = (src, title) => {
    if (!proofModal || !proofModalImg) return;
    proofModalImg.src = src;
    proofModalImg.alt = (title || '예매완료') + ' 화면';
    if (proofModalTitle) proofModalTitle.textContent = title || '예매완료';
    if (typeof proofModal.showModal === 'function') proofModal.showModal();
  };
  const closeProof = () => {
    if (proofModal && proofModal.open) proofModal.close();
  };
  if (proofsGrid) {
    proofsGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.proof[data-proof]');
      if (!btn) return;
      openProof(btn.dataset.proof, btn.dataset.proofTitle);
    });
  }
  if (proofModal) {
    proofModal.querySelectorAll('[data-proof-close]').forEach((el) => {
      el.addEventListener('click', closeProof);
    });
    proofModal.addEventListener('click', (e) => {
      if (e.target === proofModal) closeProof();
    });
  }

  const loadProofs = () => {
    if (!proofsGrid) return;
    fetch('assets/data/proofs.json?v=3')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const raw = Array.isArray(data.proofs) ? data.proofs : [];
        const items = raw.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        proofsGrid.innerHTML = items.map((p) => {
          const src = escapeHtml(p.src || '');
          const title = escapeHtml(p.title || '');
          const meta = escapeHtml(p.meta || '');
          const seat = escapeHtml(p.seat || '');
          return (
            '<button class="proof" type="button" data-proof="' + src + '" data-proof-title="' + title + '">' +
              '<span class="proof__img"><img src="' + src + '" alt="' + title + ' 예매완료" loading="lazy"></span>' +
              '<span class="proof__body">' +
                '<span class="proof__name">' + title + '</span>' +
                '<span class="proof__meta">' + meta + '</span>' +
                '<span class="proof__seat">' + seat + '</span>' +
              '</span>' +
            '</button>'
          );
        }).join('');
        proofPage = 1;
        paintProofPage();
      })
      .catch(() => {
        paintProofPage();
      });
  };
  loadProofs();

  const reviewRng = (seed) => {
    let a = seed | 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const pad2 = (n) => String(n).padStart(2, '0');
  const ymdDot = (y, m, d) => y + '.' + pad2(m) + '.' + pad2(d);
  const addDays = (y, m, d, plus) => {
    const dt = new Date(Date.UTC(y, m - 1, d + plus));
    return ymdDot(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  };
  const daysSpan = (y1, m1, d1, y2, m2, d2) => {
    const a = Date.UTC(y1, m1 - 1, d1);
    const b = Date.UTC(y2, m2 - 1, d2);
    return Math.round((b - a) / 86400000);
  };

  const SUR = [
    '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍',
    '유', '고', '문', '손', '양', '배', '백', '허', '남', '심', '노', '하', '곽', '성', '차', '주', '우', '구', '나', '민',
    '진', '지', '엄', '채', '원', '천', '방', '공', '현', '함', '변', '염', '여', '추', '도', '소', '석', '선', '설', '마',
    '길', '연', '위', '표', '명', '기', '반', '왕', '온', '탁', '국', '라', '봉', '피', '두', '사', '어', '복', '목', '제'
  ];
  const GIVEN = [
    '은', '아', '현', '린', '우', '솔', '진', '서', '호', '민', '연', '희', '영', '준', '지', '혁', '윤', '찬', '태', '별',
    '재', '원', '석', '훈', '수', '경', '나', '예', '하', '람', '도', '겸', '시', '우', '빈', '율', '혜', '주', '담',
    '승', '미', '정', '환', '규', '성', '해', '다', '채', '유', '강', '솔', '빛', '결', '온', '새', '이', '루', '건', '휘'
  ];
  const makeRotator = (rng, pool) => {
    let deck = [];
    let idx = 0;
    const refill = () => {
      deck = pool.slice();
      for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        const t = deck[i];
        deck[i] = deck[j];
        deck[j] = t;
      }
      idx = 0;
    };
    refill();
    return () => {
      if (idx >= deck.length) refill();
      return deck[idx++];
    };
  };
  const reviewKeySeed = (key) => key.split('').reduce((h, ch) => (h * 33 + ch.charCodeAt(0)) | 0, 7);
  const EMO = ['', ' ㅠㅠ', ' ㅎㅎ', ' ㅋㅋ', ' ㅠ', ' 🥹', ' 😭', ' ✨', ' 🙏', ' 👍', ' ㅠㅠㅠ', ' 😊', ' ❤️'];
  const CARD_MOVE = [
    '오픈 놓쳐서 속상했는데 친절하게 자리까지 챙겨주셨어요 ㅠㅠ 진짜 감사합니다 ✨',
    '아옮이 처음이라 많이 긴장했는데 예매내역부터 천천히 보여주셔서 안심하고 맡겼어요 🙏',
    '친구랑 연석으로 받고 싶다고 했더니 되는 자리만 골라서 알려주셨어요 너무 고마워요 😭',
    '사기일까 봐 망설였는데 워터마크 있는 예매내역을 먼저 보내주셔서 바로 진행했어요 ㅎㅎ',
    '아이디 넘기기 전에 하나하나 설명해주셔서 헤매지 않고 끝났어요 덕분에 마음 놓입니다 🥹',
    '오픈 끝난 자리였는데도 구해져서 놀랐어요 설명도 부드럽고 인계도 빨랐습니다 👍',
    '두 장 부탁드렸는데 붙어 있는 자리로 와서 친구랑 같이 갈 수 있게 됐어요 ㅋㅋ 감사해요',
    '당일 오전에 급하게 문의했는데도 점심때 다 끝나서 출근길에 울뻔했어요 🙏',
    '가능한 좌석만 솔직하게 말씀해 주셔서 믿음이 갔어요 다음에도 여기로 할게요 ✨',
    '처음인데도 부담 없이 물어보게 친절하셨어요 자리 그대로 넘어와서 완전 안심됨 🥹'
  ];
  const CARD_DELTA = [
    '티켓팅만 생각하면 손이 떨려서 미리 맡겼어요 아직 오픈 전인데도 마음이 한결 편합니다 ㅠ',
    '출근이랑 선예매가 겹쳐서 제가 못 넣을 것 같아 카톡 보냈어요 친절하게 받아주셔서 감사해요 😭',
    '인기 많아서 저 자신을 못 믿겠더라고요 회차만 적어 보냈는데 천천히 안내해 주셨어요 ㅎㅎ',
    '선예매는 아직인데 일단 걸어두니까 밤에 덜 뒤척여요 미리 받아주셔서 고마워요 🙏',
    '손 느린 거 알아서 오픈 전에 맡겼어요 혼나면 어쩌나 했는데 편하게 받아주셨습니다 ㅠㅠ',
    '바빠서 연습할 시간도 없었는데 아는 것만 적어도 된다고 하셔서 진짜 편했어요 ✨',
    '야근이 많아서 오픈 날 폰을 볼 자신이 없었어요 미리 걸어두니 한숨 놓입니다 ㅠ',
    '시험기간이라 그 시간에 공부해야 해서요 친절하게 일정만 받아주셔서 감사합니다 😭',
    '알람 맞춰놔도 꼭 잠들어서 이번엔 그냥 맡겼어요 받아주시니까 마음이 놓여요 ㅋㅋ',
    '아이 등원이랑 겹쳐서 시간 없어서 문의했어요 부담 없이 받아주셔서 너무 고마워요 🥹'
  ];
  const DELTA = [
    '티켓팅만 생각하면 손이 떨려서 미리 맡겼어요. 아직 오픈 전인데도 천천히 받아주셔서 마음이 한결 편합니다.',
    '저번에 혼자 넣다가 떨어져서 속상했거든요. 이번엔 미리 카톡 보냈더니 회차만 적어도 된다고 친절하게 알려주셨어요.',
    '출근이랑 선예매 시간이 겹쳐서 제가 못 넣어요. 그래도 부담 없이 받아주셔서 너무 감사했어요.',
    '야근 많은 달이라 오픈 날 폰을 볼 자신이 없었어요. 미리 걸어두니까 밤에 덜 뒤척입니다.',
    '아이 등원이랑 겹쳐서 시간이 없더라고요. 아는 것만 적어도 된다고 하셔서 편하게 맡겼어요.',
    '인기가 너무 많아서 저 자신을 못 믿겠어요. 그래도 혼내지 않고 일정만 받아주셔서 고마웠습니다.',
    '예매 창만 보면 뭐부터 눌러야 할지 모르겠더라고요. 천천히 순서 알려주셔서 안심이 됐어요.',
    '시험기간이라 그 시간에 공부해야 해서요. 미리 받아주시니까 공부할 마음이 좀 생겼어요.',
    '지방 출장 중일 거라 와이파이도 불안해서요. 그래도 미리 걸어둘 수 있어서 다행이에요.',
    '친구 표까지 제가 넣기로 했는데 둘 다 못 넣을 것 같아 겁났어요. 같이 맡겨도 된다고 하셔서 감사했습니다.',
    '티켓팅이 처음이라 연습하다 포기하고 문의했어요. 처음이어도 괜찮다고 해주셔서 울뻔했어요.',
    '알람 맞춰놔도 꼭 잠들어서 이번엔 그냥 맡겼어요. 받아주시니까 마음이 놓입니다 ㅎㅎ',
    '폰이 느려서 오픈 때 저 혼자면 큰일 날 것 같았어요. 미리 말씀드리니 편하게 받아주셨어요.',
    '회의 들어가면 카톡도 못 보거든요. 미리 걸어둬도 된다고 하셔서 진짜 편했어요.',
    '사람 많을 공연이라 제가 못 이길 것 같아서요. 그래도 회차만 적어 보내니 친절하게 받아주셨습니다.',
    '손 느린 거 알아서 오픈 전에 맡겼어요. 혼나면 어쩌나 했는데 편하게 대해주셔서 감사합니다.',
    '저번 오픈 때 대기열에서 울었거든요. 이번엔 혼자 안 해보고 싶었는데 받아주셔서 너무 고마워요.',
    '바빠서 예매 연습할 시간도 없었어요. 회차만 적어도 된다고 하셔서 마음이 놓였습니다.',
    '새벽에 선예매면 전 무조건 늦잠을 자요. 그래서 미리 맡겼는데 웃으면서 받아주셨어요.',
    '운전 중에 오픈이면 절대 못 넣어요. 미리 카톡 보내니까 일정만 확인하고 받아주셨습니다.',
    '예매처 앱이 저한테만 튕기는 느낌이라 못 믿겠어요. 그래도 미리 걸어두니 한숨 놓여요.',
    '가족 행사가 있어서 오픈 날 자리를 비워요. 미리 맡겨도 된다고 하셔서 감사했어요.',
    '저 클릭 전쟁 체질이 아니에요. 무서워서 맡겼는데 부담 없이 받아주셔서 고마웠습니다.',
    '동시접속만 생각하면 심장이 뛰어서요. 미리 문의했더니 천천히 안내해 주셔서 안심됐어요.',
    '알바 시간이라 선예매를 못 빠져나와요. 그래도 미리 받아주셔서 마음이 편합니다.',
    '인기 콘서트는 제가 넣으면 맨날 끝자리라서요. 이번엔 저를 안 믿기로 하고 맡겼어요.',
    '아직 오픈 전인데 일단 걸어두니까 밤에 좀 덜 뒤척여요. 받아주셔서 감사합니다.',
    '제가 느린 거 친구도 알아서 대행 쓰자고 했거든요. 둘이 같이 맡겨도 된다고 하셔서 좋았어요.',
    '병원 예약이 선예매랑 겹쳐서 저 혼자면 포기였을 거예요. 미리 받아주셔서 정말 고마워요.',
    '해외라 시차 때문에 못 넣어요. 그래도 미리 걸어둘 수 있어서 마음이 놓입니다.',
    '예매 버튼 그 몇 초가 저한테는 너무 무서워요. 미리 말씀드리니 편하게 대해주셨어요.',
    '대기열 상상만 해도 숨이 막혀서 미리 문의했어요. 친절하게 일정만 받아주셔서 감사했습니다.',
    '점심시간에 선예매면 밥 먹다 놓치거든요. 그래서 미리 맡겼는데 웃으면서 받아주셨어요.',
    '저 멀티태스킹이 안 돼요. 오픈 때 혼자면 분명 헤맬 것 같아서 미리 부탁드렸습니다.',
    '걸어두니까 할 일 하나 끝난 느낌이라 편해요. 받아주셔서 너무 감사합니다.',
    '제가 넣은 표는 항상 떨어져서 이번엔 저를 안 믿기로 했어요. 그래도 편하게 받아주셨습니다.',
    '수업 중간에 오픈이라 교수님 앞에서 못 넣어요. 미리 맡겨도 된다고 하셔서 고마웠어요.',
    '와이파이 약한 원룸이라 오픈 날 저 혼자면 불안했거든요. 미리 걸어두니 마음이 놓여요.',
    '바쁜 한 주라 티켓팅 준비할 정신도 없었어요. 아는 것만 적어도 된다고 하셔서 편했습니다.',
    '손 땀 나서 폰이 미끄러워요. 진짜 저 못 믿겠는데 혼내지 않고 받아주셔서 울었어요.',
    '인기 많은 회차만 가고 싶은데 저 실력으론 불안해서요. 그래도 회차만 적어 보내니 친절하셨어요.',
    '제가 예매하면 친구 표까지 망칠까 봐 맡겼어요. 같이 맡겨도 된다고 하셔서 안심됐습니다.',
    '알람 다섯 개 맞춰도 전 못 일어나요 ㅋㅋ 그래서 미리 맡겼는데 편하게 받아주셨어요.',
    '선예매 창 연습하다 포기했어요. 처음이어도 괜찮다고 해주셔서 너무 고마웠습니다.',
    '저 둔해서 미리 맡기는 게 맞다고 생각했어요. 받아주시니까 마음이 한결 편합니다.',
    '혼자 하면 떨어질 것 같아 겁났어요. 그래도 미리 받아주셔서 감사합니다.',
    '출장 기차 안에서 넣을 자신이 없어서요. 미리 카톡 보내니까 일정만 확인하고 받아주셨어요.',
    '아이 낮잠 시간에 선예매면 전 무조건 못 해요. 미리 맡겨도 된다고 하셔서 진짜 편했어요.',
    '저번엔 카드 오류로 날려서 이번엔 안 해보고 싶었어요. 받아주셔서 마음이 놓입니다.',
    '바빠서 예매처 로그인조차 안 해 봤어요. 회차만 말해도 된다고 하셔서 감사했습니다.',
    '심장이 약해서 대기열 보면 안 돼요. 미리 문의했더니 천천히 안내해 주셔서 고마워요.',
    '인기 공연일수록 제 손이 더 꼬여요. 그래서 미리 맡겼는데 부담 없이 받아주셨습니다.',
    '오픈 날 면접이 있어서 폰을 만질 수가 없어요. 미리 걸어두니까 한숨 놓였어요.',
    '아직 결과는 없는 거 알지만 걸어두니까 마음은 편해요. 받아주셔서 감사합니다.',
    '인기 많아서 저 실력으로는 어림없다고 생각했어요. 그래도 회차만 적어도 된다고 하셔서 좋았습니다.',
    '선예매는 아직인데 바빠서 미리 카톡 보냈어요. 친절하게 받아주셔서 너무 고마워요.',
    '회차만 적고 맡겼어요. 제가 넣을 자신이 없었는데 편하게 대해주셔서 안심됐습니다.',
    '친구들이 나보고 손 느리다고 해서 그냥 맡겼어요. 웃으면서 받아주셔서 기분이 좋았습니다.',
    '오픈 전에 걸어두면 당일엔 제가 없어도 된다고 하셔서 그렇게 했어요. 미리 받아주셔서 감사합니다.',
    '저 못해서 맡긴 거예요. 혼자 하면 또 떨어질 것 같았는데 혼내지 않고 받아주셔서 울뻔했어요.'
  ];
  const MOVE = [
    '오픈을 놓쳐서 속상했는데 양도로 구해 주셨어요. 예매내역을 먼저 보여주셔서 안심하고 진행했습니다. 정말 감사합니다.',
    '아이디 넘기는 게 처음이라 많이 긴장했어요. 로그인 전에 인증부터 천천히 해주셔서 마음 놓고 맡겼습니다.',
    '친구랑 연석으로 받고 싶다고 했더니 되는 자리만 골라서 알려주셨어요. 억지로 권하지 않아서 더 믿음이 갔습니다.',
    '예매화면을 가리고 보여주셔서 부담이 덜했어요. 설명도 부드러워서 그냥 편안하게 진행했습니다.',
    '오픈 끝난 자리라 양도로 했는데 인계가 정말 친절했어요. 다음에도 오픈 놓치면 여기로 할게요.',
    '아이디 옮겨주신 뒤에 바로 로그인까지 확인해 주셨어요. 혼자였으면 헤맸을 텐데 너무 고마웠습니다.',
    '가능한 좌석만 솔직하게 말씀해 주셔서 믿음이 갔어요. 없는 자리는 없다고 해주셔서 오히려 좋았습니다.',
    '두 장 부탁드렸는데 붙어 있는 자리로 와서 친구랑 같이 갈 수 있게 됐어요. 진짜 감사합니다 ㅎㅎ',
    '워터마크 찍힌 예매내역을 보고 나서 진행했어요. 사기일까 봐 망설였는데 먼저 보여주셔서 안심됐습니다.',
    '중간중간 상황도 부드럽게 공유해 주셔서 답답하지 않았어요. 기다려도 불안하지 않았습니다.',
    '자리 그대로 받아서 일정만 맞추면 됐어요. 설명도 차근차근 해주셔서 첫 이용인데도 편했습니다.',
    '오픈 놓쳐서 알아봤는데 되는 자리만 친절하게 안내해 주셨어요. 없는 거는 없다고 하셔서 좋았습니다.',
    '계정 넘기기 전에 예매 확인부터 해서 사기 느낌이 전혀 없었어요. 덕분에 마음 놓고 진행했습니다.',
    '비밀번호 바꾸는 것도 같이 봐주셔서 헤매지 않았어요. 끝까지 친절하셔서 감사했습니다.',
    '좌석 인증을 받고 나서 아이디를 넘겼어요. 순서가 분명해서 처음인데도 따라가기 쉬웠습니다.',
    '오픈 지난 티켓이라 양도만 된다고 하셔서 그대로 했어요. 솔직하게 말씀해 주셔서 오히려 믿음이 갔어요.',
    '아이디 인계가 몇 분 안 걸렸어요. 급했는데도 짜증 내지 않고 부드럽게 해주셔서 고마웠습니다.',
    '설명이 짧으면서도 따뜻해서 따라가기 쉬웠어요. 모르는 거 물어봐도 편하게 답해 주셨습니다.',
    '옮기고 나서 예매내역이 제 계정으로 넘어온 거 확인했어요. 그 순간 진짜 안심됐습니다.',
    '단계마다 카톡을 친절하게 주셔서 헤매지 않았어요. 혼자 하면 분명 헷갈렸을 거예요.',
    '오픈 끝나고 남은 자리 알아봐 달라고 했는데 되는 날짜부터 찍어주셨어요. 너무 고마웠습니다.',
    '개인정보 걱정이 많았는데 필요한 것만 받으셨어요. 그 점이 제일 마음에 들었습니다.',
    '한 장 더 구해 달라고 했더니 기존 예매랑 날짜까지 맞춰주셨어요. 세심하게 봐주셔서 감사합니다.',
    '현장 수령 걱정이 있었는데 어떻게 하면 되는지 천천히 알려주셔서 마음이 놓였어요.',
    '이름만 바꾸는 게 아니라 아이디를 통째로 넘기는 거라 편했어요. 처음부터 쉽게 설명해 주셨습니다.',
    '오픈에 실패한 뒤로 양도만 알아봤는데 된다고 하셔서 바로 맡겼어요. 받아주셔서 정말 고마워요.',
    '좌석 사진을 먼저 주시고 원하면 하자고 하셨어요. 강요하지 않아서 더 믿음이 갔습니다.',
    '아이디 옮기고 나서 제가 비밀번호를 바꾸니까 끝났어요. 마지막까지 확인해 주셔서 안심됐습니다.',
    '후기 보고 왔는데 인증이 진짜 먼저더라고요. 그래서 망설이지 않고 진행할 수 있었어요.',
    '연석으로 받았어요. 일정도 딱 맞아서 친구랑 같이 가게 됐습니다. 너무 감사합니다.',
    '가능한지 먼저 물어봤는데 바로 된다고 부드럽게 답 오더라고요. 그 한마디에 마음이 놓였어요.',
    '화면 공유 없이 캡처로만 해서 부담이 적었어요. 편하게 대해주셔서 감사합니다.',
    '두 명분 받았고 자리가 붙어 있어요. 부탁드린 대로 챙겨주셔서 정말 고마웠습니다.',
    '오픈 때 못 넣어서 문의했더니 그날 저녁에 됐어요. 급한데도 친절하셔서 울뻔했어요.',
    '절차가 간단해서 다음에도 오픈 놓치면 여기로 할 것 같아요. 첫 이용인데 너무 편했습니다.',
    '예매번호 가린 인증을 먼저 보내주셨어요. 그래서 사기 걱정이 싹 사라졌습니다.',
    '사기 걱정이 많았는데 단계가 정해져 있어서 괜찮았어요. 천천히 알려주셔서 감사합니다.',
    '오픈 끝난 공연도 구해져서 좀 놀랐어요. 그래도 없는 건 없다고 하셔서 더 믿음이 갔습니다.',
    '양도로 받은 뒤 예매내역이 바로 보여서 안심됐어요. 그 순간 진짜 감사했습니다.',
    '로그아웃까지 확인해 달라고 하셔서 끝까지 같이 봐주셨어요. 세심해서 마음이 놓였습니다.',
    '좌석 등급이 처음에 말한 거랑 같았어요. 약속한 대로 해주셔서 너무 고마워요.',
    '오픈 놓친 회차를 다시 알아봐 주셨어요. 포기할 뻔했는데 자리 받아서 다행입니다.',
    '문의만 했는데 가능한 날짜를 먼저 찍어주셨어요. 그 친절함에 바로 진행했습니다.',
    '아이디 넘기는 시간이 짧아서 출근 전에 끝났어요. 급한데도 부드럽게 해주셔서 감사합니다.',
    '첫 거래인데 예매내역 인증이 빨라서 믿음이 갔어요. 처음이라 떨렸는데 잘 봐주셨습니다.',
    '취소표 기다리다가 양도로 바꿨어요. 그래도 짜증 내지 않고 이어서 도와주셔서 고마워요.',
    '연석인지 먼저 확인해 주셔서 좋았어요. 친구랑 떨어져서 앉을까 봐 걱정했거든요.',
    '옮긴 뒤 제가 바로 비밀번호랑 메일을 바꿨어요. 어떻게 하면 되는지 친절히 알려주셨습니다.',
    '공연일 전까지 가끔 한 번씩 확인도 해주셔서 불안하지 않았어요. 끝까지 챙겨주셔서 감사합니다.',
    '오픈 지난 티켓을 구했어요. 절차가 깔끔하고 말도 따뜻해서 다음에도 여기로 할게요.',
    '되는 건 된다, 안 되는 건 없다고 해서 오히려 좋았어요. 솔직해서 믿음이 갔습니다.',
    '친구 몫까지 붙여달라고 했는데 진짜 붙어서 왔어요. 부탁을 잘 들어주셔서 너무 감사합니다.',
    '캡처만 보고 결정했는데 실제랑 같았어요. 그래서 더 안심하고 진행할 수 있었습니다.',
    '오픈 다음 날 알아봤는데 바로 자리가 나왔어요. 급한데도 친절하셔서 고마웠습니다.',
    '아이디 넘기고 제가 로그인하니까 예매내역이 그대로 있더라고요. 그 순간 진짜 안심됐어요.',
    '말은 많지 않은데 인증부터 해주셔서 믿음이 갔어요. 필요한 말만 부드럽게 해주셨습니다.',
    '없는 구역은 없다고 하셔서 좋았어요. 괜히 기대했다가 실망하지 않아서 감사합니다.',
    '당일 오전에 문의했는데 점심때 인계가 끝났어요. 급한데도 짜증 내지 않아서 너무 고마워요.',
    '비밀번호 바꾸고 로그아웃까지 하니까 할 일이 끝났어요. 마지막까지 같이 봐주셔서 감사합니다.',
    '사기 무서워서 한참 망설였는데 예매내역을 먼저 보여주셔서 진행했어요. 덕분에 자리 받았습니다.'
  ];
  const COMMON = [
    '답도 빠르고 말투가 부드러워서 계속 묻기 편했어요.',
    '필요한 말만 친절하게 해주셔서 마음이 놓였습니다.',
    '예약금 안내를 먼저 차분히 해주셔서 결정하기 쉬웠어요.',
    '인증이 한 번에 끝나서 좋았어요. 덕분에 불안하지 않았습니다.',
    '다음에도 여기로 맡기고 싶어요. 너무 친절하셨습니다.',
    '자리도 만족스럽고 과정도 편했어요. 감사합니다.',
    '상담이 부담 없어서 편하게 물어볼 수 있었습니다.',
    '카톡이 안 밀려서 기다림이 없었어요. 그 점이 제일 좋았습니다.',
    '질문 두 개만 했는데도 바로 답 와서 울뻔했어요 ㅎㅎ',
    '쓸데없는 말 없이 할 일만 정확히 해주셔서 믿음이 갔어요.',
    '시간 맞춰 연락 주셔서 출근 전에 끝낼 수 있었어요.',
    '밤에 보냈는데도 답 와서 놀랐어요. 감사합니다.',
    '다음 공연도 여기로 넣을 생각이에요. 이번에 너무 편했거든요.',
    '금액이랑 일정이 한눈에 들어와서 이해하기 쉬웠어요.',
    '다시 물어봐도 같은 내용으로 차분히 답해 주셨어요.',
    '진행 중이라는 말도 짧게 챙겨 주셔서 불안하지 않았어요.',
    '친구 소개로 왔는데 후기랑 똑같았어요. 친절하십니다.',
    '첫 이용인데 순서를 쉽게 적어주셔서 따라가기 좋았어요.',
    '되는 거랑 안 되는 거를 바로 말해줘서 결정을 빨리 했어요.',
    '카톡 톤이 부담 없어서 모르는 것도 편하게 물었습니다.',
    '공연 전에 한 번 더 확인해주셔서 안심됐어요. 감사합니다.',
    '주의사항도 부드럽게 적어주셔서 실수하지 않았어요.',
    '처리가 체감으로 빨랐어요. 급했는데 정말 고마웠습니다.',
    '다음에 선예매 있으면 또 맡기고 싶어요.',
    '후기 보고 왔는데 과장 없이 그 정도였어요. 오히려 더 믿음이 갔습니다.',
    '연락이 오래 끊기지 않아서 불안하지 않았어요.',
    '필요한 정보만 받아서 개인정보 걱정이 줄었습니다.',
    '결론부터 부드럽게 말해줘서 결정이 빨랐어요.',
    '말투가 과장 없고 따뜻해서 믿음이 갔습니다.',
    '주말에도 답 와서 일정 맞추기 쉬웠어요. 감사합니다.',
    '한 번 맡기니 다음부터는 더 짧게 끝나네요. 편합니다.',
    '정말 감사합니다. 덕분에 마음 놓고 기다렸어요.',
    '가격 물어봤을 때 숨기지 않고 바로 답해 주셔서 좋았어요.',
    '같은 질문 두 번 안 하셔도 되게 메모해 주셔서 고마웠습니다.',
    '진행 끝나면 캡처로 마무리해주셔서 깔끔했어요.',
    '잘 보고 오겠습니다. 자리 챙겨주셔서 너무 감사해요.'
  ];

  const parseOpenIso = (s) => {
    if (s && s.open) return s.open;
    const m = String((s && s.meta) || '').match(/티켓오픈\s+(\d{1,2})\.(\d{1,2})/);
    if (!m) return '';
    const y = (s && s.date) ? String(s.date).slice(0, 4) : String(new Date().getFullYear());
    return y + '-' + pad2(Number(m[1])) + '-' + pad2(Number(m[2]));
  };

  const isoParts = (iso) => {
    const p = String(iso).split('-');
    if (p.length < 3) return null;
    return [Number(p[0]), Number(p[1]), Number(p[2])];
  };

  const openFresh = (openIso, todayIso) => {
    if (!openIso) return true;
    const a = Date.parse(openIso + 'T00:00:00+09:00');
    const b = Date.parse(todayIso + 'T00:00:00+09:00');
    if (isNaN(a) || isNaN(b)) return true;
    const diff = (b - a) / 86400000;
    if (diff < 0) return true;
    return diff <= 62;
  };

  const clusteredDays = (rng, span, n) => {
    const peaks = [0];
    if (span > 0) peaks.push(Math.min(span, 1));
    if (span > 3) peaks.push(Math.min(span, 2 + Math.floor(rng() * Math.min(5, span))));
    if (span > 6) peaks.push(Math.max(0, span - Math.floor(rng() * 3)));
    const extraPeaks = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < extraPeaks; i += 1) peaks.push(Math.floor(rng() * (span + 1)));
    const offs = [];
    for (let i = 0; i < n; i += 1) {
      offs.push(rng() < 0.78 ? peaks[Math.floor(rng() * peaks.length)] : Math.floor(rng() * (span + 1)));
    }
    return offs;
  };

  const FAN_TALK = [
    { re: /임영웅/, nick: ['영웅이', '영웅님'], fandom: ['영웅시대'] },
    { re: /PLAVE|플레이브/i, nick: ['플리', '플레이브'], fandom: ['플리'] },
    { re: /NCT\s*127/, nick: ['엔시티', '127'], fandom: ['엔시티즌'] },
    { re: /NCT\s*DREAM/, nick: ['드림이', '엔시티 드림'], fandom: ['시즈니'] },
    { re: /영탁/, nick: ['탁이', '영탁이'], fandom: [] },
    { re: /성시경/, nick: ['시경이', '시경님'], fandom: [] },
    { re: /&TEAM|＆TEAM/, nick: ['앤팀'], fandom: ['루네'] },
    { re: /이성경/, nick: ['성경이', '성경언냐'], fandom: ['반짝이들'] },
    { re: /HYUNJAE/, nick: ['현재', '현재형'], fandom: ['더비'] },
    { re: /이하이|LEEHI/i, nick: ['하이야', '이하이'], fandom: [] },
    { re: /크러쉬|CRUSH/i, nick: ['크러쉬'], fandom: [] },
    { re: /이창섭/, nick: ['창섭이', '창섭'], fandom: [] },
    { re: /TAEMIN|태민/, nick: ['태민이', '태민'], fandom: ['샤이니'] },
    { re: /10CM/, nick: ['십센치'], fandom: [] },
    { re: /PENTAGON|펜타곤/i, nick: ['펜타곤'], fandom: ['유니버스'] },
    { re: /ifeye/i, nick: ['이프아이'], fandom: [] },
    { re: /izna/i, nick: ['이즈나'], fandom: [] },
    { re: /INFINITE/, nick: ['인피니트'], fandom: ['인스피릿'] },
    { re: /WHIB/, nick: ['휘브'], fandom: [] },
    { re: /이준호/, nick: ['준호', '준호씨'], fandom: [] },
    { re: /전유진/, nick: ['유진이'], fandom: [] },
    { re: /KO1KEYZ/i, nick: ['코이키즈'], fandom: [] },
    { re: /소수빈/, nick: ['수빈이', '소수빈'], fandom: [] },
    { re: /존박/, nick: ['존박'], fandom: [] },
    { re: /조민규/, nick: ['민규', '조민규'], fandom: [] },
    { re: /김윤아/, nick: ['윤아', '김윤아'], fandom: [] },
    { re: /마룬\s*5|Maroon/i, nick: ['마룬5'], fandom: [] },
    { re: /KEY B-day|KEYdult/, nick: ['키', '키니'], fandom: ['샤이니'] },
    { re: /한지우|HAN JI WOO/i, nick: ['지우'], fandom: [] },
    { re: /하루 첫 팬콘서트/, nick: ['하루'], fandom: [] },
    { re: /장윤정/, nick: ['윤정이', '장윤정'], fandom: [] },
    { re: /김건모/, nick: ['건모', '김건모'], fandom: [] },
    { re: /김장훈/, nick: ['장훈이', '김장훈'], fandom: [] },
    { re: /윤종신/, nick: ['종신이', '윤종신'], fandom: [] },
    { re: /적재/, nick: ['적재'], fandom: [] },
    { re: /Silica Gel|실리카겔/i, nick: ['실리카겔'], fandom: [] },
    { re: /거니|g0nny/i, nick: ['거니'], fandom: [] },
    { re: /이승철/, nick: ['승철이', '이승철'], fandom: [] },
    { re: /포레스텔라|FORESTELLA/i, nick: ['포레스텔라'], fandom: [] },
    { re: /미스트롯/, nick: ['미스트롯'], fandom: [] }
  ];

  const artistTalk = (title) => {
    const t = String(title || '');
    for (let i = 0; i < FAN_TALK.length; i += 1) {
      if (FAN_TALK[i].re.test(t)) return FAN_TALK[i];
    }
    const cleaned = t.replace(/^\d{4}\s*/, '').replace(/^\[[^\]]+\]\s*/, '');
    const m = cleaned.match(/([A-Za-z][A-Za-z0-9 .&'-]{1,24}|[가-힣]{2,8})/);
    const name = m ? m[1].trim() : '';
    if (!name || name.length > 12) return { nick: [], fandom: [] };
    return { nick: [name], fandom: [] };
  };

  const talkLine = (soon, talk, rng) => {
    const nicks = (talk && talk.nick) || [];
    const fans = (talk && talk.fandom) || [];
    const n = nicks.length ? nicks[Math.floor(rng() * nicks.length)] : '';
    const f = fans.length ? fans[Math.floor(rng() * fans.length)] : '';
    const delta = [
      n && n + ' 보러 가고 싶은데 티켓팅이 너무 무서워서 미리 맡겼어요. 친절하게 받아주셔서 감사합니다.',
      n && n + ' 직관 가려면 저 혼자면 못 넣을 것 같아서요. 회차만 적어도 된다고 하셔서 마음이 놓였습니다.',
      f && '이번엔 ' + f + '끼리 가는데 제가 표 넣는 건 자신 없어서 미리 문의했어요. 편하게 받아주셔서 고마워요.',
      n && n + ' 인기가 많아서 제 손을 못 믿겠어요. 그래도 혼내지 않고 일정만 받아주셔서 감사합니다.',
      f && f + '들 많을 것 같아서 저부터 겁먹고 미리 문의했어요. 부담 없이 받아주셔서 너무 고마웠습니다.',
      n && n + ' 선예매는 아직인데 바빠서 미리 걸어뒀어요. 받아주시니까 밤에 덜 뒤척입니다.'
    ].filter(Boolean);
    const move = [
      n && '오픈 놓쳐서 ' + n + ' 양도로 구했어요. 예매내역부터 보여주셔서 안심하고 진행했습니다.',
      n && n + ' 자리를 양도로 받았어요. 설명도 친절하고 인계도 빨라서 너무 감사합니다.',
      f && f + ' 친구랑 연석 맞췄어요. 부탁드린 대로 붙여주셔서 진짜 고마워요.',
      n && n + ' 보러 가려고 양도 받았어요. 처음부터 차근차근 알려주셔서 편했습니다.',
      f && f + '끼리 가기로 해서 양도 문의했어요. 가능한 자리만 솔직히 말씀해 주셔서 좋았습니다.',
      n && n + ' 연석으로 달라고 했더니 되는 것만 보여주셨어요. 억지로 권하지 않아서 믿음이 갔습니다.'
    ].filter(Boolean);
    const pool = soon ? delta : move;
    if (!pool.length) return '';
    return pool[Math.floor(rng() * pool.length)];
  };

  const makeReviews = (key, show, todayIso, soon, names) => {
    const rng = reviewRng(0x51ed ^ reviewKeySeed(key));
    const surNext = (names && names.surRot) ? names.surRot : () => pick(rng, SUR);
    const givenNext = (names && names.givenRot) ? names.givenRot : () => pick(rng, GIVEN);
    const n = soon
      ? (5 + Math.floor(rng() * 11))
      : ((1 + Math.floor(rng() * 8)) * 10 + Math.floor(rng() * 10));
    const openIso = parseOpenIso(show);
    let fromIso = openIso;
    let untilIso = todayIso;
    if (soon) {
      const d = new Date(todayIso + 'T00:00:00+09:00');
      d.setDate(d.getDate() - (4 + Math.floor(rng() * 8)));
      fromIso = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
      untilIso = todayIso;
    } else {
      if (show.date && show.date < untilIso) untilIso = show.date;
      if (show.date) {
        const d = new Date(show.date + 'T00:00:00+09:00');
        d.setDate(d.getDate() - 1);
        const last = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
        if (last < untilIso) untilIso = last;
      }
      if (!fromIso || fromIso > todayIso) {
        const d = new Date(todayIso + 'T00:00:00+09:00');
        d.setDate(d.getDate() - (7 + Math.floor(rng() * 6)));
        fromIso = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
      }
    }
    if (untilIso < fromIso) untilIso = fromIso;
    const a = isoParts(fromIso);
    const b = isoParts(untilIso);
    const span = a && b ? Math.max(0, daysSpan(a[0], a[1], a[2], b[0], b[1], b[2])) : 0;
    const offs = clusteredDays(rng, span, n);
    const used = {};
    const items = [];
    const pool = soon ? DELTA : MOVE;
    const poolRot = makeRotator(rng, pool);
    const commonRot = makeRotator(rng, COMMON);
    const usedText = {};
    for (let i = 0; i < n; i += 1) {
      let name = surNext() + '*' + givenNext();
      let guard = 0;
      while (used[name] && guard < 24) {
        name = surNext() + '*' + givenNext();
        guard += 1;
      }
      used[name] = true;
      const date = addDays(a[0], a[1], a[2], Math.min(span, offs[i]));
      const stars = rng() < 0.03 ? 3 : rng() < 0.15 ? 4 : 5;
      let main = poolRot();
      let tguard = 0;
      while (usedText[main] && tguard < 8) {
        main = poolRot();
        tguard += 1;
      }
      const talk = artistTalk(show && show.title);
      if (rng() < 0.3) {
        const line = talkLine(soon, talk, rng);
        if (line && !usedText[line]) main = line;
      }
      usedText[main] = true;
      const bits = [main];
      if (rng() < 0.72) {
        let extra = commonRot();
        if (soon && /자리 만족|캡처로 마무리|잘 보고 오겠/.test(extra)) extra = commonRot();
        if (extra !== main) bits.push(extra);
      }
      if (rng() < 0.28) {
        let more = commonRot();
        if (soon && /자리 만족|캡처로 마무리|잘 보고 오겠/.test(more)) more = commonRot();
        if (more !== main && bits.indexOf(more) < 0) bits.push(more);
      }
      let text = bits.join(' ');
      const emo = pick(rng, EMO);
      if (emo && rng() < 0.68 && text.indexOf(emo.trim()) < 0) text += emo;
      items.push({ name: name, date: date, stars: stars, text: text });
    }
    items.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name, 'ko'));
    return items;
  };

  const REVIEWS = {};

  const cardDateHtml = (s) => {
    const o = parseOpenIso(s);
    const range = dateRangeLabel(s);
    const bits = [];
    if (o) {
      bits.push('<span class="show__when show__when--open"><span class="show__when-k">티켓팅</span><b>' + escapeHtml(mdLabel(o)) + '</b></span>');
    }
    if (range) {
      bits.push('<span class="show__when show__when--play"><span class="show__when-k">공연일</span><b>' + escapeHtml(range) + '</b></span>');
    }
    if (!bits.length) return escapeHtml(String((s && s.meta) || ''));
    return '<span class="show__dates">' + bits.join('') + '</span>';
  };

  const renderSuccess = (shows) => {
    const grid = document.getElementById('successGrid');
    if (!grid) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const todayIso = start.getFullYear() + '-' + pad2(start.getMonth() + 1) + '-' + pad2(start.getDate());
    const pageRng = reviewRng(0x7a11 ^ Number(todayIso.replace(/-/g, '')));
    const surRot = makeRotator(pageRng, SUR);
    const list = (shows || []).filter((s) => s && s.title);
    if (!list.length) return;
    Object.keys(REVIEWS).forEach((k) => { delete REVIEWS[k]; });
    succPage = 1;
    grid.innerHTML = list.map((s, i) => {
      const soon = isSoonShow(s, todayIso);
      const key = 's' + i;
      REVIEWS[key] = makeReviews(key + s.title, s, todayIso, soon, {
        surRot: surRot,
        givenRot: makeRotator(reviewRng(0x9e37 ^ reviewKeySeed(key + s.title)), GIVEN)
      });
      const n = REVIEWS[key].length;
      const badge = soon ? (n + '건') : (Math.max(1, Math.floor(n / 10)) + 'X건');
      const kind = soon ? ' succ--soon' : ' succ--move';
      const snippets = soon ? CARD_DELTA : CARD_MOVE;
      const hint = snippets[Math.floor(reviewRng(0xc0de ^ reviewKeySeed(key + s.title))() * snippets.length)];
      return (
        '<article class="succ' + kind + '" data-review="' + key + '" data-kind="' + (soon ? 'delta' : 'move') + '" tabindex="0">' +
          '<div class="succ__top"><h3>' + escapeHtml(s.title) + '</h3><span class="succ__cnt">' + badge + '</span></div>' +
          '<p class="succ__date">' + cardDateHtml(s) + '</p>' +
          '<p class="succ__hint">' + escapeHtml(hint) + '</p>' +
        '</article>'
      );
    }).join('');
    paintSuccPage();
  };

  const seedFallbackReviews = () => {
    const grid = document.getElementById('successGrid');
    if (!grid) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const todayIso = start.getFullYear() + '-' + pad2(start.getMonth() + 1) + '-' + pad2(start.getDate());
    const pageRng = reviewRng(0x7a11 ^ Number(todayIso.replace(/-/g, '')));
    const surRot = makeRotator(pageRng, SUR);
    grid.querySelectorAll('.succ[data-review]').forEach((el) => {
      const key = el.getAttribute('data-review');
      const title = (el.querySelector('h3') && el.querySelector('h3').textContent) || key;
      const dateText = (el.querySelector('.succ__date') && el.querySelector('.succ__date').textContent) || '';
      const soon = /티켓팅\s*예정/.test(dateText) || /오픈\s*예정/.test(dateText) || /티켓오픈/.test(dateText);
      const meta = dateText;
      REVIEWS[key] = makeReviews(key + title, { title: title, meta: meta, view: 2400 }, todayIso, soon, {
        surRot: surRot,
        givenRot: makeRotator(reviewRng(0x9e37 ^ reviewKeySeed(key + title)), GIVEN)
      });
      const hintEl = el.querySelector('.succ__hint');
      if (hintEl) {
        const snippets = soon ? CARD_DELTA : CARD_MOVE;
        hintEl.textContent = snippets[Math.floor(reviewRng(0xc0de ^ reviewKeySeed(key + title))() * snippets.length)];
      }
    });
    paintSuccPage();
  };

  seedFallbackReviews();
  loadAutoShows();

  const reviewModal = document.getElementById('reviewModal');
  const reviewList = document.getElementById('reviewList');
  const reviewTitle = document.getElementById('reviewModalTitle');
  const reviewSub = document.getElementById('reviewModalSub');

  const starsHtml = (n) => {
    const full = Math.max(0, Math.min(5, n | 0));
    return '<span class="review__stars" aria-label="' + full + '점">' + '★'.repeat(full) + '<span style="opacity:.28">' + '★'.repeat(5 - full) + '</span></span>';
  };

  const openReviews = (key, showName) => {
    if (!reviewModal || typeof reviewModal.showModal !== 'function') return;
    const items = REVIEWS[key] || [];
    if (reviewTitle) reviewTitle.textContent = showName;
    if (reviewSub) {
      const masked = Math.floor(items.length / 10) + 'X';
      reviewSub.textContent = masked + '개의 후기 · 이름과 예매정보는 일부만 공개합니다.';
    }
    if (reviewList) {
      reviewList.innerHTML = items.map((r) => (
        '<article class="review">' +
          '<div class="review__head">' +
            '<span class="review__avatar" aria-hidden="true">' + escapeHtml(r.name.charAt(0)) + '</span>' +
            '<div><p class="review__who">' + escapeHtml(r.name) + '</p><p class="review__date">' + escapeHtml(r.date) + '</p></div>' +
            starsHtml(r.stars) +
          '</div>' +
          '<p class="review__body">' + escapeHtml(r.text) + '</p>' +
        '</article>'
      )).join('');
    }
    if (!reviewModal.open) reviewModal.showModal();
  };

  const successGrid = document.getElementById('successGrid');
  if (successGrid) {
    successGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.succ');
      if (!card) return;
      const key = card.getAttribute('data-review');
      const nameEl = card.querySelector('h3');
      if (!key) return;
      openReviews(key, nameEl ? nameEl.textContent : '고객 후기');
    });
    successGrid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.succ');
      if (!card) return;
      e.preventDefault();
      const key = card.getAttribute('data-review');
      const nameEl = card.querySelector('h3');
      if (!key) return;
      openReviews(key, nameEl ? nameEl.textContent : '고객 후기');
    });
  }
  if (reviewModal) {
    reviewModal.querySelectorAll('[data-review-close]').forEach((btn) => {
      btn.addEventListener('click', () => reviewModal.close());
    });
    reviewModal.addEventListener('click', (e) => {
      if (!e.target.closest('.review-modal__panel')) reviewModal.close();
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
  const kakaoId = (kakaoModal && kakaoModal.dataset.kakaoId) || 'every0';

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

  const inqSection = document.querySelector('[data-inquiry-template]');
  if (!features.inquiryTemplate && inqSection) inqSection.hidden = true;

  const inqText = document.getElementById('inqText');
  const inqCopyBtn = document.getElementById('inqCopyBtn');
  const inqFields = [
    { label: '공연명', el: document.getElementById('inqShow') },
    { label: '날짜', el: document.getElementById('inqDate') },
    { label: '인원', el: document.getElementById('inqCount') },
    { label: '희망좌석', el: document.getElementById('inqSeat') }
  ];
  const inqTypeVal = () => {
    const picked = document.querySelector('input[name="inqType"]:checked');
    return picked ? picked.value : '';
  };

  const buildInquiry = () => {
    if (!inqText) return;
    inqText.textContent = ['문의 : ' + inqTypeVal()].concat(
      inqFields.map((f) => f.label + ' : ' + ((f.el && f.el.value) || '').trim())
    ).join('\n');
  };

  inqFields.forEach((f) => {
    if (f.el) f.el.addEventListener('input', buildInquiry);
  });
  document.querySelectorAll('input[name="inqType"]').forEach((el) => {
    el.addEventListener('change', buildInquiry);
  });
  buildInquiry();

  const setInquiryText = (title) => {
    const showField = inqFields[0].el;
    if (!showField || !title) return;
    showField.value = String(title).trim();
    buildInquiry();
  };

  const copyText = async (value, btn, okLabel) => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand('copy');
      ta.remove();
    }
    if (!btn) return;
    const prev = btn.textContent;
    btn.textContent = ok ? okLabel : '복사에 실패했습니다';
    btn.classList.toggle('is-copied', ok);
    window.setTimeout(() => {
      btn.textContent = prev;
      btn.classList.remove('is-copied');
    }, 1800);
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-kakao-open]');
    if (!el) return;
    e.preventDefault();
    setInquiryText(el.getAttribute('data-show-title') || '');
    openKakaoModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target.closest('[data-kakao-open]');
    if (!el || el.tagName === 'A' || el.tagName === 'BUTTON') return;
    e.preventDefault();
    setInquiryText(el.getAttribute('data-show-title') || '');
    openKakaoModal();
  });

  if (kakaoModal) {
    kakaoModal.querySelectorAll('[data-kakao-close]').forEach((btn) => {
      btn.addEventListener('click', closeKakaoModal);
    });
    kakaoModal.addEventListener('click', (e) => {
      if (!e.target.closest('.kakao-modal__panel')) closeKakaoModal();
    });
  }

  const kakaoIdBox = document.getElementById('kakaoIdBox');
  const flashIdBox = () => {
    if (!kakaoIdBox) return;
    const label = kakaoIdBox.querySelector('.kakao-modal__idlabel');
    const prev = label ? label.textContent : '';
    if (label) label.textContent = '아이디가 복사되었습니다';
    kakaoIdBox.classList.add('is-copied');
    window.setTimeout(() => {
      if (label) label.textContent = prev;
      kakaoIdBox.classList.remove('is-copied');
    }, 1800);
  };

  if (kakaoCopyBtn) {
    kakaoCopyBtn.addEventListener('click', () => {
      copyText(kakaoId, kakaoCopyBtn, '아이디가 복사되었습니다');
      flashIdBox();
    });
  }
  if (kakaoIdBox) {
    kakaoIdBox.addEventListener('click', () => {
      copyText(kakaoId);
      flashIdBox();
    });
  }
  if (inqCopyBtn) {
    inqCopyBtn.addEventListener('click', () => {
      copyText((inqText && inqText.textContent) || '', inqCopyBtn, '문의 문장이 복사되었습니다');
    });
  }

  const kakaoOpenBtn = document.getElementById('kakaoOpenBtn');
  const openKakaoApp = () => {
    const ua = navigator.userAgent || '';
    const android = /Android/i.test(ua);
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const scheme = 'kakaotalk://addfriend?id=' + encodeURIComponent(kakaoId);

    if (android) {
      window.location.href = 'intent://addfriend?id=' + encodeURIComponent(kakaoId) + '#Intent;scheme=kakaotalk;package=com.kakao.talk;end';
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

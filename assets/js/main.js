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
  const showList = document.getElementById('showList');

  const applyShowFilter = (filter) => {
    if (!showList) return;
    const matches = [];
    showList.querySelectorAll('.show').forEach((show) => {
      const match = filter === 'all' || show.dataset.status === filter;
      show.classList.toggle('is-hidden', !match);
      if (match) {
        matches.push(show);
        show.style.animation = 'none';
        void show.offsetWidth;
        show.style.animation = '';
      }
    });
    const useFold = filter === 'all' && matches.length > 6;
    matches.forEach((show, i) => {
      const fold = useFold && i >= 6 && !openMoreExpanded;
      show.classList.toggle('is-folded', fold);
      show.classList.toggle('is-unfolded', useFold && i >= 6 && openMoreExpanded);
    });
    if (openMoreBtn) {
      openMoreBtn.hidden = !useFold;
      if (!useFold) {
        openMoreBtn.classList.remove('is-open');
        openMoreBtn.innerHTML = '더 보기 <i aria-hidden="true">▾</i>';
      } else {
        openMoreBtn.classList.toggle('is-open', openMoreExpanded);
        openMoreBtn.innerHTML = openMoreExpanded
          ? '접기 <i aria-hidden="true">▾</i>'
          : '더 보기 <i aria-hidden="true">▾</i>';
      }
    }
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      openMoreExpanded = false;
      applyShowFilter(tab.dataset.filter);
    });
  });

  const features = window.ET_FEATURES || {};
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const openMoreBtn = document.getElementById('openMoreBtn');
  let openMoreExpanded = false;
  if (openMoreBtn) {
    openMoreBtn.addEventListener('click', () => {
      openMoreExpanded = !openMoreExpanded;
      const active = document.querySelector('.tab.is-active');
      applyShowFilter((active && active.dataset.filter) || 'all');
    });
  }

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
    if (!first || /^티켓오픈/.test(first)) return '';
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
      dates.push('<span class="show__when show__when--open"><span class="show__when-k">오픈</span><b>' + escapeHtml(mdLabel(o)) + '</b></span>');
    }
    if (range) {
      dates.push('<span class="show__when show__when--play"><span class="show__when-k">공연</span><b>' + escapeHtml(range) + '</b></span>');
    }
    if (dates.length) bits.push('<span class="show__dates">' + dates.join('') + '</span>');
    if (!bits.length) return escapeHtml(String((s && s.meta) || ''));
    return bits.join('');
  };

  const isSoonShow = (s, today) => {
    const o = parseOpenIso(s);
    if (o) return o > today;
    return s.kind === 'soon' || s.status === 'soon';
  };

  const loadAutoShows = () => {
    if (!features.autoShows || !showList) return;
    fetch('assets/data/shows.json')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const pad = (n) => String(n).padStart(2, '0');
        const today = start.getFullYear() + '-' + pad(start.getMonth() + 1) + '-' + pad(start.getDate());
        const raw = Array.isArray(data.shows) ? data.shows : (data.shows && data.shows.value) || [];
        const popular = raw.filter((s) => {
          if (!s || !s.title) return false;
          if (s.status === 'done') return false;
          if (/수급|물량|일정 공개/.test(s.title)) return false;
          if (!s.meta && !s.date && !s.open) return false;
          if (s.endDate && s.endDate < today) return false;
          if (!s.endDate && s.date && s.date < today) return false;
          return true;
        });
        renderSuccess(popular);
        const opened = popular.filter((s) => !isSoonShow(s, today)).sort((a, b) => {
          return (a.date || '9999').localeCompare(b.date || '9999') || a.title.localeCompare(b.title, 'ko');
        });
        const soonList = popular.filter((s) => isSoonShow(s, today)).sort((a, b) => {
          const ao = parseOpenIso(a) || a.date || '9999';
          const bo = parseOpenIso(b) || b.date || '9999';
          return ao.localeCompare(bo) || (a.date || '').localeCompare(b.date || '') || a.title.localeCompare(b.title, 'ko');
        });
        const ordered = opened.concat(soonList);
        if (!ordered.length) return;
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
        openMoreExpanded = false;
        const active = document.querySelector('.tab.is-active');
        applyShowFilter((active && active.dataset.filter) || 'all');
      })
      .catch(() => {
        const active = document.querySelector('.tab.is-active');
        applyShowFilter((active && active.dataset.filter) || 'all');
      });
  };
  if (showList) {
    const active = document.querySelector('.tab.is-active');
    applyShowFilter((active && active.dataset.filter) || 'all');
  }

  /* ---------- 성공후기 더 보기 ---------- */
  const moreBtn = document.getElementById('moreBtn');
  let succExpanded = false;
  const paintSuccMore = () => {
    const grid = document.getElementById('successGrid');
    if (!moreBtn || !grid) return;
    const extra = grid.querySelectorAll('.succ.is-extra');
    extra.forEach((el) => el.classList.toggle('is-hidden', !succExpanded));
    moreBtn.classList.toggle('is-open', succExpanded);
    moreBtn.hidden = extra.length === 0;
    moreBtn.innerHTML = succExpanded
      ? '성공후기 접기 <i aria-hidden="true">▾</i>'
      : '성공후기 더 보기 <i aria-hidden="true">▾</i>';
  };
  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      succExpanded = !succExpanded;
      paintSuccMore();
    });
  }

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
  const EMO = ['', '', '', ' ㅠㅠ', ' ㅎㅎ', ' 🙏', ' 👍', ' ✨', ' 🥹', ' 😭', ' 🔥'];
  const DELTA = [
    '오픈 전에 선착순으로 넣어주셔서 편했어요.',
    '댈티 신청하니까 바로 선착순으로 넣어주심.',
    '오픈 전이라 대리티켓팅으로 미리 넣어달라고 했습니다.',
    '희망 구역 말씀드렸더니 선착순으로 넣어주셨어요.',
    '혼자 넣으면 놓칠까 봐 선착순 대행 맡겼어요.',
    '오픈 전에 접수만 해두면 된다길래 바로 신청했습니다.',
    '선착순으로 넣어주시고 카톡으로 확인해주심.',
    '오픈 전에 미리 넣어두니까 마음 놓였어요.',
    '대리티켓팅으로 선착순 넣어달라고 했고 바로 됐습니다.',
    '원하는 회차 말해드렸더니 선착순으로 넣어주셨어요.',
    '오픈 전에 넣어두라고 하셔서 댈티로 맡겼습니다.',
    '선착순이라 빨리 넣어달라고 했더니 바로 처리해주심.'
  ];
  const MOVE = [
    '오픈 끝나고 아이디옮기기로 양도 받았습니다.',
    '아옮이라 사기 걱정됐는데 예매내역 바로 인증해주심.',
    '양도로 연석 구했습니다. 아이디 안전하게 옮겨주셨어요.',
    '아이디옮기기 중간중간 상황 공유돼서 답답하지 않았어요.',
    '아옮 처음인데 로그인이랑 일정도 짧게 알려주심.',
    '양도 자리 그대로 받아서 연석으로 갑니다.',
    '아이디 옮겨주신 뒤 예매화면 가리고 보여주셔서 안심됐어요.',
    '아옮으로 두 장 부탁드렸고 그대로 됐습니다.',
    '양도 문의했는데 가능한 좌석만 솔직하게 말씀해주셨어요.',
    '아이디옮기기 끝나고 바로 로그인까지 확인해주심.',
    '오픈 지난 자리라 아옮으로 진행했고 계정 인계가 깔끔했어요.',
    '양도 좌석 인증 먼저 받고 아이디옮기기 했습니다.'
  ];
  const COMMON = [
    '답장이 빨라서 좋았습니다.',
    '말은 짧고 일만 정확하게 해주십니다.',
    '예약금 안내 미리 딱 잘라주셔서 편했어요.',
    '인증 한 번에 끝나서 좋음.',
    '다음에도 여기로 맡길 듯요.',
    '자리 만족합니다.',
    '진짜 도움 됐어요.',
    '상담이 부담 없어서 편했습니다.',
    '진행이 투명해서 믿음이 갔어요.',
    '감사합니다.'
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
      const bits = [pick(rng, pool)];
      if (rng() < 0.7) bits.push(pick(rng, COMMON));
      let text = bits.join(' ');
      const emo = pick(rng, EMO);
      if (emo && rng() < 0.5 && text.indexOf(emo.trim()) < 0) text += emo;
      items.push({ name: name, date: date, stars: stars, text: text });
    }
    items.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name, 'ko'));
    return items;
  };

  const REVIEWS = {};

  const cardDate = (s, soon) => {
    const o = parseOpenIso(s);
    if (o) {
      const p = o.split('-');
      return (soon ? '오픈 예정 ' : '오픈 ') + Number(p[1]) + '.' + Number(p[2]);
    }
    if (soon) return '오픈 예정';
    if (s.date) return s.date.replace(/-/g, '.');
    return '오픈 예정';
  };

  const renderSuccess = (shows) => {
    const grid = document.getElementById('successGrid');
    if (!grid) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const todayIso = start.getFullYear() + '-' + pad2(start.getMonth() + 1) + '-' + pad2(start.getDate());
    const fresh = (shows || []).filter((s) => s && s.title && openFresh(parseOpenIso(s), todayIso));
    const opened = fresh.filter((s) => !isSoonShow(s, todayIso)).sort((a, b) => {
      return (a.date || parseOpenIso(a) || '9999').localeCompare(b.date || parseOpenIso(b) || '9999') || a.title.localeCompare(b.title, 'ko');
    });
    const soonAll = fresh.filter((s) => isSoonShow(s, todayIso)).sort((a, b) => {
      const ao = parseOpenIso(a) || a.date || '9999';
      const bo = parseOpenIso(b) || b.date || '9999';
      return ao.localeCompare(bo) || (a.date || '').localeCompare(b.date || '') || a.title.localeCompare(b.title, 'ko');
    });
    const pageRng = reviewRng(0x7a11 ^ Number(todayIso.replace(/-/g, '')));
    const surRot = makeRotator(pageRng, SUR);
    let soonCap = soonAll.length;
    if (soonAll.length >= 15) soonCap = 12 + Math.floor(pageRng() * 4);
    else if (soonAll.length >= 5) soonCap = 5 + Math.floor(pageRng() * (soonAll.length - 4));
    const soonList = soonAll.slice(0, soonCap);
    const list = opened.concat(soonList);
    if (!list.length) return;
    Object.keys(REVIEWS).forEach((k) => { delete REVIEWS[k]; });
    succExpanded = false;
    grid.innerHTML = list.map((s, i) => {
      const soon = isSoonShow(s, todayIso);
      const key = 's' + i;
      REVIEWS[key] = makeReviews(key + s.title, s, todayIso, soon, {
        surRot: surRot,
        givenRot: makeRotator(reviewRng(0x9e37 ^ reviewKeySeed(key + s.title)), GIVEN)
      });
      const n = REVIEWS[key].length;
      const badge = soon ? (n + '건') : (Math.max(1, Math.floor(n / 10)) + 'X건');
      const extra = i >= Math.max(opened.length, 6) ? ' is-extra is-hidden' : '';
      const kind = soon ? ' succ--soon' : ' succ--move';
      const hint = soon ? '댈티 후기' : '아옮 후기';
      return (
        '<article class="succ' + kind + extra + '" data-review="' + key + '" tabindex="0">' +
          '<div class="succ__top"><h3>' + escapeHtml(s.title) + '</h3><span class="succ__cnt">' + badge + '</span></div>' +
          '<p class="succ__date">' + escapeHtml(cardDate(s, soon)) + '</p>' +
          '<p class="succ__hint">' + hint + '</p>' +
        '</article>'
      );
    }).join('');
    paintSuccMore();
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
      const soon = /오픈\s*예정/.test(dateText) || /티켓오픈/.test(dateText);
      const meta = /오픈\s+\d/.test(dateText) ? dateText.replace('오픈 예정', '티켓오픈').replace('오픈', '티켓오픈') : dateText;
      REVIEWS[key] = makeReviews(key + title, { title: title, meta: meta, view: 2400 }, todayIso, soon, {
        surRot: surRot,
        givenRot: makeRotator(reviewRng(0x9e37 ^ reviewKeySeed(key + title)), GIVEN)
      });
    });
    paintSuccMore();
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

  const buildInquiry = () => {
    if (!inqText) return;
    inqText.textContent = inqFields
      .map((f) => f.label + ' : ' + ((f.el && f.el.value) || '').trim())
      .join('\n');
  };

  inqFields.forEach((f) => {
    if (f.el) f.el.addEventListener('input', buildInquiry);
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

  if (kakaoCopyBtn) {
    kakaoCopyBtn.addEventListener('click', () => copyText(kakaoId, kakaoCopyBtn, '아이디가 복사되었습니다'));
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

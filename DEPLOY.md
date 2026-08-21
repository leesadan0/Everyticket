# 운영 안내

현재 구성 요약입니다.

| 항목 | 값 |
|---|---|
| 도메인 | `ticketpartner0.com` (Cloudflare Registrar) |
| 호스팅 | Cloudflare Workers (정적 자산) |
| 코드 저장소 | [leesadan0/Everyticket](https://github.com/leesadan0/Everyticket) |
| 임시 주소 | `everyticket.leesadan0.workers.dev` |
| 배포 방식 | `main` 브랜치에 push하면 자동 배포 |

---

## 사이트 수정하고 반영하기

파일을 고친 뒤 아래 세 줄이면 끝입니다. 1~2분 뒤 실제 사이트에 반영됩니다.

```powershell
cd C:\Users\aaa\Projects\everyticket
git add -A
git commit -m "수정 내용 요약"
git push
```

배포 상황은 Cloudflare 대시보드의 `Compute (Workers & Pages)` → `everyticket` → `Deployments` 에서 확인할 수 있습니다.

---

## 아직 채워야 하는 항목

1. **카카오톡 채널 주소** — `index.html` 에서 `data-placeholder="kakao"` 가 붙은 링크의 `href`. 현재는 클릭하면 안내 알림만 뜹니다.
2. **채널 아이디** — `.qr__name` 의 `@에브리티켓` 문구
3. **사업자등록번호** — 푸터의 `000-00-00000`
4. **QR 이미지** — `.qr__box` 자리에 실제 카카오톡 QR 이미지를 넣으려면 `<img>` 로 교체

---

## www 주소 통합 (Cloudflare 대시보드)

Workers 의 `_redirects` 파일은 도메인 단위 리다이렉트를 지원하지 않아, 이것만 대시보드에서 설정해야 합니다.

1. Cloudflare 대시보드에서 `ticketpartner0.com` 도메인 선택
2. 왼쪽 메뉴 `Rules` → `Redirect Rules` → `Create rule`
3. 설정값

   | 항목 | 값 |
   |---|---|
   | Rule name | `www to apex` |
   | When incoming requests match | `Custom filter expression` |
   | Field / Operator / Value | `Hostname` / `equals` / `www.ticketpartner0.com` |
   | Type | `Dynamic` |
   | Expression | `concat("https://ticketpartner0.com", http.request.uri.path)` |
   | Status code | `301` |
   | Preserve query string | 켬 |

4. `Deploy`

---

## 검색엔진 등록

### 구글

1. [Search Console](https://search.google.com/search-console) → `속성 추가` → `도메인` → `ticketpartner0.com`
2. 표시되는 TXT 레코드를 Cloudflare DNS 에 추가 후 `확인`
3. 좌측 `Sitemaps` → `sitemap.xml` 제출
4. 상단 검색창에 사이트 주소 입력 → `색인 생성 요청`

첫 노출까지 3일~2주. `site:ticketpartner0.com` 으로 색인 여부 확인.

### 네이버 (한국 고객이면 필수)

1. [서치어드바이저](https://searchadvisor.naver.com) → `웹마스터도구` → 사이트 등록
2. 소유확인은 HTML 태그 방식 선택 → 받은 `<meta name="naver-site-verification">` 을 `index.html` 의 `<head>` 안에 추가 후 push
3. `요청` → 사이트맵 제출에 `https://ticketpartner0.com/sitemap.xml` 입력

다음은 [webmaster.daum.net](https://webmaster.daum.net) 에서 동일하게 진행합니다.

---

## 검색 순위를 올리는 실질적인 방법

검색 등록만으로는 상위에 뜨지 않습니다.

- **공연별 페이지를 따로 만들기** — "세븐틴 콘서트 대리티켓팅" 처럼 검색어와 정확히 맞는 페이지가 있어야 상위에 뜹니다. 원페이지 하나로는 한계가 있습니다.
- **성공내역을 꾸준히 업데이트** — 새 내용이 계속 올라오는 사이트를 구글이 선호합니다.
- **네이버 블로그·카페에서 사이트로 링크** — 한국 시장에서는 이것이 유입의 대부분입니다.
- **이미지 추가 시 WebP 로 변환** — 현재는 이미지가 1개뿐이라 이미 빠릅니다.

---

## 도메인 관리

- 등록은 1년 단위이며 **자동 갱신이 켜져 있어야 합니다.** 만료되면 사이트가 통째로 내려갑니다.
- 등록 시 입력한 이메일로 오는 **인증 메일을 반드시 확인**해야 합니다. 미확인 시 도메인이 정지됩니다.
- 결제 카드 만료 전에 갱신해 두세요.

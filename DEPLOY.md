# 배포 & 구글 노출 체크리스트

도메인 구매 → Netlify 배포 → 구글/네이버 검색 등록 순서입니다.
`everyticket.kr` 은 예시이므로 실제 구매한 도메인으로 바꿔주세요.

---

## 0. 도메인 이름 정하기 전 확인

- `.com` 은 신뢰도가 가장 높고 해외 검색에도 유리합니다.
- `.co.kr` / `.kr` 은 한국 사업자 대상이면 무난합니다. (`.co.kr` 은 사업자등록증 필요할 수 있음)
- 짧고 발음되는 이름이 좋습니다. 예: `everyticket.com`, `everyticket.kr`, `everyticket.co.kr`

---

## 1. 도메인 구매

| 등록업체 | 특징 |
|---|---|
| **Cloudflare Registrar** | 원가 판매로 가장 저렴, 갱신가 인상 없음. 신용카드/해외결제 필요 |
| **가비아 / 후이즈** | 한국어 지원, 카드·계좌이체 가능, `.co.kr` 편리. 첫해 할인 후 갱신가 확인 필요 |
| **Netlify Domains** | Netlify 안에서 바로 구매, DNS 설정 자동. 가장 간편하지만 선택지가 적음 |

구매 후 **자동 갱신을 반드시 켜두세요.** 만료되면 사이트가 통째로 내려갑니다.

---

## 2. GitHub에 코드 올리기 (권장)

드래그 앤 드롭 배포도 가능하지만, GitHub에 연결하면 파일을 고칠 때마다 자동 재배포됩니다.

```powershell
cd C:\Users\aaa\Projects\everyticket
git init
git add .
git commit -m "에브리티켓 사이트 최초 배포"
git branch -M main
git remote add origin https://github.com/<계정명>/everyticket.git
git push -u origin main
```

---

## 3. Netlify 배포

1. [app.netlify.com](https://app.netlify.com) 가입 (GitHub 계정으로 로그인하면 편합니다)
2. **Add new site → Import an existing project → GitHub** 선택 후 `everyticket` 저장소 연결
3. 빌드 설정은 그대로 두면 됩니다 (`netlify.toml` 에 이미 들어있음)
   - Build command: 비움
   - Publish directory: `.`
4. **Deploy** 클릭 → 1분 내 `랜덤이름.netlify.app` 주소가 생성됩니다

> GitHub 없이 하려면: Netlify 대시보드의 **Sites** 영역에 `everyticket` 폴더를 통째로 드래그하면 즉시 배포됩니다.

---

## 4. 도메인 연결

1. Netlify 사이트 → **Domain management → Add a domain** → 구매한 도메인 입력
2. Netlify가 알려주는 값을 도메인 등록업체 DNS 설정에 입력합니다
   - 루트 도메인(`everyticket.kr`): **A 레코드 → `75.2.60.5`** (Netlify가 알려주는 값 사용)
   - `www`: **CNAME → `랜덤이름.netlify.app`**
   - 또는 네임서버를 Netlify DNS로 통째로 변경 (더 간단하며 권장)
3. DNS 반영에 보통 10분~2시간, 최대 48시간 걸립니다
4. 반영되면 **Domain management → HTTPS → Verify DNS configuration** 후 인증서가 자동 발급됩니다 (Let's Encrypt, 무료)
5. **Primary domain** 을 하나로 지정하고 나머지는 리다이렉트되게 둡니다

---

## 5. 도메인 확정 후 파일 수정

아래 5곳의 `everyticket.kr` 을 실제 도메인으로 바꾸고 다시 push 하세요.

| 파일 | 위치 |
|---|---|
| `index.html` | `<link rel="canonical">` |
| `index.html` | `og:url`, `og:image` |
| `index.html` | JSON-LD 안의 `url`, `image` |
| `robots.txt` | `Sitemap:` 줄 |
| `sitemap.xml` | `<loc>` |
| `netlify.toml` | www 리다이렉트 (주석 해제 후 도메인 수정) |

---

## 6. 구글 검색 등록 (Search Console)

1. [search.google.com/search-console](https://search.google.com/search-console) 접속
2. **속성 추가 → 도메인** 선택 후 도메인 입력
3. 표시되는 **TXT 레코드**를 도메인 DNS에 추가 → **확인**
4. 좌측 **Sitemaps** → `sitemap.xml` 입력 후 제출
5. 상단 검색창에 사이트 주소를 넣고 **색인 생성 요청** 클릭

첫 노출까지 보통 **3일~2주** 걸립니다. `site:everyticket.kr` 로 검색하면 색인 여부를 확인할 수 있습니다.

---

## 7. 네이버 검색 등록 (한국 고객이면 필수)

1. [searchadvisor.naver.com](https://searchadvisor.naver.com) 접속
2. **웹마스터도구 → 사이트 등록** → 소유확인 (HTML 태그 방식이 가장 쉬움)
   - 발급받은 `<meta name="naver-site-verification" ...>` 을 `index.html` 의 `<head>` 안에 붙여넣고 재배포
3. **요청 → 사이트맵 제출** 에 `https://도메인/sitemap.xml` 입력
4. **웹페이지 수집** 에 메인 주소 입력

다음 카카오는 [webmaster.daum.net](https://webmaster.daum.net) 에서 동일하게 등록합니다.

---

## 8. 검색 순위를 올리는 실질적인 방법

검색 등록만으로는 상위에 뜨지 않습니다. 아래가 실제로 효과가 큽니다.

- **공연별 페이지를 따로 만들기** — "세븐틴 콘서트 대리티켓팅" 처럼 검색어와 정확히 맞는 페이지가 있어야 상위에 뜹니다. 원페이지 하나로는 한계가 있습니다.
- **성공내역을 꾸준히 업데이트** — 새 글이 계속 올라오는 사이트를 구글이 선호합니다.
- **네이버 블로그/카페에서 사이트로 링크** — 한국 시장에서는 이게 유입의 절대다수입니다.
- **Google Business Profile 등록** — 지역명 검색에 노출됩니다.
- **페이지 속도 유지** — 현재 이미지가 1개뿐이라 이미 빠릅니다. 이미지를 추가할 땐 WebP로 변환하세요.

---

## 9. 배포 후 점검

- [ ] `https://도메인` 접속 시 자물쇠(HTTPS) 표시 확인
- [ ] 휴대폰에서 열어 하단 카카오톡 버튼 동작 확인
- [ ] **카카오톡 채널 링크를 실제 주소로 교체했는지 확인** (현재 임시 상태)
- [ ] 푸터 사업자등록번호 입력
- [ ] `https://도메인/sitemap.xml`, `https://도메인/robots.txt` 정상 표시 확인
- [ ] 카카오톡에 링크를 보내 미리보기 이미지가 뜨는지 확인

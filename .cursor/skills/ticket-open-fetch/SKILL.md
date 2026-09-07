---
name: ticket-open-fetch
description: >-
  Fetch concert/fanmeeting ticket-open listings and product details from
  Interpark, Ticketlink, Melon, and Yes24 using APIs only. Use when the user
  asks for 오픈예정, 접수중 공연, 인기 공연, 티켓오픈, or to update EveryTicket show cards.
---

# 티켓 오픈 · 공연 정보 조회

브라우저 탭을 오래 붙잡지 말고, 링크만으로 공연 정보를 가져와라.
사이트마다 페이지가 SPA라 HTML만 받으면 빈 껍데기다. 아래 방법으로 처리한다.

- Chrome dump-dom은 쓰지 않는다. API·Ajax만 쓴다.
- 멜론 빈 목록은 날짜/ID가 빠지니, 조회 500+만 schText로 한 번 더 검색한다.
- 예스24 공지 상세는 https://m.ticket.yes24.com/Notice/{id} 를 쓴다.

## 공통

- 필요한 것: 공연명, 아티스트, 장소, 날짜/회차, 가격, 좌석배치도(구역명)
- 좌석도에 없는 구역은 추측하지 않는다
- 가져온 뒤 채팅에 바로 보여준다

## 인터파크 / 놀티켓 (tickets.interpark.com/goods/{코드})

브라우저 없이 API 호출.

GET https://api-ticketfront.interpark.com/v1/goods/{코드}/summary
Referer: https://tickets.interpark.com/

여기서 공연명, 장소, 기간, 시간, 가격, 상세이미지 URL이 나온다.
상세이미지(좌석도)는 contentHtml 안의 ticketimage.interpark.com 주소를 받아 본다.

오픈예정 목록:

GET https://tickets.interpark.com/api/open-notice/notice-list?sorting=OPEN_ASC&goodsGenre=CONCERT&goodsRegion=ALL&pageSize=50&offset=0
Referer: https://tickets.interpark.com/contents/notice
Accept: application/json

sorting은 OPEN_ASC (소문자 open 불가)
응답 필드: title, openDateStr, viewCount, isHot, goodsCode, noticeId, venueName
예매링크: https://tickets.interpark.com/goods/{goodsCode}

## 티켓링크 (ticketlink.co.kr)

오픈예정 목록:

GET https://www.ticketlink.co.kr/help/getNoticeList?page=1&noticeCategoryCode=TICKET_OPEN&title=&sortCode=OPEN_DATE

오픈예정순은 sortCode=OPEN_DATE, 등록순은 REGISTE_DATE
page=1,2,3 까지 보고, 등록순(REGISTE_DATE)도 한 번 더 본다.
공지 링크: https://www.ticketlink.co.kr/help/notice/{noticeId}
상품 링크: https://www.ticketlink.co.kr/product/{productId}
productId가 있으면 상품 링크, 없으면 공지 링크.

## 멜론티켓 (ticket.melon.com)

오픈소식 목록:

GET https://ticket.melon.com/csoon/ajax/listTicketOpen.htm?orderType=2&pageIndex=1&schGcode=GENRE_CON&schText=&schDt=
X-Requested-With: XMLHttpRequest

orderType=2 가 오픈일순
장르: GENRE_CON 콘서트, GENRE_FAN 팬미팅, GENRE_ALL 전체
상세: https://ticket.melon.com/csoon/detail.htm?csoonId={id}
공연페이지: https://ticket.melon.com/performance/index.htm?prodId={id}
아직 예매 전이면 csoon 상세 링크를 쓴다.

빈 목록은 날짜/ID가 빠지니, 조회 500+만 제목으로 schText 검색을 한 번 더 한다.
예: ...&schText=SUMIN&schDt=

## 예스24 (ticket.yes24.com)

공연페이지는 서버 렌더라 WebFetch만으로 기본정보가 나온다.
주소: https://ticket.yes24.com/Perf/{번호}

오픈예정 목록 (오픈일순 order=2):

POST https://ticket.yes24.com/New/Notice/Ajax/axList.aspx
data: page=1&size=40&genre=&province=&order=2&searchType=All&searchText=

상세:
POST https://ticket.yes24.com/New/Notice/Ajax/axRead.aspx
data: bId={공지ID}&genre=&province=&order=2  (id 가 아니라 bId)

예스24 공지 상세는 https://m.ticket.yes24.com/Notice/{id} 를 쓴다.

예매 번호는 GetSiteDetailURL(번호) 안에 있다.
예매링크: https://ticket.yes24.com/Perf/{번호}
없으면 공지 링크: https://m.ticket.yes24.com/Notice/{공지ID}

## 오픈예정 정리 규칙

- 일주일 이내 오픈만 (당일 포함)
- 콘서트/팬미팅 위주 (뮤지컬·연극·전시는 제외)
- 조회수 500 미만은 제외
- 출력 형식만:
예매사이트 · 날짜 · 공연명
링크
- 표 만들지 말 것
- 오픈일순으로 정렬
- 요청한 사이트만 보여 준다
- b.stage는 오픈예정에 섞지 않는다

## 에브리티켓 사이트 카드

접수중 카드 형식:

```html
<article class="show" data-status="open">
  <span class="show__badge show__badge--open">접수중</span>
  <h3>공연명</h3>
  <p class="show__meta">장소 · 날짜</p>
  <a class="show__btn" href="#contact">대행 신청</a>
</article>
```

# Build assets/data/shows.json from Interpark / Ticketlink / Yes24 / Melon APIs.
# Concert/fanmeeting + music festival, view>=500 or isHot, keep until concert end, no max count.
# Already-on-sale popular shows are pinned or taken from genre/concert (hot on-sale).
# Keep rule: isHot or view>=500. Do not limit to festivals-only.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
$outPath = 'C:\Users\aaa\Projects\everyticket\assets\data\shows.json'
$today = (Get-Date).Date
$openEnd = $today.AddDays(8).AddSeconds(-1)

$rxKeep = New-Object regex '\uCF58\uC11C\uD2B8|\uD32C\uBBF8\uD305|FANMEETING|FAN[\s-]?MEETING|FAN[\s-]?CON|\uD398\uC2A4\uD2F0\uBC8C|FESTIVAL|FESTA|\uCD95\uC81C|LIVE|TOUR|\uC5B4\uC6CC\uC988|\uC1FC\uCF00\uC774\uC2A4|\uB0B4\uD55C|\uB2E8\uB3C5\uACF5\uC5F0|PARTY|\uD32C\uCF58|\uC6CC\uD130\uBC24|WATERBOMB|\uD760\uB061|\bEDC\b|CassCool', 'IgnoreCase'
$rxSkip = New-Object regex '\uBBA4\uC9C0\uCEEC|\uC5F0\uADF9|\uC624\uD398\uB77C|\uBC1C\uB808|\uC804\uC2DC|\uC544\uB3D9|\uD074\uB798\uC2DD|Classic Mode|\uC2A4\uD3EC\uCE20|\uC57C\uAD6C|\uCD95\uAD6C|\uB9AC\uB529', 'IgnoreCase'
$rxKeepStrong = New-Object regex '\uCF58\uC11C\uD2B8|\uD32C\uBBF8\uD305|FANMEETING|FAN[\s-]?MEETING|FAN[\s-]?CON|\uD398\uC2A4\uD2F0\uBC8C|FESTIVAL|FESTA|\uCD95\uC81C|\uD32C\uCF58|\uC6CC\uD130\uBC24|WATERBOMB|\uD760\uB061|\bEDC\b', 'IgnoreCase'
$rxSkipFest = New-Object regex '\uBD88\uAF43|\uD478\uB4DC\uD398\uC2A4\uD2F0\uBC8C|\uB9E5\uC8FC\uCD95\uC81C|\uC601\uD654\uC81C|\uAF43\uCD95\uC81C|\uBE5B\uCD95\uC81C|\uD328\uC158|\uC6F9\uD22C|\uAC8C\uC784\uD398\uC2A4\uD2F0\uBC8C|\uACFC\uD559\uCD95\uC81C|\uCC45\uCD95\uC81C|\uBB38\uD559\uCD95\uC81C|\uB9AC:\uBC14\uC6B4\uB4DC', 'IgnoreCase'
$rxFestOrFan = New-Object regex '\uD398\uC2A4\uD2F0\uBC8C|FESTIVAL|FESTA|\uCD95\uC81C|\uC6CC\uD130\uBC24|WATERBOMB|\uD760\uB061|\bEDC\b|CassCool|\uD32C\uBBF8\uD305|FANMEETING|FAN[\s-]?MEETING|FAN[\s-]?CON|\uD32C\uCF58', 'IgnoreCase'
$rxOpenSuffix = [regex]'\s*\uD2F0\uCF13\s*\uC624\uD508(\uACF5\uC9C0)?\s*\uC548\uB0B4$'
$rxSolo = [regex]'^\uB2E8\uB3C5\uD310\uB9E4\s*'
$rxCase = [regex]'\s*[-\u2015]?\s*CASE\s*No\.?\s*\d+'

$rxSkipAlways = New-Object regex '\uBC1C\uB808|\uAD50\uD5A5|\uD310\uC18C\uB9AC|\uB3D9\uD654|\uD1A0\uD06C\uCF58\uC11C\uD2B8|\uD1A0\uD06C\s*\uCF58\uC11C\uD2B8|\uD1A0\uD06C\s*&\s*\uB77C\uC774\uBE0C|\uD1A0\uD06C\uC1FC|\uB178\uCF58\uC1FC|\uBBA4\uC9C1\s*\uD1A0\uD06C|\uD504\uB86C\uB098\uB4DC|\uBBA4\uC9C1\s*\uD398\uC5B4|\uC1FC\uCF00\uC774\uC2A4|\uBC14\uB85C\uD06C|\uAE08\uC694\uC74C\uC545\uD68C', 'IgnoreCase'

function Test-ConcertOrFan([string]$Title) {
  if ([string]::IsNullOrWhiteSpace($Title)) { return $false }
  if ($Title -match $rxSkipAlways) { return $false }
  if ($Title -match $rxSkipFest) { return $false }
  if ($Title -match $rxSkip -and $Title -notmatch $rxKeepStrong) { return $false }
  return ($Title -match $rxKeep)
}

function Test-FestOrFan([string]$Title) {
  if (-not (Test-ConcertOrFan $Title)) { return $false }
  return ($Title -match $rxFestOrFan)
}

function Test-ViewOk([int]$View, [bool]$Hot, [string]$Title) {
  if ($Hot) { return $true }
  if ($View -ge 500) { return $true }
  return $false
}

function Get-ViewCount($Raw) {
  if ($null -eq $Raw) { return 0 }
  if ($Raw -is [array]) { $Raw = $Raw[0] }
  try { return [int]$Raw } catch { return 0 }
}

function Clean-Title([string]$Title) {
  $t = [Net.WebUtility]::HtmlDecode(([string]$Title))
  $t = [regex]::Replace($t, '<[^>]+>', ' ')
  $t = [regex]::Replace($t, '\[(\uB2E8\uB3C5\uD310\uB9E4|\uB2E8\uB3C5\uD310\uB9E4\s*)\]', '')
  $t = [regex]::Replace($t, $rxSolo, '')
  $t = [regex]::Replace($t, '\s*\uCD94\uAC00 \uC624\uD508 \uC548\uB0B4', '')
  $t = [regex]::Replace($t, $rxOpenSuffix, '')
  $t = [regex]::Replace($t, $rxCase, '')
  $t = [regex]::Replace($t, '\s+', ' ').Trim(' ', '-', [char]0x2013)
  return $t.Trim()
}

function Group-Key([string]$Title) {
  $t = (Clean-Title $Title).ToLowerInvariant()
  $t = [regex]::Replace($t, '[\[\]\(\)\<\>\{\}\u3008\u3009\uFF3B\uFF3D\u300C\u300D\u300E\u300F"''\u201C\u201D\u3008\u3009]', '')
  $t = [regex]::Replace($t, '\uac00\uc744\ub0c4\uc0c8|with friends|\ucd94\uac00 \uc624\ud508 \uc548\ub0b4|\uc5bc\ub9ac\ubc84\ub4dc', '')
  $t = [regex]::Replace($t, '\s+', ' ').Trim()
  return $t
}

function Fmt-Meta([string]$Place, [datetime]$Start, [datetime]$End) {
  $place = Short-Place $Place
  $a = '{0}.{1}' -f $Start.Month, $Start.Day
  $dot = [char]0x00B7
  if ($End.Date -gt $Start.Date) {
    $b = '{0}.{1}' -f $End.Month, $End.Day
    return ($place + ' ' + $dot + ' ' + $a + '-' + $b)
  }
  return ($place + ' ' + $dot + ' ' + $a)
}

function Short-Place([string]$Place) {
  $p = [regex]::Replace(([string]$Place), '^\uFEFF', '')
  $p = [regex]::Replace($p, '\s+', ' ').Trim()
  if ($p.Length -le 40) { return $p }
  $m = [regex]::Match($p, '([^\s]+(?:\uD640|\uADF9\uC7A5|\uC544\uB808\uB098|\uC13C\uD130|\uB3D4|\uACF5\uC5F0\uC7A5|HALL|Hall))$')
  if ($m.Success) { return $m.Groups[1].Value.Trim() }
  $parts = $p -split ' '
  return $parts[-1]
}

function Parse-Ymd([string]$s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return $null }
  $m = [regex]::Match($s, '(20\d{2})\D+(\d{1,2})\D+(\d{1,2})')
  if (-not $m.Success) {
    $m = [regex]::Match($s, '^(20\d{2})(\d{2})(\d{2})$')
  }
  if (-not $m.Success) { return $null }
  try { return Get-Date -Year ([int]$m.Groups[1].Value) -Month ([int]$m.Groups[2].Value) -Day ([int]$m.Groups[3].Value) } catch { return $null }
}

function Parse-YmdCompact([string]$s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return $null }
  $m = [regex]::Match($s, '^(20\d{2})(\d{2})(\d{2})')
  if (-not $m.Success) { return $null }
  try { return Get-Date -Year ([int]$m.Groups[1].Value) -Month ([int]$m.Groups[2].Value) -Day ([int]$m.Groups[3].Value) } catch { return $null }
}

function Json-Str([string]$s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return '' }
  try { return (('"' + $s + '"') | ConvertFrom-Json) } catch { return $s.Replace('\/', '/') }
}

Add-Type -AssemblyName System.Net.Http
$handler = New-Object System.Net.Http.HttpClientHandler
$handler.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
$client = New-Object System.Net.Http.HttpClient($handler)
$client.Timeout = [TimeSpan]::FromSeconds(20)
[void]$client.DefaultRequestHeaders.TryAddWithoutValidation('User-Agent', $ua)

function Get-Http([string]$Url, [hashtable]$Hdrs) {
  $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, $Url)
  foreach ($k in $Hdrs.Keys) { [void]$req.Headers.TryAddWithoutValidation($k, $Hdrs[$k]) }
  $resp = $client.SendAsync($req).GetAwaiter().GetResult()
  $bytes = $resp.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
  $txt = [Text.Encoding]::UTF8.GetString($bytes)
  return @{ Ok = $resp.IsSuccessStatusCode; Status = [int]$resp.StatusCode; Text = $txt; Bytes = $bytes }
}

function Test-PosterOk([string]$Url) {
  if ([string]::IsNullOrWhiteSpace($Url)) { return $false }
  if ($Url.StartsWith('//')) { $Url = 'https:' + $Url }
  try {
    $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Head, $Url)
    [void]$req.Headers.TryAddWithoutValidation('Referer', 'https://tickets.interpark.com/')
    $resp = $client.SendAsync($req).GetAwaiter().GetResult()
    $code = [int]$resp.StatusCode
    if ($code -eq 405 -or $code -eq 403) { return $true }
    return $resp.IsSuccessStatusCode
  } catch { return $false }
}

$cands = New-Object System.Collections.Generic.List[object]

# ----- Interpark (CONCERT + ALL, fan meeting 포함) -----
$ipkSeen = @{}
$ipkItems = @()
foreach ($genre in @('CONCERT', 'ALL')) {
  $ipk = Get-Http ("https://tickets.interpark.com/api/open-notice/notice-list?sorting=OPEN_ASC&goodsGenre={0}&goodsRegion=ALL&pageSize=50&offset=0" -f $genre) @{
    Referer = 'https://tickets.interpark.com/contents/notice'
    Accept = 'application/json'
  }
  try {
    foreach ($x in @($ipk.Text | ConvertFrom-Json)) {
      $nid = [string]$x.noticeId
      if ($ipkSeen.ContainsKey($nid)) { continue }
      $ipkSeen[$nid] = $true
      $ipkItems += $x
    }
  } catch {}
}
foreach ($x in $ipkItems) {
  $view = Get-ViewCount $x.viewCount
  $hot = [bool]$x.isHot
  $title = [string]$x.title
  if (-not (Test-ViewOk $view $hot $title)) { continue }
  if (-not (Test-ConcertOrFan $title)) { continue }
  $open = $null
  if ($x.openDateStr) { try { $open = [datetime]$x.openDateStr } catch {} }
  $poster = [string]$x.posterImageUrl
  $cands.Add([pscustomobject]@{
    Source = 'interpark'; View = $view; Hot = $hot
    Title = $title; Place = [string]$x.venueName; Open = $open
    Code = [string]$x.goodsCode; NoticeId = [string]$x.noticeId; Poster = $poster
  })
}

# ----- Ticketlink -----
$tlinkSeen = @{}
$tlinkUrls = @(
  'https://www.ticketlink.co.kr/help/getNoticeList?page=1&noticeCategoryCode=TICKET_OPEN&title=&sortCode=OPEN_DATE',
  'https://www.ticketlink.co.kr/help/getNoticeList?page=2&noticeCategoryCode=TICKET_OPEN&title=&sortCode=OPEN_DATE',
  'https://www.ticketlink.co.kr/help/getNoticeList?page=3&noticeCategoryCode=TICKET_OPEN&title=&sortCode=OPEN_DATE',
  'https://www.ticketlink.co.kr/help/getNoticeList?page=4&noticeCategoryCode=TICKET_OPEN&title=&sortCode=OPEN_DATE',
  'https://www.ticketlink.co.kr/help/getNoticeList?page=5&noticeCategoryCode=TICKET_OPEN&title=&sortCode=OPEN_DATE',
  'https://www.ticketlink.co.kr/help/getNoticeList?page=1&noticeCategoryCode=TICKET_OPEN&title=&sortCode=REGISTE_DATE',
  'https://www.ticketlink.co.kr/help/getNoticeList?page=2&noticeCategoryCode=TICKET_OPEN&title=&sortCode=REGISTE_DATE',
  'https://www.ticketlink.co.kr/help/getNoticeList?page=3&noticeCategoryCode=TICKET_OPEN&title=&sortCode=REGISTE_DATE'
)
foreach ($u in $tlinkUrls) {
  $r = Get-Http $u @{ Referer = 'https://www.ticketlink.co.kr/help/notice'; Accept = 'application/json' }
  try { $obj = $r.Text | ConvertFrom-Json } catch { continue }
  foreach ($it in @($obj.result.result)) {
    $nid = [string]$it.noticeId
    if ($tlinkSeen.ContainsKey($nid)) { continue }
    $tlinkSeen[$nid] = $true
    $view = Get-ViewCount $it.viewCount
    $title = Clean-Title ([string]$it.title)
    if (-not (Test-ViewOk $view $false $title)) { continue }
    if ([int]$it.subCategoryId -in 16, 18 -and $title -notmatch $rxKeepStrong) { continue }
    if (-not (Test-ConcertOrFan $title)) { continue }
    $open = $null
    if ($it.ticketOpenDatetime) { try { $open = [datetime]$it.ticketOpenDatetime } catch {} }
    $img = [string]$it.imagePath
    if ($img.StartsWith('http://')) { $img = 'https://' + $img.Substring(7) }
    $cands.Add([pscustomobject]@{
      Source = 'ticketlink'; View = $view; Hot = $false
      Title = $title; Place = [string]$it.placeName; Open = $open
      Code = [string]$it.productId; NoticeId = $nid; Html = [string]$it.content; Poster = $img
    })
  }
}

# ----- Yes24 -----
$yesSeen = @{}
$rxYes = [regex]::new('(?s)<tr>\s*<td>\s*(?<cat>[^<]+?)\s*</td>\s*<td>\s*<a href="#id=(?<id>\d+)">(?<title>.*?)</a>\s*</td>\s*<td>\s*(?<date>.*?)</td>\s*<td>\s*(?<view>[\d,]+)\s*</td>', 'IgnoreCase')
foreach ($yesPage in 1..3) {
  foreach ($yesOrder in @(2, 1)) {
    $yesBody = 'page={0}&size=40&genre=&province=&order={1}&searchType=All&searchText=' -f $yesPage, $yesOrder
    $yesContent = New-Object System.Net.Http.StringContent($yesBody, [Text.Encoding]::ASCII, 'application/x-www-form-urlencoded')
    $yesReq = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, 'https://ticket.yes24.com/New/Notice/Ajax/axList.aspx')
    $yesReq.Content = $yesContent
    [void]$yesReq.Headers.TryAddWithoutValidation('Referer', 'https://ticket.yes24.com/New/Notice/NoticeList.aspx')
    [void]$yesReq.Headers.TryAddWithoutValidation('X-Requested-With', 'XMLHttpRequest')
    [void]$yesReq.Headers.TryAddWithoutValidation('Accept', 'text/html, */*; q=0.01')
    $yesResp = $client.SendAsync($yesReq).GetAwaiter().GetResult()
    $yesBytes = $yesResp.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
    $yesHtml = [Text.Encoding]::UTF8.GetString($yesBytes)
    if ($yesHtml -notmatch '#id=') { $yesHtml = [Text.Encoding]::GetEncoding(949).GetString($yesBytes) }
    foreach ($m in $rxYes.Matches($yesHtml)) {
      $nid = $m.Groups['id'].Value
      if ($yesSeen.ContainsKey($nid)) { continue }
      $yesSeen[$nid] = $true
      $title = Clean-Title $m.Groups['title'].Value
      $view = Get-ViewCount ($m.Groups['view'].Value -replace ',', '')
      if (-not (Test-ViewOk $view $false $title)) { continue }
      if (-not (Test-ConcertOrFan $title)) { continue }
      $open = $null
      $dm = [regex]::Match($m.Groups['date'].Value, '(?<y>\d{4})\.(?<mo>\d{2})\.(?<d>\d{2})\([^)]*\)\s*(?<hm>\d{2}:\d{2})')
      if ($dm.Success) {
        try { $open = [datetime]::ParseExact(($dm.Groups['y'].Value + '-' + $dm.Groups['mo'].Value + '-' + $dm.Groups['d'].Value + ' ' + $dm.Groups['hm'].Value), 'yyyy-MM-dd HH:mm', $null) } catch {}
      }
      $cands.Add([pscustomobject]@{
        Source = 'yes24'; View = $view; Hot = $false
        Title = $title; Place = ''; Open = $open
        Code = ''; NoticeId = $nid; Poster = ''
      })
    }
  }
}

# ----- Melon -----
function Get-Melon([string]$Gcode, [string]$Sch, [string]$Dt) {
  $url = 'https://ticket.melon.com/csoon/ajax/listTicketOpen.htm?orderType=2&pageIndex=1&schGcode={0}&schText={1}&schDt={2}' -f $Gcode, [Uri]::EscapeDataString($Sch), $Dt
  return (Get-Http $url @{
    Referer = 'https://ticket.melon.com/csoon/index.htm'
    Accept = 'application/json, text/javascript, */*; q=0.01'
    'X-Requested-With' = 'XMLHttpRequest'
  })
}
$melonOk = $false
foreach ($g in @('GENRE_CON','GENRE_FAN','GENRE_ALL')) {
  $mr = Get-Melon $g '' ''
  if (-not $mr.Ok -or $mr.Text.Length -lt 20) { continue }
  $melonOk = $true
  try { $mj = $mr.Text | ConvertFrom-Json } catch { continue }
  $list = $mj.ticketOpenList; if (-not $list) { $list = $mj.list }; if (-not $list) { $list = $mj }
  foreach ($it in @($list)) {
    $title = Clean-Title ([string]($it.title + $it.perfName + $it.schName))
    $view = 0
    foreach ($vk in @('viewCnt','viewCount','hitCnt','readCnt')) {
      if ($it.$vk) { $view = Get-ViewCount $it.$vk; break }
    }
    if (-not (Test-ViewOk $view $false $title)) { continue }
    if (-not (Test-ConcertOrFan $title)) { continue }
    $cands.Add([pscustomobject]@{
      Source = 'melon'; View = $view; Hot = $false
      Title = $title; Place = [string]$it.placeName; Open = $null
      Code = [string]($it.prodId + $it.performanceId); NoticeId = [string]$it.csoonId
    })
  }
}

# ----- already on sale (open-notice에서 빠진 인기작) -----
$pins = @(
  @{ Source='interpark'; View=99999; Hot=$true; Title='2026 임영웅 콘서트 [IM HERO - THE STADIUM 2]'; Place='고양종합운동장 주경기장'; Open=[datetime]'2026-07-16'; Code='26009868'; NoticeId=''; Poster='https://ticketimage.interpark.com/Play/image/large/26/26009868_p.gif'; Html=''; StartPin=[datetime]'2026-09-04'; EndPin=[datetime]'2026-09-06' },
  @{ Source='interpark'; View=98000; Hot=$true; Title='2026 PLAVE World Tour [KEEP IT MANIC] in Incheon'; Place='인천문학경기장 주경기장'; Open=[datetime]'2026-06-17'; Code='26008189'; NoticeId=''; Poster='https://ticketimage.interpark.com/Play/image/large/26/26008189_p.gif'; Html=''; StartPin=[datetime]'2026-09-12'; EndPin=[datetime]'2026-09-13' },
  @{ Source='melon'; View=97000; Hot=$true; Title='NCT 127 5TH TOUR [NEO CITY : SEOUL - THE REDLINE]'; Place='올림픽공원 KSPO DOME'; Open=[datetime]'2026-07-21'; Code=''; NoticeId=''; Poster='https://csearch-phinf.pstatic.net/20260730_257/1785395135926hr6jb_PNG/269_image_url_1785395135899.png'; Html=''; StartPin=[datetime]'2026-09-18'; EndPin=[datetime]'2026-09-20' },
  @{ Source='melon'; View=96000; Hot=$true; Title='2026 영탁 단독 콘서트 [TAK SHOW5]'; Place='고려대학교 화정체육관'; Open=[datetime]'2026-08-12'; Code=''; NoticeId=''; Poster='https://cdnticket.melon.co.kr/resource/image/upload/ticketopen/2026/08/20260819171857fc6fbabe-4ef6-4a45-bc71-615faf521c7a.jpg'; Html=''; StartPin=[datetime]'2026-10-03'; EndPin=[datetime]'2026-10-05' },
  @{ Source='interpark'; View=95000; Hot=$true; Title='2026 성시경 콘서트'; Place='올림픽공원 88잔디마당'; Open=[datetime]'2026-07-24'; Code='26010248'; NoticeId='14655'; Poster='https://ticketimage.interpark.com/Play/image/large/26/26010248_p.gif'; Html=''; StartPin=[datetime]'2026-09-05'; EndPin=[datetime]'2026-09-06' },
  @{ Source='interpark'; View=94000; Hot=$true; Title='2026 &TEAM [BLAZE THE WAY] ENCORE'; Place='올림픽공원 KSPO DOME'; Open=[datetime]'2026-08-10'; Code='26011092'; NoticeId=''; Poster='https://ticketimage.interpark.com/Play/image/large/26/26011092_p.gif'; Html=''; StartPin=[datetime]'2026-10-03'; EndPin=[datetime]'2026-10-04' },
  @{ Source='yes24'; View=93000; Hot=$true; Title='2026 ifeye 1st APAC TOUR [If I] IN SEOUL'; Place='예스24 원더로크홀'; Open=[datetime]'2026-08-21'; Code=''; NoticeId='18354'; Poster='https://tkfile.yes24.com/upload2/PerfBlog/202608/20260819/20260819-59806.jpg'; Html=''; StartPin=[datetime]'2026-09-19'; EndPin=[datetime]'2026-09-19' },
  @{ Source='ticketlink'; View=12384; Hot=$true; Title='2026 이창섭 단독 콘서트'; Place='티켓링크 라이브 아레나 (핸드볼경기장)'; Open=[datetime]'2026-08-26'; Code='64969'; NoticeId=''; Poster='https://image.toast.com/aaaaab/ticketlink/TKL_2/cs_poster_0813.jpg'; Html=''; StartPin=[datetime]'2026-10-09'; EndPin=[datetime]'2026-10-11' },
  @{ Source='interpark'; View=11971; Hot=$true; Title='2026 KO1KEYZ 1ST FAN MEETING IN SEOUL'; Place='블루스퀘어 우리WON뱅킹홀'; Open=[datetime]'2026-09-02'; Code='26012046'; NoticeId='14922'; Poster='https://ticketimage.interpark.com/TicketImage/notice_poster/20/2026081213524848.jpg'; Html=''; StartPin=[datetime]'2026-11-07'; EndPin=[datetime]'2026-11-08' },
  @{ Source='yes24'; View=11486; Hot=$true; Title='2026-27 TAEMIN WORLD TOUR LiMiNaL in SEOUL'; Place='잠실실내체육관'; Open=[datetime]'2026-08-10'; Code=''; NoticeId='18266'; Poster='https://tkfile.yes24.com/upload2/PerfBlog/202608/20260807/20260807-59646_1.jpg'; Html=''; StartPin=[datetime]'2026-09-18'; EndPin=[datetime]'2026-09-20' }
)
foreach ($p in $pins) {
  $cands.Add([pscustomobject]$p)
}

# ----- Interpark 장르 인기(접수중 페스티벌·팬미팅) -----
$genreSeen = @{}
foreach ($c in $cands) {
  if ($c.Code) { $genreSeen[[string]$c.Code] = $true }
}
$genreHtml = Get-Http 'https://tickets.interpark.com/contents/genre/concert' @{
  Accept = 'text/html'
  Referer = 'https://tickets.interpark.com/'
}
if ($genreHtml.Ok) {
  $nx = [regex]::Match($genreHtml.Text, '<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', 'Singleline')
  if ($nx.Success) {
    try { $genreJson = $nx.Groups[1].Value | ConvertFrom-Json } catch { $genreJson = $null }
    $genreGoods = New-Object System.Collections.Generic.List[object]
    function Collect-GenreGoods($node) {
      if ($null -eq $node) { return }
      if ($node -is [string] -or $node -is [ValueType]) { return }
      if ($node -is [System.Management.Automation.PSCustomObject]) {
        $p = $node.PSObject.Properties
        if ($p['goodsCode'] -and $p['goodsName'] -and $p['playStartDate']) { [void]$genreGoods.Add($node) }
        foreach ($x in $p) { Collect-GenreGoods $x.Value }
        return
      }
      if ($node -is [System.Collections.IEnumerable]) {
        foreach ($x in $node) { Collect-GenreGoods $x }
      }
    }
    if ($genreJson) { Collect-GenreGoods $genreJson }
    $rank = 0
    foreach ($g in $genreGoods) {
      $code = [string]$g.goodsCode
      if (-not $code -or $genreSeen.ContainsKey($code)) { continue }
      $title = Clean-Title ([string]$g.goodsName)
      if ($title -match 'MD\uC0F5|\uD504\uB85C\uBAA8\uC158|\uC5BC\uB9AC\uBC84\uB4DC') { continue }
      if (-not (Test-ConcertOrFan $title)) { continue }
      $start = Parse-YmdCompact ([string]$g.playStartDate)
      $end = Parse-YmdCompact ([string]$g.playEndDate)
      if ($end -and $end.Date -lt $today) { continue }
      if ($start -and $start.Date -le $today) { continue }
      $genreSeen[$code] = $true
      $rank++
      $img = [string]$g.imageUrl
      if (-not $img) { $img = [string]$g.posterImageUrl }
      if ($img.StartsWith('http://')) { $img = 'https://' + $img.Substring(7) }
      $open = Parse-YmdCompact ([string]$g.startDate)
      $place = [string]$g.placeName
      $cands.Add([pscustomobject]@{
        Source = 'interpark'; View = (88000 - $rank); Hot = $true
        Title = $title; Place = $place; Open = $open
        Code = $code; NoticeId = ''; Poster = $img
        Html = ''; StartPin = $start; EndPin = $end
      })
    }
    Write-Host ('genre concert/fan/fest +' + $rank)
  }
}

# ----- details -----
function Get-IpkSummary([string]$Code) {
  $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, ("https://api-ticketfront.interpark.com/v1/goods/{0}/summary" -f $Code))
  [void]$req.Headers.TryAddWithoutValidation('Accept', 'application/json')
  [void]$req.Headers.TryAddWithoutValidation('Referer', 'https://tickets.interpark.com/')
  [void]$req.Headers.TryAddWithoutValidation('Origin', 'https://tickets.interpark.com')
  $resp = $client.SendAsync($req).GetAwaiter().GetResult()
  if (-not $resp.IsSuccessStatusCode) { return $null }
  $txt = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
  try { return ($txt | ConvertFrom-Json).data } catch { return $null }
}

function Get-YesRead([string]$Bid) {
  $body = "bId=$Bid&genre=&province=&order=2"
  $content = New-Object System.Net.Http.StringContent($body, [Text.Encoding]::ASCII, 'application/x-www-form-urlencoded')
  $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, 'https://ticket.yes24.com/New/Notice/Ajax/axRead.aspx')
  $req.Content = $content
  [void]$req.Headers.TryAddWithoutValidation('Referer', 'https://ticket.yes24.com/New/Notice/NoticeMain.aspx')
  [void]$req.Headers.TryAddWithoutValidation('X-Requested-With', 'XMLHttpRequest')
  $resp = $client.SendAsync($req).GetAwaiter().GetResult()
  $bytes = $resp.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
  $html = [Text.Encoding]::UTF8.GetString($bytes)
  if ($html -notmatch '\uACF5\uC5F0|\uD2F0\uCF13|\uC608\uB9E4') { $html = [Text.Encoding]::GetEncoding(949).GetString($bytes) }
  return $html
}

function Perf-Dates-FromText([string]$Text) {
  $plain = [Net.WebUtility]::HtmlDecode($Text)
  $plain = [regex]::Replace($plain, '<br\s*/?>', "`n", 'IgnoreCase')
  $plain = [regex]::Replace($plain, '</p>', "`n", 'IgnoreCase')
  $plain = [regex]::Replace($plain, '<[^>]+>', ' ')
  $rxSkipLine = [regex]'\uD2F0\uCF13\s*\uC624\uD508|\uC120\uC608\uB9E4|\uC608\uB9E4\s*\uC624\uD508|\uC624\uD508\s*\uC77C\uC2DC|\uC811\uC218|\uC548\uB0B4\uC77C|\uB4F1\uB85D\uC77C'
  $rxPlayLine = [regex]'\uACF5\uC5F0\s*(\uC77C\uC2DC|\uAE30\uAC04|\uB0A0\uC9DC|\uC2DC\uAC04|\uC77C|\uAC1C\uC694)'
  $playLines = New-Object System.Collections.Generic.List[string]
  $allLines = New-Object System.Collections.Generic.List[string]
  $take = 0
  foreach ($line in ($plain -split "`n")) {
    $t = [regex]::Replace($line, '\s+', ' ').Trim()
    if (-not $t) { continue }
    if ($t -match $rxSkipLine) { continue }
    [void]$allLines.Add($t)
    if ($t -match $rxPlayLine) {
      $take = 8
      [void]$playLines.Add($t)
    } elseif ($take -gt 0) {
      [void]$playLines.Add($t)
      $take--
    }
  }
  function Collect-Dates([string]$Src) {
    $found = New-Object System.Collections.Generic.List[datetime]
    $year = 0
    foreach ($m in [regex]::Matches($Src, '(20\d{2})\s*[\.\uB144/\-]\s*(\d{1,2})\s*[\.\uC6D4/\-]\s*(\d{1,2})')) {
      $year = [int]$m.Groups[1].Value
      $d = Parse-Ymd $m.Value
      if ($d) { [void]$found.Add($d.Date) }
    }
    if ($year -gt 0) {
      foreach ($m in [regex]::Matches($Src, '(\d{1,2})\s*\uC6D4\s*(\d{1,2})\s*\uC77C')) {
        try { [void]$found.Add((Get-Date -Year $year -Month ([int]$m.Groups[1].Value) -Day ([int]$m.Groups[2].Value)).Date) } catch {}
      }
    }
    return @($found | Sort-Object -Unique)
  }
  $fromPlay = Collect-Dates ($playLines -join "`n")
  if ($fromPlay.Count -gt 0) { return $fromPlay }
  return (Collect-Dates ($allLines -join "`n"))
}

function Place-FromText([string]$Text) {
  $plain = [Net.WebUtility]::HtmlDecode($Text)
  $plain = [regex]::Replace($plain, '<[^>]+>', "`n")
  foreach ($line in ($plain -split "`n")) {
    $t = [regex]::Replace($line, '\s+', ' ').Trim()
    $m = [regex]::Match($t, '\uACF5\uC5F0\s*\uC7A5\uC18C\s*[:\uff1a]\s*(.+)$')
    if (-not $m.Success) { $m = [regex]::Match($t, '\uACF5\uC5F0\uC7A5\uC18C\s*[:\uff1a]\s*(.+)$') }
    if ($m.Success) {
      $p = $m.Groups[1].Value.Trim()
      $p = [regex]::Replace($p, '\s+', ' ')
      if ($p.Length -gt 2 -and $p.Length -lt 80) { return $p }
    }
  }
  return ''
}

# open date = presale (fanclub/membership) when the show has one, else general sale.
$rxPresale = [regex]'\uC120\uC608\uB9E4'

function Get-IpkPresale([string]$NoticeId) {
  if (-not $NoticeId) { return $null }
  $r = Get-Http ("https://tickets.interpark.com/contents/notice/detail/$NoticeId") @{ Accept = 'text/html'; 'Accept-Language' = 'ko-KR,ko;q=0.9' }
  if (-not $r.Ok) { return $null }
  $m = [regex]::Match($r.Text, '<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', 'Singleline')
  if (-not $m.Success) { return $null }
  $dm = [regex]::Match($m.Groups[1].Value, '"ticketDates":\[(.*?)\],"relatedNotices"', 'Singleline')
  if (-not $dm.Success) { return $null }
  $best = $null
  foreach ($e in [regex]::Matches($dm.Groups[1].Value, '"openName":"(.*?)","openDateStr":"(.*?)"')) {
    if ($e.Groups[1].Value -notmatch $rxPresale) { continue }
    try { $d = [datetime]$e.Groups[2].Value } catch { continue }
    if (-not $best -or $d -lt $best) { $best = $d }
  }
  return $best
}

function Get-PresaleFromText([string]$Text) {
  if (-not $Text) { return $null }
  $plain = [Net.WebUtility]::HtmlDecode($Text)
  $plain = [regex]::Replace($plain, '<br\s*/?>', "`n", 'IgnoreCase')
  $plain = [regex]::Replace($plain, '<[^>]+>', ' ')
  $best = $null
  foreach ($line in ($plain -split "`n")) {
    $l = [regex]::Replace($line, '\s+', ' ').Trim()
    if ($l -notmatch $rxPresale) { continue }
    if ($l -match '\uC778\uC99D') { continue }  # skip verification windows
    $m = [regex]::Match($l, '(20\d{2})\s*[\.\uB144/\-]\s*(\d{1,2})\s*[\.\uC6D4/\-]\s*(\d{1,2})')
    if (-not $m.Success) { continue }
    try { $d = Get-Date -Year ([int]$m.Groups[1].Value) -Month ([int]$m.Groups[2].Value) -Day ([int]$m.Groups[3].Value) } catch { continue }
    if (-not $best -or $d -lt $best) { $best = $d.Date }
  }
  return $best
}

$resolved = New-Object System.Collections.Generic.List[object]
foreach ($c in $cands) {
  $title = Clean-Title $c.Title
  $title = [regex]::Replace($title, '^\uFEFF', '')
  $place = [regex]::Replace(([string]$c.Place), '^\uFEFF', '').Trim()
  $start = $null
  $end = $null
  $sum = $null
  $poster = [string]$c.Poster
  $openUse = $c.Open
  $presale = $null

  if ($c.Source -eq 'interpark' -and $c.Code) {
    $sum = Get-IpkSummary $c.Code
    if ($sum) {
      if ($sum.goodsName) { $title = Clean-Title ([string]$sum.goodsName) }
      if ($sum.placeName) { $place = [string]$sum.placeName }
      $start = Parse-Ymd ([string]$sum.playStartDate)
      $end = Parse-Ymd ([string]$sum.playEndDate)
    }
  }
  if ($c.Source -eq 'interpark' -and $c.NoticeId) {
    $presale = Get-IpkPresale ([string]$c.NoticeId)
  }
  elseif ($c.Source -eq 'ticketlink') {
    $dates = Perf-Dates-FromText ([string]$c.Html)
    if ($dates.Count -ge 1) {
      $start = $dates[0]
      $end = $dates[$dates.Count - 1]
      if ($dates.Count -gt 1) {
        $sorted = @($dates | Sort-Object)
        $start = $sorted[0]
        $end = $sorted[$sorted.Count - 1]
      }
    }
    $p2 = Place-FromText ([string]$c.Html)
    if ($p2) { $place = $p2 }
    $presale = Get-PresaleFromText ([string]$c.Html)
    if (-not $poster) {
      $im = [regex]::Match([string]$c.Html, 'src=["'']((?:https?:)?//[^"'']+\.(?:jpg|jpeg|png|gif|webp))', 'IgnoreCase')
      if ($im.Success) { $poster = $im.Groups[1].Value }
    }
    if (-not $poster -and $c.Code) {
      $pr = Get-Http ("https://mapi.ticketlink.co.kr/mapi/product/{0}" -f $c.Code) @{
        Referer = 'https://www.ticketlink.co.kr/'
        Accept = 'application/json'
      }
      try {
        $img = [string](($pr.Text | ConvertFrom-Json).data.productImagePath)
        if ($img) { $poster = $img }
      } catch {}
    }
  }
  elseif ($c.Source -eq 'yes24' -and $c.NoticeId) {
    $html = Get-YesRead $c.NoticeId
    $p2 = Place-FromText $html
    if ($p2) { $place = $p2 }
    $dates = Perf-Dates-FromText $html
    if ($dates.Count -ge 1) {
      $sorted = @($dates | Sort-Object)
      $start = $sorted[0]
      $end = $sorted[$sorted.Count - 1]
    }
    $presale = Get-PresaleFromText $html
    if (-not $poster) {
      $im = [regex]::Match($html, 'src=["'']((?:https?:)?//[^"'']+\.(?:jpg|jpeg|png|gif|webp))', 'IgnoreCase')
      if ($im.Success) { $poster = $im.Groups[1].Value }
    }
  }

  if ($presale) {
    if (-not $openUse -or $presale -lt $openUse) { $openUse = $presale }
  }

  if ($openUse -and $start -and $start.Date -le $openUse.Date) {
    if ($end -and $end.Date -gt $openUse.Date) {
      $start = $end
    } else {
      $start = $null
      $end = $null
    }
  }
  if (-not $start -and $c.PSObject.Properties['StartPin'] -and $c.StartPin) {
    $start = $c.StartPin
    if ($c.EndPin) { $end = $c.EndPin }
  }
  if ($title -match '\uC77C\uC815\s*\uACF5\uAC1C') { continue }
  if (-not $end -and $start) { $end = $start }

  $openLater = $openUse -and $openUse.Date -gt $today
  if (-not $openLater -and $start -and $start.Date -le $today) { continue }
  if (-not $openLater -and $end -and $end.Date -lt $today) { continue }
  if ([string]::IsNullOrWhiteSpace($title)) { continue }

  $poster = [string]$poster
  # 오픈 전 상품은 goodsLarge(_p.gif)가 404인 경우가 많음. 되면 상품 포스터, 안 되면 공지·장르 이미지.
  if ($c.Source -eq 'interpark' -and $sum -and $sum.goodsLargeImageUrl) {
    $large = [string]$sum.goodsLargeImageUrl
    if ($large.StartsWith('//')) { $large = 'https:' + $large }
    if ($large -match '_p\.gif') {
      if (Test-PosterOk $large) { $poster = $large }
      elseif (-not $poster) { $poster = $large }
    } else {
      $poster = $large
    }
  }
  if ($poster -and $poster.StartsWith('//')) { $poster = 'https:' + $poster }

  # 오픈공지·오픈예정은 공연일이 아직 없어도 포스터·선예매일이 있으면 넣는다.
  if (-not $poster -or -not $openUse) { continue }
  if (-not $start -and -not $openLater) { continue }

  $resolved.Add([pscustomobject]@{
    Key = (Group-Key $title)
    Title = $title
    Place = $place
    Start = $(if ($start) { $start.Date } else { $null })
    End = $(if ($end) { $end.Date } else { $null })
    View = [int]$c.View
    Hot = [bool]$c.Hot
    Source = $c.Source
    Open = $openUse
    Poster = $poster
  })
}

$client.Dispose()

$best = @{}
foreach ($it in ($resolved | Sort-Object View -Descending)) {
  if ($best.ContainsKey($it.Key)) {
    $cur = $best[$it.Key]
    if ($it.Start -and (-not $cur.Start -or $it.Start -lt $cur.Start)) { $cur.Start = $it.Start }
    if ($it.End -and (-not $cur.End -or $it.End -gt $cur.End)) { $cur.End = $it.End }
    if ($it.View -gt $cur.View) { $cur.View = $it.View }
    if (-not $cur.Place -and $it.Place) { $cur.Place = $it.Place }
    if ($it.Title -and $cur.Title -match '\uC5BC\uB9AC\uBC84\uB4DC' -and $it.Title -notmatch '\uC5BC\uB9AC\uBC84\uB4DC') { $cur.Title = $it.Title }
    if ($it.Poster) {
      $curGif = [string]$cur.Poster -match '_p\.gif'
      $itNotice = [string]$it.Poster -match 'notice_poster'
      if (-not $cur.Poster -or ($curGif -and $itNotice)) { $cur.Poster = $it.Poster }
    }
    continue
  }
  $best[$it.Key] = $it
}

$picked = @($best.Values | Sort-Object @{Expression='View';Descending=$true}, Title)

function Meta-Of($it) {
  $openLabel = -join @([char]0xD2F0, [char]0xCF13, [char]0xD305)
  if ($it.Start) { return (Fmt-Meta ([string]$it.Place) $it.Start $(if ($it.End) { $it.End } else { $it.Start })) }
  $place = Short-Place ([string]$it.Place)
  if ($it.Open) {
    $od = '{0}.{1}' -f $it.Open.Month, $it.Open.Day
    if ($place) { return ($place + ' ' + [char]0x00B7 + ' ' + $openLabel + ' ' + $od) }
    return ($openLabel + ' ' + $od)
  }
  if ($place) { return $place }
  return ''
}

$shows = foreach ($it in $picked) {
  $soon = [bool]($it.Open -and $it.Open.Date -gt $today)
  $openAt = ''
  if ($it.Open) {
    try { $openAt = ([datetime]$it.Open).ToString('yyyy-MM-ddTHH:mm:ss+09:00') } catch { $openAt = '' }
  }
  [ordered]@{
    date = $(if ($it.Start) { $it.Start.ToString('yyyy-MM-dd') } else { '' })
    endDate = $(if ($it.End) { $it.End.ToString('yyyy-MM-dd') } else { '' })
    title = $it.Title
    meta = (Meta-Of $it)
    kind = $(if ($soon) { 'soon' } else { 'open' })
    status = $(if ($soon) { 'soon' } else { 'open' })
    source = $it.Source
    open = $(if ($it.Open) { $it.Open.ToString('yyyy-MM-dd') } else { '' })
    openAt = $openAt
    poster = $(if ($it.Poster) { [string]$it.Poster } else { '' })
    view = $it.View
    isHot = [bool]$it.Hot
  }
}

$payload = [ordered]@{
  generated = (Get-Date).ToString('s')
  source = 'interpark,ticketlink,yes24,melon'
  melon = $melonOk
  shows = @($shows)
}
$json = $payload | ConvertTo-Json -Depth 6
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($outPath)) | Out-Null
[IO.File]::WriteAllText($outPath, $json, (New-Object Text.UTF8Encoding $false))
Write-Host ($picked.Count.ToString() + ' shows -> ' + $outPath)
foreach ($it in $picked) {
  $when = $(if ($it.Start) { $it.Start.ToString('yyyy-MM-dd') } else { 'open' })
  Write-Host ('  ' + $when + '  v=' + $it.View + '  ' + $it.Title + '  |  ' + (Meta-Of $it))
}

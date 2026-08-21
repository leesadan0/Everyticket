# Build assets/data/shows.json from Interpark / Ticketlink / Yes24 / Melon APIs.
# Concert/fanmeeting, view>=500 or isHot, keep until concert end, no max count.
# Already-on-sale popular shows (임영웅 등) are pinned because open-notices drop them.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
$outPath = 'C:\Users\aaa\Projects\everyticket\assets\data\shows.json'
$today = (Get-Date).Date
$openEnd = $today.AddDays(8).AddSeconds(-1)

$rxKeep = New-Object regex '\uCF58\uC11C\uD2B8|\uD32C\uBBF8\uD305|FANMEETING|FAN[\s-]?CON|\uD398\uC2A4\uD2F0\uBC8C|FESTIVAL|LIVE|TOUR|\uC5B4\uC6CC\uC988|\uC1FC\uCF00\uC774\uC2A4|\uB0B4\uD55C|\uB2E8\uB3C5\uACF5\uC5F0|PARTY|\uD32C\uCF58', 'IgnoreCase'
$rxSkip = New-Object regex '\uBBA4\uC9C0\uCEEC|\uC5F0\uADF9|\uC624\uD398\uB77C|\uBC1C\uB808|\uC804\uC2DC|\uC544\uB3D9|\uD074\uB798\uC2DD|Classic Mode|\uC2A4\uD3EC\uCE20|\uC57C\uAD6C|\uCD95\uAD6C|\uB9AC\uB529', 'IgnoreCase'
$rxKeepStrong = New-Object regex '\uCF58\uC11C\uD2B8|\uD32C\uBBF8\uD305|FANMEETING|\uD398\uC2A4\uD2F0\uBC8C|FESTIVAL|\uD32C\uCF58', 'IgnoreCase'
$rxOpenSuffix = [regex]'\s*\uD2F0\uCF13\s*\uC624\uD508(\uACF5\uC9C0)?\s*\uC548\uB0B4$'
$rxSolo = [regex]'^\uB2E8\uB3C5\uD310\uB9E4\s*'
$rxCase = [regex]'\s*[-\u2015]?\s*CASE\s*No\.?\s*\d+'

function Test-ConcertOrFan([string]$Title) {
  if ([string]::IsNullOrWhiteSpace($Title)) { return $false }
  if ($Title -match $rxSkip -and $Title -notmatch $rxKeepStrong) { return $false }
  return ($Title -match $rxKeep)
}

function Clean-Title([string]$Title) {
  $t = [Net.WebUtility]::HtmlDecode(([string]$Title))
  $t = [regex]::Replace($t, '<[^>]+>', ' ')
  $t = [regex]::Replace($t, '\[(\uB2E8\uB3C5\uD310\uB9E4|\uB2E8\uB3C5\uD310\uB9E4\s*)\]', '')
  $t = [regex]::Replace($t, $rxSolo, '')
  $t = [regex]::Replace($t, $rxOpenSuffix, '')
  $t = [regex]::Replace($t, $rxCase, '')
  $t = [regex]::Replace($t, '\s+', ' ').Trim(' ', '-', [char]0x2013)
  return $t.Trim()
}

function Group-Key([string]$Title) {
  $t = (Clean-Title $Title).ToLowerInvariant()
  $t = [regex]::Replace($t, '[\[\]\(\)\<\>\{\}\u3008\u3009\uFF3B\uFF3D\u300C\u300D\u300E\u300F"''\u201C\u201D]', '')
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

Add-Type -AssemblyName System.Net.Http
$handler = New-Object System.Net.Http.HttpClientHandler
$handler.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
$client = New-Object System.Net.Http.HttpClient($handler)
$client.Timeout = [TimeSpan]::FromSeconds(12)
[void]$client.DefaultRequestHeaders.TryAddWithoutValidation('User-Agent', $ua)

function Get-Http([string]$Url, [hashtable]$Hdrs) {
  $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, $Url)
  foreach ($k in $Hdrs.Keys) { [void]$req.Headers.TryAddWithoutValidation($k, $Hdrs[$k]) }
  $resp = $client.SendAsync($req).GetAwaiter().GetResult()
  $bytes = $resp.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
  $txt = [Text.Encoding]::UTF8.GetString($bytes)
  return @{ Ok = $resp.IsSuccessStatusCode; Status = [int]$resp.StatusCode; Text = $txt; Bytes = $bytes }
}

$cands = New-Object System.Collections.Generic.List[object]

# ----- Interpark -----
$ipk = Get-Http 'https://tickets.interpark.com/api/open-notice/notice-list?sorting=OPEN_ASC&goodsGenre=CONCERT&goodsRegion=ALL&pageSize=50&offset=0' @{
  Referer = 'https://tickets.interpark.com/contents/notice'
  Accept = 'application/json'
}
$ipkItems = @()
try { $ipkItems = $ipk.Text | ConvertFrom-Json } catch {}
foreach ($x in @($ipkItems)) {
  $view = 0; if ($x.viewCount) { $view = [int]$x.viewCount }
  $hot = [bool]$x.isHot
  if ($view -lt 500 -and -not $hot) { continue }
  $title = [string]$x.title
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
  'https://www.ticketlink.co.kr/help/getNoticeList?page=1&noticeCategoryCode=TICKET_OPEN&title=&sortCode=REGISTE_DATE'
)
foreach ($u in $tlinkUrls) {
  $r = Get-Http $u @{ Referer = 'https://www.ticketlink.co.kr/help/notice'; Accept = 'application/json' }
  try { $obj = $r.Text | ConvertFrom-Json } catch { continue }
  foreach ($it in @($obj.result.result)) {
    $nid = [string]$it.noticeId
    if ($tlinkSeen.ContainsKey($nid)) { continue }
    $tlinkSeen[$nid] = $true
    $view = 0; if ($it.viewCount) { $view = [int]$it.viewCount }
    if ($view -lt 500) { continue }
    $title = Clean-Title ([string]$it.title)
    if ([int]$it.subCategoryId -in 16, 18 -and $title -notmatch $rxKeepStrong) { continue }
    if (-not (Test-ConcertOrFan $title)) { continue }
    $open = $null
    if ($it.ticketOpenDatetime) { try { $open = [datetime]$it.ticketOpenDatetime } catch {} }
    $cands.Add([pscustomobject]@{
      Source = 'ticketlink'; View = $view; Hot = $false
      Title = $title; Place = [string]$it.placeName; Open = $open
      Code = [string]$it.productId; NoticeId = $nid; Html = [string]$it.content; Poster = ''
    })
  }
}

# ----- Yes24 -----
$yesBody = 'page=1&size=40&genre=&province=&order=2&searchType=All&searchText='
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
$rxYes = [regex]::new('(?s)<tr>\s*<td>\s*(?<cat>[^<]+?)\s*</td>\s*<td>\s*<a href="#id=(?<id>\d+)">(?<title>.*?)</a>\s*</td>\s*<td>\s*(?<date>.*?)</td>\s*<td>\s*(?<view>[\d,]+)\s*</td>', 'IgnoreCase')
foreach ($m in $rxYes.Matches($yesHtml)) {
  $title = Clean-Title $m.Groups['title'].Value
  $view = [int]($m.Groups['view'].Value -replace ',', '')
  if ($view -lt 500) { continue }
  if (-not (Test-ConcertOrFan $title)) { continue }
  $open = $null
  $dm = [regex]::Match($m.Groups['date'].Value, '(?<y>\d{4})\.(?<mo>\d{2})\.(?<d>\d{2})\([^)]*\)\s*(?<hm>\d{2}:\d{2})')
  if ($dm.Success) {
    try { $open = [datetime]::ParseExact(($dm.Groups['y'].Value + '-' + $dm.Groups['mo'].Value + '-' + $dm.Groups['d'].Value + ' ' + $dm.Groups['hm'].Value), 'yyyy-MM-dd HH:mm', $null) } catch {}
  }
  $cands.Add([pscustomobject]@{
    Source = 'yes24'; View = $view; Hot = $false
    Title = $title; Place = ''; Open = $open
    Code = ''; NoticeId = $m.Groups['id'].Value; Poster = ''
  })
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
foreach ($g in @('GENRE_CON','GENRE_FAN')) {
  $mr = Get-Melon $g '' ''
  if (-not $mr.Ok -or $mr.Text.Length -lt 20) { continue }
  $melonOk = $true
  try { $mj = $mr.Text | ConvertFrom-Json } catch { continue }
  $list = $mj.ticketOpenList; if (-not $list) { $list = $mj.list }; if (-not $list) { $list = $mj }
  foreach ($it in @($list)) {
    $title = Clean-Title ([string]($it.title + $it.perfName + $it.schName))
    $view = 0
    foreach ($vk in @('viewCnt','viewCount','hitCnt','readCnt')) {
      if ($it.$vk) { $view = [int]$it.$vk; break }
    }
    if ($view -lt 500) { continue }
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
  @{ Source='yes24'; View=93000; Hot=$true; Title='2026 ifeye 1st APAC TOUR [If I] IN SEOUL'; Place='예스24 원더로크홀'; Open=[datetime]'2026-08-21'; Code=''; NoticeId='18354'; Poster='https://tkfile.yes24.com/upload2/PerfBlog/202608/20260819/20260819-59806.jpg'; Html=''; StartPin=[datetime]'2026-09-19'; EndPin=[datetime]'2026-09-19' }
)
foreach ($p in $pins) {
  $cands.Add([pscustomobject]$p)
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
  $lines = New-Object System.Collections.Generic.List[string]
  foreach ($line in ($plain -split "`n")) {
    $t = [regex]::Replace($line, '\s+', ' ').Trim()
    if ($t -match '\uACF5\uC5F0\s*(\uC77C\uC2DC|\uAE30\uAC04|\uB0A0\uC9DC|\uC2DC\uAC04)') { [void]$lines.Add($t) }
  }
  $src = $plain
  if (-not $src) { return @() }
  $found = New-Object System.Collections.Generic.List[datetime]
  $year = 0
  $month = 0
  foreach ($m in [regex]::Matches($src, '(20\d{2})\s*[\.\uB144/\-]\s*(\d{1,2})\s*[\.\uC6D4/\-]\s*(\d{1,2})')) {
    $year = [int]$m.Groups[1].Value
    $month = [int]$m.Groups[2].Value
    $d = Parse-Ymd $m.Value
    if ($d) { [void]$found.Add($d.Date) }
  }
  if ($year -gt 0) {
    foreach ($m in [regex]::Matches($src, '(\d{1,2})\s*\uC6D4\s*(\d{1,2})\s*\uC77C')) {
      try { [void]$found.Add((Get-Date -Year $year -Month ([int]$m.Groups[1].Value) -Day ([int]$m.Groups[2].Value)).Date) } catch {}
    }
  }
  $uniq = @($found | Sort-Object -Unique)
  return $uniq
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

  if (-not $start -and $c.PSObject.Properties['StartPin'] -and $c.StartPin) {
    $start = $c.StartPin
    if ($c.EndPin) { $end = $c.EndPin }
  }

  $hasStart = $null -ne $start
  if ($hasStart -and $end -and $end.Date -lt $today) { continue }
  if ($hasStart -and -not $end -and $start.Date -lt $today) { continue }
  if ([string]::IsNullOrWhiteSpace($title)) { continue }
  if (-not $end -and $start) { $end = $start }

  $poster = [string]$poster
  if ($c.Source -eq 'interpark' -and $sum -and $sum.goodsLargeImageUrl) {
    $poster = [string]$sum.goodsLargeImageUrl
  }
  if ($poster -and $poster.StartsWith('//')) { $poster = 'https:' + $poster }

  if ($presale) {
    if (-not $openUse -or $presale -lt $openUse) { $openUse = $presale }
  }

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
    if ($it.Poster -and -not $cur.Poster) { $cur.Poster = $it.Poster }
    continue
  }
  $best[$it.Key] = $it
}

$picked = @($best.Values | Sort-Object @{Expression='View';Descending=$true}, Title)

function Meta-Of($it) {
  $openLabel = -join @([char]0xD2F0, [char]0xCF13, [char]0xC624, [char]0xD508)
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
  [ordered]@{
    date = $(if ($it.Start) { $it.Start.ToString('yyyy-MM-dd') } else { '' })
    endDate = $(if ($it.End) { $it.End.ToString('yyyy-MM-dd') } else { '' })
    title = $it.Title
    meta = (Meta-Of $it)
    kind = 'open'
    status = 'open'
    source = $it.Source
    open = $(if ($it.Open) { $it.Open.ToString('yyyy-MM-dd') } else { '' })
    poster = $(if ($it.Poster) { [string]$it.Poster } else { '' })
    view = $it.View
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

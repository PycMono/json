#!/usr/bin/env python3
"""Generate proxy-list SEO article JSON for Japanese and Korean."""

import json
import os

# ---------------------------------------------------------------------------
# Japanese SEO article (~2500 characters body text)
# ---------------------------------------------------------------------------
ja_html = (
    '<div class="proxy-seo-article">'
    '<h1 class="proxy-seo-h1">無料プロキシリスト 2026 — 10,000以上のフリープロキシサーバーを30分ごとに自動更新</h1>'
    '<p class="proxy-seo-lead">'
    '当サイトの<strong>無料プロキシリスト</strong>は、世界中から収集した10,000以上の<strong>フリープロキシサーバー</strong>を30分ごとに自動検証・更新してお届けします。'
    'HTTP・HTTPS・SOCKS4・SOCKS5の4種類のプロトコルに対応し、国や匿名度で絞り込むことで、目的にぴったりのプロキシをすぐに見つけることができます。'
    '登録やログインは一切不要で、ブラウザ上でワンクリックコピーも可能です。'
    '無料プロキシを探している方、安全性を確認してから利用したい方に最適なツールです。'
    '</p>'
    '<figure class="proxy-seo-figure">'
    '<img src="/static/img/seo/proxy-list-tool-screenshot.svg" alt="無料プロキシリストツールのスクリーンショット — プロトコル・国・匿名度でフィルタリング可能なインターフェース" loading="lazy" width="900" height="500" />'
    '<figcaption>プロキシリストツールのメイン画面 — プロトコル・国・匿名度で即座にフィルタリング</figcaption>'
    '</figure>'
    # Stats
    '<div class="proxy-seo-stats">'
    '<div class="proxy-seo-stat"><span class="proxy-seo-stat-num">10,000+</span><span class="proxy-seo-stat-label">プロキシ数</span></div>'
    '<div class="proxy-seo-stat"><span class="proxy-seo-stat-num">30分</span><span class="proxy-seo-stat-label">更新間隔</span></div>'
    '<div class="proxy-seo-stat"><span class="proxy-seo-stat-num">200+</span><span class="proxy-seo-stat-label">対応国数</span></div>'
    '<div class="proxy-seo-stat"><span class="proxy-seo-stat-num">4</span><span class="proxy-seo-stat-label">プロトコル</span></div>'
    '</div>'
    # Use cases
    '<h2 class="proxy-seo-h2">無料プロキシサーバーの活用シーン</h2>'
    '<p>インターネットを利用する際、プロキシサーバーを経由することでIPアドレスを隠し、プライバシーを保護することができます。'
    'ここでは、<strong>フリープロキシサーバー</strong>が役立つ代表的なシーンをご紹介します。'
    '初心者の方でも安心して使い始められるよう、具体的なユースケースを分かりやすく解説します。</p>'
    '<ul class="proxy-seo-list">'
    '<li><strong>プライバシー保護</strong> — 自分のIPアドレスをウェブサイトに知られることなく、安全にブラウジングを行いたい場合に活用できます。</li>'
    '<li><strong>地域制限の回避</strong> — 一部のウェブサービスは特定の国からのみアクセスを許可しています。プロキシを利用することで、別の国のIPアドレスからアクセスが可能です。</li>'
    '<li><strong>SEO・マーケティング調査</strong> — 検索エンジンの地域別検索結果を確認したり、競合サイトの広告表示を別地域から検証する際に非常に便利です。</li>'
    '<li><strong>開発・テスト用途</strong> — Webアプリケーションの開発中に、プロキシ経由でのアクセス挙動をテストする必要がある場面で役立ちます。</li>'
    '<li><strong>スクレイピングの負荷分散</strong> — 単一IPからの大量リクエストを避けるため、複数のプロキシをローテーションして利用することができます。</li>'
    '</ul>'
    '<figure class="proxy-seo-figure">'
    '<img src="/static/img/seo/proxy-list-workflow-diagram.svg" alt="プロキシ利用のワークフロー図 — ユーザーからプロキシサーバーを経由して目的のウェブサイトにアクセスする流れ" loading="lazy" width="900" height="400" />'
    '<figcaption>プロキシサーバー経由でウェブにアクセスする基本的な仕組み</figcaption>'
    '</figure>'
    # How to use — 3 steps
    '<h2 class="proxy-seo-h2">無料プロキシリストの使い方 — 3ステップで簡単設定</h2>'
    '<p>当サイトの<strong>プロキシリスト 2026</strong>は、複雑な設定なしにすぐ使い始められます。以下の3つのステップに従うだけで、任意のプロキシを利用できます。</p>'
    '<ol class="proxy-seo-list proxy-seo-list--ordered">'
    '<li><strong>プロキシを検索・フィルタリングする</strong> — ページ上部のフィルターを使って、プロトコル（HTTP・HTTPS・SOCKS4・SOCKS5）、国、匿名度（透過・匿名・高匿名）の条件を設定します。目的に応じた最適なプロキシを素早く見つけられます。</li>'
    '<li><strong>IP:Portをコピーする</strong> — 希望のプロキシが見つかったら、行の右側にあるコピーボタンをクリックするだけです。IPアドレスとポート番号がクリップボードにコピーされます。CSVエクスポート機能で一括取得することも可能です。</li>'
    '<li><strong>ブラウザやツールに設定する</strong> — コピーしたIP:Portをブラウザのプロキシ設定、curlコマンドの<code>-x</code>オプション、Pythonの<code>requests</code>ライブラリなどに貼り付けて利用します。</li>'
    '</ol>'
    '<div class="proxy-seo-info">'
    '<strong>ヒント：</strong>SOCKS5プロキシはTCPだけでなくUDP通信にも対応しているため、DNS解決をプロキシ側で行えるなど、より高度な用途に適しています。'
    'まずは<strong>HTTPプロキシ</strong>で基本的なウェブブラウジングを試し、必要に応じて<strong>SOCKS5プロキシ</strong>に切り替えるのがおすすめです。'
    '</div>'
    # Advantages
    '<h2 class="proxy-seo-h2">当サイトの無料プロキシリストが選ばれる理由</h2>'
    '<p>数あるプロキシリストサービスの中で、当サイトが多くのユーザーに選ばれ続けるのには明確な理由があります。'
    '品質・利便性・安全性のすべてにおいて、実用的なレベルを維持するよう設計されています。'
    '以下の特長をぜひ他のサービスと比較してみてください。</p>'
    '<div class="proxy-seo-grid">'
    '<div class="proxy-seo-card"><h3>リアルタイム自動検証</h3><p>すべてのプロキシを30分ごとに接続テストし、応答速度と稼働率を確認しています。古い情報が残る心配はありません。</p></div>'
    '<div class="proxy-seo-card"><h3>4プロトコル対応</h3><p>HTTP、HTTPS、SOCKS4、SOCKS5を完全サポート。用途に合わせて最適なプロトコルを選択できます。</p></div>'
    '<div class="proxy-seo-card"><h3>200以上の国をカバー</h3><p>世界中のプロキシサーバーを収集。特定地域からのアクセスが必要な場合でも、豊富な選択肢の中から選べます。</p></div>'
    '<div class="proxy-seo-card"><h3>完全無料・登録不要</h3><p>アカウント作成もメールアドレスの入力も不要。ページを開いたその瞬間から、すぐにプロキシを検索して利用できます。</p></div>'
    '</div>'
    '<p>さらに、CSVエクスポート機能により、必要なプロキシをまとめてダウンロード可能です。'
    '大規模なスクレイピングプロジェクトや複数サーバーでの一括設定にも対応しており、個人利用からビジネス用途まで幅広く活用いただけます。'
    'また、レイテンシと稼働率のデータを各プロキシに表示しているため、パフォーマンスを重視した選定が容易です。</p>'
    '<h2 class="proxy-seo-h2">プロトコル別比較 — HTTP・HTTPS・SOCKS4・SOCKS5</h2>'
    '<p>各プロトコルには得意な用途があります。以下の表を参考に、目的に合ったプロトコルをお選びください。'
    'プロトコル選びに迷った場合は、まずHTTPプロキシからお試しいただくことをおすすめします。</p>'
    '<table class="proxy-seo-table">'
    '<thead><tr><th>プロトコル</th><th>暗号化</th><th>対応トラフィック</th><th>推奨用途</th><th>速度</th></tr></thead>'
    '<tbody>'
    '<tr><td><strong>HTTP</strong></td><td>なし</td><td>HTTP（ポート80）</td><td>一般的なウェブブラウジング</td><td>高速</td></tr>'
    '<tr><td><strong>HTTPS</strong></td><td>SSL/TLS</td><td>暗号化HTTP</td><td>安全なウェブアクセス</td><td>やや高速</td></tr>'
    '<tr><td><strong>SOCKS4</strong></td><td>なし</td><td>TCP</td><td>基本的なTCP接続</td><td>高速</td></tr>'
    '<tr><td><strong>SOCKS5</strong></td><td>認証対応</td><td>TCP + UDP + IPv6</td><td>高度な用途・DNS解決</td><td>標準</td></tr>'
    '</tbody>'
    '</table>'
    '<figure class="proxy-seo-figure">'
    '<img src="/static/img/seo/proxy-list-comparison-chart.svg" alt="プロキシプロトコル比較チャート — HTTP・HTTPS・SOCKS4・SOCKS5の特徴を視覚的に比較" loading="lazy" width="900" height="450" />'
    '<figcaption>プロトコルごとの機能比較 — 用途に合わせて最適なものを選択</figcaption>'
    '</figure>'
    # Warning
    '<div class="proxy-seo-warn">'
    '<strong>ご注意：</strong>無料の公開プロキシは、トラフィックの記録や広告の挿入、突然のサービス終了といったリスクを伴います。'
    'オンラインバンキング、パスワード入力、個人情報の送信など、機密性の高い通信には絶対に使用しないでください。'
    'セキュリティが重要な場面では、有料のVPNサービスやプライベートプロキシの利用を強く推奨します。'
    '</div>'
    # CTA
    '<div class="proxy-seo-cta">'
    '<h3>今すぐ10,000以上の無料プロキシを検索</h3>'
    '<p>登録不要、完全無料。プロトコル・国・匿名度でフィルタリングして、最適なプロキシを見つけましょう。</p>'
    '<a href="/proxy/list">無料プロキシリストを利用する</a>'
    '</div>'
    '</div>'
)

# ---------------------------------------------------------------------------
# Korean SEO article (~2500 characters body text)
# ---------------------------------------------------------------------------
ko_html = (
    '<div class="proxy-seo-article">'
    '<h1 class="proxy-seo-h1">무료 프록시 목록 2026 — 10,000개 이상의 무료 프록시 서버를 30분마다 자동 업데이트</h1>'
    '<p class="proxy-seo-lead">'
    '저희 사이트의 <strong>무료 프록시 목록</strong>은 전 세계에서 수집한 10,000개 이상의 <strong>무료 프록시 서버</strong>를 30분마다 자동 검증 및 업데이트하여 제공합니다. '
    'HTTP, HTTPS, SOCKS4, SOCKS5의 4가지 프로토콜을 지원하며, 국가 및 익명성 수준별로 필터링하여 목적에 맞는 프록시를 즉시 찾을 수 있습니다. '
    '가입이나 로그인 없이 브라우저에서 원클릭 복사도 가능합니다. '
    '무료 프록시를 찾고 계신 분, 안전성을 먼저 확인한 뒤 이용하고 싶은 분에게 최적화된 도구입니다.'
    '</p>'
    '<figure class="proxy-seo-figure">'
    '<img src="/static/img/seo/proxy-list-tool-screenshot.svg" alt="무료 프록시 목록 도구 스크린샷 — 프로토콜, 국가, 익명성 필터 인터페이스" loading="lazy" width="900" height="500" />'
    '<figcaption>프록시 목록 도구 메인 화면 — 프로토콜·국가·익명성으로 즉시 필터링</figcaption>'
    '</figure>'
    # Stats
    '<div class="proxy-seo-stats">'
    '<div class="proxy-seo-stat"><span class="proxy-seo-stat-num">10,000+</span><span class="proxy-seo-stat-label">프록시 수</span></div>'
    '<div class="proxy-seo-stat"><span class="proxy-seo-stat-num">30분</span><span class="proxy-seo-stat-label">업데이트 주기</span></div>'
    '<div class="proxy-seo-stat"><span class="proxy-seo-stat-num">200+</span><span class="proxy-seo-stat-label">지원 국가</span></div>'
    '<div class="proxy-seo-stat"><span class="proxy-seo-stat-num">4</span><span class="proxy-seo-stat-label">프로토콜</span></div>'
    '</div>'
    # Use cases
    '<h2 class="proxy-seo-h2">무료 프록시 서버의 활용 시나리오</h2>'
    '<p>인터넷을 사용할 때 프록시 서버를 거치면 IP 주소를 숨기고 개인정보를 보호할 수 있습니다. '
    '여기서는 <strong>무료 프록시 서버</strong>가 유용하게 쓰이는 대표적인 상황을 소개합니다. '
    '초보자도 쉽게 이해할 수 있도록 구체적인 사용 사례를 알기 쉽게 설명해 드리겠습니다.</p>'
    '<ul class="proxy-seo-list">'
    '<li><strong>개인정보 보호</strong> — 자신의 IP 주소를 웹사이트에 노출하지 않고 안전하게 브라우징하고자 할 때 활용할 수 있습니다.</li>'
    '<li><strong>지역 제한 우회</strong> — 일부 웹 서비스는 특정 국가에서만 접속을 허용합니다. 프록시를 이용하면 다른 국가의 IP 주소로 접속이 가능합니다.</li>'
    '<li><strong>SEO 및 마케팅 조사</strong> — 검색엔진의 국가별 검색결과를 확인하거나, 경쟁사 광고가 다른 지역에서 어떻게 표시되는지 검증할 때 매우 편리합니다.</li>'
    '<li><strong>개발 및 테스트</strong> — 웹 애플리케이션 개발 중 프록시를 통한 접속 동작을 테스트해야 하는 상황에서 유용합니다.</li>'
    '<li><strong>스크래핑 부하 분산</strong> — 단일 IP에서의 대량 요청을 피하기 위해 여러 프록시를 순환하며 사용할 수 있습니다.</li>'
    '</ul>'
    '<figure class="proxy-seo-figure">'
    '<img src="/static/img/seo/proxy-list-workflow-diagram.svg" alt="프록시 사용 워크플로우 다이어그램 — 사용자가 프록시 서버를 경유하여 대상 웹사이트에 접속하는 흐름" loading="lazy" width="900" height="400" />'
    '<figcaption>프록시 서버를 경유하여 웹에 접속하는 기본 구조</figcaption>'
    '</figure>'
    # How to use — 3 steps
    '<h2 class="proxy-seo-h2">무료 프록시 목록 사용법 — 3단계로 간단 설정</h2>'
    '<p>저희 사이트의 <strong>프록시 목록 2026</strong>은 복잡한 설정 없이 바로 사용할 수 있습니다. 다음 3단계만 따르면 원하는 프록시를 즉시 이용할 수 있습니다.</p>'
    '<ol class="proxy-seo-list proxy-seo-list--ordered">'
    '<li><strong>프록시 검색 및 필터링하기</strong> — 페이지 상단의 필터를 사용하여 프로토콜(HTTP, HTTPS, SOCKS4, SOCKS5), 국가, 익명성(투명·익명·고급 익명) 조건을 설정합니다. 목적에 맞는 최적의 프록시를 빠르게 찾을 수 있습니다.</li>'
    '<li><strong>IP:Port 복사하기</strong> — 원하는 프록시를 찾으면 행 오른쪽의 복사 버튼을 클릭하기만 하면 됩니다. IP 주소와 포트 번호가 클립보드에 복사됩니다. CSV 내보내기 기능으로 일괄 가져오기도 가능합니다.</li>'
    '<li><strong>브라우저나 도구에 설정하기</strong> — 복사한 IP:Port를 브라우저의 프록시 설정, curl 명령어의 <code>-x</code> 옵션, Python의 <code>requests</code> 라이브러리 등에 붙여넣어 사용합니다.</li>'
    '</ol>'
    '<div class="proxy-seo-info">'
    '<strong>팁:</strong> SOCKS5 프록시는 TCP뿐만 아니라 UDP 통신도 지원하여, DNS 해석을 프록시 측에서 수행하는 등 더 고급 용도에 적합합니다. '
    '먼저 <strong>HTTP 프록시</strong>로 기본 웹 브라우징을 테스트하고, 필요에 따라 <strong>SOCKS5 프록시</strong>로 전환하는 것을 권장합니다.'
    '</div>'
    # Advantages
    '<h2 class="proxy-seo-h2">저희 무료 프록시 목록이 선택받는 이유</h2>'
    '<p>수많은 프록시 목록 서비스 중에서도 저희 사이트가 많은 사용자에게 꾸준히 선택되는 데에는 분명한 이유가 있습니다. '
    '품질, 편의성, 보안의 모든 측면에서 실용적인 수준을 유지하도록 설계되었습니다.</p>'
    '<div class="proxy-seo-grid">'
    '<div class="proxy-seo-card"><h3>실시간 자동 검증</h3><p>모든 프록시를 30분마다 연결 테스트하여 응답 속도와 가동률을 확인합니다. 오래된 정보가 남아 있을 걱정이 없습니다.</p></div>'
    '<div class="proxy-seo-card"><h3>4개 프로토콜 지원</h3><p>HTTP, HTTPS, SOCKS4, SOCKS5를 완벽하게 지원합니다. 용도에 맞는 최적의 프로토콜을 선택할 수 있습니다.</p></div>'
    '<div class="proxy-seo-card"><h3>200개 이상 국가 커버</h3><p>전 세계의 프록시 서버를 수집합니다. 특정 지역에서의 접속이 필요한 경우에도 풍부한 선택지 중에서 고를 수 있습니다.</p></div>'
    '<div class="proxy-seo-card"><h3>완전 무료·가입 불필요</h3><p>계정 생성이나 이메일 입력 없이 바로 이용 가능합니다. 페이지를 여는 순간부터 즉시 프록시를 검색하고 사용할 수 있습니다.</p></div>'
    '</div>'
    '<p>또한 CSV 내보내기 기능으로 필요한 프록시를 한 번에 다운로드할 수 있습니다. '
    '대규모 스크래핑 프로젝트나 여러 서버에서의 일괄 설정에도 대응하여 개인 사용부터 비즈니스 용도까지 폭넓게 활용하실 수 있습니다. '
    '각 프록시에 지연시간과 가동률 데이터를 표시하고 있어 성능을 중시한 선택이 용이합니다.</p>'
    # Comparison table (Korean)
    '<h2 class="proxy-seo-h2">프로토콜별 비교 — HTTP, HTTPS, SOCKS4, SOCKS5</h2>'
    '<p>각 프로토콜에는 각각 장점이 있습니다. 아래 표를 참고하여 목적에 맞는 프로토콜을 선택하시기 바랍니다.</p>'
    '<table class="proxy-seo-table">'
    '<thead><tr><th>프로토콜</th><th>암호화</th><th>지원 트래픽</th><th>추천 용도</th><th>속도</th></tr></thead>'
    '<tbody>'
    '<tr><td><strong>HTTP</strong></td><td>없음</td><td>HTTP (포트 80)</td><td>일반적인 웹 브라우징</td><td>고속</td></tr>'
    '<tr><td><strong>HTTPS</strong></td><td>SSL/TLS</td><td>암호화 HTTP</td><td>안전한 웹 접속</td><td>양호</td></tr>'
    '<tr><td><strong>SOCKS4</strong></td><td>없음</td><td>TCP</td><td>기본 TCP 연결</td><td>고속</td></tr>'
    '<tr><td><strong>SOCKS5</strong></td><td>인증 지원</td><td>TCP + UDP + IPv6</td><td>고급 용도·DNS 해석</td><td>표준</td></tr>'
    '</tbody>'
    '</table>'
    '<figure class="proxy-seo-figure">'
    '<img src="/static/img/seo/proxy-list-comparison-chart.svg" alt="프록시 프로토콜 비교 차트 — HTTP·HTTPS·SOCKS4·SOCKS5의 특징을 시각적으로 비교" loading="lazy" width="900" height="450" />'
    '<figcaption>프로토콜별 기능 비교 — 용도에 맞게 최적의 프로토콜 선택</figcaption>'
    '</figure>'
    # Warning
    '<div class="proxy-seo-warn">'
    '<strong>주의:</strong> 무료 공개 프록시는 트래픽 기록, 광고 삽입, 갑작스러운 서비스 종료 등의 위험이 따릅니다. '
    '온라인 뱅킹, 비밀번호 입력, 개인정보 전송 등 민감한 통신에는 절대 사용하지 마세요. '
    '보안이 중요한 상황에서는 유료 VPN 서비스나 프라이빗 프록시 사용을 강력히 권장합니다.'
    '</div>'
    # CTA
    '<div class="proxy-seo-cta">'
    '<h3>지금 바로 10,000개 이상의 무료 프록시 검색하기</h3>'
    '<p>가입 불필요, 완전 무료. 프로토콜·국가·익명성으로 필터링하여 최적의 프록시를 찾아보세요.</p>'
    '<a href="/proxy/list">무료 프록시 목록 이용하기</a>'
    '</div>'
    '</div>'
)

# ---------------------------------------------------------------------------
# Build JSON structures
# ---------------------------------------------------------------------------
ja_data = {
    "proxy-list.seo.article": ja_html
}

ko_data = {
    "proxy-list.seo.article": ko_html
}

# ---------------------------------------------------------------------------
# Write JSON files
# ---------------------------------------------------------------------------
base_dir = "/Users/allen/projects/work/github/json/common/i18n"

ja_path = os.path.join(base_dir, "ja", "proxy-list-seo.json")
ko_path = os.path.join(base_dir, "ko", "proxy-list-seo.json")

with open(ja_path, "w", encoding="utf-8") as f:
    f.write(json.dumps(ja_data, ensure_ascii=False, indent=2))
    f.write("\n")

with open(ko_path, "w", encoding="utf-8") as f:
    f.write(json.dumps(ko_data, ensure_ascii=False, indent=2))
    f.write("\n")

# ---------------------------------------------------------------------------
# Verify character counts (body text only, excluding HTML tags)
# ---------------------------------------------------------------------------
import re

def strip_html(html):
    """Remove HTML tags to get plain text."""
    return re.sub(r'<[^>]+>', '', html)

ja_text = strip_html(ja_html)
ko_text = strip_html(ko_html)

print(f"Japanese body text: {len(ja_text)} characters")
print(f"Korean body text:   {len(ko_text)} characters")
print()
print(f"Written: {ja_path}")
print(f"Written: {ko_path}")

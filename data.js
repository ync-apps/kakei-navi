/*
 * まとめ割ナビ 料金・キャンペーンデータ
 *
 * 2026-11-09 に各社の公式サイト（読めなかったものは記事）で調べた値です。
 * 2026-12-01 からの改定が発表済みのものは改定後の料金にしています（比較期間の大半が改定後のため）。
 *
 * confidence:
 *   'high' = 公式サイトで確認した
 *   'mid'  = 公式サイトは読めなかったが記事で確認した／公式の数字から計算した
 *   'low'  = 確認できなかった（画面に「要確認」と出る。標準設定では割引・特典は計算に入れない）
 * source: 確認したページ
 * 金額はすべて税込・円。
 */
(function (root) {
  const ALL_BUT_OKINAWA = ['hokkaido', 'tohoku', 'tokyo', 'chubu', 'hokuriku', 'kansai', 'chugoku', 'shikoku', 'kyushu'];

  const DATA = {
    asOf: '2026-11-23',
    // endsAt: キャンペーン・割引の終了日（この日を過ぎると自動で計算から外れる）。checkedAt: 個別に確認し直した日（なければ asOf）
    notice: '料金・キャンペーンは毎週土曜20時に更新しています（データ時点：2026年11月23日）。各社の公式サイトなどで調べた値です。「要確認」が付いた金額は確認できなかったものです。申し込み前に必ず公式サイトで最新の条件を確認してください。店頭限定のキャンペーンや、代理店・家電量販店などの申込窓口が独自に出すキャッシュバックは、ネットで公開されていないものも多いため計算に入れていません。ただし、このサイトからリンクしている代理店・広告ページのキャンペーンは、そのページから申し込んだ場合の金額として計算に入れ、その旨を表示しています。',

    areas: [
      { id: 'hokkaido', name: '北海道' },
      { id: 'tohoku', name: '東北' },
      { id: 'tokyo', name: '関東（東京電力エリア）' },
      { id: 'chubu', name: '中部（東海）' },
      { id: 'hokuriku', name: '北陸' },
      { id: 'kansai', name: '関西' },
      { id: 'chugoku', name: '中国' },
      { id: 'shikoku', name: '四国' },
      { id: 'kyushu', name: '九州' },
      { id: 'okinawa', name: '沖縄' },
    ],

    // 電気の計算に使う共通の値
    energy: {
      renewableLevy: 4.18, // 再エネ賦課金 円/kWh（2026年5月〜2027年4月）。使用量の推定にだけ使う
      // 燃料費調整額（円/kWh）。電気代から使用量を出すときだけ使う。公式で確かめられた地域だけ（ほかは0）。毎月変わるので月1回見直す
      fuelAdj: { tokyo: { value: -5.33, month: '2026-11', source: 'https://home.tokyo-gas.co.jp/information/power-202610-01.html' } },
      renewableLevySource: 'https://www.yonden.co.jp/customer/price/renewable.html',
    },

    // ================= スマホ =================
    // capGB: null = 無制限。price は割引前の月額。
    mobileBrands: [
      {
        id: 'docomo', name: 'ドコモ', group: 'docomo', confidence: 'high',
        source: 'https://www.docomo.ne.jp/charge/',
        switchFee: 0, feeConfidence: 'high', feeSource: 'https://www.docomo.ne.jp/support/procedure/subscribe/index.html', /* 契約事務手数料4,950円はドコモオンラインショップなら無料（乗り換え特典もオンラインショップ限定なので0円で計算） */
        plans: [
          { id: 'docomo-mini2-6', name: 'ドコモ mini2 6GB', capGB: 6, price: 3278, source: 'https://www.docomo.ne.jp/info/news_release/2026/09/25_00.html' },
          { id: 'docomo-mini2-12', name: 'ドコモ mini2 12GB', capGB: 12, price: 4598, source: 'https://www.docomo.ne.jp/info/news_release/2026/09/25_00.html' },
          { id: 'docomo-max-1', name: 'ドコモ MAX（〜1GB）', capGB: 1, price: 5698, source: 'https://www.docomo.ne.jp/charge/hikari_set/' },
          { id: 'docomo-max-3', name: 'ドコモ MAX（〜3GB）', capGB: 3, price: 6798, source: 'https://www.docomo.ne.jp/charge/hikari_set/' },
          { id: 'docomo-max', name: 'ドコモ MAX（無制限）', capGB: null, price: 8448, source: 'https://www.docomo.ne.jp/charge/hikari_set/' },
        ],
      },
      {
        id: 'ahamo', name: 'ahamo', group: 'docomo', switchFee: 0, confidence: 'high', source: 'https://ahamo.com/plan/',
        plans: [
          { id: 'ahamo-40', name: 'ahamo（〜40GB・12月から）', capGB: 40, price: 3135 },
          { id: 'ahamo-60', name: 'ahamo（〜60GB・12月から）', capGB: 60, price: 4125 },
          { id: 'ahamo-120', name: 'ahamo（〜120GB・12月から）', capGB: 120, price: 5115 },
        ],
      },
      {
        id: 'au', name: 'au', group: 'au', confidence: 'high', source: 'https://www.au.com/mobile/charge/',
        switchFee: 3850, feeConfidence: 'mid', feeSource: 'https://network.mobile.rakuten.co.jp/fee/saikyo-plan/',
        plans: [
          { id: 'au-mini-1', name: 'au スマホミニプラン＋（〜1GB）', capGB: 1, price: 4928, source: 'https://www.au.com/mobile/charge/smartphone/plan/sp-mini-plus/' },
          { id: 'au-mini-3', name: 'au スマホミニプラン＋（〜3GB）', capGB: 3, price: 6578, source: 'https://www.au.com/mobile/charge/smartphone/plan/sp-mini-plus/' },
          { id: 'au-mini-5', name: 'au スマホミニプラン＋（〜5GB）', capGB: 5, price: 8228, source: 'https://www.au.com/mobile/charge/smartphone/plan/sp-mini-plus/' },
          { id: 'au-max', name: 'au 使い放題MAX＋', capGB: null, price: 7788 },
        ],
      },
      {
        id: 'uq', name: 'UQモバイル', group: 'au', confidence: 'high', source: 'https://www.uqwimax.jp/mobile/plan/tokutoku2/',
        switchFee: 3850, feeConfidence: 'high', feeSource: 'https://www.au.com/support/faq/details/00/0000/000003/pg00000330/', feeCheckedAt: '2026-11-11', // オンラインショップは3,850円（UQスポットは4,950円）
        plans: [
          { id: 'uq-tokutoku-5', name: 'UQ トクトクプラン2（〜5GB）', capGB: 5, price: 2948 },
          { id: 'uq-tokutoku-30', name: 'UQ トクトクプラン2（〜30GB）', capGB: 30, price: 4048 },
          { id: 'uq-komikomi', name: 'UQ コミコミプランバリュー 35GB（10分かけ放題付き）', capGB: 35, price: 3828, source: 'https://www.uqwimax.jp/mobile/plan/komikomi-pv/' },
        ],
      },
      {
        id: 'povo', name: 'povo2.0', group: 'au', switchFee: 0, confidence: 'high', source: 'https://povo.jp/topping-simulator/',
        note: '30日・365日のトッピングを1か月あたりに直した値',
        plans: [
          { id: 'povo-3', name: 'povo 3GB（30日）を毎月', capGB: 3, price: 1004 },
          { id: 'povo-60y', name: 'povo 60GB（365日）＝月5GB相当', capGB: 5, price: 1100 },
          { id: 'povo-120y', name: 'povo 120GB（365日）＝月10GB相当', capGB: 10, price: 1800 },
          { id: 'povo-360y', name: 'povo 360GB（365日）＝月30GB相当', capGB: 30, price: 2200 },
        ],
      },
      {
        id: 'softbank', name: 'ソフトバンク', group: 'softbank', confidence: 'high', source: 'https://www.softbank.jp/mobile/price_plan/',
        switchFee: 3850, feeConfidence: 'mid', feeSource: 'https://network.mobile.rakuten.co.jp/fee/saikyo-plan/',
        plans: [
          { id: 'sb-minifit2-2', name: 'ソフトバンク ミニフィット２（〜2GB）', capGB: 2, price: 5258 },
          { id: 'sb-minifit2-5', name: 'ソフトバンク ミニフィット２（〜5GB）', capGB: 5, price: 6358 },
          { id: 'sb-teigaku', name: 'ソフトバンク テイガク無制限', capGB: null, price: 8008 },
          { id: 'sb-paytoku2', name: 'ソフトバンク ペイトク２（無制限）', capGB: null, price: 10538 },
        ],
      },
      {
        id: 'ymobile', name: 'ワイモバイル', group: 'softbank', switchFee: 3850, feeConfidence: 'mid', feeCheckedAt: '2026-11-11', /* 公式は自動取得不可。記事2つ以上で3,850円が一致。期間限定で無料になることあり */ confidence: 'high', checkedAt: '2026-11-15',
        source: 'https://www.ymobile.jp/plan/',
        note: '公式サイトは自動取得を拒否するため、ブラウザで公式の料金プランのページを開いて確認（2026-11-15）',
        plans: [
          { id: 'ym-s', name: 'ワイモバイル シンプル3 S 5GB', capGB: 5, price: 3278 },
          { id: 'ym-m', name: 'ワイモバイル シンプル3 M 30GB', capGB: 30, price: 4378 },
          { id: 'ym-l', name: 'ワイモバイル シンプル3 L 35GB', capGB: 35, price: 5478 },
        ],
      },
      {
        id: 'linemo', name: 'LINEMO', group: 'softbank', switchFee: 3850, feeConfidence: 'high', confidence: 'high', checkedAt: '2026-11-15',
        source: 'https://www.linemo.jp/plan/', feeSource: 'https://www.linemo.jp/plan/payment/',
        note: '公式サイトは自動取得を拒否するため、ブラウザで開いて確認（2026-11-15）',
        plans: [
          { id: 'linemo-3', name: 'LINEMO ベストプラン（〜3GB）', capGB: 3, price: 990 },
          { id: 'linemo-10', name: 'LINEMO ベストプラン（〜10GB）', capGB: 10, price: 2090 },
          { id: 'linemo-30', name: 'LINEMO ベストプランV 30GB', capGB: 30, price: 2970 },
        ],
      },
      {
        id: 'rakuten', name: '楽天モバイル', group: 'rakuten', switchFee: 0, confidence: 'high',
        source: 'https://network.mobile.rakuten.co.jp/fee/saikyo-plan/',
        note: '公式ページは最強家族割（-110円）適用後の金額で表示。ここでは割引前に戻し、家族割は別に計算',
        plans: [
          { id: 'rakuten-3', name: '楽天 最強プラン（〜3GB）', capGB: 3, price: 1078 },
          { id: 'rakuten-20', name: '楽天 最強プラン（〜20GB）', capGB: 20, price: 2178 },
          { id: 'rakuten-unl', name: '楽天 最強プラン（無制限）', capGB: null, price: 3278 },
        ],
      },
      {
        id: 'iijmio', name: 'IIJmio', group: 'iij', switchFee: 3733, feeConfidence: 'mid', confidence: 'high', checkedAt: '2026-11-15',
        source: 'https://www.iijmio.jp/gigaplan/',
        note: '公式のギガプランのページをブラウザで開いて全プランの料金を確認（2026-11-15）。初期費用は12月1日申込から3,850円（記事 https://selectra.jp/telecom/news/iijmio-giga-plan-half-price-november-2026 ・11月6日更新）',
        plans: [
          { id: 'iij-2', name: 'IIJmio ギガプラン 2GB', capGB: 2, price: 850 },
          { id: 'iij-5', name: 'IIJmio ギガプラン 5GB', capGB: 5, price: 950, source: 'https://www.iijmio.jp/gigaplan/' },
          { id: 'iij-10', name: 'IIJmio ギガプラン 10GB', capGB: 10, price: 1400 },
          { id: 'iij-15', name: 'IIJmio ギガプラン 15GB', capGB: 15, price: 1600 },
          { id: 'iij-25', name: 'IIJmio ギガプラン 25GB', capGB: 25, price: 2000 },
          { id: 'iij-35', name: 'IIJmio ギガプラン 35GB', capGB: 35, price: 2400 },
          { id: 'iij-45', name: 'IIJmio ギガプラン 45GB', capGB: 45, price: 3300 },
          { id: 'iij-55', name: 'IIJmio ギガプラン 55GB', capGB: 55, price: 3900 },
        ],
      },
      {
        id: 'mineo', name: 'mineo', group: 'mineo', switchFee: 4290, feeConfidence: 'high', confidence: 'high', source: 'https://mineo.jp/price/',
        note: 'マイピタ デュアル（音声）。事務手数料3,850円＋SIMカード発行料440円',
        plans: [
          { id: 'mineo-3', name: 'mineo マイピタ 3GB', capGB: 3, price: 1298 },
          { id: 'mineo-7', name: 'mineo マイピタ 7GB', capGB: 7, price: 1518 },
          { id: 'mineo-15', name: 'mineo マイピタ 15GB', capGB: 15, price: 1958 },
          { id: 'mineo-30', name: 'mineo マイピタ 30GB', capGB: 30, price: 2178 },
          { id: 'mineo-50', name: 'mineo マイピタ 50GB', capGB: 50, price: 2948 },
        ],
      },
      {
        id: 'nihontsushin', name: '日本通信SIM', group: 'nihontsushin', switchFee: 3300, feeConfidence: 'high', feeSource: 'https://www.nihontsushin.com/entry/contract_notice_NT.html', feeCheckedAt: '2026-11-11', /* 新規・MNPとも初期手数料3,300円。スターターパック購入なら不要 */ confidence: 'high', source: 'https://www.nihontsushin.com/',
        plans: [
          { id: 'nt-1', name: '日本通信 合理的シンプル290プラン 1GB', capGB: 1, price: 290 },
          { id: 'nt-20', name: '日本通信 合理的みんなのプラン 20GB', capGB: 20, price: 1390 },
          { id: 'nt-50', name: '日本通信 合理的50GBプラン', capGB: 50, price: 2178 },
        ],
      },
      {
        id: 'biglobe-mobile', name: 'BIGLOBEモバイル', group: 'biglobe', switchFee: 3733, feeConfidence: 'high', feeSource: 'https://join.biglobe.ne.jp/mobile/plan/', feeCheckedAt: '2026-11-11', /* プラン申込手数料3,300円＋SIMカード準備料（eSIMはプロファイル発行料）433円 */ confidence: 'high', source: 'https://join.biglobe.ne.jp/mobile/',
        plans: [
          { id: 'bm-1', name: 'BIGLOBEモバイル プランS 1GB', capGB: 1, price: 1078 },
          { id: 'bm-3', name: 'BIGLOBEモバイル プランR 3GB', capGB: 3, price: 1320 },
          { id: 'bm-6', name: 'BIGLOBEモバイル プランM 6GB', capGB: 6, price: 1870 },
        ],
      },
    ],

    // 家族割：同じ会社にする家族の人数で決まる割引
    // byCount: { 人数: 1回線あたりの割引額 } / secondLineOnwards: 2人目から / countBrands: 人数に数える会社
    // group: 'home' のものは光・でんきのセット割と重ならない（大きい方だけ）
    familyDiscounts: [
      {
        id: 'iij-family', name: 'IIJmio 家族割引', brand: 'iijmio', byCount: { 2: 100 }, confidence: 'high', checkedAt: '2026-11-15',
        source: 'https://www.iijmio.jp/hdc/kazokuwaribiki/', note: '同じmioIDで音声SIM・音声eSIMを2回線以上使うと、1回線あたり月100円引き',
      },
      {
        id: 'docomo-family-mini', name: 'みんなドコモ割（ドコモ mini2）', brand: 'docomo', countBrands: ['docomo', 'ahamo'], byCount: { 2: 550 },
        plans: ['docomo-mini2-6', 'docomo-mini2-12'], confidence: 'high', checkedAt: '2026-11-15', source: 'https://www.docomo.ne.jp/info/news_release/2026/09/25_00.html',
        note: 'ドコモ mini2 は2回線以上で月550円引き（人数が増えても同じ）',
      },
      {
        id: 'docomo-family', name: 'みんなドコモ割', brand: 'docomo', countBrands: ['docomo', 'ahamo'], byCount: { 2: 550, 3: 1210 },
        todo: [{ phase: 'after', text: 'ドコモのファミリー割引グループに家族の回線を入れる（みんなドコモ割）' }],
        plans: ['docomo-max-1', 'docomo-max-3', 'docomo-max'], confidence: 'high', source: 'https://www.docomo.ne.jp/charge/discount/minna_docomo/',
        note: 'ドコモ MAX が対象（ドコモ mini は対象一覧になし）。ahamo の回線も人数に数える。光セット割と併用可',
      },
      {
        id: 'au-family', name: '家族割プラス', brand: 'au', byCount: { 2: 660, 3: 1210 },
        todo: [{ phase: 'after', text: 'au 家族割プラスに家族の回線を登録する' }],
        plans: ['au-mini-1', 'au-mini-3', 'au-mini-5', 'au-max'], confidence: 'high', source: 'https://www.au.com/mobile/charge/charge-discount/kazoku-wari-plus/',
        note: 'auスマートバリューと併用可（公式の内訳で両方適用）',
      },
      {
        id: 'uq-family', name: 'UQ 家族セット割', brand: 'uq', byCount: { 2: 550 }, group: 'home',
        todo: [{ phase: 'after', text: 'UQ 家族セット割を申し込む' }],
        plans: ['uq-tokutoku-5', 'uq-tokutoku-30'], confidence: 'high', checkedAt: '2026-11-17', source: 'https://www.uqwimax.jp/mobile/plan/tokutoku2/',
        note: 'トクトクプラン2のみ。自宅セット割とは重ならない。金額・条件とも公式で確認（2026-11-17）',
      },
      {
        id: 'sb-family', name: '新みんな家族割', brand: 'softbank', byCount: { 2: 660, 3: 1210 },
        todo: [{ phase: 'after', text: 'ソフトバンク 新みんな家族割を申し込む' }],
        plans: ['sb-teigaku', 'sb-paytoku2'], confidence: 'high', checkedAt: '2026-11-15', source: 'https://cdn.softbank.jp/mobile/set/common/pdf/legal/spguide/price_plan/minna-kazoku.pdf',
        note: 'ペイトク2・テイガク無制限：2回線 660円、3回線以上 1,210円（1回線あたり）',
      },
      {
        id: 'sb-family-mini', name: '新みんな家族割（ミニフィット2）', brand: 'softbank', byCount: { 2: 220, 3: 550 },
        plans: ['sb-minifit2-2', 'sb-minifit2-5'], confidence: 'high', checkedAt: '2026-11-15', source: 'https://cdn.softbank.jp/mobile/set/common/pdf/legal/spguide/price_plan/minna-kazoku.pdf',
        note: 'ミニフィット2：2回線 220円、3回線以上 550円（1回線あたり）',
      },
      {
        id: 'mineo-family', name: 'mineo 家族割引', brand: 'mineo', byCount: { 2: 55 }, confidence: 'high', checkedAt: '2026-11-15',
        source: 'https://mineo.jp/price/', note: '家族で2回線以上なら1回線あたり月55円引き（3回線目以降のデュアルタイプはさらに割引があるが計算に入れていない）',
      },
      {
        id: 'bm-multi', name: 'BIGLOBEモバイル 複数回線割', brand: 'biglobe-mobile', byCount: { 2: 220 }, secondLineOnwards: true, confidence: 'high', checkedAt: '2026-11-15',
        source: 'https://join.biglobe.ne.jp/mobile/plan/', note: '2回線目から1回線あたり月220円引き',
      },
      {
        id: 'ym-family', name: 'ワイモバイル 家族割引サービス', brand: 'ymobile', byCount: { 2: 1100 }, secondLineOnwards: true, group: 'home',
        todo: [{ phase: 'after', text: 'ワイモバイル 家族割引サービスを申し込む' }],
        confidence: 'high', checkedAt: '2026-11-15', source: 'https://www.ymobile.jp/plan/',
        note: 'シンプル3 S/M/L の2回線目以降。おうち割 光セットとは重ならない（公式の料金プランのページで確認）',
      },
      {
        id: 'rakuten-family', name: '最強家族割', brand: 'rakuten', byCount: { 2: 110 },
        todo: [{ phase: 'after', text: 'Rakuten Link アプリで最強家族割のグループを作る' }],
        confidence: 'high', source: 'https://network.mobile.rakuten.co.jp/fee/family/',
        note: '家族全員が1人110円引き',
      },
    ],

    // ================= 光回線 =================
    // type: 'collab' = 光コラボ（光コラボ同士の乗り換えは工事不要の「事業者変更」）
    // price: 月額 { house: 戸建て, mansion: マンション }。housing: 提供している住まいの種類
    hikari: [
      {
        id: 'docomo-hikari', name: 'ドコモ光', type: 'collab', confidence: 'high', source: 'https://www.docomo.ne.jp/hikari/charge/',
        price: { house: 5720, mansion: 4400 }, setupFee: 4950, construction: { house: 28600, mansion: 28600 }, constructionFree: false,
        note: '1ギガ・2年定期。「新規工事料実質0円特典」は条件を確認できなかったため工事費ありで計算',
      },
      {
        id: 'softbank-hikari', name: 'ソフトバンク光', type: 'collab', confidence: 'high', source: 'https://www.softbank.jp/internet/sbhikari/price/',
        price: { house: 6050, mansion: 4510 }, setupFee: 4950, construction: { house: 47520, mansion: 47520 }, constructionFree: true,
        note: '1ギガ。2026年12月からの+330円を含む。工事費は「回線工事費割引」で実質0円（条件あり）',
      },
      {
        id: 'au-hikari', name: 'auひかり', type: 'own', confidence: 'high', source: 'https://www.au.com/internet/auhikari_1g/',
        excludeAreas: { house: ['kansai', 'chubu', 'okinawa'], mansion: ['okinawa'] }, housing: ['house'],
        price: { house: 6490, mansion: 0 }, setupFee: 4950, setupConfidence: 'high', setupSource: 'https://www.au.com/internet/auhikari_1g/charge/zuttogigatoku/', /* 新規登録料。2026年8月1日から3,300円→4,950円 */ construction: { house: 41250, mansion: 33000 }, constructionFree: true,
        note: 'ホーム1G ずっとギガ得プラン。2027年1月からの料金（3年目以降5,720円・1年目5,940円・2年目5,830円）に、光電話770円を足して計算。工事費の初期費用相当額割引（実質0円）と乗りかえスタートサポートは「ネット＋電話」が条件のため、電話込みで比べる。マンションの料金は確認できず', checkedAt: '2026-11-15',
      },
      {
        id: 'biglobe-hikari', name: 'ビッグローブ光', type: 'collab', confidence: 'high', source: 'https://join.biglobe.ne.jp/ftth/hikari/price/',
        price: { house: 5478, mansion: 4378 }, setupFee: 3300, construction: { house: 28600, mansion: 28600 }, constructionFree: true,
        note: '1ギガ3年プラン。工事費は特典で実質0円',
      },
      {
        id: 'rakuten-hikari', name: '楽天ひかり', type: 'collab', confidence: 'high', source: 'https://network.mobile.rakuten.co.jp/hikari/',
        price: { house: 5280, mansion: 4180 }, setupFee: 880, setupFeeHenkou: 1980, setupConfidence: 'high', setupSource: 'https://network.mobile.rakuten.co.jp/hikari/fee/pricelist/', /* 初期登録費：フレッツ光を使っていない人880円、転用・事業者変更1,980円 */ construction: { house: 22000, mansion: 22000 }, constructionFree: true,
        note: '工事費はポイント進呈で実質0円',
      },
      {
        id: 'iij-hikari', name: 'IIJmioひかり', type: 'collab', confidence: 'high', source: 'https://www.iijmio.jp/imh/',
        price: { house: 5456, mansion: 4356 }, setupFee: 3300, setupConfidence: 'high', setupSource: 'https://www.iijmio.jp/imh/', /* 公式の料金シミュレーションで新規・転用・事業者変更とも3,300円（2026-11-11確認） */ construction: { house: 28600, mansion: 28600 }, constructionFree: true,
        note: '工事費は21か月利用で実質0円。最低利用24か月',
      },
      {
        id: 'sonet-hikari', name: 'So-net光', type: 'collab', confidence: 'high', checkedAt: '2026-11-15', source: 'https://www.so-net.ne.jp/access/hikari/',
        price: { house: 5995, mansion: 4895 }, setupFee: 6050, construction: { house: 39600, mansion: 39600 }, constructionFree: true,
        note: 'So-net 光 M（1ギガ）。契約期間なし。工事費39,600円の実質無料は新設のみ',
      },
      {
        id: 'en-hikari', name: 'enひかり', type: 'collab', confidence: 'high', source: 'https://enhikari.jp/',
        price: { house: 4620, mansion: 3520 }, setupFee: 3300, setupFeeHenkou: 2200, construction: { house: 16500, mansion: 16500 }, constructionFree: true,
        note: 'プロバイダ込み。最低利用期間・解約手数料なし。工事費無料キャンペーン中',
      },
      {
        id: 'nuro', name: 'NURO光', type: 'own', confidence: 'high', source: 'https://www.nuro.jp/',
        areas: ['hokkaido', 'tohoku', 'tokyo', 'chubu', 'kansai', 'chugoku', 'kyushu'],
        price: { house: 6050, mansion: 5720 }, setupFee: 3300, construction: { house: 55000, mansion: 55000 }, constructionFree: true,
        note: '2.5Gプラン。通常料金（2年割の割引額から計算）。最初の24か月は下の「2年割」で戸建て3,980円・マンション2,980円。工事費は36か月利用で実質0円。提供エリアは県により異なる',
      },
      {
        id: 'eo-hikari', name: 'eo光', type: 'own', areas: ['kansai'], housing: ['house'], confidence: 'high', checkedAt: '2026-11-15', source: 'https://eonet.jp/home/charge/pricelist/',
        price: { house: 5500, mansion: 0 }, setupFee: 3300, setupConfidence: 'high', setupSource: 'https://simple.eonet.jp/share/pdf/notice.pdf', construction: { house: 29700, mansion: 29700 }, constructionFree: true,
        note: '1ギガ（即割）2年目以降の料金。1年目の割引は下のセット割で計算。公式の料金表（1ギガコースのタブ）をブラウザで確認（2026-11-15）。10ギガは1〜6か月0円・7〜12か月500円・2年目5,500円（比較には入れていない）',
      },
      {
        id: 'commufa', name: 'コミュファ光', type: 'own', areas: ['chubu'], housing: ['house'], confidence: 'high', source: 'https://www.commufa.jp/services/information/',
        price: { house: 5170, mansion: 0 }, setupFee: 770, construction: { house: 27500, mansion: 27500 }, constructionFree: true,
        note: 'ホーム1G（スタート割適用後）。工事費無料は「安心サポートPlus」の同時申込が条件（3か月無料・その後は解約できる）', checkedAt: '2026-11-15',
      },
      {
        id: 'pikara', name: 'ピカラ光', type: 'own', areas: ['shikoku'], housing: ['house'], confidence: 'high', source: 'https://www.pikara.jp/net/home.html',
        price: { house: 4950, mansion: 0 }, setupFee: 0, construction: { house: 0, mansion: 0 }, constructionFree: true,
        note: '戸建て1G（プロバイダ込み）。四国電力のでんき契約で4,620円。初期費用無料',
      },
      {
        id: 'megaegg', name: 'メガ・エッグ', type: 'own', areas: ['chugoku'], housing: ['house'], confidence: 'high', source: 'https://www.megaegg.jp/service/fiber/home/',
        price: { house: 5720, mansion: 0 }, setupFee: 3300, construction: { house: 38500, mansion: 38500 }, constructionFree: true,
        note: '光ベーシック[ホーム]。3年目以降の5,720円。2年目までは新規加入割引で5,170円（下の割引）。中国電力の電気とセットで4,620円',
      },
      {
        id: 'bbiq', name: 'BBIQ', type: 'own', areas: ['kyushu'], housing: ['house'], confidence: 'high', source: 'https://www.bbiq.jp/',
        price: { house: 5500, mansion: 0 }, setupFee: 880, setupConfidence: 'high', setupSource: 'https://www.bbiq.jp/hikari/internet/price/', construction: { house: 0, mansion: 0 }, constructionFree: true,
        note: '1ギガ ホーム。2〜12か月目は2,970円（Web・電話申込、2027年1月28日まで）。工事費実質無料',
      },
    ],

    // ================= 電気 =================
    // 料金表で計算します（燃料費調整額・再エネ賦課金は各社ほぼ共通なので差に含めない）
    // tariffs[エリア]:
    //   { type: 'B', base10A: 10Aあたり基本料金, tiers: [[上限kWh, 単価], ...] }
    //   { type: 'A', min: 最低料金, minKWh: 最低料金に含まれるkWh, tiers: [...] }
    //   { type: 'flat', unit: 1kWhの単価 }（基本料金0円）
    // sameAsStd: 料金表が地域の大手電力と同じ
    electric: [
      {
        id: 'std', name: '地域の大手電力（従量電灯）', confidence: 'high',
        tariffs: {
          hokkaido: { type: 'B', base10A: 572.10, tiers: [[120, 35.77], [280, 42.06], [null, 45.78]], source: 'https://www.hepco.co.jp/home/price/ratemenu/meterratelight.html' },
          tohoku: { type: 'B', base10A: 410.71, tiers: [[120, 31.01], [300, 37.76], [null, 41.71]], source: 'https://www.tohoku-epco.co.jp/dprivate/plan/home/lightb/' },
          tokyo: { type: 'B', base10A: 392.06, tiers: [[120, 29.85], [300, 36.45], [null, 40.54]], confidence: 'mid', checkedAt: '2026-11-10', source: 'https://www.softbank.jp/energy/price/', note: '東京電力のサイトは自動取得できず。ソフトバンクでんき・auでんきの公式料金表（大手と同じ料金）と一致を確認。東京電力の改定試算（30A基本料金1,176.18円・260kWhで電力量料金+13円）と、「同じ料金」のソフトバンクでんきの料金表から計算' },
          chubu: { type: 'B', base10A: 447.92, tiers: [[120, 21.25], [300, 25.73], [null, 28.68]], source: 'https://miraiz.chuden.co.jp/home/electric/menu/basic/meterrate_hba/' },
          hokuriku: { type: 'B', base10A: 302.50, tiers: [[120, 30.86], [300, 34.75], [null, 36.46]], source: 'https://www.rikuden.co.jp/ryokin/minsei.html' },
          kansai: { type: 'A', min: 763.81, minKWh: 15, tiers: [[120, 20.89], [300, 26.29], [null, 29.27]], confidence: 'mid', checkedAt: '2026-11-10', source: 'https://www.softbank.jp/energy/price/', note: '関西電力のサイトは自動取得できず。ソフトバンクでんき「おうちでんき Powered by 関西電力」とauでんき（関西）の公式料金表で、2026年11月改定後の単価と一致を確認' },
          chugoku: { type: 'A', min: 983.37, minKWh: 15, tiers: [[120, 33.32], [300, 40.00], [null, 42.12]], source: 'https://www.energia.co.jp/elec/h_menu/pricelist/pricelist1.html' },
          shikoku: { type: 'A', min: 953.13, minKWh: 11, tiers: [[120, 31.42], [300, 38.04], [null, 41.55]], source: 'https://www.yonden.co.jp/customer/price/plan/juryo_a.html' },
          kyushu: { type: 'B', base10A: 441.69, tiers: [[120, 18.33], [300, 23.93], [null, 26.93]], source: 'https://customer.kyuden.co.jp/ja/electricity/home-plan/jyuryo-b.html' },
        },
      },
      {
        id: 'au-denki', name: 'auでんき', areas: ALL_BUT_OKINAWA, sameAsStd: true, confidence: 'high', source: 'https://www.au.com/energy/denki/merit/plan/',
        pointRateTiers: [{ min: 0, rate: 0.005 }, { min: 8000, rate: 0.01 }],
        todo: [{ phase: 'after', text: 'auでんきのポイント割引を申し込む（au・UQの回線がある場合）' }],
        note: '料金表は大手電力と同じ（東京・北海道で1銭以内の差を確認）。ポイント：月8,000円未満0.5%、以上1%（au/UQ回線の人は申込が必要）',
      },
      {
        id: 'softbank-denki', name: 'ソフトバンクでんき（おうちでんき）', areas: ['hokkaido', 'tokyo', 'chubu', 'kansai', 'chugoku', 'shikoku'], sameAsStd: true,
        confidence: 'high', source: 'https://www.softbank.jp/energy/price/', checkedAt: '2026-11-15',
        tariffs: { chubu: { type: 'B', base10A: 447.92, tiers: [[120, 21.03], [300, 25.47], [null, 28.39]] } },
        note: '北海道・東京・関西・中国・四国は大手電力と同じ料金表。中部は1kWhあたり少し安い。東北は新規受付停止、北陸・九州は提供なし',
      },
      {
        id: 'docomo-denki', name: 'ドコモでんき Basic', areas: ALL_BUT_OKINAWA, sameAsStd: true, pointRate: 0.01, confidence: 'mid', source: 'https://denki.docomo.ne.jp/',
        note: 'dポイント1%（dカード払いで最大2%）は公式で確認。料金表は数字が読み取れず、大手電力と同じとして計算',
      },
      {
        id: 'rakuten-denki', name: '楽天でんき（プランS）', areas: ALL_BUT_OKINAWA, pointRate: 0.005, pointCapMonthly: 1000, confidence: 'high',
        source: 'https://energy.rakuten.co.jp/electricity/fee/plan_s/',
        note: '基本料金0円・1kWhあたり一律（2026年11月改定後）。市場価格調整額が別に加わるため、燃料費調整額との差が出ることがある。ポイントは200円で1ポイント',
        tariffs: {
          hokkaido: { type: 'flat', unit: 44.67 }, tohoku: { type: 'flat', unit: 39.24 }, tokyo: { type: 'flat', unit: 38.00 },
          chubu: { type: 'flat', unit: 39.65 }, hokuriku: { type: 'flat', unit: 36.10 }, kansai: { type: 'flat', unit: 35.28 },
          chugoku: { type: 'flat', unit: 39.89 }, shikoku: { type: 'flat', unit: 37.74 }, kyushu: { type: 'flat', unit: 39.70 },
        },
      },
      {
        id: 'tokyogas-denki', name: '東京ガスの電気（基本プラン）', areas: ['tokyo'], source: 'https://home.tokyo-gas.co.jp/information/nvibqd0000000pml-att/power-basic-261201.pdf',
        confidence: 'high', checkedAt: '2026-11-23',
        note: '2026年12月1日実施の電気料金メニュー定義書（公式PDF）の料金で計算（2027年1月検針分から）。10A 392.05円・120kWhまで29.75円・300kWhまで35.74円・300kWh超39.55円',
        tariffs: { tokyo: { type: 'B', base10A: 392.05, tiers: [[120, 29.75], [300, 35.74], [null, 39.55]] } },
      },
      {
        id: 'cd-denki', name: 'CDエナジー（ベーシックでんき）', areas: ['tokyo'], pointRate: 0.01, confidence: 'high', source: 'https://www.cdedirect.co.jp/plan/denki/basic_denki/',
        note: 'カテエネポイント1%（会員登録が必要）',
        tariffs: { tokyo: { type: 'B', base10A: 356.38, tiers: [[120, 29.90], [300, 35.59], [null, 36.50]] } },
      },
      {
        id: 'eo-denki', name: 'eo電気（スタンダードプランK）', areas: ['kansai'], confidence: 'high', source: 'https://eonet.jp/service/denki/charge/',
        note: '燃料費調整額に上限がない料金のため、燃料価格が上がると大手電力（上限あり）より高くなることがある（計算には入れていない）',
        tariffs: { kansai: { type: 'A', min: 759.48, minKWh: 15, tiers: [[120, 20.69], [300, 26.03], [null, 28.98]] } },
      },
      {
        id: 'osakagas-denki', name: '大阪ガスの電気（ベースプランA）', areas: ['kansai'], confidence: 'high', checkedAt: '2026-11-15', source: 'https://home.osakagas.co.jp/energy/electricity/price/plan_a/',
        tariffs: { kansai: { type: 'A', min: 707.80, minKWh: 15, tiers: [[120, 20.89], [350, 25.88], [null, 28.69]] } },
        note: '燃料費調整額に上限がない料金のため、燃料価格が上がると大手電力（上限あり）より高くなることがある（計算には入れていない）。ベースプランAの料金表。大阪ガスの都市ガスとセットならベースプランA-G（120kWhを超える分が少し安い。下のセット割）',
      },
      {
        id: 'tohogas-denki', name: '東邦ガスの電気（ファミリープラン）', areas: ['chubu'], requiresCityGas: true, confidence: 'high', checkedAt: '2026-11-15', source: 'https://www.tohogas.co.jp/denki/charge/01/index02.html',
        tariffs: { chubu: { type: 'B', base10A: 420.42, baseByAmp: { 10: 840.84, 15: 840.84, 20: 840.84, 30: 1288.76, 40: 1583.68, 50: 2031.60, 60: 2479.52 },
          tiers: [[120, 21.23], [200, 25.38], [250, 25.40], [300, 25.42], [350, 26.65], [400, 27.18], [500, 27.79], [700, 28.62], [1000, 28.64], [null, 28.66]],
          tiersHighAmp: [[120, 21.23], [200, 25.68], [250, 25.70], [300, 25.72], [350, 26.65], [400, 27.18], [500, 27.79], [700, 28.62], [1000, 28.64], [null, 28.66]] } },
        note: '燃料費調整額に上限がない料金のため、燃料価格が上がると大手電力（上限あり）より高くなることがある（計算には入れていない）。シンプルプランⅠ ファミリープラン（2026年11月からの料金）。東邦ガスのガス（都市ガス・LPG）の契約が条件なので、都市ガスの家だけ比べる',
      },
    ],

    // ================= ガス（都市ガス） =================
    // rate: 地域の大手都市ガスと比べて何割安いか
    gas: [
      { id: 'std', name: '地域の大手都市ガス（一般料金）', rate: 0, confidence: 'high' },
    ],

    // ================= セット割・継続割引（毎月） =================
    // target: 'line'（スマホ1回線ごと） / 'hikari' / 'electric' / 'gas'
    // requires: 必要な組み合わせ（mobile は家族のだれか1人がその会社なら満たす。line の割引はその人の会社）
    // plans: スマホのプランごとの割引額 / amount: 円/月 / pointAmount: 毎月のポイント / rate: 電気・ガス代の割引率
    // housing: その住まいの種類だけ / months: 続く月数 / group: 同じ group は1つだけ（大きい方）
    discounts: [
      {
        id: 'docomo-hikari-set', name: 'ドコモ光セット割', target: 'line', group: 'home', confidence: 'high',
        todo: [{ phase: 'after', text: 'ドコモ光セット割が付いているか確認（ファミリー割引グループに入る）' }],
        source: 'https://www.docomo.ne.jp/charge/hikari_set/', note: 'ahamo は対象外',
        requires: { mobile: ['docomo'], hikari: ['docomo-hikari'] },
        plans: { 'docomo-mini2-6': 1210, 'docomo-mini2-12': 1210, 'docomo-max-1': 1210, 'docomo-max-3': 1210, 'docomo-max': 1210 },
      },
      {
        id: 'docomo-denki-set', name: 'ドコモでんきセット割', target: 'line', group: 'docomo-denki', confidence: 'high',
        source: 'https://denki.docomo.ne.jp/',
        requires: { mobile: ['docomo'], electric: ['docomo-denki'] },
        plans: { 'docomo-mini2-6': 110, 'docomo-mini2-12': 110, 'docomo-max-1': 110, 'docomo-max-3': 110, 'docomo-max': 110 },
      },
      {
        id: 'au-smartvalue', name: 'auスマートバリュー', target: 'line', group: 'home', confidence: 'high',
        todo: [{ phase: 'after', text: 'auスマートバリューを申し込む（光回線の開通後）' }],
        source: 'https://www.au.com/mobile/charge/smartphone/plan/sp-mini-plus/', note: '「ネット＋電話」が条件（光電話の月額は下の「セット割に必要な光電話代」で計算）。対象の光回線：auひかり・ビッグローブ光・So-net光・eo光・コミュファ光・ピカラ光・メガ・エッグ・BBIQ など', checkedAt: '2026-11-15',
        requires: { mobile: ['au'], hikari: ['au-hikari', 'biglobe-hikari', 'sonet-hikari', 'eo-hikari', 'commufa', 'pikara', 'megaegg', 'bbiq'] },
        plans: { 'au-mini-1': 1100, 'au-mini-3': 1100, 'au-mini-5': 1100, 'au-max': 1100 },
      },
      {
        id: 'uq-home-net', name: 'UQ 自宅セット割（インターネットコース）', target: 'line', group: 'home', confidence: 'high',
        todo: [{ phase: 'after', text: 'UQ 自宅セット割を申し込む（光回線の開通後）' }],
        source: 'https://www.uqwimax.jp/mobile/newplan/setwari/jitaku/', note: '「ネット＋電話」が条件（光電話の月額は下の「セット割に必要な光電話代」で計算）。コミコミプランバリューは対象外', checkedAt: '2026-11-15',
        requires: { mobile: ['uq'], hikari: ['au-hikari', 'biglobe-hikari', 'sonet-hikari', 'eo-hikari', 'commufa', 'pikara', 'megaegg', 'bbiq'] },
        plans: { 'uq-tokutoku-5': 1100, 'uq-tokutoku-30': 1100 },
      },
      {
        id: 'uq-home-denki', name: 'UQ 自宅セット割（でんきコース）', target: 'line', group: 'home', confidence: 'high',
        todo: [{ phase: 'after', text: 'UQ 自宅セット割（でんきコース）を申し込む' }],
        source: 'https://www.uqwimax.jp/mobile/newplan/setwari/jitaku/', note: 'インターネットコースとは重ならない',
        requires: { mobile: ['uq'], electric: ['au-denki'] },
        plans: { 'uq-tokutoku-5': 1100, 'uq-tokutoku-30': 1100 },
      },
      {
        id: 'uq-komikomi-otoku', name: 'UQコミコミおトク割', target: 'line', group: 'uq-komikomi', months: 13, confidence: 'high',
        source: 'https://www.uqwimax.jp/mobile/plan/komikomi-pv/',
        plans: { 'uq-komikomi': 660 },
      },
      {
        id: 'sb-ouchi-hikari', name: 'おうち割 光セット（ソフトバンク）', target: 'line', group: 'home', confidence: 'high',
        todo: [{ phase: 'after', text: 'おうち割 光セットを申し込む（ソフトバンク光の指定オプションにも加入）' }],
        source: 'https://www.softbank.jp/mobile/campaigns/list/ouchiwari-hikari/',
        requires: { mobile: ['softbank'], hikari: ['softbank-hikari'] },
        plans: { 'sb-minifit2-2': 1100, 'sb-minifit2-5': 1100, 'sb-teigaku': 1100, 'sb-paytoku2': 1100 },
      },
      {
        id: 'ym-ouchi-hikari', name: 'おうち割 光セット（ワイモバイル）', target: 'line', group: 'home', confidence: 'high',
        todo: [{ phase: 'after', text: 'おうち割 光セットを申し込む（ソフトバンク光の指定オプションにも加入）' }],
        source: 'https://www.softbank.jp/internet/sbhikari/price/',
        requires: { mobile: ['ymobile'], hikari: ['softbank-hikari'] },
        plans: { 'ym-s': 1650, 'ym-m': 1650, 'ym-l': 1650 },
      },
      {
        id: 'ym-cho-otoku', name: '超!おトク割（ワイモバイル）', target: 'line', group: 'ym-otoku', months: 12, confidence: 'high', checkedAt: '2026-11-15',
        source: 'https://www.ymobile.jp/plan/', note: 'M/L が12か月 1,100円割引・自動適用（S は対象外）。公式の料金プランのページで確認',
        plans: { 'ym-m': 1100, 'ym-l': 1100 },
      },
      {
        id: 'sb-ouchi-option', name: 'おうち割に必要な光の指定オプション代', target: 'hikari', amount: -550, confidence: 'high',
        source: 'https://www.softbank.jp/mobile/campaigns/list/ouchiwari-hikari/',
        requires: { mobile: ['softbank', 'ymobile'], hikari: ['softbank-hikari'] },
      },
      {
        // auスマートバリュー・UQ 自宅セット割は「ネット＋電話」が条件。光電話の月額（約770円）を足す（auひかりは月額に電話代を入れてあるので除く）
        id: 'au-set-phone', name: 'auスマートバリュー・自宅セット割に必要な光電話代', target: 'hikari', amount: -770, confidence: 'mid', checkedAt: '2026-11-15',
        source: 'https://www.au.com/mobile/charge/charge-discount/smartvalue/', note: '公式の例で光電話 月770円。光回線の会社により金額が少し違う',
        requires: { mobile: ['au', 'uq'], hikari: ['biglobe-hikari', 'sonet-hikari', 'eo-hikari', 'commufa', 'pikara', 'megaegg', 'bbiq'] },
      },
      {
        id: 'sb-hikari-ouen', name: 'ソフトバンク光 超おうち応援割', target: 'hikari', amount: 880, months: 19, startMonth: 7, newOnly: true, needsCurrentFiber: true, housing: ['house'], group: 'sb-ouen', checkedAt: '2026-11-10', confidence: 'high',
        source: 'https://www.softbank.jp/internet/campaigns/list/sbhikari-1g-2026/', note: 'おうち割を使う場合。新規申込のみ。課金開始月を1か月目として7〜25か月目（19か月）。他社サービス利用の証明書の提出が必要',
        requires: { mobile: ['softbank', 'ymobile'], hikari: ['softbank-hikari'] },
        todo: [{ phase: 'apply', text: 'ソフトバンク光の超おうち応援割のため、今の光回線の利用証明書を提出する' }],
      },
      {
        id: 'sb-hikari-ouen-m', name: 'ソフトバンク光 超おうち応援割（マンション）', target: 'hikari', amount: 550, months: 19, startMonth: 7, newOnly: true, needsCurrentFiber: true, housing: ['mansion'], group: 'sb-ouen', checkedAt: '2026-11-10', confidence: 'high',
        source: 'https://www.softbank.jp/internet/campaigns/list/sbhikari-1g-2026/', note: 'おうち割を使う場合',
        requires: { mobile: ['softbank', 'ymobile'], hikari: ['softbank-hikari'] },
        todo: [{ phase: 'apply', text: 'ソフトバンク光の超おうち応援割のため、今の光回線の利用証明書を提出する' }],
      },
      {
        id: 'sb-hikari-ouen-solo', name: 'ソフトバンク光 超おうち応援割（おうち割なし）', target: 'hikari', amount: 440, months: 19, startMonth: 7, newOnly: true, needsCurrentFiber: true, housing: ['house'], group: 'sb-ouen', checkedAt: '2026-11-10', confidence: 'high',
        source: 'https://www.softbank.jp/internet/campaigns/list/sbhikari-1g-2026/',
        requires: { hikari: ['softbank-hikari'] },
      },
      {
        id: 'sb-hikari-ouen-solo-m', name: 'ソフトバンク光 超おうち応援割（おうち割なし・マンション）', target: 'hikari', amount: 275, months: 19, startMonth: 7, newOnly: true, needsCurrentFiber: true, housing: ['mansion'], group: 'sb-ouen', checkedAt: '2026-11-10', confidence: 'high',
        source: 'https://www.softbank.jp/internet/campaigns/list/sbhikari-1g-2026/',
        requires: { hikari: ['softbank-hikari'] },
      },
      {
        id: 'rakuten-hikari-point', name: '楽天ひかり＋楽天モバイル ポイント還元', target: 'hikari', pointAmount: 1000, confidence: 'high',
        source: 'https://network.mobile.rakuten.co.jp/hikari/', note: '楽天ひかりを初めて申し込む人。期間限定ポイント',
        requires: { mobile: ['rakuten'], hikari: ['rakuten-hikari'] },
      },
      {
        // 公式サイトからの新規申込だけ（代理店リンクから申し込むと対象外なので、リンクを貼ったら使わない）
        id: 'pikara-official-5m', name: 'ピカラ光 公式サイト限定 5か月無料', target: 'hikari', amount: 'full', months: 5, startMonth: 2, notWithLink: 'hikari:pikara', confidence: 'high', checkedAt: '2026-11-15',
        source: 'https://www.pikara.jp/lp/2502_hikari_ser/index.html', note: '2025年10月1日〜終了日未定。ピカラ公式サイトから新規申込で、開通月を除く5か月の月額基本料が無料（開通月の無料は計算に入れていない）。コールセンター経由は対象外',
        requires: { hikari: ['pikara'] },
      },
      {
        id: 'iij-mio-wari', name: 'mio割（IIJmioひかり＋IIJmio）', target: 'hikari', amount: 660, confidence: 'high',
        todo: [{ phase: 'after', text: 'IIJmio の mio割を申し込む' }],
        source: 'https://www.iijmio.jp/imh/',
        requires: { mobile: ['iijmio'], hikari: ['iij-hikari'] },
      },
      {
        id: 'iij-hikari-cp-house', name: 'IIJmioひかり 6か月キャンペーン（戸建 月1,760円）', target: 'hikari', amount: 3696, months: 6, housing: ['house'], confidence: 'high', checkedAt: '2026-11-17',
        source: 'https://www.iijmio.jp/campaign/imh/hikaricp.html', note: '全員対象（6か月 月1,760円、IIJmioのスマホがあればmio割660円でさらに月1,100円）。開通翌月から6か月',
        requires: { hikari: ['iij-hikari'] },
      },
      {
        id: 'iij-hikari-cp-mansion', name: 'IIJmioひかり 6か月キャンペーン（マンション 月660円）', target: 'hikari', amount: 3696, months: 6, housing: ['mansion'], confidence: 'high', checkedAt: '2026-11-17',
        source: 'https://www.iijmio.jp/campaign/imh/hikaricp.html', note: '全員対象（6か月 月660円、mio割があれば月0円）',
        requires: { hikari: ['iij-hikari'] },
      },
      {
        id: 'sonet-new', name: 'So-net光 新設の月額割引（戸建・11か月）', target: 'hikari', amount: 2015, months: 11, housing: ['house'], newOnly: true, confidence: 'high', checkedAt: '2026-11-15',
        source: 'https://www.so-net.ne.jp/access/hikari/', requires: { hikari: ['sonet-hikari'] },
      },
      {
        id: 'sonet-new-m', name: 'So-net光 新設の月額割引（マンション・11か月）', target: 'hikari', amount: 915, months: 11, housing: ['mansion'], newOnly: true, confidence: 'high', checkedAt: '2026-11-15',
        source: 'https://www.so-net.ne.jp/access/hikari/', requires: { hikari: ['sonet-hikari'] },
      },
      {
        id: 'en-katte', name: 'enひかり 勝手に割り（UQ・povo・ahamo）', target: 'hikari', amount: 110, confidence: 'high',
        todo: [{ phase: 'after', text: 'enひかり「勝手に割り」を申請する' }],
        source: 'https://enhikari.jp/', note: '別途申請が必要',
        requires: { mobile: ['uq', 'povo', 'ahamo'], hikari: ['en-hikari'] },
      },
      {
        id: 'nuro-2nenwari-h', name: 'NURO光 2年割（戸建）', target: 'hikari', amount: 2070, months: 24, housing: ['house'], confidence: 'high',
        notWithLink: 'hikari:nuro', /* 広告ページ（PR）から申し込むと2年割は使えない（ほかの特典と併用不可） */
        source: 'https://www.nuro.jp/', requires: { hikari: ['nuro'] },
      },
      {
        id: 'nuro-2nenwari-m', name: 'NURO光 2年割（マンション）', target: 'hikari', amount: 2740, months: 24, housing: ['mansion'], confidence: 'high',
        notWithLink: 'hikari:nuro',
        source: 'https://www.nuro.jp/', requires: { hikari: ['nuro'] },
      },
      {
        // 2年割はホームゲートウェイ（月550円）が24か月目まで0円。25か月目からかかる
        id: 'nuro-hgw', name: 'NURO光 ホームゲートウェイ代（25か月目から）', target: 'hikari', amount: -550, months: 24, startMonth: 25, confidence: 'high', checkedAt: '2026-11-17',
        notWithLink: 'hikari:nuro', source: 'https://www.nuro.jp/', requires: { hikari: ['nuro'] },
      },
      {
        // 広告ページから申し込むと契約事務手数料（3,300円）が無料（開通月に同じ額を割引）
        id: 'nuro-pr-fee', name: 'NURO光 広告ページ 契約事務手数料の割引', target: 'hikari', amount: 3300, months: 1, viaLink: 'hikari:nuro', confidence: 'high', checkedAt: '2026-11-18',
        source: 'https://www.nuro.jp/hikari/pr/sp/', note: '広告ページからの申込で、契約事務手数料が開通月に割引される', requires: { hikari: ['nuro'] },
      },
      {
        // 広告ページ（PR）の料金：開通月〜3か月目は0円、4か月目から 戸建5,720円・マンション4,730円（ホームゲートウェイ込み）。契約事務手数料も無料
        id: 'nuro-pr-free-h', name: 'NURO光 広告ページ 3か月無料（戸建）', target: 'hikari', amount: 5720, months: 3, housing: ['house'], viaLink: 'hikari:nuro', confidence: 'high', checkedAt: '2026-11-17',
        source: 'https://www.nuro.jp/hikari/pr/sp/', requires: { hikari: ['nuro'] },
      },
      {
        id: 'nuro-pr-free-m', name: 'NURO光 広告ページ 3か月無料（マンション）', target: 'hikari', amount: 4730, months: 3, housing: ['mansion'], viaLink: 'hikari:nuro', confidence: 'high', checkedAt: '2026-11-17',
        source: 'https://www.nuro.jp/hikari/pr/sp/', requires: { hikari: ['nuro'] },
      },
      {
        id: 'nuro-pr-price-h', name: 'NURO光 広告ページの月額（戸建 5,720円）', target: 'hikari', amount: 330, housing: ['house'], viaLink: 'hikari:nuro', confidence: 'high', checkedAt: '2026-11-17',
        source: 'https://www.nuro.jp/hikari/pr/sp/', note: 'ふつうの月額6,050円との差', requires: { hikari: ['nuro'] },
      },
      {
        id: 'nuro-pr-price-m', name: 'NURO光 広告ページの月額（マンション 4,730円）', target: 'hikari', amount: 990, housing: ['mansion'], viaLink: 'hikari:nuro', confidence: 'high', checkedAt: '2026-11-17',
        source: 'https://www.nuro.jp/hikari/pr/sp/', note: 'ふつうの月額5,720円との差', requires: { hikari: ['nuro'] },
      },
      {
        id: 'megaegg-new', name: 'メガ・エッグ 新規加入割引（2年目まで）', target: 'hikari', amount: 550, months: 24, confidence: 'high',
        source: 'https://www.megaegg.jp/service/fiber/home/', requires: { hikari: ['megaegg'] },
      },
      {
        id: 'auhikari-y1', name: 'auひかり 1年目の料金差', target: 'hikari', amount: -220, months: 12, confidence: 'high',
        source: 'https://www.au.com/internet/auhikari_1g/', requires: { hikari: ['au-hikari'] },
      },
      {
        id: 'auhikari-y2', name: 'auひかり 2年目の料金差', target: 'hikari', amount: -110, months: 12, startMonth: 13, confidence: 'high',
        source: 'https://www.au.com/internet/auhikari_1g/', requires: { hikari: ['au-hikari'] },
      },
      {
        id: 'eo-sokuwari', name: 'eo光 1年目の割引（即割・キャンペーン適用後）', target: 'hikari', amount: 2220, months: 12, confidence: 'high', checkedAt: '2026-11-15',
        source: 'https://eonet.jp/home/charge/pricelist/', note: '1年目3,280円（公式の料金表。キャンペーン割引適用後）。即割は2年利用が条件',
        requires: { hikari: ['eo-hikari'] },
      },
      {
        id: 'sonet-henkou', name: 'So-net光 事業者変更の月額割引（戸建・5か月）', target: 'hikari', amount: 2015, months: 5, housing: ['house'], henkouOnly: true, confidence: 'high', checkedAt: '2026-11-15',
        source: 'https://www.so-net.ne.jp/access/hikari/1g/', requires: { hikari: ['sonet-hikari'] },
      },
      {
        id: 'sonet-henkou-m', name: 'So-net光 事業者変更の月額割引（マンション・5か月）', target: 'hikari', amount: 915, months: 5, housing: ['mansion'], henkouOnly: true, confidence: 'high', checkedAt: '2026-11-15',
        source: 'https://www.so-net.ne.jp/access/hikari/1g/', requires: { hikari: ['sonet-hikari'] },
      },
      {
        // メガ・エッグ 公式Web特典：光ベーシックの基本料金が開通月＋2か月無料（開通月は日割りのため2か月分で計算）。代理店リンクからは対象外
        id: 'megaegg-official-free', name: 'メガ・エッグ 公式Web特典 基本料金2か月無料', target: 'hikari', amount: 5170, months: 2, startMonth: 2, notWithLink: 'hikari:megaegg', confidence: 'high', checkedAt: '2026-11-15',
        source: 'https://www.megaegg.jp/benefit/official202510/', note: '公式サイトから新規申込・工事費は分割払いを選ぶ',
        requires: { hikari: ['megaegg'] },
      },
      {
        id: 'commufa-1y980', name: 'コミュファ光 1年間980円キャンペーン', target: 'hikari', amount: 4190, months: 12, startMonth: 2, confidence: 'high', checkedAt: '2026-11-15',
        notWithLink: 'hikari:commufa', /* コミュファ光が指定するWEBページからの申込が条件。代理店（エルアイデア）経由では使えない */
        source: 'https://www.commufa.jp/services/information/',
        requires: { hikari: ['commufa'] },
      },
      {
        // 代理店（エルアイデア）のページから申し込むときの公式割引（980円キャンペーンとは併用できない）。2026-11-14 に公式ページで確認
        id: 'commufa-3nen', name: 'コミュファ光 光ネット3年割', target: 'hikari', amount: 890, months: 36, confidence: 'high', checkedAt: '2026-11-14',
        viaLink: 'hikari:commufa',
        source: 'https://www.commufa.jp/services/information/',
        requires: { hikari: ['commufa'] },
        note: 'ホーム1Gは月890円引き（開通翌月から36か月）。コミュファ光ネットの契約時に申し込みが必要',
      },
      {
        id: 'pikara-yonden', name: 'ピカラ光 四国電力のでんきセット', target: 'hikari', amount: 330, confidence: 'high',
        source: 'https://www.pikara.jp/net/home.html',
        requires: { hikari: ['pikara'], electric: ['std'], area: ['shikoku'] },
      },
      {
        id: 'megaegg-energia', name: 'メガ・エッグ 中国電力の電気セット', target: 'hikari', amount: 550, confidence: 'high',
        source: 'https://www.megaegg.jp/service/fiber/home/',
        requires: { hikari: ['megaegg'], electric: ['std'], area: ['chugoku'] },
      },
      {
        id: 'bbiq-first', name: 'BBIQ 2〜12か月目の割引', target: 'hikari', amount: 2530, months: 11, confidence: 'high',
        endsAt: '2027-01-28',
        source: 'https://www.bbiq.jp/', note: 'Web・電話申込（2027年1月28日まで）',
        requires: { hikari: ['bbiq'] },
      },
      {
        id: 'sb-denki-ouen', name: 'ソフトバンクでんき でんき応援割（3か月）', target: 'electric', amount: 1100, months: 3, endsAt: '2027-03-31', checkedAt: '2026-11-17', confidence: 'high', newOnly: true,
        replacedByLink: true, notWithLink: 'electric:softbank-denki', /* 比較サイト限定ページ（sb-denki-site）と同じ割引。リンクを貼ったらそちらで計算し、2回数えない */
        source: 'https://www.softbank.jp/energy/special/first-monthfree2025-2026/', note: '毎月「最大」1,100円の割引を3か月。北海道・東京・中部・中国・四国のみ。1年未満の解約は違約金5,000円',
        requires: { electric: ['softbank-denki'], area: ['hokkaido', 'tokyo', 'chubu', 'chugoku', 'shikoku'] },
      },
      {
        id: 'osakagas-set-e', name: '大阪ガス ガス・電気セット（電気：ベースプランA-G）', target: 'electric', rate: 0.009, confidence: 'high', checkedAt: '2026-11-17',
        source: 'https://home.osakagas.co.jp/energy/electricity/price/plan_ag/', note: 'ベースプランA-GはAより120〜350kWhが0.40円、350kWh超が0.29円安い。月260kWhで約0.9%として計算',
        requires: { area: ['kansai'], electric: ['osakagas-denki'], gas: ['std'] },
      },
      {
        id: 'osakagas-set-g', name: '大阪ガス まとめトク料金（ガス代 約3%）', target: 'gas', rate: 0.03, confidence: 'high',
        source: 'https://home.osakagas.co.jp/set_plan/',
        requires: { area: ['kansai'], electric: ['osakagas-denki'], gas: ['std'] },
      },
      {
        id: 'tokyogas-set', name: '東京ガス ガス・電気セット割（定率B 0.5%）', target: 'electric', rate: 0.005, confidence: 'high',
        todo: [{ phase: 'after', text: '東京ガス「ガス・電気セット割」を申し込む' }],
        source: 'https://home.tokyo-gas.co.jp/gas_power/plan/gp_plan/set.html', note: '申込が必要',
        requires: { area: ['tokyo'], electric: ['tokyogas-denki'], gas: ['std'] },
      },
    ],

    // ================= クレジットカード払いの割引 =================
    // family: 同じ系列（一般・ゴールド）はどちらか1枚 / perLine: { スマホ会社: 1回線あたりの割引 } / plans: 対象プランを絞るとき
    // annualFee: 年会費 / joinBonus: 新しく作ったときの入会特典
    // 家族の回線も、同じカードで支払えば割引が付く前提で計算（家族カードが必要な場合あり）
    cards: [
      {
        id: 'dcard', family: 'd', tier: 'normal', name: 'dカード', annualFee: 0, confidence: 'high',
        source: 'https://www.docomo.ne.jp/charge/dcard_oshiharai/',
        perLine: { docomo: 220 }, note: 'dカードお支払割（ドコモ MAX・mini など）。ahamo は対象外',
        joinBonus: null,
      },
      {
        id: 'dcard-gold', family: 'd', tier: 'gold', name: 'dカード GOLD', annualFee: 11000, confidence: 'high',
        source: 'https://www.docomo.ne.jp/charge/dcard_oshiharai/',
        perLine: { docomo: 550 },
        joinBonus: { amount: 7400, kind: 'points', receive: 'apply', confidence: 'high', checkedAt: '2026-11-17', source: 'https://dcard.docomo.ne.jp/std/campaigns/202607_1cm/cpn-shinkinyuukai-tokuten-standard/index.html', note: '入会＆利用特典（最大）：新規入会2,000＋固定費の支払い最大2,400＋利用3,000ポイント。公式で確認。2026年12月以降に還元率・年会費の見直し予定と公式に記載' },
      },
      {
        id: 'aupay', family: 'au', tier: 'normal', name: 'au PAY カード', annualFee: 0, confidence: 'high',
        source: 'https://www.au.com/mobile/charge/discount-option/aupay-card-wari/',
        perLine: { au: 220, uq: 220 }, plans: ['au-mini-1', 'au-mini-3', 'au-mini-5', 'au-max', 'uq-tokutoku-5', 'uq-tokutoku-30'],
        note: 'au PAY カードお支払い割。UQ はトクトクプラン2（公式の割引後料金から計算）',
        joinBonus: { amount: 3000, kind: 'points', receive: 'apply', confidence: 'high', checkedAt: '2026-11-17', source: 'https://www.kddi-fs.com/function/promotion/', note: '新規入会＆利用特典（最大）。公式で確認（2026年6月1日〜・終了日の記載なし）' },
      },
      {
        id: 'aupay-gold', family: 'au', tier: 'gold', name: 'au PAY ゴールドカード', annualFee: 11000, confidence: 'high',
        source: 'https://www.au.com/mobile/charge/discount-option/aupay-card-wari/',
        perLine: { au: 220, uq: 220 }, plans: ['au-mini-1', 'au-mini-3', 'au-mini-5', 'au-max', 'uq-tokutoku-5', 'uq-tokutoku-30'],
        note: 'スマホ代の割引は一般カードと同じ。コミコミプランバリューの14か月目以降の割引継続は計算に入れていない',
        joinBonus: { amount: 10000, kind: 'points', receive: 'apply', confidence: 'high', checkedAt: '2026-11-17', source: 'https://www.kddi-fs.com/function/promotion/', note: '新規入会＆利用特典（最大）。公式で確認（2026年6月1日〜・終了日の記載なし）' },
      },
      {
        id: 'paypay', family: 'paypay', tier: 'normal', name: 'PayPayカード', annualFee: 0, confidence: 'high',
        source: 'https://cdn.softbank.jp/mobile/set/common/pdf/legal/spguide/price_plan/paypay-card.pdf',
        perLine: { softbank: 330, ymobile: 330 }, note: 'PayPayカード割（ソフトバンク・ワイモバイル シンプル3）',
        joinBonus: null /* 公式の申込ページに「入会時に特典はありません」（2026-11-23 確認 https://www.paypay-card.co.jp/campaign/sign-up/web/ ） */,
      },
      {
        id: 'paypay-gold', family: 'paypay', tier: 'gold', name: 'PayPayカード ゴールド', annualFee: 11000, confidence: 'high',
        source: 'https://www.ymobile.jp/yservice/howto/discount/',
        perLine: { softbank: 550, ymobile: 770 }, note: 'ソフトバンク550円（提供条件書）、ワイモバイル770円（公式）',
        joinBonus: { amount: 5000, kind: 'points', receive: 'apply', confidence: 'high', checkedAt: '2026-11-17', source: 'https://www.paypay-card.co.jp/campaign/sign-up/web/gold', note: '入会特典。公式で確認。年100万円以上使うと別に6,000ポイント（計算に入れていない）' },
      },
    ],

    // ================= キャンペーン（1回きり） =================
    // receive: 'auto' = 申請不要で自動 / 'apply' = 自分で申請・エントリーが必要 / なし = 受け取り方を確認できず
    // coversCancelFee: 今の光回線の解約金を負担（上限 cap）
    campaigns: [
      {
        // ドコモ オンラインショップの SIMのみ契約。ドコモ MAX・ポイ活 MAX への乗り換えは20,000ポイント（ドコモ mini の金額は公式で確認できず入れていない）
        id: 'docomo-mnp-max', name: 'ドコモ SIMのみ乗り換え dポイント（ドコモ MAX）', target: 'line', provider: 'docomo', plans: ['docomo-max-1', 'docomo-max-3', 'docomo-max'], amount: 15000, kind: 'points', mnpOnly: true,
        checkedAt: '2026-11-23', confidence: 'mid', receive: 'apply', receiveNote: '開通手続きの翌々月から5か月に分けて（月3,000ポイント）dポイント（期間・用途限定）',
        todo: [{ phase: 'before', text: 'ドコモのSIMのみ契約キャンペーンにWebエントリーする（申込前）' }],
        source: 'https://www.docomo.ne.jp/campaign_event/plan_norikae/index.html',
        applyNote: 'ドコモオンラインショップで「SIMのみ」で申し込む',
        conditions: 'ドコモオンラインショップでのSIMのみ契約（要Webエントリー）。公式は「最大20,000pt」だが、個人のドコモ MAX・ポイ活 MAX へののりかえは15,000ポイント（2026年11月1日以降の申込。マイナビ https://sim.news.mynavi.jp/norikae-campaign/docomo-campaign/ ・なるはやネット https://naruhayanet.jp/docomo-max-campaign/ で確認。オンラインショップのページは読み取れず）。新規は10,000ポイント',
      },
      {
        // 本気割：乗り換えで 360GB（365日間）トッピングを買うと半額をau PAY 残高に還元
        id: 'povo-mnp-360', name: 'povo 本気割（360GB・365日間トッピング）', target: 'line', provider: 'povo', plans: ['povo-360y'], amount: 13200, kind: 'cash', mnpOnly: true,
        checkedAt: '2026-11-17', confidence: 'high', receive: 'auto', receiveNote: 'SIM有効化の翌月末までにau PAY 残高へ',
        source: 'https://povo.jp/campaign/detail/mnp_aupay_cpn_2025_05/',
        applyNote: 'SIMを有効化してから7日以内に「データ追加360GB（365日間）」を買う（au IDを連携しておく）',
        conditions: '他社からの乗り換えで「通話＋データ」プラン（au・UQ・povo1.0からは対象外）。SIM有効化の7日後までに初めて対象トッピングを購入。au IDの連携とau PAYの利用開始が必要',
      },
      {
        id: 'iij-half-5', name: 'IIJmio ギガプラン半額キャンペーン（5ギガ）', target: 'line', provider: 'iijmio', plans: ['iij-5'], amount: 950, kind: 'cash',
        checkedAt: '2026-11-15', confidence: 'high', receive: 'auto', receiveNote: '利用開始月から最大3か月、月額基本料が半額（月475円引き）',
        source: 'https://www.iijmio.jp/campaign/mio.html?cptype=simcp',
        conditions: '2026年11月5日〜終了日未定。音声SIM・音声eSIMの新規・乗り換え。最大3か月半額だが、1か月目は日割りのため2か月分（950円）で計算。特典の間は同じ容量のプランを続けること',
      },
      {
        id: 'iij-half-10', name: 'IIJmio ギガプラン半額キャンペーン（10ギガ）', target: 'line', provider: 'iijmio', plans: ['iij-10'], amount: 1400, kind: 'cash',
        checkedAt: '2026-11-15', confidence: 'high', receive: 'auto', receiveNote: '利用開始月から最大3か月、月額基本料が半額（月700円引き）',
        source: 'https://www.iijmio.jp/campaign/mio.html?cptype=simcp',
        conditions: '2026年11月5日〜終了日未定。音声SIM・音声eSIMの新規・乗り換え。最大3か月半額だが、1か月目は日割りのため2か月分（1,400円）で計算。特典の間は同じ容量のプランを続けること',
      },
      {
        id: 'iij-half-15', name: 'IIJmio ギガプラン半額キャンペーン（15ギガ）', target: 'line', provider: 'iijmio', plans: ['iij-15'], amount: 1600, kind: 'cash',
        checkedAt: '2026-11-15', confidence: 'high', receive: 'auto', receiveNote: '利用開始月から最大3か月、月額基本料が半額（月800円引き）',
        source: 'https://www.iijmio.jp/campaign/mio.html?cptype=simcp',
        conditions: '2026年11月5日〜終了日未定。音声SIM・音声eSIMの新規・乗り換え。最大3か月半額だが、1か月目は日割りのため2か月分（1,600円）で計算。特典の間は同じ容量のプランを続けること',
      },
      {
        id: 'iij-half-25', name: 'IIJmio ギガプラン半額キャンペーン（25ギガ）', target: 'line', provider: 'iijmio', plans: ['iij-25'], amount: 2000, kind: 'cash',
        checkedAt: '2026-11-15', confidence: 'high', receive: 'auto', receiveNote: '利用開始月から最大3か月、月額基本料が半額（月1000円引き）',
        source: 'https://www.iijmio.jp/campaign/mio.html?cptype=simcp',
        conditions: '2026年11月5日〜終了日未定。音声SIM・音声eSIMの新規・乗り換え。最大3か月半額だが、1か月目は日割りのため2か月分（2,000円）で計算。特典の間は同じ容量のプランを続けること',
      },
      {
        id: 'iij-half-35', name: 'IIJmio ギガプラン半額キャンペーン（35ギガ）', target: 'line', provider: 'iijmio', plans: ['iij-35'], amount: 2400, kind: 'cash',
        checkedAt: '2026-11-15', confidence: 'high', receive: 'auto', receiveNote: '利用開始月から最大3か月、月額基本料が半額（月1200円引き）',
        source: 'https://www.iijmio.jp/campaign/mio.html?cptype=simcp',
        conditions: '2026年11月5日〜終了日未定。音声SIM・音声eSIMの新規・乗り換え。最大3か月半額だが、1か月目は日割りのため2か月分（2,400円）で計算。特典の間は同じ容量のプランを続けること',
      },
      {
        id: 'au-ols-new', name: 'au Online Shop SIM新規契約特典', target: 'line', provider: 'au', plans: ['au-max'], amount: 10000, kind: 'cash', newLineOnly: true,
        checkedAt: '2026-11-17', confidence: 'high', receive: 'auto', source: 'https://www.au.com/mobile/campaign/ols-sim-2010/',
        conditions: 'au Online Shop で SIM・eSIM のみの新規契約（5〜12歳は20,000円）。スマホミニプラン＋は対象外',
      },
      {
        id: 'docomo-new-max', name: 'ドコモ SIMのみ新規契約 dポイント（ドコモ MAX）', target: 'line', provider: 'docomo', plans: ['docomo-max-1', 'docomo-max-3', 'docomo-max'], amount: 10000, kind: 'points', newLineOnly: true,
        checkedAt: '2026-11-23', confidence: 'mid', receive: 'apply', source: 'https://www.docomo.ne.jp/campaign_event/plan_norikae/index.html',
        todo: [{ phase: 'before', text: 'ドコモのSIMのみ契約キャンペーンにWebエントリーする（申込前）' }],
        conditions: 'ドコモオンラインショップでのSIMのみ新規契約（要Webエントリー）。ドコモ MAX・ポイ活 MAX は10,000ポイント（マイナビ 2026-11-21・なるはやネット 2026-11-10 の記事で確認。オンラインショップのページは自動で読めない）。金額は記事（マイナビ 2026-11-12）で確認',
      },
      {
        id: 'ym-mnp-s', name: 'ワイモバイル 乗り換え特典（S）', target: 'line', provider: 'ymobile', plans: ['ym-s'], amount: 5000, kind: 'points', mnpOnly: true, group: 'ym-mnp-s',
        todo: [{ phase: 'later', months: 5, text: 'ワイモバイルの「データ増量オプション」を外す（無料は6か月目まで。外さないと月550円かかる）' }],
        confidence: 'mid', checkedAt: '2026-11-23', source: 'https://selectra.jp/telecom/mobile/ymobile-campaigns',
        conditions: 'SプランにSIMのみの乗り換え。データ増量オプション（6か月無料）の加入が条件。ソフトバンク・LINEMOからは対象外（公式ページは自動で読めず記事で確認）',
      },
      {
        id: 'ym-mnp-s-bf', name: 'ワイモバイル 乗り換え特典（S・ブラックフライデー増額）', target: 'line', provider: 'ymobile', plans: ['ym-s'], amount: 15000, kind: 'points', mnpOnly: true, group: 'ym-mnp-s',
        endsAt: '2026-11-30', /* 12月1日14:59まで。1日は午後で締め切りなので計算は11月30日まで */
        todo: [{ phase: 'later', months: 5, text: 'ワイモバイルの「データ増量オプション」を外す（無料は6か月目まで。外さないと月550円かかる）' }],
        confidence: 'mid', checkedAt: '2026-11-23', source: 'https://selectra.jp/telecom/mobile/ymobile-campaigns',
        conditions: 'ブラックフライデー（2026年11月20日10:00〜12月1日14:59）。SプランにSIMのみの乗り換えで15,000円相当（通常5,000円相当）。データ増量オプション（6か月無料）の加入が条件。ソフトバンク・LINEMOからは対象外（公式ページは自動で読めず記事 2026-11-22 更新で確認）',
      },
      {
        id: 'ym-bf-fee', name: 'ワイモバイル 契約事務手数料0円（ブラックフライデー）', target: 'line', provider: 'ymobile', amount: 3850, kind: 'cash',
        endsAt: '2026-11-30', confidence: 'mid', checkedAt: '2026-11-23', receive: 'auto', source: 'https://selectra.jp/telecom/mobile/ymobile-campaigns',
        conditions: 'ブラックフライデー（12月1日14:59まで）の申込で契約事務手数料3,850円が無料（公式ページは自動で読めず記事で確認）',
      },
      {
        id: 'ym-new', name: 'ワイモバイル 新規契約特典（M・L）', target: 'line', provider: 'ymobile', plans: ['ym-m', 'ym-l'], amount: 5000, kind: 'points', newLineOnly: true,
        todo: [{ phase: 'later', months: 5, text: 'ワイモバイルの「データ増量オプション」を外す（無料は6か月目まで。外さないと月550円かかる）' }],
        confidence: 'mid', checkedAt: '2026-11-17', source: 'https://selectra.jp/telecom/mobile/ymobile-campaigns',
        conditions: 'M/LプランにSIMのみの新規契約（5〜18歳は10,000円相当）。データ増量オプション（6か月無料）の加入が条件',
      },
      {
        id: 'rakuten-new', name: '楽天モバイル 新規申し込みポイント', target: 'line', provider: 'rakuten', amount: 9000, kind: 'points', newLineOnly: true, group: 'rakuten-first',
        checkedAt: '2026-11-17', confidence: 'high', receive: 'apply', source: 'https://network.mobile.rakuten.co.jp/campaign/mnp/',
        conditions: '電話番号を新しく取る申し込み（9,000ポイント）。事前エントリー・Rakuten Linkで10秒以上の通話が必要',
      },
      {
        id: 'linemo-new', name: 'LINEMO 新規契約特典（ベストプランV）', target: 'line', provider: 'linemo', plans: ['linemo-30'], amount: 6000, kind: 'points', newLineOnly: true,
        confidence: 'mid', checkedAt: '2026-11-17', source: 'https://selectra.jp/telecom/news/linemo-paypay-boost-fee-free-november-2026',
        conditions: '2026年11月23日〜12月6日の申込はPayPayポイント増額（ベストプランVは乗り換え20,000・新規14,000。ベストプランは未発表）と事務手数料0円の予定（まだ始まっていないので計算に入れていない）。新しい番号での契約（ベストプランは3,000ポイント）。公式ページは自動で読めず記事で確認',
      },
      {
        id: 'linemo-new-best', name: 'LINEMO 新規契約特典（ベストプラン）', target: 'line', provider: 'linemo', plans: ['linemo-3', 'linemo-10'], amount: 3000, kind: 'points', newLineOnly: true,
        confidence: 'mid', checkedAt: '2026-11-17', source: 'https://selectra.jp/telecom/news/linemo-paypay-boost-fee-free-november-2026',
        conditions: '2026年11月23日〜12月6日の申込はPayPayポイント増額（ベストプランVは乗り換え20,000・新規14,000。ベストプランは未発表）と事務手数料0円の予定（まだ始まっていないので計算に入れていない）。新しい番号での契約。公式ページは自動で読めず記事で確認',
      },
      {
        id: 'mineo-pittari-3', name: 'mineo 秋のピッタリ割（3GB）', target: 'line', provider: 'mineo', plans: ['mineo-3'], amount: 2090, kind: 'cash', endsAt: '2026-11-30',
        checkedAt: '2026-11-17', confidence: 'high', receive: 'auto', source: 'https://mineo.jp/campaign/cp-20260917-1/',
        conditions: 'マイピタ デュアルタイプ（音声）の新規申込。利用開始月から最大6か月（1か月目は日割りのため5か月分で計算）、月418円引き（11月30日までの申込・12月31日までに開通）。法人は対象外',
      },
      {
        id: 'mineo-pittari-7', name: 'mineo 秋のピッタリ割（7GB）', target: 'line', provider: 'mineo', plans: ['mineo-7'], amount: 2640, kind: 'cash', endsAt: '2026-11-30',
        checkedAt: '2026-11-17', confidence: 'high', receive: 'auto', source: 'https://mineo.jp/campaign/cp-20260917-1/',
        conditions: 'マイピタ デュアルタイプ（音声）の新規申込。利用開始月から最大6か月（1か月目は日割りのため5か月分で計算）、月528円引き（11月30日までの申込・12月31日までに開通）。法人は対象外',
      },
      {
        id: 'mineo-pittari-15', name: 'mineo 秋のピッタリ割（15GB）', target: 'line', provider: 'mineo', plans: ['mineo-15'], amount: 4840, kind: 'cash', endsAt: '2026-11-30',
        checkedAt: '2026-11-17', confidence: 'high', receive: 'auto', source: 'https://mineo.jp/campaign/cp-20260917-1/',
        conditions: 'マイピタ デュアルタイプ（音声）の新規申込。利用開始月から最大6か月（1か月目は日割りのため5か月分で計算）、月968円引き（11月30日までの申込・12月31日までに開通）。法人は対象外',
      },
      {
        id: 'mineo-pittari-30', name: 'mineo 秋のピッタリ割（30GB）', target: 'line', provider: 'mineo', plans: ['mineo-30'], amount: 4290, kind: 'cash', endsAt: '2026-11-30',
        checkedAt: '2026-11-17', confidence: 'high', receive: 'auto', source: 'https://mineo.jp/campaign/cp-20260917-1/',
        conditions: 'マイピタ デュアルタイプ（音声）の新規申込。利用開始月から最大6か月（1か月目は日割りのため5か月分で計算）、月858円引き（11月30日までの申込・12月31日までに開通）。法人は対象外',
      },
      {
        id: 'mineo-pittari-50', name: 'mineo 秋のピッタリ割（50GB）', target: 'line', provider: 'mineo', plans: ['mineo-50'], amount: 4290, kind: 'cash', endsAt: '2026-11-30',
        checkedAt: '2026-11-17', confidence: 'high', receive: 'auto', source: 'https://mineo.jp/campaign/cp-20260917-1/',
        conditions: 'マイピタ デュアルタイプ（音声）の新規申込。利用開始月から最大6か月（1か月目は日割りのため5か月分で計算）、月858円引き（11月30日までの申込・12月31日までに開通）。法人は対象外',
      },
      {
        id: 'ahamo-mnp', name: 'ahamo 乗り換え特典', target: 'line', provider: 'ahamo', amount: 20000, kind: 'points', mnpOnly: true,
        todo: [{ phase: 'apply', text: 'ahamo のキャンペーンページで対象条件を確認してから申し込む' }],
        confidence: 'high', checkedAt: '2026-11-17', receive: 'auto', receiveNote: '条件を満たした月の翌々月末から5か月、毎月4,000ポイント', source: 'https://ahamo.com/special/lp/dpointcp/001.html',
        conditions: 'SIMのみの乗り換え（要エントリー）。dポイント（期間・用途限定）合計20,000ポイント。ドコモからは対象外。JALモバイルオプション同時申込は対象外',
      },
      {
        id: 'uq-mnp', name: 'UQモバイル 乗り換え特典', target: 'line', provider: 'uq', amount: 20000, kind: 'cash', mnpOnly: true,
        todo: [{ phase: 'apply', text: 'UQモバイルは「SIMのみ」でオンライン申込（特典の対象）' }, { phase: 'later', months: 6, text: 'UQモバイルの「増量オプションⅡ」を外す（無料は7か月目まで。外さないと月550円かかる）' }],
        confidence: 'high', checkedAt: '2026-11-17', receive: 'auto', receiveNote: '開通翌月下旬以降にau PAY 残高へ', source: 'https://shop.uqmobile.jp/shop/cashback/',
        conditions: '2026年9月17日から20,000円。SIM・eSIMのみの乗り換えで、トクトクプラン2かコミコミプランバリュー。増量オプションⅡ（月550円・7か月無料、その間に外せば0円）の加入が条件。au・povoからは対象外',
      },
      {
        id: 'au-ols-mnp', name: 'au Online Shop SIM乗り換え特典', target: 'line', provider: 'au', plans: ['au-max'], amount: 20000, upTo: true, kind: 'cash', mnpOnly: true,
        todo: [{ phase: 'apply', text: 'au は Online Shop から SIM のみで申し込む（特典の対象）' }],
        confidence: 'high', checkedAt: '2026-11-17', source: 'https://www.au.com/mobile/campaign/ols-sim-2010/',
        conditions: '2026年9月17日〜終了日未定。スマホミニプラン＋は対象外。au Online Shop で SIM・eSIM のみの乗り換え。au PAY 残高で最大20,000円相当。UQ・povoからは対象外',
      },
      {
        id: 'ym-mnp', name: 'ワイモバイル 乗り換え特典（M・L）', target: 'line', provider: 'ymobile', plans: ['ym-m', 'ym-l'], amount: 15000, kind: 'points', mnpOnly: true,
        todo: [{ phase: 'apply', text: 'ワイモバイルは特典が載っているページから SIM のみで申し込む' }, { phase: 'later', months: 5, text: 'ワイモバイルの「データ増量オプション」を外す（無料は6か月目まで。外さないと月550円かかる）' }],
        confidence: 'mid', checkedAt: '2026-11-17', source: 'https://selectra.jp/telecom/mobile/ymobile-campaigns',
        conditions: 'M/LプランにSIMのみの乗り換え。データ増量オプション（月550円・6か月無料、その間に外せば0円）の加入が条件。PayPayポイント15,000円相当（ヤフー店は最大21,000円相当）。ソフトバンク・LINEMOからは対象外（記事は2026-11-13更新・終了日未定）',
      },
      {
        id: 'rakuten-mnp', name: '楽天モバイル 乗り換えポイント', target: 'line', provider: 'rakuten', amount: 10000, kind: 'points', mnpOnly: true, group: 'rakuten-first',
        todo: [{ phase: 'before', text: '楽天モバイルの乗り換えキャンペーンにエントリーする（申込前）' }],
        checkedAt: '2026-11-17', confidence: 'high', receive: 'apply', receiveNote: '事前エントリーが必要。条件達成の翌々月末ごろから3回に分けて受け取り手続き（4,000・3,000・3,000ポイント、有効3か月）', source: 'https://network.mobile.rakuten.co.jp/campaign/mnp/',
        conditions: '他社から電話番号そのまま乗り換え（新規は9,000ポイント）。申込翌月末までに利用開始とRakuten Linkで10秒以上の通話が必要',
      },
      {
        // 楽天マジ得フェスティバル（楽天カードを持っている人の初めての申し込み）。ほかの「初めて申し込み」の特典とは一番多いものだけ（group）
        id: 'rakuten-majitoku', name: '楽天モバイル初めて申し込み 20,000ポイント（楽天カードを持っている人）', target: 'line', provider: 'rakuten', amount: 20000, kind: 'points', group: 'rakuten-first',
        onePerHousehold: true, onceKey: 'rakuten-card', endsAt: '2026-12-20', /* Web申込は12月21日10:00まで。21日は朝で締め切りなので計算は20日まで */
        checkedAt: '2026-11-23', confidence: 'high', receive: 'auto', receiveNote: '2027年2月から5か月、毎月末ごろに4,000ポイント（期間限定）',
        source: 'https://network.mobile.rakuten.co.jp/campaign/card-mobile-majitoku/', applyUrl: 'https://network.mobile.rakuten.co.jp/campaign/card-mobile-majitoku/',
        conditions: '楽天マジ得フェスティバル（2026年11月20日〜12月21日10:00のWeb申込）。2026年末時点で有効な楽天カードを持っている人の、楽天モバイル初めての申し込み（新規・乗り換えとも）。クーポン「RKCMJT00000012」。12月31日までに利用開始とRakuten Linkで発信。乗り換え・新規のポイント特典とは併用できない',
        applyNote: 'キャンペーンページの申し込みボタンから申し込み、クーポン「RKCMJT00000012」が表示されているか確認（12月21日10時まで）',
        todo: [{ phase: 'before', text: '楽天カードを持っているか確認する（持っていない場合は対象外）' }],
      },
      {
        // 楽天銀行会員向け（常時開催）。楽天銀行利用者3,000ポイント＋乗り換え10,000／新規9,000ポイント。ほかの「初めて申し込み」の特典とは一番多いものだけ（group）
        id: 'rakuten-bank-member-mnp', name: '楽天モバイル 楽天銀行会員向け 乗り換え 13,000ポイント', target: 'line', provider: 'rakuten', amount: 13000, kind: 'points', mnpOnly: true, group: 'rakuten-first',
        onePerHousehold: true, onceKey: 'rakuten-bank' /* 楽天銀行の特典は家族で1回 */, checkedAt: '2026-11-17', confidence: 'high', receive: 'apply',
        receiveNote: '楽天銀行利用者特典3,000ポイントは利用開始月の3か月後の月末ごろ。10,000ポイントは届いた通知から受け取り手続き',
        source: 'https://network.mobile.rakuten.co.jp/campaign/bank-member-campaign/', applyUrl: 'https://network.mobile.rakuten.co.jp/campaign/bank-member-campaign/',
        conditions: '常時開催。楽天銀行口座が必要。申込月に楽天銀行ハッピープログラムにエントリー、クーポン「RBNREG00000002」、翌月末までに利用開始とRakuten Linkで10秒以上の発信。おひとり様1回',
        todo: [{ phase: 'before', text: '楽天銀行のハッピープログラムにエントリーし、楽天モバイルの楽天銀行会員向けキャンペーンにエントリーする（申込前）' }],
      },
      {
        id: 'rakuten-bank-member-new', name: '楽天モバイル 楽天銀行会員向け 新規 12,000ポイント', target: 'line', provider: 'rakuten', amount: 12000, kind: 'points', newLineOnly: true, group: 'rakuten-first',
        onePerHousehold: true, onceKey: 'rakuten-bank' /* 楽天銀行の特典は家族で1回 */, checkedAt: '2026-11-17', confidence: 'high', receive: 'apply',
        receiveNote: '楽天銀行利用者特典3,000ポイントは利用開始月の3か月後の月末ごろ。9,000ポイントは届いた通知から受け取り手続き',
        source: 'https://network.mobile.rakuten.co.jp/campaign/bank-member-campaign/', applyUrl: 'https://network.mobile.rakuten.co.jp/campaign/bank-member-campaign/',
        conditions: '常時開催。新しい電話番号での申込。楽天銀行口座が必要。申込月に楽天銀行ハッピープログラムにエントリー、クーポン「RBNREG00000002」、翌月末までに利用開始とRakuten Linkで10秒以上の発信。おひとり様1回',
        todo: [{ phase: 'before', text: '楽天銀行のハッピープログラムにエントリーし、楽天モバイルの楽天銀行会員向けキャンペーンにエントリーする（申込前）' }],
      },
      {
        id: 'linemo-mnp', name: 'LINEMO 乗り換え特典（ベストプランV）', target: 'line', provider: 'linemo', plans: ['linemo-30'], amount: 12000, kind: 'points', mnpOnly: true,
        todo: [{ phase: 'apply', text: 'LINEMO のキャンペーンページで対象条件・エントリーを確認してから申し込む' }],
        checkedAt: '2026-11-18', confidence: 'mid', /* 公式は自動で読めず、Selectra（2026-11-17）で同じ金額を確認 */ source: 'https://www.linemo.jp/campaign/syukakusai/',
        conditions: 'PayPayポイント12,000円相当（LINEMOベストプランVに他社から乗り換え。終了日未定）。週替わりの増額期間あり（計算には入れていない）。ソフトバンク・ワイモバイル・LINEモバイルからは対象外',
      },
      {
        id: 'linemo-mnp-best', name: 'LINEMO 乗り換え特典（ベストプラン）', target: 'line', provider: 'linemo', plans: ['linemo-3', 'linemo-10'], amount: 10000, kind: 'points', mnpOnly: true,
        todo: [{ phase: 'apply', text: 'LINEMO のキャンペーンページで対象条件・エントリーを確認してから申し込む' }],
        checkedAt: '2026-11-18', confidence: 'mid', /* 公式は自動で読めず、Selectra（2026-11-17）で同じ金額を確認 */ source: 'https://www.linemo.jp/campaign/syukakusai/',
        conditions: 'PayPayポイント10,000円相当（LINEMOベストプランに他社から乗り換え。終了日未定）。週替わりの増額期間あり（計算には入れていない）。ソフトバンク・ワイモバイル・LINEモバイルからは対象外',
      },
      {
        id: 'au-hikari-norikae', name: 'auひかり 乗りかえスタートサポート', target: 'hikari', provider: 'au-hikari', amount: 0, kind: 'cash',
        coversCancelFee: true, cancelFeeCap: 30000, checkedAt: '2026-11-17', 
        confidence: 'high', receive: 'apply', receiveNote: '申込月を含む12か月以内に申請書と解約明細を送付。約1か月後にau PAY 残高（最大10,000円）＋月額割引（最大20,000円）',
        source: 'https://www.au.com/internet/campaign/norikae-startsupport-home/',
        conditions: 'ずっとギガ得プラン＋電話。他社からの乗り換えで、今の光回線の解約違約金相当を合計最大30,000円まで還元（対象プロバイダの場合。Asahi Net・DTI は最大15,000円）',
        todo: [{ phase: 'after', text: 'auひかり「乗りかえスタートサポート」の申請書と、今の光回線の解約金がわかる明細を送る（申込から12か月以内）' }],
      },
      {
        id: 'nuro-cb', name: 'NURO光 キャッシュバック', target: 'hikari', provider: 'nuro', amount: 15000, kind: 'cash',
        endsAt: '2026-11-30', notWithLink: 'hikari:nuro', /* 広告リンク先の特典とは併用できない */
        todo: [{ phase: 'later', months: 17, text: 'NURO光のキャッシュバック受け取り手続き（開通17か月後に届くメールから。期限あり）' }],
        checkedAt: '2026-11-23', confidence: 'high', receive: 'apply', receiveNote: '開通17か月後に届くメールからマイページで口座を指定（手続き期間45日）', source: 'https://www.nuro.jp/',
        conditions: '期間限定（2026年11月30日まで）。2.5ギガ・10ギガ共通で15,000円。2年割かU29応援割の申込・申込から12か月後の月末までに開通・支払方法の登録・受け取りまで継続が条件',
      },
      {
        // 広告（PR）リンク先の特別ページ（nuro.jp/hikari/pr/sp/）からの申込だけの特典。affiliate.js に NURO光のリンクがあるときだけ計算に入る
        id: 'nuro-pr-cb', name: 'NURO光 現金キャッシュバック（広告ページ限定）', target: 'hikari', provider: 'nuro', amount: 55000, kind: 'cash',
        viaLink: 'hikari:nuro', checkedAt: '2026-11-17', confidence: 'high', receive: 'apply',
        receiveNote: '開通11か月後に15,000円・17か月後に25,000円・23か月後に15,000円（クーポン分）の案内メール。それぞれ45日以内にマイページで口座を指定',
        source: 'https://www.nuro.jp/hikari/pr/sp/',
        conditions: '2.5ギガプランの場合（10ギガは80,000円）。このページからの申込のみ。申込画面でクーポン「myb」を入力（入れないと40,000円）。申込から12か月後の月末までに開通、開通10か月後の末日までに支払方法とメールアドレスを登録。受け取りまで解約しないこと。ほかの特典・キャンペーンとは併用不可',
        todo: [
          { phase: 'apply', text: 'NURO光を申し込む（リンク先のページから申し込み、申込画面でクーポン「myb」を入力。ほかのページからだと対象外）' },
          { phase: 'after', text: 'NURO光の支払方法と連絡先メールアドレスを登録する（開通10か月後の末日まで。しないと案内メールが届かない）' },
          { phase: 'later', months: 11, amount: 15000, text: 'NURO光キャッシュバック1回目（15,000円）の受け取り手続き（案内メールから45日以内）' },
          { phase: 'later', months: 17, amount: 25000, text: 'NURO光キャッシュバック2回目（25,000円）の受け取り手続き（案内メールから45日以内）' },
          { phase: 'later', months: 23, amount: 15000, text: 'NURO光キャッシュバック3回目（クーポン分15,000円）の受け取り手続き（案内メールから45日以内）' },
        ],
      },
      {
        id: 'nuro-norikae', name: 'NURO光 乗り換え特典', target: 'hikari', provider: 'nuro', amount: 0, kind: 'cash',
        coversCancelFee: true, cancelFeeCap: 60000, checkedAt: '2026-11-17', confidence: 'high', receive: 'apply',
        receiveNote: '開通5〜7か月目の末日までに届くシートに解約金の証明書を貼って返送 → 45日以内に案内 → 45日以内に口座指定',
        source: 'https://www.nuro.jp/',
        conditions: '今の光回線などの解約金・工事費の残り・撤去費用を最大60,000円までキャッシュバック。申請は1回だけ',
        todo: [{ phase: 'later', months: 5, text: 'NURO光の乗り換え特典：届いたシートに今の光回線の解約金の証明書を貼って返送する' }],
      },
      {
        id: 'sonet-cb', name: 'So-net光 新設キャッシュバック', target: 'hikari', provider: 'sonet-hikari', amount: 10000, kind: 'cash',
        endsAt: '2026-11-30', newOnly: true, checkedAt: '2026-11-23',
        todo: [{ phase: 'later', months: 17, text: 'So-net光のキャッシュバックの口座手続き（開通17か月後の15日から45日間。過ぎると受け取れない）' }],
        confidence: 'high', receive: 'apply', receiveNote: '開通17か月後の15日から45日間に、マイページかSo-net会員アプリで受取口座を指定', source: 'https://www.so-net.ne.jp/access/hikari/1g/',
        conditions: '2026年11月23日〜30日の申込。So-net 光 M の新設のみ（S・L・転用・事業者変更は対象外）。申込から6か月後の末日までに支払方法の登録と開通。受け取りまで解約・退会しないこと',
      },
      {
        // 広告（PR）リンク先の特別ページ（join.biglobe.ne.jp/ftth/hikari/lp/af/）の特典。affiliate.js に ビッグローブ光のリンクがあるときだけ計算に入る
        id: 'biglobe-pr-cb', name: 'ビッグローブ光 キャッシュバック（広告ページ・クーポン）', target: 'hikari', provider: 'biglobe-hikari', amount: 65000, kind: 'cash',
        viaLink: 'hikari:biglobe-hikari', checkedAt: '2026-11-17', confidence: 'high', receive: 'apply',
        receiveNote: '12か月目に35,000円、24か月目に30,000円（クーポン分）。それぞれ対象月の2日から45日以内にマイページで手続き（CASH POSTで口座へ）',
        source: 'https://join.biglobe.ne.jp/ftth/hikari/lp/af/limited.html',
        conditions: '1ギガ3年プランの場合。リンク先のページから、クーポン「BWS」を入力して申し込む。申込から6か月以内に開通。受け取りまで解約・コース変更しないこと（24か月目の分は24か月目まで継続）',
        todo: [
          { phase: 'apply', text: 'ビッグローブ光を申し込む（リンク先のページで、クーポン「BWS」を入力）' },
          { phase: 'later', months: 11, amount: 35000, text: 'ビッグローブ光キャッシュバック（35,000円）の受け取り手続き（12か月目の2日から45日以内）' },
          { phase: 'later', months: 23, amount: 30000, text: 'ビッグローブ光キャッシュバック（クーポン分30,000円）の受け取り手続き（24か月目の2日から45日以内）' },
        ],
      },
      {
        id: 'biglobe-pr-cancel', name: 'ビッグローブ光 解約金サポート（広告ページ）', target: 'hikari', provider: 'biglobe-hikari', amount: 0, kind: 'cash',
        viaLink: 'hikari:biglobe-hikari', coversCancelFee: true, cancelFeeCap: 40000, checkedAt: '2026-11-17', confidence: 'high', receive: 'apply',
        receiveNote: '申込後に届く入会資料の「解約金サポート申込書」で申請',
        source: 'https://join.biglobe.ne.jp/ftth/hikari/lp/af/limited.html',
        conditions: '他社の光回線の解約金（契約解除料・工事費の残り・撤去費用）と同じ額を最大40,000円まで還元',
        todo: [{ phase: 'after', text: 'ビッグローブ光の「解約金サポート申込書」（入会資料に同封）で、前の光回線の解約金を申請する' }],
      },
      {
        id: 'eo-cash', name: 'eo光 他社の違約金・撤去費の補填', target: 'hikari', provider: 'eo-hikari', amount: 0, kind: 'cash',
        coversCancelFee: true, cancelFeeCap: 60000, checkedAt: '2026-11-17', receive: 'apply',
        confidence: 'high', source: 'https://eonet.jp/sp/home-pickup/', conditions: '戸建て向け。他社の違約金・撤去費を最大60,000円まで補填（機器の残債は10,000円まで、利用開始6か月目末までに申請）。現金3,000円プレゼントは10ギガの「eo光シンプルプラン」だけなので計算に入れていない',
        todo: [{ phase: 'after', text: 'eo光の「他社の違約金・撤去費の補填」を申請する（利用開始6か月目の末まで）' }],
      },
      {
        id: 'commufa-cb', name: 'コミュファ光 WEB限定キャッシュバック', target: 'hikari', provider: 'commufa', amount: 3000, kind: 'cash', notWithLink: 'hikari:commufa', /* コミュファ光指定のWEBページからの申込が条件 */
        todo: [{ phase: 'apply', text: 'コミュファ光は Web で「1年間980円キャンペーン」と同時に申し込む' }],
        checkedAt: '2026-11-17', confidence: 'high', receive: 'apply', receiveNote: '開通翌月末までに届くメールからCASH POSTで受け取り（Myコミュファ ID 登録が必要）', source: 'https://www.commufa.jp/services/information/', conditions: '1年間980円キャンペーンと同時申し込み',
      },
      {
        id: 'megaegg-cb', name: 'メガ・エッグ 開通後キャッシュバック', target: 'hikari', provider: 'megaegg', amount: 10000, kind: 'cash', notWithLink: 'hikari:megaegg', /* 公式ホームページからの申込が条件。代理店リンクから申し込むと対象外 */
        todo: [{ phase: 'after', text: 'メガ・エッグの特典を申請（他社の解約金の明細を用意）' }],
        coversCancelFee: true, cancelFeeCap: 50000,
        checkedAt: '2026-11-17', confidence: 'high', receive: 'apply', receiveNote: '開通翌月16日ごろの案内メールから30日以内に口座登録', source: 'https://www.megaegg.jp/', conditions: 'auひかりからの乗り換えは解約金負担の対象外。公式Web特典（光ベーシック）。標準工事費の分割払いを選ぶ。他社の解約金も最大50,000円まで負担（開通後2か月以内に申請）',
      },
      // ---------- 代理店のキャンペーン（A8.netで提携した代理店のページ。affiliate.js にその会社のリンクがあるときだけ計算に入る） ----------
      // 条件なし（有料オプション不要）でもらえる金額だけを入れる。2026-11-13 に各代理店のキャンペーンページで確認
      {
        id: 'sb-hikari-next', name: 'ソフトバンク光 代理店キャッシュバック（新規）', agent: '株式会社NEXT', target: 'hikari', provider: 'softbank-hikari', amount: 35000, kind: 'cash',
        viaLink: 'hikari:softbank-hikari', newOnly: true, reduceIfGroup: { group: 'sb-ouen', amount: 15000, label: '超おうち応援割' },
        checkedAt: '2026-11-17', confidence: 'high', receive: 'apply', receiveNote: '申込後に届くSMSのフォームで振込口座を登録（電話でも可）。開通の翌月末に振込',
        source: 'https://softbank-hikaricollabo.com/campaign/cashback.php',
        conditions: '1ギガの新規申込。オプション不要。超おうち応援割を使うと15,000円減額。申込から1か月以内に支払方法を確定、申込月を含む6か月後の月末までに開通。8か月以上継続しないと全額返金',
        todo: [
          { phase: 'apply', text: 'ソフトバンク光を申し込む（リンク先は代理店の株式会社NEXT。ほかの窓口だとこのキャッシュバックは対象外）' },
          { phase: 'after', text: 'ソフトバンク光の代理店キャッシュバック：SMSで届くフォームから振込口座を登録する' },
        ],
      },
      {
        id: 'sb-hikari-next-henkou', name: 'ソフトバンク光 代理店キャッシュバック（転用・事業者変更）', agent: '株式会社NEXT', target: 'hikari', provider: 'softbank-hikari', amount: 20000, kind: 'cash',
        viaLink: 'hikari:softbank-hikari', henkouOnly: true, reduceIfGroup: { group: 'sb-ouen', amount: 15000, label: '超おうち応援割' },
        checkedAt: '2026-11-17', confidence: 'high', receive: 'apply', receiveNote: '申込後に届くSMSのフォームで振込口座を登録（電話でも可）。開通の翌月末に振込',
        source: 'https://softbank-hikaricollabo.com/campaign/cashback.php',
        conditions: 'フレッツ光からの転用・他社光コラボからの事業者変更。オプション不要。超おうち応援割を使うと15,000円減額。8か月以上継続しないと全額返金',
        todo: [
          { phase: 'apply', text: 'ソフトバンク光を申し込む（リンク先は代理店の株式会社NEXT。事業者変更承諾番号を先に取っておく）' },
          { phase: 'after', text: 'ソフトバンク光の代理店キャッシュバック：SMSで届くフォームから振込口座を登録する' },
        ],
      },
      {
        // ドコモ光の公式Web申込特典（代理店のリンクから申し込むと対象外なので、リンクを貼ったら使わない）
        id: 'docomo-hikari-web', name: 'ドコモ光 公式Web申込 dポイント', target: 'hikari', provider: 'docomo-hikari', amount: 20000, kind: 'points', notWithLink: 'hikari:docomo-hikari',
        checkedAt: '2026-11-17', confidence: 'high', receive: 'auto',
        source: 'https://nttdocomo-ssw.com/nssw/dhkr/19dec_b/',
        conditions: 'ドコモ光 1ギガを公式Webで新規・事業者変更で申し込み（転用は15,000ポイント）。dポイント（期間・用途限定）',
      },
      {
        id: 'docomo-hikari-cover', name: 'ドコモ光 他社解約金 dポイント', target: 'hikari', provider: 'docomo-hikari', amount: 0, kind: 'points',
        coversCancelFee: true, cancelFeeCap: 100000, checkedAt: '2026-11-17', confidence: 'high', receive: 'apply',
        source: 'https://nttdocomo-ssw.com/nssw/dhkr/19dec_b/', conditions: '他社からの乗り換えで、他社の解約金のうち最大100,000ポイント（転用は対象外）。代理店経由でも対象。利用開始4か月目末までに証明書を提出、6か月目にポイント',
      },
      {
        // 新規工事料（28,600円）相当を、利用開始の7か月後から24か月に分けてdポイントで進呈（spread）
        id: 'docomo-hikari-kouji', name: 'ドコモ光 新規工事料実質0円（dポイント）', target: 'hikari', provider: 'docomo-hikari', amount: 28600, kind: 'points', newOnly: true,
        spread: { startMonth: 8, months: 24 }, checkedAt: '2026-11-17', confidence: 'high', receive: 'auto',
        source: 'https://www.docomo.ne.jp/campaign_event/hikari_shinkikojiryo_free/',
        conditions: '新規申込。工事料相当のdポイントを利用開始月の7か月後の月から24か月に分けて進呈（比べる期間内にもらえる分だけ計算）。途中で解約するとそこで終わり',
      },
      {
        id: 'osakagas-new', name: '大阪ガスの電気 新規申込で基本料金2か月0円', target: 'electric', provider: 'osakagas-denki', amount: 1416, kind: 'cash',
        endsAt: '2026-11-30', checkedAt: '2026-11-17', confidence: 'high', receive: 'auto',
        source: 'https://home.osakagas.co.jp/lp/electricity/cp_re/index.html',
        conditions: '2026年10月1日〜11月30日に新規申込、2027年1月31日までに供給開始。関西エリア。取次事業者経由は対象外。金額はベースプランAの最低料金（707.80円）2か月分で計算',
      },
      {
        id: 'docomo-hikari-itx', name: 'ドコモ光 代理店キャッシュバック（新規）', agent: 'アイ・ティー・エックス株式会社', target: 'hikari', provider: 'docomo-hikari', amount: 40000, kind: 'cash',
        viaLink: 'hikari:docomo-hikari', newOnly: true,
        checkedAt: '2026-11-17', confidence: 'high', receive: 'apply', receiveNote: '申込時の電話かSMSのフォーム（14日間有効）で振込口座を伝える。課金開始月の翌月末に振込',
        source: 'https://docomohikari-collabo.com/campaign/original-cashback/',
        conditions: '1ギガの新規申込。オプション加入不要。8か月以上継続。同じ住所・名義で過去に申込があると対象外',
        todo: [
          { phase: 'apply', text: 'ドコモ光を申し込む（リンク先は代理店のアイ・ティー・エックス。振込口座を伝える。SMSのフォームは14日以内）' },
        ],
      },
      {
        id: 'docomo-hikari-itx-henkou', name: 'ドコモ光 代理店キャッシュバック（転用・事業者変更）', agent: 'アイ・ティー・エックス株式会社', target: 'hikari', provider: 'docomo-hikari', amount: 25000, kind: 'cash',
        viaLink: 'hikari:docomo-hikari', henkouOnly: true,
        checkedAt: '2026-11-17', confidence: 'high', receive: 'apply', receiveNote: '申込時の電話かSMSのフォーム（14日間有効）で振込口座を伝える。課金開始月の翌月末に振込',
        source: 'https://docomohikari-collabo.com/campaign/original-cashback/',
        conditions: '1ギガの転用・事業者変更。オプション加入不要。8か月以上継続',
        todo: [
          { phase: 'apply', text: 'ドコモ光を申し込む（リンク先は代理店のアイ・ティー・エックス。振込口座を伝える。事業者変更承諾番号を先に取っておく）' },
        ],
      },
      {
        id: 'commufa-elidea', name: 'コミュファ光 代理店キャッシュバック', agent: 'エルアイデア株式会社', target: 'hikari', provider: 'commufa', amount: 25000, kind: 'cash',
        viaLink: 'hikari:commufa',
        checkedAt: '2026-11-17', confidence: 'high', receive: 'apply', receiveNote: '申込後の確認の電話で振込口座（契約者本人名義）を伝える。光ネットの開通確認の翌営業日に振込',
        source: 'https://commufa-elidea.com/',
        conditions: '1ギガ以下のメニューは25,000円（それより上は最大30,000円）。全員対象・オプション条件なし。コミュファ光公式サイトの申込フォームからだと対象外',
        todo: [
          { phase: 'apply', text: 'コミュファ光を申し込む（リンク先は代理店のエルアイデア。確認の電話で振込口座を伝える）' },
        ],
      },
      {
        id: 'megaegg-next', name: 'メガ・エッグ 代理店キャッシュバック', agent: '株式会社NEXT', target: 'hikari', provider: 'megaegg', amount: 20000, kind: 'cash',
        viaLink: 'hikari:megaegg', newOnly: true,
        checkedAt: '2026-11-17', confidence: 'high', receive: 'apply', receiveNote: '申込後に届くフォームで振込口座を登録（電話でも可）。最短で開通月の翌月末に振込',
        source: 'https://me-hikari.net/campaign/original.php',
        conditions: '光ベーシック・光10ギガの新規申込。オプション不要。申込から6か月以内に開通。8か月以上継続しないと全額返金。代理店から申し込むと、メガ・エッグ公式Web特典は対象外',
        todo: [
          { phase: 'apply', text: 'メガ・エッグを申し込む（リンク先は代理店の株式会社NEXT）' },
          { phase: 'after', text: 'メガ・エッグの代理店キャッシュバック：届いたフォームで振込口座を登録する' },
        ],
      },
      {
        id: 'pikara-next', name: 'ピカラ光 代理店キャッシュバック', agent: '株式会社NEXT', target: 'hikari', provider: 'pikara', amount: 30000, kind: 'cash',
        viaLink: 'hikari:pikara', newOnly: true,
        checkedAt: '2026-11-17', confidence: 'high', receive: 'apply', receiveNote: '申込後に届くフォームで振込口座を登録（電話でも可）。最短で開通月の翌月末に振込',
        source: 'https://pikarahikari.net/campaign/original_cb.php',
        conditions: 'ピカラ光ねっとの新規申込。オプション不要。申込から6か月以内に開通。8か月以上継続しないと全額返金。2022年2月18日〜終了日未定',
        todo: [
          { phase: 'apply', text: 'ピカラ光を申し込む（リンク先は代理店の株式会社NEXT）' },
          { phase: 'after', text: 'ピカラ光の代理店キャッシュバック：届いたフォームで振込口座を登録する' },
        ],
      },
      { checkedAt: '2026-11-17',
        id: 'au-denki-web', name: 'auでんき Web新規申込特典', target: 'electric', provider: 'au-denki', amount: 5000, kind: 'cash',
        todo: [{ phase: 'apply', text: 'auでんきは Web から申し込む（au PAY 残高5,000円の対象）' }],
        confidence: 'high', receive: 'auto', receiveNote: '利用開始の約3か月後にau PAY 残高へ', source: 'https://www.au.com/energy/denki/pr/prime/base/',
        conditions: 'Web新規申込。12か月以内の解約は違約金2,200円',
      },
      {
        id: 'sb-denki-first', name: 'ソフトバンクでんき 初月全額0円', target: 'electric', provider: 'softbank-denki', amountMonths: 1, amount: 0, kind: 'cash',
        todo: [{ phase: 'apply', text: 'ソフトバンクでんきは Web から申し込む（初月0円の対象）' }],
        checkedAt: '2026-11-10', confidence: 'high', receive: 'auto', receiveNote: '初回の請求から割引', requires: { area: ['hokkaido', 'tokyo', 'chubu', 'chugoku', 'shikoku'] }, source: 'https://www.softbank.jp/energy/', conditions: '個人・新規・Web申込。北海道・東京・中部・中国・四国電力エリア。1年未満の解約は違約金3,000円',
      },
      {
        // 「ポイントサイト・比較サイト限定」ページ（softbank.jp/energy/special/site-limited/）の特典。affiliate.js にソフトバンクでんきのリンクがあるときだけ計算に入る
        id: 'sb-denki-site', name: 'ソフトバンクでんき 比較サイト限定 3か月割引', target: 'electric', provider: 'softbank-denki', amountMonths: 3, monthlyCap: 1100, amount: 0, kind: 'cash',
        viaLink: 'electric:softbank-denki', endsAt: '2027-03-31', checkedAt: '2026-11-17', confidence: 'high', receive: 'auto', receiveNote: 'ほかの特典が終わった翌月から3か月、電気代から割引（電気代が1,100円より少ない月はその額まで）',
        requires: { area: ['hokkaido', 'tokyo', 'chubu', 'chugoku', 'shikoku'] }, source: 'https://www.softbank.jp/energy/special/site-limited/',
        conditions: '2026年10月1日〜2027年3月31日。個人・新規。北海道・東京・中部・中国・四国・沖縄電力エリア（関西電力エリアの「Powered by 関西電力」は対象外）。申込で「現在ご利用の電力会社のご契約情報」を「あり」にする。90日以内の開通。1年未満の解約は違約金5,000円',
        todo: [{ phase: 'apply', text: 'ソフトバンクでんきを申し込む（リンク先のページで提供条件書を確認。「今の電力会社の契約情報」は「あり」を選ぶ）' }],
      },
      {
        id: 'rakuten-denki-pt', name: '楽天でんき 秋の家計応援キャンペーン', target: 'electric', provider: 'rakuten-denki', amount: 5000, kind: 'points',
        endsAt: '2026-12-02',
        todo: [{ phase: 'apply', deadline: '2026-12-02', text: '楽天でんきを12月2日9:59までに申し込む（全員5,000ポイントの対象）' }],
        checkedAt: '2026-11-17', confidence: 'high', receive: 'auto', receiveNote: '利用開始から6か月目の月末ごろに付与（期間限定ポイント）', source: 'https://energy.rakuten.co.jp/electricity/fee/',
        conditions: '2026年12月2日9:59までの新規申込。利用開始月と翌月の電気代が合計6,000円以上、5か月目末まで継続',
      },
      {
        id: 'tokyogas-first', name: '東京ガスの電気 基本料金1か月分割引', target: 'electric', provider: 'tokyogas-denki', amount: 1176, kind: 'cash',
        confidence: 'high', checkedAt: '2026-11-17', receive: 'auto', source: 'https://home.tokyo-gas.co.jp/gas_power/plan/power/discount_power.html',
        conditions: '30Aの場合の金額（2026年12月改定後の基本料金1,176円。改定前は935円）。新規申込',
      },
      { checkedAt: '2026-11-17',
        id: 'cd-shukuwari', name: 'CDエナジー 登録特典', target: 'electric', provider: 'cd-denki', amount: 1000, kind: 'points',
        todo: [{ phase: 'after', text: 'カテエネ・LINEに登録してポイントを受け取る' }],
        confidence: 'high', receive: 'apply', receiveNote: 'LINE・カテエネの登録が必要', source: 'https://www.cdedirect.co.jp/',
        conditions: 'カテエネポイント',
      },
    ],

    // ================= 比較に入れていないもの（理由） =================
    duemoUrl: 'https://ync-apps.github.io/duemo/',

    notCovered: [
      { category: 'カード', name: '楽天カード・その他のカード', reason: 'スマホ代そのものが安くなる割引がない（ポイント還元のみ）ため' },
      { category: 'カード', name: 'dカード GOLD U・dカード PLATINUM', reason: '年齢制限（GOLD U）や年会費が高い（PLATINUM）ため、一般とGOLDのみ比較' },
      { category: 'スマホ', name: 'イオンモバイル', reason: '料金表がPDFで、読み取れなかった' },
      { category: 'スマホ', name: 'NUROモバイル', reason: '公式サイトが一時的に表示されなかった（503）' },
      { category: 'スマホ', name: 'J:COM MOBILE', reason: '「データ盛」の料金はJ:COMのサービス契約が前提で、条件を確認できなかった' },
      { category: 'スマホ', name: 'スマホ本体の値引き・下取り', reason: 'SIMだけの乗り換えを前提にしているため' },
      { category: '光回線', name: 'GMOとくとくBB光', reason: '公式サイトが自動取得を拒否した（403）' },
      { category: '光回線', name: '@nifty光', reason: '料金ページにたどり着けなかった' },
      { category: '光回線', name: 'フレッツ光（NTT東日本・西日本）', reason: 'プロバイダ料金が別にかかり、組み合わせが多すぎるため（光コラボで代わりに比較）' },
      { category: '光回線', name: 'J:COM NET', reason: '月額が郵便番号ごとのシミュレーションでしか出ない' },
      { category: '光回線', name: 'auひかり・eo光・コミュファ光・ピカラ光・メガ・エッグ・BBIQ のマンション', reason: '建物ごとに料金が違い、一般的な金額を確認できなかった（戸建てのみ比較）' },
      { category: '光回線', name: 'リンクのない代理店のキャッシュバック', reason: '代理店ごとに金額・条件が違い、確認できない。このサイトがリンクしている代理店・広告ページの特典だけ計算に入れる' },
      { category: '電気', name: '東京電力・関西電力の公式ページ', reason: '自動取得を拒否された（403）。料金は他の公式資料と記事から計算' },
      { category: '電気', name: '沖縄電力', reason: '公式サイトが自動取得を拒否した（403）。沖縄は電気の比較なし' },
      { category: '電気', name: 'Looopでんき', reason: '30分ごとに単価が変わる市場連動型のため、月額を決められない' },
      { category: '電気', name: 'オクトパスエナジー', reason: '料金表のページにたどり着けなかった' },
      { category: '電気', name: 'ENEOSでんき', reason: 'この環境のネットワーク設定でサイトに接続できなかった' },
      { category: '電気', name: 'コミュファでんき', reason: '公式サイトが自動取得を拒否した（403）' },
      { category: '電気', name: '東北電力×ソフトバンク「よりそう+eねっとバリュー」のスマホ割引', reason: 'ソフトバンクでんきではなく東北電力の別プランで、条件を確認しきれなかった' },
      { category: 'ガス', name: '東京電力のガス・ニチガス・関西電力のガス・CDエナジーのガス・中部電力ミライズのガス', reason: '大手ガス会社と比べた料金を公式で確認できなかった（403、または比較の数字の記載なし）' },
      { category: 'ガス', name: 'プロパンガス（LPガス）', reason: '会社ごとに料金が自由で公表されていないことが多いため' },
    ],
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.KAKEI_DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);

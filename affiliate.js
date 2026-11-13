/*
 * アフィリエイトリンクの設定
 *
 * ASP（A8.net・もしもアフィリエイト・バリューコマースなど）で提携できた広告のリンクを、
 * 下の該当する行の '' の中に貼り付けてください。空のままの会社は公式サイトへの普通のリンクになります。
 *
 * ・リンクを入れても、おすすめの順位は変わりません（順位は実質負担の安い順だけで決まります）
 * ・リンクを入れた会社には、画面で「PR」と表示されます（ステマ規制への対応）
 * ・キャンペーンの条件は申込窓口ごとに違うことがあります。公式の特典を前提に計算しているので、
 *   特典の対象外になる窓口（代理店のページなど）のリンクは入れないでください
 * ・会社本体の広告用ページの特典（data.js で viaLink がついているもの：NURO光・ビッグローブ光・ソフトバンクでんき）は、
 *   その会社のリンクを入れたときだけ計算に入り、画面に「PRリンクから申し込んだ場合」と出ます。
 *   リンクは必ず、その広告用ページにつながるもの（A8.net の該当プログラム）にしてください
 * ・このファイルは週1回のデータ自動更新では書き換えません
 */
(function (root) {
  const AFFILIATE = {
    // 広告を使っていることの表示（ページ上部に出ます）
    disclosure: '本ページはプロモーション（アフィリエイト広告）を含みます。おすすめの順位は、各社の料金と特典から計算した実質負担の安い順で、広告報酬とは関係ありません。',
    links: {
      // スマホ
      'mobile:docomo': '', 'mobile:ahamo': '', 'mobile:au': '', 'mobile:uq': '', 'mobile:povo': '',
      'mobile:softbank': '', 'mobile:ymobile': '', 'mobile:linemo': '', 'mobile:rakuten': '', 'mobile:iijmio': '',
      'mobile:mineo': '', 'mobile:nihontsushin': '', 'mobile:biglobe-mobile': '',
      // 光回線
      'hikari:docomo-hikari': '', 'hikari:softbank-hikari': '', 'hikari:au-hikari': '', 'hikari:biglobe-hikari': 'https://px.a8.net/svt/ejp?a8mat=4BGK84+2ARAMY+B4+2N9S82',
      'hikari:rakuten-hikari': '', 'hikari:iij-hikari': '', 'hikari:sonet-hikari': '', 'hikari:en-hikari': '', 'hikari:nuro': '',
      'hikari:eo-hikari': '', 'hikari:commufa': '', 'hikari:pikara': '', 'hikari:megaegg': '', 'hikari:bbiq': '',
      // 電気
      'electric:au-denki': '', 'electric:softbank-denki': '', 'electric:docomo-denki': '', 'electric:rakuten-denki': '',
      'electric:tokyogas-denki': '', 'electric:cd-denki': '', 'electric:eo-denki': '', 'electric:osakagas-denki': '', 'electric:tohogas-denki': '',
      // カード
      'card:dcard': '', 'card:dcard-gold': '', 'card:aupay': '', 'card:aupay-gold': '', 'card:paypay': '', 'card:paypay-gold': '',
    },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = AFFILIATE;
  else root.KAKEI_AFFILIATE = AFFILIATE;
})(typeof window !== 'undefined' ? window : globalThis);

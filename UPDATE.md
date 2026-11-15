# データ更新の手順

まとめ割ナビの料金・キャンペーンを最新にするときの手順です（人が行う場合も、毎週月曜0時の定期実行のClaudeが行う場合も同じ）。トップページの例の金額・会社数・会社一覧も data.js から自動で作られるので、data.js だけ直せば全ページに反映されます。

作業するリポジトリは **ync-apps/kakei-navi の main** です。main に push すると GitHub Pages（https://ync-apps.github.io/kakei-navi/ ）に数分で反映されます。

1. 見直しが必要なものを出す
   ```
   node tools/check-freshness.js
   ```
2. 出てきたページ（各項目の `source`）を読み、`data.js` を直す
   - 公式サイトで確認できたら `confidence: 'high'`、記事のみなら `'mid'`、確認できなければ `'low'`
   - 確認し直した項目には `checkedAt: 'YYYY-MM-DD'` を付ける
   - 期間限定のキャンペーン・割引には `endsAt: 'YYYY-MM-DD'`（最終日）を付ける。終了日を過ぎると自動で計算から外れる
   - 終わったキャンペーンは削除。新しいキャンペーンは追加（受け取り方 `receive`、やること `todo` も）
   - `viaLink` のついた特典（広告用ページ・代理店の特典）は、その `source` のページで金額・条件を確かめる。公式トップのページではない。代理店の金額は「有料オプションなし」の金額だけを入れる
   - 料金改定が発表されたら、適用日と新しい料金をメモ（`note`）に書き、比較期間の大半が改定後なら改定後の料金にする
   - 公式サイトが読めない会社は `notCovered` の理由を最新に
   - **記事が出典の項目（`confidence: 'mid'`。check-freshness の「記事が出典のもの」）は毎週すべて確かめる**
     - 記事のページが開けて、更新日が新しく、data.js の金額・条件がそのまま載っていて、終了の記載がなければ、記事の出典のままでよい。`checkedAt` を今日にする
     - 公式ページで同じ数字が確かめられたら、出典を公式に替えて `confidence: 'high'` にする（公式を優先）
     - 記事が開けない（403など）・数字が載っていない・記事の日付が古く公式とも合わない ときは、ほかの新しい記事か公式で確かめ直す。どこでも確かめられなければ `confidence: 'low'`（計算から外れる）にし、報告で「人の確認が必要」と書く
     - 記事の見出しと本文で数字が違うときは本文の数字を使う。特典に有料オプションの加入が必要なら `conditions` に書く
     - 2026-11-15 に、ワイモバイル（料金・家族割・超!おトク割）・IIJmio（料金）・eo光（料金・1年目の割引）・LINEMO（料金・手数料・乗り換え特典）は、人がブラウザで公式ページを開いて確かめ、出典を公式にした。これらの公式サイトは自動では読めないことがあるので、読めないときは日付の新しい記事2つ以上と照らし合わせ、数字が変わっていなければ `confidence: 'high'` のまま `checkedAt` は変えない。変わっていれば直して `'mid'` にし、報告に書く
   - **すべての会社のキャンペーン一覧を毎週開く（取りこぼし防止）**：データにある特典を確かめるだけでなく、各社のキャンペーン一覧ページを開いて、**データにない新しい特典がないか**を見る。SIMのみ・申込だけでもらえるもの（端末購入・有料オプション・抽選が条件のものは入れない）を見つけたら追加する。2026-11-15 の総点検では、ドコモ（SIMのみ乗り換え）・ドコモ光（公式Web特典・工事料実質0円）・IIJmio（半額・家族割引）・povo（本気割）・ピカラ光（公式5か月無料）・大阪ガスの電気（基本料金2か月0円）が抜けていた
     - スマホ：docomo.ne.jp/campaign_event/ ・ ahamo.com/campaigns ・ au.com/mobile/campaign/ ・ uqwimax.jp/mobile/ ・ povo.jp/campaign ・ softbank.jp/mobile/campaigns/ ・ ymobile.jp/store/ ・ linemo.jp/campaign/ ・ network.mobile.rakuten.co.jp/campaign/ ・ iijmio.jp/campaign/ ・ mineo.jp/campaign/ ・ nihontsushin.com ・ join.biglobe.ne.jp/mobile/campaign/
     - 光回線：nttdocomo-ssw.com/nssw/dhkr/19dec_b/ ・ softbank.jp/internet/campaigns/list/ ・ au.com/internet/campaign/ ・ network.mobile.rakuten.co.jp/hikari/ ・ iijmio.jp/imh/ ・ so-net.ne.jp/access/hikari/1g/ ・ enhikari.jp ・ nuro.jp ・ eonet.jp ・ commufa.jp ・ pikara.jp/cp/ ・ megaegg.jp ・ bbiq.jp ・ join.biglobe.ne.jp/ftth/hikari/
     - 電気・ガス：au.com/energy/denki/ ・ softbank.jp/energy/ ・ denki.docomo.ne.jp/campaign/ ・ energy.rakuten.co.jp ・ home.tokyo-gas.co.jp ・ cdedirect.co.jp ・ eonet.jp ・ home.osakagas.co.jp/campaign/ ・ tohogas.co.jp
     - 終了日（endsAt）が今日・明日のものは、延長されていないか公式で確かめる（NURO光のキャッシュバックは 11/15 終了の予定だったが、延長されていた）
     - 古いキャンペーンページが残っていることがある（例：楽天ひかり「1年無料」のページ）。その会社のトップページに載っている特典と照らし合わせてから入れる
   - **公式サイトが自動取得を拒否する会社の確かめ方**
     - 東京電力・関西電力：自社サイトは読めないため、同じ料金で売っている会社の公式料金表で確かめる。
       ソフトバンクでんき https://www.softbank.jp/energy/price/ （関西は「Powered by 関西電力」）と auでんき https://www.au.com/energy/denki/merit/plan/ の東京・関西の単価が、`electric` の `std` の `tokyo`・`kansai` と同じか見る。2社がそろって変わっていたら、大手電力の料金も変わったとみなして直す（2026-11-10 に一致を確認済み）
     - ワイモバイル・LINEMO：公式サイト・報道発表・提供条件書PDFのどれも自動では読めない。日付の新しい比較記事を2つ以上読み、一致した値だけを使い `confidence: 'mid'` のままにする。食い違うときは変えずに、報告で「人の確認が必要」と書く
     - 月1回、人が公式ページで答え合わせをする（DUEMO に毎月のタスクとして登録）
3. `data.js` の `asOf` と `notice` の日付を更新（`notice` は日付だけ直し、店頭限定・申込窓口独自のキャッシュバックを計算に入れていない旨の文は消さない）
4. テストを通す
   ```
   node --test test/engine.test.js
   ```
5. 変更点（何がいくらからいくらに変わったか）をコミットメッセージに書いてコミット・push

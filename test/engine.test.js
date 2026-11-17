// 実行: node --test test/engine.test.js
const test = require('node:test');
const assert = require('node:assert');
const data = require('../data.js');
const E = require('../engine.js');

// テストは日付で結果が変わらないよう「今日」を固定する（キャンペーンの終了日で計算が変わるため）
const TEST_TODAY = '2026-11-15';
function baseInput(over = {}) {
  const input = baseInputRaw(over);
  input.options = { today: TEST_TODAY, ...(input.options || {}) };
  return input;
}
function baseInputRaw(over = {}) {
  return {
    area: 'tokyo', housing: 'mansion', months: 24,
    lines: [{ current: 'docomo', gb: 20 }, { current: 'docomo', gb: 3 }],
    mobileCurrentMonthly: 15000,
    hikari: { use: true, current: 'docomo-hikari', currentMonthly: 4400, cancelFee: 0 },
    electric: { current: 'std', bill: 9000, amp: 30, kWh: 260 },
    gas: { type: 'city', current: 'std', bill: 5000 },
    options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-17' },
    ...over,
  };
}
const find = (r, f) => r.results.find(f);
const allSame = (id) => (x) => x.combo.mobile.every((b) => b === id);

test('結果が安い順に並び、合計は内訳・小計と一致する', () => {
  const r = E.compare(baseInput(), data);
  assert.ok(r.results.length > 100);
  for (let i = 1; i < r.results.length; i++) assert.ok(r.results[i - 1].total <= r.results[i].total);
  for (const x of r.top) {
    assert.strictEqual(x.total, Math.round(x.items.reduce((s, it) => s + it.amount, 0)));
    const sub = Object.values(x.subtotal).reduce((a, b) => a + b, 0);
    assert.strictEqual(Math.round(sub), x.total);
  }
});

test('家族1人ずつ別の会社にする案も計算される', () => {
  const r = E.compare(baseInput(), data);
  assert.ok(r.results.some((x) => new Set(x.combo.mobile).size > 1));
});

test('ソフトバンク光＋ソフトバンク：おうち割 光セットが1人ずつ・オプション代・応援割（新規のみ）', () => {
  // 今の光回線が「その他」（光コラボではない）→ 新規扱い。応援割は今の回線の証明が要るので「なし」の人は対象外
  const r = E.compare(baseInput({ hikari: { use: true, current: 'other', currentMonthly: '', cancelFee: 0 } }), data);
  const x = find(r, (y) => allSame('softbank')(y) && y.combo.hikari === 'softbank-hikari');
  assert.strictEqual(x.items.filter((i) => i.label.startsWith('おうち割 光セット')).length, 2);
  assert.ok(x.items.some((i) => i.label.startsWith('おうち割に必要な光の指定オプション代')));
  // マンションは月550円、課金開始から7か月目以降なので24か月の比較では18か月分
  const ouen = x.items.find((i) => i.label.startsWith('ソフトバンク光 超おうち応援割'));
  assert.strictEqual(ouen.amount, -550 * 18);
  const house = E.compare(baseInput({ housing: 'house', hikari: { use: true, current: 'other', currentMonthly: '', cancelFee: 0 } }), data);
  const none = find(E.compare(baseInput({ hikari: { use: true, current: 'none', currentMonthly: '', cancelFee: 0 } }), data), (y) => allSame('softbank')(y) && y.combo.hikari === 'softbank-hikari');
  assert.ok(!none.items.some((i) => i.label.startsWith('ソフトバンク光 超おうち応援割')));
  // 事業者変更（ドコモ光から）は応援割の対象外
  const henkou = find(E.compare(baseInput(), data), (y) => allSame('softbank')(y) && y.combo.hikari === 'softbank-hikari');
  assert.ok(!henkou.items.some((i) => i.label.startsWith('ソフトバンク光 超おうち応援割')));
  const xh = find(house, (y) => allSame('softbank')(y) && y.combo.hikari === 'softbank-hikari');
  assert.strictEqual(xh.items.find((i) => i.label.startsWith('ソフトバンク光 超おうち応援割')).amount, -880 * 18);
});

test('ワイモバイルの家族割は2人目からで、おうち割とは重ならない', () => {
  const r = E.compare(baseInput(), data);
  const noHikari = find(r, (y) => allSame('ymobile')(y) && y.combo.hikari === 'docomo-hikari');
  assert.strictEqual(noHikari.items.filter((i) => i.label.startsWith('ワイモバイル 家族割引')).length, 1);
  const withHikari = find(r, (y) => allSame('ymobile')(y) && y.combo.hikari === 'softbank-hikari');
  assert.strictEqual(withHikari.items.filter((i) => i.label.startsWith('ワイモバイル 家族割引')).length, 0);
  assert.strictEqual(withHikari.items.filter((i) => i.label.startsWith('おうち割 光セット（ワイモバイル）')).length, 2);
});

test('みんなドコモ割は ahamo の回線も人数に数える', () => {
  const input = baseInput({ lines: [{ current: 'docomo', gb: 50 }, { current: 'docomo', gb: 30 }] });
  const res = E.evaluate(input, ['docomo', 'ahamo'], { hikari: 'docomo-hikari', electric: 'std', gas: 'std' }, {
    data, months: 24, area: 'tokyo', housing: 'mansion', amp: 30, kWh: 260, opts: { includePoints: true, excludeUnverified: true, applyPolicy: 'full' },
  });
  const fam = res.items.find((i) => i.label.startsWith('みんなドコモ割'));
  assert.strictEqual(fam.amount, -550 * 24);
});

test('同じグループ内の乗り換えは乗り換え特典の対象外（ドコモ→ahamo）', () => {
  const r = E.compare(baseInput(), data);
  assert.ok(!find(r, allSame('ahamo')).items.some((i) => i.label.includes('ahamo 乗り換え特典')));
  assert.ok(find(r, allSame('ymobile')).items.some((i) => i.label.includes('ワイモバイル 乗り換え特典')));
});

test('エリア・住まいで出てくる光回線が変わる', () => {
  const tokyoM = E.compare(baseInput(), data);
  assert.ok(!tokyoM.results.some((x) => ['eo-hikari', 'commufa', 'au-hikari'].includes(x.combo.hikari)));
  const kansaiH = E.compare(baseInput({ area: 'kansai', housing: 'house' }), data);
  assert.ok(!kansaiH.results.some((x) => x.combo.hikari === 'au-hikari'));
  assert.ok(kansaiH.results.some((x) => x.combo.hikari === 'eo-hikari'));
});

test('光コラボ同士の乗り換えは工事費がかからない', () => {
  const r = E.compare(baseInput(), data);
  const x = find(r, (y) => y.combo.hikari === 'docomo-hikari' || y.combo.hikari === 'biglobe-hikari');
  assert.ok(!x.items.some((i) => i.label.includes('工事費')));
});

test('auひかりの乗りかえスタートサポートは解約金を負担する（上限3万円）', () => {
  const input = baseInput({ housing: 'house', hikari: { use: true, current: 'docomo-hikari', currentMonthly: 5720, cancelFee: 40000 } });
  const r = E.compare(input, data);
  const x = find(r, (y) => allSame('au')(y) && y.combo.hikari === 'au-hikari');
  const cover = x.items.find((i) => i.label.includes('解約金を負担'));
  assert.strictEqual(cover.amount, -30000);
});

test('楽天ひかり＋楽天モバイルは毎月1,000ポイント（ポイントを含めるとき）', () => {
  const r = E.compare(baseInput(), data);
  const x = find(r, (y) => allSame('rakuten')(y) && y.combo.hikari === 'rakuten-hikari');
  assert.strictEqual(x.items.find((i) => i.label.startsWith('楽天ひかり＋楽天モバイル')).amount, -24000);
  const r2 = E.compare(baseInput({ options: { includePoints: false, excludeUnverified: true } }), data);
  const x2 = find(r2, (y) => allSame('rakuten')(y) && y.combo.hikari === 'rakuten-hikari');
  assert.ok(!x2.items.some((i) => i.label.startsWith('楽天ひかり＋楽天モバイル')));
});

test('電気は料金表で計算：東京30A・260kWhの東京電力は基本1,176.18円＋電力量', () => {
  const t = E.tariffOf(data.electric.find((x) => x.id === 'std'), 'tokyo', data);
  const c = E.tariffCost(t, 260, 30);
  const expected = 392.06 * 3 + 120 * 29.85 + 140 * 36.45;
  assert.ok(Math.abs(c - expected) < 0.01);
});

test('電気：乗り換え先の料金表との差だけ請求額が変わる（楽天でんき）', () => {
  const r = E.compare(baseInput(), data);
  const x = find(r, (y) => y.combo.electric === 'rakuten-denki');
  const it = x.items.find((i) => i.cat === 'electric' && i.label.startsWith('楽天でんき'));
  const std = E.tariffCost(E.tariffOf(data.electric.find((e) => e.id === 'std'), 'tokyo', data), 260, 30);
  const rak = 260 * 38.00;
  assert.strictEqual(it.amount, Math.round(9000 + rak - std) * 24);
});

test('電気：使用量が空欄なら電気代から推定する', () => {
  const r = E.compare(baseInput({ electric: { current: 'std', bill: 9000, amp: 30, kWh: '' } }), data);
  assert.ok(r.electricUsage.estimated);
  assert.ok(r.electricUsage.kWh > 150 && r.electricUsage.kWh < 260);
});

test('申請が必要な特典の扱いを選べる（NURO光）', () => {
  const pick = (applyPolicy) => {
    const r = E.compare(baseInput({ options: { includePoints: true, excludeUnverified: true, applyPolicy, today: '2026-11-17' } }), data);
    const x = find(r, (y) => y.combo.hikari === 'nuro');
    const it = x.items.find((i) => i.label.startsWith('NURO光 キャッシュバック'));
    return it ? it.amount : 0;
  };
  assert.strictEqual(pick('full'), -10000); // 2.5ギガは10,000円（11/22まで）
  assert.strictEqual(pick('half'), -5000);
  assert.strictEqual(pick('none'), 0);
});

test('確認できていない（low）ものは標準では計算に入れない', () => {
  const lows = [...data.discounts, ...data.campaigns].filter((d) => d.confidence === 'low').map((d) => d.name);
  const r = E.compare(baseInput({ options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-15' } }), data);
  for (const x of r.results.slice(0, 200)) for (const it of x.items) assert.ok(!lows.some((n) => it.label.startsWith(n)), it.label);
});

test('大阪ガスの電気＋ガスのセットでガス代も約3%下がる', () => {
  const r = E.compare(baseInput({ area: 'kansai' }), data);
  const x = find(r, (y) => y.combo.electric === 'osakagas-denki' && y.combo.gas === 'std');
  const g = x.items.find((i) => i.label.startsWith('大阪ガス まとめトク料金'));
  assert.strictEqual(g.amount, -Math.round(5000 * 0.03 * 24));
});

test('プロパンガスは比較せず今の金額のまま', () => {
  const r = E.compare(baseInput({ gas: { type: 'propane', current: 'other', bill: 8000 } }), data);
  for (const x of r.top) assert.strictEqual(x.combo.gas, 'keep');
  assert.ok(r.top[0].items.some((i) => i.label.startsWith('プロパンガス') && i.amount === 8000 * 24));
});

test('容量が足りない会社はその人の候補から外れる（100GB）', () => {
  const r = E.compare(baseInput({ lines: [{ current: 'docomo', gb: 100 }] }), data);
  assert.ok(!r.results.some((x) => ['povo', 'linemo', 'mineo', 'nihontsushin'].includes(x.combo.mobile[0])));
});

test('比較対象の一覧と、入れていないものの理由がある', () => {
  const r = E.compare(baseInput(), data);
  assert.ok(r.scope.notCovered.length > 5);
  assert.ok(r.scope.notCovered.every((x) => x.reason));
  assert.strictEqual(r.counts.mobile, data.mobileBrands.length);
});

test('カード：持っているカードの割引が回線ごとに付く（年会費・特典はなし）', () => {
  const r = E.compare(baseInput({ cards: { paypay: 'have' } }), data);
  const x = find(r, (y) => allSame('ymobile')(y) && y.combo.hikari === 'softbank-hikari');
  assert.strictEqual(x.items.filter((i) => i.label.startsWith('PayPayカードで支払う割引')).length, 2);
  assert.ok(!x.items.some((i) => i.cat === 'card'));
});

test('カード：作ってもいい場合は、得なときだけ作る（年会費・入会特典込み）', () => {
  const r = E.compare(baseInput({ cards: { paypay: 'okAny' } }), data);
  const x = find(r, (y) => allSame('ymobile')(y) && y.combo.hikari === 'softbank-hikari');
  // 2回線×24か月。一般カードの入会特典5,000ptは出典で確認できず（confidence: low）計算から外れるので、
  // 一般 330×48 = 15,840 / ゴールド 770×48+5,000-22,000 = 19,960 → ゴールドが得
  assert.strictEqual(x.cards[0].card.id, 'paypay-gold');
  assert.ok(x.items.some((i) => i.cat === 'card' && i.label.startsWith('PayPayカード ゴールド 入会特典')));
  assert.ok(!x.items.some((i) => i.cat === 'card' && i.label.startsWith('PayPayカード 入会特典')));
  // 対象の会社がいない組み合わせでは作らない
  const y = find(r, allSame('rakuten'));
  assert.strictEqual(y.cards.length, 0);
});

test('やることリスト：カード発行・支払い設定・乗り換え・あとでの手続きが順番に並ぶ', () => {
  const input = baseInput({ cards: { paypay: 'okNormal' }, hikari: { use: true, current: 'docomo-hikari', currentMonthly: 4400, cancelFee: 0 } });
  const r = E.compare(input, data);
  const x = find(r, (y) => allSame('ymobile')(y) && y.combo.hikari === 'softbank-hikari');
  const todos = E.buildTodos(x, input, data);
  const texts = todos.map((t) => t.text);
  assert.ok(texts[0].startsWith('PayPayカードを申し込む'));
  assert.ok(texts.some((t) => t.includes('事業者変更承諾番号')));
  assert.ok(texts.some((t) => t.startsWith('ワイモバイルに乗り換えを申し込む')));
  assert.ok(texts.some((t) => t.includes('支払い方法をPayPayカードにする')));
  assert.ok(texts.some((t) => t.startsWith('おうち割 光セットを申し込む')));
  const order = E.PHASES.map((p) => p.id);
  for (let i = 1; i < todos.length; i++) assert.ok(order.indexOf(todos[i - 1].phase) <= order.indexOf(todos[i].phase));
  const text = E.todosText(todos, 'まとめ割ナビの乗り換え');
  assert.ok(text.includes('【最初にやること】'));
  // 今日の日付を渡すと、手続きごとに期限（目安）が入る（DUEMO のまとめて登録で1件ずつになる）
  const dated = E.todosText(todos, 'まとめ割ナビの乗り換え', '2026-11-12').split('\n').filter((l) => l.startsWith('・'));
  assert.strictEqual(dated.length, todos.length);
  assert.ok(dated.every((l) => /（[^（]*(期限|目安)：20\d\d年\d+月\d+日まで）$/.test(l)));
});

test('やることリスト：NURO光は17か月後の受け取り手続きが入る', () => {
  const input = baseInput();
  const r = E.compare(input, data);
  const x = find(r, (y) => y.combo.hikari === 'nuro');
  const todos = E.buildTodos(x, input, data);
  assert.ok(todos.some((t) => t.phase === 'later' && t.months === 17));
});

test('DUEMO用の文：1行目がタイトル、金額と期限の行がある', () => {
  const t = { phase: 'later', months: 17, text: 'NURO光のキャッシュバック受け取り手続き（開通17か月後に届くメールから。期限あり）', amount: 15000, kind: 'cash', url: 'https://www.nuro.jp/' };
  const lines = E.todoNotice(t, '2026-11-09').split('\n');
  assert.strictEqual(lines[0], 'NURO光のキャッシュバック受け取り手続き');
  assert.ok(lines.some((l) => l.startsWith('もらえる特典：15,000円')));
  assert.ok(lines.some((l) => l.startsWith('やる日の目安：2028年5月9日まで')));
  const t2 = { phase: 'apply', text: 'LINEMOに乗り換えを申し込む（2人目：LINEMO ベストプラン（〜3GB））' };
  assert.strictEqual(E.todoNotice(t2, '2026-11-09').split('\n')[0], 'LINEMOに乗り換えを申し込む');
});

test('終了日を過ぎたキャンペーンは計算から外れる', () => {
  const has = (today) => {
    const r = E.compare(baseInput({ options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today } }), data);
    return find(r, (y) => y.combo.mobile.every((b) => b === 'rakuten')).items.some((i) => i.label.startsWith('楽天モバイル初めて申し込み 20,000'));
  };
  // 申込は11/18 10:00まで。18日は朝で締め切りなので、計算に入るのは17日まで
  assert.strictEqual(has('2026-11-17'), true);
  assert.strictEqual(has('2026-11-18'), false);
});

test('やることリスト：締切のある特典は申込の期限がその日になる', () => {
  const input = baseInput({ options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-16' } });
  const r = E.compare(input, data);
  const x = find(r, (y) => y.combo.mobile.every((b) => b === 'rakuten'));
  const t = E.buildTodos(x, input, data).find((y) => y.text.startsWith('楽天銀行の口座を用意'));
  assert.strictEqual(E.dueOf(t, '2026-11-16').getDate(), 17);
  // 楽天モバイルの申し込み自体も、締切（11/18）が期限になる
  const ap = E.buildTodos(x, input, data).find((y) => y.text.startsWith('楽天モバイルに'));
  assert.strictEqual(E.dueOf(ap, '2026-11-16').getDate(), 17);
  assert.ok(ap.url.includes('bank-mobile-joint'));
});

test('期間限定の料金は期間が過ぎると通常料金になる（NURO光 2年割は24か月まで）', () => {
  const nuroMonthly = (months) => {
    const r = E.compare(baseInput({ months }), data);
    const x = find(r, (y) => y.combo.hikari === 'nuro');
    const fee = x.items.filter((i) => i.cat === 'hikari' && (i.label.startsWith('NURO光 月額') || i.label.startsWith('NURO光 2年割')));
    return fee.reduce((s, i) => s + i.amount, 0);
  };
  assert.strictEqual(nuroMonthly(24), 2980 * 24);
  assert.strictEqual(nuroMonthly(48), 2980 * 24 + 5720 * 24);
});

test('楽天ひかりの初期登録費：光コラボからの事業者変更は1,980円、それ以外は880円', () => {
  const fee = (current) => {
    const r = E.compare(baseInput({ hikari: { use: true, current, currentMonthly: 4400, cancelFee: 0 } }), data);
    const x = find(r, (y) => y.combo.hikari === 'rakuten-hikari');
    return x.items.filter((i) => i.label.startsWith('楽天ひかり 契約事務手数料')).reduce((s, i) => s + i.amount, 0);
  };
  assert.strictEqual(fee('docomo-hikari'), 1980);
  assert.strictEqual(fee('none'), 880);
});

test('So-net光の新設キャッシュバックは事業者変更では対象外', () => {
  const has = (current) => {
    const r = E.compare(baseInput({ hikari: { use: true, current, currentMonthly: 4400, cancelFee: 0 }, options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-11' } }), data);
    const x = find(r, (y) => y.combo.hikari === 'sonet-hikari');
    return !!x && x.items.some((i) => i.label.startsWith('So-net光 新設キャッシュバック'));
  };
  assert.strictEqual(has('none'), true);
  assert.strictEqual(has('docomo-hikari'), false);
});

test('広告ページの特典：リンクを貼った会社だけ、リンク先の特典で計算する', () => {
  const today = '2026-11-13';
  const opts = (links) => ({ includePoints: true, excludeUnverified: true, applyPolicy: 'full', today, links });
  const nuroOf = (links) => {
    const r = E.compare(baseInput({ housing: 'house', options: opts(links) }), data);
    return find(r, (y) => y.combo.hikari === 'nuro');
  };
  // リンクなし：公式トップの15,000円（11/15まで）だけ
  const a = nuroOf({});
  assert.ok(a.items.some((i) => i.label === 'NURO光 キャッシュバック'));
  assert.ok(!a.items.some((i) => i.label.includes('広告ページ限定')));
  // リンクあり：広告ページの55,000円になり、公式トップの15,000円とは併用しない
  const b = nuroOf({ 'hikari:nuro': 'https://example.com/a8' });
  const pr = b.items.find((i) => i.label.includes('広告ページ限定'));
  assert.strictEqual(pr.amount, -55000);
  assert.ok(pr.label.includes('（PRリンクから申し込んだ場合）'));
  assert.ok(!b.items.some((i) => i.label === 'NURO光 キャッシュバック'));

  // ビッグローブ光：解約金サポートもリンクがあるときだけ
  const big = (links) => {
    const r = E.compare(baseInput({ hikari: { use: true, current: 'docomo-hikari', currentMonthly: 4400, cancelFee: 50000 }, options: opts(links) }), data);
    return find(r, (y) => y.combo.hikari === 'biglobe-hikari');
  };
  assert.ok(!big({}).items.some((i) => i.label.includes('広告ページ')));
  const bl = big({ 'hikari:biglobe-hikari': 'https://example.com/a8' });
  assert.strictEqual(bl.items.find((i) => i.label.startsWith('ビッグローブ光 キャッシュバック')).amount, -65000);
  assert.strictEqual(bl.items.find((i) => i.label.includes('解約金サポート')).amount, -40000);
});

test('ソフトバンクでんき 比較サイト限定：1か月の上限1,100円×3か月', () => {
  const r = E.compare(baseInput({ options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-13', links: { 'electric:softbank-denki': 'https://example.com/a8' } } }), data);
  const x = find(r, (y) => y.combo.electric === 'softbank-denki');
  assert.strictEqual(x.items.find((i) => i.label.startsWith('ソフトバンクでんき 比較サイト限定')).amount, -3300);
  const r2 = E.compare(baseInput({ options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-13' } }), data);
  assert.ok(!find(r2, (y) => y.combo.electric === 'softbank-denki').items.some((i) => i.label.startsWith('ソフトバンクでんき 比較サイト限定')));
});

test('代理店のキャンペーン：リンクがあるときだけ、代理店名つきで計算する', () => {
  const opts = (links) => ({ includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-13', links });
  const L = 'https://example.com/a8';
  // ソフトバンク光（新規）：35,000円。超おうち応援割を使う組み合わせでは15,000円減って20,000円
  const r = E.compare(baseInput({ housing: 'house', hikari: { use: true, current: 'none', currentMonthly: 0, cancelFee: 0 }, options: opts({ 'hikari:softbank-hikari': L }) }), data);
  const sbs = r.results.filter((y) => y.combo.hikari === 'softbank-hikari');
  const cbOf = (x) => x.items.find((i) => i.label.startsWith('ソフトバンク光 代理店キャッシュバック（新規）'));
  assert.ok(sbs.length && sbs.every((x) => cbOf(x)));
  for (const x of sbs) {
    const ouen = x.items.some((i) => i.label.startsWith('ソフトバンク光 超おうち応援割'));
    assert.strictEqual(cbOf(x).amount, ouen ? -20000 : -35000);
    assert.ok(cbOf(x).label.includes('代理店「株式会社NEXT」のページから申し込んだ場合'));
  }
  // ドコモ光 → ソフトバンク光は事業者変更なので 20,000円の方
  const r2 = E.compare(baseInput({ options: opts({ 'hikari:softbank-hikari': L }) }), data);
  const x2 = find(r2, (y) => y.combo.hikari === 'softbank-hikari');
  assert.ok(x2.items.some((i) => i.label.startsWith('ソフトバンク光 代理店キャッシュバック（転用・事業者変更）')));
  assert.ok(!x2.items.some((i) => i.label.startsWith('ソフトバンク光 代理店キャッシュバック（新規）')));
  // メガ・エッグ：公式Web特典（10,000円＋基本料金2か月無料）の方が代理店の20,000円より得なので、リンクがあっても公式で計算する
  const mg = (links) => find(E.compare(baseInput({ area: 'chugoku', housing: 'house', hikari: { use: true, current: 'none', currentMonthly: 0, cancelFee: 0 }, options: opts(links) }), data), (y) => y.combo.hikari === 'megaegg');
  assert.ok(mg({}).items.some((i) => i.label.startsWith('メガ・エッグ 開通後キャッシュバック')));
  const m2 = mg({ 'hikari:megaegg': L });
  assert.strictEqual(m2.hikari.useLink, false);
  assert.ok(m2.items.some((i) => i.label.startsWith('メガ・エッグ 公式Web特典')));
});

test('リンク経由より公式経由の方が安い会社は、公式経由で計算しPRボタンを出さない（コミュファ光）', () => {
  const opts = (links) => ({ includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-14', links });
  const inp = (links) => baseInput({ area: 'chubu', housing: 'house', hikari: { use: true, current: 'none', currentMonthly: 0, cancelFee: 0 }, options: opts(links) });
  const r = E.compare(inp({ 'hikari:commufa': 'https://example.com/a8' }), data);
  const x = find(r, (y) => y.combo.hikari === 'commufa');
  // 24か月なら 980円キャンペーン（50,280円）＋WEB限定3,000円 の方が、3年割（21,360円）＋代理店25,000円 より得
  assert.ok(x.items.some((i) => i.label.startsWith('コミュファ光 1年間980円キャンペーン')));
  assert.ok(!x.items.some((i) => i.label.includes('代理店')));
  assert.strictEqual(x.hikari.useLink, false);
  // 4年（48か月）なら 3年割が36か月続くので代理店経由の方が得になる
  const r4 = E.compare({ ...inp({ 'hikari:commufa': 'https://example.com/a8' }), months: 48 }, data);
  const x4 = find(r4, (y) => y.combo.hikari === 'commufa');
  assert.ok(x4.items.some((i) => i.label.includes('代理店「エルアイデア株式会社」')));
  assert.strictEqual(x4.hikari.useLink, true);
});

test('DUEMO用の文：手続きごとにページのURL（広告リンクがあればそれ）と、分割受け取りは回ごとの金額が入る', () => {
  const L = 'https://px.a8.net/svt/ejp?a8mat=TEST';
  const inp = baseInput({ housing: 'house', hikari: { use: true, current: 'none', currentMonthly: 0, cancelFee: 0 }, options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-14', links: { 'hikari:biglobe-hikari': L } } });
  const r = E.compare(inp, data);
  const x = find(r, (y) => y.combo.hikari === 'biglobe-hikari');
  const todos = E.buildTodos(x, inp, data).map((t) => ({ ...t, link: t.signup && t.signup.id === 'biglobe-hikari' ? L : '' }));
  const txt = E.todosText(todos, 'テスト', '2026-11-14');
  const lines = txt.split('\n');
  const i = lines.findIndex((l) => l.startsWith('・ビッグローブ光を申し込む'));
  assert.strictEqual(lines[i + 1], `　ページ：${L}`);
  assert.ok(txt.includes('ビッグローブ光キャッシュバック（35,000円）の受け取り手続き（12か月目の2日から45日以内）（もらえる特典：35,000円'));
  assert.ok(txt.includes('（クーポン分30,000円）の受け取り手続き（24か月目の2日から45日以内）（もらえる特典：30,000円'));
});

test('広告ページの特典があるときは「申し込む」を1つにまとめ、文に（PR）は入れない', () => {
  const inp = baseInput({ housing: 'house', hikari: { use: true, current: 'none', currentMonthly: 0, cancelFee: 0 }, options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-14', links: { 'hikari:biglobe-hikari': 'https://px.a8.net/svt/ejp?a8mat=TEST' } } });
  const x = find(E.compare(inp, data), (y) => y.combo.hikari === 'biglobe-hikari');
  const todos = E.buildTodos(x, inp, data);
  const apply = todos.filter((t) => t.phase === 'apply' && t.signup && t.signup.id === 'biglobe-hikari');
  assert.strictEqual(apply.length, 1);
  assert.ok(apply[0].text.startsWith('ビッグローブ光を申し込む（リンク先のページで、クーポン「BWS」'));
  assert.ok(todos.every((t) => !t.text.includes('PR') && !('main' in t)));
});

test('LINEMOの乗り換え特典はプランで金額が違う（ベストプラン10,000円・ベストプランV 12,000円）、出典は公式', () => {
  const r = E.compare(baseInput(), data);
  const x = find(r, allSame('linemo'));
  const camps = x.items.filter((i) => i.campaign && i.campaign.provider === 'linemo' && i.campaign.kind === 'points');
  // 1人目20GB → ベストプランV（30GB）、2人目3GB → ベストプラン
  assert.deepStrictEqual(camps.map((i) => -i.amount).sort((a, b) => a - b), [10000, 12000]);
  for (const i of camps) assert.ok(i.src.startsWith('https://www.linemo.jp/'));
});

test('比べるものを選べる：スマホだけ比べると、光回線・電気・ガスは今のままで料金を合計に入れない', () => {
  const r = E.compare(baseInput({ compare: { mobile: true, hikari: false, electric: false, gas: false } }), data);
  assert.ok(r.top.length > 1);
  for (const x of r.results) {
    assert.strictEqual(x.combo.hikari, 'docomo-hikari');
    assert.strictEqual(x.combo.electric, 'std');
    assert.ok(!x.hikari.switching && !x.electric.switching && !x.gas.switching);
    assert.ok(x.items.every((it) => it.cat === 'line' || it.cat === 'card' || it.amount < 0));
  }
  assert.ok(r.current.total <= 15000 * 24);
  // 光回線を比べないので、ドコモ光のセット割はスマホ側の割引として残る（ドコモのまま）
  const stay = r.results.find((x) => x.combo.mobile.every((b) => b === 'docomo'));
  assert.ok(stay.items.some((it) => it.cat === 'line' && it.amount < 0 && it.req && it.req.hikari));
});

test('比べるものを選べる：電気だけ比べると、スマホ・光回線は今のままで、上位には電気の違う案が並ぶ', () => {
  const r = E.compare(baseInput({ compare: { mobile: false, hikari: false, electric: true, gas: false } }), data);
  assert.ok(r.results.every((x) => x.combo.mobile.every((b) => b === 'docomo') && x.combo.hikari === 'docomo-hikari'));
  assert.ok(r.top.length > 1);
  assert.strictEqual(new Set(r.top.map((x) => x.combo.electric)).size, r.top.length);
  // スマホ・光回線の割引は、電気の選び方で変わるもの（ドコモでんきセット割）だけ入れる（家族割・ドコモ光セット割は入れない）
  assert.ok(r.results.every((x) => x.items.every((it) => it.cat === 'electric' || it.cat === 'card' || (it.req && it.req.electric))));
  assert.ok(find(r, (x) => x.combo.electric === 'docomo-denki').items.some((it) => it.label.startsWith('ドコモでんきセット割')));
  assert.strictEqual(r.current.total, 9000 * 24);
  assert.deepStrictEqual(Object.keys(r.counts).filter((k) => r.counts[k] > 0), ['electric']);
});

test('楽天モバイルの初めて申し込み特典は併用できず、一番多いものだけ（11/17までは楽天銀行の20,000、それ以降は乗り換え10,000）', () => {
  const pts = (today) => {
    const r = E.compare(baseInput({ options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today } }), data);
    const x = find(r, (y) => y.combo.mobile.every((b) => b === 'rakuten'));
    return x.items.filter((i) => i.campaign && i.campaign.provider === 'rakuten').map((i) => -i.amount);
  };
  // 楽天銀行の20,000ポイントは家族で1人分（おひとり様1回・口座が要る）。2人目は乗り換えの10,000
  assert.deepStrictEqual(pts('2026-11-15'), [20000, 10000]);
  // 11/18以降は常時開催の楽天銀行会員向け13,000（これも家族で1人分）。2人目は乗り換えの10,000
  assert.deepStrictEqual(pts('2026-11-19'), [13000, 10000]);
});

test('11/15の総点検で足した特典が計算に入る', () => {
  const r = E.compare(baseInput({ options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-15' } }), data);
  const labels = (f) => find(r, f).items.map((i) => i.label);
  // ドコモ MAX への乗り換え 20,000ポイント（今が au の人。1人目20GB → ドコモ MAX）
  // （公式は「最大20,000pt」のみ。個人は15,000ptと新しい記事3本が一致しているので「記事で確認」として標準設定でも入れる）
  const r2 = E.compare(baseInput({ lines: [{ current: 'au', gb: 20 }, { current: 'au', gb: 3 }], options: { includePoints: true, excludeUnverified: false, applyPolicy: 'full', today: '2026-11-15' } }), data);
  assert.ok(find(r2, (y) => y.combo.mobile.every((b) => b === 'docomo')).items.some((i) => i.label.startsWith('ドコモ SIMのみ乗り換え')));
  const r3 = E.compare(baseInput({ lines: [{ current: 'au', gb: 20 }, { current: 'au', gb: 3 }], options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-15' } }), data);
  assert.strictEqual(find(r3, (y) => y.combo.mobile.every((b) => b === 'docomo')).items.find((i) => i.label.startsWith('ドコモ SIMのみ乗り換え')).amount, -15000);
  // IIJmio 半額と家族割引
  const iij = labels((y) => y.combo.mobile.every((b) => b === 'iijmio'));
  assert.ok(iij.some((l) => l.startsWith('IIJmio ギガプラン半額キャンペーン')));
  assert.ok(iij.some((l) => l.startsWith('IIJmio 家族割引')));
  // ドコモ光：工事料相当（24か月なら8〜24か月目の17か月分）
  const dh = find(r, (y) => y.combo.hikari === 'docomo-hikari' && !y.hikari.useLink);
  const kouji = dh && dh.items.find((i) => i.label.startsWith('ドコモ光 新規工事料実質0円'));
  if (kouji) assert.strictEqual(-kouji.amount, Math.round(28600 * 17 / 24));
});

// ---------- 6人チェック（2026-11-15）で見つかった問題の再発防止 ----------
test('今の光回線を使い続ける人には、新規向け・期間限定の割引を付けない', () => {
  const r = E.compare(baseInput({ compare: { mobile: false, hikari: true, electric: false, gas: false }, hikari: { use: true, current: 'nuro', currentMonthly: 5720, cancelFee: '' } }), data);
  const stay = find(r, (y) => y.combo.hikari === 'nuro');
  assert.ok(!stay.items.some((i) => i.label.startsWith('NURO光 2年割')));
  assert.strictEqual(stay.total, 5720 * 24);
});

test('解約金の負担特典も「申請が要る特典を入れない」「ポイントを入れない」に従う', () => {
  const r = E.compare(baseInput({ compare: { mobile: false, hikari: true, electric: false, gas: false }, hikari: { use: true, current: 'other', currentMonthly: '', cancelFee: 20000 }, options: { includePoints: false, applyPolicy: 'none', excludeUnverified: true, today: '2026-11-15' } }), data);
  for (const x of r.results) assert.ok(!x.items.some((i) => i.label.includes('今の光回線の解約金を負担')));
});

test('ガスなしを選ぶと、前に入れたガス代は計算に入らない', () => {
  const r = E.compare(baseInput({ gas: { type: 'none', current: 'std', bill: 5000 } }), data);
  for (const x of r.results.slice(0, 50)) assert.strictEqual(x.items.filter((i) => i.cat === 'gas').length, 0);
});

test('povo：本気割があるので、10GBの人も360GB（1年）のトッピングで計算する', () => {
  const r = E.compare(baseInput({ compare: { mobile: true, hikari: false, electric: false, gas: false }, lines: [{ current: 'docomo', gb: 10 }] }), data);
  const p = find(r, (y) => y.combo.mobile[0] === 'povo');
  assert.strictEqual(p.lines[0].plan.id, 'povo-360y');
  assert.ok(p.items.some((i) => i.label.startsWith('povo 本気割')));
});

test('家族の一部だけを同じ会社にまとめる組み合わせも比べる（総当たりと同じ答え）', () => {
  const inp = baseInput({ compare: { mobile: true, hikari: false, electric: false, gas: false }, months: 36, lines: [{ current: 'mineo', gb: 20 }, { current: 'ahamo', gb: 5 }, { current: 'mineo', gb: 3 }], options: { includePoints: false, applyPolicy: 'full', excludeUnverified: true, today: '2026-11-15' } });
  const r = E.compare(inp, data);
  // 総当たり
  const ids = data.mobileBrands.map((b) => b.id);
  let best = Infinity;
  for (const a of ids) for (const b of ids) for (const c of ids) {
    const one = E.compare({ ...inp, lines: inp.lines }, { ...data, mobileBrands: data.mobileBrands.filter((x) => [a, b, c].includes(x.id)) });
    const hit = one.results.find((y) => y.combo.mobile.join() === [a, b, c].join());
    if (hit && hit.total < best) best = hit.total;
  }
  assert.strictEqual(r.results[0].total, best);
});

test('同じ会社の申し込みはやることリストで1つにまとまる（電気・スマホ）', () => {
  const r = E.compare(baseInput({ options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-15' } }), data);
  for (const x of r.top) {
    const todos = E.buildTodos(x, baseInput(), data).filter((t) => t.phase === 'apply');
    for (const name of ['ソフトバンクでんき', 'auでんき', 'au ', 'UQ', 'LINEMO', 'ワイモバイル']) {
      assert.ok(todos.filter((t) => t.text.startsWith(name)).length <= 1, name + ':' + todos.map((t) => t.text).join(' / '));
    }
  }
});

test('新しく契約する人には「乗り換え」「解約不要」と書かない', () => {
  const inp = baseInput({ lines: [{ current: 'new', gb: 3 }] });
  const x = E.compare(inp, data).results[0];
  const ap = E.buildTodos(x, inp, data).find((t) => t.signup && t.signup.cat === 'mobile');
  assert.ok(ap.text.includes('新規で申し込む'));
  assert.ok(!(ap.note || '').includes('解約'));
});

test('2回目チェックの再発防止：最初にやることは申込期限より前・代理店CBは減額後の金額・その他の会社にセット割を付けない', () => {
  const inp = baseInput({ area: 'chubu', housing: 'house', lines: [{ current: 'softbank', gb: 20 }, { current: 'softbank', gb: 3 }, { current: 'softbank', gb: 3 }], hikari: { use: true, current: 'softbank-hikari', currentMonthly: 6050, cancelFee: 0 }, options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-17' } });
  const r = E.compare(inp, data);
  for (const x of r.top) {
    const todos = E.buildTodos(x, inp, data);
    const end = todos.filter((t) => t.phase === 'apply' && t.applyBy).map((t) => t.applyBy).sort()[0];
    if (end) for (const t of todos.filter((t) => t.phase === 'before' && t.text.includes('楽天'))) assert.ok(E.dueOf(t, '2026-11-17') <= new Date(end + 'T00:00:00'), t.text);
  }
  // ガスが「その他」で比べないとき、大阪ガスのセット割は付かない
  const k = E.compare(baseInput({ area: 'kansai', compare: { mobile: false, hikari: false, electric: true, gas: false }, gas: { type: 'city', current: 'other', bill: 5000 } }), data);
  for (const x of k.results) assert.ok(!x.items.some((i) => /^大阪ガス (ガス・電気セット|まとめトク)/.test(i.label)), 'set discount with other gas');
});

test('3回目チェックの再発防止：家族で1回だけの特典があっても、より安い組み合わせを見落とさない', () => {
  const inp = { area: 'hokkaido', housing: 'mansion', months: 24, lines: [{ current: 'nihontsushin', gb: 100 }, { current: 'au', gb: 20 }, { current: 'rakuten', gb: 10 }], mobileCurrentMonthly: '', hikari: { use: true, current: 'none', currentMonthly: '', cancelFee: '' }, electric: { current: 'std', bill: '9000', amp: 30, kWh: '' }, gas: { type: 'city', current: 'std', bill: '5000' }, cards: { d: 'haveGold', au: 'no', paypay: 'have' }, options: { includePoints: true, applyPolicy: 'none', excludeUnverified: true, today: '2026-11-15', links: {} } };
  const r = E.compare(inp, data);
  const hit = r.results.find((x) => x.combo.mobile.join() === 'rakuten,nihontsushin,iijmio' && x.combo.hikari === 'iij-hikari' && x.combo.electric === 'rakuten-denki');
  assert.ok(hit, 'cheaper assignment found');
  assert.ok(r.results[0].total <= hit.total);
});

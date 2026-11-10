// 実行: node --test test/engine.test.js
const test = require('node:test');
const assert = require('node:assert');
const data = require('../data.js');
const E = require('../engine.js');

function baseInput(over = {}) {
  return {
    area: 'tokyo', housing: 'mansion', months: 24,
    lines: [{ current: 'docomo', gb: 20 }, { current: 'docomo', gb: 3 }],
    mobileCurrentMonthly: 15000,
    hikari: { use: true, current: 'docomo-hikari', currentMonthly: 4400, cancelFee: 0 },
    electric: { current: 'std', bill: 9000, amp: 30, kWh: 260 },
    gas: { type: 'city', current: 'std', bill: 5000 },
    options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full' },
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

test('ソフトバンク光＋ソフトバンク：おうち割 光セットが1人ずつ・オプション代・応援割', () => {
  const r = E.compare(baseInput(), data);
  const x = find(r, (y) => allSame('softbank')(y) && y.combo.hikari === 'softbank-hikari');
  assert.strictEqual(x.items.filter((i) => i.label.startsWith('おうち割 光セット')).length, 2);
  assert.ok(x.items.some((i) => i.label.startsWith('おうち割に必要な光の指定オプション代')));
  // マンションは月550円、課金開始から7か月目以降なので24か月の比較では18か月分
  const ouen = x.items.find((i) => i.label.startsWith('ソフトバンク光 超おうち応援割'));
  assert.strictEqual(ouen.amount, -550 * 18);
  const house = E.compare(baseInput({ housing: 'house' }), data);
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
    const r = E.compare(baseInput({ options: { includePoints: true, excludeUnverified: true, applyPolicy } }), data);
    const x = find(r, (y) => y.combo.hikari === 'nuro');
    const it = x.items.find((i) => i.label.startsWith('NURO光 キャッシュバック'));
    return it ? it.amount : 0;
  };
  assert.strictEqual(pick('full'), -15000);
  assert.strictEqual(pick('half'), -7500);
  assert.strictEqual(pick('none'), 0);
});

test('確認できていない特典は標準では入れない（ドコモ光の代理店キャッシュバック）', () => {
  const has = (excludeUnverified) => {
    const r = E.compare(baseInput({ hikari: { use: true, current: 'none', currentMonthly: '', cancelFee: 0 }, options: { includePoints: true, excludeUnverified, applyPolicy: 'full' } }), data);
    return find(r, (y) => y.combo.hikari === 'docomo-hikari').items.some((i) => i.label.includes('代理店キャッシュバック'));
  };
  assert.strictEqual(has(true), false);
  assert.strictEqual(has(false), true);
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
  // 2回線×24か月：一般 330×48+5,000 = 20,840 / ゴールド 770×48+5,000-22,000 = 19,960 → 一般が得
  assert.strictEqual(x.cards[0].card.id, 'paypay');
  assert.ok(x.items.some((i) => i.cat === 'card' && i.label.startsWith('PayPayカード 入会特典')));
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
    return find(r, (y) => y.combo.hikari === 'nuro').items.some((i) => i.label.startsWith('NURO光 キャッシュバック'));
  };
  assert.strictEqual(has('2026-11-15'), true);
  assert.strictEqual(has('2026-11-16'), false);
});

test('やることリスト：締切のある特典は申込の期限がその日になる', () => {
  const input = baseInput({ options: { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: '2026-11-10' } });
  const r = E.compare(input, data);
  const x = find(r, (y) => y.combo.hikari === 'nuro');
  const t = E.buildTodos(x, input, data).find((y) => y.text.startsWith('NURO光を申し込む'));
  assert.strictEqual(E.dueOf(t, '2026-11-10').getDate(), 15);
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

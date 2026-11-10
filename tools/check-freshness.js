// データの見直しが必要なものを一覧にする
// 実行: node tools/check-freshness.js [今日の日付 YYYY-MM-DD]
const D = require('../data.js');

const today = process.argv[2] || new Date().toISOString().slice(0, 10);
const addDays = (ymd, n) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const soon = addDays(today, 14);
const daysSince = (ymd) => Math.round((new Date(today) - new Date(ymd)) / 86400000);

const all = [];
const push = (cat, x, extra = {}) => all.push({ cat, id: x.id, name: x.name, confidence: x.confidence, source: x.source, endsAt: x.endsAt, checkedAt: x.checkedAt || D.asOf, ...extra });
D.mobileBrands.forEach((b) => { push('スマホ', b); b.plans.forEach((p) => p.source && push('スマホのプラン', { ...p, confidence: b.confidence })); });
(D.familyDiscounts || []).forEach((x) => push('家族割', x));
D.hikari.forEach((x) => push('光回線', x));
D.electric.forEach((x) => push('電気', x));
D.gas.forEach((x) => push('ガス', x));
D.discounts.forEach((x) => push('セット割', x));
(D.cards || []).forEach((x) => { push('カード', x); if (x.joinBonus) push('カード入会特典', { ...x.joinBonus, id: x.id + '-bonus', name: x.name + ' 入会特典' }); });
D.campaigns.forEach((x) => push('キャンペーン', x));

const print = (title, rows) => {
  console.log(`\n## ${title}（${rows.length}件）`);
  for (const r of rows) console.log(`- [${r.cat}] ${r.name}（${r.id}）${r.endsAt ? ` 終了日:${r.endsAt}` : ''} 確認:${r.checkedAt} ${r.source || '(出典なし)'}`);
};

console.log(`# データの見直しリスト（今日: ${today} / データ時点: ${D.asOf}・${daysSince(D.asOf)}日前）`);
print('終了日を過ぎたもの（削除するか、続いているか確認）', all.filter((r) => r.endsAt && r.endsAt < today));
print('14日以内に終わるもの', all.filter((r) => r.endsAt && r.endsAt >= today && r.endsAt <= soon));
print('要確認（confidence: low）', all.filter((r) => r.confidence === 'low'));
print('記事でしか確認できていないもの（confidence: mid）', all.filter((r) => r.confidence === 'mid'));
print('30日以上確認していないもの', all.filter((r) => daysSince(r.checkedAt) >= 30));

const urls = [...new Set(all.map((r) => r.source).filter(Boolean))].sort();
console.log(`\n## 確認するページ（${urls.length}件）`);
urls.forEach((u) => console.log('- ' + u));
console.log(`\n## 比較に入れていないもの（${(D.notCovered || []).length}件。取れるようになっていないか確認）`);
(D.notCovered || []).forEach((x) => console.log(`- [${x.category}] ${x.name}：${x.reason}`));

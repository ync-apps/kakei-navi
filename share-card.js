/*
 * お店で見せる比較図（画像）を作る
 * 計算結果の1つの組み合わせを、スマホに保存してお店で見せられる縦長の画像にする。
 * 外部ライブラリは使わず canvas に直接描く。
 */
(function (root) {
  const W = 1080;
  const PAD = 56;
  const C = {
    bg: '#ffffff', ink: '#1f2a24', muted: '#5d6b63', line: '#dfe4de', soft: '#f3f6f2',
    accent: '#1f7a55', accentSoft: '#e3f2ea', now: '#a3ada6', warn: '#7a5600', warnBg: '#fff6df',
  };
  const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic","Meiryo",sans-serif';
  const yen = (n) => '¥' + Math.round(n).toLocaleString('ja-JP');
  const signed = (n) => (n < 0 ? '−' : '') + yen(Math.abs(n));

  // 1行に収まらない文は折り返す（日本語は1文字単位）
  function wrap(ctx, text, maxW) {
    const out = [];
    let line = '';
    for (const ch of String(text)) {
      // 閉じかっこ・句読点は行の頭に置かない（少しはみ出しても前の行に付ける）
      if (ctx.measureText(line + ch).width > maxW && line && !'）)」』。、，．・ー'.includes(ch)) { out.push(line); line = ch.trim() ? ch : ''; }
      else line += ch;
    }
    if (line) out.push(line);
    return out;
  }

  function make(r, input, res, D) {
    const m = res.months;
    const cur = res.current;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = 6000;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, canvas.height);
    ctx.textBaseline = 'top';
    let y = PAD;
    const font = (size, weight = 400) => { ctx.font = `${weight} ${size}px ${FONT}`; };
    const text = (s, x, yy, size, color = C.ink, weight = 400, align = 'left') => {
      font(size, weight); ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(s, x, yy); ctx.textAlign = 'left';
    };
    const para = (s, size, color = C.ink, weight = 400, x = PAD, maxW = W - PAD * 2, lh = 1.5) => {
      font(size, weight);
      for (const l of wrap(ctx, s, maxW)) { ctx.fillStyle = color; ctx.fillText(l, x, y); y += size * lh; }
    };
    const rule = () => { ctx.fillStyle = C.line; ctx.fillRect(PAD, y, W - PAD * 2, 2); y += 28; };
    const heading = (s) => { text(s, PAD, y, 34, C.accent, 700); y += 54; };

    // ---- 見出し ----
    const area = (D.areas.find((a) => a.id === input.area) || {}).name || '';
    const housing = input.housing === 'house' ? '戸建て' : 'マンション';
    const today = new Date();
    text('まとめ割ナビ　比較メモ', PAD, y, 30, C.accent, 700); y += 50;
    text(`${m}か月の実質負担で比べた結果`, PAD, y, 50, C.ink, 800); y += 74;
    para(`${area}・${housing}・家族${r.lines.length}人　｜　作成 ${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（料金データ時点 ${D.asOf.replace(/-/g, '/')}）`, 26, C.muted);
    y += 14; rule();

    // ---- 今のまま と この組み合わせ ----
    const hasCur = cur.complete && cur.total > 0;
    const big = (label, value, sub, x, w, color, bg) => {
      ctx.fillStyle = bg; roundRect(ctx, x, y, w, 210, 22); ctx.fill();
      text(label, x + 30, y + 26, 28, C.muted, 700);
      text(value, x + 30, y + 72, 64, color, 800);
      text(sub, x + 30, y + 158, 26, C.muted);
    };
    const colW = (W - PAD * 2 - 24) / 2;
    if (hasCur) big('今のまま', yen(cur.total), `月 約${yen(cur.total / m)}`, PAD, colW, C.ink, C.soft);
    big('この組み合わせ', yen(r.total), `月 約${yen(r.total / m)}`, hasCur ? PAD + colW + 24 : PAD, hasCur ? colW : W - PAD * 2, C.accent, C.accentSoft);
    y += 236;
    if (hasCur) {
      const diff = cur.total - r.total;
      ctx.fillStyle = diff > 0 ? C.accent : C.warn;
      roundRect(ctx, PAD, y, W - PAD * 2, 92, 46); ctx.fill();
      text(diff > 0 ? `${m}か月で 約${yen(diff)} お得（月 約${yen(diff / m)}）` : `今より ${m}か月で 約${yen(-diff)} 高い`, W / 2, y + 22, 40, '#ffffff', 800, 'center');
      y += 124;
    }

    // ---- 月あたりの比較（棒グラフ） ----
    heading('月あたりの比較');
    const curOf = {
      line: Number(input.mobileCurrentMonthly) || 0,
      hikari: input.hikari.use && input.hikari.current !== 'none' ? Number(input.hikari.currentMonthly) || 0 : 0,
      electric: Number(input.electric.bill) || 0,
      gas: input.gas.type !== 'none' ? Number(input.gas.bill) || 0 : 0,
    };
    const rows = [['line', 'スマホ'], ['hikari', '光回線'], ['electric', '電気'], ['gas', 'ガス']]
      .filter(([k]) => curOf[k] > 0 || Math.abs(r.subtotal[k] || 0) > 0)
      .map(([k, label]) => ({ label, now: curOf[k], next: (r.subtotal[k] || 0) / m }));
    if (Math.abs(r.subtotal.card || 0) > 0) rows.push({ label: 'カード', now: 0, next: r.subtotal.card / m });
    const max = Math.max(1, ...rows.flatMap((x) => [x.now, x.next]));
    const barX = PAD + 150, barW = W - PAD * 2 - 150 - 190;
    for (const row of rows) {
      text(row.label, PAD, y + 14, 30, C.ink, 700);
      if (hasCur) {
        if (row.now > 0) { ctx.fillStyle = C.now; ctx.fillRect(barX, y, Math.max(4, barW * row.now / max), 26); }
        text(`今 ${yen(row.now)}`, W - PAD, y - 2, 24, C.muted, 400, 'right');
      }
      ctx.fillStyle = C.accent; ctx.fillRect(barX, y + (hasCur ? 34 : 14), Math.max(4, barW * Math.max(0, row.next) / max), 26);
      text(`後 ${signed(row.next)}`, W - PAD, y + (hasCur ? 32 : 12), 26, C.accent, 700, 'right');
      y += hasCur ? 84 : 66;
    }
    para('「後」は割引・特典・初期費用をならした月あたりの実質負担です。', 22, C.muted);
    y += 16; rule();

    // ---- 組み合わせの中身 ----
    heading('この組み合わせ');
    const kv = (k, v, sub) => {
      text(k, PAD, y, 28, C.muted, 700);
      const x = PAD + 170;
      const keep = y;
      para(v, 30, C.ink, 700, x, W - PAD - x, 1.35);
      if (sub) para(sub, 24, C.muted, 400, x, W - PAD - x, 1.4);
      y = Math.max(y, keep + 44) + 10;
    };
    for (const l of r.lines) kv(l.label, `${l.brand.name}${l.switching ? '（乗り換え）' : '（今のまま）'}`, l.plan.name);
    if (r.hikari.svc) kv('光回線', `${r.hikari.svc.name}${r.hikari.switching ? '（乗り換え）' : '（今のまま）'}`, r.hikari.jigyoushaHenkou ? '工事なしの「事業者変更」' : '');
    kv('電気', `${r.electric.svc.name}${r.electric.switching ? '（乗り換え）' : '（今のまま）'}`);
    if (r.gas.svc) kv('ガス', `${r.gas.svc.name}${r.gas.switching ? '（乗り換え）' : '（今のまま）'}`);
    for (const c of r.cards || []) kv('カード', `${c.card.name}${c.owned ? '（持っている）' : '（新しく作る）'}`, 'スマホ代の支払いに使う');
    y += 6; rule();

    // ---- 割引・特典と初期費用 ----
    const gains = r.items.filter((it) => it.amount < 0).sort((a, b) => a.amount - b.amount);
    const fees = r.items.filter((it) => it.amount > 0 && /手数料|工事費|解約金|年会費/.test(it.label));
    const list = (title, items) => {
      if (!items.length) return;
      heading(title);
      for (const it of items.slice(0, 10)) {
        const keep = y;
        para(`・${it.label}${it.low ? '（要確認）' : ''}`, 26, C.ink, 400, PAD, W - PAD * 2 - 220, 1.4);
        text(signed(it.amount), W - PAD, keep, 28, it.amount < 0 ? C.accent : C.ink, 700, 'right');
        y += 6;
      }
      if (items.length > 10) { para(`ほか${items.length - 10}件`, 24, C.muted); }
      y += 10;
    };
    list(`割引・特典（${m}か月分）`, gains);
    list('初期費用', fees);
    rule();

    // ---- お店の提案と比べるときのチェック ----
    heading('お店の提案と比べるときのチェック');
    ctx.fillStyle = C.warnBg; const boxTop = y; const boxY = y; y += 26;
    const checks = [
      `${m}か月の実質負担が ${yen(r.total)} より安いか（月額×${m}か月＋初期費用−特典）`,
      'キャッシュバックに有料オプションの加入が必要か。いつから外せて、外し忘れるといくらかかるか',
      'キャッシュバックはいつ・どうやって受け取るか（申請の期限、口座登録のメールなど）',
      '最低利用期間と解約金。端末代や分割の残りは別にかかるか',
      'ここにある公式の特典と一緒に受けられるか',
    ];
    // 先に高さを測ってから背景を描く
    font(26);
    const h = checks.reduce((s, c) => s + wrap(ctx, '□ ' + c, W - PAD * 2 - 60).length * 39 + 10, 0) + 30;
    roundRect(ctx, PAD, boxY, W - PAD * 2, h, 18); ctx.fill();
    for (const c of checks) { para('□ ' + c, 26, C.ink, 400, PAD + 30, W - PAD * 2 - 60, 1.5); y += 10; }
    y = boxTop + h + 30;

    // ---- 注意書き ----
    para('各社の公式サイトなどで公開されている料金・割引・キャンペーンをもとに計算しています。店頭限定のキャンペーンや、代理店・家電量販店などの申込窓口が独自に出す特典は含みません。燃料費調整額・再エネ賦課金は差に含めていません。申し込み前に必ず最新の条件を確認してください。', 22, C.muted, 400, PAD, W - PAD * 2, 1.6);
    y += 12;
    text('まとめ割ナビ　https://ync-apps.github.io/kakei-navi/', PAD, y, 24, C.accent, 700);
    y += 40 + PAD / 2;

    // 実際の高さで切り出す
    const out = document.createElement('canvas');
    out.width = W; out.height = Math.ceil(y);
    out.getContext('2d').drawImage(canvas, 0, 0);
    return out;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  root.KakeiShareCard = { make };
})(typeof window !== 'undefined' ? window : globalThis);

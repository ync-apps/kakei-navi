/*
 * まとめ割ナビ 計算エンジン
 * スマホ（家族1人ずつ）× 光回線 × 電気 × ガス の組み合わせを計算し、
 * 「比較期間の実質負担額」が安い順に並べる。
 */
(function (root) {
  const CATEGORY = { line: 'スマホ', hikari: '光回線', electric: '電気', gas: 'ガス' };

  // キャンペーンの受け取り方
  //   auto  : 申請不要。条件を満たすと自動で割引・付与
  //   apply : 自分で申請が必要（メールや書類で手続き。期限を過ぎると受け取れない）
  const RECEIVE_LABEL = { auto: '申請不要（自動で付与）', apply: '自分で申請が必要' };

  function isAvailable(item, area, housing) {
    if (item.areas && !item.areas.includes(area)) return false;
    if (item.excludeAreas && (item.excludeAreas[housing] || []).includes(area)) return false;
    if (item.housing && !item.housing.includes(housing)) return false;
    return true;
  }

  // combo.mobile は1つ（その回線の会社）か配列（家族全員の会社）
  function meets(requires, combo, area) {
    if (!requires) return true;
    for (const key of Object.keys(requires)) {
      const value = key === 'area' ? area : combo[key];
      const ok = Array.isArray(value) ? value.some((v) => requires[key].includes(v)) : requires[key].includes(value);
      if (!ok) return false;
    }
    return true;
  }

  // 同じ group の割引は一番大きいものだけ残す
  function pickByGroup(items) {
    const best = new Map();
    const free = [];
    for (const it of items) {
      if (!it.group) { free.push(it); continue; }
      const cur = best.get(it.group);
      if (!cur || it.total > cur.total) best.set(it.group, it);
    }
    return [...free, ...best.values()];
  }

  function lowConf(x) { return !!x && x.confidence === 'low'; }
  function housingOk(d, ctx) { return !d.housing || d.housing.includes(ctx.housing); }
  // 「確認できていないものは入れない」設定のとき、要確認のものを外す
  // 終了日を過ぎたものと、「確認できていないものは入れない」設定のときの要確認のものを外す
  function usable(d, opts) {
    if (d && d.endsAt && opts.today && d.endsAt < opts.today) return false;
    // viaLink：広告（PR）リンク先のページから申し込んだときだけの特典。リンクを貼っていなければ使わない
    // notWithLink：そのリンクを貼ったら使わない特典（リンク先の特典と併用できないもの）
    const links = (opts && opts.links) || {};
    if (d && d.viaLink && !links[d.viaLink]) return false;
    if (d && d.notWithLink && links[d.notWithLink]) return false;
    return !(opts.excludeUnverified && lowConf(d));
  }
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function effRate(svc, opts) { return svc && usable(svc, opts) ? svc.rate : 0; }

  // キャンペーンを計算に入れる金額
  function campaignValue(c, opts) {
    if (c.kind === 'points' && !opts.includePoints) return 0;
    if (!usable(c, opts)) return 0;
    if (c.receive === 'apply') {
      if (opts.applyPolicy === 'none') return 0;
      if (opts.applyPolicy === 'half') return Math.round(c.amount * 0.5);
    }
    return Math.round(c.amount);
  }

  function campaignLabel(c, opts) {
    let s = c.name;
    if (c.kind === 'points') s += '（ポイント）';
    if (c.viaLink) s += '（PRリンクから申し込んだ場合）';
    if (c.receive === 'apply' && opts.applyPolicy === 'half') s += '（申請が必要なので半額で見込み）';
    return s;
  }

  // ---------- スマホ1回線 ----------
  // fam: { assignment: 家族全員の会社, index: この人の番号 }（null なら家族割は考えない）
  function lineCost(line, brand, combo, ctx, fam) {
    const { data, months, area, opts } = ctx;
    const gb = Number(line.gb) || 0;
    const candidates = brand.plans.filter((p) => p.capGB === null || p.capGB >= gb);
    if (candidates.length === 0) return null;
    const lineCombo = { ...combo, mobile: brand.id };

    let best = null;
    for (const plan of candidates) {
      const discounts = [];
      for (const d of data.discounts) {
        if (d.target !== 'line' || !meets(d.requires, lineCombo, area) || !usable(d, opts)) continue;
        const perMonth = d.plans ? d.plans[plan.id] : d.amount;
        if (perMonth === undefined) continue;
        const m = Math.min(d.months || months, months);
        discounts.push({ ...d, perMonth, total: perMonth * m });
      }
      // 家族割（同じ会社の人数で決まる）
      if (fam) {
        for (const d of data.familyDiscounts || []) {
          if (d.brand !== brand.id || !usable(d, opts)) continue;
          if (d.plans && !d.plans.includes(plan.id)) continue;
          const countBrands = d.countBrands || [d.brand];
          const count = fam.assignment.filter((b) => countBrands.includes(b)).length;
          const rank = fam.assignment.slice(0, fam.index).filter((b) => b === brand.id).length;
          if (d.secondLineOnwards && rank === 0) continue;
          let perMonth = 0;
          for (const [n, amt] of Object.entries(d.byCount)) if (count >= Number(n)) perMonth = amt;
          if (!perMonth) continue;
          discounts.push({ ...d, perMonth, total: perMonth * Math.min(d.months || months, months) });
        }
      }
      const applied = pickByGroup(discounts);
      const total = plan.price * months - applied.reduce((s, d) => s + d.total, 0);
      if (!best || total < best.total) best = { plan, applied, total };
    }

    const who = line.label;
    const items = [];
    items.push({ cat: 'line', who, label: `${best.plan.name} 月額（${months}か月）`, amount: best.plan.price * months, low: lowConf(brand), src: best.plan.source || brand.source });
    for (const d of best.applied) {
      const extra = d.months && d.months < months ? `・${d.months}か月` : '';
      items.push({ cat: 'line', who, label: `${d.name}（月${yen(d.perMonth)}${extra}）`, amount: -d.total, low: lowConf(d), src: d.source });
    }

    const switching = line.current !== brand.id;
    if (switching) {
      if (brand.switchFee) items.push({ cat: 'line', who, label: `${brand.name} 契約事務手数料`, amount: brand.switchFee, low: lowConf({ confidence: brand.feeConfidence || brand.confidence }), src: brand.feeSource || brand.source });
      const fromGroup = (data.mobileBrands.find((b) => b.id === line.current) || {}).group;
      const isMnp = line.current !== 'new';
      const camps = data.campaigns.filter((c) => {
        if (c.target !== 'line' || c.provider !== brand.id) return false;
        if (c.mnpOnly && !isMnp) return false;
        if (c.mnpOnly && fromGroup && fromGroup === brand.group) return false; // 同じグループ内の乗り換えは対象外
        return meets(c.requires, lineCombo, area);
      });
      for (const c of camps) {
        const v = campaignValue(c, opts);
        if (v > 0) items.push({ cat: 'line', who, label: campaignLabel(c, opts), amount: -v, low: lowConf(c), campaign: c, src: c.source });
      }
    }
    const total = items.reduce((s, it) => s + it.amount, 0);
    return { brand, plan: best.plan, items, switching, total, label: who };
  }

  // ---------- 光回線 ----------
  function hikariCost(input, combo, ctx) {
    const { data, months, area, opts } = ctx;
    const h = input.hikari;
    if (combo.hikari === 'none') return { items: [], switching: false };
    const svc = data.hikari.find((x) => x.id === combo.hikari);
    const listMonthly = svc.price[input.housing];
    const staying = h.current === svc.id;
    const monthly = staying && Number(h.currentMonthly) > 0 ? Number(h.currentMonthly) : listMonthly;

    const items = [{ cat: 'hikari', label: `${svc.name} 月額（${months}か月）`, amount: monthly * months, low: lowConf(svc), src: svc.source }];

    const discounts = data.discounts
      .filter((d) => d.target === 'hikari' && meets(d.requires, combo, area) && usable(d, opts) && housingOk(d, ctx))
      .map((d) => {
        const perMonth = d.amount === 'full' ? monthly : (d.amount || 0);
        // startMonth：何か月目から割引が始まるか（比較期間を過ぎた分は数えない）
        const m = Math.max(0, Math.min(d.months || months, months - ((d.startMonth || 1) - 1)));
        return { ...d, perMonth, total: perMonth * m, appliedMonths: m };
      });
    for (const d of pickByGroup(discounts.filter((d) => d.amount !== undefined))) {
      const m = d.appliedMonths;
      if (!m) continue;
      const label = d.amount === 'full' ? `${d.name}（${m}か月分）` : `${d.name}（月${yen(Math.abs(d.perMonth))}${d.months ? `・${m}か月` : ''}）`;
      items.push({ cat: 'hikari', label, amount: -d.total, low: lowConf(d), src: d.source });
    }
    // 毎月のポイント還元（例：楽天ひかり＋楽天モバイルで毎月1,000ポイント）
    for (const d of discounts.filter((d) => d.pointAmount)) {
      if (!opts.includePoints) continue;
      const m = Math.min(d.months || months, months);
      items.push({ cat: 'hikari', label: `${d.name}（毎月${d.pointAmount.toLocaleString('ja-JP')}ポイント）`, amount: -d.pointAmount * m, low: lowConf(d), src: d.source });
    }

    const currentSvc = data.hikari.find((x) => x.id === h.current);
    const jigyoushaHenkou = !staying && !!currentSvc && currentSvc.type === 'collab' && svc.type === 'collab';
    if (!staying) {
      // 事業者変更（光コラボ→光コラボ）で手数料が違う会社は、その金額（例：楽天ひかり 新規880円・事業者変更1,980円）
      const setupFee = jigyoushaHenkou && svc.setupFeeHenkou !== undefined ? svc.setupFeeHenkou : svc.setupFee;
      if (setupFee) items.push({ cat: 'hikari', label: `${svc.name} 契約事務手数料${jigyoushaHenkou && svc.setupFeeHenkou !== undefined ? '（事業者変更）' : ''}`, amount: setupFee, low: lowConf({ confidence: svc.setupConfidence || svc.confidence }), src: svc.setupSource || svc.source });
      if (!jigyoushaHenkou && !svc.constructionFree) {
        items.push({ cat: 'hikari', label: `${svc.name} 工事費`, amount: svc.construction[input.housing], low: lowConf(svc), src: svc.source });
      }
      if (h.current !== 'none' && Number(h.cancelFee) > 0) {
        items.push({ cat: 'hikari', label: '今の光回線の解約金・工事費の残り（入力値）', amount: Number(h.cancelFee) });
      }
      for (const c of data.campaigns.filter((c) => c.target === 'hikari' && c.provider === svc.id && meets(c.requires, combo, area) && !(c.newOnly && jigyoushaHenkou))) { // newOnly：新設のみ（事業者変更は対象外）
        // 今の光回線の解約金を負担してくれる特典
        if (c.coversCancelFee && h.current !== 'none' && Number(h.cancelFee) > 0 && usable(c, opts)) {
          const cover = Math.min(Number(h.cancelFee), c.cancelFeeCap || Infinity);
          items.push({ cat: 'hikari', label: `${c.name}（今の光回線の解約金を負担）`, amount: -cover, low: lowConf(c), campaign: c, src: c.source });
        }
        const v = campaignValue(c, opts);
        if (v > 0) items.push({ cat: 'hikari', label: campaignLabel(c, opts), amount: -v, low: lowConf(c), campaign: c, src: c.source });
      }
    }
    return { svc, items, switching: !staying, jigyoushaHenkou };
  }

  // ---------- 電気の料金表 ----------
  function tariffOf(svc, area, data) {
    if (!svc) return null;
    if (svc.tariffs && svc.tariffs[area]) return svc.tariffs[area];
    if (svc.sameAsStd) return tariffOf(data.electric.find((x) => x.id === 'std'), area, data);
    return null;
  }
  // 基本料金＋電力量料金（燃料費調整額・再エネ賦課金は含まない）
  function tariffCost(t, kWh, amp) {
    if (!t) return null;
    if (t.type === 'flat') return kWh * t.unit;
    let cost = 0;
    let prev = 0;
    if (t.type === 'B') cost += t.base10A * (amp / 10);
    if (t.type === 'A') { cost += t.min; prev = t.minKWh; }
    for (const [limit, unit] of t.tiers) {
      const top = limit === null ? Infinity : limit;
      if (kWh > prev) cost += (Math.min(kWh, top) - prev) * unit;
      prev = top;
      if (kWh <= top) break;
    }
    return cost;
  }
  // 使用量の入力がないとき：請求額から地域の大手電力の料金表で逆算（燃料費調整額は0とみなす）
  function estimateKWh(bill, t, amp, levy) {
    if (!t || !(bill > 0)) return null;
    let lo = 0;
    let hi = 3000;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (tariffCost(t, mid, amp) + mid * levy > bill) hi = mid; else lo = mid;
    }
    return Math.round(lo);
  }

  // ---------- 電気・ガス（共通） ----------
  // 今の請求額から「地域の大手の標準プランならいくらか」を逆算し、各社の割引率をかける
  function energyCost(kind, list, cur, combo, ctx) {
    const { data, months, area, opts } = ctx;
    const svc = list.find((x) => x.id === combo[kind]);
    const bill = Number(cur.bill) || 0;
    const currentSvc = list.find((x) => x.id === cur.current);
    const staying = cur.current === svc.id;
    let monthly;
    let label;
    let src = svc.source;
    let baseline;
    if (kind === 'electric') {
      // 料金表の差で計算：今の請求額 ＋（乗り換え先の料金表 − 今の会社の料金表）
      const kWh = ctx.kWh;
      const tNew = tariffOf(svc, area, data);
      const tCur = tariffOf(currentSvc, area, data) || tariffOf(data.electric.find((x) => x.id === 'std'), area, data);
      const cNew = tariffCost(tNew, kWh, ctx.amp);
      const cCur = tariffCost(tCur, kWh, ctx.amp);
      monthly = staying || cNew === null || cCur === null ? bill : Math.round(bill + cNew - cCur);
      baseline = monthly;
      const diff = staying || cNew === null || cCur === null ? '' : `・今の料金表より月${cNew - cCur <= 0 ? '約' + yen(cCur - cNew) + '安い' : '約' + yen(cNew - cCur) + '高い'}`;
      label = `${svc.name}（月${kWh}kWh・${ctx.amp}Aで計算${diff}）`;
      if (!tNew) label = svc.name;
      src = (tNew && tNew.source) || svc.source;
    } else {
      baseline = bill / (1 - effRate(currentSvc, opts));
      monthly = staying ? bill : Math.round(baseline * (1 - effRate(svc, opts)));
      label = svc.name;
    }
    const lowTariff = kind === 'electric' && (lowConf(svc) || lowConf(tariffOf(svc, area, data)));
    const items = [{ cat: kind, label: `${label} ${months}か月分`, amount: monthly * months, low: kind === 'electric' ? lowTariff : lowConf(svc), src }];

    let pointRate = usable(svc, opts) ? (svc.pointRate || 0) : 0;
    if (svc.pointRateTiers && usable(svc, opts)) {
      for (const t of svc.pointRateTiers) if (monthly >= t.min) pointRate = t.rate;
    }
    let pointSrc = svc.source;
    for (const d of data.discounts.filter((d) => d.target === kind && meets(d.requires, combo, area) && usable(d, opts) && housingOk(d, ctx))) {
      if (d.rate) items.push({ cat: kind, label: d.name.includes('%') ? d.name : `${d.name}（${(d.rate * 100).toFixed(1)}%）`, amount: -Math.round(baseline * d.rate * months), low: lowConf(d), src: d.source });
      if (d.amount) items.push({ cat: kind, label: `${d.name}（月${yen(d.amount)}）`, amount: -d.amount * Math.min(d.months || months, months), low: lowConf(d), src: d.source });
      if (d.pointRate) { pointRate += d.pointRate; pointSrc = d.source || pointSrc; }
    }
    if (pointRate > 0 && opts.includePoints) {
      let pts = Math.round(monthly * pointRate);
      if (svc.pointCapMonthly) pts = Math.min(pts, svc.pointCapMonthly);
      items.push({ cat: kind, label: `ポイント還元（約${(pointRate * 100).toFixed(1)}%）`, amount: -pts * months, low: lowConf(svc), src: pointSrc });
    }
    if (!staying) {
      for (const c of data.campaigns.filter((c) => c.target === kind && c.provider === svc.id && meets(c.requires, combo, area))) {
        // amountMonths：「初月無料」のように月額何か月分か
        // monthlyCap：「毎月の電気代を最大1,100円割引」のように1か月の上限があるもの
        const v = campaignValue(c.amountMonths ? { ...c, amount: (c.monthlyCap ? Math.min(monthly, c.monthlyCap) : monthly) * c.amountMonths } : c, opts);
        if (v > 0) items.push({ cat: kind, label: campaignLabel(c, opts), amount: -v, low: lowConf(c), campaign: c, src: c.source });
      }
    }
    return { svc, items, switching: !staying };
  }

  // ---------- クレジットカード払いの割引 ----------
  // input.cards[family]: 'no'（持っていない・作らない） / 'have' / 'haveGold' / 'okNormal'（一般なら作ってもいい） / 'okAny'（ゴールドも可）
  function chooseCards(input, lineResults, ctx) {
    const { data, months, opts } = ctx;
    const prefs = input.cards || {};
    const items = [];
    const chosen = [];
    const families = [...new Set((data.cards || []).map((c) => c.family))];
    for (const fam of families) {
      const pref = prefs[fam] || 'no';
      if (pref === 'no') continue;
      const list = data.cards.filter((c) => c.family === fam);
      const options = [];
      const normal = list.find((c) => c.tier === 'normal');
      const gold = list.find((c) => c.tier === 'gold');
      if (pref === 'have') options.push({ card: normal, owned: true });
      if (pref === 'haveGold') options.push({ card: gold, owned: true });
      if (pref === 'okNormal') options.push({ card: normal, owned: false });
      if (pref === 'okAny') options.push({ card: normal, owned: false }, { card: gold, owned: false });
      let best = null;
      for (const o of options) {
        if (!o.card || !usable(o.card, opts)) continue;
        const its = [];
        for (const l of lineResults) {
          const amt = o.card.perLine[l.brand.id];
          if (!amt) continue;
          if (o.card.plans && !o.card.plans.includes(l.plan.id)) continue;
          its.push({ cat: 'line', who: l.label, label: `${o.card.name}で支払う割引（月${yen(amt)}）`, amount: -amt * months, low: lowConf(o.card), src: o.card.source, line: l });
        }
        if (!its.length) continue; // 割引の対象の回線がない
        if (!o.owned) {
          if (o.card.annualFee) its.push({ cat: 'card', label: `${o.card.name} 年会費（${months}か月分）`, amount: Math.round(o.card.annualFee * months / 12), src: o.card.source });
          const b = o.card.joinBonus;
          if (b) {
            const v = campaignValue({ ...b, name: `${o.card.name} 入会特典` }, opts);
            if (v > 0) its.push({ cat: 'card', label: `${o.card.name} 入会特典${b.kind === 'points' ? '（ポイント）' : ''}${b.receive === 'apply' && opts.applyPolicy === 'half' ? '（申請が必要なので半額で見込み）' : ''}`, amount: -v, low: lowConf(b), src: b.source });
          }
        }
        const net = its.reduce((s, it) => s + it.amount, 0);
        if (net < 0 && (!best || net < best.net)) best = { ...o, its, net };
      }
      if (best) {
        chosen.push({ card: best.card, owned: best.owned });
        for (const it of best.its) {
          if (it.line) { it.line.items.push(it); it.line.total += it.amount; delete it.line; }
          items.push(it);
        }
      }
    }
    // スマホの割引は各回線の内訳にも入れたので、全体の items では回線側に1回だけ数える
    return { items: items.filter((it) => it.cat === 'card'), chosen, lineItems: items.filter((it) => it.cat === 'line') };
  }

  // assignment: 家族1人ずつのスマホ会社ID
  function evaluate(input, assignment, rest, ctx) {
    const { data } = ctx;
    const combo = { mobile: assignment, ...rest };
    const counts = {};
    const lines = [];
    input.lines.forEach((line, i) => {
      const b = assignment[i];
      const rank = counts[b] || 0;
      counts[b] = rank + 1;
      lines.push({ line: { ...line, label: line.label || `${i + 1}人目` }, brandId: b, rank });
    });
    const lineResults = [];
    for (const l of lines) {
      const brand = data.mobileBrands.find((x) => x.id === l.brandId);
      const r = lineCost(l.line, brand, combo, ctx, { assignment, index: lineResults.length });
      if (!r) return null; // 使う容量に合うプランがない
      lineResults.push(r);
    }
    const hikari = hikariCost(input, combo, ctx);
    const electric = energyCost('electric', data.electric, input.electric, combo, ctx);

    let gas;
    if (input.gas.type === 'city') {
      gas = energyCost('gas', data.gas, input.gas, combo, ctx);
    } else {
      const bill = Number(input.gas.bill) || 0;
      const label = input.gas.type === 'propane' ? 'プロパンガス（今のまま・比較対象外）' : 'ガスなし（オール電化など）';
      gas = { svc: null, items: bill > 0 ? [{ cat: 'gas', label, amount: bill * ctx.months }] : [], switching: false };
    }

    const cards = chooseCards(input, lineResults, ctx);

    const items = [...lineResults.flatMap((l) => l.items), ...hikari.items, ...electric.items, ...gas.items, ...cards.items];
    const total = items.reduce((s, it) => s + it.amount, 0);
    const subtotal = { line: 0, hikari: 0, electric: 0, gas: 0, card: 0 };
    for (const it of items) subtotal[it.cat] += it.amount;
    const switches = lineResults.filter((l) => l.switching).length + (hikari.switching ? 1 : 0) + (electric.switching ? 1 : 0) + (gas.switching ? 1 : 0);
    const brandIds = [...new Set(assignment)];
    return {
      combo,
      brands: brandIds.map((id) => data.mobileBrands.find((b) => b.id === id)),
      lines: lineResults,
      hikari,
      electric,
      gas,
      cards: cards.chosen,
      items,
      subtotal,
      total: Math.round(total),
      switches,
      hasLowConfidence: items.some((it) => it.low),
    };
  }

  function currentTotal(input, months) {
    const parts = [Number(input.mobileCurrentMonthly) || 0];
    if (input.hikari.use && input.hikari.current !== 'none') parts.push(Number(input.hikari.currentMonthly) || 0);
    parts.push(Number(input.electric.bill) || 0);
    if (input.gas.type !== 'none') parts.push(Number(input.gas.bill) || 0);
    const complete = Number(input.mobileCurrentMonthly) > 0 && (!input.hikari.use || input.hikari.current === 'none' || Number(input.hikari.currentMonthly) > 0);
    return { total: parts.reduce((a, b) => a + b, 0) * months, complete };
  }

  // この地域・住まいで比較する対象と、対象外の理由
  function scope(input, data) {
    const avail = (list) => list.filter((x) => isAvailable(x, input.area, input.housing));
    const notHere = (list) => list.filter((x) => !isAvailable(x, input.area, input.housing)).map((x) => ({ name: x.name, reason: 'この地域・住まいでは提供されていない' }));
    return {
      mobile: { included: data.mobileBrands, excluded: [] },
      hikari: { included: input.hikari.use ? avail(data.hikari) : [], excluded: notHere(data.hikari) },
      electric: { included: avail(data.electric), excluded: notHere(data.electric) },
      gas: { included: input.gas.type === 'city' ? avail(data.gas) : [], excluded: notHere(data.gas) },
      notCovered: data.notCovered || [],
    };
  }

  function compare(input, data, options = {}) {
    const months = Number(input.months) || 24;
    const opts = { includePoints: true, excludeUnverified: true, applyPolicy: 'full', today: todayStr(), ...(input.options || {}) };
    const amp = Number(input.electric.amp) || 30;
    const stdT = tariffOf(data.electric.find((x) => x.id === 'std'), input.area, data);
    const kWhInput = Number(input.electric.kWh);
    const kWh = kWhInput > 0 ? kWhInput : (estimateKWh(Number(input.electric.bill) || 0, stdT, amp, (data.energy || {}).renewableLevy || 0) || 0);
    const ctx = { data, months, area: input.area, housing: input.housing, opts, amp, kWh };
    const n = input.lines.length;

    const brands = data.mobileBrands.filter((b) => isAvailable(b, input.area, input.housing));
    const hikaris = input.hikari.use ? data.hikari.filter((h) => isAvailable(h, input.area, input.housing)).map((h) => h.id) : ['none'];
    const elecs = data.electric.filter((e) => isAvailable(e, input.area, input.housing)).map((e) => e.id);
    const gases = input.gas.type === 'city' ? data.gas.filter((g) => isAvailable(g, input.area, input.housing)).map((g) => g.id) : ['keep'];

    const resultsMap = new Map();
    let evaluated = 0;
    const add = (assignment, rest) => {
      const key = assignment.join(',') + '|' + rest.hikari + '|' + rest.electric + '|' + rest.gas;
      if (resultsMap.has(key)) return;
      evaluated++;
      const r = evaluate(input, assignment, rest, ctx);
      if (r) resultsMap.set(key, r);
    };

    for (const hikari of hikaris) {
      for (const electric of elecs) {
        for (const gas of gases) {
          const rest = { hikari, electric, gas };
          // 1) 家族全員が同じ会社（家族割が効く）
          for (const b of brands) add(Array(n).fill(b.id), rest);
          if (n < 2) continue;
          // 2) 1人ずつ一番安い会社を選ぶ（家族割なし・セット割はその人の回線に効くものを考慮）
          const perLine = input.lines.map((line, i) => brands
            .map((b) => {
              const r = lineCost({ ...line, label: `${i + 1}人目` }, b, { mobile: b.id, ...rest }, ctx, null);
              return r ? { id: b.id, total: r.total } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.total - b.total));
          if (perLine.some((c) => c.length === 0)) continue;
          const indep = perLine.map((c) => c[0].id);
          add(indep, rest);
          // 3) 2) をもとに、1人だけ別の会社にして光回線・電気の特典を受ける形も試す
          for (const b of brands) {
            let bestI = -1;
            let bestExtra = Infinity;
            perLine.forEach((c, i) => {
              const hit = c.find((x) => x.id === b.id);
              if (!hit) return;
              const extra = hit.total - c[0].total;
              if (extra < bestExtra) { bestExtra = extra; bestI = i; }
            });
            if (bestI >= 0) { const a = indep.slice(); a[bestI] = b.id; add(a, rest); }
          }
        }
      }
    }

    const results = [...resultsMap.values()];
    results.sort((a, b) => a.total - b.total || a.switches - b.switches);

    // 上位は「スマホの会社 × 光回線」が違うものを並べる（電気・ガスだけ違う似た案が並ばないように）
    const top = [];
    const seen = new Set();
    for (const r of results) {
      const key = r.combo.mobile.slice().sort().join(',') + '|' + r.combo.hikari;
      if (seen.has(key)) continue;
      seen.add(key);
      top.push(r);
      if (top.length >= (options.top || 5)) break;
    }

    return {
      months,
      current: currentTotal(input, months),
      results,
      top,
      // 家族全員を同じ会社にする場合の、会社ごとの一番安い組み合わせ
      bestByBrand: brands
        .map((b) => results.find((r) => r.combo.mobile.every((x) => x === b.id)))
        .filter(Boolean),
      combinations: evaluated,
      scope: scope(input, data),
      electricUsage: { kWh, amp, estimated: !(kWhInput > 0), hasTariff: !!stdT },
      counts: { mobile: brands.length, hikari: input.hikari.use ? hikaris.length : 0, electric: elecs.length, gas: input.gas.type === 'city' ? gases.length : 0 },
    };
  }

  // ---------- やることリスト ----------
  // 選んだ組み合わせから、乗り換え・特典の受け取りに必要な手続きを順番に並べる
  const PHASES = [
    { id: 'before', name: '最初にやること' },
    { id: 'apply', name: '申し込み' },
    { id: 'after', name: '開通・切り替えのあと' },
    { id: 'later', name: 'あとでやること（期限あり）' },
  ];
  function buildTodos(r, input, data) {
    const todos = [];
    const seen = new Set();
    const add = (phase, text, extra = {}) => {
      if (seen.has(text)) return;
      seen.add(text);
      todos.push({ phase, text, ...extra });
    };
    const fromList = (list, src, money) => (list || []).forEach((t) => add(t.phase, t.text, { months: t.months, deadline: t.deadline, url: src, ...(money || {}) }));
    const moneyOf = (c) => (c && c.amount ? { amount: c.amount, kind: c.kind, ...(c.endsAt ? { applyBy: c.endsAt } : {}) } : null);

    // カード（申込前に作っておくと支払い方法をすぐ設定できる）
    for (const c of r.cards || []) {
      if (!c.owned) {
        add('before', `${c.card.name}を申し込む${c.card.joinBonus ? '（入会特典が載っているページから）' : ''}`, { url: c.card.source, signup: { cat: 'card', id: c.card.id }, ...(moneyOf(c.card.joinBonus) || {}) });
      }
    }

    // スマホ
    const byBrand = new Map();
    r.lines.forEach((l) => {
      if (!l.switching) return;
      if (!byBrand.has(l.brand.id)) byBrand.set(l.brand.id, []);
      byBrand.get(l.brand.id).push(l);
    });
    for (const [, ls] of byBrand) {
      const b = ls[0].brand;
      const who = ls.map((l) => `${l.label}：${l.plan.name}`).join('、');
      const campaigns = ls.flatMap((l) => l.items.filter((it) => it.campaign).map((it) => it.campaign));
      for (const c of campaigns) fromList(c.todo, c.source, moneyOf(c));
      add('apply', `${b.name}に乗り換えを申し込む（${who}）`, { url: b.source, signup: { cat: 'mobile', id: b.id }, note: '今の会社の解約は不要（乗り換えると自動で解約）' });
    }
    for (const c of r.cards || []) {
      const brands = r.lines.filter((l) => c.card.perLine[l.brand.id]).map((l) => l.brand.name);
      if (brands.length) add('apply', `${[...new Set(brands)].join('・')}の支払い方法を${c.card.name}にする`, { url: c.card.source });
    }

    // 光回線
    if (r.hikari.svc && r.hikari.switching) {
      const cur = data.hikari.find((h) => h.id === input.hikari.current);
      if (r.hikari.jigyoushaHenkou) {
        add('before', `今の${cur.name}で「事業者変更承諾番号」を取る`, { note: '光コラボ同士の乗り換えは工事なしで切り替えられる' });
      }
      const hEnd = r.hikari.items.map((it) => it.campaign && it.campaign.endsAt).filter(Boolean).sort()[0];
      add('apply', `${r.hikari.svc.name}を申し込む${hEnd ? `（特典は${Number(hEnd.slice(5, 7))}月${Number(hEnd.slice(8, 10))}日までの申込）` : ''}`, { url: r.hikari.svc.source, signup: { cat: 'hikari', id: r.hikari.svc.id }, ...(hEnd ? { applyBy: hEnd } : {}) });
      if (input.hikari.current !== 'none' && !r.hikari.jigyoushaHenkou) {
        add('after', `${r.hikari.svc.name}の開通を確認してから、今の${cur ? cur.name : '光回線'}を解約する`, { note: 'ルーターなどのレンタル機器は返却が必要なことが多い' });
      }
      for (const it of r.hikari.items) if (it.campaign) fromList(it.campaign.todo, it.campaign.source, moneyOf(it.campaign));
    }

    // 電気・ガス
    for (const kind of ['electric', 'gas']) {
      const x = r[kind];
      if (!x.svc) continue;
      if (x.switching) {
        add('apply', `${x.svc.name}を申し込む`, { url: x.svc.source, signup: { cat: kind, id: x.svc.id }, note: '今の会社への解約の連絡は不要（新しい会社が手続きする）。検針票のお客さま番号・供給地点特定番号を用意' });
        for (const it of x.items) if (it.campaign) fromList(it.campaign.todo, it.campaign.source, moneyOf(it.campaign));
      }
      fromList(x.svc.todo && r.lines.some((l) => ['au', 'uq'].includes(l.brand.id)) ? x.svc.todo : null, x.svc.source);
    }

    // 申し込みが必要なセット割・家族割
    const used = new Set(r.items.map((it) => it.label));
    for (const d of [...data.discounts, ...(data.familyDiscounts || [])]) {
      if (!d.todo) continue;
      if ([...used].some((l) => l.startsWith(d.name))) fromList(d.todo, d.source);
    }

    const order = PHASES.map((p) => p.id);
    todos.sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase));
    return todos;
  }

  // DUEMO の「写真やお知らせから読み取る」に貼る文（1件 = 1タスク）
  // DUEMO は 1行目をタイトル、「円」「ポイント」の金額、「まで」「期限」の近くの日付を読み取る
  const PHASE_DAYS = { before: 3, apply: 7, after: 30 }; // 期限の目安（今日から何日後）
  const ACTIVATION_DAYS = 30; // 開通までの目安
  function addDays(ymd, days) {
    const d = new Date(ymd + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d;
  }
  function addMonths(d, m) {
    const x = new Date(d);
    x.setMonth(x.getMonth() + m);
    return x;
  }
  function dueOf(t, today) {
    if (t.deadline) return new Date(t.deadline + 'T00:00:00');
    if (t.applyBy && (t.phase === 'before' || t.phase === 'apply')) {
      const d = addDays(today, PHASE_DAYS[t.phase] || 7);
      const end = new Date(t.applyBy + 'T00:00:00');
      return end < d ? end : d;
    }
    if (t.phase === 'later' && t.months) return addMonths(addDays(today, ACTIVATION_DAYS), t.months);
    return addDays(today, PHASE_DAYS[t.phase] || 7);
  }
  function jpDate(d) { return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; }
  function todoNotice(t, today) {
    const due = dueOf(t, today);
    // タイトルは補足の（　）を除いた短い形。補足は3行目に残す
    const cut = t.text.endsWith('）') ? t.text.indexOf('（') : -1;
    const lines = [cut > 0 ? t.text.slice(0, cut) : t.text];
    if (t.amount) lines.push(`もらえる特典：${t.amount.toLocaleString('ja-JP')}${t.kind === 'points' ? 'ポイント' : '円'}`);
    lines.push(`${t.deadline || (t.applyBy && dueOf(t, today).getTime() === new Date(t.applyBy + 'T00:00:00').getTime()) ? '期限' : 'やる日の目安'}：${jpDate(due)}まで${t.phase === 'later' && t.months ? `（開通から${t.months}か月後・開通日は今日から約1か月後として計算）` : ''}`);
    if (t.text !== lines[0]) lines.push(t.text);
    if (t.url) lines.push(t.url);
    return lines.join('\n');
  }

  // DUEMO に貼り付けやすい文字列。1行に1つの手続きと、その期限・もらえる特典を書く
  // （DUEMO の「まとめて登録」が、・で始まる行ごとに期限と金額を読み取って、1件ずつタスクにする）
  function todosText(todos, title, today) {
    const lines = [title];
    for (const p of PHASES) {
      const ts = todos.filter((t) => t.phase === p.id);
      if (!ts.length) continue;
      lines.push('', `【${p.name}】`);
      for (const t of ts) {
        const info = [];
        if (t.amount) info.push(`もらえる特典：${t.amount.toLocaleString('ja-JP')}${t.kind === 'points' ? 'ポイント' : '円'}`);
        if (today) info.push(`${t.deadline ? '期限' : '目安'}：${jpDate(dueOf(t, today))}まで`);
        else if (t.months && !t.text.includes('か月')) info.push(`開通から${t.months}か月後`);
        lines.push(`・${t.text}${info.length ? `（${info.join('・')}）` : ''}`);
      }
    }
    return lines.join('\n');
  }

  function yen(n) {
    return '¥' + Math.round(n).toLocaleString('ja-JP');
  }

  const api = { buildTodos, todosText, todoNotice, dueOf, PHASES, compare, evaluate, isAvailable, meets, yen, tariffCost, tariffOf, estimateKWh, CATEGORY, RECEIVE_LABEL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KakeiEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);

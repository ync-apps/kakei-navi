(function () {
  const D = window.KAKEI_DATA;
  const E = window.KakeiEngine;
  const AFF = window.KAKEI_AFFILIATE || { links: {} };
  // アフィリエイトリンク（設定されていなければ空）
  const affUrl = (signup) => (signup && okUrlStrict((AFF.links || {})[`${signup.cat}:${signup.id}`])) || '';
  function okUrlStrict(u) { return typeof u === 'string' && /^https:\/\//.test(u) ? u : ''; }
  const hasAffiliate = Object.values(AFF.links || {}).some((u) => okUrlStrict(u));
  const affLinks = Object.fromEntries(Object.entries(AFF.links || {}).filter(([, u]) => okUrlStrict(u)));
  const yen = E.yen;
  const STORE_KEY = 'kakei-navi:input:v3';
  const $ = (sel) => document.querySelector(sel);
  const form = $('#form');

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const option = (value, label) => `<option value="${esc(value)}">${esc(label)}</option>`;
  const okUrl = (u) => typeof u === 'string' && /^https:\/\//.test(u);
  const confTag = (x) => x.confidence === 'low' ? ' <span class="tag low">要確認</span>' : x.confidence === 'high' ? ' <span class="tag ok">公式で確認</span>' : '';
  const srcLink = (x) => okUrl(x.source) ? ` <a class="src" href="${esc(x.source)}" target="_blank" rel="noopener">出典</a>` : '';
  const linkText = (text, url) => okUrl(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text);
  const todayYmd = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const catLabel = { line: 'スマホ', hikari: '光回線', electric: '電気', gas: 'ガス', card: 'カード（年会費・入会特典）' };
  const listOf = { line: D.mobileBrands, mobile: D.mobileBrands, hikari: D.hikari, electric: D.electric, gas: D.gas };

  $('#notice').textContent = `⚠ ${D.notice}`;
  if (hasAffiliate && AFF.disclosure) { $('#pr-disclosure').textContent = AFF.disclosure; $('#pr-disclosure').hidden = false; }
  $('#foot-note').textContent = `まとめ割ナビ｜データ時点 ${D.asOf}。「要確認」の付いた金額は確認できなかった参考値です。実際の料金は使い方・時期・申込窓口によって変わります。`;

  // ---------- 選択肢 ----------
  $('#area').innerHTML = D.areas.map((a) => option(a.id, a.name)).join('');
  const mobileOptions = D.mobileBrands.map((b) => option(b.id, b.name)).join('') + option('other', 'その他の格安SIM') + option('new', '新しく契約（今は持っていない）');

  function fillAreaDependent() {
    const area = $('#area').value;
    const housing = form.housing.value;
    const keep = (sel, html) => { const v = sel.value; sel.innerHTML = html; if ([...sel.options].some((o) => o.value === v)) sel.value = v; };
    keep($('#hikariCurrent'), option('none', 'なし（新しく引く）') + D.hikari.filter((h) => E.isAvailable(h, area, housing)).map((h) => option(h.id, h.name)).join('') + option('other', 'その他'));
    keep($('#electricCurrent'), D.electric.filter((e) => E.isAvailable(e, area, housing)).map((e) => option(e.id, e.name)).join('') + option('other', 'その他'));
    keep($('#gasCurrent'), D.gas.filter((g) => E.isAvailable(g, area, housing)).map((g) => option(g.id, g.name)).join('') + option('other', 'その他'));
  }

  // ---------- カード ----------
  const CARD_FAMILIES = [
    { id: 'd', label: 'dカード（ドコモ向け）' },
    { id: 'au', label: 'au PAY カード（au・UQ向け）' },
    { id: 'paypay', label: 'PayPayカード（ソフトバンク・ワイモバイル向け）' },
  ];
  $('#card-box').innerHTML = CARD_FAMILIES.map((f) => `
    <label>${esc(f.label)}
      <select data-card="${f.id}">
        ${option('no', '持っていない・作らない')}
        ${option('have', '一般カードを持っている')}
        ${option('haveGold', 'ゴールドを持っている')}
        ${option('okNormal', '一般カードなら作ってもいい')}
        ${option('okAny', 'ゴールドでも作ってもいい')}
      </select>
    </label>`).join('');

  // ---------- スマホ回線の行 ----------
  function addLine(line = { current: 'docomo', gb: 10 }) {
    const box = $('#lines');
    const row = document.createElement('div');
    row.className = 'line-row';
    row.innerHTML = `
      <span class="line-no"></span>
      <label>今の会社<select data-k="current">${mobileOptions}</select></label>
      <label>月のデータ量<select data-k="gb">
        ${[1, 3, 5, 10, 20, 30, 50, 100].map((g) => option(g, g === 100 ? '50GB以上' : `〜${g}GB`)).join('')}
      </select></label>
      <button type="button" class="btn-x" aria-label="この人を削除">×</button>`;
    row.querySelector('[data-k="current"]').value = line.current;
    row.querySelector('[data-k="gb"]').value = String(line.gb);
    row.querySelector('.btn-x').addEventListener('click', () => {
      if (box.children.length > 1) { row.remove(); numberLines(); }
    });
    box.appendChild(row);
    numberLines();
  }
  function numberLines() {
    [...$('#lines').children].forEach((r, i) => { r.querySelector('.line-no').textContent = `${i + 1}人目`; });
  }
  $('#add-line').addEventListener('click', () => addLine());

  // ---------- 入力の表示切り替え ----------
  function toggleBoxes() {
    $('#hikari-box').hidden = !form.hikariUse.checked;
    const gt = form.gasType.value;
    $('#gasCurrentLabel').hidden = gt !== 'city';
    $('#gas-box').hidden = gt === 'none';
    $('#gas-hint').hidden = gt !== 'propane';
  }
  form.hikariUse.addEventListener('change', toggleBoxes);
  form.gasType.addEventListener('change', toggleBoxes);
  $('#area').addEventListener('change', () => { fillAreaDependent(); renderScope(); });
  form.housing.addEventListener('change', () => { fillAreaDependent(); renderScope(); });

  // ---------- 入力の読み書き ----------
  function readInput() {
    return {
      area: form.area.value,
      housing: form.housing.value,
      months: Number(form.months.value),
      lines: [...$('#lines').children].map((r) => ({
        current: r.querySelector('[data-k="current"]').value,
        gb: Number(r.querySelector('[data-k="gb"]').value),
      })),
      mobileCurrentMonthly: form.mobileCurrentMonthly.value,
      hikari: {
        use: form.hikariUse.checked,
        current: form.hikariCurrent.value,
        currentMonthly: form.hikariCurrentMonthly.value,
        cancelFee: form.hikariCancelFee.value,
      },
      electric: { current: form.electricCurrent.value, bill: form.electricBill.value, amp: Number(form.electricAmp.value), kWh: form.electricKWh.value },
      gas: { type: form.gasType.value, current: form.gasCurrent.value, bill: form.gasBill.value },
      cards: Object.fromEntries([...document.querySelectorAll('[data-card]')].map((el) => [el.dataset.card, el.value])),
      options: { includePoints: form.includePoints.checked, applyPolicy: form.applyPolicy.value, excludeUnverified: form.excludeUnverified.checked },
    };
  }

  function writeInput(v) {
    form.area.value = v.area; form.housing.value = v.housing; form.months.value = String(v.months);
    fillAreaDependent();
    $('#lines').innerHTML = '';
    (v.lines && v.lines.length ? v.lines : [{ current: 'docomo', gb: 10 }]).forEach(addLine);
    form.mobileCurrentMonthly.value = v.mobileCurrentMonthly || '';
    form.hikariUse.checked = v.hikari.use;
    form.hikariCurrent.value = v.hikari.current; form.hikariCurrentMonthly.value = v.hikari.currentMonthly || ''; form.hikariCancelFee.value = v.hikari.cancelFee || '';
    form.electricCurrent.value = v.electric.current; form.electricBill.value = v.electric.bill || '';
    form.electricAmp.value = String(v.electric.amp || 30); form.electricKWh.value = v.electric.kWh || '';
    form.gasType.value = v.gas.type; form.gasCurrent.value = v.gas.current; form.gasBill.value = v.gas.bill || '';
    document.querySelectorAll('[data-card]').forEach((el) => { el.value = (v.cards || {})[el.dataset.card] || 'no'; });
    form.includePoints.checked = v.options.includePoints !== false;
    form.applyPolicy.value = v.options.applyPolicy || 'full';
    form.excludeUnverified.checked = v.options.excludeUnverified !== false;
    toggleBoxes();
  }

  function save(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch (e) { /* 保存できなくても動く */ } }
  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; } }

  // ---------- 結果の表示 ----------
  const tag = (switching) => switching ? '<span class="tag new">乗り換え</span>' : '<span class="tag keep">そのまま</span>';

  function serviceRows(r, input) {
    const rows = [];
    const lines = r.lines.map((l) => `<div>${esc(l.label)}：${linkText(l.brand.name, l.brand.source)}${tag(l.switching)}<span class="sub">${linkText(l.plan.name, l.plan.source || l.brand.source)}</span></div>`).join('');
    rows.push(`<li><span class="cat">スマホ</span><span class="lines">${lines}</span></li>`);
    if (r.hikari.svc) {
      const sub = r.hikari.jigyoushaHenkou ? '<span class="sub">工事なしの「事業者変更」で乗り換え</span>' : '';
      rows.push(`<li><span class="cat">光回線</span><span>${linkText(r.hikari.svc.name, r.hikari.svc.source)}${tag(r.hikari.switching)}${sub}</span></li>`);
    }
    rows.push(`<li><span class="cat">電気</span><span>${linkText(r.electric.svc.name, r.electric.svc.source)}${tag(r.electric.switching)}</span></li>`);
    if (r.gas.svc) rows.push(`<li><span class="cat">ガス</span><span>${linkText(r.gas.svc.name, r.gas.svc.source)}${tag(r.gas.switching)}</span></li>`);
    else if (input.gas.type === 'propane') rows.push('<li><span class="cat">ガス</span><span>プロパンガス（今のまま）</span></li>');
    for (const c of r.cards || []) {
      rows.push(`<li><span class="cat">カード</span><span>${linkText(c.card.name, c.card.source)}${c.owned ? '<span class="tag keep">持っている</span>' : '<span class="tag new">新しく作る</span>'}<span class="sub">スマホ代の支払いに使う</span></span></li>`);
    }
    return rows.join('');
  }

  const amt = (n) => n < 0 ? '−' + yen(-n) : yen(n);

  // 内訳：スマホ（人ごと）・光回線・電気・ガスに分けて小計を出す
  function breakdown(r, months) {
    const itemRow = (it) => `
      <tr class="${it.amount < 0 ? 'gain' : ''}">
        <td>${linkText(it.label, it.src)}${it.low ? ' <span class="tag low">要確認</span>' : ''}</td>
        <td class="num">${amt(it.amount)}</td>
      </tr>`;
    const section = (title, items, subtotal) => items.length ? `
      <tbody class="bd-group">
        <tr class="bd-head"><th>${esc(title)}</th><th class="num">${yen(subtotal)}<span class="meta"> （月 約${yen(subtotal / months)}）</span></th></tr>
        ${items.map(itemRow).join('')}
      </tbody>` : '';
    let html = '<table class="bd">';
    // スマホは人ごと
    const lineItems = r.items.filter((it) => it.cat === 'line');
    html += `<tbody class="bd-group"><tr class="bd-head"><th>スマホ（家族${r.lines.length}人分）</th><th class="num">${yen(r.subtotal.line)}<span class="meta"> （月 約${yen(r.subtotal.line / months)}）</span></th></tr></tbody>`;
    for (const l of r.lines) {
      const its = lineItems.filter((it) => it.who === l.label);
      html += `<tbody class="bd-sub"><tr class="bd-subhead"><td>${esc(l.label)}：${esc(l.brand.name)}</td><td class="num">${yen(l.total)}</td></tr>${its.map(itemRow).join('')}</tbody>`;
    }
    for (const cat of ['hikari', 'electric', 'gas', 'card']) {
      html += section(catLabel[cat], r.items.filter((it) => it.cat === cat), r.subtotal[cat]);
    }
    html += `<tbody><tr class="sum"><td>実質の合計（${months}か月）</td><td class="num">${yen(r.total)}</td></tr></tbody></table>`;
    return html;
  }

  // ---------- やることリスト → DUEMO ----------
  const lastTodos = [];
  const shownTodos = [];
  function todoBlock(r, input, idx) {
    const todos = E.buildTodos(r, input, D);
    lastTodos[idx] = E.todosText(todos, `まとめ割ナビ：乗り換えの手続き（${r.lines.map((l) => l.brand.name).filter((v, i, a) => a.indexOf(v) === i).join('・')}${r.hikari.svc ? '／' + r.hikari.svc.name : ''}）`, todayYmd());
    shownTodos[idx] = todos;
    if (!todos.length) return '';
    const today = todayYmd();
    const groups = E.PHASES.map((p) => {
      const ts = todos.map((t, k) => ({ t, k })).filter(({ t }) => t.phase === p.id);
      if (!ts.length) return '';
      return `<p class="todo-phase">${esc(p.name)}</p><ol class="todo-list">${ts.map(({ t, k }) => {
        const due = E.dueOf(t, today);
        return `<li>
          <div class="todo-row">
            <div>${linkText(t.text, t.url)}${t.amount ? `<span class="tag ok">${t.amount.toLocaleString('ja-JP')}${t.kind === 'points' ? 'pt' : '円'}</span>` : ''}
              <span class="sub">${t.deadline ? '期限' : '目安'}：${due.getMonth() + 1}/${due.getDate()}${due.getFullYear() !== new Date().getFullYear() ? `（${due.getFullYear()}年）` : ''}${t.note ? '・' + esc(t.note) : ''}</span></div>
            <div class="todo-actions">
              ${affUrl(t.signup) ? `<a class="btn-signup" href="${esc(affUrl(t.signup))}" target="_blank" rel="sponsored noopener">申し込む<span class="pr">PR</span></a>` : ''}
              <a class="btn-todo-duemo" href="${esc(D.duemoUrl)}" target="_blank" rel="noopener" data-todo="${idx}:${k}">DUEMOへ</a>
            </div>
          </div></li>`;
      }).join('')}</ol>`;
    }).join('');
    return `
      <details class="breakdown todo" ${idx === 0 ? 'open' : ''}>
        <summary>やることリスト（${todos.length}件）</summary>
        <div class="duemo">
          <p><strong>DUEMOに登録して、やり忘れを防ごう</strong></p>
          <ol class="howto">
            <li>下の「全部まとめてDUEMOへ」を押す（全部の手続きがコピーされ、DUEMOが開きます）。1つだけなら各項目の「DUEMOへ」</li>
            <li>DUEMOで「登録する」→「お知らせメールなどの文を貼り付ける」に貼り付けて「読み取って入れる」</li>
            <li>手続きごとに名前・期限・金額が出るので、確認して登録（まとめての場合は、いらないものの✓を外せます）</li>
          </ol>
          <p class="meta">特に「開通から○か月後」の受け取り手続きは忘れやすく、期限を過ぎるともらえません。</p>
        </div>
        ${groups}
        <a class="btn-sub btn-copyall" href="${esc(D.duemoUrl)}" target="_blank" rel="noopener" data-copyall="${idx}">全部まとめてDUEMOへ（${todos.length}件）</a>
      </details>`;
  }

  function copySync(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* 下の方法で */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ---------- お店で見せる比較図 ----------
  let cardUrl = null;
  function showCard(r, input, res) {
    const canvas = window.KakeiShareCard.make(r, input, res, D);
    canvas.toBlob((blob) => {
      if (!blob) { toast('図を作れませんでした'); return; }
      if (cardUrl) URL.revokeObjectURL(cardUrl);
      cardUrl = URL.createObjectURL(blob);
      const name = `matomewari-hikaku-${todayYmd()}.png`;
      const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
      const canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
      let dlg = document.getElementById('card-dialog');
      if (!dlg) {
        dlg = document.createElement('div');
        dlg.id = 'card-dialog'; dlg.className = 'card-dialog'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-label', 'お店で見せる比較図');
        document.body.appendChild(dlg);
        dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.hidden = true; });
      }
      dlg.innerHTML = `
        <div class="card-sheet">
          <div class="card-bar"><strong>お店で見せる比較図</strong><button type="button" class="card-close" data-close>閉じる</button></div>
          <p class="meta">お店で見せて、提案された内容と比べるときに使えます。iPhoneは画像を長押しして「"写真"に保存」でも保存できます。</p>
          <div class="card-actions">
            ${canShare ? '<button type="button" class="btn" data-share>画像を保存・共有</button>' : ''}
            <a class="btn${canShare ? ' btn-ghost' : ''}" href="${cardUrl}" download="${name}">画像をダウンロード</a>
          </div>
          <img class="card-img" src="${cardUrl}" alt="今のままとこの組み合わせの実質負担、月あたりの比較、割引・特典、お店で確かめることをまとめた図">
        </div>`;
      dlg.hidden = false;
      const sh = dlg.querySelector('[data-share]');
      if (sh) sh.addEventListener('click', () => navigator.share({ files: [file], title: 'まとめ割ナビ 比較メモ' }).catch(() => {}));
    }, 'image/png');
  }

  function renderResult(input) {
    // 広告リンクを貼った会社は、リンク先のページの特典（viaLink）で計算する
    const res = E.compare({ ...input, options: { ...(input.options || {}), links: affLinks } }, D);
    const box = $('#result');
    if (!res.top.length) {
      box.innerHTML = '<div class="summary"><p>条件に合う組み合わせが見つかりませんでした。データ量などを見直してください。</p></div>';
      return;
    }
    const m = res.months;
    const best = res.top[0];
    const cur = res.current;
    let summary = `<div class="summary">`;
    if (cur.complete && cur.total > 0) {
      const diff = cur.total - best.total;
      summary += diff > 0
        ? `<p>いちばんお得な組み合わせにすると、${m}か月で</p><p class="big">約${yen(diff)} お得</p><p>（月あたり 約${yen(diff / m)}）</p>`
        : `<p>今の組み合わせは十分お得です。乗り換えても大きな差はなさそうです。</p>`;
      summary += `<p class="meta">今のまま：${yen(cur.total)} ／ おすすめ：${yen(best.total)}（${m}か月の実質負担）</p>`;
    } else {
      summary += `<p>いちばんお得な組み合わせは ${m}か月で</p><p class="big">${yen(best.total)}</p><p class="meta">今のスマホ代・光回線の月額を入れると「今よりいくらお得か」も出ます。</p>`;
    }
    const c = res.counts;
    const u = res.electricUsage;
    if (u.hasTariff) summary += `<p class="meta">電気は月${u.kWh}kWh${u.estimated ? '（電気代からの推定。検針票の値を入れるとより正確）' : ''}・${u.amp}Aとして各社の料金表で計算しました。</p>`;
    else summary += `<p class="meta">この地域は電気の料金表を確認できなかったため、電気は今の金額のままで計算しました。</p>`;
    summary += `<p class="meta">比べた対象：スマホ${c.mobile}社・光回線${c.hikari}社・電気${c.electric}社・ガス${c.gas}社（家族1人ずつ別の会社にする案も含めて ${res.combinations.toLocaleString()}通り）。<a href="#" data-goto="scope">比較対象の一覧</a></p></div>`;

    const cards = res.top.map((r, i) => {
      const save = cur.complete && cur.total > 0 ? cur.total - r.total : null;
      const saveHtml = save === null ? '' : save > 0 ? `<div class="save">今より約${yen(save)}お得</div>` : `<div class="save minus">今より約${yen(-save)}高い</div>`;
      return `
      <article class="plan ${i === 0 ? 'is-best' : ''}">
        <div class="plan-head">
          <div class="rank">${i === 0 ? '<span class="crown">★</span> いちばんお得' : `${i + 1}位`}</div>
          <div>
            <div class="total">${yen(r.total)} <small>/ ${m}か月（月 約${yen(r.total / m)}）</small></div>
            ${saveHtml}
          </div>
        </div>
        <ul class="services">${serviceRows(r, input)}</ul>
        <p class="meta">乗り換えの手続き：${r.switches}件${r.hasLowConfidence ? '　<span class="tag low">要確認の金額を含む</span>' : ''}</p>
        <button type="button" class="btn-sub btn-card" data-card="${i}">お店で見せる比較図を作る</button>
        <details class="breakdown"><summary>内訳を見る（スマホ・光回線・電気・ガス別）</summary>${breakdown(r, m)}</details>
        ${todoBlock(r, input, i)}
      </article>`;
    }).join('');

    const brandRows = res.bestByBrand.map((r) => `
      <tr>
        <td>${linkText(r.brands[0].name, r.brands[0].source)}</td>
        <td>${r.hikari.svc ? esc(r.hikari.svc.name) : '—'}<br><span class="meta">${esc(r.electric.svc.name)}${r.gas.svc ? '／' + esc(r.gas.svc.name) : ''}</span></td>
        <td class="num">${yen(r.total)}</td>
      </tr>`).join('');

    box.innerHTML = `
      <h2 class="h2">おすすめの組み合わせ</h2>
      ${summary}
      ${cards}
      <h2 class="h2">家族全員を同じスマホ会社にする場合</h2>
      <p class="hint">「この会社にまとめたい」場合に、光回線・電気・ガスをどうすると安いか（家族割を含む）。</p>
      <div class="table-scroll"><table class="brand-table">
        <thead><tr><th>スマホ</th><th>光回線／電気／ガス</th><th>${m}か月の実質</th></tr></thead>
        <tbody>${brandRows}</tbody>
      </table></div>`;
    box.querySelectorAll('[data-todo]').forEach((link) => link.addEventListener('click', () => {
      // リンクで DUEMO を開く（ブラウザの標準動作）。その直前に同期でコピーする
      const [i, k] = link.dataset.todo.split(':').map(Number);
      const text = E.todoNotice(shownTodos[i][k], todayYmd());
      const ok = copySync(text);
      if (ok) { link.textContent = 'コピー済み'; link.classList.add('done'); }
      else copyText(text).then((ok2) => { if (ok2) { link.textContent = 'コピー済み'; link.classList.add('done'); } });
      toast('コピーしました。DUEMOの「お知らせメールなどの文を貼り付ける」に貼り付けてください');
    }));
    // 全部まとめて：リンクで DUEMO を別タブで開く。その直前に同期でコピーする
    box.querySelectorAll('[data-copyall]').forEach((link) => link.addEventListener('click', () => {
      const text = lastTodos[Number(link.dataset.copyall)];
      const done = () => { link.textContent = 'コピー済み（DUEMOに貼り付けてください）'; link.classList.add('done'); };
      if (copySync(text)) done(); else copyText(text).then((ok) => { if (ok) done(); });
      toast('全部コピーしました。DUEMOの「お知らせメールなどの文を貼り付ける」に貼り付けると、まとめて登録できます');
    }));
    box.querySelectorAll('[data-card]').forEach((b) => b.addEventListener('click', () => showCard(res.top[Number(b.dataset.card)], input, res)));
    box.querySelectorAll('[data-goto]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); showTab(a.dataset.goto); }));
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = readInput();
    save(input);
    renderResult(input);
  });

  // ---------- キャンペーン一覧 ----------
  const providerName = (c) => (listOf[c.target].find((x) => x.id === c.provider) || {}).name || c.provider;
  let campFilter = 'all';
  function renderCampaigns() {
    const cats = [['all', 'すべて'], ['line', 'スマホ'], ['hikari', '光回線'], ['electric', '電気'], ['gas', 'ガス']];
    $('#camp-filters').innerHTML = cats.map(([k, l]) => `<button type="button" class="chip ${campFilter === k ? 'is-active' : ''}" data-f="${k}">${l}</button>`).join('');
    $('#camp-filters').querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { campFilter = b.dataset.f; renderCampaigns(); }));

    const today = todayYmd();
    const expired = D.campaigns.filter((c) => c.endsAt && c.endsAt < today);
    const list = D.campaigns
      .filter((c) => !(c.endsAt && c.endsAt < today))
      .filter((c) => (!c.viaLink || affLinks[c.viaLink]) && !(c.notWithLink && affLinks[c.notWithLink]))
      .filter((c) => campFilter === 'all' || c.target === campFilter)
      .filter((c) => c.amount > 0 || c.amountMonths)
      .sort((a, b) => b.amount - a.amount);
    $('#campaign-list').innerHTML = list.map((c) => `
      <div class="camp-card">
        <div class="row">
          <div><span class="meta">${esc(catLabel[c.target])}｜${esc(providerName(c))}</span><br><strong>${linkText(c.name, c.source)}</strong>${c.agent ? `<br><span class="meta">代理店「${esc(c.agent)}」のページ（PRリンク）から申し込んだ場合の特典</span>` : c.viaLink ? '<br><span class="meta">PRリンクから申し込んだ場合の特典</span>' : ''}</div>
          <div class="amt">${c.amountMonths ? (c.monthlyCap ? `月${yen(c.monthlyCap)}まで×${c.amountMonths}か月` : `月額${c.amountMonths}か月分`) : yen(c.amount)}${c.kind === 'points' ? '<span class="meta"> 相当</span>' : ''}</div>
        </div>
        <p class="cond">${c.endsAt ? `<strong>${Number(c.endsAt.slice(5, 7))}月${Number(c.endsAt.slice(8, 10))}日まで。</strong>` : ''}${c.mnpOnly ? '番号そのまま乗り換え（MNP）限定。' : ''}${esc(c.conditions || '')}</p>
        <p class="meta">${c.kind === 'points' ? 'ポイント' : '現金・残高・割引'}｜受け取り方：${esc(E.RECEIVE_LABEL[c.receive] || '不明')}${c.receiveNote ? `（${esc(c.receiveNote)}）` : ''}${confTag(c)}${srcLink(c)}</p>
      </div>`).join('') + (expired.length ? `<p class="hint">終了したキャンペーン ${expired.length}件は表示・計算から外しています。</p>` : '') || '<p class="hint">該当するキャンペーンはありません。</p>';

    const dl = D.discounts
      .filter((d) => (d.amount === undefined || d.amount === 'full' || d.amount > 0))
      .filter((d) => campFilter === 'all' || d.target === campFilter);
    const fam = (campFilter === 'all' || campFilter === 'line') ? (D.familyDiscounts || []) : [];
    const reqText = (req) => Object.entries(req || {}).map(([k, ids]) => {
      if (k === 'area') return ids.map((id) => D.areas.find((a) => a.id === id).name).join('・') + 'エリア';
      return ids.map((id) => (listOf[k].find((x) => x.id === id) || {}).name || id).join('・');
    }).join(' ＋ ');
    const valText = (d) => {
      if (d.plans) { const v = Object.values(d.plans); const mn = Math.min(...v), mx = Math.max(...v); return `1回線 月${mn === mx ? yen(mx) : yen(mn) + '〜' + yen(mx)}引き${d.months ? `（${d.months}か月）` : ''}`; }
      if (d.amount === 'full') return `月額${d.months}か月無料`;
      if (d.amount) return `月${yen(d.amount)}引き${d.months ? `（${d.months}か月）` : ''}`;
      if (d.rate) return `${(d.rate * 100).toFixed(1)}%引き`;
      if (d.pointRate) return `ポイント +${(d.pointRate * 100).toFixed(1)}%`;
      if (d.pointAmount) return `毎月${d.pointAmount.toLocaleString('ja-JP')}ポイント`;
      return '';
    };
    const famText = (d) => Object.entries(d.byCount).map(([n, a]) => `${n}人以上 月${yen(a)}`).join('／') + (d.secondLineOnwards ? '（2人目から）' : '（全員）');
    const cardRows = (campFilter === 'all' || campFilter === 'line') ? (D.cards || []).map((c) => `<tr><td>${esc(c.name)}${confTag(c)}${srcLink(c)}${c.note ? `<br><span class="meta">${esc(c.note)}</span>` : ''}</td><td>スマホ代をこのカードで支払う（${c.annualFee ? `年会費${yen(c.annualFee)}` : '年会費無料'}${c.joinBonus ? `・入会特典 最大${yen(c.joinBonus.amount)}相当` : ''}）</td><td class="num">${esc(Object.entries(c.perLine).map(([b, v]) => `${(listOf.mobile.find((x) => x.id === b) || {}).name} 月${yen(v)}`).join('／'))}</td></tr>`).join('') : '';
    $('#discount-list').innerHTML = `<div class="table-scroll"><table class="camp-table">
      <thead><tr><th>割引</th><th>必要な組み合わせ</th><th>割引額</th></tr></thead>
      <tbody>
      ${dl.map((d) => `<tr><td>${esc(d.name)}${confTag(d)}${srcLink(d)}${d.note ? `<br><span class="meta">${esc(d.note)}</span>` : ''}</td><td>${esc(reqText(d.requires) || '（そのプランならだれでも）')}</td><td class="num">${esc(valText(d))}</td></tr>`).join('')}
      ${cardRows}
      ${fam.map((d) => `<tr><td>${esc(d.name)}${confTag(d)}${srcLink(d)}${d.note ? `<br><span class="meta">${esc(d.note)}</span>` : ''}</td><td>家族で同じ会社（${esc((listOf.mobile.find((b) => b.id === d.brand) || {}).name || d.brand)}）</td><td class="num">${esc(famText(d))}</td></tr>`).join('')}
      </tbody>
    </table></div>`;
  }

  // ---------- 比較対象 ----------
  function renderScope() {
    const input = { area: form.area.value, housing: form.housing.value, hikari: { use: true }, gas: { type: 'city' } };
    const areaName = (D.areas.find((a) => a.id === input.area) || {}).name;
    const housingName = input.housing === 'house' ? '戸建て' : 'マンション';
    const block = (cat, list) => {
      const inc = list.filter((x) => E.isAvailable(x, input.area, input.housing));
      const exc = list.filter((x) => !E.isAvailable(x, input.area, input.housing));
      return `
      <div class="scope-card">
        <h3>${catLabel[cat]}（${inc.length}社を比較）</h3>
        <ul class="scope-list">${inc.map((x) => `<li>${linkText(x.name, x.source)}${confTag(x)}${x.plans ? `<span class="meta">　${x.plans.length}プラン</span>` : ''}</li>`).join('')}</ul>
        ${exc.length ? `<p class="meta">この地域・住まいでは提供なし：${exc.map((x) => esc(x.name)).join('、')}</p>` : ''}
      </div>`;
    };
    $('#scope').innerHTML = `
      <p class="hint">${esc(areaName)}・${housingName}で比べる対象です（地域・住まいを変えると変わります）。</p>
      ${block('line', D.mobileBrands)}
      ${block('hikari', D.hikari)}
      ${block('electric', D.electric)}
      ${block('gas', D.gas)}
`;
  }

  // ---------- タブ ----------
  function showTab(name) {
    document.querySelectorAll('.tab').forEach((x) => { const on = x.dataset.tab === name; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', String(on)); });
    document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== `tab-${name}`; });
    window.scrollTo({ top: 0 });
  }
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));

  // ---------- 初期表示 ----------
  const defaults = {
    area: 'tokyo', housing: 'mansion', months: 24,
    lines: [{ current: 'docomo', gb: 20 }, { current: 'docomo', gb: 3 }],
    mobileCurrentMonthly: '',
    hikari: { use: true, current: 'none', currentMonthly: '', cancelFee: '' },
    electric: { current: 'std', bill: '' },
    gas: { type: 'city', current: 'std', bill: '' },
    cards: { d: 'no', au: 'no', paypay: 'no' },
    options: { includePoints: true, applyPolicy: 'full', excludeUnverified: true },
  };
  const saved = load();
  try { writeInput(saved || defaults); } catch (e) { writeInput(defaults); }
  renderCampaigns();
  renderScope();
})();

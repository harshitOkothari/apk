/* Finora views part 1: add / edit transaction, details, split, Home, Stats, limits */
const OUT = ['lent', 'split', 'paid_back'];
let ANA = 'category', RS = 'amt', RM = month, SP = {};
document.addEventListener('click', e => { const m = e.target.closest('.multi button'); if (m) { m.classList.toggle('on'); m.parentNode.dispatchEvent(new Event('change', { bubbles: true })); } });

/* ----- rows ----- */
const txRow = (x, first) => { TXC[x.id] = x; const inc = x.type === 'credit';
  return `<button class="tx ${first ? 'first' : ''}" onclick="txDetail(${x.id})">${tile(x)}<div><p>${esc(x.merchant || x.category)}${x.is_send ? '<span class="badge">sent</span>' : ''}</p><p class="mu">${fmtDate(x.txn_date)} · ${MNAME[x.method]}${x.share != null ? ' · split' : ''}</p></div>
    <b class="${inc ? 'pos' : ''}">${inc ? '+' : '−'} ${inr(x.share != null ? x.share : x.amount)}</b></button>`; };

/* ----- add / edit. Modes: Spent, Sent (to a person, not a shop), Got money. Category is suggested, not asked. ----- */
const MODE_TXT = { spent: ['Paid to', 'Shop, app, rent…'], sent: ['Sent to', 'Friend’s name'], got: ['From', 'Company or person'] };
async function txSheet(x = {}, id = null, pending = false) {
  const mode0 = x.is_send || (pending && x.person_hint) ? 'sent' : x.type === 'credit' ? 'got' : 'spent', m = x.method || 'upi', dv = (x.txn_date || nowLocal()).slice(0, 16);
  let catSel = x.category && x.category !== 'Others' ? x.category : '', touched = false, tmr, psug = null, pNo = ''; const merchant0 = x.merchant || '';
  openSheet(`<h3>${pending ? 'New payment spotted' : id ? 'Edit' : 'Add'}</h3>
    ${id ? '' : `<button type="button" class="lnk" onclick="smsBox()">${ic('plus', 14)} Paste a bank SMS instead</button><div id="smsbox"></div>`}
    ${seg('f-mode', [['spent', 'Spent'], ['sent', 'Sent'], ['got', 'Got money']], mode0, 'big')}
    <label>Amount</label>${amtField('f-amt', x.amount)}${amtChips('f-amt')}
    <label id="f-ml">${MODE_TXT[mode0][0]}</label><input id="f-mer" value="${esc(x.merchant)}" placeholder="${MODE_TXT[mode0][1]}" autocomplete="off" maxlength="60"><div class="chips" id="f-pay"></div>
    <div id="f-catw"><div id="f-sug"></div><div id="f-catpick"></div></div>
    <div id="f-gkw" style="display:none"><label>What is this?</label>${seg('f-gk', [['income', 'Income'], ['friend', 'Friend paid me back']], 'income')}</div>
    <div id="f-methw"><label>Paid by</label>${seg('f-meth', METHODS, m)}<div id="f-cardw"></div></div>
    <div class="more" id="f-more"><button type="button" onclick="this.parentNode.classList.toggle('open')">${ic('chev', 14)} Date, time & note</button><div class="body"><label>When</label>${dateField('f-date', dv, true)}<label>Note</label><input id="f-note" value="${esc(x.note)}" maxlength="200" placeholder="Optional"></div></div>
    <button class="btn" id="f-ok" data-ok>Save</button>${pending ? `<button class="btn ghost" id="f-skip">Not a payment, discard</button>` : ''}`);
  const mode = () => segVal('f-mode');
  const drawSug = () => { const mer = $('#f-mer').value.trim(), w = $('#f-sug'); if (mode() !== 'spent') { w.innerHTML = ''; return; }
    if (psug && psug.person && psug.for === mer.toLowerCase() && pNo !== psug.for && mer.length >= 3) {
      w.innerHTML = `<div class="sug"><span><span>${psug.person_known ? esc(mer) + ' is in your People' : 'Looks like a person'}<small>Record this as money sent to ${esc(mer)}?</small></span></span><span class="sb"><button type="button" id="f-py">Yes, sent</button><button type="button" class="q2" id="f-pn">No</button></span></div>`;
      $('#f-py').onclick = () => pickSeg('f-mode', 'sent'); $('#f-pn').onclick = () => { pNo = psug.for; drawSug(); }; return; }
    if (!catSel && mer.length < 2) { w.innerHTML = ''; return; }
    const c = catSel || 'Others'; w.innerHTML = `<div class="sug"><span><i class="dot" style="background:${col(catIdx(c))}"></i><span>${esc(c)}<small>${catSel ? 'Goes under this category' : 'No match yet. We will file it under Others'}</small></span></span><button type="button" onclick="catChange()">Change</button></div>`; };
  window.catChange = () => { $('#f-catpick').innerHTML = `<div class="catpick">${seg('f-cat', CATS.filter(c => c !== 'Friends & Family').map(k => [k, k]), catSel || 'Others')}</div>`;
    $('#f-cat').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { catSel = b.dataset.v === 'Others' ? '' : b.dataset.v; touched = true; $('#f-catpick').innerHTML = ''; drawSug(); } }); };
  const drawMode = () => { const k = mode(); $('#f-ml').textContent = MODE_TXT[k][0]; $('#f-mer').placeholder = MODE_TXT[k][1]; $('#f-catw').style.display = k === 'spent' ? '' : 'none'; $('#f-gkw').style.display = k === 'got' ? '' : 'none'; $('#f-methw').style.display = k === 'got' ? 'none' : ''; drawSug(); drawChips(); };
  const drawChips = async () => { const k = mode(); let list = [];
    try { if (k === 'spent') list = (await api('/payees')).filter(p => !p.is_send).map(p => p.name); else { PPL = await api('/people'); list = PPL.map(p => p.name); if (k === 'sent') list = [...new Set([...(await api('/payees')).filter(p => p.is_send).map(p => p.name), ...list])]; } } catch (e) {}
    const w = $('#f-pay'); if (w && k === mode()) w.innerHTML = list.slice(0, 6).map(n => `<button type="button" data-n="${esc(n)}">${esc(n)}</button>`).join(''); };
  $('#f-pay').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('#f-mer').value = b.dataset.n; $('#f-mer').dispatchEvent(new Event('input')); (num('f-amt') ? $('#f-mer') : $('#f-amt')).focus(); });
  const drawCards = () => { const k = segVal('f-meth'), list = cards.filter(c => c.kind === k);
    $('#f-cardw').innerHTML = (k === 'credit' || k === 'debit') ? (list.length ? `<label>Which card</label>` + seg('f-card', list.map(c => [c.id, `${esc(c.name)}${c.last4 ? ' ••' + esc(c.last4) : ''}`]), x.card_id || list[0].id)
      : `<p class="hint">No ${k} card added yet. We will add a “${k[0].toUpperCase() + k.slice(1)} card” for you automatically. Rename it any time in Cards.</p>`) : ''; };
  $('#f-mode').addEventListener('change', drawMode); $('#f-meth').addEventListener('change', drawCards); drawMode(); drawCards();
  $('#f-mer').addEventListener('input', () => { clearTimeout(tmr); drawSug(); tmr = setTimeout(async () => { const t = $('#f-mer').value.trim(); if (t.length < 2 || mode() !== 'spent') return;
    try { const r = await api('/suggest?text=' + encodeURIComponent(t)); if ($('#f-mer').value.trim() !== t || mode() !== 'spent') return; psug = { ...r, for: t.toLowerCase() };
      if (!touched && !(id && t === merchant0)) catSel = r.known ? r.category : ''; drawSug(); } catch (e) {} }, 180); });
  drawSug(); setTimeout(() => { const a = $('#f-amt'); if (a && !a.value && matchMedia('(hover:hover)').matches) a.focus(); }, 380);
  $('#f-ok').onclick = async () => {
    const k = mode(), amount = num('f-amt'), who = $('#f-mer').value.trim(), date = $('#f-date').dataset.v;
    if (!(amount > 0)) return toast('Enter an amount');
    if (k === 'sent' && !who) return toast('Who did you send it to?');
    const body = { amount, merchant: who, method: k === 'got' ? 'upi' : segVal('f-meth'), card_id: $('#f-card') ? +segVal('f-card') : null, txn_date: date, note: $('#f-note').value };
    try {
      if (k === 'got' && segVal('f-gk') === 'friend') { if (!who) return toast('Whose money is it?');
        await api('/ledger', { method: 'POST', body: { person: who, kind: 'received', amount, date: date.slice(0, 10), note: body.note } }); if (id) await api('/transactions/' + id, { method: 'DELETE' }); }
      else { Object.assign(body, k === 'got' ? { type: 'credit' } : k === 'sent' ? { type: 'debit', is_send: true } : { type: 'debit', category: catSel });
        await api(id ? `/transactions/${id}/confirm` : '/transactions', { method: 'POST', body }); }
      closeSheet(); toast(k === 'sent' ? `Sent to ${who} noted ✓` : 'Saved ✓'); render();
    } catch (e) { toast(e.message); } };
  if (pending) $('#f-skip').onclick = async () => { await api('/transactions/' + id, { method: 'DELETE' }); closeSheet(); render(); };
}
function smsBox() { const b = $('#smsbox'); if (b.innerHTML) { b.innerHTML = ''; return; }
  b.innerHTML = `<textarea id="sms-t" rows="3" placeholder="Paste the bank SMS here"></textarea><button type="button" class="btn ghost small" style="margin-top:8px" onclick="smsRead()">Read SMS</button>`; }
async function smsRead() { try { const p = await api('/parse', { method: 'POST', body: { text: $('#sms-t').value } });
  pickSeg('f-mode', p.type === 'credit' ? 'got' : p.person_hint ? 'sent' : 'spent'); $('#f-amt').value = fmtAmt(p.amount); $('#f-mer').value = p.merchant || ''; $('#f-mer').dispatchEvent(new Event('input')); pickSeg('f-meth', p.method); if (p.card_id) pickSeg('f-card', p.card_id); $('#smsbox').innerHTML = ''; toast('Got it. Check the details.'); } catch (e) { toast('No amount found in that SMS'); } }

/* ----- details: when, how, edit / split / delete ----- */
function txDetail(id) {
  const x = TXC[id]; if (!x) return;
  const card = cards.find(c => c.id === x.card_id), inc = x.type === 'credit', src = { manual: 'Added by you', sms: 'Bank SMS', recurring: 'Recurring' }[x.source] || x.source;
  openSheet(`<div class="c" style="margin-bottom:8px"><div class="sheet-hd">${tile(x, 52)}</div><h2 style="margin-top:10px">${esc(x.merchant || x.category)}</h2><div class="big ${inc ? 'pos' : ''}" style="font-size:34px">${inc ? '+' : ''}${inr(x.amount)}</div></div>
    <div class="kv"><span>${x.is_send ? 'Sent on' : 'Paid on'}</span><span>${longDate(x.txn_date)}</span></div>
    <div class="kv"><span>Category</span><span>${x.is_send ? 'Sent to a person' : esc(x.category)}</span></div>
    <div class="kv"><span>Paid by</span><span>${MNAME[x.method]}${card ? ' · ' + esc(card.name) + (card.last4 ? ' ••' + esc(card.last4) : '') : ''}</span></div>
    <div class="kv"><span>Added via</span><span>${src}</span></div>
    ${x.share != null ? `<div class="kv"><span>Your share</span><span>${inr(x.share)}</span></div>` : ''}${x.note ? `<div class="kv"><span>Note</span><span>${esc(x.note)}</span></div>` : ''}
    ${x.raw_sms ? `<div class="kv"><span>Original SMS</span><span class="mu sm">${esc(x.raw_sms)}</span></div>` : ''}
    <div class="acts"><button class="btn ghost" onclick="txSheet(TXC[${id}],${id})">${ic('edit', 17)} Edit</button>
      ${!inc && x.share == null && !x.is_send ? `<button class="btn ghost" onclick="splitSheet(${id})">${ic('split', 17)} Split</button>` : ''}
      <button class="btn danger" onclick="delTx(${id})">${ic('trash', 17)} Delete</button></div>`);
}
const delTx = id => ask('Delete this transaction?', 'Delete', async () => { await api('/transactions/' + id, { method: 'DELETE' }); closeSheet(); toast('Deleted'); render(); });

/* ----- split: add friends one by one. My share counts as spend, the rest becomes "they owe me" ----- */
async function splitSheet(id) {
  PPL = await api('/people'); const x = TXC[id]; SP = { id, amt: x.amount, list: [] };
  openSheet(`<h3>Split this payment</h3><p class="mu">${esc(x.merchant || x.category)} · ${inr(x.amount)}</p><div id="sp-chipw"></div>
    <label>Add a name</label><div class="addrow"><input id="sp-in" placeholder="Friend’s name" autocomplete="off" maxlength="30"><button type="button" class="btn" id="sp-add">Add</button></div>
    <label>Who is in</label><div class="plist" id="sp-list"></div><div class="seg multi" id="sp-m" style="margin-top:12px"><button type="button" class="on">I am part of the split</button></div>
    <div class="card c" style="margin:16px 0 0"><span class="mu">Each person pays</span><div class="big" id="sp-prev" style="font-size:30px">—</div></div><button class="btn" id="sp-ok">Split now</button>`);
  $('#sp-add').onclick = () => spAdd($('#sp-in').value); $('#sp-in').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); spAdd($('#sp-in').value); } });
  $('#sp-m').addEventListener('change', spDraw); spDraw();
  $('#sp-ok').onclick = async () => { if (!SP.list.length) return toast('Add at least one friend');
    try { await api(`/transactions/${id}/split`, { method: 'POST', body: { people: SP.list, include_me: !!$('#sp-m .on') } }); closeSheet(); toast('Split done. Check People ✓'); render(); } catch (e) { toast(e.message); } };
}
function spAdd(name) { name = String(name || '').trim().replace(/\s+/g, ' '); if (!name) return;
  if (SP.list.some(n => n.toLowerCase() === name.toLowerCase())) return toast(`${name} is already added`);
  const known = PPL.find(p => p.name.toLowerCase() === name.toLowerCase()); SP.list.push(known ? known.name : name); const inp = $('#sp-in'); if (inp) { inp.value = ''; inp.focus(); } spDraw(); }
const spRemove = i => { SP.list.splice(i, 1); spDraw(); };
function spDraw() {
  const me = !!$('#sp-m .on'), n = SP.list.length + (me ? 1 : 0), each = n ? SP.amt / n : 0, left = PPL.filter(p => !SP.list.some(q => q.toLowerCase() === p.name.toLowerCase()));
  $('#sp-chipw').innerHTML = left.length ? `<label>Split with</label><div class="chips" style="margin-top:0">${left.map(p => `<button type="button" data-n="${esc(p.name)}" onclick="spAdd(this.dataset.n)">${ic('plus', 13)} ${esc(p.name)}</button>`).join('')}</div>` : '';
  const row = (nm, who, rm) => `<div class="pl"><div class="ic" style="background:var(--ac-soft);color:var(--ac-tx)">${esc(nm[0]).toUpperCase()}</div><span class="nm">${who}</span><span class="sh">${inr(each)}</span>${rm}</div>`;
  $('#sp-list').innerHTML = (me ? row('Y', 'You', '<span style="width:36px"></span>') : '') + SP.list.map((nm, i) => row(nm, esc(nm), `<button type="button" class="ib" onclick="spRemove(${i})" aria-label="Remove">${ic('x', 15)}</button>`)).join('') || '<p class="mu">Add friends to split with.</p>';
  $('#sp-prev').textContent = SP.list.length ? inr(each) : '—'; }

/* ----- Home ----- */
const monthTag = () => { if (month !== today().slice(0, 7)) return ''; const d = new Date(), n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return ` · Day ${d.getDate()}/${n}`; };
async function home() {
  const [s, tx, pend, al] = await Promise.all([api('/summary?month=' + month), api('/transactions?limit=5'), api('/pending'), api('/alerts')]); ALERTS = al; notifyAlerts(al);
  const ch = s.last ? Math.round((s.total / s.last - 1) * 100) : null, kind = k => s.cards.filter(c => c.kind === k).reduce((a, c) => a + c.amt, 0), cc = kind('credit'), dc = kind('debit');
  if (pend.length && !shown.pend) { shown.pend = true; setTimeout(() => txSheet(pend[0], pend[0].id, true), 350); }
  const mt = Object.fromEntries(s.methods.map(m => [m.name, m.amt])), others = s.categories.find(c => c.name === 'Others'), last14 = s.daily.slice(-14), mx = Math.max(...last14.map(d => d.amt), 1);
  const q = [['plus', 'Spent', 'txSheet()', ''], ['send', 'Sent', "txSheet({is_send:true})", ''], ['lend', 'Lend', 'lendSheet()', ''], ['clock', 'Remind', 'reminderSheet()', '']];
  return `<header class="top">${logo(32)}<div class="hdr-r"><button class="bellb" onclick="alertsSheet()" aria-label="Reminders">${ic('bell', 19)}${al.length ? `<b>${al.length}</b>` : ''}</button><button class="av" onclick="go('settings')" aria-label="Settings">${esc((ME.name || 'F').slice(0, 2).toUpperCase())}</button></div></header>
    <div class="hello"><p>${greet()},</p><h1>${esc(ME.name || '')}</h1></div>
    <section class="card hero"><div class="row"><span class="hm">Spent this month</span><button class="chip" onclick="chooseMonth()">${monthName(month)} ▾</button></div>
      <div class="big" data-n="${s.total}">${inr(s.total)}</div>
      <p class="hm">${ch === null ? 'No data for last month' : (ch > 0 ? '↑ ' : '↓ ') + Math.abs(ch) + '% vs last month'}${s.income ? ` · Saved ${inr(s.income - s.total)}` : ''}</p>
      ${s.goal ? `<p class="hm" style="margin-top:8px">${inr(s.total)} of ${inr(s.goal)} goal</p>${bar(pct(s.total, s.goal), 'var(--tx)', true)}` : ''}
      <div class="mini" aria-hidden="true">${last14.map(d => `<i class="${d.amt === mx && d.amt ? 'on' : ''}" style="height:${Math.max(d.amt / mx * 100, 8)}%"></i>`).join('')}</div></section>
    <div class="quick">${q.map(b => `<button onclick="${b[2]}"><span class="q ${b[3]}">${ic(b[0], 20)}</span>${b[1]}</button>`).join('')}</div>
    ${al.length ? `<div class="alerts">${al.slice(0, 3).map(alertRow).join('')}</div>` : ''}
    <div class="two"><button class="card" onclick="go('cards')"><span class="mu">Credit card</span><h3 style="margin:4px 0">${inr(cc)}</h3><span class="mu">this month</span>${bar(pct(cc, s.total), 'var(--c1)')}</button>
      <button class="card" onclick="go('cards')"><span class="mu">Debit card</span><h3 style="margin:4px 0">${inr(dc)}</h3><span class="mu">this month</span>${bar(pct(dc, s.total), 'var(--c3)')}</button></div>
    ${s.insights.map(i => `<div class="ins ${i.level}">${esc(i.text)}</div>`).join('')}
    <section class="card"><h3>Where it went</h3>${s.total ? `<div class="donut">${donut(s.categories.map(c => ({ name: c.name, amt: c.amt, color: col(catIdx(c.name)) })), s.total)}
      <div class="legend">${s.categories.slice(0, 6).map(c => `<button onclick="donutTap('${esc(c.name)}')"><span><i class="dot" style="background:${col(catIdx(c.name))}"></i>${esc(c.name)}</span><b>${pct(c.amt, s.total)}%</b></button>`).join('')}</div></div>
      ${others ? `<p class="mu sm" style="margin-top:12px">“Others” = payments we could not recognise. Tap it, pick a category once, and Finora remembers.</p>` : ''}` : `<div class="empty">${logo(40, false)}<p style="margin-top:6px">Nothing here yet.<br>Tap the + to add your first payment.</p></div>`}</section>
    <section class="card"><h3>How you paid</h3><div class="pm">${METHODS.map(([k, l]) => `<div>${l}<b>${inr(mt[k])}</b><span class="mu">${pct(mt[k] || 0, s.total)}%</span></div>`).join('')}</div></section>
    <section class="card"><div class="row"><h3>Recent</h3><button class="mu seeall" onclick="go('analytics')">See all →</button></div>${tx.map((x, i) => txRow(x, i === 0)).join('') || '<p class="empty">No transactions yet.</p>'}</section>`;
}
const shown = { pend: false };
function alertRow(a) { const hot = a.days <= 1, ico = { card: 'card', lend: 'lend', custom: 'clock' }[a.kind];
  return `<button class="al ${hot ? 'hot' : ''}" onclick="alertGo('${a.kind}',${a.ref})"><span style="color:${hot ? 'var(--neg)' : 'var(--warn)'}">${ic(ico, 22)}</span><div><p><b>${esc(a.title)}</b></p><p class="mu sm">Due ${when(a.days)} · ${dmy(a.date)}</p></div>${a.amount ? `<b>${inr(a.amount)}</b>` : ''}</button>`; }
function alertGo(kind, ref) { closeSheet(); if (kind === 'card') { go('cards'); setTimeout(() => cardDetail(ref), 250); } else if (kind === 'lend') { go('people'); setTimeout(() => personSheet(ref), 250); } else alertsSheet(); }
async function reviewOthers() { const l = await api(`/transactions?month=${month}&category=Others&limit=100`); openSheet(`<h3>Not sorted yet</h3><p class="mu" style="margin-bottom:8px">Tap one, change its category, and Finora remembers next time.</p>${l.map((x, i) => txRow(x, i === 0)).join('') || '<p class="empty">All sorted</p>'}`); }
async function showTx(filter, title) { const l = await api(`/transactions?month=${month}&limit=100&${filter}`); openSheet(`<h3>${esc(title)}</h3>${l.map((x, i) => txRow(x, i === 0)).join('') || '<p class="empty">Nothing here.</p>'}`); }
function donutTap(name) { if (ANA === 'method' && tab === 'analytics') return showTx('method=' + encodeURIComponent(name), MNAME[name] || name); if (ANA === 'payee' && tab === 'analytics') return showTx('payee=' + encodeURIComponent(name), name); if (name === 'Others') return reviewOthers(); showTx('category=' + encodeURIComponent(name), name); }

/* ----- Stats ----- */
let ANAD = null;
const METHOD_COL = { upi: 2, cash: 3, credit: 0, debit: 4 };
function anaItems(s) {
  if (ANA === 'payee') return s.payees.map((p, i) => ({ key: p.name, name: p.name, amt: p.amt, n: p.n, mx: p.mx, color: p.is_send ? col(8) : col(i % 8), send: p.is_send }));
  if (ANA === 'method') return s.methods.map(m => ({ key: m.name, name: MNAME[m.name] || m.name, amt: m.amt, n: m.n, mx: m.mx, color: col(METHOD_COL[m.name] ?? 9) }));
  return s.categories.map(c => ({ key: c.name, name: c.name, amt: c.amt, n: c.n, mx: c.mx, color: col(catIdx(c.name)) }));
}
function anaBody(s) {
  const all = anaItems(s), items = ANA === 'payee' ? all.slice(0, 8) : all, tot = items.reduce((a, c) => a + c.amt, 0);
  return tot ? `<div class="donut">${donut(items, tot, ANA === 'payee' ? 'top payees' : 'spent')}<div class="legend">${items.slice(0, 7).map(c => `<button onclick="donutTap(this.dataset.n)" data-n="${esc(c.key)}" data-tip="${esc(`<b>${esc(c.name)}</b><span>${inr(c.amt)} · ${pct(c.amt, tot)}%</span>`)}"><span><i class="dot" style="background:${c.color}"></i>${esc(c.name)}</span><b>${pct(c.amt, tot)}%</b></button>`).join('')}</div></div>` : '<p class="empty">No spending this month.</p>';
}
const RANK_TXT = { amt: it => [inr(it.amt), `${it.n} payment${it.n > 1 ? 's' : ''}`], n: it => [`${it.n} time${it.n > 1 ? 's' : ''}`, `avg ${inr(it.amt / it.n)}`], mx: it => [inr(it.mx), `${it.n} payment${it.n > 1 ? 's' : ''}`] };
function rankBody(s) {
  const list = [...anaItems(s)].sort((a, b) => b[RS] - a[RS]).slice(0, 10), top = list.length ? list[0][RS] : 1;
  return list.map((it, i) => { const [p, q] = RANK_TXT[RS](it); return `<button class="rk" data-n="${esc(it.key)}" onclick="donutTap(this.dataset.n)"><span class="n">${i + 1}</span><div><span class="nm"><i class="dot" style="background:${it.color}"></i>${esc(it.name)}${it.send ? '<span class="badge">sent</span>' : ''}</span>${bar(it[RS] / top * 100, it.color)}</div><b>${p}<small>${q}</small></b></button>`; }).join('') || '<p class="empty">Nothing to rank yet.</p>';
}
async function analytics() {
  const [s, all] = await Promise.all([api('/summary?month=' + month), api('/transactions?month=' + month + '&limit=100')]); ANAD = s;
  const mx = Math.max(...s.categories.map(c => Math.max(c.amt, c.prev)), 1), pm = Math.max(...s.months.map(m => m.amt || 0), 1), pk = s.daily.reduce((a, d) => d.amt > a.amt ? d : a, { amt: 0, d: 0 });
  return `<header class="top l"><h1>Stats</h1><button class="chip" onclick="chooseMonth()">${monthName(month)} ▾</button></header>
  <section class="card"><div class="row" style="margin-bottom:12px"><h3 style="margin:0">Spending split</h3></div>${seg('a-mode', [['category', 'Category'], ['payee', 'Person / shop'], ['method', 'Payment']], ANA)}
    <div style="margin-top:16px" id="ana-body">${anaBody(s)}</div></section>
  <section class="card"><h3>Ranking</h3>${seg('a-sort', [['amt', 'Most spent'], ['n', 'Most often'], ['mx', 'Biggest']], RS)}<div id="rank-body" style="margin-top:8px">${rankBody(s)}</div></section>
  ${s.total ? `<section class="card"><div class="row"><h3>Day by day</h3>${pk.amt ? `<span class="mu sm">Peak: day ${pk.d} · ${inr(pk.amt)}</span>` : ''}</div>${dailyBars(s.daily, month)}</section>` : ''}
  <section class="card"><div class="row"><h3>Last 3 months</h3></div><div class="mo">${s.months.map((m, i) => m.amt === null ? `<div data-tip="<b>${monthName(m.month)}</b><span>Locked on the Free plan</span>"><i class="lock"></i><span class="mu">${ic('lock', 14)}</span></div>` : `<div data-tip="<b>${monthName(m.month)}</b><span>${inr(m.amt)} spent</span>"><span class="sm"><b>${inr(m.amt)}</b></span><i class="${i === 2 ? 'cur' : ''}" style="height:${Math.max(m.amt / pm * 78, 4)}%"></i><span class="mu">${new Date(m.month + '-02').toLocaleDateString('en-IN', { month: 'short' })}</span></div>`).join('')}</div></section>
  <section class="card"><h3>Top payees</h3>${s.payees.slice(0, 8).map(p => `<button class="pbar" onclick="showTx('payee=${encodeURIComponent(p.name)}','${esc(p.name).replace(/'/g, '')}')"><span class="nm">${esc(p.name)}${p.is_send ? '<span class="badge">sent</span>' : ''}</span>${bar(p.amt / s.payees[0].amt * 100, p.is_send ? 'var(--c9)' : 'var(--ink)')}<b>${inr(p.amt)}</b></button>`).join('') || '<p class="empty">No data yet</p>'}</section>
  <section class="card"><h3>This month vs last</h3>${s.categories.map(c => { const d = c.prev ? Math.round((c.amt / c.prev - 1) * 100) : null; return `<div class="cmp"><span>${esc(c.name)}</span><div>${bar(Math.min(c.amt / mx * 100, 99.9))}${bar(Math.min(c.prev / mx * 100, 99.9), 'var(--mu)')}</div><b class="${d > 0 ? 'neg' : 'pos'}">${d === null ? 'new' : (d > 0 ? '+' : '') + d + '%'}</b></div>`; }).join('') || '<p class="empty">No data yet</p>'}<p class="mu sm">Dark bar = this month, grey = last month</p></section>
  <button class="card row" onclick="go('budgets')"><span><b>Monthly limits</b><p class="mu sm">Set a cap per category. We warn you at 80%.</p></span>${ic('chev', 16)}</button>
  <button type="button" class="btn lime g" style="margin:0 0 14px" onclick="reportPrint(month)">${ic('dl', 18)} Save PDF report</button>
  <section class="card"><h3>All transactions</h3>${all.map((x, i) => txRow(x, i === 0)).join('') || '<p class="empty">No transactions yet.</p>'}</section>`;
}
document.addEventListener('change', e => {
  if (!ANAD) return;
  if (e.target.id === 'a-mode') { ANA = segVal('a-mode'); const b = $('#ana-body'), r = $('#rank-body'); if (b) b.innerHTML = anaBody(ANAD); if (r) r.innerHTML = rankBody(ANAD); }
  if (e.target.id === 'a-sort') { RS = segVal('a-sort'); const r = $('#rank-body'); if (r) r.innerHTML = rankBody(ANAD); }
});

async function budgetsView() {
  const [b, s] = await Promise.all([api('/budgets?month=' + month), api('/summary?month=' + month)]);
  return `<header class="top l"><div style="display:flex;gap:10px;align-items:center"><button class="ib" onclick="go('analytics')" aria-label="Back"><span class="flip">${ic('chev', 18)}</span></button><h2>Monthly limits</h2></div></header>
  <section class="card" onclick="setGoal(${s.goal || 0})"><div class="row"><span>Monthly spending goal</span><span class="mu">${s.goal ? inr(s.total) + ' / ' + inr(s.goal) : 'Set'}</span></div>${s.goal ? bar(pct(s.total, s.goal), 'var(--tx)', true) : ''}</section>
  <section class="card">${b.map(x => { const p = x.limit ? pct(x.spent, x.limit) : 0; return `<button style="width:100%;text-align:left;padding:8px 0;margin-bottom:6px;display:block" onclick="setBudget(${CATS.indexOf(x.category)},${x.limit || 0})"><div class="row"><span>${esc(x.category)}</span><span class="${p >= 100 ? 'neg' : p >= 80 ? 'warn' : 'mu'}">${inr(x.spent)}${x.limit ? ' / ' + inr(x.limit) : ' · set'}</span></div>${x.limit ? bar(p, p >= 80 ? 'var(--warn)' : 'var(--pos)', true) : ''}</button>`; }).join('')}</section>
  <p class="mu">Tap a category to set a monthly cap. Enter 0 to remove it.</p>`;
}
const setBudget = (i, v) => formSheet(CATS[i], [{ k: 'monthly_limit', l: 'Monthly cap (₹)', t: 'money', v: v || '' }], d => api('/budgets', { method: 'POST', body: { category: CATS[i], monthly_limit: d.monthly_limit } }));
const setGoal = v => formSheet('Monthly spending goal', [{ k: 'goal', l: 'Goal for the month (₹)', t: 'money', v: v || '' }], async d => { ME = await api('/settings', { method: 'POST', body: d }); });

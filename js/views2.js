/* Finora views part 2: cards, people (lend with interest), reminders, invest, settings, upgrade, phone setup, navigation */
const INV_KINDS = [['stocks', 'Stocks'], ['mf', 'Mutual fund'], ['sip', 'SIP'], ['gold', 'Gold'], ['fd', 'FD / Savings'], ['crypto', 'Crypto'], ['other', 'Other']];

/* ----- Cards ----- */
async function cardsView() {
  cards = await api('/cards');
  const cr = cards.filter(c => c.kind === 'credit'), sum = (l, k) => l.reduce((a, c) => a + (c[k] || 0), 0);
  const tileC = c => `<button class="card" onclick="cardDetail(${c.id})"><div class="row"><b>${esc(c.name)} <span class="mu">${c.last4 ? '••' + esc(c.last4) : ''}</span></b><span class="mu">${c.kind === 'credit' ? 'Credit' : 'Debit'} ${ic('chev', 14)}</span></div>
    <div class="grid3"><span>This month<b>${inr(c.month_spent)}</b></span>${c.kind === 'credit' ? `<span>Outstanding<b class="${c.outstanding ? 'neg' : ''}">${inr(c.outstanding)}</b></span><span>Available<b class="pos">${c.available === null ? '—' : inr(c.available)}</b></span>` : ''}</div>
    ${c.kind === 'credit' && c.credit_limit ? bar(pct(c.outstanding, c.credit_limit), 'var(--c1)', true) : ''}
    ${c.due_date ? `<p class="${c.days_left <= 5 && c.outstanding ? 'warn' : 'mu'}" style="margin-top:8px">Bill due ${dmy(c.due_date)} · ${when(c.days_left)}</p>` : ''}</button>`;
  return `<header class="top l"><h1>Cards</h1><button class="chip" onclick="cardSheet()">${ic('plus', 14)} Add</button></header>
  ${cr.length ? `<section class="card hero"><span class="hm">Credit cards: spent this month</span><div class="big" data-n="${sum(cr, 'month_spent')}">${inr(sum(cr, 'month_spent'))}</div>
    <div class="grid3"><span>Outstanding<b>${inr(sum(cr, 'outstanding'))}</b></span><span>Available<b>${inr(sum(cr, 'available'))}</b></span><span>Cards<b>${cr.length}</b></span></div></section>` : ''}
  ${cards.map(tileC).join('') || `<div class="empty">${logo(40, false)}<p style="margin-top:6px">Add a card to track limits and bill dates.<br>You can also just save payments without one.</p></div>`}<button class="btn" onclick="cardSheet()">Add card</button>`;
}
function cardSheet(c = null, kind = 'credit') {
  const k = c ? c.kind : kind;
  openSheet(`<h3>${c ? 'Edit card' : 'Add card'}</h3><label>Card name</label><input id="c-name" value="${esc(c ? c.name : '')}" placeholder="e.g. Salary account card" maxlength="40" autocomplete="off">
    <label>Type</label>${seg('c-kind', [['credit', 'Credit'], ['debit', 'Debit']], k)}
    <label>Last 4 digits (matches your bank SMS)</label><input id="c-l4" class="digits" inputmode="numeric" maxlength="4" placeholder="1234" value="${esc(c ? c.last4 : '')}" autocomplete="off">
    <div id="c-cw"><label>Credit limit (₹)</label>${amtField('c-lim', c ? c.credit_limit : '')}<label>Next bill due date</label>${dateInp('c-due', c ? c.due_date || '' : '', 'today')}
      <p class="hint">Type it like 25/12/2026. We remind you before this date, every month.</p></div>
    <button class="btn" id="c-ok" data-ok>Save</button>${c ? `<button class="btn danger" onclick="delCard(${c.id})">Remove card</button>` : ''}`);
  const sync = () => { $('#c-cw').style.display = segVal('c-kind') === 'credit' ? '' : 'none'; }; $('#c-kind').addEventListener('change', sync); sync();
  $('#c-ok').onclick = async () => { try { const kind = segVal('c-kind'), name = $('#c-name').value.trim(), l4 = $('#c-l4').value;
    if (!name) throw new Error('Give the card a name'); if (l4 && l4.length !== 4) throw new Error('Last 4 digits: exactly 4 numbers');
    const due = kind === 'credit' ? dateOf('c-due', false) : null;
    await api(c ? '/cards/' + c.id : '/cards', { method: 'POST', body: { name, kind, last4: l4, credit_limit: kind === 'credit' ? num('c-lim') : 0, due_date: due } });
    closeSheet(); toast('Card saved ✓'); cards = await api('/cards'); render(); } catch (e) { toast(e.message); } };
}
const delCard = id => ask('Remove this card? Its payments stay, just unlinked.', 'Remove', async () => { await api('/cards/' + id, { method: 'DELETE' }); closeSheet(); render(); });
async function cardDetail(id) {
  const [c, pay, tx] = await Promise.all([api('/cards').then(l => l.find(x => x.id === id)), api(`/cards/${id}/payments`), api(`/transactions?card_id=${id}&limit=8`)]); if (!c) return;
  openSheet(`<div class="row"><h3 style="margin:0">${esc(c.name)} ${c.last4 ? '••' + esc(c.last4) : ''}</h3><button class="chip" onclick="cardSheet(${JSON.stringify(c).replace(/"/g, '&quot;')})">${ic('edit', 14)} Edit</button></div>
    <div class="grid3"><span>This month<b>${inr(c.month_spent)}</b></span><span>Outstanding<b class="neg">${inr(c.outstanding)}</b></span><span>Available<b class="pos">${c.available === null ? '—' : inr(c.available)}</b></span></div>
    ${c.due_date ? `<p class="mu">Next due: <b style="color:var(--tx)">${longDate(c.due_date)}</b> · ${when(c.days_left)}</p>` : ''}
    <button class="btn" onclick="payCard(${id},${Math.round(c.outstanding)})">Record bill payment</button>
    <button class="btn ghost" onclick="reminderSheet({title:'${esc(c.name).replace(/'/g, '')} bill',amount:${Math.round(c.outstanding)}})">${ic('clock', 16)} Remind me</button>
    <h4>Payment history</h4>${pay.map(p => `<div class="kv"><span>${longDate(p.paid_on)}</span><span class="pos">${inr(p.amount)}</span></div>`).join('') || '<p class="mu">No payments yet</p>'}
    <h4>Recent spends</h4>${tx.map((x, i) => txRow(x, i === 0)).join('') || '<p class="mu">Nothing yet</p>'}`);
}
const payCard = (id, out) => formSheet('Record bill payment', [{ k: 'amount', l: 'Amount', t: 'money', v: out || '' }, { k: 'paid_on', l: 'Paid on', t: 'date', v: today(), req: true }], d => api(`/cards/${id}/payments`, { method: 'POST', body: d }));

/* ----- Reminders ----- */
function reminderSheet(pre = {}) {
  openSheet(`<h3>${ic('clock', 18)} New reminder</h3><label>Remind me about</label><input id="r-title" value="${esc(pre.title || '')}" placeholder="e.g. Pay rent, collect from a friend" maxlength="80" autocomplete="off">
    <label>Amount (optional)</label>${amtField('r-amt', pre.amount || '')}<label>On which date</label>${dateInp('r-date', pre.date || '', 'today')}
    <p class="hint" style="margin-top:8px">We show it on Home and alert you ${ME.remind_days || 3} day(s) before, 1 day before and on the day (while Finora is open).</p><button class="btn" id="r-ok" data-ok>Set reminder</button>`);
  $('#r-ok').onclick = async () => { try { const title = $('#r-title').value.trim(); if (!title) throw new Error('What should we remind you about?'); const d = dateOf('r-date', true, 'date');
    await api('/reminders', { method: 'POST', body: { title, remind_on: d, amount: num('r-amt') } }); closeSheet(); toast('Reminder set ⏰'); render(); } catch (e) { toast(e.message); } };
}
async function alertsSheet() {
  const [al, rem] = await Promise.all([api('/alerts'), api('/reminders')]); ALERTS = al; const later = rem.filter(r => !al.some(a => a.kind === 'custom' && a.ref === r.id));
  openSheet(`<div class="row"><h3 style="margin:0">Reminders</h3><button class="chip" onclick="reminderSheet()">${ic('plus', 14)} New</button></div><div class="alerts" style="margin-top:14px">${al.map(alertRow).join('') || `<div class="empty">${logo(40, false)}<p style="margin-top:6px">Nothing due soon. Enjoy</p></div>`}</div>
    ${later.length ? `<h4>Later</h4>${later.map(r => `<div class="kv"><span>${esc(r.title)}<p class="mu sm">${dmy(r.remind_on)}</p></span><button class="chip" onclick="doneRem(${r.id})">Done</button></div>`).join('')}` : ''}
    ${al.filter(a => a.kind === 'custom').length ? `<h4>Mark done</h4>${al.filter(a => a.kind === 'custom').map(a => `<div class="kv"><span>${esc(a.title)}</span><button class="chip" onclick="doneRem(${a.ref})">${ic('check', 14)} Done</button></div>`).join('')}` : ''}`);
}
const doneRem = async id => { await api(`/reminders/${id}/done`, { method: 'POST' }); closeSheet(); toast('Done ✓'); render(); };

/* ----- People: lend (with interest), send, split, repay ----- */
async function peopleView() {
  PPL = await api('/people');
  const recv = PPL.filter(p => p.balance > 0).reduce((a, p) => a + p.balance, 0), pay = PPL.filter(p => p.balance < 0).reduce((a, p) => a - p.balance, 0), intr = PPL.filter(p => p.balance > 0).reduce((a, p) => a + p.interest, 0);
  return `<header class="top l"><h1>People</h1></header>
  <section class="card hero"><div class="two2"><div><span class="hm">To receive</span><div class="big" style="font-size:30px">${inr(recv)}</div>${intr > 0.5 ? `<span class="hm sm">incl. ${inr(intr)} interest</span>` : ''}</div><div><span class="hm">To pay</span><div class="big" style="font-size:30px">${inr(pay)}</div></div></div></section>
  <div class="two2" style="margin-bottom:14px"><button class="btn lime small g" onclick="lendSheet()">${ic('lend', 17)} Lend money</button><button class="btn ghost small g" onclick="txSheet({is_send:true})">${ic('send', 17)} Just sent</button></div>
  ${[...PPL].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)).map(p => { const st = Math.abs(p.balance) < .5, dd = p.due && !st ? daysFrom(p.due) : null;
    return `<button class="card pcard" onclick="personSheet(${p.id})"><div class="row"><div><div class="ic" style="width:42px;height:42px;background:var(--card2)">${esc(p.name[0]).toUpperCase()}</div><div style="min-width:0"><b>${esc(p.name)}</b><p class="mu sm">${p.emi_next && !st ? `<span class="${daysFrom(p.emi_next) <= 1 ? 'neg' : 'warn'}">${inr(p.emi)} due ${when(daysFrom(p.emi_next))}</span>` : dd !== null ? `<span class="${dd <= 1 ? 'neg' : 'warn'}">Due ${when(dd)}</span>` : p.last ? fmtDate(p.last) : ''}</p></div></div>
      <div style="text-align:right"><b class="${st ? 'mu' : p.balance > 0 ? 'pos' : 'neg'}">${st ? 'Settled ✓' : inr(Math.abs(p.balance))}</b><p class="mu sm">${st ? '' : p.balance > 0 ? 'owes you' : 'you owe'}${p.interest > 0.5 && !st ? ` · ${inr(p.interest)} interest` : ''}</p></div></div></button>`; }).join('') || `<div class="empty">${logo(40, false)}<p style="margin-top:6px">No one yet. Lend money or split a bill<br>and it shows up here.</p></div>`}`;
}
/* repayment plan maths (preview only; the real accounting is in local.js). Monthly instalments, interest on what is still owed. */
function planMath(P, rate, unit, E) {
  const r = rate ? (unit === 'month' ? rate / 100 : rate / 100 / 12) : 0; if (!(E > 0) || !(P > 0)) return null;
  if (r === 0) return { n: Math.ceil(P / E), total: P, interest: 0 };
  if (E <= P * r) return { never: true };
  let bal = P, paid = 0, n = 0; while (bal > 0.5 && n < 600) { const i = bal * r, pay = Math.min(E, bal + i); bal = bal + i - pay; paid += pay; n++; }
  return { n, total: paid, interest: paid - P };
}
const addMonthsIso = (iso, k) => { const d = new Date(iso + 'T00:00'), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + k); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return d.toLocaleDateString('en-CA'); };
const swOn = k => { const b = document.querySelector(`[data-sw="${k}"]`); return !!b && b.classList.contains('on'); };
function lendSheet(pid = null) {
  const p = pid ? PPL.find(x => x.id === pid) : null;
  openSheet(`<h3>Lend money</h3><label>Who</label><input id="l-name" value="${esc(p ? p.name : '')}" placeholder="Name" maxlength="40" autocomplete="off">
    ${PPL.length && !p ? `<div class="chips">${PPL.map(q => `<button type="button" data-n="${esc(q.name)}" onclick="$('#l-name').value=this.dataset.n;$('#l-amt').focus()">${esc(q.name)}</button>`).join('')}</div>` : ''}
    <label>Amount</label>${amtField('l-amt', '')}${amtChips('l-amt')}<label>Lent on</label>${dateField('l-date', today(), false)}
    <div id="l-duew"><label>They will pay back by (optional)</label>${dateInp('l-due', '', 'today')}</div>
    <div style="margin-top:12px"><div class="swrow" style="border-top:1px solid var(--line)"><span><b>Monthly payments</b><p>They pay a fixed amount every month. We remind you each month.</p></span>${sw('l-emi', false)}</div>
      <div id="l-emiw" style="display:none"><label>They pay each month (₹)</label>${amtField('l-pm', '')}<label>First payment on</label>${dateInp('l-first', '', 'today')}</div>
      <div class="swrow"><span><b>Charge interest</b><p>Simple interest on what is still unpaid.</p></span>${sw('l-int', false)}</div>
      <div id="l-intw" style="display:none"><label>Interest rate (%)</label><input id="l-rate" inputmode="decimal" placeholder="e.g. 2" maxlength="5" autocomplete="off"><div style="margin-top:8px">${seg('l-unit', [['month', '% per month'], ['year', '% per year']], 'month')}</div></div></div>
    <div class="prev" id="l-prev" style="display:none"></div><button class="btn" id="l-ok" data-ok>Save</button>`);
  const calc = () => { const emi = swOn('l-emi'), int = swOn('l-int'); $('#l-emiw').style.display = emi ? '' : 'none'; $('#l-intw').style.display = int ? '' : 'none'; $('#l-duew').style.display = emi ? 'none' : '';
    const a = num('l-amt'), r = int ? parseFloat($('#l-rate').value) || 0 : 0, unit = segVal('l-unit'), pv = $('#l-prev'), show = h => { pv.style.display = h ? '' : 'none'; pv.innerHTML = h || ''; };
    if (emi) { const E = num('l-pm'), f = dtState('l-first'); if (!a || !E) return show(''); const m = planMath(a, r, unit, E);
      if (!m) return show(''); if (m.never) return show(`${inr(E)} a month is less than the interest alone, so it would never clear. Raise the monthly amount.`);
      return show(`About <b>${m.n} month${m.n > 1 ? 's' : ''}</b> of ${inr(E)}${f.iso ? `, last one around <b>${dmy(addMonthsIso(f.iso, m.n - 1))}</b>` : ''}. They repay about <b>${inr(m.total)}</b>${m.interest > 0.5 ? ` (${inr(m.interest)} interest)` : ''}.`); }
    const ds = dtState('l-due'); if (!int || !a || !r || !ds.iso) return show('');
    const days = Math.max(Math.round((new Date(ds.iso) - new Date($('#l-date').dataset.v.slice(0, 10))) / 864e5), 0), i = a * r / 100 * (unit === 'month' ? days / 30 : days / 365);
    show(`If paid on <b>${dmy(ds.iso)}</b>: ${inr(a)} + ${inr(i)} interest = <b>${inr(a + i)}</b>`); };
  SWFN['l-emi'] = SWFN['l-int'] = () => setTimeout(calc, 0);
  ['input', 'change', 'click'].forEach(ev => $('#sheet').addEventListener(ev, () => setTimeout(calc, 0))); calc();
  $('#l-ok').onclick = async () => { try { const person = $('#l-name').value.trim(), amount = num('l-amt'); if (!person) throw new Error('Who did you lend to?'); if (!(amount > 0)) throw new Error('Enter an amount');
    const emiOn = swOn('l-emi'), intOn = swOn('l-int'), rate = intOn ? parseFloat($('#l-rate').value) || 0 : 0; if (intOn && !rate) throw new Error('Enter the interest rate');
    const emi = emiOn ? num('l-pm') : 0; if (emiOn && !(emi > 0)) throw new Error('Enter the monthly amount');
    const first = emiOn ? dateOf('l-first', true, 'date of the first payment') : null, due = emiOn ? null : dateOf('l-due', false);
    await api('/ledger', { method: 'POST', body: { person, kind: 'lent', amount, date: $('#l-date').dataset.v.slice(0, 10), due, rate, rate_unit: segVal('l-unit'), emi, emi_first: first } });
    closeSheet(); toast(first ? `Saved. We will remind you before each payment` : due ? `Saved. We will remind you before ${dmy(due)}` : 'Saved'); render(); } catch (e) { toast(e.message); } };
}
async function personSheet(id) {
  PPL = PPL.length ? await api('/people') : await api('/people'); const p = PPL.find(x => x.id === id), l = await api(`/people/${id}/ledger`), st = Math.abs(p.balance) < .5;
  openSheet(`<div class="c"><div class="sheet-hd"><div class="ic" style="width:52px;height:52px;font-size:20px;background:var(--card2)">${esc(p.name[0]).toUpperCase()}</div></div><h2 style="margin-top:8px">${esc(p.name)}</h2>
    <div class="big ${st ? '' : p.balance > 0 ? 'pos' : 'neg'}" style="font-size:36px">${st ? 'Settled ✓' : inr(Math.abs(p.balance))}</div><p class="mu">${st ? '' : p.balance > 0 ? 'owes you' : 'you owe'}</p></div>
    ${p.interest > 0.5 && !st ? `<div class="grid3" style="grid-template-columns:1fr 1fr"><span>Principal<b>${inr(p.principal)}</b></span><span>Interest so far<b>${inr(p.interest)}</b></span></div>` : ''}
    ${p.emi_next && !st ? `<p class="mu c">Monthly payment <b style="color:var(--tx)">${inr(p.emi)}</b> · next on <b style="color:var(--tx)">${dmy(p.emi_next)}</b> (${when(daysFrom(p.emi_next))})</p>` : p.due && !st ? `<p class="mu c">Promised by <b style="color:var(--tx)">${dmy(p.due)}</b> · ${when(daysFrom(p.due))}</p>` : ''}
    <div class="acts">${p.emi_next && !st ? `<button class="btn lime" onclick="entrySheet(${id},'received',${Math.min(p.emi, p.balance)})">Got this month’s ${inr(p.emi)}</button>` : ''}<button class="btn ${p.emi_next && !st ? 'ghost' : 'lime'}" onclick="entrySheet(${id},'received',${Math.max(p.balance, 0)})">${p.emi_next && !st ? 'They paid all' : 'They paid'}</button><button class="btn ghost" onclick="lendSheet(${id})">Lend more</button>
      ${p.balance > 0.5 ? `<button class="btn ghost" onclick="reminderSheet({title:'${esc(p.name).replace(/'/g, '')} to pay back',amount:${Math.round(p.balance)},date:'${p.due || ''}'})">${ic('clock', 16)} Remind me</button><button class="btn ghost" onclick="nudge(${id})">${ic('send', 16)} Nudge ${esc(p.name.split(' ')[0])}</button>` : ''}</div>
    <h4>History</h4>${l.map(e => `<div class="tx first" style="border-top:1px solid var(--line)"><div style="flex:1"><p>${{ lent: 'I lent', received: 'They paid me', borrowed: 'I borrowed', paid_back: 'I paid back', split: 'Split share' }[e.kind]}${e.rate ? ` <span class="badge">${e.rate}% / ${e.rate_unit}</span>` : ''}${e.emi ? ` <span class="badge">${inr(e.emi)} / month</span>` : ''}</p><p class="mu sm">${longDate(e.date)}${e.due ? ' · due ' + dmy(e.due) : ''}${e.note ? ' · ' + esc(e.note) : ''}</p></div>
      <b class="${OUT.includes(e.kind) ? 'neg' : 'pos'}">${OUT.includes(e.kind) ? '−' : '+'} ${inr(e.amount)}</b><button class="ib" onclick="delEntry(${e.id})" aria-label="Delete">${ic('trash', 16)}</button></div>`).join('')}`);
}
function nudge(id) { const p = PPL.find(x => x.id === id), t = `Hey ${p.name.split(' ')[0]}! Quick reminder about the ${inr(p.balance)}${p.interest > 0.5 ? ` (includes ${inr(p.interest)} interest)` : ''}${p.due ? ` due on ${dmy(p.due)}` : ''}. Thanks!`;
  if (navigator.share) navigator.share({ text: t }).catch(() => {}); else window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank'); }
const delEntry = lid => ask('Delete this entry?', 'Delete', async () => { await api('/ledger/' + lid, { method: 'DELETE' }); closeSheet(); toast('Deleted'); render(); });
function entrySheet(pid, kind = 'received', amt = '') {
  const p = PPL.find(x => x.id === pid);
  openSheet(`<h3>Add entry</h3><label>Person</label><input id="e-name" value="${esc(p ? p.name : '')}" placeholder="Name" maxlength="40" autocomplete="off">
    <label>What happened</label>${seg('e-kind', [['received', 'They paid me'], ['lent', 'I lent'], ['borrowed', 'I borrowed'], ['paid_back', 'I paid back']], kind)}
    <label>Amount</label>${amtField('e-amt', amt ? Math.round(amt) : '')}${amtChips('e-amt')}<label>When</label>${dateField('e-date', today(), false)}<label>Note</label><input id="e-note" placeholder="Optional" maxlength="100">
    <button class="btn" id="e-ok" data-ok>Save</button>`);
  $('#e-ok').onclick = async () => { const body = { person: $('#e-name').value.trim(), kind: segVal('e-kind'), amount: num('e-amt'), date: $('#e-date').dataset.v.slice(0, 10), note: $('#e-note').value.trim() };
    if (!body.person) return toast('Enter a name'); if (!(body.amount > 0)) return toast('Enter an amount');
    try { await api('/ledger', { method: 'POST', body }); closeSheet(); toast('Saved ✓'); render(); } catch (e) { toast(e.message); } };
}

/* ----- Invest ----- */
async function investView() {
  const l = await api('/investments'), ti = l.reduce((a, i) => a + i.invested, 0), tc = l.reduce((a, i) => a + i.current, 0), g = tc - ti, name = k => (INV_KINDS.find(x => x[0] === k) || [0, k])[1];
  const by = INV_KINDS.map(([k], n) => ({ k, n, v: l.filter(i => i.kind === k).reduce((a, i) => a + i.current, 0) })).filter(x => x.v > 0);
  return `<header class="top l"><h1>Invest</h1><button class="chip" onclick="investSheet()">${ic('plus', 14)} Add</button></header>
  <section class="card hero"><span class="hm">Current value</span><div class="big">${inr(tc)}</div><p class="hm">Invested ${inr(ti)} · ${g >= 0 ? '↑' : '↓'} ${inr(Math.abs(g))}${ti ? ` (${(g / ti * 100).toFixed(1)}%)` : ''}</p></section>
  ${by.length ? `<section class="card"><h3>Where it is invested</h3><div class="stack">${by.map(x => `<i style="flex:${x.v};background:${col(x.n)}"></i>`).join('')}</div><div class="legend" style="margin-top:12px">${by.map(x => `<p><span><i class="dot" style="background:${col(x.n)}"></i>${name(x.k)}</span><b>${pct(x.v, tc)}%</b></p>`).join('')}</div></section>` : ''}
  ${l.map(i => { const gg = i.current - i.invested; return `<button class="card" onclick='investSheet(${JSON.stringify(i).replace(/'/g, '&#39;')})'><div class="row"><div><b>${esc(i.name)}</b><p class="mu">${name(i.kind)} · Invested ${inr(i.invested)}</p></div><div style="text-align:right"><b>${inr(i.current)}</b><p class="${gg >= 0 ? 'pos' : 'neg'} sm">${gg >= 0 ? '+' : '−'}${inr(Math.abs(gg))}${i.invested ? ` (${(gg / i.invested * 100).toFixed(1)}%)` : ''}</p></div></div></button>`; }).join('') || `<div class="empty">${logo(40, false)}<p style="margin-top:6px">Track stocks, mutual funds, SIPs, gold and more.</p></div>`}
  <button class="btn" onclick="investSheet()">Add investment</button>`;
}
function investSheet(i = {}) {
  formSheet(i.id ? esc(i.name) : 'Add investment', [{ k: 'name', l: 'Name', v: i.name, ph: 'e.g. Index fund' }, { k: 'kind', l: 'Type', t: 'seg', opts: INV_KINDS, v: i.kind || 'stocks' }, { k: 'invested', l: 'Invested (₹)', t: 'money', v: i.invested }, { k: 'current', l: 'Current value (₹)', t: 'money', v: i.current }],
    d => api('/investments', { method: 'POST', body: { ...d, id: i.id || null, date: i.date || today() } }));
  if (i.id) $('#sheet').insertAdjacentHTML('beforeend', `<button class="btn danger" onclick="ask('Delete this investment?','Delete',async()=>{await api('/investments/${i.id}',{method:'DELETE'});closeSheet();render()})">Delete</button>`);
}

const copyText = s => navigator.clipboard ? navigator.clipboard.writeText(s).then(() => toast('Copied ✓'), () => toast('Could not copy. Select the text instead.')) : toast('Could not copy. Select the text instead.');

/* ----- Settings ----- */
const MODES = ['light', 'dark', 'system'];
const setMode = k => { applyTheme(k); document.querySelectorAll('.modes button').forEach(b => b.classList.toggle('on', b.dataset.m === k)); };
const editName = () => formSheet('Your name', [{ k: 'name', l: 'Name', v: ME.name }], async d => { ME = await api('/settings', { method: 'POST', body: d }); });
const addRec = () => formSheet('Recurring payment', [{ k: 'name', l: 'Name', ph: 'e.g. Subscription or EMI' }, { k: 'amount', l: 'Amount', t: 'money' }, { k: 'date', l: 'First date (repeats on this day every month)', t: 'date', req: true },
  { k: 'kind', l: 'Type', t: 'seg', opts: [['subscription', 'Subscription'], ['emi', 'EMI']], v: 'subscription' }, { k: 'method', l: 'Paid by', t: 'seg', opts: [['upi', 'UPI'], ['cash', 'Cash']], v: 'upi' }],
  d => { if (!d.name || !(d.amount > 0)) throw new Error('Enter a name and amount'); return api('/recurring', { method: 'POST', body: d }); });
const delRec = id => ask('Stop this recurring payment?', 'Stop', async () => { await api('/recurring/' + id, { method: 'DELETE' }); render(); });
const setRemind = async d => { try { ME = await api('/settings', { method: 'POST', body: { remind_days: d } }); nativeSession(); toast(`We will warn you ${d} day${d > 1 ? 's' : ''} before`); } catch (e) { toast(e.message); } };
const offerTest = kind => openPop(`<div class="dlg"><p><b>${kind === 'email' ? 'Email reminders are on.' : 'Alerts are on.'}</b><br><span class="mu">Send yourself a test to make sure it reaches you?</span></p><div class="two2"><button class="btn ghost" onclick="closePop()">Not now</button><button class="btn" onclick="closePop();${kind === 'email' ? 'testEmail' : 'testAlert'}()">Send test</button></div></div>`);
async function testAlert() {
  if (NATIVE()) { FinoraApp.notify('Finora', 'This is a test. Your alerts are working.'); return toast('Test alert sent'); }
  if (!('Notification' in window)) return toast('This browser cannot show alerts'); if (Notification.permission !== 'granted' || localStorage.getItem('notif_off')) return toast('Turn on alerts first');
  const o = { body: 'This is a test. Your alerts are working.', icon: 'icon-192.png', tag: 'finora-test' };
  try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); reg ? await reg.showNotification('Finora', o) : new Notification('Finora', o); toast('Test alert sent'); } catch (e) { toast('Could not show the alert. Check your browser settings.'); } }
SWFN.notif = async on => { if (!('Notification' in window)) throw new Error('This browser cannot show alerts');
  if (on) { if (Notification.permission === 'default') await Notification.requestPermission(); if (Notification.permission !== 'granted') throw new Error('Alerts are blocked. Allow them in your browser’s site settings.'); localStorage.removeItem('notif_off'); toast('Alerts on'); setTimeout(() => offerTest('alert'), 350); }
  else { localStorage.setItem('notif_off', '1'); toast('Alerts off'); } };
SWFN.lock = () => { lockToggle(); };
function eraseSheet() {
  openSheet(`<h3>Erase all my entries</h3><p class="mu">This deletes every payment, card, person, loan, investment, reminder and limit. Your account stays, so you can start fresh. It cannot be undone.</p>
    <label>Type ERASE to confirm</label><input id="er-t" autocomplete="off" autocapitalize="characters" placeholder="ERASE"><button class="btn danger" id="er-ok" data-ok>Erase everything</button><button class="btn ghost" onclick="closeSheet()">Cancel</button>`);
  $('#er-ok').onclick = async () => { try { const r = await api('/data/clear', { method: 'POST', body: { confirm: $('#er-t').value } }); cards = []; PPL = []; closeSheet(); toast('Erased ' + r.erased + ' entries'); ME = await api('/me'); go('home'); } catch (e) { toast(e.message); } };
}
document.addEventListener('change', e => { if (e.target.id === 'rd') setRemind(+segVal('rd')); });

/* ----- navigation: built once, the pill slides ----- */
const views = { home, analytics, cards: cardsView, people: peopleView, invest: investView, budgets: budgetsView, settings: () => settingsView() };
const NAV = [['home', 'home', 'Home'], ['analytics', 'chart', 'Stats'], ['cards', 'card', 'Cards'], ['people', 'users', 'People'], ['invest', 'trend', 'Invest']];
const order = t => { const i = NAV.findIndex(n => n[0] === t); return i < 0 ? 9 : i; };
let prevTab = null;
const buildNav = () => { $('#nav').innerHTML = '<i class="pill"></i>' + NAV.map(([k, i, l]) => `<button data-t="${k}" onclick="go('${k}')" aria-label="${l}">${ic(i, 22)}<span>${l}</span></button>`).join(''); };
function syncNav() { const idx = NAV.findIndex(n => n[0] === tab), p = $('#nav .pill'); document.querySelectorAll('#nav button').forEach(x => x.classList.toggle('on', x.dataset.t === tab)); p.style.opacity = idx < 0 ? 0 : 1; if (idx >= 0) p.style.transform = `translateX(${idx * 100}%)`; }
function countUps() { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('#view [data-n]').forEach(el => { const to = +el.dataset.n || 0; if (!to) return; const t0 = performance.now(), D = 900; const f = t => { const k = Math.min((t - t0) / D, 1), e = 1 - Math.pow(1 - k, 4); el.textContent = inr(to * e); if (k < 1) requestAnimationFrame(f); else el.textContent = inr(to); }; requestAnimationFrame(f); }); }
async function render() {
  document.body.dataset.tab = tab; if (!$('#nav .pill')) buildNav(); syncNav(); $('#fab').innerHTML = ic('plus', 26); $('#finb').firstElementChild || ($('#finb').innerHTML = finFace(34));
  const v = $('#view'), t = tab; let html;
  try { html = await views[t](); } catch (e) { if (e.message === 'locked' || e.message === 'locked_history') { if (e.message === 'locked_history') { month = today().slice(0, 7); } return; } html = `<div class="empty">${logo(40, false)}<p style="margin-top:8px">${esc(e.message)}</p><button class="btn small" onclick="render()">Try again</button></div>`; }
  if (t !== tab) return; v.innerHTML = html;
  if (prevTab !== t) { const dir = prevTab === null ? '' : order(t) > order(prevTab) ? 'r' : 'l'; v.className = ''; void v.offsetWidth; v.className = 'enter ' + dir; countUps(); }
  prevTab = t;
}

/* Monthly report, built on this device. It opens a clean page and the print dialog; choose "Save as PDF" there. */
async function reportPrint(m) {
  m = m || month;
  let s, tx, ppl, inv, cds;
  try { [s, tx, ppl, inv, cds] = await Promise.all([api('/summary?month=' + m), api('/transactions?month=' + m + '&limit=500'), api('/people'), api('/investments'), api('/cards')]); }
  catch (e) { return toast(e.message); }
  const sh = x => (x.share != null ? x.share : x.amount), top = tx.filter(x => x.type === 'debit').sort((a, b) => sh(b) - sh(a)).slice(0, 15);
  const bars = (items, tot) => items.map(c => `<div class="br"><span>${esc(c.name)}</span><i><b style="width:${Math.max(pct(c.amt, tot), 1)}%"></b></i><em>${inr(c.amt)} · ${pct(c.amt, tot)}%</em></div>`).join('') || '<p class="mu">No spending this month.</p>';
  const mx = Math.max(...s.daily.map(d => d.amt), 1), W = 600, H = 70, st = W / s.daily.length;
  const daily = `<svg viewBox="0 0 ${W} ${H + 14}" width="100%">${s.daily.map((d, i) => `<rect x="${i * st + 1}" y="${H - Math.max(d.amt / mx * H, d.amt ? 2 : 1)}" width="${st - 2}" height="${Math.max(d.amt / mx * H, d.amt ? 2 : 1)}" fill="${d.amt ? '#111214' : '#e3e3df'}" rx="2"/>${[1, 8, 15, 22, s.daily.length].includes(d.d) ? `<text x="${i * st + st / 2}" y="${H + 12}" font-size="9" text-anchor="middle" fill="#6C7078">${d.d}</text>` : ''}`).join('')}</svg>`;
  const saved = s.income ? s.income - s.total : null, name = (ME && ME.name) || 'Finora user';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Finora report ${esc(m)}</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box;margin:0}body{font:13px/1.45 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111214;padding:22px;max-width:820px;margin:auto}
    h1{font-size:24px;letter-spacing:-.5px}h2{font-size:15px;margin:22px 0 8px;padding-bottom:5px;border-bottom:1px solid #e3e3df}.mu{color:#6C7078}.top{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px}
    .tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.t{border:1px solid #e3e3df;border-radius:10px;padding:10px 12px}.t b{display:block;font-size:19px;letter-spacing:-.4px;margin-top:2px}
    .br{display:grid;grid-template-columns:140px 1fr 130px;gap:10px;align-items:center;margin:5px 0}.br i{height:8px;background:#efefec;border-radius:4px;overflow:hidden}.br b{display:block;height:100%;background:#111214;border-radius:4px}.br em{font-style:normal;text-align:right;font-variant-numeric:tabular-nums}
    table{width:100%;border-collapse:collapse}td,th{padding:6px 4px;border-bottom:1px solid #efefec;text-align:left;vertical-align:top}th{font-size:11px;color:#6C7078;text-transform:uppercase;letter-spacing:.5px}td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}
    .pos{color:#0F7B5F}.neg{color:#C2412D}.bar{position:sticky;top:0;background:#fff;padding:8px 0 12px;display:flex;gap:10px;align-items:center}.bar button{font:inherit;font-weight:600;border:0;border-radius:10px;padding:10px 16px;background:#111214;color:#fff;cursor:pointer}
    .foot{margin-top:26px;padding-top:10px;border-top:1px solid #e3e3df;font-size:11px;color:#6C7078}.cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    @media print{.bar{display:none}body{padding:0}h2{break-after:avoid}tr,.t{break-inside:avoid}}@media(max-width:560px){.tiles{grid-template-columns:1fr 1fr}.br{grid-template-columns:100px 1fr 100px}.cols{grid-template-columns:1fr}}</style></head><body>
    <div class="bar"><button onclick="window.print()">Print / Save as PDF</button><span class="mu">Choose “Save as PDF” as the destination.</span></div>
    <div class="top"><div><h1>Finora · ${esc(monthName(m))}</h1><p class="mu">Prepared for ${esc(name)} on ${esc(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))}</p></div></div>
    <div class="tiles"><div class="t"><span class="mu">Spent</span><b>${inr(s.total)}</b></div><div class="t"><span class="mu">Last month</span><b>${inr(s.last)}</b></div><div class="t"><span class="mu">Money received</span><b>${inr(s.income)}</b></div><div class="t"><span class="mu">${saved === null ? 'Saved' : saved >= 0 ? 'Saved' : 'Over by'}</span><b class="${saved !== null && saved < 0 ? 'neg' : 'pos'}">${saved === null ? '—' : inr(Math.abs(saved))}</b></div></div>
    ${s.goal ? `<p class="mu" style="margin-top:8px">Monthly goal ${inr(s.goal)}: ${pct(s.total, s.goal)}% used.</p>` : ''}
    <h2>Spending by category</h2>${bars(s.categories, s.total)}
    <h2>Day by day</h2>${daily}
    <div class="cols"><div><h2>How you paid</h2>${bars(s.methods.map(x => ({ ...x, name: MNAME[x.name] || x.name })), s.total)}</div><div><h2>Top payees</h2>${bars(s.payees.slice(0, 6), s.total)}</div></div>
    <h2>Biggest payments</h2><table><tr><th>Date</th><th>Paid to</th><th>Category</th><th class="r">Amount</th></tr>${top.map(x => `<tr><td>${esc(fmtDate(x.txn_date))}</td><td>${esc(x.merchant || x.category)}${x.is_send ? ' (sent)' : ''}</td><td>${x.is_send ? 'Sent to a person' : esc(x.category)}</td><td class="r">${inr(sh(x))}</td></tr>`).join('') || '<tr><td colspan="4" class="mu">Nothing yet.</td></tr>'}</table>
    ${ppl.some(p => Math.abs(p.balance) >= .5) ? `<h2>People</h2><table><tr><th>Name</th><th class="r">Balance</th></tr>${ppl.filter(p => Math.abs(p.balance) >= .5).map(p => `<tr><td>${esc(p.name)}</td><td class="r ${p.balance > 0 ? 'pos' : 'neg'}">${p.balance > 0 ? 'owes you ' : 'you owe '}${inr(Math.abs(p.balance))}${p.interest > .5 ? ` (incl. ${inr(p.interest)} interest)` : ''}</td></tr>`).join('')}</table>` : ''}
    ${cds.length ? `<h2>Cards</h2><table><tr><th>Card</th><th class="r">This month</th><th class="r">Outstanding</th></tr>${cds.map(c => `<tr><td>${esc(c.name)}${c.last4 ? ' ••' + esc(c.last4) : ''}</td><td class="r">${inr(c.month_spent)}</td><td class="r">${c.kind === 'credit' ? inr(c.outstanding) : '—'}</td></tr>`).join('')}</table>` : ''}
    ${inv.length ? `<h2>Investments</h2><table><tr><th>Name</th><th class="r">Invested</th><th class="r">Current</th></tr>${inv.map(i => `<tr><td>${esc(i.name)}</td><td class="r">${inr(i.invested)}</td><td class="r">${inr(i.current)}</td></tr>`).join('')}</table>` : ''}
    <p class="foot">Made on your device by Finora from the entries you added. It is a personal summary, not a bank statement. Nothing was sent to any server.</p>
    <script>addEventListener('load',function(){setTimeout(function(){try{window.print()}catch(e){}},400)})<\/script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = `finora-report-${m}.html`; document.body.appendChild(a); a.click(); a.remove(); return toast('Pop-ups are blocked, so the report was downloaded. Open it and choose Print → Save as PDF'); }
  w.document.open(); w.document.write(html); w.document.close();
}

/* Quick add: double-tap (or double-click) any empty space and a small box opens. Type the amount, who it was for, Save. */
let QA = {}, QAOPEN = 0;
/* The second tap of a double-tap is still followed by the browser's own "click" for that tap. By then the popup is on top, so that click
   would land on its dark backdrop and close it again at once. Swallow any click that arrives in the first moments after it opens. */
document.addEventListener('click', e => { if (performance.now() - QAOPEN < 350 && e.target.closest && e.target.closest('#popw')) { e.stopPropagation(); e.preventDefault(); } }, true);

async function quickAdd(pre = {}) {
  if ($('#gate').classList.contains('show')) return;
  QA = { cat: '', touched: false, psug: null, pNo: '', t: 0 }; QAOPEN = performance.now();
  const m0 = pre.mode || 'spent';
  openPop(`<div class="qa"><div class="row" style="margin-bottom:12px"><h3 style="margin:0;display:flex;gap:7px;align-items:center">${ic("zap", 17)} Quick add</h3><button type="button" class="ib" onclick="closePop()" aria-label="Close">${ic('x', 18)}</button></div>
    ${seg('qa-mode', [['spent', 'Spent'], ['sent', 'Sent'], ['got', 'Got money']], m0, 'big')}
    <label>Amount</label>${amtField('qa-amt', pre.amount || '')}${amtChips('qa-amt')}
    <label id="qa-ml">Paid to</label><input id="qa-mer" value="${esc(pre.merchant || '')}" placeholder="Shop, app, rent…" autocomplete="off" maxlength="60"><div class="chips" id="qa-pay"></div>
    <div id="qa-sug"></div><div id="qa-pick"></div>
    <div id="qa-methw"><label>Paid by</label>${seg('qa-meth', METHODS, pre.method || 'upi')}</div>
    <button class="btn" id="qa-ok" data-ok>Save</button>
    <button type="button" class="lnk" id="qa-more" style="display:block;margin:12px auto 0">More options: date, note, split</button></div>`);
  const mode = () => segVal('qa-mode'), PH = { spent: ['Paid to', 'Shop, app, rent…'], sent: ['Sent to', 'Friend’s name'], got: ['From', 'Company or person'] };
  const drawSug = () => {
    const w = $('#qa-sug'); if (!w) return; const mer = $('#qa-mer').value.trim();
    if (mode() !== 'spent') { w.innerHTML = ''; return; }
    const p = QA.psug;
    if (p && p.person && p.for === mer.toLowerCase() && QA.pNo !== p.for && mer.length >= 3) {
      w.innerHTML = `<div class="sug"><span><span>${p.person_known ? esc(mer) + ' is in your People' : 'Looks like a person'}<small>Record this as money sent to ${esc(mer)}?</small></span></span><span class="sb"><button type="button" id="qa-py">Yes, sent</button><button type="button" class="q2" id="qa-pn">No</button></span></div>`;
      $('#qa-py').onclick = () => pickSeg('qa-mode', 'sent'); $('#qa-pn').onclick = () => { QA.pNo = p.for; drawSug(); }; return;
    }
    if (!QA.cat && mer.length < 2) { w.innerHTML = ''; return; }
    const c = QA.cat || 'Others';
    w.innerHTML = `<div class="sug"><span><i class="dot" style="background:${col(catIdx(c))}"></i><span>${esc(c)}<small>${QA.cat ? 'Goes under this category' : 'No match yet. We will file it under Others'}</small></span></span><button type="button" id="qa-chg">Change</button></div>`;
    $('#qa-chg').onclick = () => {
      $('#qa-pick').innerHTML = `<div class="catpick">${seg('qa-cat', CATS.filter(k => k !== 'Friends & Family').map(k => [k, k]), QA.cat || 'Others')}</div>`;
      $('#qa-cat').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { QA.cat = b.dataset.v === 'Others' ? '' : b.dataset.v; QA.touched = true; $('#qa-pick').innerHTML = ''; drawSug(); } });
    };
  };
  const drawChips = async () => {
    const k = mode(); let list = [];
    try {
      if (k === 'spent') list = (await api('/payees')).filter(p => !p.is_send).map(p => p.name);
      else { const ppl = (await api('/people')).map(p => p.name); list = k === 'sent' ? [...new Set([...(await api('/payees')).filter(p => p.is_send).map(p => p.name), ...ppl])] : ppl; }
    } catch (e) {}
    const w = $('#qa-pay'); if (w && k === mode()) w.innerHTML = list.slice(0, 6).map(n => `<button type="button" data-n="${esc(n)}">${esc(n)}</button>`).join('');
  };
  const drawMode = () => { const k = mode(); $('#qa-ml').textContent = PH[k][0]; $('#qa-mer').placeholder = PH[k][1]; $('#qa-methw').style.display = k === 'got' ? 'none' : ''; drawSug(); drawChips(); };
  $('#qa-mode').addEventListener('change', drawMode);
  $('#qa-pay').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('#qa-mer').value = b.dataset.n; $('#qa-mer').dispatchEvent(new Event('input')); (num('qa-amt') ? $('#qa-mer') : $('#qa-amt')).focus(); });
  $('#qa-mer').addEventListener('input', () => {
    clearTimeout(QA.t); drawSug();
    QA.t = setTimeout(async () => { const t = $('#qa-mer') && $('#qa-mer').value.trim(); if (!t || t.length < 2 || mode() !== 'spent') return;
      try { const r = await api('/suggest?text=' + encodeURIComponent(t)); if (!$('#qa-mer') || $('#qa-mer').value.trim() !== t || mode() !== 'spent') return; QA.psug = { ...r, for: t.toLowerCase() }; if (!QA.touched) QA.cat = r.known ? r.category : ''; drawSug(); } catch (e) {} }, 140);
  });
  const read = () => { const k = mode(); return { k, amount: num('qa-amt'), who: $('#qa-mer').value.trim(), method: k === 'got' ? 'upi' : segVal('qa-meth') }; };
  $('#qa-more').onclick = () => { const r = read(); closePop();
    setTimeout(() => txSheet({ amount: r.amount || '', merchant: r.who, method: r.method, ...(r.k === 'sent' ? { is_send: true } : r.k === 'got' ? { type: 'credit' } : { category: QA.cat }) }), 230); };
  $('#qa-ok').onclick = async () => {
    const r = read(); if (!(r.amount > 0)) { toast('Enter an amount'); return $('#qa-amt').focus(); }
    if (r.k === 'sent' && !r.who) { toast('Who did you send it to?'); return $('#qa-mer').focus(); }
    const body = { amount: r.amount, merchant: r.who, method: r.method, txn_date: nowLocal(), ...(r.k === 'got' ? { type: 'credit' } : r.k === 'sent' ? { type: 'debit', is_send: true } : { type: 'debit', category: QA.cat }) };
    const b = $('#qa-ok'); b.disabled = true;
    try { await api('/transactions', { method: 'POST', body }); closePop(); toast(`${r.k === 'got' ? 'Received' : 'Saved'} ${inr(r.amount)}${r.who ? ' · ' + r.who : ''} ✓`); if (typeof render === 'function') render(); }
    catch (e) { toast(e.message); b.disabled = false; }
  };
  drawMode();
  setTimeout(() => { const a = $('#qa-amt'); if (a && !a.value) a.focus(); else if (a) $('#qa-mer').focus(); }, 60);
}

/* ----- the gesture itself -----
   Two quick taps (or clicks) in nearly the same spot, on empty space only. Buttons, cards, inputs, charts and anything else that already
   does something are ignored, and so are swipes, long presses and scrolls, so normal use never opens it by accident. */
(() => {
  const SKIP = 'button,a,input,textarea,select,label,summary,video,[onclick],[data-tip],[role=button],[role=switch],.sw,.seg,.chips,nav,#nav,.fab,.finb,#toast,#tip,#gate,#overlay,#popw';
  let down = null, last = null;
  const ready = () => !!$('#view') && !$('#gate').classList.contains('show') && !$('#overlay').classList.contains('show') && !$('#popw').classList.contains('show') && !!ME && !!ME.setup;
  const dot = (x, y) => { const d = document.createElement('i'); d.className = 'ripple'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 800); };
  addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: Date.now(), skip: !!(e.target.closest && e.target.closest(SKIP)) }; }, true);
  addEventListener('pointercancel', () => { down = null; last = null; }, true);
  addEventListener('pointerup', e => {
    const d = down; down = null; if (!d || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (d.skip || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12 || Date.now() - d.t > 450 || !ready()) { last = null; return; }
    const now = Date.now();
    if (last && now - last.t < 400 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 44) {
      last = null; try { getSelection().removeAllRanges(); } catch (x) {} dot(e.clientX, e.clientY); quickAdd();
    } else last = { t: now, x: e.clientX, y: e.clientY };
  }, true);
  addEventListener('scroll', () => { last = null; }, { passive: true, capture: true });
})();

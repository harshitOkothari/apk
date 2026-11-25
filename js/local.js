/* Finora on-device engine.
   This file replaces the old server. Every number, chart and reminder is worked out here, in your browser, and saved only in this
   browser's own storage (localStorage). Nothing is sent anywhere: there is no server, no account and no database. */
const Local = (() => {
  'use strict';
  const KEY = 'finora.db.v1';
  const CATEGORIES = ['Food & Dining', 'Shopping', 'Travel', 'Utilities', 'Bills & EMI', 'Health', 'Entertainment', 'Education', 'Friends & Family', 'Others'];
  const SEND_CAT = 'Friends & Family';
  const FREE_MONTHS = 3;                                   // kept only for the tiny "last 3 months" chart; nothing is locked any more
  const E = (code, msg) => { const e = new Error(msg); e.code = code; return e; };

  /* ---------- dates ---------- */
  const p2 = n => String(n).padStart(2, '0');
  const isoDate = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const today = () => isoDate(new Date());
  const nowM = () => today().slice(0, 7);
  const nowMin = () => { const n = new Date(); return `${isoDate(n)}T${p2(n.getHours())}:${p2(n.getMinutes())}`; };
  const dnum = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
  const fromNum = n => { const d = new Date(n * 864e5); return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`; };
  const shift = (m, n) => { const [y, mo] = m.split('-').map(Number), k = y * 12 + mo - 1 + n; return `${Math.floor(k / 12)}-${p2(k % 12 + 1)}`; };
  const rng = m => [`${m}-01`, `${shift(m, 1)}-01`];
  const dim = (y, m) => new Date(y, m, 0).getDate();      // m is 1-based
  function validDate(v, allowFuture = true) {
    const s = String(v || '').slice(0, 10), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) throw E(422, 'That is not a valid date');
    const y = +m[1], mo = +m[2], d = +m[3], t = new Date(y, mo - 1, d);
    if (t.getFullYear() !== y || t.getMonth() !== mo - 1 || t.getDate() !== d) throw E(422, 'That is not a valid date');
    if (!allowFuture && dnum(s) > dnum(today()) + 1) throw E(422, 'Future dates are not allowed');
    return s;
  }
  const addMonths = (iso, k) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number), n = y * 12 + m - 1 + k, yy = Math.floor(n / 12), mm = n % 12 + 1; return `${yy}-${p2(mm)}-${p2(Math.min(d, dim(yy, mm)))}`; };

  /* ---------- text helpers (port of sms_parser.py) ---------- */
  const KEYWORDS = {
    'Food & Dining': 'food foods eat eating lunch dinner breakfast brunch snack snacks tea coffee chai biryani thali maggi momos paratha pizza burger juice shake icecream sweets mithai restaurant cafe canteen mess tiffin dhaba bakery zomato swiggy domino dominos mcdonald mcdonalds kfc subway starbucks chaayos haldiram blinkit zepto bigbasket instamart dunzo grocery groceries kirana vegetable vegetables sabzi fruit fruits milk dairy',
    'Shopping': 'shopping clothes clothing shirt jeans shoes sandals gift amazon flipkart myntra ajio meesho nykaa reliance dmart mall croma decathlon lenskart zudio westside ikea electronics accessories',
    'Travel': 'travel cab taxi auto rickshaw bus train metro flight ticket tickets petrol diesel fuel parking toll fastag uber ola rapido irctc redbus makemytrip goibibo ixigo cleartrip indigo akasa yulu hotel trip',
    'Utilities': 'electricity current recharge wifi broadband internet fibernet gas cylinder water dth jio airtel vodafone vi bsnl jvvnl tata',
    'Bills & EMI': 'emi loan insurance lic rent premium installment subscription bill',
    'Health': 'medicine medicines medical doctor hospital clinic pharmacy pharmeasy netmeds apollo medplus 1mg diagnostic dental dentist gym cult lab checkup',
    'Entertainment': 'movie movies film cinema netflix spotify hotstar prime youtube bookmyshow pvr inox zee5 sonyliv jiocinema steam game games gaming party concert club ott',
    'Education': 'fees fee tuition course courses book books exam college school jecrc udemy coursera unacademy byju physics wallah vedantu stationery xerox printout notes',
  };
  const reEsc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const RX = {};
  for (const [c, v] of Object.entries(KEYWORDS)) { const w = [...new Set(v.split(/\s+/).filter(Boolean))].sort((a, b) => b.length - a.length); RX[c] = new RegExp('\\b(?:' + w.map(reEsc).join('|') + ')(?:s|es)?\\b', 'i'); }
  const AMT = /(?:rs\.?|inr|₹)\s?([\d,]+(?:\.\d{1,2})?)/gi;
  const BALCTX = /(avl|bal|balance|available|limit)\W*(?:\w+\W+){0,2}$/i;
  const DEBIT = /debited|spent|paid|sent|withdrawn|purchase|payment of|transferred/i;
  const CREDIT = /credited|received|refund|cashback|deposited/i;
  const LAST4 = /(?:a\/c|acct|account|card|xx|ending|x)\D{0,6}(\d{4})\b/i;
  const MERCH = [
    /\b(?:UPI|IMPS|NEFT)[/\-]\d+[/\-]([A-Za-z][A-Za-z0-9 .&_@]{1,30}?)(?:[/\-]|\s{2,}|$)/i,
    /\b(?:info:?|vpa)\s+(?:UPI[-/])?([A-Za-z][A-Za-z0-9 .&_@-]{2,30}?)(?=\s+(?:on|ref|via|upi|using|avl|bal|txn)\b|[.,;(]|$)/i,
    /\b(?:to|at|from)\s+(?:VPA\s+)?([A-Za-z0-9][A-Za-z0-9 .&_@-]{2,30}?)(?=\s+(?:on|ref|via|upi|using|avl|bal|txn|for)\b|[.,;(]|$)/i,
  ];
  const BAD = /^(a\/c|acct|account|your|the|card|xx|bank|you)\b/i;
  const NOISE = /\b(ltd|pvt|private|limited|india|ref|upi)\b\.?/gi;
  const BIZ = /\b(store|stores|mart|shop|pvt|ltd|llp|services?|enterprises?|traders?|trading|hotel|restaurant|cafe|bakery|medical|pharmacy|general|centre|center|clinic|hospital|school|college|bank|petrol|pump|recharge|salon|parlou?r|gym|mess|bill|rent|emi|fees?|insurance|agency|corp|company|india|online|app|pay|wallet|mobile|electric\w*|tech\w*)\b/i;
  const isLower = s => s !== '' && s === s.toLowerCase() && s !== s.toUpperCase();
  const isUpper = s => s !== '' && s === s.toUpperCase() && s !== s.toLowerCase();
  const titleCase = s => s.toLowerCase().replace(/(^|[^a-z])([a-z])/g, (m, a, b) => a + b.toUpperCase());

  function categorize(text, rules) {
    const t = (text || '').toLowerCase();
    for (const [kw, cat] of Object.entries(rules || {})) if (kw && t.includes(kw)) return cat;     // what you taught us wins
    for (const [cat, rx] of Object.entries(RX)) if (rx.test(t)) return cat;
    return 'Others';
  }
  function tidyName(raw) {
    let s = (raw || '').split('@')[0].trim();
    if (/^[\d\s+-]{6,}$/.test(s)) return '';
    s = s.replace(/[._]+/g, ' ').replace(NOISE, '').trim().replace(/^[ \-/]+|[ \-/]+$/g, '').replace(/\s+/g, ' ');
    return s && (isLower(s) || isUpper(s)) ? titleCase(s) : s;
  }
  function looksPerson(name, category = 'Others') {
    const words = (name || '').split(/\s+/).filter(Boolean);
    return category === 'Others' && words.length >= 1 && words.length <= 3 && words.every(w => /^\p{L}+$/u.test(w) && w.length >= 2) && (name || '').length >= 3 && !BIZ.test(name);
  }
  function parseSms(text, rules) {
    text = text || '';
    let m = null;
    for (const x of text.matchAll(AMT)) { if (!BALCTX.test(text.slice(Math.max(0, x.index - 25), x.index))) { m = x; break; } }
    if (!m) return null;
    const credit = CREDIT.test(text) && !DEBIT.test(text), low = text.toLowerCase(), atm = low.includes('atm') || low.includes('withdrawn');
    const method = low.includes('credit card') ? 'credit' : (low.includes('debit card') || atm) ? 'debit' : (low.includes('upi') || low.includes('vpa')) ? 'upi' : low.includes('card') ? 'debit' : 'upi';
    let merchant = '';
    for (const rx of MERCH) { const mm = rx.exec(text); if (mm && !BAD.test(mm[1].trim())) { merchant = tidyName(mm[1]); if (merchant) break; } }
    if (atm) merchant = 'ATM withdrawal';
    const l4 = LAST4.exec(text);
    let cat = categorize(merchant ? `${merchant} ${text}` : text, rules);
    if (cat !== 'Others' && merchant === '') cat = categorize(text, rules);
    return { amount: parseFloat(m[1].replace(/,/g, '')), type: credit ? 'credit' : 'debit', merchant, method, last4: l4 ? l4[1] : null, category: cat,
      person_hint: method === 'upi' && !credit && looksPerson(merchant, cat) };
  }

  /* ---------- storage: this browser only ---------- */
  const fresh = () => ({ v: 1, n: 1, user: { name: '', goal: 0, remind_days: 3, device: '', setup: false, created: new Date().toISOString(), lastBackup: null },
    cards: [], transactions: [], card_payments: [], budgets: [], recurring: [], rules: {}, people: [], ledger: [], investments: [], reminders: [] });
  let D = fresh(), mem = false, warned = false;
  function adopt(d) { const f = fresh(); D = Object.assign(f, d); D.user = Object.assign(fresh().user, (d && d.user) || {}); for (const k of Object.keys(f)) if (Array.isArray(f[k]) && !Array.isArray(D[k])) D[k] = []; if (!D.rules || typeof D.rules !== 'object') D.rules = {}; }
  function load() { try { const raw = localStorage.getItem(KEY); if (raw) { adopt(JSON.parse(raw)); return; } } catch (e) { mem = true; } D = fresh(); }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(D)); }
    catch (e) { if (!warned) { warned = true; try { window.toast && window.toast('This browser blocked storage, so changes may not be kept. Download a backup.'); } catch (x) {} } }
  }
  const nid = () => D.n++;
  const rules = () => D.rules;
  const sh = t => (t.share != null ? t.share : t.amount);                 // my own share of a payment
  const confirmed = t => t.status === 'confirmed';
  const sum = (l, f) => l.reduce((a, x) => a + f(x), 0);
  const round2 = x => Math.round((x + Number.EPSILON) * 100) / 100;

  /* ---------- profile ---------- */
  const pubUser = () => ({ id: 1, name: D.user.name, plan: 'device', goal: +D.user.goal || 0, device: D.user.device, remind_days: D.user.remind_days, oldest: '0000-00', setup: !!D.user.setup, last_backup: D.user.lastBackup, free_months: FREE_MONTHS });
  function updateSettings(b) {
    if ('name' in b) D.user.name = String(b.name || '').trim().slice(0, 40);
    if ('goal' in b) D.user.goal = Math.max(parseFloat(b.goal) || 0, 0);
    if ('remind_days' in b) D.user.remind_days = Math.min(Math.max(parseInt(b.remind_days, 10) || 0, 0), 14);
    if ('device' in b) D.user.device = String(b.device || '');
    if ('setup' in b) D.user.setup = !!b.setup;
    return pubUser();
  }

  /* ---------- suggestions ---------- */
  function suggest(text) {
    const t = (text || '').trim(), cat = categorize(t, rules()), low = t.toLowerCase();
    const mine = !!t && (D.people.some(p => p.name.toLowerCase() === low) || D.transactions.some(x => x.is_send && (x.merchant || '').toLowerCase() === low));
    return { category: cat, known: cat !== 'Others', person: mine || looksPerson(t, cat), person_known: mine };
  }
  function recentPayees(n = 6) {
    const best = new Map();
    for (const t of D.transactions) { if (!t.merchant || !confirmed(t) || t.type !== 'debit') continue;
      const k = `${t.merchant}\u0000${t.category}\u0000${t.is_send ? 1 : 0}`, cur = best.get(k);
      if (!cur || t.txn_date > cur.d) best.set(k, { name: t.merchant, category: t.category, is_send: t.is_send ? 1 : 0, d: t.txn_date }); }
    const rows = [...best.values()].sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0)).slice(0, 40), seen = new Set(), out = [];
    for (const r of rows) { const k = r.name.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push({ name: r.name, category: r.category, is_send: r.is_send }); } }
    return out.slice(0, n);
  }

  /* ---------- transactions ---------- */
  function cardFor(method, card_id) {
    if (method !== 'credit' && method !== 'debit') return null;
    if (card_id && D.cards.some(c => c.id === card_id && c.kind === method)) return card_id;
    const mine = D.cards.filter(c => c.kind === method).sort((a, b) => a.id - b.id);
    if (mine.length) return mine[0].id;
    const c = { id: nid(), name: `${method[0].toUpperCase()}${method.slice(1)} card`, kind: method, last4: '', credit_limit: 0, due_day: null, due_date: null };
    D.cards.push(c); return c.id;
  }
  function clean(t) {
    const amount = parseFloat(t.amount) || 0, type = t.type || 'debit', method = t.method || 'upi';
    if (!(amount > 0) || amount > 1e9 || !['debit', 'credit'].includes(type) || !['upi', 'cash', 'credit', 'debit'].includes(method)) throw E(422, 'Check the amount and payment method');
    const date = t.txn_date || nowMin(); validDate(date, false);
    let merchant = String(t.merchant || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (isLower(merchant) || isUpper(merchant)) merchant = titleCase(merchant);
    const is_send = t.is_send && type === 'debit' ? 1 : 0;
    const cat = is_send ? SEND_CAT : (CATEGORIES.includes(t.category) && t.category !== 'Others' ? t.category : categorize(merchant, rules()));
    if (merchant && cat !== 'Others' && !is_send) D.rules[merchant.toLowerCase()] = cat;     // learn from your choice
    return { amount, type, merchant, category: cat, method, card_id: cardFor(method, t.card_id), txn_date: date.length === 10 ? date + 'T12:00' : date, note: String(t.note || '').slice(0, 200), is_send };
  }
  function addTxn(t) { const c = clean(t), id = nid(); D.transactions.push({ id, ...c, source: 'manual', status: 'confirmed', raw_sms: null, share: null }); return { id }; }
  function confirmTxn(id, t) {
    const x = D.transactions.find(r => r.id === id); if (!x) throw E(404, 'Not found');
    Object.assign(x, clean(t), { status: 'confirmed' }); return { ok: true };
  }
  function listTxns(q) {
    let l = D.transactions.filter(confirmed);
    if (q.month) { if (!/^\d{4}-\d{2}$/.test(q.month)) throw E(422, 'Bad month'); const [a, b] = rng(q.month); l = l.filter(t => t.txn_date >= a && t.txn_date < b); }
    if (q.card_id) l = l.filter(t => t.card_id === +q.card_id);
    if (q.category) l = l.filter(t => t.category === q.category && t.type === 'debit');
    if (q.payee) l = l.filter(t => (t.merchant || '').toLowerCase() === q.payee.toLowerCase());
    if (q.method) l = l.filter(t => t.method === q.method && t.type === 'debit');
    l.sort((a, b) => (a.txn_date < b.txn_date ? 1 : a.txn_date > b.txn_date ? -1 : b.id - a.id));
    return l.slice(0, Math.min(parseInt(q.limit, 10) || 50, 500));
  }
  function delTxn(id) { D.ledger = D.ledger.filter(l => !(l.txn_id === id && l.kind === 'split')); D.transactions = D.transactions.filter(t => t.id !== id); return { ok: true }; }
  function splitTxn(id, b) {
    const t = D.transactions.find(x => x.id === id), names = [], seen = new Set();
    for (const n0 of b.people || []) { const n = String(n0).replace(/\s+/g, ' ').trim(); if (n && !seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); names.push(n); } }
    if (!t || !names.length || t.share != null || t.type !== 'debit') throw E(422, 'This cannot be split');
    const n = names.length + (b.include_me === false ? 0 : 1), each = round2(t.amount / n);
    for (const nm of names) D.ledger.push({ id: nid(), person_id: personId(nm), kind: 'split', amount: each, date: t.txn_date.slice(0, 10), note: t.merchant || t.category, txn_id: id, rate: 0, rate_unit: 'month', due: null, emi: 0, emi_first: null });
    t.share = round2(t.amount - each * names.length); return { each };
  }

  /* ---------- cards ---------- */
  function nextDue(day) {
    const t = new Date(), td = dnum(today());
    for (const add of [0, 1]) { const k = t.getFullYear() * 12 + t.getMonth() + add, y = Math.floor(k / 12), mo = k % 12 + 1, d = `${y}-${p2(mo)}-${p2(Math.min(day, dim(y, mo)))}`; if (dnum(d) >= td) return d; }
  }
  function cardStats(c) {
    const [a, b] = rng(nowM()), mine = D.transactions.filter(t => t.card_id === c.id && t.type === 'debit' && confirmed(t));
    const spent = sum(mine, t => t.amount), paid = sum(D.card_payments.filter(p => p.card_id === c.id), p => p.amount), month = sum(mine.filter(t => t.txn_date >= a && t.txn_date < b), t => t.amount);
    const out = Math.max(spent - paid, 0), due = c.due_day ? nextDue(c.due_day) : null;
    return { ...c, month_spent: month, outstanding: out, available: c.credit_limit ? Math.max(c.credit_limit - out, 0) : null, due_date: due, days_left: due ? dnum(due) - dnum(today()) : null };
  }
  const cards = () => [...D.cards].sort((a, b) => (a.kind < b.kind ? 1 : a.kind > b.kind ? -1 : a.id - b.id)).map(cardStats);
  function saveCard(c, cid) {
    const name = String(c.name || '').trim().slice(0, 40), kind = c.kind || 'credit', last4 = String(c.last4 || '').replace(/\D/g, '');
    if (!['credit', 'debit'].includes(kind) || !name) throw E(422, 'Give the card a name');
    if (last4 && last4.length !== 4) throw E(422, 'Enter exactly 4 digits');
    const due_day = c.due_date ? +validDate(c.due_date).slice(8, 10) : null, row = { name, kind, last4, credit_limit: parseFloat(c.credit_limit) || 0, due_day, due_date: c.due_date || null };
    if (cid) { const x = D.cards.find(k => k.id === cid); if (x) Object.assign(x, row); return { id: cid }; }
    const id = nid(); D.cards.push({ id, ...row }); return { id };
  }
  function delCard(cid) { D.transactions.forEach(t => { if (t.card_id === cid) t.card_id = null; }); D.card_payments = D.card_payments.filter(p => p.card_id !== cid); D.cards = D.cards.filter(c => c.id !== cid); return { ok: true }; }
  function payCard(cid, p) {
    const amt = parseFloat(p.amount) || 0, on = p.paid_on || today(); validDate(on, false);
    if (!(amt > 0) || !D.cards.some(c => c.id === cid)) throw E(422, 'Check the amount');
    const id = nid(); D.card_payments.push({ id, card_id: cid, amount: amt, paid_on: on, note: String(p.note || '').slice(0, 100) }); return { id };
  }

  /* ---------- paste a bank SMS ---------- */
  function parseFor(text) {
    const p = parseSms(text, rules()); if (!p) throw E(422, 'No amount found in that message');
    if ((p.method === 'credit' || p.method === 'debit') && p.last4) { const c = D.cards.find(k => k.last4 === p.last4); p.card_id = c ? c.id : null; }
    return p;
  }

  /* ---------- people: lend, send, split, repay (with optional interest) ---------- */
  function personId(name) {
    name = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 40); if (!name) throw E(422, 'Enter a name');
    const r = D.people.find(p => p.name.toLowerCase() === name.toLowerCase()); if (r) return r.id;
    const id = nid(); D.people.push({ id, name }); return id;
  }
  function calc(rows, on) {
    const end = dnum(on || today()), loans = []; let credit = 0;
    const advance = d => { for (const l of loans) { if (l.p > 0 && d > l.last) l.i += l.p * l.rpd * (d - l.last); l.last = Math.max(l.last, d); } };
    const pay = x => { for (const l of loans) for (const f of ['i', 'p']) { const u = Math.min(x, l[f]); l[f] -= u; x -= u; } credit += x; };
    for (const e of [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id))) {
      const d = dnum(e.date); advance(d);
      if (e.kind === 'received' || e.kind === 'borrowed') pay(e.amount);
      else {
        const rate = e.kind === 'lent' ? parseFloat(e.rate) || 0 : 0, rpd = rate / 100 / (e.rate_unit === 'month' ? 30 : 365);
        const loan = { p: e.amount, i: 0, rpd, last: d, due: e.kind === 'lent' ? e.due || null : null };
        if (credit > 0) { const u = Math.min(credit, loan.p); loan.p -= u; credit -= u; }
        loans.push(loan);
      }
    }
    advance(end);
    const p = sum(loans, l => l.p), i = sum(loans, l => l.i), dues = loans.filter(l => l.p > 0.5 && l.due).map(l => l.due).sort();
    return { principal: round2(p), interest: round2(i), balance: round2(p + i - credit), due: dues.length ? dues[0] : null };
  }
  function nextEmi(rows) {
    const plans = rows.filter(r => r.kind === 'lent' && (r.emi || 0) > 0 && r.emi_first);
    if (!plans.length) return [0, null];
    const emi = sum(plans, r => r.emi), first = plans.map(r => r.emi_first.slice(0, 10)).sort()[0], paid = sum(rows.filter(r => r.kind === 'received'), r => r.amount);
    return [emi, addMonths(first, Math.floor(paid / emi))];
  }
  function people() {
    return [...D.people].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).map(p => {
      const rows = D.ledger.filter(l => l.person_id === p.id), [emi, nxt] = nextEmi(rows), c = calc(rows);
      return { ...p, ...c, emi, emi_next: c.balance > 0.5 ? nxt : null, last: rows.reduce((m, r) => (m === null || r.date > m ? r.date : m), null), n: rows.length };
    });
  }
  const ledger = pid => D.ledger.filter(l => l.person_id === pid).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
  function addLedger(e) {
    const kind = e.kind, amt = parseFloat(e.amount) || 0, date = e.date || today(); validDate(date, false);
    if (!['lent', 'split', 'received', 'borrowed', 'paid_back'].includes(kind) || !(amt > 0)) throw E(422, 'Check the amount');
    let due = e.due || null; if (due) validDate(due);
    const rate = kind === 'lent' ? Math.max(parseFloat(e.rate) || 0, 0) : 0, unit = e.rate_unit === 'year' ? 'year' : 'month', emi = kind === 'lent' ? Math.max(parseFloat(e.emi) || 0, 0) : 0;
    let emi_first = null;
    if (emi) { if (!e.emi_first) throw E(422, 'Enter the date of the first monthly payment'); emi_first = validDate(e.emi_first); due = null; }
    const pid = personId(e.person), id = nid();
    D.ledger.push({ id, person_id: pid, kind, amount: amt, date, note: String(e.note || '').slice(0, 100), txn_id: null, rate, rate_unit: unit, due, emi, emi_first }); return { id };
  }

  /* ---------- investments, limits, recurring ---------- */
  const investments = () => [...D.investments].sort((a, b) => b.invested - a.invested);
  function saveInv(i) {
    const inv = parseFloat(i.invested) || 0, cur = parseFloat(i.current) || 0, name = String(i.name || '').trim().slice(0, 60);
    if (inv < 0 || cur < 0 || !name) throw E(422, 'Check the details');
    const kind = i.kind || 'stocks';
    if (i.id) { const x = D.investments.find(k => k.id === i.id); if (x) Object.assign(x, { name, kind, invested: inv, current: cur, date: i.date }); return { id: i.id }; }
    const id = nid(); D.investments.push({ id, name, kind, invested: inv, current: cur, date: i.date || today() }); return { id };
  }
  function budgets(m) {
    const [a, b] = rng(m), sp = {};
    for (const t of D.transactions) if (t.type === 'debit' && confirmed(t) && t.txn_date >= a && t.txn_date < b) sp[t.category] = (sp[t.category] || 0) + sh(t);
    const lim = Object.fromEntries(D.budgets.map(x => [x.category, x.monthly_limit]));
    return CATEGORIES.filter(c => c !== SEND_CAT).map(c => ({ category: c, limit: lim[c] ?? null, spent: sp[c] || 0 }));
  }
  function setBudget(b) {
    if (!CATEGORIES.includes(b.category)) throw E(422, 'Unknown category');
    const lim = parseFloat(b.monthly_limit) || 0; D.budgets = D.budgets.filter(x => x.category !== b.category);
    if (lim > 0) D.budgets.push({ category: b.category, monthly_limit: lim }); return { ok: true };
  }
  function postRecurring() {
    const t = new Date(), m = nowM(), [a, b] = rng(m); let changed = false;
    for (const r of D.recurring.filter(x => x.active)) {
      const day = Math.min(r.day_of_month, dim(t.getFullYear(), t.getMonth() + 1));
      if (day > t.getDate() || D.transactions.some(x => x.source === 'recurring' && x.merchant === r.name && x.txn_date >= a && x.txn_date < b)) continue;
      D.transactions.push({ id: nid(), amount: r.amount, type: 'debit', merchant: r.name, category: r.category, method: r.method, card_id: r.card_id || null, txn_date: `${m}-${p2(day)}T09:00`, note: '', source: 'recurring', status: 'confirmed', raw_sms: null, share: null, is_send: 0 }); changed = true;
    }
    if (changed) save();
  }
  function addRecurring(r) {
    const name = String(r.name || '').trim().slice(0, 40), amt = parseFloat(r.amount) || 0, day = r.date ? +validDate(r.date).slice(8, 10) : parseInt(r.day_of_month, 10) || 0;
    if (!name || !(amt > 0) || day < 1 || day > 31) throw E(422, 'Check the details');
    const cat = CATEGORIES.includes(r.category) ? r.category : categorize(name, rules()), id = nid();
    D.recurring.push({ id, name, amount: amt, category: cat, method: ['upi', 'cash'].includes(r.method) ? r.method : 'upi', card_id: null, day_of_month: day, kind: r.kind || 'subscription', active: 1 });
    postRecurring(); return { id };
  }

  /* ---------- reminders and alerts ---------- */
  const reminders = () => D.reminders.filter(r => !r.done).sort((a, b) => (a.remind_on < b.remind_on ? -1 : a.remind_on > b.remind_on ? 1 : 0));
  function addReminder(r) {
    const title = String(r.title || '').trim().slice(0, 80); if (!title) throw E(422, 'What should we remind you about?');
    const d = validDate(r.remind_on); if (d < today()) throw E(422, 'Pick today or a future date');
    const id = nid(); D.reminders.push({ id, title, remind_on: d, amount: parseFloat(r.amount) || 0, done: 0 }); return { id };
  }
  function alerts(horizon = 7) {
    const out = [], t = dnum(today());
    for (const c of cards()) if (c.kind === 'credit' && c.outstanding > 0 && c.days_left !== null && c.days_left <= horizon) out.push({ kind: 'card', ref: c.id, title: `${c.name} bill`, amount: c.outstanding, date: c.due_date, days: c.days_left });
    for (const p of people()) {
      if (p.balance <= 0.5) continue;
      const opts = [];
      if (p.emi_next) opts.push([p.emi_next, `${p.name}: monthly payment`, Math.min(p.emi, p.balance)]);
      if (p.due) opts.push([p.due, `${p.name} to pay you back`, p.balance]);
      if (opts.length) { opts.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] < y[1] ? -1 : 1)); const [w, title, amt] = opts[0], days = dnum(w) - t; if (days <= horizon) out.push({ kind: 'lend', ref: p.id, title, amount: amt, date: w, days }); }
    }
    for (const r of reminders()) { const days = dnum(r.remind_on) - t; if (days <= horizon) out.push({ kind: 'custom', ref: r.id, title: r.title, amount: r.amount, date: r.remind_on, days }); }
    return out.sort((a, b) => a.days - b.days);
  }

  /* ---------- summary and smart notes ---------- */
  const inr = v => '₹' + Math.round(v).toLocaleString('en-IN');
  function insights(m, total, cats, prevcats) {
    const out = [], add = (level, text) => out.push({ level, text }), t = new Date();
    for (const c of cats) { const p = prevcats[c.name] || 0; if (p > 0 && c.amt > p * 1.3 && c.amt - p > 500) add('warn', `${c.name} is up ${Math.round((c.amt / p - 1) * 100)}% vs last month (${inr(c.amt)} vs ${inr(p)})`); }
    for (const b of budgets(m)) if (b.limit && b.spent >= b.limit * 0.8) add('warn', `${b.category} limit ${b.spent >= b.limit ? 'crossed' : 'is 80% used'}: ${inr(b.spent)} / ${inr(b.limit)}`);
    const [a, e] = rng(m); let unusual = 0;
    const top = D.transactions.filter(x => x.type === 'debit' && confirmed(x) && x.txn_date >= a && x.txn_date < e).sort((x, y) => sh(y) - sh(x)).slice(0, 20);
    for (const tx of top) {
      const hist = D.transactions.filter(x => x.type === 'debit' && confirmed(x) && x.category === tx.category && x.id !== tx.id).map(x => x.amount);
      if (hist.length >= 5 && unusual < 2) { const mean = sum(hist, x => x) / hist.length, sd = Math.sqrt(sum(hist, x => (x - mean) ** 2) / hist.length);
        if (tx.amount > mean + 2 * sd) { unusual++; add('warn', `Unusual: ${inr(tx.amount)} at ${tx.merchant || tx.category} is far above your normal ${tx.category} spend`); } }
    }
    for (const al of alerts(5)) if (al.kind === 'card') add('warn', `${al.title} ${inr(al.amount)} is due in ${al.days} days`);
    const nOth = D.transactions.filter(x => x.type === 'debit' && confirmed(x) && x.category === 'Others' && x.txn_date >= a && x.txn_date < e).length;
    if (nOth >= 3) add('info', `${nOth} payments are in 'Others'. Tap Others in the chart to sort them.`);
    if (m === nowM() && total && t.getDate() >= 3) add('info', `At this pace you will spend about ${inr(total / t.getDate() * dim(t.getFullYear(), t.getMonth() + 1))} by month end`);
    return out;
  }
  function group(list, keyf, extra) {
    const g = new Map();
    for (const t of list) { const k = keyf(t), x = g.get(k) || { name: null, amt: 0, n: 0, mx: 0, is_send: 0 }; const v = sh(t); x.amt += v; x.n++; x.mx = Math.max(x.mx, v); x.is_send = Math.max(x.is_send, t.is_send ? 1 : 0); if (extra) extra(x, t); g.set(k, x); }
    return [...g.entries()];
  }
  function summary(month) {
    const m = month || nowM(); if (!/^\d{4}-\d{2}$/.test(m)) throw E(422, 'Bad month');
    const [a, b] = rng(m), [pa, pb] = rng(shift(m, -1)), debit = D.transactions.filter(t => t.type === 'debit' && confirmed(t));
    const inRange = (l, x, y) => l.filter(t => t.txn_date >= x && t.txn_date < y), cur = inRange(debit, a, b), prev = inRange(debit, pa, pb);
    const total = sum(cur, sh), last = sum(prev, sh), income = sum(D.transactions.filter(t => t.type === 'credit' && confirmed(t) && t.txn_date >= a && t.txn_date < b), t => t.amount);
    const prevcats = {}; for (const t of prev) prevcats[t.category] = (prevcats[t.category] || 0) + sh(t);
    const cats = group(cur, t => t.category).map(([k, x]) => ({ name: k, amt: x.amt, n: x.n, mx: x.mx, prev: prevcats[k] || 0 })).sort((x, y) => y.amt - x.amt);
    const t = new Date(), forecast = m === nowM() && total && t.getDate() >= 3 ? total / t.getDate() * dim(t.getFullYear(), t.getMonth() + 1) : null;
    const nd = dim(+m.slice(0, 4), +m.slice(5)), dayMap = {};
    for (const x of cur) { const d = +x.txn_date.slice(8, 10); const r = dayMap[d] || (dayMap[d] = { amt: 0, n: 0 }); r.amt += sh(x); r.n++; }
    const months = [-2, -1, 0].map(k => { const mm = shift(nowM(), k), [x, y] = rng(mm); return { month: mm, amt: sum(inRange(debit, x, y), sh) }; });
    const payees = group(cur.filter(x => x.merchant), x => x.merchant.toLowerCase(), (g, x) => { if (g.name === null || x.merchant > g.name) g.name = x.merchant; })
      .map(([, x]) => ({ name: x.name, amt: x.amt, n: x.n, mx: x.mx, is_send: x.is_send })).sort((x, y) => y.amt - x.amt).slice(0, 15);
    const methods = group(cur, x => x.method).map(([k, x]) => ({ name: k, amt: x.amt, n: x.n, mx: x.mx })).sort((x, y) => y.amt - x.amt);
    return { month: m, total, last, income, forecast, goal: +D.user.goal || 0, categories: cats, methods, payees, merchants: payees.slice(0, 5),
      daily: Array.from({ length: nd }, (_, i) => ({ d: i + 1, amt: dayMap[i + 1] ? dayMap[i + 1].amt : 0, n: dayMap[i + 1] ? dayMap[i + 1].n : 0 })), months,
      cards: D.cards.map(c => ({ id: c.id, name: c.name, kind: c.kind, last4: c.last4, amt: sum(cur.filter(x => x.card_id === c.id), x => x.amount) })),
      insights: insights(m, total, cats, prevcats) };
  }

  /* ---------- your data: backup, restore, erase ---------- */
  function clearData(b) {
    if (String(b.confirm || '').trim().toUpperCase() !== 'ERASE') throw E(422, 'Type ERASE to confirm');
    let n = 0; for (const k of ['cards', 'transactions', 'card_payments', 'budgets', 'recurring', 'people', 'ledger', 'investments', 'reminders']) { n += D[k].length; D[k] = []; }
    D.rules = {}; D.user.goal = 0; return { erased: n };
  }
  const exportJson = () => { D.user.lastBackup = new Date().toISOString(); save(); return JSON.stringify({ app: 'Finora', exported_at: new Date().toISOString(), data: D }, null, 2); };
  function importJson(text) {
    let j; try { j = JSON.parse(text); } catch (e) { throw E(422, 'That file is not a Finora backup'); }
    const d = j && (j.data || j); if (!d || typeof d !== 'object' || !Array.isArray(d.transactions) || !d.user) throw E(422, 'That file is not a Finora backup');
    adopt(d); D.user.setup = true; D.n = Math.max(D.n || 1, 1 + Math.max(0, ...['cards', 'transactions', 'card_payments', 'recurring', 'people', 'ledger', 'investments', 'reminders'].flatMap(k => D[k].map(x => x.id || 0)))); save(); return { ok: true };
  }
  function wipe() { try { localStorage.removeItem(KEY); } catch (e) {} D = fresh(); }
  const size = () => { try { return (localStorage.getItem(KEY) || '').length * 2; } catch (e) { return 0; } };

  /* ---------- router: the screens call api('/path') exactly as before ---------- */
  const R = [];
  const route = (method, pattern, fn) => R.push([method, new RegExp('^' + pattern + '$'), fn]);
  route('GET', '/me', () => { postRecurring(); return pubUser(); });
  route('POST', '/settings', c => updateSettings(c.b));
  route('GET', '/summary', c => { postRecurring(); return summary(c.q.month); });
  route('GET', '/transactions', c => listTxns(c.q));
  route('POST', '/transactions', c => addTxn(c.b));
  route('POST', '/transactions/(\\d+)/confirm', c => confirmTxn(c.id, c.b));
  route('DELETE', '/transactions/(\\d+)', c => delTxn(c.id));
  route('POST', '/transactions/(\\d+)/split', c => splitTxn(c.id, c.b));
  route('GET', '/pending', () => D.transactions.filter(t => t.status === 'pending'));
  route('GET', '/suggest', c => suggest(c.q.text));
  route('GET', '/payees', () => recentPayees());
  route('POST', '/parse', c => parseFor(String(c.b.text || '')));
  route('GET', '/cards', () => cards());
  route('POST', '/cards', c => saveCard(c.b));
  route('POST', '/cards/(\\d+)', c => saveCard(c.b, c.id));
  route('DELETE', '/cards/(\\d+)', c => delCard(c.id));
  route('GET', '/cards/(\\d+)/payments', c => D.card_payments.filter(p => p.card_id === c.id).sort((a, b) => (a.paid_on < b.paid_on ? 1 : -1)));
  route('POST', '/cards/(\\d+)/payments', c => payCard(c.id, c.b));
  route('GET', '/people', () => people());
  route('GET', '/people/(\\d+)/ledger', c => ledger(c.id));
  route('POST', '/ledger', c => addLedger(c.b));
  route('DELETE', '/ledger/(\\d+)', c => { D.ledger = D.ledger.filter(l => l.id !== c.id); return { ok: true }; });
  route('GET', '/investments', () => investments());
  route('POST', '/investments', c => saveInv(c.b));
  route('DELETE', '/investments/(\\d+)', c => { D.investments = D.investments.filter(i => i.id !== c.id); return { ok: true }; });
  route('GET', '/budgets', c => budgets(c.q.month || nowM()));
  route('POST', '/budgets', c => setBudget(c.b));
  route('GET', '/recurring', () => D.recurring.filter(r => r.active).sort((a, b) => a.day_of_month - b.day_of_month));
  route('POST', '/recurring', c => addRecurring(c.b));
  route('DELETE', '/recurring/(\\d+)', c => { const r = D.recurring.find(x => x.id === c.id); if (r) r.active = 0; return { ok: true }; });
  route('GET', '/reminders', () => reminders());
  route('POST', '/reminders', c => addReminder(c.b));
  route('POST', '/reminders/(\\d+)/done', c => { const r = D.reminders.find(x => x.id === c.id); if (r) r.done = 1; return { ok: true }; });
  route('GET', '/alerts', () => alerts());
  route('POST', '/data/clear', c => clearData(c.b));

  async function handle(path, o = {}) {
    const method = (o.method || 'GET').toUpperCase(), [p, qs = ''] = path.split('?'), q = Object.fromEntries(new URLSearchParams(qs));
    for (const [m, rx, fn] of R) {
      if (m !== method) continue;
      const mm = rx.exec(p); if (!mm) continue;
      const out = fn({ q, b: o.body || {}, id: mm[1] ? +mm[1] : null });
      if (method !== 'GET' || p === '/me') save();
      return JSON.parse(JSON.stringify(out === undefined ? { ok: true } : out));
    }
    throw E(404, 'Not found');
  }

  load();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}   // ask the browser not to clear our data when space is low
  return { handle, exportJson, importJson, wipe, size, parseSms, categorize, calc, summary: m => summary(m), reload: load, _state: () => D };
})();

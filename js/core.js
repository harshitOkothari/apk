/* Finora core: helpers, icons, interactive logo, api, sheets, form pieces, charts. Globals are shared with the other js files (no build step). */
const $ = s => document.querySelector(s);
const CATS = ['Food & Dining', 'Shopping', 'Travel', 'Utilities', 'Bills & EMI', 'Health', 'Entertainment', 'Education', 'Friends & Family', 'Others'];
const METHODS = [['upi', 'UPI'], ['cash', 'Cash'], ['credit', 'Credit'], ['debit', 'Debit']];
const MNAME = { upi: 'UPI', cash: 'Cash', credit: 'Credit', debit: 'Debit' };
const APP = { name: 'Finora', version: '1.0' };
const jsq = s => JSON.stringify(String(s ?? '')).replace(/"/g, '&quot;');   // safe string literal inside an onclick="..."
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = v => (v < 0 ? '−₹' : '₹') + Math.abs(Math.round(v || 0)).toLocaleString('en-IN');
const p2 = x => String(x).padStart(2, '0');
const today = () => new Date().toLocaleDateString('en-CA');
const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
const catIdx = n => (CATS.indexOf(n) < 0 ? 9 : CATS.indexOf(n));
const col = i => getComputedStyle(document.documentElement).getPropertyValue('--c' + (i + 1)).trim();
const daysFrom = iso => Math.round((new Date(iso.slice(0, 10) + 'T00:00') - new Date(today() + 'T00:00')) / 864e5);
let tab = 'home', month = today().slice(0, 7), cards = [], LOGOS = {}, ME = {}, CFG = {}, TXC = {}, PPL = [], ALERTS = [];

const I = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>', chart: '<path d="M4 20V11M10 20V4M16 20v-6M22 20H2"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.2c2.6.2 4.2 1.8 4.7 4.8"/>',
  trend: '<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>', plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>', bell: '<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', split: '<path d="M12 3v7M12 10l-6 5v6M12 10l6 5v6"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>', chev: '<path d="M9 5l7 7-7 7"/>',
  back: '<path d="M20 5H9l-6 7 6 7h11z"/><path d="M13 9l4 6M17 9l-4 6"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 8l9 6 9-6"/>', share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  send: '<path d="M4 12l16-8-6 16-3-6.5z"/>', zap: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lend: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1.2 1-2 2.5-2s2.5.8 2.5 2-1 1.7-2.5 2-2.5.8-2.5 2 1 2 2.5 2 2.5-.8 2.5-2"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', out: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="3"/><path d="M11 18h2"/>', left: '<path d="M15 5l-7 7 7 7"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.2M9.9 9.9a3 3 0 004.2 4.2"/>', dl: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', check: '<path d="M5 12l5 5 9-10"/>',
};
const ic = (n, s = 22) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

/* ----- logo + name: tap them anywhere and the orbit spins. A few quick taps and you get a line from us. ----- */
const mark = (s = 34) => `<svg class="mark" width="${s}" height="${s}" viewBox="0 0 48 48" aria-label="Finora"><rect width="48" height="48" rx="13" fill="#111214"/><rect x=".5" y=".5" width="47" height="47" rx="12.5" fill="none" stroke="#ffffff" stroke-opacity=".12"/><circle cx="24" cy="24" r="15.5" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="1.2"/>
  <path d="M19 35V16h14M19 25.5h11" stroke="#F3F3F1" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="35" cy="35" r="3.1" fill="#3DD6A5"><animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="7s" repeatCount="indefinite"/></circle></svg>`;
const wordmark = () => '<span class="wm">Finora</span>';
const logo = (s = 34, name = true) => `<span class="lg" onclick="logoTap(this)" role="button" aria-label="Finora">${mark(s)}${name ? wordmark() : ''}</span>`;
const LOGO_LINES = ['Orbiting. Always.', 'Money moves in cycles.', 'Small habits, big picture.', 'Quietly keeping track.', 'Clarity beats complexity.'];
let LT = { n: 0, t: 0 };
function logoTap(el) {
  const now = Date.now(); LT.n = now - LT.t < 1800 ? LT.n + 1 : 1; LT.t = now;
  el.classList.remove('spin'); void el.offsetWidth; el.classList.add('spin'); ripple(el);
  if (LT.n >= 3) { toast(LOGO_LINES[(LT.n + new Date().getSeconds()) % LOGO_LINES.length]); if (LT.n >= 5) LT.n = 0; }
}
function ripple(el) { const r = el.getBoundingClientRect(), d = document.createElement('i'); d.className = 'ripple'; d.style.left = r.left + r.width / 2 + 'px'; d.style.top = r.top + r.height / 2 + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 800); }

/* ----- brand tiles. Real logo files in public/logos/ win, then the Simple Icons CDN, then a letter tile ----- */
const BRANDS = {
  zomato: ['Z', '#E23744', '#fff', 'zomato'], swiggy: ['S', '#FC8019', '#fff', 'swiggy'], blinkit: ['b', '#F8CB46', '#111', 'blinkit'], zepto: ['Z', '#3C1C78', '#fff', ''],
  instamart: ['I', '#FC8019', '#fff', ''], bigbasket: ['b', '#84C225', '#fff', 'bigbasket'], uber: ['U', '#000', '#fff', 'uber'], ola: ['O', '#C8E022', '#111', ''],
  rapido: ['R', '#FFD400', '#111', ''], irctc: ['I', '#1E4D9B', '#fff', ''], amazon: ['a', '#232F3E', '#FF9900', 'amazon'], flipkart: ['F', '#2874F0', '#FFE500', 'flipkart'],
  myntra: ['M', '#FF3F6C', '#fff', 'myntra'], nykaa: ['N', '#FC2779', '#fff', 'nykaa'], meesho: ['M', '#9F2089', '#fff', 'meesho'], netflix: ['N', '#E50914', '#fff', 'netflix'],
  spotify: ['S', '#1DB954', '#000', 'spotify'], hotstar: ['H', '#0C1E3C', '#fff', 'jiohotstar'], youtube: ['Y', '#FF0000', '#fff', 'youtube'], jio: ['J', '#0A2885', '#fff', 'jio'],
  airtel: ['A', '#E40000', '#fff', 'airtel'], phonepe: ['P', '#5F259F', '#fff', 'phonepe'], paytm: ['P', '#00B9F1', '#fff', 'paytm'], domino: ['D', '#006491', '#fff', 'dominos'],
  mcdonald: ['M', '#DA291C', '#FFC72C', 'mcdonalds'], starbucks: ['S', '#00704A', '#fff', 'starbucks'], kfc: ['K', '#E4002B', '#fff', 'kfc'], apple: ['A', '#111', '#fff', 'apple'], google: ['G', '#4285F4', '#fff', 'google'],
};
const brandOf = m => { const s = (m || '').toLowerCase(); return Object.keys(BRANDS).find(k => new RegExp('\\b' + k).test(s)); };
function brandFallback(img, l, bg, fg) { const p = img.parentNode; p.classList.remove('logo'); p.style.background = bg; p.style.color = fg; p.style.padding = '0'; p.textContent = l; }
function tile(x, size = 38) {
  const st = `width:${size}px;height:${size}px;font-size:${Math.round(size * .4)}px`, b = x.is_send ? null : brandOf(x.merchant);
  if (b) { const [l, bg, fg, slug] = BRANDS[b], src = LOGOS[b] ? `logos/${LOGOS[b]}` : '';   // only logo files shipped with the app; nothing is fetched from the internet
    return src ? `<div class="ic logo" style="${st}"><img src="${src}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="brandFallback(this,'${l}','${bg}','${fg}')"></div>` : `<div class="ic" style="${st};background:${bg};color:${fg}">${l}</div>`; }
  const c = col(x.is_send ? 8 : catIdx(x.category));
  return `<div class="ic" style="${st};background:color-mix(in srgb,${c} 22%,transparent);color:${c}">${esc((x.merchant || x.category || '?')[0]).toUpperCase()}</div>`;
}

/* ----- api + ui helpers ----- */
const TOKEN = { get: () => 'device', set() {}, clear() {} };   // no accounts: kept only so older helper code keeps working

/* ----- the Android app: the same website runs inside a small app that adds a few phone features (window.FinoraApp is provided by the app) ----- */
const NATIVE = () => typeof window.FinoraApp !== 'undefined';
function nativeSession() { try { if (NATIVE() && TOKEN.get() && ME && ME.sms_key) FinoraApp.saveSession(TOKEN.get(), ME.sms_key, ME.remind_days || 3); } catch (e) {} }
/* the Android back button asks this first: return true if we closed something */
window.finoraBack = () => {
  const open = el => el.classList.contains('show') && !el.classList.contains('closing');      // ignore one that is already sliding away
  if (open($('#popw'))) { closePop(); return true; }
  if (open($('#overlay'))) { closeSheet(); return true; }
  if ($('#gate').classList.contains('show')) return false;
  if (tab !== 'home') { go('home'); return true; }
  return false;
};
/* the app tells us when the phone answered a permission question */
function syncNativeSwitches() { if (!NATIVE()) return; document.querySelectorAll('[data-sw=nsms]').forEach(b => { const v = FinoraApp.smsEnabled(); b.classList.toggle('on', v); b.setAttribute('aria-checked', v); });
  document.querySelectorAll('[data-sw=nalerts]').forEach(b => { const v = FinoraApp.alertsEnabled(); b.classList.toggle('on', v); b.setAttribute('aria-checked', v); }); }
window.onFinoraNative = (what, ok) => { syncNativeSwitches(); if (!ok) toast(what === 'sms' ? 'SMS permission was not given. See step 2 in the setup.' : 'Notifications were not allowed'); else toast(what === 'sms' ? 'Automatic capture is on' : 'Reminders are on'); };
/* every screen calls api('/something') as before. It now runs on this device (js/local.js), never over the network. */
async function api(path, o = {}) {
  try { return await Local.handle(path, o); }
  catch (e) { throw new Error(e && e.message ? e.message : 'Something went wrong'); }
}
let toastT = 0;
const toast = m => { const e = $('#toast'); e.textContent = m; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2600); };
let CT = 0, CP = 0;
const openSheet = h => { clearTimeout(CT); const o = $('#overlay'); o.classList.remove('closing'); $('#sheet').style.transform = ''; $('#sheet').innerHTML = '<div class="grab"></div>' + h; o.classList.add('show'); $('#sheet').scrollTop = 0; };
const closeSheet = () => { const o = $('#overlay'); if (!o.classList.contains('show')) return; o.classList.add('closing'); clearTimeout(CT); CT = setTimeout(() => { o.classList.remove('show', 'closing'); $('#sheet').style.transform = ''; }, 210); };
const openPop = h => { clearTimeout(CP); const w = $('#popw'); w.classList.remove('closing'); $('#pop').innerHTML = h; w.classList.add('show'); };
const closePop = () => { const w = $('#popw'); if (!w.classList.contains('show')) return; w.classList.add('closing'); clearTimeout(CP); CP = setTimeout(() => w.classList.remove('show', 'closing'), 200); };
(() => { let y0 = null, dy = 0; const sh = $('#sheet');
  sh.addEventListener('touchstart', e => { y0 = (e.target.closest('.grab') || sh.scrollTop === 0) ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
  sh.addEventListener('touchmove', e => { if (y0 === null) return; dy = e.touches[0].clientY - y0; if (dy > 0) { sh.style.transition = 'none'; sh.style.transform = `translateY(${dy}px)`; } }, { passive: true });
  sh.addEventListener('touchend', () => { if (y0 === null) return; sh.style.transition = 'transform .25s var(--ease)'; if (dy > 110) closeSheet(); else sh.style.transform = ''; y0 = null; setTimeout(() => { sh.style.transition = ''; }, 260); }); })();
let YES = null;
const ask = (msg, label, yes) => { YES = yes; openPop(`<div class="dlg"><p>${msg}</p><div class="two2"><button class="btn ghost" onclick="closePop()">Cancel</button><button class="btn danger" onclick="closePop();YES()">${label}</button></div></div>`); };
const go = t => { closeSheet(); tab = t; render(); window.scrollTo({ top: 0, behavior: 'instant' }); };
const pct = (v, t) => t ? Math.round(v / t * 100) : 0;
/* over=true: the bar turns red once it reaches 100% (use for limits and goals only, not for rankings) */
const bar = (p, c = 'var(--tx)', over = false) => `<div class="bar"><b style="width:${Math.min(p, 100)}%;background:${over && p >= 100 ? 'var(--neg)' : c}"></b></div>`;
const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const fmtDate = iso => { const d = new Date(iso), k = iso.slice(0, 10), y = new Date(Date.now() - 864e5).toLocaleDateString('en-CA'); const day = k === today() ? 'Today' : k === y ? 'Yesterday' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); return iso.length > 10 ? day + ', ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : day; };
const longDate = iso => new Date(iso.length > 10 ? iso : iso + 'T00:00').toLocaleString('en-IN', iso.length > 10 ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' });
const monthName = m => new Date(m + '-02').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const when = d => d < 0 ? `${-d}d overdue` : d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`;
const chooseMonth = () => pickMonth(month, m => { month = m; render(); });

/* ----- Enter key: next box, or save on the last one ----- */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;
  const el = e.target; if (!el.matches || !el.matches('input,textarea') || el.type === 'checkbox' || el.tagName === 'TEXTAREA') return;
  const box = el.closest('#sheet,#pop,#gate,.qcard'); if (!box) return;
  const list = [...box.querySelectorAll('input,textarea')].filter(i => i.offsetParent !== null && !i.disabled && i.type !== 'checkbox' && i.type !== 'hidden'), n = list.indexOf(el);
  if (n >= 0 && n < list.length - 1) { e.preventDefault(); list[n + 1].focus(); return; }
  const ok = box.querySelector('[data-ok]'); if (ok && !ok.disabled) { e.preventDefault(); ok.click(); }
});

/* ----- switch (real toggle): flips instantly, saves in the background, flips back if saving fails ----- */
const SWFN = {};
const sw = (key, on) => `<button type="button" class="sw ${on ? 'on' : ''}" role="switch" aria-checked="${!!on}" data-sw="${key}"><i></i></button>`;
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.sw'); if (!b || b.dataset.busy) return;
  const on = !b.classList.contains('on'), set = v => { b.classList.toggle('on', v); b.setAttribute('aria-checked', v); };
  set(on); b.dataset.busy = '1';
  Promise.resolve(SWFN[b.dataset.sw] && SWFN[b.dataset.sw](on, b)).catch(err => { set(!on); toast(err.message || 'Could not change that'); }).finally(() => { delete b.dataset.busy; });
});

/* ----- tooltip for charts: hover on desktop, tap on phone. Any element with data-tip="<b>title</b><span>detail</span>" gets one ----- */
let TIP = null, TIPT = 0;
function tipShow(t) {
  if (!TIP) { TIP = document.createElement('div'); TIP.id = 'tip'; document.body.appendChild(TIP); }
  TIP.innerHTML = t.dataset.tip; TIP.classList.add('show');
  const r = t.getBoundingClientRect(), w = TIP.offsetWidth, h = TIP.offsetHeight;
  TIP.style.left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8)) + 'px'; TIP.style.top = Math.max(8, r.top - h - 10) + 'px';
}
const tipHide = () => { if (TIP) TIP.classList.remove('show'); };
document.addEventListener('pointerover', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t) { tipShow(t); clearTimeout(TIPT); if (e.pointerType === 'touch') TIPT = setTimeout(tipHide, 2600); } });
document.addEventListener('pointerout', e => { if (e.pointerType !== 'touch' && e.target.closest && e.target.closest('[data-tip]')) tipHide(); });
document.addEventListener('pointerdown', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t) { tipShow(t); clearTimeout(TIPT); if (e.pointerType === 'touch') TIPT = setTimeout(tipHide, 2600); } else tipHide(); });
document.addEventListener('scroll', tipHide, { passive: true, capture: true });

/* password box with a show / hide button */
const pwField = (id, attrs = '') => `<div class="pwf"><input id="${id}" type="password" ${attrs}><button type="button" class="pweye" aria-label="Show password" onclick="togglePw('${id}',this)">${ic('eye', 20)}</button></div>`;
function togglePw(id, btn) { const el = $('#' + id), show = el.type === 'password'; el.type = show ? 'text' : 'password'; btn.innerHTML = ic(show ? 'eyeoff' : 'eye', 20); btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); el.focus(); }

/* ----- password strength: a line that fills and changes colour as the password gets stronger ----- */
const COMMON_PW = ['password', '12345678', '123456789', 'qwertyui', '11111111', 'iloveyou', 'abcd1234', 'qwerty123', '1q2w3e4r', '00000000', 'admin123', 'welcome1', 'letmein1', 'finora123', 'passw0rd'];
function pwScore(p) {
  p = p || ''; if (!p) return { w: 0, label: '', tip: '', color: 'var(--line)', ok: false };
  const low = p.toLowerCase(), kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(p)).length;
  const easy = COMMON_PW.some(w => low.includes(w)) || new Set(p).size <= 2 || (/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer)/.test(low) && p.length < 12);
  if (p.length < 8) return { w: 12, label: 'Too short', tip: `${8 - p.length} more character${8 - p.length > 1 ? 's' : ''}`, color: 'var(--neg)', ok: false };
  if (easy) return { w: 24, label: 'Too easy to guess', tip: 'avoid common words and number runs', color: 'var(--neg)', ok: false };
  const pts = 1 + (p.length >= 12) + (p.length >= 16) + (kinds >= 2) + (kinds >= 3) + (kinds === 4);
  const L = pts <= 2 ? ['Weak', 40, 'var(--warn)', 'add numbers, capitals or symbols'] : pts === 3 ? ['Fair', 60, 'var(--warn)', 'a few more characters would help'] : pts === 4 ? ['Good', 80, 'var(--ac)', ''] : ['Strong', 100, 'var(--pos)', ''];
  return { w: L[1], label: L[0], tip: L[3], color: L[2], ok: true };
}
const pwMeter = id => `<div class="meter" aria-hidden="true"><i id="${id}-bar"></i></div><p class="hint" id="${id}-lbl" aria-live="polite"></p>`;
document.addEventListener('input', e => { const m = e.target.dataset && e.target.dataset.meter; if (!m) return; const r = pwScore(e.target.value), b = $('#' + m + '-bar'), l = $('#' + m + '-lbl');
  b.style.width = r.w + '%'; b.style.background = r.color; l.textContent = r.label ? r.label + (r.tip ? ' · ' + r.tip : '') : ''; l.style.color = r.ok ? 'var(--mu)' : 'var(--neg)'; });

/* ----- install the app from the website (no app store): Chrome / Edge / Samsung give a real prompt, iPhone needs Share > Add to Home Screen ----- */
let DEFER = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); DEFER = e; });
window.addEventListener('appinstalled', () => { DEFER = null; toast('Finora is installed'); });
const isInstalled = () => NATIVE() || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
async function installApp() { if (DEFER) { DEFER.prompt(); try { await DEFER.userChoice; } catch (e) {} DEFER = null; return; } installHelp(); }
function installHelp() {
  const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua), inApp = /FBAN|FBAV|Instagram|Line\/|WhatsApp|Snapchat/.test(ua);
  const steps = ios ? ['Open this page in <b>Safari</b>.', 'Tap the <b>Share</b> button at the bottom.', 'Choose <b>Add to Home Screen</b>, then <b>Add</b>.']
    : /Android/.test(ua) ? ['Open this page in <b>Chrome</b> or <b>Samsung Internet</b>.', 'Tap the <b>⋮</b> menu.', 'Choose <b>Install app</b> (or <b>Add to Home screen</b>).']
    : ['Use <b>Chrome</b> or <b>Edge</b>.', 'Click the <b>install icon</b> at the right end of the address bar, or open the ⋮ menu and choose <b>Install Finora</b>.'];
  openSheet(`<div class="c">${logo(46, false)}<h2 style="margin-top:10px">Install Finora</h2><p class="mu" style="margin-top:6px">It opens full screen from your home screen, like any app. No app store needed.</p></div>
    ${inApp ? '<div class="ins" style="margin-top:14px">You are inside another app’s browser. Open this link in Chrome or Safari first.</div>' : ''}
    ${steps.map((t, i) => `<div class="step-n"><b class="n">${i + 1}</b><div>${t}</div></div>`).join('')}<button class="btn ghost" onclick="closeSheet()">Done</button>`);
}
const installBtn = (cls = 'btn ghost g small') => isInstalled() ? '' : `<button type="button" class="${cls}" onclick="installApp()">${ic('dl', 17)} Install app</button>`;

/* ----- form pieces ----- */
const seg = (id, opts, val, cls = '') => `<div class="seg ${cls}" id="${id}">${opts.map(([v, l]) => `<button type="button" data-v="${esc(v)}" class="${String(v) === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const segVal = id => { const b = document.querySelector('#' + id + ' .on'); return b ? b.dataset.v : null; };
const pickSeg = (id, v) => { const b = document.querySelector(`#${id} [data-v="${v}"]`); if (b) b.click(); };
document.addEventListener('click', e => { const b = e.target.closest('.seg:not(.multi) button'); if (b) { const p = b.parentNode; p.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); p.dispatchEvent(new Event('change', { bubbles: true })); } });
const fmtAmt = v => { let s = String(v ?? '').replace(/[^\d.]/g, ''); if (!s) return ''; const dot = s.indexOf('.'); let i = (dot < 0 ? s : s.slice(0, dot)).replace(/^0+(?=\d)/, '').slice(0, 10), d = dot < 0 ? null : s.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  return (i ? (+i).toLocaleString('en-IN') : '0') + (d === null ? '' : '.' + d); };
const num = id => parseFloat((($('#' + id) || {}).value || '').replace(/,/g, '')) || 0;
const amtField = (id, v) => `<div class="amt"><span>₹</span><input id="${id}" inputmode="decimal" autocomplete="off" placeholder="0" value="${fmtAmt(v)}"></div>`;
const amtChips = id => `<div class="chips">${[50, 100, 500, 1000].map(n => `<button type="button" onclick="bump('${id}',${n})">+${n}</button>`).join('')}<button type="button" onclick="bump('${id}',0)" aria-label="Clear">${ic('x', 14)}</button></div>`;
const bump = (id, n) => { const el = $('#' + id); el.value = n ? fmtAmt(Math.round((num(id) + n) * 100) / 100) : ''; el.focus(); };
const dateField = (id, v, time) => `<button type="button" class="pick" id="${id}" data-v="${v}" data-time="${time ? 1 : 0}" onclick="pickDate('${id}')">${ic('cal', 18)}<span>${longDate(v)}</span></button>`;

/* typed date: DD/MM/YYYY, slashes added for you, must be a real date. min='today' blocks the past. */
const dmy = v => v ? `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}` : '';
function parseDmy(s) { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || ''); if (!m) return null; const d = +m[1], mo = +m[2], y = +m[3], t = new Date(y, mo - 1, d);
  return t.getFullYear() === y && t.getMonth() === mo - 1 && t.getDate() === d && y >= 2000 && y <= 2100 ? `${y}-${p2(mo)}-${p2(d)}` : null; }
const dateInp = (id, v = '', min = '') => `<div class="dt" id="${id}-w"><input id="${id}" inputmode="numeric" maxlength="10" autocomplete="off" placeholder="DD/MM/YYYY" data-min="${min}" value="${dmy(v)}"><i></i></div><p class="hint" id="${id}-h"></p>`;
function dtState(id) {
  const el = $('#' + id), s = el.value.trim(); if (!s) return { empty: true };
  const iso = parseDmy(s); if (!iso) return { err: 'Enter a real date like 25/12/2026' };
  if (el.dataset.min === 'today' && iso < today()) return { err: 'Pick today or a future date' };
  return { iso };
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.matches('.dt input')) { let d = el.value.replace(/\D/g, '').slice(0, 8); el.value = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    const w = el.parentNode, h = $('#' + el.id + '-h'), s = dtState(el.id); w.classList.toggle('ok', !!s.iso); w.classList.toggle('bad', !!s.err && el.value.length === 10); w.querySelector('i').textContent = s.iso ? '✓' : (s.err && el.value.length === 10 ? '✕' : '');
    if (h) h.textContent = s.iso ? new Date(s.iso + 'T00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : (el.value.length === 10 && s.err) || ''; }
  if (el.matches('.amt input')) { const keep = el.value.slice(0, el.selectionStart).replace(/[^\d.]/g, '').length; el.value = fmtAmt(el.value); let n = 0, p = 0; while (p < el.value.length && n < keep) { if (/[\d.]/.test(el.value[p])) n++; p++; } try { el.setSelectionRange(p, p); } catch (x) {} }
  if (el.matches('input.digits')) el.value = el.value.replace(/\D/g, '').slice(0, +el.maxLength || 99);
});
/* reads a typed date. required -> error if empty. Throws a friendly Error for bad input. */
function dateOf(id, required, label = 'date') { const s = dtState(id); if (s.err) throw new Error(s.err); if (s.empty) { if (required) throw new Error('Enter the ' + label); return null; } return s.iso; }

/* ----- calendar popup (for transaction dates; future blocked) + month picker (old months locked on the free plan) ----- */
let PK = {};
function pickDate(id) { const el = $('#' + id), time = el.dataset.time === '1', v = new Date(el.dataset.v.length > 10 ? el.dataset.v : el.dataset.v + 'T00:00'); PK = { id, time, y: v.getFullYear(), m: v.getMonth(), sel: [v.getFullYear(), v.getMonth(), v.getDate()], hh: v.getHours(), mi: v.getMinutes() }; calClamp(); calDraw(); }
function calClamp() { const n = new Date(), [y, m, d] = PK.sel;
  if (y > n.getFullYear() || (y === n.getFullYear() && (m > n.getMonth() || (m === n.getMonth() && d > n.getDate())))) { PK.sel = [n.getFullYear(), n.getMonth(), n.getDate()]; PK.y = n.getFullYear(); PK.m = n.getMonth(); }
  const [yy, mm, dd] = PK.sel; if (PK.time && yy === n.getFullYear() && mm === n.getMonth() && dd === n.getDate() && PK.hh * 60 + PK.mi > n.getHours() * 60 + n.getMinutes()) { PK.hh = n.getHours(); PK.mi = n.getMinutes(); } }
function calDraw() {
  const { y, m, sel, time, hh, mi } = PK, n = new Date(), ty = n.getFullYear(), tm = n.getMonth(), td = n.getDate();
  const first = new Date(y, m, 1).getDay(), cnt = new Date(y, m + 1, 0).getDate(), fut = d => y > ty || (y === ty && (m > tm || (m === tm && d > td))), canNext = y < ty || (y === ty && m < tm);
  const days = '<i></i>'.repeat(first) + Array.from({ length: cnt }, (_, i) => { const d = i + 1, on = sel[0] === y && sel[1] === m && sel[2] === d, now = y === ty && m === tm && d === td; return `<button type="button" ${fut(d) ? 'disabled' : ''} class="${on ? 'on' : ''} ${now ? 'now' : ''}" onclick="calDay(${d})">${d}</button>`; }).join('');
  openPop(`<div class="cal"><div class="row"><button type="button" class="ib" onclick="calMove(-1)" aria-label="Previous"><span class="flip">${ic('chev', 18)}</span></button><b>${new Date(y, m).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</b><button type="button" class="ib" ${canNext ? '' : 'disabled'} onclick="calMove(1)" aria-label="Next">${ic('chev', 18)}</button></div>
    <div class="wk">${[...'SMTWTFS'].map(x => `<span>${x}</span>`).join('')}</div><div class="days">${days}</div><button type="button" class="todaybtn" onclick="calToday()">Today</button>
    ${time ? `<div class="tm"><div class="step"><button type="button" onclick="calT('hh',-1)">−</button><b>${p2(hh)}</b><button type="button" onclick="calT('hh',1)">+</button></div><b style="align-self:center">:</b><div class="step"><button type="button" onclick="calT('mi',-5)">−</button><b>${p2(mi)}</b><button type="button" onclick="calT('mi',5)">+</button></div></div>` : ''}
    <div class="foot"><button type="button" class="btn ghost" onclick="closePop()">Cancel</button><button type="button" class="btn" onclick="calOk()">OK</button></div></div>`);
}
const calMove = d => { PK.m += d; if (PK.m < 0) { PK.m = 11; PK.y--; } if (PK.m > 11) { PK.m = 0; PK.y++; } calDraw(); };
const calDay = d => { PK.sel = [PK.y, PK.m, d]; calClamp(); calDraw(); };
const calT = (k, d) => { PK[k] = (PK[k] + d + (k === 'hh' ? 24 : 60)) % (k === 'hh' ? 24 : 60); calClamp(); calDraw(); };
function calToday() { const n = new Date(); PK.y = n.getFullYear(); PK.m = n.getMonth(); PK.sel = [PK.y, PK.m, n.getDate()]; PK.hh = n.getHours(); PK.mi = n.getMinutes(); calOk(); }
function calOk() { calClamp(); const [y, m, d] = PK.sel; let v = `${y}-${p2(m + 1)}-${p2(d)}`; if (PK.time) v += `T${p2(PK.hh)}:${p2(PK.mi)}`; const el = $('#' + PK.id); el.dataset.v = v; el.querySelector('span').textContent = longDate(v); closePop(); el.dispatchEvent(new Event('change', { bubbles: true })); }
let MK = {};
function pickMonth(cur, cb) { MK = { y: +cur.slice(0, 4), cur, cb }; monthDraw(); }
function monthDraw() { const { y, cur } = MK, n = new Date(), ty = n.getFullYear(), tm = n.getMonth(), old = ME.oldest || '0000-00';
  openPop(`<div class="row"><button type="button" class="ib" onclick="MK.y--;monthDraw()"><span class="flip">${ic('chev', 18)}</span></button><b>${y}</b><button type="button" class="ib" ${y >= ty ? 'disabled' : ''} onclick="MK.y++;monthDraw()">${ic('chev', 18)}</button></div>
    <div class="mgrid">${Array.from({ length: 12 }, (_, i) => { const v = `${y}-${p2(i + 1)}`, lk = v < old, fut = y > ty || (y === ty && i > tm); return `<button type="button" ${fut ? 'disabled' : ''} class="${v === cur ? 'on' : ''} ${lk ? 'lk' : ''}" onclick="${lk ? 'closePop();upgradeSheet()' : `monthPick('${v}')`}">${lk ? ' ' : ''}${new Date(y, i, 2).toLocaleDateString('en-IN', { month: 'short' })}</button>`; }).join('')}</div>
    <button type="button" class="todaybtn" onclick="monthPick(today().slice(0,7))">This month</button>${old > '0000-00' ? `<p class="hint c mt">Free plan keeps the last 3 months. months need an upgrade.</p>` : ''}`); }
const monthPick = v => { closePop(); MK.cb(v); };

/* ----- generic small form sheet. fields: {k,l,t:'text|money|int|date|seg|digits',v,opts,ph,max,min} ----- */
function formSheet(title, fields, submit) {
  openSheet(`<h3>${title}</h3>` + fields.map(f => `<label>${f.l}</label>` + (f.t === 'seg' ? seg('g-' + f.k, f.opts, f.v) : f.t === 'money' ? amtField('g-' + f.k, f.v) : f.t === 'digits' ? `<input id="g-${f.k}" class="digits" inputmode="numeric" autocomplete="off" maxlength="${f.max || 4}" value="${esc(f.v)}" placeholder="${esc(f.ph || '')}">` : f.t === 'date' ? dateInp('g-' + f.k, f.v || '', f.min || '')
    : `<input id="g-${f.k}" ${f.t === 'int' ? 'inputmode="numeric"' : ''} value="${esc(f.v)}" placeholder="${esc(f.ph || '')}" autocomplete="off">`)).join('') + `<button class="btn" id="g-ok" data-ok>Save</button>`);
  $('#g-ok').onclick = async () => { const d = {};
    try { fields.forEach(f => { d[f.k] = f.t === 'seg' ? segVal('g-' + f.k) : f.t === 'date' ? dateOf('g-' + f.k, f.req, f.l) : f.t === 'money' ? num('g-' + f.k) : f.t === 'int' ? parseInt($('#g-' + f.k).value.replace(/\D/g, ''), 10) || 0 : $('#g-' + f.k).value.trim(); });
      await submit(d); closeSheet(); toast('Saved ✓'); render(); } catch (e) { toast(e.message); } };
}

/* ----- charts (plain SVG, no library). Every bar and slice explains itself on hover or tap. ----- */
function donut(items, total, label = 'spent', cb = 'donutTap') {
  const R = 58, C = 2 * Math.PI * R; let off = 0;
  const seg = items.map(it => { const f = it.amt / total, len = Math.max(f * C - 1.6, 0.1), tip = `<b>${esc(it.name)}</b><span>${inr(it.amt)} · ${pct(it.amt, total)}%</span>`;
    const s = `<circle data-n="${esc(it.key ?? it.name)}" data-tip="${esc(tip)}" onclick="${cb}(this.dataset.n)" cx="75" cy="75" r="${R}" stroke="${it.color}" style="--len:${len};--c:${C}" stroke-dashoffset="${-off}"/>`; off += f * C; return s; }).join('');
  return `<div class="dn"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="${R}" stroke="var(--card2)"/>${seg}</svg><div class="mid"><span><b>${inr(total)}</b>${label}</span></div></div>`;
}
function dailyBars(days, m) {
  const mx = Math.max(...days.map(d => d.amt), 1), n = days.length, W = 320, H = 96, step = (W - 4) / n, bw = step - 3, peak = days.reduce((a, d, i) => d.amt > days[a].amt ? i : a, 0);
  const label = d => new Date(`${m}-${p2(d)}T00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return `<div class="dbars"><svg viewBox="0 0 ${W} ${H + 16}">${days.map((d, i) => { const h = Math.max(d.amt / mx * H, d.amt ? 3 : 2), x = 2 + i * step;
    const tip = `<b>${label(d.d)}</b><span>${d.amt ? `${inr(d.amt)} · ${d.n} payment${d.n > 1 ? 's' : ''}` : 'No spending'}</span>`;
    return `<g class="d" data-tip="${esc(tip)}"><rect class="hit" x="${x - 1.5}" y="0" width="${step}" height="${H + 4}" rx="3"/><rect class="b" x="${x}" y="${H - h}" width="${bw}" height="${h}" rx="${Math.min(bw / 2, 3)}" fill="${i === peak && d.amt ? 'var(--ac)' : d.amt ? 'var(--tx)' : 'var(--line)'}"/>${[0, 7, 14, 21, n - 1].includes(i) ? `<text x="${x + bw / 2}" y="${H + 12}" text-anchor="middle">${d.d}</text>` : ''}</g>`; }).join('')}</svg></div>`;
}

/* ----- phone alerts for bills that are close (browser notifications; needs permission from Settings) ----- */
async function notifyAlerts(list) {
  if (NATIVE()) return;                      // the app checks reminders itself, even when it is closed
  if (!('Notification' in window) || Notification.permission !== 'granted' || localStorage.getItem('notif_off')) return;
  const seen = JSON.parse(localStorage.getItem('nseen') || '{}'), lim = Math.max(ME.remind_days || 3, 1);
  for (const a of list) { const key = a.kind + a.ref; if (a.days > lim || seen[key] === today()) continue; seen[key] = today();
    const o = { body: `${a.amount ? inr(a.amount) + ' · ' : ''}due ${when(a.days)}`, icon: 'icon-192.png', tag: key };
    try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); reg ? reg.showNotification('Finora: ' + a.title, o) : new Notification('Finora: ' + a.title, o); } catch (e) {} }
  localStorage.setItem('nseen', JSON.stringify(seen));
}

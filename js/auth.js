/* Finora start-up: no accounts and no server. First visit asks your name, then everything runs on this device. */
function applyTheme(k) { if (k) localStorage.setItem('mode', k); const m = localStorage.getItem('mode') || 'system', dark = m === 'dark' || (m === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'; try { if (NATIVE()) FinoraApp.setTheme(dark); } catch (e) {} const tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.content = dark ? '#0B0C09' : '#F6F4EC'; }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());
const gate = h => { clearInterval(tagTimer); const g = $('#gate'); g.innerHTML = `<div class="gw">${h}</div>`; g.classList.add('show'); document.body.classList.add('gated'); g.scrollTop = 0; };
const hideGate = () => { clearInterval(tagTimer); $('#gate').classList.remove('show'); document.body.classList.remove('gated'); };
document.addEventListener('pointermove', e => { const m = document.querySelector('#gate.show .hello-lg .mark'); if (!m) return; const dx = (e.clientX / innerWidth - .5) * 2, dy = (e.clientY / innerHeight - .5) * 2; m.style.transform = `perspective(500px) rotateY(${dx * 16}deg) rotateX(${-dy * 16}deg)`; });

const installRow = () => isInstalled() ? '' : `<button type="button" class="getapp" onclick="installApp()"><span class="gi">${ic('dl', 18)}</span><span><b>Install the app</b><small>Add Finora to your home screen. Works offline.</small></span>${ic('chev', 16)}</button>`;
const TAGS = ['Your money, made clear.', 'Private. On your device.', 'Quiet, careful money tracking.', 'Every rupee, accounted for.'];
let tagTimer = 0;

/* ----- first visit: a name and an optional goal. That is all. ----- */
function welcome() {
  closeSheet(); closePop();
  gate(`<div class="hello-lg">${logo(78)}<p class="tag" id="tag">${TAGS[0]}</p></div>
    <div class="feat"><div><span class="q">${ic('shield', 18)}</span>Private: your data stays on this device</div><div><span class="q">${ic('zap', 18)}</span>Double-tap anywhere to add a payment</div><div><span class="q">${ic('lend', 18)}</span>Lend, split and get reminded on time</div></div>
    <label>What should we call you?</label><input id="w-name" placeholder="Your name" maxlength="40" autocomplete="given-name">
    <label>Monthly spending goal (optional)</label>${amtField('w-goal', '')}
    <div class="chips">${[10000, 20000, 30000, 50000].map(n => `<button type="button" onclick="bump('w-goal',${n})">${inr(n)}</button>`).join('')}</div>
    <button class="btn" id="w-ok" data-ok>Get started</button>
    ${installRow()}
    <p class="hint c mt">No account, no sign-up, no internet needed. By continuing you accept the <button type="button" class="lnk" style="margin:0" onclick="legalSheet('terms')">Terms</button> and <button type="button" class="lnk" style="margin:0" onclick="legalSheet('privacy')">Privacy Policy</button>.</p>`);
  let n = 0; tagTimer = setInterval(() => { const t = $('#tag'); if (!t) return; t.style.opacity = 0; setTimeout(() => { t.textContent = TAGS[++n % TAGS.length]; t.style.opacity = 1; }, 250); }, 3200);
  setTimeout(() => { const el = $('#w-name'); el && el.focus(); }, 120);
  $('#w-ok').onclick = async () => { try { await api('/settings', { method: 'POST', body: { name: $('#w-name').value.trim() || 'Friend', goal: num('w-goal'), setup: true } }); startApp(false, true); } catch (e) { toast(e.message); } };
}

/* ----- device PIN lock (shuffled keypad, kept on this phone only) ----- */
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
function pinPad({ title, sub = '', onDone, extra = '' }) {
  let pin = ''; const digits = [...'0123456789'].sort(() => Math.random() - .5);
  gate(`<div class="pin">${logo(52, false)}<h2>${title}</h2><p class="mu">${sub}</p><div class="dots" id="dots">${'<i></i>'.repeat(4)}</div><p class="err" id="perr"></p>
    <div class="keys" id="keys">${digits.slice(0, 9).map(d => `<button data-d="${d}">${d}</button>`).join('')}<button data-act="del" aria-label="Delete" style="font-size:20px">⌫</button><button data-d="${digits[9]}">${digits[9]}</button><button data-act="x" aria-label="Cancel" style="font-size:20px">✕</button></div>${extra}</div>`);
  const draw = () => document.querySelectorAll('#dots i').forEach((d, i) => d.classList.toggle('on', i < pin.length));
  const bad = m => { $('#perr').textContent = m; $('#dots').classList.add('shake'); setTimeout(() => { $('#dots')?.classList.remove('shake'); pin = ''; draw(); }, 420); };
  const press = async k => { if (k === 'x') { onDone(null); return; } if (k === 'del') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k; draw(); if (pin.length === 4) { const r = await onDone(pin); if (r) bad(r); } };
  $('#keys').onclick = e => { const b = e.target.closest('button'); if (b) press(b.dataset.d ?? b.dataset.act); };
  window.pinKey = e => { if (!$('#keys')) return; if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); };
}
document.addEventListener('keydown', e => window.pinKey && window.pinKey(e));
async function lockToggle() {
  const cur = JSON.parse(localStorage.getItem('lock') || 'null');
  if (cur) return pinPad({ title: 'Turn off app lock', sub: 'Enter your PIN', onDone: async p => { if (!p) { hideGate(); render(); return; } if (await sha(p + cur.s) !== cur.h) return 'Wrong PIN'; localStorage.removeItem('lock'); hideGate(); toast('App lock off'); render(); } });
  pinPad({ title: 'Choose a PIN', sub: '4 digits, kept on this phone', onDone: p1 => { if (!p1) { hideGate(); render(); return; }
    pinPad({ title: 'Type it again', sub: 'Just to be sure', onDone: async p2 => { if (!p2) { hideGate(); render(); return; } if (p1 !== p2) { setTimeout(lockToggle, 450); return "Those didn't match"; }
      const s = crypto.getRandomValues(new Uint8Array(8)).join(''); localStorage.setItem('lock', JSON.stringify({ s, h: await sha(p1 + s) })); hideGate(); toast('App lock on'); render(); } }); } });
}
function showLock() { const cur = JSON.parse(localStorage.getItem('lock')); pinPad({ title: `Welcome back${(ME.name || '').split(' ')[0] ? ', ' + esc((ME.name || '').split(' ')[0]) : ''}`, sub: 'Enter your PIN', onDone: async p => { if (!p) return; if (await sha(p + cur.s) !== cur.h) return 'Wrong PIN'; startApp(true); },
  extra: '<div class="pin-foot"><button type="button" class="lnk" onclick="forgotPin()">Forgot PIN?</button></div>' }); }
const forgotPin = () => openPop(`<div class="dlg"><p><b>Forgot your PIN?</b><br><span class="mu">The PIN is kept only on this phone and cannot be recovered. The only way back in is to erase Finora on this phone and start fresh. If you saved a backup file, you can restore it afterwards.</span></p><div class="two2"><button class="btn ghost" onclick="closePop()">Cancel</button><button class="btn danger" onclick="closePop();resetEverything()">Erase and reset</button></div></div>`);
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = Date.now(); else if (hiddenAt && Date.now() - hiddenAt > 60000 && ME && ME.setup && localStorage.getItem('lock') && !$('#gate').classList.contains('show')) showLock(); });

/* ----- boot ----- */
async function startApp(fromLock, first) {
  hideGate(); if (!fromLock) { closeSheet(); closePop(); }
  try { [ME, cards] = await Promise.all([api('/me'), api('/cards')]); } catch (e) { return; }
  try { const r = await fetch('logos/index.json'); if (r.ok) LOGOS = await r.json(); } catch (e) {}
  const s = $('#splash'); if (s) { s.classList.add('out'); setTimeout(() => s.remove(), 400); }
  tab = 'home'; prevTab = null; await render(); setTimeout(finHint, 9000);
  if (first || !localStorage.getItem('dtip')) { localStorage.setItem('dtip', '1'); setTimeout(() => toast('Tip: double-tap any empty space to add a payment'), first ? 900 : 1500); }
  if (new URLSearchParams(location.search).has('add')) { history.replaceState(null, '', location.pathname); setTimeout(() => quickAdd(), 400); }
}
async function boot() {
  applyTheme();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  const done = () => { const s = $('#splash'); if (s) { s.classList.add('out'); setTimeout(() => s.remove(), 400); } };
  try { ME = await api('/me'); } catch (e) { ME = {}; }
  if (!ME.setup) { done(); return welcome(); }
  if (localStorage.getItem('lock')) { done(); return showLock(); }
  startApp();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('#popw').classList.contains('show')) closePop(); else closeSheet(); } });
boot();

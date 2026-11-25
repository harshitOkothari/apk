/* Finora settings: everything here changes only this device. Backup and restore are how you move to a new phone. */
const upgradeSheet = () => {};            // there are no plans any more; kept so old links to it do nothing

const kb = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB';

function downloadBackup() {
  const blob = new Blob([Local.exportJson()], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `finora-backup-${today()}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('Backup saved. Keep the file somewhere safe'); setTimeout(() => tab === 'settings' && render(), 600);
}
function pickRestore() { const f = $('#restore-f'); if (f) { f.value = ''; f.click(); } }
document.addEventListener('change', e => {
  if (e.target.id !== 'restore-f' || !e.target.files[0]) return;
  const file = e.target.files[0], r = new FileReader();
  r.onerror = () => toast('Could not read that file');
  r.onload = () => ask('Replace everything on this device with this backup? What is here now will be lost.', 'Restore', async () => {
    try { Local.importJson(String(r.result)); ME = await api('/me'); cards = await api('/cards'); toast('Backup restored ✓'); go('home'); } catch (err) { toast(err.message); } });
  r.readAsText(file);
});

function resetEverything() {
  Local.wipe(); ['lock', 'dtip', 'nseen', 'notif_off', 'finhint'].forEach(k => localStorage.removeItem(k)); sessionStorage.clear(); location.reload();
}
function resetSheet() {
  openSheet(`<h3>Reset Finora on this device</h3><p class="mu">This erases everything stored on this device: payments, cards, people, loans, investments, reminders, limits, your name and the app lock. It cannot be undone, so download a backup first if you may want it back.</p>
    <label>Type RESET to confirm</label><input id="rs-t" autocomplete="off" autocapitalize="characters" placeholder="RESET"><button class="btn danger" id="rs-ok" data-ok>Erase everything and start over</button><button class="btn ghost" onclick="closeSheet()">Cancel</button>`);
  $('#rs-ok').onclick = () => { if ($('#rs-t').value.trim().toUpperCase() !== 'RESET') return toast('Type RESET to confirm'); resetEverything(); };
}

async function settingsView() {
  const [u, rec] = await Promise.all([api('/me'), api('/recurring')]); ME = u;
  const mode = localStorage.getItem('mode') || 'system', nOk = 'Notification' in window && Notification.permission === 'granted' && !localStorage.getItem('notif_off'), locked = !!localStorage.getItem('lock');
  const lb = u.last_backup ? new Date(u.last_backup).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  return `<header class="top l"><div style="display:flex;gap:10px;align-items:center"><button class="ib" onclick="go('home')" aria-label="Back"><span class="flip">${ic('chev', 18)}</span></button><h2>Settings</h2></div></header>
  <section class="card"><button class="row" style="width:100%" onclick="editName()"><span style="display:flex;gap:12px;align-items:center;text-align:left"><span class="av">${esc((u.name || 'F').slice(0, 2).toUpperCase())}</span><span><b>${esc(u.name)}</b><p class="mu sm">Tap to change your name</p></span></span><span class="plan">${ic('lock', 12)} ON DEVICE</span></button>
    <p class="hint mt" style="margin-top:10px">No account and no server. Everything you add is stored only in this browser on this device.</p></section>
  <section class="card"><h3>Quick add</h3><p class="mu" style="margin-bottom:10px"><b style="color:var(--tx)">Double-tap any empty space</b> (double-click on a computer) and a small box opens to add a payment in seconds.</p><button class="btn g small" onclick="quickAdd()">${ic('zap', 17)} Try it now</button></section>
  <section class="card"><h3>Appearance</h3><div class="modes">${MODES.map(k => `<button data-m="${k}" class="${mode === k ? 'on' : ''}" onclick="setMode('${k}')"><span class="mp ${k}"><i></i><i></i></span>${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div></section>
  <section class="card"><h3>Reminders</h3><label style="margin-top:0">Warn me before a due date</label>${seg('rd', [[1, '1 day'], [3, '3 days'], [5, '5 days'], [7, '7 days']], u.remind_days)}
    <div class="swrow" style="margin-top:10px"><span><b>Alerts on this device</b><p>Bills, money owed to you and your reminders. Shown while Finora is open.</p><button type="button" class="lnk" onclick="testAlert()">Send a test alert</button></span>${sw('notif', nOk)}</div></section>
  <section class="card"><h3>Security</h3><div class="swrow" style="border-top:0;padding-top:0"><span><b>App lock</b><p>A 4-digit PIN that guards Finora on this device.</p></span>${sw('lock', locked)}</div></section>
  ${isInstalled() ? '' : `<section class="card"><h3>Install Finora</h3><p class="mu">Add it to your home screen and it opens full screen like an app, and works offline.</p><button class="btn g small" style="margin-top:12px" onclick="installApp()">${ic('dl', 17)} Install app</button></section>`}
  <section class="card"><h3>Monthly PDF report</h3><p class="mu" style="margin-bottom:10px">A clean report with charts and tables. In the print screen choose <b>Save as PDF</b>.</p>
    <button type="button" class="pick" onclick="pickMonth(RM,m=>{RM=m;render()})">${ic('cal', 18)}<span>${monthName(RM)}</span></button><button class="btn g" onclick="reportPrint(RM)">${ic('dl', 18)} Save PDF report</button></section>
  <section class="card"><div class="row"><h3>Recurring & EMI</h3><button class="chip" onclick="addRec()">${ic('plus', 14)} Add</button></div>
    ${rec.map(r => `<div class="tx first" style="border-top:1px solid var(--line)"><div style="flex:1"><p>${esc(r.name)}</p><p class="mu sm">Every month on the ${r.day_of_month}${['th', 'st', 'nd', 'rd'][(r.day_of_month % 100 > 10 && r.day_of_month % 100 < 14) || r.day_of_month % 10 > 3 ? 0 : r.day_of_month % 10]} · ${MNAME[r.method]}</p></div><b>${inr(r.amount)}</b><button class="ib" onclick="delRec(${r.id})" aria-label="Stop">${ic('x', 16)}</button></div>`).join('') || '<p class="empty">Add a subscription, rent or an EMI once. Finora posts it every month.</p>'}</section>
  <section class="card"><h3>Your data</h3><p class="mu" style="margin-bottom:6px">Stored on this device only (${kb(Local.size())}). If you clear this browser’s data or lose the phone, it is gone, so download a backup now and then.${lb ? ` Last backup: <b style="color:var(--tx)">${lb}</b>.` : ' <b style="color:var(--warn)">No backup yet.</b>'}</p>
    <button class="kv" onclick="downloadBackup()"><span>Download backup</span><span>${ic('dl', 16)}</span></button>
    <button class="kv" onclick="pickRestore()"><span>Restore from backup</span><span>${ic('chev', 14)}</span></button><input type="file" id="restore-f" accept=".json,application/json" hidden>
    <button class="kv" onclick="eraseSheet()"><span class="danger-t">Erase all my entries</span><span>${ic('chev', 14)}</span></button>
    <button class="kv" onclick="resetSheet()"><span class="danger-t">Reset Finora on this device</span><span>${ic('chev', 14)}</span></button></section>
  <section class="card"><h3>About</h3><button class="kv" onclick="finOpen()"><span>Ask Fin (help)</span><span>${ic('chev', 14)}</span></button><button class="kv" onclick="legalSheet('terms')"><span>Terms</span><span>${ic('chev', 14)}</span></button>
    <button class="kv" onclick="legalSheet('privacy')"><span>Privacy</span><span>${ic('chev', 14)}</span></button><button class="kv" onclick="contactSheet()"><span>Contact</span><span>${ic('chev', 14)}</span></button>
    <div class="c mt">${logo(40)}<p class="mu sm mt">Version ${APP.version} · works fully on your device</p></div></section>`;
}

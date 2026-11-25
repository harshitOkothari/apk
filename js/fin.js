/* Fin: the help bot. A little character with a personality, and it can answer from your own data. */
const finFace = (s = 34, mood = '') => `<svg class="fin ${mood}" width="${s}" height="${s}" viewBox="0 0 48 48" aria-label="Fin"><g class="body"><rect x="4" y="4" width="40" height="40" rx="14" fill="#111214"/><rect x="4.5" y="4.5" width="39" height="39" rx="13.5" fill="none" stroke="#fff" stroke-opacity=".14"/>
  <rect class="eye" x="14.5" y="17" width="4.6" height="9" rx="2.3" fill="#F3F3F1"/><rect class="eye r" x="28.9" y="17" width="4.6" height="9" rx="2.3" fill="#F3F3F1"/><path d="M18 33c3.4 2.6 8.6 2.6 12 0" stroke="#3DD6A5" stroke-width="2.4" fill="none" stroke-linecap="round"/></g></svg>`;
const FIN = { msgs: [], busy: false };
const JOKES = ['A budget is just telling your money where to go instead of wondering where it went.', 'My favourite asset class is the one that arrives before the 5th.', 'I do not judge your chai budget. I only record it.', 'Compound interest: the only thing that works harder than you do.'];
const FIN_GO = { tx: () => txSheet(), sent: () => txSheet({ is_send: true }), lend: () => lendSheet(), rem: () => reminderSheet(), cards: () => go('cards'), people: () => go('people'), stats: () => go('analytics'), settings: () => go('settings'), upgrade: () => go('settings'), sms: () => txSheet(), budgets: () => go('budgets'), quick: () => quickAdd() };
const HELP = [
  [/(add|record|enter|log|new).*(expense|payment|spend|spent|transaction)|how.*add/, 'Tap the + button, or just double-tap any empty space. Type the amount, hit Enter, then who you paid. I pick the category for you. If I guessed wrong, tap Change. Takes about 10 seconds.', ['Add one now', 'tx']],
  [/double|quick add|fast|shortcut|gesture|swipe/, 'Double-tap on any empty space (or double-click on a computer) and a small box opens. Type the amount and who it was for, then Save. Takes a few seconds.', ['Try it now', 'quick']],
  [/\bsent\b|send money|to a friend|gave (money|cash)/, 'Use Sent for money you gave a friend that is NOT a loan. It counts as spending, and your charts show their name instead of a shop.', ['Add a Sent', 'sent']],
  [/lend|loan|interest|udhaar|borrow/, 'Tap Lend. Add who, how much, when they will pay back and (if you want) interest per month or year. I work out the total and remind you before the date.', ['Lend money', 'lend']],
  [/split|share (the )?bill|divide/, 'Open any payment and tap Split. Add your friends, and what they owe shows up in People. Your own share is what counts as your spending.', null],
  [/credit|debit|card|bill date|due date/, 'In Cards, add your card with its next bill date (just type it, like 25/12/2026). I remind you before the due date every month. No card added? You can still save payments.', ['Open Cards', 'cards']],
  [/pdf|report|statement|download/, 'Stats and Settings have a Save PDF report button. It opens a clean report: choose Save as PDF in the print screen.', ['Open Stats', 'stats']],
  [/upgrade|\bpro\b|premium|older|history|months|storage|backup|restore|export|lost|delete/, 'Everything is stored on this device only, with no limit and nothing to pay for. Because nothing is online, download a backup now and then: Settings → Your data → Download backup. You can restore it on any phone.', ['Open Settings', 'settings']],
  [/sms|automat|macro|auto/, 'Copy your bank SMS, tap + and choose “Paste a bank SMS instead”. I read the amount and shop for you, right on your phone.', ['Add one now', 'tx']],
  [/\bpin\b|lock|passcode|security/, 'Settings → Security → App lock. It sets a 4-digit PIN that guards Finora on this phone.', ['Settings', 'settings']],
  [/dark|light|theme|colou?r|mode/, 'Settings → Appearance. Light, Dark or follow your phone.', ['Settings', 'settings']],
  [/categor/, 'I guess it from what you type: “lunch” → Food, “uber” → Travel. Change it once and I remember that for next time.', null],
  [/device|login|log in|sync|google|another phone|new phone|account|cloud|online|offline|internet|private|privacy/, 'Finora works fully on your device. No account, no sign-in, no internet needed, and your data never leaves this phone. To move to a new phone: Settings → Your data → Download backup, then Restore on the new one.', ['Open Settings', 'settings']],
  [/remind|alert|notify/, 'I can remind you about card bills, money people owe you, and anything custom. I show it on Home and alert you before the date while the app is open. ⏰', ['Add a reminder', 'rem']],
];
async function finAnswer(raw) {
  const q = raw.toLowerCase().trim(), name = (ME.name || 'friend').split(' ')[0];
  if (/^(hi|hello|hey|yo|sup|hola|namaste|hii+)\b/.test(q)) return { t: `Hello ${name}. I am Fin. Ask me how things work, or about your money, for example “how much on food?”` };
  if (/who are you|your name|what are you|who r u/.test(q)) return { t: "I am Fin, the assistant inside Finora. I know how the app works and I can read your numbers back to you." };
  if (/thank|thanks|thx|\bty\b/.test(q)) return { t: 'Any time.' };
  if (/joke|funny|make me laugh/.test(q)) return { t: JOKES[Math.floor(Math.random() * JOKES.length)] };
  if (/how are you|how r u|kaise ho/.test(q)) return { t: 'Doing well, thank you. How can I help?' };
  if (/who owes|owe me|owes me|udhaar|pay me|to receive|lent to/.test(q)) { const l = (await api('/people')).filter(p => p.balance > 0.5).sort((a, b) => b.balance - a.balance);
    return l.length ? { t: `People owe you ${inr(l.reduce((a, p) => a + p.balance, 0))} in total:\n` + l.slice(0, 5).map(p => `• ${p.name}: ${inr(p.balance)}${p.interest > .5 ? ` (incl. ${inr(p.interest)} interest)` : ''}${p.due ? ` · due ${dmy(p.due)}` : ''}`).join('\n'), go: ['Open People', 'people'] } : { t: 'Nobody owes you anything right now.' }; }
  if (/\bdue\b|upcoming|bills?\b.*(when|soon|due)|next bill|what.*remind/.test(q)) { const a = await api('/alerts');
    return a.length ? { t: 'Coming up:\n' + a.slice(0, 5).map(x => `• ${x.title}${x.amount ? ' (' + inr(x.amount) + ')' : ''}: ${when(x.days)}`).join('\n'), go: ['Open reminders', 'rem'] } : { t: 'Nothing is due in the next week.', go: ['Add a reminder', 'rem'] }; }
  if (/budget|limit|cap/.test(q) && !/how to|how do/.test(q)) { const b = (await api('/budgets?month=' + today().slice(0, 7))).filter(x => x.limit);
    if (!b.length) return { t: "You haven't set any limits yet. Pick a category and give it a cap, and I will warn you at 80%.", go: ['Set limits', 'budgets'] };
    return { t: b.map(x => `• ${x.category}: ${inr(x.spent)} / ${inr(x.limit)} (${pct(x.spent, x.limit)}%)`).join('\n'), go: ['Open limits', 'budgets'] }; }
  if (/how much|spent|spend|kharch|expense|total|saving|saved|left/.test(q) && !/how (do|to|can)/.test(q)) {
    const s = await api('/summary?month=' + today().slice(0, 7)), cat = CATS.find(c => q.includes(c.toLowerCase().split(' ')[0]) && c !== 'Others'), pay = s.payees.find(p => q.includes(p.name.toLowerCase()));
    if (pay) return { t: `You've spent ${inr(pay.amt)} on ${pay.name} this month (${pay.n} time${pay.n > 1 ? 's' : ''}).${pay.is_send ? ' That was money you sent to them.' : ''}` };
    if (/sav|left/.test(q) && !cat) return s.income ? { t: `You got ${inr(s.income)} and spent ${inr(s.total)}, so about ${inr(Math.abs(s.income - s.total))} ${s.income >= s.total ? 'saved' : 'over'}.` } : { t: "I don't see any income this month. Add it with + → Got money, and I'll do the maths." };
    let c = cat; if (!c) { const g = await api('/suggest?text=' + encodeURIComponent(q.replace(/how much|did i|have i|spent?|on|this month|i\b|so far|the/g, ''))); if (g.known) c = g.category; }
    if (c) { const r = s.categories.find(x => x.name === c), amt = r ? r.amt : 0; return { t: `${inr(amt)} on ${c} this month${s.total ? ` (${pct(amt, s.total)}% of your spending)` : ''}.${amt && r.prev ? ` Last month it was ${inr(r.prev)}.` : ''}`, go: ['See Stats', 'stats'] }; }
    if (/sav|left/.test(q)) return s.income ? { t: `You got ${inr(s.income)} and spent ${inr(s.total)}, so about ${inr(s.income - s.total)} ${s.income >= s.total ? 'saved' : 'over'}.` } : { t: "I don't see any income this month. Add it with + → Got money, and I'll do the maths." };
    return { t: `${inr(s.total)} this month so far.${s.forecast ? ` At this pace: about ${inr(s.forecast)} by month end.` : ''}${s.payees[0] ? ` Biggest: ${s.payees[0].name} (${inr(s.payees[0].amt)}).` : ''}`, go: ['See Stats', 'stats'] }; }
  for (const [rx, t, g] of HELP) if (rx.test(q)) return { t, go: g };
  const who = (await api('/people')).find(p => q.includes(p.name.toLowerCase()));
  if (who) return Math.abs(who.balance) < .5 ? { t: `You and ${who.name} are all settled. ✓` } : { t: `${who.balance > 0 ? who.name + ' owes you' : 'You owe ' + who.name} ${inr(Math.abs(who.balance))}${who.interest > .5 ? ` (incl. ${inr(who.interest)} interest)` : ''}.`, go: ['Open People', 'people'] };
  return { t: `I am not sure about that one. Try “how much on food?”, “who owes me?”, “how do I add a payment?” or “tell me a joke”.` };
}
function finDraw() { const c = $('#fin-chat'); if (!c) return;
  c.innerHTML = FIN.msgs.map(m => `<div class="msg ${m.me ? 'me' : 'bot'}">${m.typing ? '<span class="typing"><i></i><i></i><i></i></span>' : esc(m.t)}${m.go ? `<br><button class="go" onclick="FIN_GO['${m.go[1]}']()">${esc(m.go[0])} ${ic('arrow', 14)}</button>` : ''}</div>`).join(''); c.scrollTop = c.scrollHeight;
  const f = $('#fin-face'); if (f) f.innerHTML = finFace(46, FIN.busy ? 'think' : ''); }
async function finSend(text) {
  text = (text || '').trim(); if (!text || FIN.busy) return; $('#fin-in').value = ''; FIN.msgs.push({ me: 1, t: text }); FIN.busy = true; FIN.msgs.push({ typing: 1 }); finDraw();
  let r; try { r = await finAnswer(text); } catch (e) { r = { t: e.message === 'locked_history' ? 'That month is locked on the free plan. Upgrade and I can read it.' : 'Something went wrong. Please try again.' }; }
  await new Promise(ok => setTimeout(ok, 450 + Math.min(r.t.length * 4, 600))); FIN.msgs.pop(); FIN.busy = false; FIN.msgs.push({ t: r.t, go: r.go }); finDraw();
}
function finOpen() {
  const hint = $('#finb .bub'); if (hint) hint.remove(); sessionStorage.setItem('finhint', '1');
  if (!FIN.msgs.length) FIN.msgs.push({ t: `Hey ${(ME.name || 'there').split(' ')[0]}! I'm Fin. Ask me anything about Finora or your money.` });
  openSheet(`<div class="fhead"><span id="fin-face"></span><div><h2>Fin</h2><small>your money buddy · works offline, replies in a blink</small></div></div><div class="chat" id="fin-chat"></div>
    <div class="qs">${['How much did I spend?', 'Who owes me?', 'What is due soon?', 'How do I add a payment?', 'Tell me a joke'].map(t => `<button onclick="finSend(this.textContent)">${t}</button>`).join('')}</div>
    <div class="addrow" style="margin-top:14px"><input id="fin-in" placeholder="Ask Fin…" autocomplete="off" maxlength="120"><button class="btn" data-ok id="fin-go" aria-label="Send">${ic('send', 18)}</button></div>`);
  $('#fin-go').onclick = () => finSend($('#fin-in').value); $('#fin-in').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finSend($('#fin-in').value); } }); finDraw();
}
function finHint() { if (sessionStorage.getItem('finhint') || $('#overlay').classList.contains('show')) return; const b = $('#finb'); if (!b || $('#gate').classList.contains('show')) return;
  const lines = ['Need a hand?', 'Ask Fin anything', 'Questions about your money?']; b.insertAdjacentHTML('beforeend', `<span class="bub">${lines[new Date().getMinutes() % 3]}</span>`); sessionStorage.setItem('finhint', '1'); setTimeout(() => { const x = $('#finb .bub'); if (x) x.remove(); }, 5000); }

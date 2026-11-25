/* Privacy policy, terms and contact. One source of truth: used inside the app and by privacy.html and terms.html. */
const CONTACT_EMAIL = 'notes.piles@gmail.com';
const LEGAL_UPDATED = '24 November 2026';
const LEGAL = {
  privacy: { title: 'Privacy Policy', intro: 'Finora helps you track your own money, and it works entirely on your device. This policy explains, in plain words, what is stored, where, and the choices you have.', sections: [
    ['The short version', { ul: ['Everything you enter stays on <b>this device</b>, inside this browser’s own storage.', 'There is <b>no account</b>, no sign-in and no Finora server that receives your data.', 'We cannot see, read, recover or sell your data, because we never have it.', 'No ads, no trackers, no analytics.'] }],
    ['What is stored on your device', { ul: [
      '<b>Your entries:</b> payments and income (amount, date, who or where, category, notes, payment method), cards (a name and the last 4 digits only), people you lend to or split with, loan terms such as interest and repayment dates, limits, investments and reminders.',
      '<b>Your settings:</b> your name, monthly goal, light or dark choice, reminder preference and, if you turn on app lock, a scrambled (hashed) copy of your PIN.',
      '<b>App files:</b> the app saves its own pages in your browser so it can open without internet.'] }],
    ['What we never collect', { p: 'Full card numbers, CVV codes, card or bank PINs, OTPs, or your bank or UPI app passwords. Finora does not ask for your contacts, location, camera or microphone, and it does not read your SMS. If you paste a bank message to fill in an entry, it is read on your device and only the details you confirm are kept.' }],
    ['Does anything leave your device?', { ul: ['Finora makes no network requests for your data. The app is built to run offline.', 'The page that delivers the app (the website host) may keep ordinary server logs when you first open or update the app, such as your IP address. These logs never include your entries.', 'If you press Save PDF report, the report is made on your device and opened in your browser’s print screen. If you press Download backup, a file is saved to your device. What you do with those files is up to you.', 'If you tap a link such as email or WhatsApp (for example, “Nudge”), the app you pick receives only what you chose to send.'] }],
    ['Keeping your data safe', { ul: ['Because data lives only on your device, <b>clearing this browser’s site data, uninstalling the app or losing the phone will erase it</b>. Download a backup from Settings now and then.', 'App lock is a convenience that hides Finora on your own device. It is not a replacement for locking your phone.', 'Anyone who can unlock your device and open your browser may be able to see your entries.', 'Backup files are not encrypted. Keep them somewhere private.'] }],
    ['Your choices and rights', { ul: ['<b>See and keep your data:</b> Settings, then Your data, then Download backup.', '<b>Correct or delete:</b> edit or delete any entry, erase all entries, or reset Finora completely in Settings.', '<b>Control alerts:</b> turn device alerts on or off in Settings or in your browser’s site settings.'] }],
    ['Children', { p: 'Finora is for people aged 18 and over.' }],
    ['Changes to this policy', { p: 'If we make important changes we will update the date above and show a note in the app.' }],
    ['Contact', { p: `Questions: ${CONTACT_EMAIL}.` }]] },
  terms: { title: 'Terms of Use', intro: 'These terms are the agreement between you and Finora. By using Finora you agree to them. If you do not agree, please do not use the app.', sections: [
    ['Who can use Finora', { p: 'You must be 18 or older and able to enter into a binding agreement.' }],
    ['What Finora is, and is not', { ul: ['Finora is a personal tool for tracking and understanding your own money, on your own device.', 'It is not a bank, a payment service, a lender, or a financial, tax or legal adviser. Finora never moves money.', 'What you see depends on what you enter or confirm. Check important figures yourself.', 'Interest and repayment figures are simple estimates to help you remember. They are not a legal record or a contract between you and another person.', 'Reports are personal summaries, not bank statements.'] }],
    ['Your data', { p: 'Your records are yours and stay on your device. We do not receive them. You are responsible for the information you enter, including names and details of other people, and for keeping your own backups.' }],
    ['Reminders and alerts', { p: 'Alerts are shown by your browser while Finora is open, and can be delayed, blocked by your device settings, or fail. Please do not rely on them as your only way of remembering a payment.' }],
    ['Using Finora fairly', { p: 'Please do not:', ul: ['break the law or use Finora to record or hide illegal activity;', 'copy, resell or reverse engineer the app, except where the law allows.'] }],
    ['Availability and changes', { p: 'Finora is provided as it is and may change. Because it runs on your device, it keeps working offline, but updates are delivered when you next open it with internet.' }],
    ['No warranties', { p: 'To the fullest extent the law allows, Finora is provided “as is” and “as available”, without promises that it will be error-free, uninterrupted or suitable for a particular purpose.' }],
    ['Limit of liability', { p: 'To the fullest extent the law allows, we are not responsible for indirect or consequential losses, lost profits, or lost data, including data lost because browser storage was cleared or a device was lost. Nothing in these terms limits responsibility that cannot be limited by law.' }],
    ['Governing law', { p: 'These terms are governed by the laws of India, and the courts of India have jurisdiction.' }],
    ['Changes to these terms', { p: 'We may update these terms. Continuing to use Finora after a change means you accept it.' }],
    ['Contact', { p: `Questions about these terms: ${CONTACT_EMAIL}.` }]] },
};
function legalHtml(k) {
  const d = LEGAL[k];
  return `<p class="when">Last updated ${LEGAL_UPDATED}</p><p>${d.intro}</p>` + d.sections.map(([h, b], i) => `<h4>${i + 1}. ${h}</h4>${b.p ? `<p>${b.p}</p>` : ''}${b.ul ? `<ul>${b.ul.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}${b.p2 ? `<p style="margin-top:8px">${b.p2}</p>` : ''}`).join('');
}
function legalSheet(k) { openSheet(`<h3>${LEGAL[k].title}</h3><div class="doc">${legalHtml(k)}</div><a class="btn ghost small mt" style="margin-top:18px" href="${k === 'terms' ? 'terms' : 'privacy'}.html" target="_blank" rel="noopener">Open as a full page</a>`); }
/* Contact is just an email address. Nothing is sent from the app; your own mail app opens if you choose. */
function contactSheet() {
  openSheet(`<h3>Contact</h3><p class="mu">Questions, ideas or bugs? Email us. Finora itself sends nothing, so please do not include anything private you do not want to share.</p>
    <div class="mailrow" style="margin-top:12px"><span class="gi">${ic('mail', 18)}</span><span><b>${CONTACT_EMAIL}</b><small>We reply by email</small></span></div>
    <div class="acts" style="margin-top:12px"><a class="btn ghost small g" href="mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Finora help')}">${ic('mail', 16)} Open mail app</a><button type="button" class="btn ghost small g" onclick="copyText('${CONTACT_EMAIL}')">Copy address</button></div>`);
}

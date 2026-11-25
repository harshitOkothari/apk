# Finora (on-device edition)

Runs 100% on your device. No server, no database, no account, no internet needed after the first load.
Everything you enter is saved only in this browser's own storage (localStorage).

## Run it
Needs to be served over http(s) once so it can install and work offline:

    cd finora-local
    python3 -m http.server 8000      # then open http://localhost:8000

Or upload this folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, Vercel).
The host only delivers the files; it never receives your data.
On a phone: open the site, then "Add to Home Screen".

## Double-tap to add
Double-tap (double-click on desktop) any empty space: a popup opens for amount, who, and Save.
Buttons, cards, charts and inputs are ignored, so it never fires by accident. Also available
as a home-screen shortcut (long-press the icon) and via `?add=1`.

## Your data
Clearing browser data / losing the phone erases it. Settings -> Your data -> Download backup,
and Restore on a new device.

## What changed vs the server version
- js/local.js replaces the whole Python backend (same parsing, interest, EMI, insights logic; verified
  against the original on the same inputs).
- Removed: login/signup/Google, Pro plan, email reminders, server PDF, SMS-forwarding endpoint.
- PDF report now builds on-device (print dialog -> Save as PDF).
- No external fonts/logos/scripts; a Content-Security-Policy blocks all outside connections.
- The `android/` wrapper was not part of this change and still points at the old server.

# migraine-tracker

A privacy-first migraine tracker focused on useful clinical data, fast daily logging, and actionable reporting.

## What this implementation includes

- Structured migraine diary fields:
  - Date/time start, duration, pain level, food notes, hydration, sleep, activity impact
  - Rescue medication + effectiveness
  - Suspected triggers
  - Optional ICHD-3-aligned symptom/attack characteristics (nausea, photophobia, phonophobia, aura, unilateral/pulsating/etc.)
- UX for fast logging:
  - Quick log flow with optional detailed clinical fields
  - Low-friction local edit/delete
  - Calendar and timeline views
  - Streak output
  - Browser reminder support
- Reporting:
  - 30/60/90 day summaries
  - Severity, duration, med response, top triggers/foods
  - Correlation-style pattern signals with confidence labels and non-causal framing
  - Printable report for PDF generation (`Print/PDF report`)
  - Raw CSV export
- Clinical scores:
  - HIT-6 calculator
  - MIDAS calculator
- Privacy/storage:
  - Local-first storage (browser localStorage)
  - Optional Google Drive backup/restore with least-privilege scopes (`drive.file` + `drive.appdata`)
  - Client-side AES-GCM encryption before cloud upload
  - Local data deletion controls

## Run locally

No build tooling is required.

1. Open `index.html` in a modern browser.
2. Start logging entries.

## Google Drive setup (optional)

To enable Drive backup/restore:

1. Create a Google OAuth client ID for a web app.
2. Enter your client ID in the **Google OAuth Client ID** field, then click **Connect Google Drive**.
3. Enter an encryption passphrase before backup/restore actions.

Notes:
- Data is encrypted in-browser before upload.
- Backup is stored in the app data area pattern (`appDataFolder` parent) and accessed via OAuth scopes.

## Important compliance caveat

This implementation is for wellness/self-tracking use and does **not** claim HIPAA-compliant clinical deployment by itself.
For HIPAA-covered PHI workflows in the U.S., a compliant architecture is required (e.g., proper covered services, BAA, audit controls, governance).

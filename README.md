# Migraine Tracker

Migraine Tracker is a privacy-first web app for logging episodes, spotting patterns, and creating easy-to-share reports.

**Live site:** https://migraintrack.com

## Highlights

- Fast episode logging with pain, duration, triggers, medication response, hydration, sleep, and symptom details
- Theme support with light, dark, or system mode
- Expanded episode context with stress level and hormonal cycle phase logging
- Personal dashboard with recent episodes, streaks, and 30-day summary stats
- Printable 30/60/90 day reports plus CSV export
- HIT-6 and MIDAS assessments
- Local-first data storage in the browser
- Optional encrypted Google Drive backup and restore
- Installable PWA with offline support and reminder-friendly settings

## Privacy

Migraine Tracker stores data locally on your device by default. Cloud backup is optional, and backup payloads are encrypted in the browser before upload.

## Tech stack

- React 18
- Vite 5
- Tailwind CSS 3
- Lucide React

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Run locally

```bash
npm ci
npm run dev
```

Open the local Vite URL shown in your terminal.

### Create a production build

```bash
npm run build
```

The production-ready files are generated in `dist/`.

### Preview the production build

```bash
npm run preview
```

## Optional Google Drive backup

To enable encrypted backup and restore:

1. Create a Google OAuth client ID for a web application.
2. Paste the client ID into **Settings → Privacy & backup**.
3. Connect Google Drive.
4. Enter an encryption passphrase before running backup or restore.

Backups are encrypted before upload and saved in the app’s private Drive storage area.
Drive connection stays active only for the current browser session, so you may need
to reconnect Google Drive after restarting your browser or app.

## Deployment

GitHub Actions builds the app and updates the generated `dist/` assets used for deployment.

## Disclaimer

Migraine Tracker is intended for personal wellness and self-tracking. It is not a substitute for medical advice, diagnosis, or treatment, and it is not presented as a HIPAA-compliant clinical system by itself.

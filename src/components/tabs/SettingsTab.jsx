import { useState, useRef } from 'react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import { PREF_KEY, STORAGE_KEY, ONBOARDING_KEY } from '../../utils/storage'
import { encryptString, decryptString } from '../../utils/crypto'
import { startOAuthFlow, unlinkDrive, isDriveLinked } from '../../utils/googleDrive'
import { Settings, Shield, Trash2, CloudUpload, CloudDownload, Link2, LogOut, Download } from 'lucide-react'

const BACKUP_FILE = 'migraine-tracker-encrypted-backup.json'
const LANGUAGES   = [
  { value: 'en', label: 'English'  },
  { value: 'es', label: 'Español'  },
  { value: 'fr', label: 'Français' }
]

export default function SettingsTab({
  preferences, savePreferences, entries, replaceAll, addToast,
  driveToken, setDriveToken, pwaPrompt, onPwaInstalled,
}) {
  const [form,       setFormState] = useState({ ...preferences })
  const [passphrase, setPassphrase]= useState('')
  const [saving,     setSaving]    = useState(false)
  const timerRef = useRef(null)

  const linked    = isDriveLinked()
  const connected = Boolean(driveToken)

  const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

  function setForm(k, v) { setFormState(p => ({ ...p, [k]: v })) }

  function scheduleReminder(time) {
    if (!('Notification' in window)) return
    if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null }
    Notification.requestPermission().then(result => {
      if (result !== 'granted') return
      const [h, m] = time.split(':').map(Number)
      const now = new Date(), next = new Date()
      next.setHours(h, m, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        new Notification('Migraine Tracker reminder', { body: 'Log today\'s data if applicable.' })
      }, Math.min(next.getTime() - now.getTime(), 2147483647))
    })
  }

  function savePrefs() {
    savePreferences(form)
    scheduleReminder(form.reminderTime)
    addToast('Preferences saved!')
  }

  function connectDrive() {
    startOAuthFlow().catch(err => addToast(err.message, 'error'))
  }

  function disconnectDrive() {
    if (!confirm('Disconnect Google Drive? The app will no longer sync backups automatically.')) return
    unlinkDrive()
    setDriveToken(null)
    addToast('Google Drive disconnected.')
  }

  async function backup() {
    if (!connected) { addToast('Connect Google Drive first.', 'warning'); return }
    if (!passphrase) { addToast('Enter an encryption passphrase.', 'warning'); return }
    setSaving(true)
    try {
      const payload   = JSON.stringify({ entries, preferences })
      const encrypted = await encryptString(payload, passphrase)
      const body = new FormData()
      body.append('metadata', new Blob([JSON.stringify({ name: BACKUP_FILE, parents: ['appDataFolder'] })], { type: 'application/json' }))
      body.append('file',     new Blob([JSON.stringify(encrypted)], { type: 'application/json' }))
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${driveToken}` },
        body,
      })
      if (!res.ok) throw new Error(`Upload error ${res.status}`)
      addToast('Backup uploaded to Drive!')
    } catch (e) { addToast(`Backup failed: ${e.message}`, 'error') }
    setSaving(false)
  }

  async function restore() {
    if (!connected) { addToast('Connect Google Drive first.', 'warning'); return }
    if (!passphrase) { addToast('Enter the encryption passphrase.', 'warning'); return }
    try {
      const q = encodeURIComponent(`name='${BACKUP_FILE}' and 'appDataFolder' in parents`)
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=appDataFolder&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
        { headers: { Authorization: `Bearer ${driveToken}` } }
      )
      const { files } = await searchRes.json()
      if (!files?.[0]) { addToast('No backup found in Drive.', 'warning'); return }
      const fileRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${files[0].id}?alt=media`,
        { headers: { Authorization: `Bearer ${driveToken}` } }
      )
      const enc  = await fileRes.json()
      const dec  = await decryptString(enc, passphrase)
      const data = JSON.parse(dec)
      replaceAll(data.entries || [])
      savePreferences({ ...preferences, ...(data.preferences || {}) })
      addToast('Restore complete!')
    } catch { addToast('Restore failed. Check your passphrase.', 'error') }
  }

  async function installPwa() {
    if (!pwaPrompt) return
    pwaPrompt.prompt()
    const { outcome } = await pwaPrompt.userChoice
    if (outcome === 'accepted') {
      onPwaInstalled?.()
      addToast('App installed!')
    }
  }

  function deleteAll() {
    if (!confirm('Delete ALL local migraine data and preferences? This cannot be undone.')) return
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(PREF_KEY)
    localStorage.removeItem(ONBOARDING_KEY)
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      {/* Preferences */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-slate-800">Preferences</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Your name</label>
            <input value={form.name || ''} onChange={e => setForm('name', e.target.value)}
              placeholder="Optional" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Language</label>
            <select value={form.language} onChange={e => setForm('language', e.target.value)} className={inputCls}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Timezone</label>
            <input value={form.timezone} readOnly className={inputCls + ' bg-slate-50'} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Daily reminder time</label>
            <input type="time" value={form.reminderTime}
              onChange={e => setForm('reminderTime', e.target.value)} className={inputCls} />
          </div>
        </div>
        <Button onClick={savePrefs} className="mt-4">Save preferences</Button>
      </Card>

      {/* Backup */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-slate-800">Privacy &amp; backup</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          All data is stored locally by default. Connect Google Drive to enable
          encrypted cloud backup. Your passphrase encrypts data before it ever
          leaves your device — even the app cannot read it.
        </p>

        {/* Drive connection status */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : linked ? 'bg-amber-400' : 'bg-slate-300'}`} />
          <span className="text-xs text-slate-500">
            {connected ? 'Drive connected' : linked ? 'Reconnecting…' : 'Drive not connected'}
          </span>
        </div>

        <div className="space-y-3">
          {!linked ? (
            <Button variant="secondary" onClick={connectDrive}>
              <Link2 className="w-4 h-4" /> Connect Google Drive
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={disconnectDrive}>
                <LogOut className="w-4 h-4" /> Disconnect Drive
              </Button>
            </div>
          )}

          {linked && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Encryption passphrase</label>
                <input type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)}
                  placeholder="Strong passphrase (never stored)" className={inputCls} />
                <p className="text-xs text-slate-400 mt-1">
                  Required for each backup/restore. Keep it safe — lost passphrases cannot be recovered.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={backup} disabled={saving}>
                  <CloudUpload className="w-4 h-4" /> {saving ? 'Uploading…' : 'Backup now'}
                </Button>
                <Button variant="secondary" onClick={restore}>
                  <CloudDownload className="w-4 h-4" /> Restore
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Install app */}
      {pwaPrompt && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-slate-800">Install app</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Install Migraine Tracker on your device for a faster, offline-ready experience.
          </p>
          <Button onClick={installPwa}>
            <Download className="w-4 h-4" /> Install app
          </Button>
        </Card>
      )}

      {/* Danger zone */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="w-4 h-4 text-red-400" />
          <h3 className="font-semibold text-slate-800">Danger zone</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Permanently delete all local data including entries and preferences.
        </p>
        <Button variant="danger" onClick={deleteAll}>
          <Trash2 className="w-4 h-4" /> Delete all data
        </Button>
      </Card>
    </div>
  )
}

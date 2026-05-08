import { useState, useRef } from 'react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import { PREF_KEY, STORAGE_KEY, ONBOARDING_KEY } from '../../utils/storage'
import { encryptString, decryptString } from '../../utils/crypto'
import { Settings, Shield, Trash2, CloudUpload, CloudDownload, Link2 } from 'lucide-react'

const BACKUP_FILE = 'migraine-tracker-encrypted-backup.json'
const LANGUAGES   = [
  { value: 'en', label: 'English'  },
  { value: 'es', label: 'Español'  },
  { value: 'fr', label: 'Français' }
]

export default function SettingsTab({ preferences, savePreferences, entries, replaceAll, addToast }) {
  const [form,        setFormState] = useState({ ...preferences })
  const [clientId,    setClientId]  = useState('')
  const [passphrase,  setPassphrase]= useState('')
  const [driveStatus, setDriveStatus] = useState('Not connected')
  const [token,       setToken]     = useState(null)
  const [saving,      setSaving]    = useState(false)
  const timerRef = useRef(null)

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

  async function connectDrive() {
    if (!window.google?.accounts?.oauth2) { addToast('Google Identity unavailable.', 'error'); return }
    const id = clientId.trim()
    if (!id) { addToast('Enter your Google OAuth Client ID first.', 'warning'); return }
    const tc = google.accounts.oauth2.initTokenClient({
      client_id: id,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata',
      callback: r => { setToken(r.access_token); setDriveStatus('Connected ✓') }
    })
    tc.requestAccessToken({ prompt: 'consent' })
  }

  async function backup() {
    if (!token)      { addToast('Connect Google Drive first.', 'warning'); return }
    if (!passphrase) { addToast('Enter a passphrase.', 'warning'); return }
    setSaving(true)
    try {
      const payload   = JSON.stringify({ entries, preferences })
      const encrypted = await encryptString(payload, passphrase)
      const body = new FormData()
      body.append('metadata', new Blob([JSON.stringify({ name: BACKUP_FILE, parents: ['appDataFolder'] })], { type: 'application/json' }))
      body.append('file',     new Blob([JSON.stringify(encrypted)],  { type: 'application/json' }))
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body
      })
      addToast('Backup uploaded to Drive!')
    } catch { addToast('Backup failed.', 'error') }
    setSaving(false)
  }

  async function restore() {
    if (!token)      { addToast('Connect Google Drive first.', 'warning'); return }
    if (!passphrase) { addToast('Enter a passphrase.', 'warning'); return }
    try {
      const q = encodeURIComponent(`name='${BACKUP_FILE}' and 'appDataFolder' in parents`)
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=appDataFolder&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const { files } = await searchRes.json()
      if (!files?.[0]) { addToast('No backup found.', 'warning'); return }
      const fileRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${files[0].id}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const enc  = await fileRes.json()
      const dec  = await decryptString(enc, passphrase)
      const data = JSON.parse(dec)
      replaceAll(data.entries || [])
      savePreferences({ ...preferences, ...(data.preferences || {}) })
      addToast('Restore complete!')
    } catch { addToast('Restore failed. Check passphrase.', 'error') }
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
          Data is stored locally by default. Enable encrypted Google Drive backup for cloud sync.
          For HIPAA-covered workflows, ensure a properly compliant setup.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Google OAuth Client ID (optional)</label>
            <input value={clientId} onChange={e => setClientId(e.target.value)}
              placeholder="Paste your OAuth Client ID" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Encryption passphrase</label>
            <input type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)}
              placeholder="Strong passphrase" className={inputCls} />
          </div>
          <p className="text-xs text-slate-400">Drive status: {driveStatus}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={connectDrive}>
              <Link2 className="w-4 h-4" /> Connect Drive
            </Button>
            <Button variant="secondary" onClick={backup} disabled={saving}>
              <CloudUpload className="w-4 h-4" /> {saving ? 'Uploading…' : 'Backup'}
            </Button>
            <Button variant="secondary" onClick={restore}>
              <CloudDownload className="w-4 h-4" /> Restore
            </Button>
          </div>
        </div>
      </Card>

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

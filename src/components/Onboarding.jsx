import { useState } from 'react'
import { markOnboardingDone } from '../utils/storage'
import Button from './shared/Button'
import { Brain, Globe, Bell, ArrowRight, CheckCircle, Download } from 'lucide-react'

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' }
]
const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

// Build timezone list with graceful fallback for older browsers
const TZ_LIST = (() => {
  try { return Intl.supportedValuesOf('timeZone') } catch { return [] }
})()

const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400'
const selectCls = inputCls

export default function Onboarding({ preferences, savePreferences, pwaPrompt, onPwaInstalled, onDone }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name:         preferences.name || '',
    language:     preferences.language || 'en',
    theme:        preferences.theme || 'system',
    timezone:     preferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    reminderTime: preferences.reminderTime || '20:00'
  })

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function finish() {
    savePreferences(form)
    markOnboardingDone()
    onDone()
  }

  const [pwaInstalled, setPwaInstalled] = useState(false)

  async function handleInstall() {
    if (!pwaPrompt) return
    pwaPrompt.prompt()
    const { outcome } = await pwaPrompt.userChoice
    if (outcome === 'accepted') {
      setPwaInstalled(true)
      onPwaInstalled?.()
    }
  }

  const BASE_STEPS = [
    {
      icon: <Brain className="w-16 h-16 text-indigo-500" />,
      title: 'Welcome to Migraine Tracker',
      sub:   'Your private, clinician-ready migraine diary. Track patterns, understand triggers, share insights with your doctor.',
      body: (
        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          {[
            'Log episodes in under 60 seconds',
            'Spot patterns with smart insights',
            'Generate clinician-ready PDF reports',
            'Your data stays private on your device'
          ].map(f => (
            <li key={f} className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      )
    },
    {
      icon: <Globe className="w-12 h-12 text-indigo-500" />,
      title: 'Personalise your experience',
      sub:   'Set your name and region so reports feel like yours.',
      body: (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Your name (optional)</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Alex" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Language</label>
            <select value={form.language} onChange={e => set('language', e.target.value)} className={selectCls}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Theme</label>
            <select value={form.theme} onChange={e => set('theme', e.target.value)} className={selectCls}>
              {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Timezone</label>
            {TZ_LIST.length > 0 ? (
              <select value={form.timezone} onChange={e => set('timezone', e.target.value)} className={selectCls}>
                {TZ_LIST.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            ) : (
              <input value={form.timezone} readOnly className={inputCls + ' bg-slate-50 dark:bg-slate-800'} />
            )}
          </div>
        </div>
      )
    },
    {
      icon: <Bell className="w-12 h-12 text-indigo-500" />,
      title: 'Daily reminder',
      sub:   'Get a gentle nudge to log your data each day.',
      body: (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Reminder time</label>
            <input type="time" value={form.reminderTime}
              onChange={e => set('reminderTime', e.target.value)} className={inputCls} />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            You can change this anytime in Settings. Notifications require browser permission when saving.
          </p>
        </div>
      )
    }
  ]

  const INSTALL_STEP = {
    icon: <Download className="w-12 h-12 text-indigo-500" />,
    title: 'Install the app',
    sub:   'Add Migraine Tracker to your home screen for instant access, even offline.',
    body: (
      <div className="space-y-4 text-center">
        {pwaInstalled ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">App installed successfully!</p>
          </div>
        ) : (
          <>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 text-left">
              {['Works offline', 'No app store required', 'Instant launch from home screen'].map(f => (
                <li key={f} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button onClick={handleInstall} className="w-full justify-center">
              <Download className="w-4 h-4" /> Install now
            </Button>
            <p className="text-xs text-slate-400 dark:text-slate-500">You can also install later from Settings.</p>
          </>
        )}
      </div>
    )
  }

  const STEPS = pwaPrompt ? [...BASE_STEPS, INSTALL_STEP] : BASE_STEPS

  const current  = STEPS[step]
  const isLast   = step === STEPS.length - 1
  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
        {/* Progress bar */}
        <div className="h-1 bg-slate-100 dark:bg-slate-800">
          <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="p-8">
          {/* Step dots */}
          <div className="flex gap-1.5 mb-8">
            {STEPS.map((_, i) => (
              <div key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                />
              ))}
            </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">{current.icon}</div>

          {/* Title + subtitle */}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mb-2">{current.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">{current.sub}</p>

          {/* Step body */}
          <div className="mb-8">{current.body}</div>

          {/* Actions */}
          <div className="flex gap-3">
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep(s => s - 1)} className="flex-1">
                Back
              </Button>
            )}
            <Button onClick={isLast ? finish : () => setStep(s => s + 1)} className="flex-1 justify-center">
              {isLast ? 'Get started' : 'Next'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

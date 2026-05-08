import { useState } from 'react'
import { PREF_KEY, loadJson, saveJson } from '../utils/storage'

const DEFAULTS = {
  name: '',
  language: 'en',
  reminderTime: '20:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function usePreferences() {
  const [preferences, setPreferences] = useState(() => ({ ...DEFAULTS, ...loadJson(PREF_KEY, {}) }))

  function savePreferences(patch) {
    const merged = { ...preferences, ...patch }
    setPreferences(merged)
    saveJson(PREF_KEY, merged)
    return merged
  }

  return { preferences, savePreferences }
}

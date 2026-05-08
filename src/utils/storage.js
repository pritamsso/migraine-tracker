export const STORAGE_KEY = 'migraineTracker.entries.v1'
export const PREF_KEY = 'migraineTracker.preferences.v1'
export const ONBOARDING_KEY = 'migraineTracker.onboarded.v1'

export function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

export function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function isOnboardingDone() {
  return Boolean(localStorage.getItem(ONBOARDING_KEY))
}

export function markOnboardingDone() {
  localStorage.setItem(ONBOARDING_KEY, '1')
}

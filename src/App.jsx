import { useState, useEffect } from 'react'
import { isOnboardingDone } from './utils/storage'
import { handleOAuthCallback, refreshAccessToken, isDriveLinked } from './utils/googleDrive'
import { useEntries }     from './hooks/useEntries'
import { usePreferences } from './hooks/usePreferences'
import { useToast }       from './hooks/useToast'
import Onboarding         from './components/Onboarding'
import Layout             from './components/Layout'
import Toast              from './components/shared/Toast'

export default function App() {
  const [onboarded,   setOnboarded]   = useState(() => isOnboardingDone())
  const [driveToken,  setDriveToken]  = useState(null)
  const [defaultTab,  setDefaultTab]  = useState('dashboard')
  const [pwaPrompt,   setPwaPrompt]   = useState(null)

  const { entries, addEntry, updateEntry, removeEntry, replaceAll } = useEntries()
  const { preferences, savePreferences } = usePreferences()
  const { toasts, addToast } = useToast()

  // Handle OAuth redirect callback or silently refresh on load
  useEffect(() => {
    if (window.location.search.includes('code=')) {
      handleOAuthCallback()
        .then(token => {
          if (token) {
            setDriveToken(token)
            setDefaultTab('settings')
            addToast('Google Drive connected!')
          }
        })
        .catch(err => addToast(err.message, 'error'))
    } else if (isDriveLinked()) {
      refreshAccessToken().then(token => { if (token) setDriveToken(token) })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Capture the PWA install prompt so we can show it at the right moment
  useEffect(() => {
    const handler = e => { e.preventDefault(); setPwaPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!onboarded) {
    return (
      <>
        <Onboarding
          preferences={preferences}
          savePreferences={savePreferences}
          pwaPrompt={pwaPrompt}
          onPwaInstalled={() => setPwaPrompt(null)}
          onDone={() => setOnboarded(true)}
        />
        <Toast toasts={toasts} />
      </>
    )
  }

  return (
    <>
      <Layout
        entries={entries}
        addEntry={addEntry}
        updateEntry={updateEntry}
        removeEntry={removeEntry}
        replaceAll={replaceAll}
        preferences={preferences}
        savePreferences={savePreferences}
        addToast={addToast}
        driveToken={driveToken}
        setDriveToken={setDriveToken}
        pwaPrompt={pwaPrompt}
        onPwaInstalled={() => setPwaPrompt(null)}
        defaultTab={defaultTab}
      />
      <Toast toasts={toasts} />
    </>
  )
}

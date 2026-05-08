import { useState } from 'react'
import { isOnboardingDone } from './utils/storage'
import { useEntries }     from './hooks/useEntries'
import { usePreferences } from './hooks/usePreferences'
import { useToast }       from './hooks/useToast'
import Onboarding         from './components/Onboarding'
import Layout             from './components/Layout'
import Toast              from './components/shared/Toast'

export default function App() {
  const [onboarded, setOnboarded] = useState(() => isOnboardingDone())
  const { entries, addEntry, updateEntry, removeEntry, replaceAll } = useEntries()
  const { preferences, savePreferences } = usePreferences()
  const { toasts, addToast } = useToast()

  if (!onboarded) {
    return (
      <>
        <Onboarding
          preferences={preferences}
          savePreferences={savePreferences}
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
      />
      <Toast toasts={toasts} />
    </>
  )
}

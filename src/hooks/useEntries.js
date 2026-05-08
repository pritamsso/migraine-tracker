import { useState } from 'react'
import { STORAGE_KEY, loadJson, saveJson } from '../utils/storage'

export function useEntries() {
  const [entries, setEntries] = useState(() => loadJson(STORAGE_KEY, []))

  function persist(updater) {
    setEntries(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater
      saveJson(STORAGE_KEY, updated)
      return updated
    })
  }

  return {
    entries,
    addEntry:    entry   => persist(prev => [entry, ...prev]),
    updateEntry: entry   => persist(prev => prev.map(e => e.id === entry.id ? entry : e)),
    removeEntry: id      => persist(prev => prev.filter(e => e.id !== id)),
    replaceAll:  arr     => persist(arr)
  }
}

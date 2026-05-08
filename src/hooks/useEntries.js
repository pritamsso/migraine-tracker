import { useState } from 'react'
import { STORAGE_KEY, loadJson, saveJson } from '../utils/storage'

export function useEntries() {
  const [entries, setEntries] = useState(() => loadJson(STORAGE_KEY, []))

  function persist(updated) {
    setEntries(updated)
    saveJson(STORAGE_KEY, updated)
  }

  return {
    entries,
    addEntry:    entry   => persist([entry, ...entries]),
    updateEntry: entry   => persist(entries.map(e => e.id === entry.id ? entry : e)),
    removeEntry: id      => persist(entries.filter(e => e.id !== id)),
    replaceAll:  arr     => persist(arr)
  }
}

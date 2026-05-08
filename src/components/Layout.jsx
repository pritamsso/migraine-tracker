import { useState } from 'react'
import { LayoutDashboard, Plus, History, BarChart2, Stethoscope, Settings } from 'lucide-react'
import Dashboard   from './tabs/Dashboard'
import LogEntry    from './tabs/LogEntry'
import HistoryTab  from './tabs/HistoryTab'
import Reports     from './tabs/Reports'
import Assessments from './tabs/Assessments'
import SettingsTab from './tabs/SettingsTab'

const TABS = [
  { id: 'dashboard', label: 'Home',     Icon: LayoutDashboard },
  { id: 'log',       label: 'Log',      Icon: Plus            },
  { id: 'history',   label: 'History',  Icon: History         },
  { id: 'reports',   label: 'Reports',  Icon: BarChart2       },
  { id: 'assess',    label: 'Assess',   Icon: Stethoscope     },
  { id: 'settings',  label: 'Settings', Icon: Settings        }
]

export default function Layout({
  entries, addEntry, updateEntry, removeEntry, replaceAll,
  preferences, savePreferences, addToast
}) {
  const [activeTab, setActiveTab]   = useState('dashboard')
  const [editingEntry, setEditingEntry] = useState(null)

  function startEdit(entry) {
    setEditingEntry(entry)
    setActiveTab('log')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const props = {
    entries, addEntry, updateEntry, removeEntry, replaceAll,
    preferences, savePreferences, addToast,
    editingEntry, setEditingEntry, setActiveTab
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 leading-tight">Migraine Tracker</h1>
              {preferences.name && (
                <p className="text-xs text-slate-400 leading-tight">Hi, {preferences.name}</p>
              )}
            </div>
          </div>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6 pb-28">
        {activeTab === 'dashboard' && <Dashboard {...props} />}
        {activeTab === 'log'       && <LogEntry  {...props} />}
        {activeTab === 'history'   && <HistoryTab {...props} onEdit={startEdit} />}
        {activeTab === 'reports'   && <Reports    {...props} />}
        {activeTab === 'assess'    && <Assessments {...props} />}
        {activeTab === 'settings'  && <SettingsTab {...props} />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-30 safe-bottom">
        <div className="flex">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                activeTab === id ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <Icon className={`w-5 h-5 ${activeTab === id ? 'text-indigo-500' : ''}`} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

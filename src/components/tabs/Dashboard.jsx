import { useMemo } from 'react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import PainBadge from '../shared/PainBadge'
import { Activity, TrendingDown, Calendar, Heart, Plus } from 'lucide-react'

export default function Dashboard({ entries, preferences, setActiveTab }) {
  const stats = useMemo(() => {
    if (!entries.length) return null
    const now = Date.now()
    const last30 = entries.filter(e => new Date(e.startTime).getTime() >= now - 30 * 864e5)
    const migraineDays = new Set(last30.map(e => e.startTime?.slice(0, 10))).size
    const headacheFreeDays = Math.max(0, 30 - migraineDays)
    const avgPain = last30.length
      ? (last30.reduce((s, e) => s + e.painLevel, 0) / last30.length).toFixed(1)
      : '—'
    return { migraineDays, headacheFreeDays, avgPain, total: last30.length }
  }, [entries])

  const recent = entries.slice(0, 5)

  return (
    <div className="space-y-4">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl p-5 text-white">
        <p className="text-indigo-100 text-sm">
          {preferences.name ? `Welcome back, ${preferences.name} 👋` : 'Welcome back 👋'}
        </p>
        <h2 className="text-xl font-bold mt-1">Your migraine dashboard</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('log')}
          className="mt-3 bg-white/20 hover:bg-white/30 text-white border-0"
        >
          <Plus className="w-4 h-4" /> Log episode
        </Button>
      </div>

      {/* Stats */}
      {stats ? (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Migraine days (30d)', value: stats.migraineDays,    Icon: Activity,     bg: 'bg-red-50 dark:bg-red-950/40',      ic: 'text-red-400 dark:text-red-300'    },
            { label: 'Headache-free days',  value: stats.headacheFreeDays, Icon: Heart,        bg: 'bg-emerald-50 dark:bg-emerald-950/40', ic: 'text-emerald-400 dark:text-emerald-300' },
            { label: 'Avg pain (30d)',      value: stats.avgPain,         Icon: TrendingDown, bg: 'bg-amber-50 dark:bg-amber-950/40',  ic: 'text-amber-400 dark:text-amber-300'  },
            { label: 'Episodes (30d)',      value: stats.total,           Icon: Calendar,     bg: 'bg-indigo-50 dark:bg-indigo-950/40', ic: 'text-indigo-400 dark:text-indigo-300' }
          ].map(({ label, value, Icon, bg, ic }) => (
            <Card key={label} className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${ic}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none">{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-10">
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">No entries yet. Start tracking your migraines.</p>
          <Button onClick={() => setActiveTab('log')}>
            <Plus className="w-4 h-4" /> Log your first episode
          </Button>
        </Card>
      )}

      {/* Recent entries */}
      {recent.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Recent episodes</h3>
            <button
              onClick={() => setActiveTab('history')}
              className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {recent.map(entry => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {new Date(entry.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {entry.durationMinutes} min
                    {entry.suspectedTrigger ? ` · ${entry.suspectedTrigger}` : ''}
                  </p>
                </div>
                <PainBadge level={entry.painLevel} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

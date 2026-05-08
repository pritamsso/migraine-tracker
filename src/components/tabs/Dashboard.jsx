import { useMemo } from 'react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import PainBadge from '../shared/PainBadge'
import { Activity, TrendingDown, Calendar, Flame, Plus } from 'lucide-react'

export default function Dashboard({ entries, preferences, setActiveTab }) {
  const stats = useMemo(() => {
    if (!entries.length) return null
    const now = Date.now()
    const last30 = entries.filter(e => new Date(e.startTime).getTime() >= now - 30 * 864e5)
    const migraineDays = new Set(last30.map(e => e.startTime?.slice(0, 10))).size
    const avgPain = last30.length
      ? (last30.reduce((s, e) => s + e.painLevel, 0) / last30.length).toFixed(1)
      : '—'
    // Streak: consecutive migraine days ending today
    const allDays = new Set(entries.map(e => e.startTime?.slice(0, 10)).filter(Boolean))
    let streak = 0
    const ptr = new Date()
    while (allDays.has(ptr.toISOString().slice(0, 10))) {
      streak++
      ptr.setDate(ptr.getDate() - 1)
    }
    return { migraineDays, avgPain, total: last30.length, streak }
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
            { label: 'Migraine days (30d)', value: stats.migraineDays, Icon: Activity,     bg: 'bg-red-50',    ic: 'text-red-400'    },
            { label: 'Avg pain (30d)',      value: stats.avgPain,      Icon: TrendingDown, bg: 'bg-amber-50',  ic: 'text-amber-400'  },
            { label: 'Episodes (30d)',      value: stats.total,        Icon: Calendar,     bg: 'bg-indigo-50', ic: 'text-indigo-400' },
            { label: 'Day streak',          value: stats.streak,       Icon: Flame,        bg: 'bg-orange-50', ic: 'text-orange-400' }
          ].map(({ label, value, Icon, bg, ic }) => (
            <Card key={label} className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${ic}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-10">
          <p className="text-slate-400 text-sm mb-4">No entries yet. Start tracking your migraines.</p>
          <Button onClick={() => setActiveTab('log')}>
            <Plus className="w-4 h-4" /> Log your first episode
          </Button>
        </Card>
      )}

      {/* Recent entries */}
      {recent.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 text-sm">Recent episodes</h3>
            <button
              onClick={() => setActiveTab('history')}
              className="text-xs text-indigo-500 hover:text-indigo-600"
            >
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {recent.map(entry => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {new Date(entry.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-slate-400">
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

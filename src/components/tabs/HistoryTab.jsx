import { useMemo, useState } from 'react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import PainBadge from '../shared/PainBadge'
import { Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

export default function HistoryTab({ entries, removeEntry, onEdit, addToast }) {
  const [expanded, setExpanded] = useState(null)

  const sorted = useMemo(
    () => [...entries].sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
    [entries]
  )

  const heatmap = useMemo(() => {
    const counts = new Map()
    for (const e of entries) {
      const d = e.startTime?.slice(0, 10)
      if (d) counts.set(d, (counts.get(d) || 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 42)
  }, [entries])

  function handleDelete(id) {
    if (!confirm('Delete this entry?')) return
    removeEntry(id)
    addToast('Entry deleted.', 'warning')
  }

  if (!entries.length) {
    return (
      <Card className="text-center py-12">
        <p className="text-slate-400 dark:text-slate-500 text-sm">No entries yet. Log your first episode to see history.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Heatmap */}
      {heatmap.length > 0 && (
        <Card>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-3">Calendar overview</h3>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {heatmap.map(([day, count]) => {
              const cls =
                count >= 3 ? 'bg-red-400 text-white' :
                count === 2 ? 'bg-amber-300 text-amber-900 dark:bg-amber-900 dark:text-amber-200' :
                              'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
              return (
                <div key={day} className={`rounded-xl p-2 text-center ${cls}`}>
                  <p className="text-xs font-semibold">{day.slice(5)}</p>
                  <p className="text-xs">{count} ep.</p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Timeline */}
      <div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-3">All episodes ({sorted.length})</h3>
        <div className="space-y-2">
          {sorted.map(entry => (
            <Card key={entry.id} className="p-4">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {new Date(entry.startTime).toLocaleString(undefined, {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    <PainBadge level={entry.painLevel} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {entry.durationMinutes} min
                    {entry.sleepHours    ? ` · Sleep ${entry.sleepHours}h`        : ''}
                    {entry.hydrationLiters ? ` · Hydration ${entry.hydrationLiters}L` : ''}
                    {Number.isFinite(entry.stressLevel) ? ` · Stress ${entry.stressLevel}/10` : ''}
                    {entry.rescueMed    ? ` · ${entry.rescueMed} (${entry.medEffective})` : ''}
                  </p>
                  {(entry.suspectedTrigger || entry.foodNotes) && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {entry.suspectedTrigger ? `Trigger: ${entry.suspectedTrigger}` : ''}
                      {entry.suspectedTrigger && entry.foodNotes ? ' · ' : ''}
                      {entry.foodNotes ? `Food: ${entry.foodNotes}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500"
                  >
                    {expanded === entry.id
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onEdit(entry)}
                    className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-400 dark:text-indigo-300"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-400 dark:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expanded === entry.id && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  {entry.activityImpact && <p>Activity impact: {entry.activityImpact}</p>}
                  {entry.cyclePhase && entry.cyclePhase !== 'Not tracked' && <p>Cycle phase: {entry.cyclePhase}</p>}
                  <p className="flex gap-3 flex-wrap">
                    {entry.symptoms?.nausea      && <span>Nausea ✓</span>}
                    {entry.symptoms?.photophobia && <span>Photophobia ✓</span>}
                    {entry.symptoms?.phonophobia && <span>Phonophobia ✓</span>}
                    {entry.symptoms?.aura        && <span>Aura ✓</span>}
                  </p>
                  {entry.notes && <p>Notes: {entry.notes}</p>}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

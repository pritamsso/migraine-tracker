function mean(values) {
  if (!values.length) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

function topCounts(values, limit) {
  const map = new Map()
  values.forEach(v => map.set(v, (map.get(v) || 0) + 1))
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function ratioAnalysis(entries, predicate, label) {
  const yes = entries.filter(predicate)
  const no = entries.filter(e => !predicate(e))
  if (!yes.length || !no.length) return null
  const yesRate = yes.length / entries.length
  const noRate = no.length / entries.length
  return { label, support: yes.length, multiplier: (yesRate / noRate).toFixed(2) }
}

function buildInsights(entries) {
  const total = entries.length
  const analyses = [
    ratioAnalysis(entries, e => e.sleepHours > 0 && e.sleepHours < 6, 'sleep <6h'),
    ratioAnalysis(entries, e => e.hydrationLiters > 0 && e.hydrationLiters < 1.5, 'hydration <1.5L'),
    ratioAnalysis(entries, e => Number(e.stressLevel) >= 7, 'stress ≥7/10'),
    ratioAnalysis(entries, e => /stress/i.test(e.suspectedTrigger), 'stress trigger label'),
    ratioAnalysis(entries, e => e.cyclePhase && e.cyclePhase !== 'Not tracked', 'cycle phase logged'),
    ratioAnalysis(entries, e => Boolean(e.foodNotes), 'food logged')
  ].filter(Boolean)
  if (!analyses.length) return ['- Insufficient feature diversity for robust pattern signals.']
  return analyses.map(row => {
    const confidence = row.support >= Math.max(8, Math.floor(total * 0.25)) ? 'moderate' : 'low'
    return `- Episodes with ${row.label} appear ${row.multiplier}x as frequent (confidence: ${confidence}, support: ${row.support}).`
  })
}

export function renderReport(entries, days) {
  const now = Date.now()
  const threshold = now - days * 24 * 60 * 60 * 1000
  const subset = entries.filter(e => new Date(e.startTime).getTime() >= threshold)
  if (!subset.length) return `No entries in last ${days} days.`
  const migraineDays = new Set(subset.map(e => e.startTime.slice(0, 10))).size
  const avgPain = mean(subset.map(e => e.painLevel)).toFixed(2)
  const avgDuration = mean(subset.map(e => e.durationMinutes)).toFixed(1)
  const effectiveCount = subset.filter(e => e.medEffective === 'yes' || e.medEffective === 'partial').length
  const medResponse = ((effectiveCount / subset.length) * 100).toFixed(1)
  const topTriggers = topCounts(subset.map(e => e.suspectedTrigger).filter(Boolean), 5)
  const topFoods = topCounts(subset.map(e => e.foodNotes).filter(Boolean), 5)
  const insights = buildInsights(subset)
  const stressEntries = subset.filter(e => Number.isFinite(e.stressLevel))
  const avgStress = stressEntries.length ? mean(stressEntries.map(e => Number(e.stressLevel))).toFixed(1) : null
  const topCyclePhases = topCounts(subset.map(e => e.cyclePhase).filter(v => v && v !== 'Not tracked'), 3)
  return [
    `Migraine Tracker Report (${days} days)`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    `Entries: ${subset.length}`,
    `Migraine days/month (normalized): ${(migraineDays * 30 / days).toFixed(1)}`,
    `Average pain severity (0-10): ${avgPain}`,
    `Average duration (minutes): ${avgDuration}`,
    avgStress ? `Average stress level (0-10): ${avgStress}` : 'Average stress level (0-10): —',
    `Medication effectiveness rate (yes/partial): ${medResponse}%`,
    '',
    'Top suspected triggers:',
    ...topTriggers.map(i => `- ${i.value}: ${i.count}`),
    '',
    'Top food associations:',
    ...topFoods.map(i => `- ${i.value}: ${i.count}`),
    '',
    'Top cycle phases logged:',
    ...(topCyclePhases.length ? topCyclePhases.map(i => `- ${i.value}: ${i.count}`) : ['- Not enough cycle-phase data logged.']),
    '',
    'Pattern signals (correlation, not causation):',
    ...insights,
    '',
    'Clinical framing:',
    '- Fields include ICHD-3-aligned characteristics for diagnostic support.',
    '- Use HIT-6 and MIDAS scores for disability trends.',
    '- Not medical advice; discuss findings with a clinician.'
  ].join('\n')
}

export function exportCsvBlob(entries) {
  const headers = [
    'id', 'startTime', 'durationMinutes', 'painLevel', 'foodNotes', 'hydrationLiters',
    'sleepHours', 'stressLevel', 'cyclePhase', 'rescueMed', 'medEffective', 'suspectedTrigger', 'activityImpact', 'notes',
    'nausea', 'photophobia', 'phonophobia', 'aura',
    'ichdUnilateral', 'ichdPulsating', 'ichdAggravatedByActivity', 'ichdModerateSevere'
  ]
  const rows = entries.map(e => [
    e.id, e.startTime, e.durationMinutes, e.painLevel, e.foodNotes, e.hydrationLiters,
    e.sleepHours, e.stressLevel, e.cyclePhase, e.rescueMed, e.medEffective, e.suspectedTrigger, e.activityImpact, e.notes,
    e.symptoms?.nausea, e.symptoms?.photophobia, e.symptoms?.phonophobia, e.symptoms?.aura,
    e.ichd?.unilateral, e.ichd?.pulsating, e.ichd?.aggravatedByActivity, e.ichd?.moderateSevere
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n')
  return new Blob([csv], { type: 'text/csv' })
}

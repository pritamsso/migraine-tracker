import { useState, useEffect, useMemo } from 'react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import { Save, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

const FOOD_SUGS     = ['Aged cheese', 'Chocolate', 'Processed meat', 'Red wine', 'Skipped meal', 'Caffeine change']
const MED_SUGS      = ['Ibuprofen 400mg', 'Naproxen 500mg', 'Sumatriptan 50mg', 'Rizatriptan 10mg', 'Acetaminophen 500mg']
const TRIGGER_SUGS  = ['Stress', '<6h sleep', 'Dehydration', 'Weather change', 'Hormonal', 'Bright light', 'Loud noise']
const ACTIVITY_SUGS = ['Missed work', 'Reduced productivity', 'Could not exercise', 'Stayed in bed', 'Missed social activity']
const CYCLE_PHASES  = ['Not tracked', 'Menstrual', 'Follicular', 'Ovulation', 'Luteal', 'Postpartum', 'Perimenopause', 'Other']

function localNow() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const BASE = {
  startTime: '', durationMinutes: 60, painLevel: 5,
  foodNotes: '', hydrationLiters: 1.5, sleepHours: 7, stressLevel: 5, cyclePhase: 'Not tracked',
  rescueMed: '', medEffective: 'unknown', suspectedTrigger: '',
  activityImpact: '', notes: '',
  symptomNausea: false, symptomPhoto: false, symptomPhono: false, symptomAura: false,
  ichdUnilateral: false, ichdPulsating: false, ichdAggravatedByActivity: false, ichdModerateSevere: true,
  consent: false
}

const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'
const MAX_DYNAMIC_SUGS = 12

function buildLearnedSuggestions(entries, field, splitByComma = false) {
  const scores = new Map()
  const recentSorted = [...entries].sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
  recentSorted.forEach((entry, idx) => {
    const raw = String(entry?.[field] || '').trim()
    if (!raw) return
    const values = splitByComma
      ? raw.split(',').map(part => part.trim()).filter(Boolean)
      : [raw]
    values.forEach(value => {
      const key = value.toLowerCase()
      const found = scores.get(key)
      if (found) {
        found.count += 1
        found.recency = Math.max(found.recency, recentSorted.length - idx)
      } else {
        scores.set(key, { value, count: 1, recency: recentSorted.length - idx })
      }
    })
  })
  return Array.from(scores.values())
    .sort((a, b) => b.count - a.count || b.recency - a.recency || a.value.localeCompare(b.value))
    .slice(0, MAX_DYNAMIC_SUGS)
    .map(item => item.value)
}

function mergeSuggestions(defaults, learned) {
  const seen = new Set()
  return [...defaults, ...learned].filter(value => {
    const key = String(value || '').trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function ChipRow({ options, field, form, set, activeClass = 'bg-indigo-500 text-white', inactiveClass = 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700' }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {options.map(opt => (
        <button key={opt.label} type="button"
          onClick={() => set(field, opt.value)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${String(form[field]) === String(opt.value) ? activeClass : inactiveClass}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function LogEntry({ entries = [], addEntry, updateEntry, editingEntry, setEditingEntry, addToast, setActiveTab }) {
  const [form, setForm] = useState({ ...BASE, startTime: localNow() })
  const [showClinical, setShowClinical] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingEntry) {
      setForm({
        ...BASE,
        startTime:        editingEntry.startTime,
        durationMinutes:  editingEntry.durationMinutes,
        painLevel:        editingEntry.painLevel,
        foodNotes:        editingEntry.foodNotes || '',
        hydrationLiters:  editingEntry.hydrationLiters,
        sleepHours:       editingEntry.sleepHours,
        stressLevel:      editingEntry.stressLevel ?? 5,
        cyclePhase:       editingEntry.cyclePhase || 'Not tracked',
        rescueMed:        editingEntry.rescueMed || '',
        medEffective:     editingEntry.medEffective || 'unknown',
        suspectedTrigger: editingEntry.suspectedTrigger || '',
        activityImpact:   editingEntry.activityImpact || '',
        notes:            editingEntry.notes || '',
        symptomNausea:    Boolean(editingEntry.symptoms?.nausea),
        symptomPhoto:     Boolean(editingEntry.symptoms?.photophobia),
        symptomPhono:     Boolean(editingEntry.symptoms?.phonophobia),
        symptomAura:      Boolean(editingEntry.symptoms?.aura),
        ichdUnilateral:   Boolean(editingEntry.ichd?.unilateral),
        ichdPulsating:    Boolean(editingEntry.ichd?.pulsating),
        ichdAggravatedByActivity: Boolean(editingEntry.ichd?.aggravatedByActivity),
        ichdModerateSevere:       Boolean(editingEntry.ichd?.moderateSevere),
        consent: true
      })
      setShowClinical(true)
    }
  }, [editingEntry])

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  const recentEntry = useMemo(() => {
    if (!entries.length) return null
    return [...entries].sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0] || null
  }, [entries])

  const foodSugs = useMemo(
    () => mergeSuggestions(FOOD_SUGS, buildLearnedSuggestions(entries, 'foodNotes', true)),
    [entries]
  )
  const medSugs = useMemo(
    () => mergeSuggestions(MED_SUGS, buildLearnedSuggestions(entries, 'rescueMed')),
    [entries]
  )
  const triggerSugs = useMemo(
    () => mergeSuggestions(TRIGGER_SUGS, buildLearnedSuggestions(entries, 'suspectedTrigger', true)),
    [entries]
  )
  const activitySugs = useMemo(
    () => mergeSuggestions(ACTIVITY_SUGS, buildLearnedSuggestions(entries, 'activityImpact')),
    [entries]
  )

  function applyRecentEpisode() {
    if (!recentEntry) {
      addToast('Log at least one episode first to use quick fill.', 'warning')
      return
    }
    setForm(prev => ({
      ...prev,
      durationMinutes: recentEntry.durationMinutes ?? prev.durationMinutes,
      painLevel: recentEntry.painLevel ?? prev.painLevel,
      foodNotes: recentEntry.foodNotes || '',
      hydrationLiters: recentEntry.hydrationLiters ?? prev.hydrationLiters,
      sleepHours: recentEntry.sleepHours ?? prev.sleepHours,
      stressLevel: recentEntry.stressLevel ?? prev.stressLevel,
      cyclePhase: recentEntry.cyclePhase || prev.cyclePhase,
      rescueMed: recentEntry.rescueMed || '',
      medEffective: recentEntry.medEffective || prev.medEffective,
      suspectedTrigger: recentEntry.suspectedTrigger || '',
      activityImpact: recentEntry.activityImpact || '',
      notes: recentEntry.notes || '',
      symptomNausea: Boolean(recentEntry.symptoms?.nausea),
      symptomPhoto: Boolean(recentEntry.symptoms?.photophobia),
      symptomPhono: Boolean(recentEntry.symptoms?.phonophobia),
      symptomAura: Boolean(recentEntry.symptoms?.aura),
      ichdUnilateral: Boolean(recentEntry.ichd?.unilateral),
      ichdPulsating: Boolean(recentEntry.ichd?.pulsating),
      ichdAggravatedByActivity: Boolean(recentEntry.ichd?.aggravatedByActivity),
      ichdModerateSevere: Boolean(recentEntry.ichd?.moderateSevere),
    }))
    addToast('Quick fill applied from your latest episode.')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.consent) { addToast('Please tick the consent box.', 'warning'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 250))
    const entry = {
      id:               editingEntry?.id || crypto.randomUUID(),
      createdAt:        editingEntry?.createdAt || new Date().toISOString(),
      startTime:        form.startTime,
      durationMinutes:  Number(form.durationMinutes),
      painLevel:        Number(form.painLevel),
      foodNotes:        form.foodNotes,
      hydrationLiters:  Number(form.hydrationLiters),
      sleepHours:       Number(form.sleepHours),
      stressLevel:      Number(form.stressLevel),
      cyclePhase:       form.cyclePhase,
      rescueMed:        form.rescueMed,
      medEffective:     form.medEffective,
      suspectedTrigger: form.suspectedTrigger,
      activityImpact:   form.activityImpact,
      notes:            form.notes,
      symptoms: {
        nausea:      form.symptomNausea,
        photophobia: form.symptomPhoto,
        phonophobia: form.symptomPhono,
        aura:        form.symptomAura
      },
      ichd: {
        unilateral:          form.ichdUnilateral,
        pulsating:           form.ichdPulsating,
        aggravatedByActivity: form.ichdAggravatedByActivity,
        moderateSevere:      form.ichdModerateSevere
      }
    }
    if (editingEntry) { updateEntry(entry); addToast('Entry updated!') }
    else              { addEntry(entry);    addToast('Episode logged! ✓') }
    setForm({ ...BASE, startTime: localNow(), consent: false })
    setEditingEntry(null)
    setSaving(false)
    if (!editingEntry) setActiveTab('history')
  }

  function reset() {
    setForm({ ...BASE, startTime: localNow(), consent: false })
    setEditingEntry(null)
  }

  const SectionLabel = ({ children }) => (
    <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-3">{children}</h3>
  )
  const FieldLabel = ({ children }) => (
    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{children}</label>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {editingEntry ? 'Edit episode' : 'Log episode'}
        </h2>
        <div className="flex items-center gap-2">
          {!editingEntry && (
            <Button variant="ghost" size="sm" onClick={applyRecentEpisode}>
              Quick fill
            </Button>
          )}
          {editingEntry && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="w-3.5 h-3.5" /> Cancel edit
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── Episode core ── */}
        <Card className="space-y-4">
          <SectionLabel>Episode details</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            <div>
              <FieldLabel>Start date &amp; time</FieldLabel>
              <input type="datetime-local" value={form.startTime}
                onChange={e => set('startTime', e.target.value)} required className={inputCls} />
            </div>

            <div>
              <FieldLabel>Duration (minutes)</FieldLabel>
              <input type="number" min="1" value={form.durationMinutes}
                onChange={e => set('durationMinutes', e.target.value)} required className={inputCls} />
              <ChipRow
                options={[{label:'30m',value:30},{label:'1h',value:60},{label:'2h',value:120},{label:'4h',value:240}]}
                field="durationMinutes" form={form} set={set}
              />
            </div>

            <div>
              <FieldLabel>Pain level (0–10)</FieldLabel>
              <input type="number" min="0" max="10" value={form.painLevel}
                onChange={e => set('painLevel', e.target.value)} required className={inputCls} />
              <ChipRow
                options={[{label:'2',value:2},{label:'4',value:4},{label:'6',value:6},{label:'8',value:8},{label:'10',value:10}]}
                field="painLevel" form={form} set={set}
              />
            </div>
          </div>
        </Card>

        {/* ── Lifestyle ── */}
        <Card className="space-y-4">
          <SectionLabel>Lifestyle factors</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <FieldLabel>Food / intake notes</FieldLabel>
              <input type="text" list="foodSugs" value={form.foodNotes}
                onChange={e => set('foodNotes', e.target.value)}
                placeholder="e.g. cheese, red wine" className={inputCls} />
              <datalist id="foodSugs">{foodSugs.map(f => <option key={f} value={f} />)}</datalist>
            </div>
            <div>
              <FieldLabel>Hydration (L)</FieldLabel>
              <input type="number" min="0" step="0.1" value={form.hydrationLiters}
                onChange={e => set('hydrationLiters', e.target.value)} className={inputCls} />
              <ChipRow
                options={[{label:'0.5L',value:0.5},{label:'1L',value:1},{label:'1.5L',value:1.5},{label:'2L',value:2}]}
                field="hydrationLiters" form={form} set={set}
              />
            </div>
            <div>
              <FieldLabel>Sleep (hours)</FieldLabel>
              <input type="number" min="0" max="24" step="0.5" value={form.sleepHours}
                onChange={e => set('sleepHours', e.target.value)} className={inputCls} />
              <ChipRow
                options={[{label:'4h',value:4},{label:'5h',value:5},{label:'6h',value:6},{label:'7h',value:7},{label:'8h',value:8}]}
                field="sleepHours" form={form} set={set}
              />
            </div>
            <div>
              <FieldLabel>Stress level (0–10)</FieldLabel>
              <input type="number" min="0" max="10" value={form.stressLevel}
                onChange={e => set('stressLevel', e.target.value)} className={inputCls} />
              <ChipRow
                options={[{label:'2',value:2},{label:'4',value:4},{label:'6',value:6},{label:'8',value:8}]}
                field="stressLevel" form={form} set={set}
              />
            </div>
            <div>
              <FieldLabel>Hormonal cycle phase</FieldLabel>
              <select value={form.cyclePhase} onChange={e => set('cyclePhase', e.target.value)} className={inputCls}>
                {CYCLE_PHASES.map(phase => <option key={phase} value={phase}>{phase}</option>)}
              </select>
            </div>
          </div>
        </Card>

        {/* ── Medication & triggers ── */}
        <Card className="space-y-4">
          <SectionLabel>Medication &amp; triggers</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <FieldLabel>Rescue medication</FieldLabel>
              <input type="text" list="medSugs" value={form.rescueMed}
                onChange={e => set('rescueMed', e.target.value)}
                placeholder="name + dose" className={inputCls} />
              <datalist id="medSugs">{medSugs.map(m => <option key={m} value={m} />)}</datalist>
            </div>
            <div>
              <FieldLabel>Med effective?</FieldLabel>
              <select value={form.medEffective} onChange={e => set('medEffective', e.target.value)} className={inputCls}>
                <option value="unknown">Unknown</option>
                <option value="yes">Yes</option>
                <option value="partial">Partially</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <FieldLabel>Suspected trigger</FieldLabel>
              <input type="text" list="trigSugs" value={form.suspectedTrigger}
                onChange={e => set('suspectedTrigger', e.target.value)}
                placeholder="stress, sleep loss…" className={inputCls} />
              <datalist id="trigSugs">{triggerSugs.map(t => <option key={t} value={t} />)}</datalist>
            </div>
          </div>

          {/* Trigger chips */}
          <div>
            <FieldLabel>Quick trigger pick</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {triggerSugs.map(t => (
                <button key={t} type="button"
                  onClick={() => set('suspectedTrigger', t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      form.suspectedTrigger === t
                        ? 'bg-amber-500 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Activity impact</FieldLabel>
            <input type="text" list="actSugs" value={form.activityImpact}
              onChange={e => set('activityImpact', e.target.value)}
              placeholder="missed work, bed rest…" className={inputCls} />
            <datalist id="actSugs">{activitySugs.map(a => <option key={a} value={a} />)}</datalist>
          </div>
        </Card>

        {/* ── Clinical (expandable) ── */}
        <Card>
          <button type="button" onClick={() => setShowClinical(v => !v)}
            className="w-full flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-slate-100">
            Extra symptom details (optional)
            {showClinical
              ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
          </button>

          {showClinical && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['symptomNausea',            'Nausea'],
                  ['symptomPhoto',             'Light sensitivity'],
                  ['symptomPhono',             'Sound sensitivity'],
                  ['symptomAura',              'Aura'],
                  ['ichdUnilateral',           'One-sided pain'],
                  ['ichdPulsating',            'Throbbing pain'],
                  ['ichdAggravatedByActivity', 'Worse with activity'],
                  ['ichdModerateSevere',       'Moderate or severe pain']
                ].map(([k, lbl]) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)}
                      className="w-4 h-4 rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-indigo-500 focus:ring-indigo-400" />
                    {lbl}
                  </label>
                ))}
              </div>
              <div>
                <FieldLabel>Additional notes</FieldLabel>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  rows={3} className={inputCls} />
              </div>
            </div>
          )}
        </Card>

        {/* ── Consent + submit ── */}
        <Card>
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input type="checkbox" checked={form.consent} onChange={e => set('consent', e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-indigo-500 focus:ring-indigo-400 flex-shrink-0" />
            <span className="text-xs text-slate-600 dark:text-slate-300">
              I agree to store this health information on this device and, if I choose, in my own Google Drive.
            </span>
          </label>
          <Button type="submit" disabled={saving || !form.consent} className="w-full justify-center" size="lg">
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : editingEntry ? 'Update entry' : 'Save episode'}
          </Button>
        </Card>
      </form>
    </div>
  )
}

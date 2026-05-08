import { useState, useEffect } from 'react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import { Save, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

const FOOD_SUGS     = ['Aged cheese', 'Chocolate', 'Processed meat', 'Red wine', 'Skipped meal', 'Caffeine change']
const MED_SUGS      = ['Ibuprofen 400mg', 'Naproxen 500mg', 'Sumatriptan 50mg', 'Rizatriptan 10mg', 'Acetaminophen 500mg']
const TRIGGER_SUGS  = ['Stress', '<6h sleep', 'Dehydration', 'Weather change', 'Hormonal', 'Bright light', 'Loud noise']
const ACTIVITY_SUGS = ['Missed work', 'Reduced productivity', 'Could not exercise', 'Stayed in bed', 'Missed social activity']

function localNow() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const BASE = {
  startTime: '', durationMinutes: 60, painLevel: 5,
  foodNotes: '', hydrationLiters: 1.5, sleepHours: 7,
  rescueMed: '', medEffective: 'unknown', suspectedTrigger: '',
  activityImpact: '', notes: '',
  symptomNausea: false, symptomPhoto: false, symptomPhono: false, symptomAura: false,
  ichdUnilateral: false, ichdPulsating: false, ichdAggravatedByActivity: false, ichdModerateSevere: true,
  consent: false
}

const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

function ChipRow({ options, field, form, set, activeClass = 'bg-indigo-500 text-white', inactiveClass = 'bg-slate-100 text-slate-600 hover:bg-slate-200' }) {
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

export default function LogEntry({ addEntry, updateEntry, editingEntry, setEditingEntry, addToast, setActiveTab }) {
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
    <h3 className="font-semibold text-slate-800 text-sm mb-3">{children}</h3>
  )
  const FieldLabel = ({ children }) => (
    <label className="block text-xs font-medium text-slate-600 mb-1">{children}</label>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">
          {editingEntry ? 'Edit episode' : 'Log episode'}
        </h2>
        {editingEntry && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5" /> Cancel edit
          </Button>
        )}
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
              <datalist id="foodSugs">{FOOD_SUGS.map(f => <option key={f} value={f} />)}</datalist>
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
              <datalist id="medSugs">{MED_SUGS.map(m => <option key={m} value={m} />)}</datalist>
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
              <datalist id="trigSugs">{TRIGGER_SUGS.map(t => <option key={t} value={t} />)}</datalist>
            </div>
          </div>

          {/* Trigger chips */}
          <div>
            <FieldLabel>Quick trigger pick</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {TRIGGER_SUGS.map(t => (
                <button key={t} type="button"
                  onClick={() => set('suspectedTrigger', t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    form.suspectedTrigger === t
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
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
            <datalist id="actSugs">{ACTIVITY_SUGS.map(a => <option key={a} value={a} />)}</datalist>
          </div>
        </Card>

        {/* ── Clinical (expandable) ── */}
        <Card>
          <button type="button" onClick={() => setShowClinical(v => !v)}
            className="w-full flex items-center justify-between text-sm font-semibold text-slate-800">
            Clinical fields (optional)
            {showClinical
              ? <ChevronUp className="w-4 h-4 text-slate-400" />
              : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showClinical && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['symptomNausea',            'Nausea'],
                  ['symptomPhoto',             'Photophobia'],
                  ['symptomPhono',             'Phonophobia'],
                  ['symptomAura',              'Aura'],
                  ['ichdUnilateral',           'Unilateral'],
                  ['ichdPulsating',            'Pulsating'],
                  ['ichdAggravatedByActivity', 'Aggravated by activity'],
                  ['ichdModerateSevere',       'Moderate/severe']
                ].map(([k, lbl]) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400" />
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
              className="w-4 h-4 mt-0.5 rounded text-indigo-500 focus:ring-indigo-400 flex-shrink-0" />
            <span className="text-xs text-slate-600">
              I consent to processing this health data locally on my device and (optionally) in my own Google Drive.
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

import { useState } from 'react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import { Calculator } from 'lucide-react'

function csvToNums(raw) {
  return raw.split(',').map(p => Number(p.trim())).filter(Number.isFinite)
}

export default function Assessments() {
  const [hit6Input,  setHit6Input]  = useState('')
  const [hit6Result, setHit6Result] = useState('')
  const [midasInput,  setMidasInput]  = useState('')
  const [midasResult, setMidasResult] = useState('')

  function calcHit6() {
    const score = csvToNums(hit6Input).reduce((s, v) => s + v, 0)
    const cat =
      score >= 60 ? 'Severe impact' :
      score >= 56 ? 'Substantial impact' :
      score >= 50 ? 'Some impact' :
                    'Little/no impact'
    setHit6Result(`HIT-6 score: ${score} — ${cat}`)
  }

  function calcMidas() {
    const score = csvToNums(midasInput).reduce((s, v) => s + v, 0)
    const grade =
      score >= 21 ? 'Grade IV — Severe disability' :
      score >= 11 ? 'Grade III — Moderate disability' :
      score >= 6  ? 'Grade II — Mild disability' :
                    'Grade I — Little/no disability'
    setMidasResult(`MIDAS score: ${score} — ${grade}`)
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-slate-800 mb-1">HIT-6 Headache Impact Test</h3>
        <p className="text-xs text-slate-500 mb-3">
          Enter 6 comma-separated scores. Values: 6 (Never), 8 (Rarely), 10 (Sometimes), 11 (Very often), 13 (Always).
        </p>
        <input value={hit6Input} onChange={e => setHit6Input(e.target.value)}
          placeholder="e.g. 11,10,8,13,10,11" className={inputCls + ' mb-3'} />
        <Button onClick={calcHit6}><Calculator className="w-4 h-4" /> Calculate HIT-6</Button>
        {hit6Result && (
          <p className="mt-3 text-sm font-semibold text-indigo-700 bg-indigo-50 rounded-xl px-4 py-2">
            {hit6Result}
          </p>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-slate-800 mb-1">MIDAS Disability Assessment</h3>
        <p className="text-xs text-slate-500 mb-3">
          Enter 5 comma-separated values (days affected in last 3 months).
        </p>
        <input value={midasInput} onChange={e => setMidasInput(e.target.value)}
          placeholder="e.g. 2,3,5,4,6" className={inputCls + ' mb-3'} />
        <Button onClick={calcMidas}><Calculator className="w-4 h-4" /> Calculate MIDAS</Button>
        {midasResult && (
          <p className="mt-3 text-sm font-semibold text-indigo-700 bg-indigo-50 rounded-xl px-4 py-2">
            {midasResult}
          </p>
        )}
      </Card>
    </div>
  )
}

import { useState } from 'react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import { renderReport, exportCsvBlob } from '../../utils/reports'
import { FileText, Download, Printer } from 'lucide-react'

export default function Reports({ entries, addToast }) {
  const [report, setReport] = useState('')
  const [days, setDays]     = useState(null)

  function generate(d) {
    setDays(d)
    setReport(renderReport(entries, d))
  }

  function doExportCsv() {
    if (!entries.length) { addToast('No entries to export.', 'warning'); return }
    const blob = exportCsvBlob(entries)
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: `migraine-report-${Date.now()}.csv` })
    a.click()
    URL.revokeObjectURL(url)
    addToast('CSV exported!')
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Generate report</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {[30, 60, 90].map(d => (
            <Button
              key={d}
              variant={days === d ? 'primary' : 'secondary'}
              onClick={() => generate(d)}
            >
              <FileText className="w-4 h-4" /> {d} days
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Print / PDF
          </Button>
          <Button variant="secondary" onClick={doExportCsv}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </Card>

      {report && (
        <Card>
          <pre className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">{report}</pre>
        </Card>
      )}

      {!entries.length && (
        <Card className="text-center py-8">
          <p className="text-slate-400 dark:text-slate-500 text-sm">Log some episodes to generate reports.</p>
        </Card>
      )}
    </div>
  )
}

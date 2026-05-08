export default function PainBadge({ level }) {
  const cls =
    level >= 8 ? 'bg-red-100 text-red-700' :
    level >= 5 ? 'bg-amber-100 text-amber-700' :
                 'bg-emerald-100 text-emerald-700'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      Pain {level}/10
    </span>
  )
}

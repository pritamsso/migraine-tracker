export default function PainBadge({ level }) {
  const cls =
    level >= 8 ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300' :
    level >= 5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
                 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      Pain {level}/10
    </span>
  )
}

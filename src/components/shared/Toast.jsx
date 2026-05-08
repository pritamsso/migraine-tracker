export default function Toast({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`rounded-2xl px-4 py-3 text-sm font-medium shadow-lg text-white ${
            t.type === 'error'   ? 'bg-red-500' :
            t.type === 'warning' ? 'bg-amber-500' :
                                   'bg-emerald-500'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

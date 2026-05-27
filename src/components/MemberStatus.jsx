export default function MemberStatus({ profile }) {
  if (!profile) return null

  const statusConfig = {
    active: { label: 'Al día', color: 'text-green-400', bg: 'bg-green-500/10', dot: 'bg-green-400' },
    moroso: { label: 'Pago pendiente', color: 'text-yellow-400', bg: 'bg-yellow-500/10', dot: 'bg-yellow-400' },
    inactive: { label: 'Inactivo', color: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-400' },
  }

  const config = statusConfig[profile.status] || statusConfig.active

  const lastPayment = profile.last_payment
    ? new Date(profile.last_payment).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className={`${config.bg} rounded-2xl p-4 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
        <div>
          <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
          {lastPayment && (
            <p className="text-slate-500 text-xs">Último pago: {lastPayment}</p>
          )}
        </div>
      </div>
      {profile.status === 'moroso' && (
        <span className="text-yellow-400 text-lg">⚠️</span>
      )}
    </div>
  )
}

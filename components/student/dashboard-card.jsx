export default function DashboardCard({ title, icon: Icon, status, count, description, color, onClick }) {
  const Component = onClick ? 'button' : 'div'
  
  return (
    <Component
      onClick={onClick}
      className={`w-full rounded-xl border border-border bg-card p-4 text-left transition-all ${
        onClick ? 'cursor-pointer hover:border-primary/40 hover:bg-muted/20' : ''
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className={`p-2 rounded-lg ${
          color.includes('blue') ? 'bg-blue-500/20' :
          color.includes('yellow') ? 'bg-yellow-500/20' :
          color.includes('orange') ? 'bg-orange-500/20' :
          'bg-primary/20'
        }`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      {status && (
        <p className="mb-1 text-xl font-bold capitalize text-foreground">
          {status.replace("-", " ")}
        </p>
      )}
      {count !== undefined && (
        <p className="mb-1 text-xl font-bold text-foreground">{count}</p>
      )}
      <p className="text-xs text-muted-foreground">{description}</p>
    </Component>
  )
}

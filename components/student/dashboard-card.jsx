export default function DashboardCard({ title, icon: Icon, status, count, description, color }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      {status && <p className="text-2xl font-bold text-foreground capitalize mb-2">{status.replace("-", " ")}</p>}
      {count !== undefined && <p className="text-2xl font-bold text-foreground mb-2">{count}</p>}
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

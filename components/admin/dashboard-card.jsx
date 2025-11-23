export default function AdminDashboardCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-foreground">{label}</h3>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  )
}

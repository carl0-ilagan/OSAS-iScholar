export default function DashboardCard({ title, icon: Icon, status, count, description, color, onClick }) {
  const Component = onClick ? 'button' : 'div'
  
  return (
    <Component
      onClick={onClick}
      className={`bg-card border-2 border-border rounded-xl p-5 sm:p-6 hover:shadow-lg transition-all text-left w-full ${
        onClick ? 'cursor-pointer hover:border-primary/50 active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-foreground text-sm sm:text-base">{title}</h3>
        <div className={`p-2 rounded-lg ${
          color.includes('blue') ? 'bg-blue-500/20' :
          color.includes('yellow') ? 'bg-yellow-500/20' :
          color.includes('orange') ? 'bg-orange-500/20' :
          'bg-primary/20'
        }`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color}`} />
        </div>
      </div>
      {status && (
        <p className="text-2xl sm:text-3xl font-bold text-foreground capitalize mb-2">
          {status.replace("-", " ")}
        </p>
      )}
      {count !== undefined && (
        <p className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{count}</p>
      )}
      <p className="text-sm text-muted-foreground">{description}</p>
    </Component>
  )
}

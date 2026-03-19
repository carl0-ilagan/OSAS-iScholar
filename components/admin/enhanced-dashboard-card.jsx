"use client"

export default function EnhancedDashboardCard({ icon: Icon, label, value, color, change, trend, bgColor, onClick }) {
  const isPositive = trend === "up"
  const changeColor = isPositive ? "text-green-600" : "text-red-600"
  const bgGradient = bgColor || "from-primary/20 to-primary/5"
  const isInteractive = typeof onClick === "function"

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={
        isInteractive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={`bg-gradient-to-br ${bgGradient} border border-border/50 rounded-xl p-3 md:p-4 shadow-sm transition-all duration-300 relative overflow-hidden group ${
        isInteractive ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/35" : ""
      }`}
    >
      {/* Background Icon */}
      <div className={`absolute -right-3 -bottom-3 w-16 h-16 md:w-20 md:h-20 opacity-5 group-hover:opacity-10 transition-opacity duration-300`}>
        <Icon className="w-full h-full" style={{ color: `var(--${color.replace('text-', '')})` }} />
      </div>

      {/* Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2.5 md:mb-3">
          <div className={`p-1.5 md:p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/30`}>
            <Icon className={`w-4 h-4 md:w-4.5 md:h-4.5 ${color}`} />
          </div>
          {change && (
            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-background/70 backdrop-blur-sm border border-border/30 ${changeColor}`}>
              {isPositive ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span className="text-[9px] md:text-[10px] font-bold">{change}</span>
            </div>
          )}
        </div>

        <div className="space-y-0.5 md:space-y-1">
          <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground tracking-tight">{value}</p>
          <p className="text-[10px] md:text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">{label}</p>
        </div>
      </div>
    </div>
  )
}


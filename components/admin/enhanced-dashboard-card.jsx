"use client"

export default function EnhancedDashboardCard({ icon: Icon, label, value, color, change, trend, bgColor }) {
  const isPositive = trend === "up"
  const changeColor = isPositive ? "text-green-600" : "text-red-600"
  const bgGradient = bgColor || "from-primary/20 to-primary/5"

  return (
    <div className={`bg-gradient-to-br ${bgGradient} border-2 border-border/50 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg md:shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group hover:scale-[1.01] md:hover:scale-[1.02]`}>
      {/* Background Icon */}
      <div className={`absolute -right-4 md:-right-6 -bottom-4 md:-bottom-6 w-20 h-20 md:w-28 md:h-28 opacity-5 group-hover:opacity-15 transition-opacity duration-300`}>
        <Icon className="w-full h-full" style={{ color: `var(--${color.replace('text-', '')})` }} />
      </div>

      {/* Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl md:rounded-2xl"></div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className={`p-2 md:p-2.5 lg:p-3 rounded-lg md:rounded-xl bg-background/60 backdrop-blur-sm shadow-md border border-border/30`}>
            <Icon className={`w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 ${color}`} />
          </div>
          {change && (
            <div className={`flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg bg-background/70 backdrop-blur-sm border border-border/30 shadow-sm ${changeColor}`}>
              {isPositive ? (
                <svg className="w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span className="text-[9px] md:text-[10px] lg:text-xs font-bold">{change}</span>
            </div>
          )}
        </div>

        <div className="space-y-1 md:space-y-1.5">
          <p className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-extrabold text-foreground tracking-tight">{value}</p>
          <p className="text-[10px] md:text-xs lg:text-sm font-semibold text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
        </div>
      </div>
    </div>
  )
}


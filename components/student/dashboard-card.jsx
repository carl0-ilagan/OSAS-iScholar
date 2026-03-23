import { cn } from "@/lib/utils"
import { ArrowUpRight } from "lucide-react"

const accentStyles = {
  emerald: {
    ring: "ring-emerald-500/20",
    top: "from-emerald-500/80 to-emerald-600/40",
    wrap: "bg-emerald-500/15 ring-emerald-500/15",
    icon: "text-emerald-700 dark:text-emerald-400",
  },
  teal: {
    ring: "ring-teal-500/20",
    top: "from-teal-500/80 to-teal-600/40",
    wrap: "bg-teal-500/15 ring-teal-500/15",
    icon: "text-teal-700 dark:text-teal-400",
  },
  amber: {
    ring: "ring-amber-500/20",
    top: "from-amber-500/70 to-amber-600/40",
    wrap: "bg-amber-500/12 ring-amber-500/15",
    icon: "text-amber-800 dark:text-amber-400",
  },
}

export default function DashboardCard({ title, icon: Icon, status, count, description, accent = "emerald", onClick }) {
  const Component = onClick ? "button" : "div"
  const styles = accentStyles[accent] || accentStyles.emerald

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick || undefined}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border border-emerald-200/40 bg-card/95 p-5 text-left shadow-sm ring-1 ring-black/[0.04] transition-all duration-300 dark:border-emerald-900/35 dark:ring-white/[0.06]",
        styles.ring,
        onClick &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-900/10 dark:hover:border-emerald-700/50"
      )}
    >
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-90",
          styles.top
        )}
        aria-hidden
      />
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug text-foreground">{title}</h3>
        <div className={cn("rounded-xl p-2 ring-1 ring-inset", styles.wrap)}>
          <Icon className={cn("h-4 w-4", styles.icon)} />
        </div>
      </div>
      {status && (
        <p className="mb-1 bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text text-xl font-bold capitalize tracking-tight text-transparent dark:from-white dark:to-white/85">
          {status.replace("-", " ")}
        </p>
      )}
      {count !== undefined && (
        <p className="mb-1 text-2xl font-bold tabular-nums tracking-tight text-foreground">{count}</p>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      {onClick && (
        <span className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-700/90 transition-colors group-hover:text-emerald-800 dark:text-emerald-400/90">
          View details
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      )}
    </Component>
  )
}

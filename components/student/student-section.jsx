import { cn } from "@/lib/utils"

/**
 * Consistent panel chrome for student dashboard sections.
 */
export function StudentSection({ title, subtitle, icon: Icon, accent = "emerald", badge, children, className }) {
  const accents = {
    emerald: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
    teal: "bg-teal-500/15 text-teal-700 ring-teal-500/20 dark:text-teal-400",
    amber: "bg-amber-500/12 text-amber-800 ring-amber-500/20 dark:text-amber-400",
  }
  return (
    <section
      className={cn(
        "rounded-2xl border border-emerald-200/50 bg-card/90 p-5 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm dark:border-emerald-900/40 dark:bg-card/95 dark:ring-white/5",
        className
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
              accents[accent] || accents.emerald
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
            {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {badge}
      </div>
      {children}
    </section>
  )
}

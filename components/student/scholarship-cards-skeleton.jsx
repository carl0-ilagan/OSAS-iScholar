"use client"

export default function ScholarshipCardsSkeleton() {
  return (
    <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="animate-pulse overflow-hidden rounded-2xl border border-emerald-200/40 bg-card/80 ring-1 ring-black/[0.03] dark:border-emerald-900/40"
        >
          <div className="h-1 bg-gradient-to-r from-emerald-400/60 to-teal-500/50" />
          <div className="border-b border-emerald-100/60 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30 md:p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-200/50 dark:bg-emerald-900/50" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/4 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/60" />
                <div className="h-3 w-full rounded bg-muted/80" />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 md:p-5">
            <div className="rounded-xl border border-emerald-200/30 bg-emerald-50/30 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="mb-2 h-3 w-1/4 rounded bg-emerald-200/60 dark:bg-emerald-900/50" />
              <div className="mb-1 h-5 w-2/3 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/50" />
              <div className="h-3 w-1/2 rounded bg-muted/70" />
            </div>

            <div className="space-y-2">
              <div className="h-3 w-1/3 rounded bg-muted" />
              {[1, 2].map((req) => (
                <div key={req} className="flex items-center gap-2.5">
                  <div className="h-4 w-4 rounded-full bg-emerald-200/50 dark:bg-emerald-900/50" />
                  <div className="h-3 flex-1 rounded bg-muted/80" />
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-1">
              <div className="h-11 rounded-xl bg-gradient-to-r from-emerald-200/70 to-teal-200/60 dark:from-emerald-900/50 dark:to-teal-900/50" />
              <div className="h-10 rounded-xl border border-emerald-200/40 bg-white/60 dark:border-emerald-900/40 dark:bg-emerald-950/30" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

"use client"

export default function ScholarshipCardsSkeleton() {
  return (
    <div className="grid md:grid-cols-2 gap-4 md:gap-6">
      {[1, 2, 3, 4].map((item) => (
        <div 
          key={item}
          className="bg-card border border-border rounded-xl overflow-hidden animate-pulse"
        >
          {/* Header Skeleton */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 md:p-5 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-muted rounded w-full animate-pulse" />
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="p-4 md:p-5 space-y-4">
            {/* Benefit Section Skeleton */}
            <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="h-4 bg-muted rounded w-1/4 mb-2 animate-pulse" />
              <div className="h-5 bg-muted rounded w-2/3 mb-1 animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            </div>

            {/* Requirements Skeleton */}
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
              {[1, 2, 3, 4, 5].map((req) => (
                <div key={req} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 bg-muted rounded-full animate-pulse" />
                  <div className="h-4 bg-muted rounded flex-1 animate-pulse" />
                </div>
              ))}
            </div>

            {/* Buttons Skeleton */}
            <div className="space-y-2 pt-2">
              <div className="h-11 bg-muted rounded-lg animate-pulse" />
              <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}


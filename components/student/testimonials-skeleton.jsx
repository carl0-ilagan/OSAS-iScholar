export default function TestimonialsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded-lg w-64 animate-pulse" />
          <div className="h-4 bg-muted rounded-lg w-48 animate-pulse" />
        </div>
        <div className="h-10 bg-muted rounded-lg w-48 animate-pulse" />
      </div>

      {/* Filters Skeleton */}
      <div className="p-5 bg-muted/30 rounded-xl border border-border">
        <div className="h-4 bg-muted rounded w-32 mb-4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Cards Skeleton */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-5 md:p-6 animate-pulse"
          >
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-3 bg-muted rounded w-20" />
                <div className="h-3 bg-muted rounded w-32" />
              </div>
            </div>
            
            {/* Content */}
            <div className="space-y-2 mb-4">
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
            
            {/* Footer */}
            <div className="h-3 bg-muted rounded w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}


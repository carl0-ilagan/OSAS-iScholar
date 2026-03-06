export default function TestimonialsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Card Skeleton */}
      <div className="bg-muted/30 border border-border rounded-xl p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-muted rounded w-48"></div>
            <div className="h-4 bg-muted rounded w-32"></div>
          </div>
          <div className="h-12 w-20 bg-muted rounded-xl"></div>
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-muted rounded animate-pulse"></div>
          <div className="h-5 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
              <div className="h-10 bg-muted rounded-lg animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Cards Skeleton */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-2xl p-6 shadow-lg animate-pulse"
          >
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-muted rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded w-32"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </div>
            </div>
            
            {/* Badge */}
            <div className="h-8 bg-muted rounded-lg w-40 mb-4"></div>
            
            {/* Stars */}
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="w-4 h-4 bg-muted rounded"></div>
              ))}
            </div>
            
            {/* Content */}
            <div className="space-y-2 mb-5">
              <div className="h-3 bg-muted rounded w-full"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="h-3 bg-muted rounded w-20"></div>
              <div className="h-8 bg-muted rounded-lg w-20"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


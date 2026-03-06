"use client"

export default function AnnouncementsListSkeleton() {
  return (
    <>
      {/* Desktop Skeleton */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className="bg-card border border-border rounded-xl p-6 space-y-4 animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="h-6 w-3/4 bg-muted rounded"></div>
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-muted rounded-lg"></div>
                <div className="w-8 h-8 bg-muted rounded-lg"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded"></div>
              <div className="h-4 w-5/6 bg-muted rounded"></div>
              <div className="h-4 w-4/6 bg-muted rounded"></div>
            </div>
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
        ))}
      </div>

      {/* Mobile Skeleton */}
      <div className="md:hidden space-y-3">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="h-5 w-3/4 bg-muted rounded"></div>
              <div className="flex gap-2">
                <div className="w-6 h-6 bg-muted rounded-lg"></div>
                <div className="w-6 h-6 bg-muted rounded-lg"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-muted rounded"></div>
              <div className="h-3 w-4/5 bg-muted rounded"></div>
            </div>
            <div className="h-3 w-28 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    </>
  )
}


"use client"

export default function VerificationFormSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-6 md:p-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-6 pb-4 border-b border-border/50">
        <div className="h-6 bg-muted rounded w-1/3 mb-2 animate-pulse" />
        <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
      </div>

      {/* Form Fields Skeleton */}
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((field) => (
            <div key={field} className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons Skeleton */}
      <div className="flex justify-between mt-8 pt-6 border-t border-border/50">
        <div className="h-10 bg-muted rounded w-24 animate-pulse" />
        <div className="h-10 bg-muted rounded w-24 animate-pulse" />
      </div>
    </div>
  )
}


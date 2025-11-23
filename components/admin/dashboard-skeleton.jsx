"use client"

export default function DashboardSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
      {[...Array(6)].map((_, index) => (
        <div
          key={index}
          className="bg-card border border-border rounded-lg p-6 animate-pulse"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="h-5 w-32 bg-muted rounded"></div>
            <div className="w-6 h-6 bg-muted rounded"></div>
          </div>
          <div className="h-8 w-16 bg-muted rounded"></div>
        </div>
      ))}
    </div>
  )
}


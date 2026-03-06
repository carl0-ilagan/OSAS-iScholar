"use client"

export default function ApplicationsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Desktop Skeleton */}
      <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Program</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Date Submitted</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-6 py-4">
                    <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 bg-muted rounded-full w-20 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-8 bg-muted rounded w-20 animate-pulse"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Skeleton */}
      <div className="md:hidden space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
              </div>
              <div className="h-6 bg-muted rounded-full w-20 animate-pulse"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-5/6 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-4/6 animate-pulse"></div>
            </div>
            <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  )
}


"use client"

export default function NotificationsTableSkeleton() {
  return (
    <>
      {/* Desktop Skeleton */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-primary to-secondary">
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Type</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Message</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Time</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Action</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(10)].map((_, index) => (
              <tr
                key={index}
                className={`border-b border-border/50 ${
                  index % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                }`}
              >
                <td className="px-6 py-4">
                  <div className="h-8 w-24 bg-muted rounded-lg animate-pulse"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
                    <div className="h-3 w-32 bg-muted rounded animate-pulse"></div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-6 w-20 bg-muted rounded-full animate-pulse"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-6 w-16 bg-muted rounded animate-pulse"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Skeleton */}
      <div className="md:hidden space-y-3">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="h-6 w-24 bg-muted rounded-lg"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded"></div>
              <div className="h-3 w-2/3 bg-muted rounded"></div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="h-6 w-20 bg-muted rounded-full"></div>
              <div className="h-4 w-24 bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}


"use client"

export default function UsersTableSkeleton() {
  return (
    <>
      {/* Desktop Skeleton */}
      <div className="hidden md:block">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-primary to-secondary">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Student Number</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Course</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Year</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Campus</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Verification</th>
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
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted animate-pulse"></div>
                      <div className="space-y-1">
                        <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
                        <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-40 bg-muted rounded animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-28 bg-muted rounded animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-28 bg-muted rounded animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 w-20 bg-muted rounded-full animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 w-24 bg-muted rounded-full animate-pulse"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Skeleton */}
      <div className="md:hidden space-y-3">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-full bg-muted"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded"></div>
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-muted rounded-full"></div>
                    <div className="h-6 w-24 bg-muted rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-muted rounded"></div>
              <div className="h-3 w-3/4 bg-muted rounded"></div>
              <div className="h-3 w-2/3 bg-muted rounded"></div>
              <div className="h-3 w-1/2 bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}


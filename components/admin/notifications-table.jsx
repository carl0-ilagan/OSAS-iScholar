"use client"

import { Bell, FileCheck, FileText, Award, UserCheck, X, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

const getNotificationIcon = (type) => {
  switch (type) {
    case "verification":
      return FileCheck
    case "application":
      return FileText
    case "approval":
      return Award
    case "user":
      return UserCheck
    default:
      return Bell
  }
}

const getNotificationColor = (type) => {
  switch (type) {
    case "verification":
      return "text-yellow-600 bg-yellow-50 border-yellow-200"
    case "application":
      return "text-blue-600 bg-blue-50 border-blue-200"
    case "approval":
      return "text-green-600 bg-green-50 border-green-200"
    case "user":
      return "text-purple-600 bg-purple-50 border-purple-200"
    default:
      return "text-gray-600 bg-gray-50 border-gray-200"
  }
}

const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return Clock
    case "approved":
      return CheckCircle
    case "rejected":
      return XCircle
    case "verified":
      return CheckCircle
    default:
      return AlertCircle
  }
}

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return "text-yellow-600"
    case "approved":
      return "text-green-600"
    case "rejected":
      return "text-red-600"
    case "verified":
      return "text-green-600"
    default:
      return "text-gray-600"
  }
}

export default function NotificationsTable({ notifications, onView, onMarkRead }) {
  if (notifications.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No notifications yet</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block bg-gradient-to-br from-card/50 to-card border-2 border-border/50 rounded-xl overflow-hidden shadow-lg">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-primary via-primary/95 to-secondary">
              <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">Message</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">Time</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notification, index) => {
              const Icon = getNotificationIcon(notification.type)
              const StatusIcon = getStatusIcon(notification.status)
              const colorClass = getNotificationColor(notification.type)
              const statusColor = getStatusColor(notification.status)
              
              return (
                <tr
                  key={notification.id || index}
                  className={`border-b border-border/30 transition-all duration-200 hover:bg-muted/50 ${
                    index % 2 === 0 ? 'bg-card/50' : 'bg-muted/20'
                  } ${!notification.read ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 shadow-sm ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-xs md:text-sm font-bold capitalize tracking-wide">{notification.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{notification.message}</p>
                      {notification.userName && (
                        <p className="text-xs text-muted-foreground font-medium">From: <span className="font-semibold text-foreground/80">{notification.userName}</span></p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                      <span className={`text-sm font-medium capitalize ${statusColor}`}>
                        {notification.status || "N/A"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {notification.timestamp
                        ? formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })
                        : "Just now"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {onView && (
                        <button
                          onClick={() => onView(notification)}
                          className="px-3 py-1.5 text-xs md:text-sm text-primary hover:text-primary-foreground hover:bg-primary font-semibold rounded-lg border border-primary/30 hover:border-primary transition-all duration-200 hover:shadow-md"
                        >
                          View
                        </button>
                      )}
                      {!notification.read && onMarkRead && (
                        <button
                          onClick={() => onMarkRead(notification.id)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200"
                          title="Mark as read"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {notifications.map((notification, index) => {
          const Icon = getNotificationIcon(notification.type)
          const StatusIcon = getStatusIcon(notification.status)
          const colorClass = getNotificationColor(notification.type)
          const statusColor = getStatusColor(notification.status)

          return (
            <div
              key={notification.id || index}
              className={`bg-gradient-to-br from-card to-card/80 border-2 border-border/50 rounded-xl p-4 space-y-3 shadow-md hover:shadow-lg transition-all duration-300 ${
                !notification.read ? 'bg-primary/10 border-primary/40 border-l-4' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium capitalize">{notification.type}</span>
                </div>
                {!notification.read && onMarkRead && (
                  <button
                    onClick={() => onMarkRead(notification.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Mark as read"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{notification.message}</p>
                {notification.userName && (
                  <p className="text-xs text-muted-foreground">From: {notification.userName}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                  <span className={`text-xs font-medium capitalize ${statusColor}`}>
                    {notification.status || "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {notification.timestamp
                      ? formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })
                      : "Just now"}
                  </span>
                  {onView && (
                    <button
                      onClick={() => onView(notification)}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      View
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}


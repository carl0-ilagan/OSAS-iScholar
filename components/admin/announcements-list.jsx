"use client"

import { Calendar, Edit, Trash2, FileText, Clock, CheckCircle, Archive, Award } from "lucide-react"

export default function AnnouncementsList({ announcements, onEdit, onDelete, getStatus }) {
  const formatDate = (date) => {
    if (!date) return "N/A"
    const d = date instanceof Date ? date : new Date(date)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (announcement) => {
    const status = getStatus ? getStatus(announcement) : (announcement.calculatedStatus || announcement.status || "active")
    
    if (status === "incoming") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-600 border border-blue-500/30 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Incoming
        </span>
      )
    } else if (status === "archived") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-600 border border-gray-500/30 flex items-center gap-1.5">
          <Archive className="w-3 h-3" />
          Archived
        </span>
      )
    } else {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-600 border border-green-500/30 flex items-center gap-1.5">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      )
    }
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center py-12 bg-card border border-border rounded-xl">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No announcements found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop Grid View */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 pr-2">
                <h3 className="text-lg font-bold text-foreground line-clamp-2 mb-2">
                  {announcement.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(announcement)}
                  {announcement.targetScholarships && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Award className="w-3 h-3" />
                      <span>
                        {announcement.targetScholarships.includes("all") 
                          ? "All Scholarships" 
                          : `${announcement.targetScholarships.length} Scholarship${announcement.targetScholarships.length > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onEdit(announcement)}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(announcement.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
              {announcement.description || "No description"}
            </p>
            
            <div className="space-y-1 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Created: {formatDate(announcement.createdAt)}</span>
              </div>
              {announcement.endDate && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Ends: {formatDate(announcement.endDate)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile List View */}
      <div className="md:hidden space-y-3">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="bg-card border border-border rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 pr-2">
                <h3 className="text-base font-bold text-foreground mb-2">
                  {announcement.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {getStatusBadge(announcement)}
                  {announcement.targetScholarships && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Award className="w-3 h-3" />
                      <span>
                        {announcement.targetScholarships.includes("all") 
                          ? "All" 
                          : `${announcement.targetScholarships.length}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onEdit(announcement)}
                  className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(announcement.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {announcement.description || "No description"}
            </p>
            
            <div className="space-y-1 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Created: {formatDate(announcement.createdAt)}</span>
              </div>
              {announcement.endDate && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Ends: {formatDate(announcement.endDate)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


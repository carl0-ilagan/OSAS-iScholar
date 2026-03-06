"use client"

import { useState } from "react"
import { CheckCircle, Clock, XCircle, Eye, User } from "lucide-react"
import ApplicationDetailModal from "./application-detail-modal"

export default function ApplicationsTable({ applications, onUpdate }) {
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || "pending"
    
    if (statusLower === "approved") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-600 border border-green-500/30">
          Approved
        </span>
      )
    } else if (statusLower === "rejected") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-600 border border-red-500/30">
          Rejected
        </span>
      )
    } else if (statusLower === "under-review") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-600 border border-blue-500/30">
          Under Review
        </span>
      )
    } else {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-600 border border-yellow-500/30">
          Pending
        </span>
      )
    }
  }

  const handleView = (application) => {
    setSelectedApplication(application)
    setIsModalOpen(true)
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No applications found</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-primary to-secondary">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Student</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Scholarship</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Course</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Year</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Campus</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Submitted</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-white">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, index) => (
                <tr
                  key={app.id}
                  className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {app.photoURL ? (
                        <img
                          src={app.photoURL}
                          alt={app.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">{app.name}</p>
                        <p className="text-xs text-muted-foreground">{app.studentNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-foreground">{app.scholarshipName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-foreground">{app.course}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-foreground">{app.yearLevel}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-foreground">{app.campus}</p>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(app.status)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-muted-foreground">{app.submittedDate}</p>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleView(app)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {applications.map((app) => (
          <div
            key={app.id}
            className="bg-card border border-border rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                {app.photoURL ? (
                  <img
                    src={app.photoURL}
                    alt={app.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{app.name}</p>
                  <p className="text-xs text-muted-foreground">{app.studentNumber}</p>
                </div>
              </div>
              {getStatusBadge(app.status)}
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-20">Scholarship:</span>
                <span className="text-foreground font-medium">{app.scholarshipName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-20">Course:</span>
                <span className="text-foreground">{app.course}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-20">Year:</span>
                <span className="text-foreground">{app.yearLevel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-20">Campus:</span>
                <span className="text-foreground">{app.campus}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-20">Submitted:</span>
                <span className="text-foreground">{app.submittedDate}</span>
              </div>
            </div>

            <button
              onClick={() => handleView(app)}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Application Detail Modal */}
      {isModalOpen && selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedApplication(null)
          }}
          onUpdate={onUpdate}
        />
      )}
    </>
  )
}


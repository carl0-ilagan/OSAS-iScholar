"use client"

import { useState } from "react"
import { Eye, ChevronLeft, ChevronRight } from "lucide-react"
import VerificationDetailModal from "./verification-detail-modal"

export default function VerificationTable({ verifications, currentPage, totalPages, onPageChange, onUpdate }) {
  const [selectedVerification, setSelectedVerification] = useState(null)

  if (verifications.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center shadow-sm">
        <p className="text-muted-foreground">No verifications found</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full">
          <thead>
              <tr className="bg-gradient-to-r from-primary to-secondary">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Student Number</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Course</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Year Level</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Campus</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
              {verifications.map((verification, index) => (
                <tr 
                  key={verification.id} 
                  className={`border-b border-border/50 transition-colors ${
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                  } hover:bg-muted/50`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary overflow-hidden ring-2 ring-primary/20 shadow-sm flex-shrink-0">
                        {verification.photoURL ? (
                          <img 
                            src={verification.photoURL} 
                            alt={verification.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              const fallback = e.target.nextElementSibling
                              if (fallback) fallback.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-full h-full flex items-center justify-center font-bold text-white text-sm bg-gradient-to-br from-primary to-secondary ${verification.photoURL ? 'hidden' : ''}`}
                        >
                          {verification.name?.[0]?.toUpperCase() || "U"}
                        </div>
                      </div>
                      <span className="font-medium text-foreground">{verification.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-foreground font-mono text-sm">{verification.studentNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-foreground">{verification.course}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-foreground">{verification.yearLevel}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-foreground">{verification.campus}</span>
                  </td>
                <td className="px-6 py-4">
                  <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                      verification.status === "verified"
                          ? "bg-green-100 text-green-700 border border-green-200"
                        : verification.status === "under-review"
                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                            : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                    }`}
                  >
                    {verification.status.replace("-", " ")}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                      onClick={() => setSelectedVerification(verification)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
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
        {verifications.map((verification) => (
          <div
            key={verification.id}
            className="bg-card border border-border rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary overflow-hidden ring-2 ring-primary/20 shadow-sm flex-shrink-0">
                {verification.photoURL ? (
                  <img 
                    src={verification.photoURL} 
                    alt={verification.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      const fallback = e.target.nextElementSibling
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div 
                  className={`w-full h-full flex items-center justify-center font-bold text-white text-sm bg-gradient-to-br from-primary to-secondary ${verification.photoURL ? 'hidden' : ''}`}
                >
                  {verification.name?.[0]?.toUpperCase() || "U"}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-base mb-1 truncate">
                  {verification.name}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {verification.studentNumber}
                </p>
              </div>
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                  verification.status === "verified"
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : verification.status === "under-review"
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                }`}
              >
                {verification.status.replace("-", " ")}
              </span>
            </div>
            
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span className="text-muted-foreground min-w-[80px]">Course:</span>
                <span className="truncate">{verification.course}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span className="text-muted-foreground min-w-[80px]">Year:</span>
                <span>{verification.yearLevel}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span className="text-muted-foreground min-w-[80px]">Campus:</span>
                <span className="truncate">{verification.campus}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedVerification(verification)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors border border-primary/20"
            >
              <Eye className="w-4 h-4" />
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Verification Detail Modal */}
      <VerificationDetailModal
        isOpen={!!selectedVerification}
        onClose={() => setSelectedVerification(null)}
        verification={selectedVerification}
        onUpdate={onUpdate}
      />

      {/* Pagination - Mobile */}
      {totalPages > 1 && (
        <div className="md:hidden flex items-center justify-between mt-6 px-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pagination - Desktop */}
      {totalPages > 1 && (
        <div className="hidden md:flex items-center justify-between mt-6 px-6 py-4 border-t border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === page
                          ? "bg-primary text-white"
                          : "bg-card border border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {page}
                    </button>
                  )
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  )
                }
                return null
              })}
            </div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}
    </>
  )
}

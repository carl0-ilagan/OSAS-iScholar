"use client"

import { useState } from "react"
import { CheckCircle, Eye, User, Award, GraduationCap, Calendar, Hash } from "lucide-react"
import ApplicationDetailModal from "./application-detail-modal"

export default function ScholarsTable({ scholars }) {
  const [selectedScholar, setSelectedScholar] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleView = (scholar) => {
    setSelectedScholar(scholar)
    setIsModalOpen(true)
  }

  if (scholars.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No scholars found</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80">Scholar</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80">Scholarship</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80">Student Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80">Course</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80">Year</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80">Approved Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-foreground/80">Action</th>
              </tr>
            </thead>
            <tbody>
              {scholars.map((scholar, index) => (
                <tr
                  key={scholar.id}
                  className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {scholar.photoURL ? (
                        <img
                          src={scholar.photoURL}
                          alt={scholar.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            const fallback = e.target.nextElementSibling
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-10 h-10 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100 flex items-center justify-center ${scholar.photoURL ? 'hidden' : 'flex'}`}
                      >
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{scholar.name}</p>
                        {scholar.benefitAmount && (
                          <p className="text-xs text-muted-foreground">
                            ₱{parseFloat(scholar.benefitAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">{scholar.scholarshipName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-mono text-foreground">{scholar.studentNumber}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-foreground">{scholar.course}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{scholar.yearLevel}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-foreground">{scholar.reviewedDate}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleView(scholar)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors mx-auto"
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
        {scholars.map((scholar) => (
          <div
            key={scholar.id}
            className="bg-card border border-border rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-start gap-3 mb-3">
              {scholar.photoURL ? (
                <img
                  src={scholar.photoURL}
                  alt={scholar.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20 flex-shrink-0"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    const fallback = e.target.nextElementSibling
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
              ) : null}
              <div
                className={`w-12 h-12 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100 flex items-center justify-center flex-shrink-0 ${scholar.photoURL ? 'hidden' : 'flex'}`}
              >
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-base mb-1 truncate">
                  {scholar.name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-primary" />
                  <p className="text-sm text-foreground truncate">{scholar.scholarshipName}</p>
                </div>
                {scholar.benefitAmount && (
                  <p className="text-sm font-semibold text-primary">
                    ₱{parseFloat(scholar.benefitAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground font-mono">{scholar.studentNumber}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <GraduationCap className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground">{scholar.course}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Year:</span>
                <span className="text-foreground">{scholar.yearLevel}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                <Calendar className="w-3 h-3" />
                <span>Approved: {scholar.reviewedDate}</span>
              </div>
            </div>

            <button
              onClick={() => handleView(scholar)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <Eye className="w-4 h-4" />
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedScholar && (
        <ApplicationDetailModal
          application={selectedScholar}
          isOpen={isModalOpen}
          readOnly
          onClose={() => {
            setIsModalOpen(false)
            setSelectedScholar(null)
          }}
        />
      )}
    </>
  )
}


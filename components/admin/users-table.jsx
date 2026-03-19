"use client"

import { User, Mail, Hash, GraduationCap, MapPin, Calendar, Circle, Shield, UserRoundX, UserCheck, KeyRound, Trash2 } from "lucide-react"

export default function UsersTable({
  users,
  onToggleDisable,
  onResetPassword,
  onDeleteUser,
  actionLoadingUserId = null,
}) {
  const hasActions = Boolean(onToggleDisable || onResetPassword || onDeleteUser)

  const getStatusBadge = (status) => {
    if (status === "disabled") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-600 border border-red-500/30 flex items-center gap-1.5">
          <Circle className="w-2 h-2 fill-red-600 text-red-600" />
          Disabled
        </span>
      )
    }
    if (status === "online") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-600 border border-green-500/30 flex items-center gap-1.5">
          <Circle className="w-2 h-2 fill-green-600 text-green-600" />
          Online
        </span>
      )
    } else {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-600 border border-gray-500/30 flex items-center gap-1.5">
          <Circle className="w-2 h-2 fill-gray-600 text-gray-600" />
          Offline
        </span>
      )
    }
  }

  const getRoleBadge = (role) => {
    const normalizedRole = String(role || "student").trim().toLowerCase()
    if (normalizedRole === "admin") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/20 px-2 py-0.5 text-xs font-semibold text-violet-700">
          <Shield className="h-3 w-3" />
          Admin
        </span>
      )
    }
    if (normalizedRole === "campus_admin" || normalizedRole === "campusadmin") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-700">
          <Shield className="h-3 w-3" />
          Campus Admin
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/30 bg-slate-500/20 px-2 py-0.5 text-xs font-semibold text-slate-700">
        <User className="h-3 w-3" />
        Student
      </span>
    )
  }


  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No users found</p>
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
              <tr className="bg-muted/60 border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80">Student Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80">Course</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80">Year</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80">Campus</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80">Status</th>
                {hasActions && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr
                  key={user.id}
                  className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.fullName}
                          className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-primary/20"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            const fallback = e.target.nextElementSibling
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div 
                        className={`h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white text-xs ring-2 ring-primary/20 ${user.photoURL ? 'hidden' : 'flex'}`}
                      >
                        {user.fullName?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.fullName}</p>
                        <div className="mt-1">{getRoleBadge(user.role)}</div>
                        {user.createdAt && (
                          <p className="text-[11px] text-muted-foreground">
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs text-foreground">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs font-mono text-foreground">{user.studentNumber}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs text-foreground">{user.course}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-foreground">{user.yearLevel}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs text-foreground">{user.campus}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(user.status)}
                  </td>
                  {hasActions && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {onToggleDisable && (
                          <button
                            onClick={() => onToggleDisable(user)}
                            disabled={actionLoadingUserId === user.id}
                            title={user.accountDisabled ? "Enable account" : "Disable account"}
                            aria-label={user.accountDisabled ? "Enable account" : "Disable account"}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {user.accountDisabled ? <UserCheck className="h-4 w-4" /> : <UserRoundX className="h-4 w-4" />}
                          </button>
                        )}
                        {onResetPassword && (
                          <button
                            onClick={() => onResetPassword(user)}
                            disabled={actionLoadingUserId === user.id}
                            title="Reset password"
                            aria-label="Reset password"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                        )}
                        {onDeleteUser && (
                          <button
                            onClick={() => onDeleteUser(user)}
                            disabled={actionLoadingUserId === user.id}
                            title="Delete user"
                            aria-label="Delete user"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-card border border-border rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-start gap-3 mb-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.fullName}
                  className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-primary/20"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    const fallback = e.target.nextElementSibling
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
              ) : null}
              <div 
                className={`h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white text-sm ring-2 ring-primary/20 ${user.photoURL ? 'hidden' : 'flex'}`}
              >
                {user.fullName?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-base mb-1 truncate">
                  {user.fullName}
                </h3>
                <div className="mb-2">{getRoleBadge(user.role)}</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {getStatusBadge(user.status)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground font-mono">{user.studentNumber}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <GraduationCap className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground">{user.course}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Year:</span>
                <span className="text-foreground">{user.yearLevel}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground">{user.campus}</span>
              </div>
              {user.createdAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                  <Calendar className="w-3 h-3" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              )}
              {hasActions && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
                  {onToggleDisable && (
                    <button
                      onClick={() => onToggleDisable(user)}
                      disabled={actionLoadingUserId === user.id}
                      title={user.accountDisabled ? "Enable account" : "Disable account"}
                      aria-label={user.accountDisabled ? "Enable account" : "Disable account"}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {user.accountDisabled ? <UserCheck className="h-4 w-4" /> : <UserRoundX className="h-4 w-4" />}
                    </button>
                  )}
                  {onResetPassword && (
                    <button
                      onClick={() => onResetPassword(user)}
                      disabled={actionLoadingUserId === user.id}
                      title="Reset password"
                      aria-label="Reset password"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                  )}
                  {onDeleteUser && (
                    <button
                      onClick={() => onDeleteUser(user)}
                      disabled={actionLoadingUserId === user.id}
                      title="Delete user"
                      aria-label="Delete user"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}


"use client"

import { useState, useMemo } from "react"
import { Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns"

export default function AnnouncementsCalendar({ announcements }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get announcements with dates
  const announcementsWithDates = useMemo(() => {
    return announcements.map((announcement) => {
      let startDate = null
      let endDate = null

      if (announcement.startDate) {
        if (announcement.startDate.toDate && typeof announcement.startDate.toDate === 'function') {
          startDate = announcement.startDate.toDate()
        } else if (announcement.startDate instanceof Date) {
          startDate = announcement.startDate
        } else if (typeof announcement.startDate === 'string') {
          startDate = new Date(announcement.startDate)
        } else if (announcement.startDate.seconds) {
          startDate = new Date(announcement.startDate.seconds * 1000)
        }
      }

      if (announcement.endDate) {
        if (announcement.endDate.toDate && typeof announcement.endDate.toDate === 'function') {
          endDate = announcement.endDate.toDate()
        } else if (announcement.endDate instanceof Date) {
          endDate = announcement.endDate
        } else if (typeof announcement.endDate === 'string') {
          endDate = new Date(announcement.endDate)
        } else if (announcement.endDate.seconds) {
          endDate = new Date(announcement.endDate.seconds * 1000)
        }
      }

      // Use createdAt as fallback
      if (!startDate && announcement.createdAt) {
        if (announcement.createdAt.toDate && typeof announcement.createdAt.toDate === 'function') {
          startDate = announcement.createdAt.toDate()
        } else if (announcement.createdAt instanceof Date) {
          startDate = announcement.createdAt
        } else if (typeof announcement.createdAt === 'string') {
          startDate = new Date(announcement.createdAt)
        } else if (announcement.createdAt.seconds) {
          startDate = new Date(announcement.createdAt.seconds * 1000)
        }
      }

      return {
        ...announcement,
        startDate,
        endDate,
      }
    }).filter(a => a.startDate)
  }, [announcements])

  // Get announcements for a specific date
  const getAnnouncementsForDate = (date) => {
    return announcementsWithDates.filter((announcement) => {
      if (!announcement.startDate) return false
      
      const start = new Date(announcement.startDate)
      start.setHours(0, 0, 0, 0)
      
      const end = announcement.endDate ? new Date(announcement.endDate) : start
      end.setHours(23, 59, 59, 999)
      
      const checkDate = new Date(date)
      checkDate.setHours(0, 0, 0, 0)
      
      return checkDate >= start && checkDate <= end
    })
  }

  // Get calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()

  return (
    <div className="bg-gradient-to-br from-card via-card/80 to-card/50 border-2 border-border/50 rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-6 shadow-xl md:shadow-2xl w-full h-full backdrop-blur-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-300">
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <div className="p-1.5 md:p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg shadow-lg border border-primary/20">
          <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm md:text-base lg:text-lg xl:text-xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent">
            Announcements Calendar
          </h3>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 font-medium">
            View scheduled announcements
          </p>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-2 md:mb-3 lg:mb-4 bg-gradient-to-r from-muted/40 to-muted/20 backdrop-blur-sm rounded-lg md:rounded-xl p-1.5 md:p-2 lg:p-3 border border-border/50 shadow-inner">
        <button
          onClick={goToPreviousMonth}
          className="p-1 md:p-1.5 lg:p-2 hover:bg-background/80 rounded-md md:rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-md"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 text-foreground" />
        </button>
        <h4 className="text-xs md:text-sm lg:text-base xl:text-lg font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent text-center px-1 md:px-2">
          {format(currentDate, 'MMMM yyyy')}
        </h4>
        <button
          onClick={goToNextMonth}
          className="p-1 md:p-1.5 lg:p-2 hover:bg-background/80 rounded-md md:rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-md"
          aria-label="Next month"
        >
          <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 text-foreground" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5 md:gap-1 lg:gap-1.5 mb-2 md:mb-3">
        {/* Week day headers */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-[9px] md:text-[10px] lg:text-xs font-bold text-muted-foreground py-0.5 md:py-1 lg:py-2 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, today)
          const dayAnnouncements = getAnnouncementsForDate(day)
          const hasAnnouncements = dayAnnouncements.length > 0

          return (
            <div
              key={index}
              className={`
                min-h-[30px] sm:min-h-[35px] md:min-h-[40px] lg:min-h-[50px] p-0.5 md:p-1 lg:p-1.5 border border-border/50 rounded-md md:rounded-lg
                ${isCurrentMonth ? 'bg-gradient-to-br from-card to-card/80 hover:from-muted/30 hover:to-muted/20' : 'bg-muted/20 opacity-50'}
                ${isToday ? 'ring-2 ring-primary shadow-md md:shadow-lg bg-primary/5 border-primary' : ''}
                ${hasAnnouncements ? 'bg-gradient-to-br from-primary/15 to-primary/5 border-primary/60 shadow-sm md:shadow-md' : ''}
                transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-sm
              `}
            >
              <div className="flex flex-col h-full">
                <span
                  className={`
                    text-[10px] md:text-xs font-medium mb-0.5
                    ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                    ${isToday ? 'text-primary font-bold' : ''}
                  `}
                >
                  {format(day, 'd')}
                </span>
                {hasAnnouncements && (
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {dayAnnouncements.slice(0, 3).map((announcement, idx) => {
                      const now = new Date()
                      const isActive = announcement.endDate 
                        ? new Date(announcement.endDate) >= now
                        : true
                      
                      return (
                        <div
                          key={idx}
                          className={`
                            w-2 h-2 rounded-full
                            ${isActive ? 'bg-primary' : 'bg-muted-foreground'}
                          `}
                          title={announcement.title}
                        />
                      )
                    })}
                    {dayAnnouncements.length > 3 && (
                      <span className="text-[8px] text-muted-foreground">
                        +{dayAnnouncements.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          <span className="text-muted-foreground">Active Announcement</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
          <span className="text-muted-foreground">Past Announcement</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-primary"></div>
          <span className="text-muted-foreground">Today</span>
        </div>
      </div>
    </div>
  )
}


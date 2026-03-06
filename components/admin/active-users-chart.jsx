"use client"

import { useMemo, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { TrendingUp, Filter } from "lucide-react"

const ADMIN_EMAIL = "contact.ischolar@gmail.com"

export default function ActiveUsersChart({ users, uniqueCampuses, uniqueCourses }) {
  const [chartFilterCampus, setChartFilterCampus] = useState("all")
  const [chartFilterCourse, setChartFilterCourse] = useState("all")
  
  // Filter out admin accounts and invalid users - only show valid student users
  const studentUsers = useMemo(() => {
    return users.filter(user => {
      // Filter out admin
      if (user.email === ADMIN_EMAIL) return false
      
      // Filter out users without @minsu.edu.ph email
      if (!user.email || !user.email.endsWith("@minsu.edu.ph")) return false
      
      // Filter out users without valid student data
      const hasStudentData = user.studentNumber && 
                             user.studentNumber !== "N/A" && 
                             user.course && 
                             user.course !== "N/A"
      
      // Filter out users with "Unknown" name
      const hasValidName = (user.fullName && user.fullName !== "Unknown") || 
                           (user.displayName && user.displayName !== "Unknown")
      
      return hasStudentData && hasValidName
    })
  }, [users])
  // Calculate active users per day for the last 7 days
  const chartData = useMemo(() => {
    const days = []
    const now = new Date()
    
    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      
      // Filter users based on campus and course (use chart-specific filters)
      // Note: studentUsers already excludes admin accounts
      let filteredUsers = studentUsers
      if (chartFilterCampus !== "all") {
        filteredUsers = filteredUsers.filter(user => user.campus === chartFilterCampus)
      }
      if (chartFilterCourse !== "all") {
        filteredUsers = filteredUsers.filter(user => user.course === chartFilterCourse)
      }
      
      // Count active users for this day
      // A user is considered active if they were online on that day
      const activeCount = filteredUsers.filter(user => {
        // If user is currently online and today is the current day, count them
        if (i === 0 && user.status === "online") {
          return true
        }
        
        // Check lastSeen timestamp
        if (!user.lastSeen) return false
        
        // Handle Firestore timestamp
        let lastSeenDate
        if (user.lastSeen?.toDate) {
          lastSeenDate = user.lastSeen.toDate()
        } else if (user.lastSeen?.seconds) {
          lastSeenDate = new Date(user.lastSeen.seconds * 1000)
        } else if (typeof user.lastSeen === 'string') {
          lastSeenDate = new Date(user.lastSeen)
        } else {
          return false
        }
        
        // Check if lastSeen is within this day
        return lastSeenDate >= date && lastSeenDate <= dayEnd
      }).length
      
      days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        active: activeCount,
      })
    }
    
    return days
  }, [studentUsers, chartFilterCampus, chartFilterCourse])

  const maxValue = Math.max(...chartData.map(d => d.active), 1)
  const chartConfig = {
    active: {
      label: "Active Users",
      color: "hsl(var(--chart-1))",
    },
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg md:text-xl font-bold text-foreground">Most Active Users</h3>
        </div>
        
        {/* Chart Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">View by:</span>
          </div>
          
          {/* Campus Filter */}
          <select
            value={chartFilterCampus}
            onChange={(e) => setChartFilterCampus(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
          >
            <option value="all">All Campuses</option>
            {uniqueCampuses.map((campus) => (
              <option key={campus} value={campus}>
                {campus}
              </option>
            ))}
          </select>
          
          {/* Course Filter */}
          <select
            value={chartFilterCourse}
            onChange={(e) => setChartFilterCourse(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all duration-200"
          >
            <option value="all">All Courses</option>
            {uniqueCourses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <ChartContainer config={chartConfig} className="h-[300px] md:h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, maxValue + 1]}
              allowDecimals={false}
            />
            <ChartTooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = chartData.find(d => d.date === label)
                  return (
                    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                      <p className="text-sm font-semibold text-foreground mb-1">
                        {data?.fullDate || label}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <p className="text-sm text-muted-foreground">
                          Active Users: <span className="font-semibold text-foreground">{payload[0].value}</span>
                        </p>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Line 
              type="monotone" 
              dataKey="active" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ fill: "hsl(var(--primary))", r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
              activeDot={{ r: 7, strokeWidth: 2, stroke: "hsl(var(--background))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}


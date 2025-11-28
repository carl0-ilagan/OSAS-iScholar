"use client"

import { useMemo, useState, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { FileText, Award, Clock, CheckCircle, TrendingUp } from "lucide-react"

const COLORS = {
  pending: "#f59e0b", // amber-500
  approved: "#10b981", // emerald-500
  rejected: "#ef4444", // red-500
  "under-review": "#3b82f6", // blue-500
}

const STATUS_COLORS = [
  "#10b981", // emerald-500 - Approved
  "#f59e0b", // amber-500 - Pending
  "#3b82f6", // blue-500 - Under Review
  "#ef4444", // red-500 - Rejected
]

export default function ApplicationsChart({ applications }) {
  const [activeTab, setActiveTab] = useState("pending") // "pending" or "approved"
  const [chartHeight, setChartHeight] = useState(500)

  useEffect(() => {
    const updateHeight = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 640) {
          setChartHeight(250)
        } else if (window.innerWidth < 768) {
          setChartHeight(300)
        } else if (window.innerWidth < 1024) {
          setChartHeight(400)
        } else {
          setChartHeight(500)
        }
      }
    }
    updateHeight()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateHeight)
      return () => window.removeEventListener('resize', updateHeight)
    }
  }, [])

  // Group applications by scholarship type and status
  const chartData = useMemo(() => {
    if (activeTab === "pending") {
      // Pie chart for pending applications by scholarship type
      const scholarshipMap = {}
      
      applications.forEach((app) => {
        const status = app.status?.toLowerCase() || "pending"
        if (status === "pending" || status === "under-review") {
          // Try multiple field names that might exist in Firebase
          const scholarship = app.scholarshipName || 
                            app.scholarship || 
                            app.program ||
                            app.scholarshipType ||
                            "Unknown"
          scholarshipMap[scholarship] = (scholarshipMap[scholarship] || 0) + 1
        }
      })
      
      return Object.entries(scholarshipMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    } else {
      // Pie chart for approved applications by scholarship type
      const scholarshipMap = {}
      
      applications.forEach((app) => {
        const status = app.status?.toLowerCase() || "pending"
        if (status === "approved") {
          // Try multiple field names that might exist in Firebase
          const scholarship = app.scholarshipName || 
                            app.scholarship || 
                            app.program ||
                            app.scholarshipType ||
                            "Unknown"
          scholarshipMap[scholarship] = (scholarshipMap[scholarship] || 0) + 1
        }
      })
      
      return Object.entries(scholarshipMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    }
  }, [applications, activeTab])

  const totalCount = chartData.reduce((sum, item) => sum + item.value, 0)

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percentage = ((data.value / totalCount) * 100).toFixed(1)
      return (
        <div className="bg-background border border-border rounded-lg p-4 shadow-xl">
          <p className="font-semibold text-foreground mb-2">{data.name}</p>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Count: <span className="font-semibold text-foreground">{data.value}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Percentage: <span className="font-semibold text-foreground">{percentage}%</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.7
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percent < 0.08) return null // Don't show label for very small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-sm font-bold"
        style={{ 
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
          fontSize: "13px"
        }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="bg-gradient-to-br from-card via-card/80 to-card/50 border-2 border-border/50 rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-6 xl:p-8 shadow-xl md:shadow-2xl w-full h-full backdrop-blur-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-3 lg:gap-4 mb-3 md:mb-4 lg:mb-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-2 md:p-2.5 lg:p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg md:rounded-xl shadow-lg border border-primary/20">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-base md:text-lg lg:text-xl xl:text-2xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent">
              Applications Overview
            </h3>
            <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground mt-0.5 font-medium">
              Distribution by scholarship type
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 md:gap-1.5 lg:gap-2 bg-gradient-to-r from-muted/60 to-muted/40 backdrop-blur-sm p-0.5 md:p-1 rounded-lg md:rounded-xl border border-border/50 shadow-inner">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-2 md:px-3 lg:px-4 py-1 md:py-1.5 lg:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs lg:text-sm font-semibold transition-all duration-300 flex items-center gap-1 md:gap-1.5 lg:gap-2 ${
              activeTab === "pending"
                ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg scale-105"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" />
            <span>Pending</span>
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`px-2 md:px-3 lg:px-4 py-1 md:py-1.5 lg:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs lg:text-sm font-semibold transition-all duration-300 flex items-center gap-1 md:gap-1.5 lg:gap-2 ${
              activeTab === "approved"
                ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg scale-105"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <CheckCircle className="w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" />
            <span>Approved</span>
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-muted/50 rounded-full mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium text-center">
            No {activeTab} applications found
          </p>
          {applications.length > 0 && (
            <p className="text-xs text-muted-foreground/70 mt-2 text-center">
              {applications.length} total application{applications.length !== 1 ? 's' : ''} in system
            </p>
          )}
        </div>
      ) : (
        <div className="w-full flex items-center justify-center bg-gradient-to-br from-muted/20 to-transparent rounded-lg md:rounded-xl p-2 md:p-3 lg:p-4">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={CustomLabel}
                outerRadius={170}
                innerRadius={80}
                fill="#8884d8"
                dataKey="value"
                animationBegin={0}
                animationDuration={1000}
                paddingAngle={4}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                    stroke="hsl(var(--background))"
                    strokeWidth={3}
                    style={{
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color, fontSize: '14px', fontWeight: '500' }}>
                    {value}
                  </span>
                )}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}


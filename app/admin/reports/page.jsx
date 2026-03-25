"use client"

import { useCallback, useEffect, useId, useMemo, useState } from "react"
import AdminLayoutWrapper from "../admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  CalendarRange,
  Download,
  FileSpreadsheet,
  LayoutGrid,
  Megaphone,
  MessageSquare,
  PieChart,
  Shield,
  Users,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  RefreshCw,
  TrendingUp,
  UsersRound,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { auth } from "@/lib/firebase"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  XAxis,
  YAxis,
} from "recharts"

function downloadCsv(filename, headers, rows) {
  const esc = (c) => `"${String(c ?? "").replace(/"/g, '""')}"`
  const lines = [headers.map(esc).join(",")]
  rows.forEach((r) => lines.push(r.map(esc).join(",")))
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Theme chart tokens are HEX in globals.css — use var() only, never hsl(var(...)). */
const CHART_FILL = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

const reportCatalog = [
  {
    id: "applications",
    title: "Application pipeline",
    description: "Volume, status breakdown, and top scholarships in the selected period.",
    icon: FileText,
    accent: "from-sky-500/12 via-transparent to-transparent border-sky-500/20",
    iconClass: "text-sky-600 dark:text-sky-400",
    exportAccent: "border-sky-500/35 bg-sky-500/10 text-sky-900 hover:bg-sky-500/15 dark:text-sky-100",
  },
  {
    id: "scholars",
    title: "Scholars overview",
    description: "Applications in period by campus and scholarship (approved volume context).",
    icon: GraduationCap,
    accent: "from-violet-500/12 via-transparent to-transparent border-violet-500/20",
    iconClass: "text-violet-600 dark:text-violet-400",
    exportAccent: "border-violet-500/35 bg-violet-500/10 text-violet-900 hover:bg-violet-500/15 dark:text-violet-100",
  },
  {
    id: "users",
    title: "User directory",
    description: "Total accounts, students vs staff (role-based).",
    icon: Users,
    accent: "from-emerald-500/12 via-transparent to-transparent border-emerald-500/20",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    exportAccent: "border-emerald-500/35 bg-emerald-500/10 text-emerald-900 hover:bg-emerald-500/15 dark:text-emerald-100",
  },
  {
    id: "engagement",
    title: "Engagement",
    description: "Testimonials, announcements, verification queue.",
    icon: PieChart,
    accent: "from-amber-500/12 via-transparent to-transparent border-amber-500/20",
    iconClass: "text-amber-600 dark:text-amber-400",
    exportAccent: "border-amber-500/35 bg-amber-500/10 text-amber-950 hover:bg-amber-500/15 dark:text-amber-100",
  },
]

/** Match audit trails / filters: outlined card buttons, not solid primary fill. */
const btnToolbar =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"

export default function AdminReportsPage() {
  const trendGradId = useId().replace(/:/g, "")
  const { user, loading: authLoading } = useAuth()
  const [rangePreset, setRangePreset] = useState("30d")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [activePreset, setActivePreset] = useState("30d")
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchSummary = useCallback(async () => {
    if (!user || !auth.currentUser) return
    setLoading(true)
    setError(null)
    try {
      const token = await auth.currentUser.getIdToken(true)
      const params = new URLSearchParams()
      if (activePreset === "custom" && dateFrom && dateTo) {
        params.set("from", dateFrom)
        params.set("to", dateTo)
      } else {
        params.set("preset", activePreset)
      }
      const res = await fetch(`/api/admin/reports/summary?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `Failed (${res.status})`)
      }
      setSummary(data)
    } catch (e) {
      setError(e?.message || "Failed to load report")
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [user, activePreset, dateFrom, dateTo])

  useEffect(() => {
    if (authLoading || !user) return
    fetchSummary()
  }, [authLoading, user, fetchSummary])

  const handleApplyRange = () => {
    if (rangePreset === "custom") {
      if (!dateFrom || !dateTo) {
        setError("Please choose both From and To dates for custom range.")
        return
      }
      setActivePreset("custom")
    } else {
      setActivePreset(rangePreset)
    }
  }

  useEffect(() => {
    if (rangePreset !== "custom") {
      setActivePreset(rangePreset)
    }
  }, [rangePreset])

  const statusChartData = useMemo(() => {
    if (!summary?.applications?.byStatus) return []
    return Object.entries(summary.applications.byStatus).map(([name, count], i) => ({
      name: name.replace(/-/g, " "),
      count,
      fill: CHART_FILL[i % CHART_FILL.length],
    }))
  }, [summary])

  const barChartConfig = useMemo(() => {
    const cfg = { count: { label: "Applications", color: "var(--chart-1)" } }
    statusChartData.forEach((row, i) => {
      cfg[row.name] = {
        label: row.name,
        color: CHART_FILL[i % CHART_FILL.length],
      }
    })
    return cfg
  }, [statusChartData])

  const trendChartConfig = useMemo(
    () => ({
      applications: { label: "Applications", color: "var(--chart-1)" },
      testimonials: { label: "Testimonials", color: "var(--chart-2)" },
    }),
    [],
  )

  const trendPoints = summary?.trend?.points ?? []

  const exportApplicationsCsv = () => {
    if (!summary) return
    const rows = [
      ["Metric", "Value"],
      ["Total applications", summary.applications.total],
      ["In selected period", summary.applications.inPeriod],
      ...Object.entries(summary.applications.byStatus).map(([k, v]) => [`Status: ${k}`, v]),
      ...summary.applications.topScholarships.map((s) => [`Scholarship: ${s.name}`, s.count]),
    ]
    downloadCsv(`mocas-applications-report.csv`, rows[0], rows.slice(1))
  }

  const exportUsersCsv = () => {
    if (!summary) return
    downloadCsv("mocas-users-summary.csv", ["Metric", "Value"], [
      ["Total users", summary.users.total],
      ["Students (non-staff)", summary.users.students],
      ["Staff / admin", summary.users.staff],
    ])
  }

  const exportEngagementCsv = () => {
    if (!summary) return
    downloadCsv("mocas-engagement-summary.csv", ["Metric", "Value"], [
      ["Testimonials (total)", summary.testimonials.total],
      ["Testimonials (in period)", summary.testimonials.inPeriod],
      ["Announcements (total)", summary.announcements.total],
      ["Verifications (total)", summary.verifications.total],
      ["Verifications (pending)", summary.verifications.pending],
      ["Verification submissions (in period)", summary.verifications.submissionsInPeriod],
    ])
  }

  const exportScholarsCsv = () => {
    if (!summary) return
    const h = ["Campus / scholarship", "Applications in period"]
    const rows = [
      ...summary.applications.topCampuses.map((c) => [c.name, c.count]),
      ...summary.applications.topScholarships.map((s) => [s.name, s.count]),
    ]
    downloadCsv("mocas-scholars-campuses.csv", h, rows)
  }

  const kpiItems = summary
    ? [
        {
          label: "Applications (period)",
          value: summary.applications.inPeriod,
          Icon: FileText,
          accent: "border-l-4 border-l-[var(--chart-1)]",
          iconWrap: "bg-[var(--chart-1)]/12 text-[var(--chart-1)]",
        },
        {
          label: "Applications (all)",
          value: summary.applications.total,
          Icon: Layers,
          accent: "border-l-4 border-l-[var(--chart-2)]",
          iconWrap: "bg-[var(--chart-2)]/12 text-[var(--chart-2)]",
        },
        {
          label: "Students",
          value: summary.users.students,
          Icon: Users,
          accent: "border-l-4 border-l-[var(--chart-3)]",
          iconWrap: "bg-[var(--chart-3)]/12 text-[var(--chart-3)]",
        },
        {
          label: "Scholarships",
          value: summary.scholarships.total,
          Icon: GraduationCap,
          accent: "border-l-4 border-l-[var(--chart-4)]",
          iconWrap: "bg-[var(--chart-4)]/12 text-[var(--chart-4)]",
        },
        {
          label: "Testimonials (period)",
          value: summary.testimonials.inPeriod,
          Icon: MessageSquare,
          accent: "border-l-4 border-l-[var(--chart-2)]",
          iconWrap: "bg-[var(--chart-2)]/12 text-[var(--chart-2)]",
        },
        {
          label: "Announcements",
          value: summary.announcements.total,
          Icon: Megaphone,
          accent: "border-l-4 border-l-[var(--chart-4)]",
          iconWrap: "bg-[var(--chart-4)]/12 text-[var(--chart-4)]",
        },
        {
          label: "Verifications pending",
          value: summary.verifications.pending,
          Icon: Shield,
          accent: "border-l-4 border-l-amber-500",
          iconWrap: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
        },
        {
          label: "Users total",
          value: summary.users.total,
          Icon: UsersRound,
          accent: "border-l-4 border-l-primary",
          iconWrap: "bg-primary/10 text-primary",
        },
      ]
    : []

  return (
    <AdminLayoutWrapper>
      <div className="relative">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="w-full space-y-6 md:space-y-8">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">Report period</CardTitle>
                      <CardDescription className="mt-0.5">
                        Choose a preset or custom range, then <strong>Apply range</strong>.
                        {summary?.generatedAt ? (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            Last loaded: {new Date(summary.generatedAt).toLocaleString()}
                          </span>
                        ) : null}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "7d", label: "Last 7 days" },
                      { id: "30d", label: "Last 30 days" },
                      { id: "term", label: "This term (~120d)" },
                      { id: "all", label: "All time" },
                      { id: "custom", label: "Custom" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setRangePreset(p.id)
                          setError(null)
                        }}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-200",
                          rangePreset === p.id
                            ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20"
                            : "border-border bg-card text-muted-foreground shadow-sm hover:border-primary/35 hover:bg-muted/80 hover:text-foreground",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 border-t border-border/80 pt-4 sm:flex-row sm:items-end">
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      disabled={rangePreset !== "custom"}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      disabled={rangePreset !== "custom"}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleApplyRange}
                    disabled={loading}
                    className={cn(btnToolbar, "font-semibold shadow-sm")}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarRange className="h-4 w-4 text-primary" />}
                    Apply range
                  </button>
                  <button type="button" onClick={() => fetchSummary()} disabled={loading} className={cn(btnToolbar, "shadow-sm")}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    Refresh
                  </button>
                </div>
              </CardContent>
            </Card>

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {loading && !summary ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-muted-foreground shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin opacity-70" />
                <p className="text-sm font-medium">Loading report data…</p>
              </div>
            ) : null}

            {summary ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {kpiItems.map((kpi) => {
                    const Icon = kpi.Icon
                    return (
                      <div
                        key={kpi.label}
                        className={cn(
                          "relative overflow-hidden rounded-xl border border-border/90 bg-gradient-to-br from-card via-card to-muted/25 py-4 pl-4 pr-4 shadow-sm ring-1 ring-black/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md dark:ring-white/[0.06]",
                          kpi.accent,
                        )}
                      >
                        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/[0.04]" aria-hidden />
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold uppercase leading-snug tracking-wide text-muted-foreground">
                              {kpi.label}
                            </p>
                            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">{kpi.value}</p>
                          </div>
                          <div
                            className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/[0.06] dark:ring-white/[0.08]",
                              kpi.iconWrap,
                            )}
                          >
                            <Icon className="h-5 w-5" strokeWidth={2} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {summary && trendPoints.length > 0 ? (
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
                    <div className="mb-4 flex flex-col gap-1 md:mb-6 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div>
                          <h3 className="text-lg font-bold text-foreground md:text-xl">Trend: Submissions over time</h3>
                          <p className="text-sm text-muted-foreground">
                            {summary.trend?.note ||
                              (summary.trend?.granularity === "week"
                                ? "Weekly totals in the selected period."
                                : "Daily totals in the selected period.")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <ChartContainer
                      config={trendChartConfig}
                      className="aspect-auto h-[min(380px,58vh)] w-full min-h-[260px] md:min-h-[300px]"
                    >
                      <AreaChart data={trendPoints} margin={{ top: 10, right: 12, left: 4, bottom: 4 }}>
                        <defs>
                          <linearGradient id={`${trendGradId}-apps`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                            <stop offset="92%" stopColor="var(--chart-1)" stopOpacity={0.08} />
                            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id={`${trendGradId}-tst`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                            <stop offset="92%" stopColor="var(--chart-2)" stopOpacity={0.07} />
                            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                          tickLine={false}
                          axisLine={false}
                          interval={trendPoints.length > 16 ? Math.ceil(trendPoints.length / 14) - 1 : 0}
                          height={44}
                          tickMargin={6}
                        />
                        <YAxis
                          allowDecimals={false}
                          width={36}
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <ChartTooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null
                            return (
                              <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm shadow-lg">
                                <p className="font-semibold text-foreground">{label}</p>
                                <div className="mt-2 space-y-1">
                                  {payload.map((item) => (
                                    <p key={item.dataKey} className="text-muted-foreground">
                                      <span className="font-medium text-foreground">{item.name}:</span>{" "}
                                      <span className="tabular-nums font-bold">{item.value}</span>
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )
                          }}
                        />
                        <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 8 }} />
                        <Area
                          type="monotone"
                          dataKey="applications"
                          name="Applications"
                          stroke="var(--chart-1)"
                          strokeWidth={2.5}
                          fill={`url(#${trendGradId}-apps)`}
                          dot={{ r: 3, strokeWidth: 2, fill: "var(--background)", stroke: "var(--chart-1)" }}
                          activeDot={{ r: 5 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="testimonials"
                          name="Testimonials"
                          stroke="var(--chart-2)"
                          strokeWidth={2.5}
                          fill={`url(#${trendGradId}-tst)`}
                          dot={{ r: 3, strokeWidth: 2, fill: "var(--background)", stroke: "var(--chart-2)" }}
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                ) : null}

                {statusChartData.length > 0 ? (
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between md:mb-6">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold text-foreground md:text-xl">Applications by status</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Counts across the whole system (not limited to period).</p>
                    </div>
                    <ChartContainer config={barChartConfig} className="aspect-auto h-[min(420px,70vh)] w-full min-h-[300px] md:min-h-[360px]">
                      <BarChart
                        data={statusChartData}
                        layout="vertical"
                        margin={{ top: 8, right: 28, left: 8, bottom: 8 }}
                        barCategoryGap="18%"
                      >
                        <defs>
                          {statusChartData.map((row, i) => (
                            <linearGradient
                              key={row.name}
                              id={`bar-grad-${i}`}
                              x1="0"
                              y1="0"
                              x2="1"
                              y2="0"
                            >
                              <stop offset="0%" stopColor={row.fill} stopOpacity={0.95} />
                              <stop offset="100%" stopColor={row.fill} stopOpacity={0.55} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                          opacity={0.35}
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          stroke="var(--muted-foreground)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={100}
                          stroke="var(--muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => (String(v).length > 14 ? `${String(v).slice(0, 12)}…` : v)}
                        />
                        <ChartTooltip
                          cursor={{ fill: "var(--muted)", opacity: 0.2 }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const row = payload[0]?.payload
                            return (
                              <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                                <p className="text-sm font-semibold capitalize text-foreground">{row?.name}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Count:{" "}
                                  <span className="font-bold tabular-nums text-foreground">{row?.count}</span>
                                </p>
                              </div>
                            )
                          }}
                        />
                        <Bar dataKey="count" name="Applications" radius={[0, 8, 8, 0]} maxBarSize={28}>
                          {statusChartData.map((row, i) => (
                            <Cell key={row.name} fill={`url(#bar-grad-${i})`} />
                          ))}
                          <LabelList
                            dataKey="count"
                            position="right"
                            style={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }}
                            formatter={(v) => (v > 0 ? String(v) : "")}
                          />
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </div>
                ) : null}
              </>
            ) : null}

            <div>
              <div className="mb-4 flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground md:text-xl">Report library</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {reportCatalog.map((r) => {
                  const Icon = r.icon
                  return (
                    <Card
                      key={r.id}
                      className={cn(
                        "overflow-hidden border bg-gradient-to-br to-transparent shadow-sm transition-shadow hover:shadow-md",
                        r.accent,
                      )}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-card/95 shadow-sm ring-1 ring-border/60">
                              <Icon className={cn("h-5 w-5", r.iconClass)} />
                            </div>
                            <div>
                              <CardTitle className="text-base">{r.title}</CardTitle>
                              <CardDescription className="mt-1">{r.description}</CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 border-t border-border/60 bg-background/50 pt-4 dark:bg-background/25">
                        {summary ? (
                          <ul className="space-y-1.5 text-xs text-muted-foreground">
                            {r.id === "applications" ? (
                              <>
                                <li>
                                  In period:{" "}
                                  <span className="font-semibold text-foreground">{summary.applications.inPeriod}</span>
                                </li>
                                <li>
                                  Total:{" "}
                                  <span className="font-semibold text-foreground">{summary.applications.total}</span>
                                </li>
                              </>
                            ) : null}
                            {r.id === "scholars" ? (
                              <>
                                <li>Top campus: {summary.applications.topCampuses[0]?.name || "—"}</li>
                                <li>Top scholarship: {summary.applications.topScholarships[0]?.name || "—"}</li>
                              </>
                            ) : null}
                            {r.id === "users" ? (
                              <>
                                <li>Students: {summary.users.students}</li>
                                <li>Staff: {summary.users.staff}</li>
                              </>
                            ) : null}
                            {r.id === "engagement" ? (
                              <>
                                <li>Testimonials (period): {summary.testimonials.inPeriod}</li>
                                <li>Announcements: {summary.announcements.total}</li>
                                <li>Verifications pending: {summary.verifications.pending}</li>
                              </>
                            ) : null}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">Load a period to see figures.</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={!summary}
                            onClick={() => {
                              if (r.id === "applications") exportApplicationsCsv()
                              if (r.id === "users") exportUsersCsv()
                              if (r.id === "engagement") exportEngagementCsv()
                              if (r.id === "scholars") exportScholarsCsv()
                            }}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm transition-all duration-200 disabled:pointer-events-none disabled:opacity-45",
                              r.exportAccent,
                            )}
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Download CSV
                          </button>
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground opacity-70"
                            title="PDF export coming later"
                          >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Scheduled delivery</CardTitle>
                <CardDescription>Email recurring reports — not configured yet.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center shadow-inner">
                  <p className="text-sm font-medium text-muted-foreground">No schedules yet</p>
                  <button
                    type="button"
                    disabled
                    className="mt-4 inline-flex items-center justify-center rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary opacity-60"
                  >
                    New schedule
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayoutWrapper>
  )
}

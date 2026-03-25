"use client"

import { useMemo, useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

/**
 * User-friendly scheduled start picker:
 * - Calendar date (react-day-picker via shadcn Calendar)
 * - Time dropdown (safe across browsers)
 */
export default function ScheduledStartPicker({
  dateValue,
  timeValue,
  onChange,
  className,
}) {
  const [open, setOpen] = useState(false)

  const selectedDateObj = useMemo(() => {
    if (!dateValue) return undefined
    // Parse as local date (avoid timezone shifting surprises)
    const [y, m, d] = String(dateValue).split("-").map((n) => Number(n))
    if (!y || !m || !d) return undefined
    return new Date(y, m - 1, d)
  }, [dateValue])

  const timeParts = useMemo(() => {
    const raw = String(timeValue || "").trim()
    if (!raw.includes(":")) return { hour: "", minute: "" }
    const [hourRaw, minuteRaw] = raw.split(":")
    const hourNum = Number(hourRaw)
    const minuteNum = Number(minuteRaw)
    if (!Number.isFinite(hourNum) || !Number.isFinite(minuteNum)) return { hour: "", minute: "" }

    const period = hourNum >= 12 ? "PM" : "AM"
    const hour12 = hourNum % 12 === 0 ? 12 : hourNum % 12

    return {
      hour: String(hour12).padStart(2, "0"), // 01-12
      minute: String(Math.min(59, Math.max(0, minuteNum))).padStart(2, "0"),
      period,
    }
  }, [timeValue])

  const display = useMemo(() => {
    if (!dateValue || !timeValue) return "Select scheduled start"
    const [y, m, d] = String(dateValue).split("-").map((n) => Number(n))
    const [hh, mm] = String(timeValue).split(":")
    const dt = new Date(y, m - 1, d, Number(hh || 0), Number(mm || 0))
    return `Scheduled: ${format(dt, "MMM d, yyyy")} · ${format(dt, "hh:mm a")}`
  }, [dateValue, timeValue])

  const clamp2Range = (n, min, max) => {
    const num = Number(n)
    if (!Number.isFinite(num)) return min
    return Math.min(max, Math.max(min, num))
  }

  const normalize2Range = (s, min, max) => {
    const onlyDigits = String(s || "").replace(/\D/g, "")
    if (!onlyDigits) return ""
    const n = Number(onlyDigits)
    if (!Number.isFinite(n)) return ""
    const clamped = Math.min(max, Math.max(min, n))
    return String(clamped).padStart(2, "0")
  }

  const toTime24FromParts = (hour12Str, minuteStr, period) => {
    if (!hour12Str || !minuteStr) return ""
    const hour12Num = Number(hour12Str)
    const minuteNum = Number(minuteStr)
    if (!Number.isFinite(hour12Num) || !Number.isFinite(minuteNum)) return ""
    const hh24 = (hour12Num % 12) + (period === "PM" ? 12 : 0)
    return `${String(hh24).padStart(2, "0")}:${String(clamp2Range(minuteNum, 0, 59)).padStart(2, "0")}`
  }

  return (
    <div className={cn("space-y-0", className)}>
      <label className="sr-only">Scheduled start (optional)</label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-10 w-full items-center justify-between gap-3 rounded-md border border-slate-700 bg-slate-950 px-3 text-left text-sm text-slate-100",
              "focus:outline-none focus:ring-2 focus:ring-emerald-500/40",
            )}
            style={{ lineHeight: "1" }}
          >
            <span className={cn(!dateValue && !timeValue ? "text-slate-500" : "")}>{display}</span>
            <span className="text-[11px] text-slate-500">Pick</span>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-4 bg-slate-950 border-slate-800 text-slate-100" align="start" side="bottom">
          <div className="flex flex-col gap-3">
            <Calendar
              mode="single"
              selected={selectedDateObj}
              onSelect={(d) => {
                const picked = d instanceof Date ? d : null
                if (!picked) return onChange?.({ date: "", time: timeValue })
                const yyyy = picked.getFullYear()
                const mm = String(picked.getMonth() + 1).padStart(2, "0")
                const dd = String(picked.getDate()).padStart(2, "0")
                onChange?.({ date: `${yyyy}-${mm}-${dd}`, time: timeValue })
              }}
              showOutsideDays={false}
              className="rounded-md border border-slate-800 bg-slate-950 text-slate-100"
            />

            <div className="flex items-center gap-2">
              <div className="w-full">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="HH"
                    value={timeParts.hour}
                    onChange={(e) => {
                      const nextHour12 = normalize2Range(e.target.value, 1, 12)
                      const nextMinute = timeParts.minute || "00"
                      if (!nextHour12) return onChange?.({ date: dateValue, time: "" })
                      onChange?.({ date: dateValue, time: toTime24FromParts(nextHour12, nextMinute, timeParts.period || "AM") })
                    }}
                    onWheel={(e) => {
                      // Mouse wheel: scroll up/down to change time quickly.
                      // Note: deltaY sign may vary by browser; we handle both directions safely.
                      e.preventDefault()
                      e.stopPropagation()
                      const curHour12 = clamp2Range(Number(timeParts.hour || "12"), 1, 12)
                      const delta = e.deltaY < 0 ? 1 : -1
                      const nextHour12 = clamp2Range(curHour12 + delta, 1, 12)
                      const hh12 = String(nextHour12).padStart(2, "0")
                      const mm = timeParts.minute || "00"
                      onChange?.({
                        date: dateValue,
                        time: toTime24FromParts(hh12, mm, timeParts.period || "AM"),
                      })
                    }}
                    className="h-10 w-[72px] rounded-md border border-slate-700 bg-slate-900 px-2 text-center font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <span className="text-sm text-slate-500 font-mono">:</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="MM"
                    value={timeParts.minute}
                    onChange={(e) => {
                      const nextMinute = normalize2Range(e.target.value, 0, 59)
                      const nextHour = timeParts.hour || ""
                      if (!nextMinute) return onChange?.({ date: dateValue, time: "" })
                      if (!nextHour) return onChange?.({ date: dateValue, time: "" })
                      onChange?.({ date: dateValue, time: toTime24FromParts(nextHour, nextMinute, timeParts.period || "AM") })
                    }}
                    onWheel={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const curMinute = clamp2Range(Number(timeParts.minute || "0"), 0, 59)
                      const delta = e.deltaY < 0 ? 1 : -1
                      const nextMinute = clamp2Range(curMinute + delta, 0, 59)
                      const mm = String(nextMinute).padStart(2, "0")
                      const hh12 = timeParts.hour || "12"
                      onChange?.({ date: dateValue, time: toTime24FromParts(hh12, mm, timeParts.period || "AM") })
                    }}
                    className="h-10 w-[72px] rounded-md border border-slate-700 bg-slate-900 px-2 text-center font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <select
                    value={timeParts.period || "AM"}
                    onChange={(e) => {
                      const nextPeriod = e.target.value
                      const hh12 = timeParts.hour
                      const mm = timeParts.minute || "00"
                      if (!hh12) return onChange?.({ date: dateValue, time: "" })
                      onChange?.({ date: dateValue, time: toTime24FromParts(hh12, mm, nextPeriod) })
                    }}
                    className="h-10 w-[90px] rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => onChange?.({ date: "", time: "" })}
                className="rounded-md border border-slate-700 bg-transparent px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/60"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-400"
              >
                Done
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}


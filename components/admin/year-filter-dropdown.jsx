"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"

export default function YearFilterDropdown({ sortYear, setSortYear, uniqueYears }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-all duration-200 text-sm font-medium w-48 shadow-sm hover:shadow-md"
      >
        <span className="truncate">{sortYear === "all" ? "All Years" : sortYear}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2">
            <button
              onClick={() => {
                setSortYear("all")
                setIsOpen(false)
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                sortYear === "all" 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted"
              }`}
            >
              All Years
            </button>
            {uniqueYears.map((year) => (
              <button
                key={year}
                onClick={() => {
                  setSortYear(year)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  sortYear === year 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


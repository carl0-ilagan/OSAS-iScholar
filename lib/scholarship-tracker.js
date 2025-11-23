import { db } from "./firebase"
import { doc, getDoc, setDoc, runTransaction } from "firebase/firestore"

// Scholarship code prefixes mapping
const SCHOLARSHIP_PREFIXES = {
  "Merit Scholarship": "MER",
  "Needs-Based Grant": "NBG",
  "TES": "TES",
  "Tertiary Education Subsidy": "TES",
  "TDP": "TDP",
  "Tulong Dunong Program": "TDP",
}

/**
 * Get scholarship code prefix based on scholarship name
 */
export function getScholarshipPrefix(scholarshipName) {
  // Direct match
  if (SCHOLARSHIP_PREFIXES[scholarshipName]) {
    return SCHOLARSHIP_PREFIXES[scholarshipName]
  }
  
  // Case-insensitive match
  const nameLower = scholarshipName.toLowerCase()
  for (const [key, prefix] of Object.entries(SCHOLARSHIP_PREFIXES)) {
    if (key.toLowerCase() === nameLower) {
      return prefix
    }
  }
  
  // Partial match (e.g., "Merit" in "Merit Scholarship")
  for (const [key, prefix] of Object.entries(SCHOLARSHIP_PREFIXES)) {
    if (nameLower.includes(key.toLowerCase()) || key.toLowerCase().includes(nameLower)) {
      return prefix
    }
  }
  
  // Default: use first 3 uppercase letters of scholarship name
  return scholarshipName.substring(0, 3).toUpperCase().padEnd(3, 'X')
}

/**
 * Generate scholarship tracker code
 * Format: PREFIX-YEAR-6DIGIT_AUTONUMBER
 * Example: MER-2025-000123
 */
export async function generateScholarshipCode(scholarshipName) {
  const prefix = getScholarshipPrefix(scholarshipName)
  const year = new Date().getFullYear()
  const counterKey = `${prefix}-${year}`
  
  try {
    // Use transaction to ensure atomic increment
    const trackerRef = doc(db, "scholarship_trackers", counterKey)
    
    const code = await runTransaction(db, async (transaction) => {
      const trackerDoc = await transaction.get(trackerRef)
      
      let currentCount = 1
      if (trackerDoc.exists()) {
        currentCount = (trackerDoc.data().count || 0) + 1
      }
      
      // Update or create the tracker document
      transaction.set(trackerRef, {
        prefix,
        year,
        count: currentCount,
        lastUpdated: new Date().toISOString(),
      }, { merge: true })
      
      // Generate code: PREFIX-YEAR-6DIGIT_AUTONUMBER
      const autoNumber = String(currentCount).padStart(6, '0')
      return `${prefix}-${year}-${autoNumber}`
    })
    
    return code
  } catch (error) {
    console.error("Error generating scholarship code:", error)
    // Fallback: use timestamp-based code
    const timestamp = Date.now().toString().slice(-6)
    return `${prefix}-${year}-${timestamp}`
  }
}


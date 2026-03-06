import { NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

const SECTION_CONFIG = [
  {
    title: "Personal Information",
    fields: [
      "lastName",
      "firstName",
      "middleName",
      "course",
      "major",
      "yearLevel",
      "studentIdNumber",
      "civilStatus",
      "gender",
      "dateOfBirth",
      "placeOfBirth",
      "fullAddress",
      "residingAt",
      "contactNumber",
      "email",
      "religion",
      "pwd",
      "disabilityType",
      "existingScholarship",
    ],
  },
  {
    title: "Educational Background (Secondary)",
    fields: ["schoolName", "schoolLocation", "yearGraduated", "generalAverage", "honorsAwards"],
  },
  {
    title: "Family Background",
    fields: [
      "parentStatus",
      "fatherFullName",
      "fatherAge",
      "fatherAddress",
      "fatherMobile",
      "fatherEmail",
      "fatherOccupation",
      "fatherIncome",
      "fatherEducation",
      "fatherEducationOther",
      "motherMaidenName",
      "motherAge",
      "motherAddress",
      "motherMobile",
      "motherEmail",
      "motherOccupation",
      "motherIncome",
      "motherEducation",
      "motherEducationOther",
    ],
  },
  {
    title: "Siblings Information",
    fields: ["totalSiblings", "workingSiblings", "studyingSiblings"],
  },
  {
    title: "References",
    fields: ["referenceName", "referenceRelationship", "referenceContact", "certify"],
  },
]

function toLabel(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (m) => m.toUpperCase())
    .trim()
}

function toDisplayValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "N/A"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (value === null || value === undefined || value === "") return "N/A"
  return String(value)
}

function wrapText(text, maxCharsPerLine = 95) {
  if (!text) return [""]
  const words = String(text).split(/\s+/)
  const lines = []
  let current = ""
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxCharsPerLine) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : [""]
}

export async function POST(request) {
  try {
    const { formData } = await request.json()

    if (!formData || typeof formData !== "object") {
      return NextResponse.json({ error: "Missing formData payload" }, { status: 400 })
    }

    const templatePath = path.join(process.cwd(), "public", "templates", "application-form-template.pdf")
    const templateBytes = await readFile(templatePath)
    const pdfDoc = await PDFDocument.load(templateBytes)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pageSize = pdfDoc.getPage(0).getSize()
    let page = pdfDoc.addPage([pageSize.width, pageSize.height])
    let y = pageSize.height - 50
    const leftX = 44
    const contentWidth = pageSize.width - leftX * 2
    const usedKeys = new Set()

    const ensurePageSpace = (required = 24) => {
      if (y < 60 + required) {
        page = pdfDoc.addPage([pageSize.width, pageSize.height])
        y = pageSize.height - 50
      }
    }

    const drawHeading = (text) => {
      ensurePageSpace(30)
      page.drawText(text, {
        x: leftX,
        y,
        size: 13,
        font: helveticaBold,
        color: rgb(0.05, 0.2, 0.45),
      })
      y -= 22
    }

    const drawLine = (label, value) => {
      ensurePageSpace(20)
      const lines = wrapText(`${label}: ${toDisplayValue(value)}`, 92)
      for (const line of lines) {
        ensurePageSpace(16)
        page.drawText(line, {
          x: leftX,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0.1, 0.1, 0.1),
          maxWidth: contentWidth,
        })
        y -= 14
      }
    }

    drawHeading("Application Form - Filled Data Attachment")
    drawLine("Generated At", new Date().toLocaleString("en-PH", { hour12: true }))
    y -= 6

    for (const section of SECTION_CONFIG) {
      drawHeading(section.title)
      for (const fieldKey of section.fields) {
        usedKeys.add(fieldKey)
        drawLine(toLabel(fieldKey), formData[fieldKey])
      }
      y -= 8
    }

    const remainingKeys = Object.keys(formData).filter(
      (key) =>
        !usedKeys.has(key) &&
        !["idPicture", "userId", "formType", "submittedAt", "updatedAt"].includes(key)
    )

    if (remainingKeys.length > 0) {
      drawHeading("Additional Form Values")
      for (const key of remainingKeys) {
        drawLine(toLabel(key), formData[key])
      }
    }

    const outputBytes = await pdfDoc.save()
    const filename = `application-form-${Date.now()}.pdf`

    return new NextResponse(Buffer.from(outputBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error generating application PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error?.message || "Unknown error" },
      { status: 500 }
    )
  }
}

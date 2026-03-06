# Dynamic PDF Form Builder and Submission System

## Folder Structure

```text
app/
  admin/
    pdf-forms/
      page.jsx
      [formId]/
        submissions/
          [submissionId]/
            page.jsx
  student/
    pdf-forms/
      page.jsx
      [formId]/
        page.jsx
components/
  pdf-forms/
    PdfOverlayStage.jsx
lib/
  pdf-form-utils.js
docs/
  dynamic-pdf-form-builder.md
firestore.rules
```

## Firestore Schema

### `forms/{formId}`

- `title: string`
- `pdfSource: "firestore-chunks"`
- `pdfChunkCount: number`
- `originalFileName: string`
- `isActive: boolean`
- `createdBy: string`
- `createdAt: timestamp`
- `updatedAt: timestamp`

### `form_pdf_chunks/{chunkId}`

- `formId: string`
- `index: number` (ordered chunk index)
- `chunk: string` (part of PDF Data URL)
- `createdAt: timestamp`
- `updatedAt: timestamp`

### `form_fields/{fieldId}`

- `fieldId: string`
- `formId: string`
- `type: "textbox" | "checkbox" | "image"`
- `label: string`
- `x: number` (0 to 1, page-relative)
- `y: number` (0 to 1, page-relative)
- `width: number` (0 to 1, page-relative)
- `height: number` (0 to 1, page-relative)
- `page: number` (1-based page number)
- `createdAt: timestamp`
- `updatedAt: timestamp`

### `submissions/{submissionId}`

- `formId: string`
- `studentId: string`
- `submittedAt: timestamp`

### `submission_values/{valueId}`

- `submissionId: string`
- `formId: string`
- `fieldId: string`
- `type: "textbox" | "checkbox" | "image"`
- `value: string | boolean`
- `createdAt: timestamp`

## Code Examples

### Uploading PDF (Admin)

```jsx
const formDoc = await addDoc(collection(db, "forms"), {
  title: title.trim(),
  createdBy: user.uid,
  pdfSource: "firestore-chunks",
  pdfChunkCount: 0,
  isActive: true,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})

const dataUrl = await fileToDataUrl(file)
const chunks = splitIntoChunks(dataUrl, 700000)
await Promise.all(
  chunks.map((chunk, index) =>
    setDoc(doc(db, "form_pdf_chunks", `${formDoc.id}_${index}`), {
      formId: formDoc.id,
      index,
      chunk,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  ),
)

await updateDoc(doc(db, "forms", formDoc.id), {
  pdfChunkCount: chunks.length,
  updatedAt: serverTimestamp(),
})
```

### Rendering PDF in React (PDF.js)

```jsx
const pdfjs = await import("pdfjs-dist")
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
const task = pdfjs.getDocument(pdfUrl)
const pdf = await task.promise
const page = await pdf.getPage(1)
const viewport = page.getViewport({ scale: 1.3 })
await page.render({ canvasContext, viewport }).promise
```

### Adding Draggable Fields (Builder)

```jsx
interact(".builder-field").draggable({
  listeners: {
    move(event) {
      const target = event.target
      const dx = (Number(target.dataset.dx) || 0) + event.dx
      const dy = (Number(target.dataset.dy) || 0) + event.dy
      target.dataset.dx = String(dx)
      target.dataset.dy = String(dy)
      target.style.transform = `translate(${dx}px, ${dy}px)`
    },
    end(event) {
      const target = event.target
      const xShift = (Number(target.dataset.dx) || 0) / target.parentElement.getBoundingClientRect().width
      const yShift = (Number(target.dataset.dy) || 0) / target.parentElement.getBoundingClientRect().height
      updateFieldPosition(target.dataset.fieldId, xShift, yShift)
    },
  },
})
```

### Saving Field Positions (Firestore)

```jsx
await setDoc(doc(db, "form_fields", field.fieldId), {
  ...field,
  updatedAt: serverTimestamp(),
}, { merge: true })
```

### Submitting Student Values

```jsx
const submissionRef = await addDoc(collection(db, "submissions"), {
  formId,
  studentId: user.uid,
  submittedAt: serverTimestamp(),
})

await addDoc(collection(db, "submission_values"), {
  submissionId: submissionRef.id,
  fieldId: field.fieldId,
  formId,
  type: field.type,
  value,
  createdAt: serverTimestamp(),
})
```

### Generating Filled PDF (pdf-lib)

```jsx
const pdfDoc = await PDFDocument.load(sourceBytes)
const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
const page = pdfDoc.getPage(field.page - 1)
const { width, height } = page.getSize()

const x = field.x * width
const y = height - (field.y * height) - (field.height * height)

page.drawText(String(value), {
  x,
  y,
  size: 10,
  font,
  color: rgb(0, 0, 0),
})
```

## Security Notes

- Blank templates are stored as chunked PDF data in `form_pdf_chunks`.
- Templates are loaded in-app by authenticated users only, based on Firestore rules.
- Only admin can write `forms` and `form_fields`.
- Only admin can write `form_pdf_chunks`.
- Students can only create/read their own submissions and related submission values.
- Note: Firestore document size limit applies, so templates are split into chunks.

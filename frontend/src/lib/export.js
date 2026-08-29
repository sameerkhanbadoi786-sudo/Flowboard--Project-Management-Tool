import { jsPDF } from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'

// --- shared helpers --------------------------------------------------------

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function slugFilename(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'export'
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// --- PDF (jsPDF) -------------------------------------------------------
// A tiny stateful writer around jsPDF that tracks the cursor's Y position
// and starts a new page automatically once content would run off the
// bottom margin, so boards of any length export cleanly.
class PdfWriter {
  constructor() {
    this.doc = new jsPDF({ unit: 'pt', format: 'a4' })
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.margin = 48
    this.maxWidth = this.pageWidth - this.margin * 2
    this.y = this.margin
  }

  ensureSpace(lineHeight) {
    if (this.y + lineHeight > this.pageHeight - this.margin) {
      this.doc.addPage()
      this.y = this.margin
    }
  }

  heading(text, size = 18) {
    this.ensureSpace(size + 10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(size)
    this.doc.setTextColor(20, 20, 30)
    this.doc.text(text, this.margin, this.y)
    this.y += size + 10
  }

  subheading(text, size = 13) {
    this.ensureSpace(size + 8)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(size)
    this.doc.setTextColor(40, 40, 55)
    this.doc.text(text, this.margin, this.y)
    this.y += size + 8
  }

  paragraph(text, { size = 10.5, color = [70, 70, 85], indent = 0 } = {}) {
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(size)
    this.doc.setTextColor(...color)
    const lines = this.doc.splitTextToSize(text, this.maxWidth - indent)
    const lineHeight = size * 1.35
    lines.forEach((line) => {
      this.ensureSpace(lineHeight)
      this.doc.text(line, this.margin + indent, this.y)
      this.y += lineHeight
    })
  }

  rule() {
    this.ensureSpace(14)
    this.y += 4
    this.doc.setDrawColor(210, 210, 220)
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y)
    this.y += 14
  }

  spacer(amount = 8) {
    this.y += amount
  }

  save(filename) {
    this.doc.save(filename)
  }
}

function writeBoardToPdf(pdf, board) {
  pdf.heading(board.name)
  pdf.paragraph(
    `Owner: ${board.ownerUsername}  ·  Members: ${board.memberUsernames.join(', ')}  ·  Progress: ${board.progress?.percent ?? 0}% (${board.progress?.done ?? 0}/${board.progress?.total ?? 0} cards done)`,
    { color: [110, 110, 125] }
  )
  pdf.spacer(6)

  board.lists.forEach((list) => {
    pdf.rule()
    pdf.subheading(`${list.title}  (${list.cards.length})`)
    if (list.cards.length === 0) {
      pdf.paragraph('No cards.', { color: [150, 150, 160] })
    }
    list.cards.forEach((card) => {
      pdf.paragraph(`• ${card.title}${card.assignee ? `  —  assigned to ${card.assignee}` : ''}`, {
        size: 11, color: [25, 25, 35],
      })
      if (card.description?.trim()) {
        pdf.paragraph(card.description.trim(), { size: 9.5, indent: 14 })
      }
      if (card.comments?.length) {
        card.comments.forEach((c) => {
          pdf.paragraph(`↳ ${c.author}: ${c.text}`, { size: 9, indent: 14, color: [120, 120, 135] })
        })
      }
      pdf.spacer(4)
    })
  })
}

export function exportProjectPDF(board) {
  const pdf = new PdfWriter()
  writeBoardToPdf(pdf, board)
  pdf.save(`${slugFilename(board.name)}.pdf`)
}

export function exportProjectsSummaryPDF(projects) {
  const pdf = new PdfWriter()
  pdf.heading('Project Summary')
  pdf.paragraph(`Exported ${formatDate(Date.now())}  ·  ${projects.length} project${projects.length !== 1 ? 's' : ''}`, {
    color: [110, 110, 125],
  })
  pdf.spacer(6)

  projects.forEach((p) => {
    pdf.rule()
    pdf.subheading(p.name)
    pdf.paragraph(
      `Owner: ${p.ownerUsername}  ·  Members: ${p.memberUsernames.join(', ')}  ·  Progress: ${p.progress?.percent ?? 0}% (${p.progress?.done ?? 0}/${p.progress?.total ?? 0} cards done)`,
      { color: [90, 90, 105] }
    )
  })

  pdf.save('all-projects-summary.pdf')
}

// --- Word (.docx) -----------------------------------------------------

function boardToDocxSections(board) {
  const children = [
    new Paragraph({ text: board.name, heading: HeadingLevel.TITLE }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Owner: ${board.ownerUsername}  ·  Members: ${board.memberUsernames.join(', ')}  ·  Progress: ${board.progress?.percent ?? 0}% (${board.progress?.done ?? 0}/${board.progress?.total ?? 0} cards done)`,
          color: '666677',
          size: 20,
        }),
      ],
      spacing: { after: 240 },
    }),
  ]

  board.lists.forEach((list) => {
    children.push(new Paragraph({ text: `${list.title} (${list.cards.length})`, heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }))
    if (list.cards.length === 0) {
      children.push(new Paragraph({ children: [new TextRun({ text: 'No cards.', italics: true, color: '999999' })] }))
    }
    list.cards.forEach((card) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `• ${card.title}`, bold: true }),
          ...(card.assignee ? [new TextRun({ text: `  —  assigned to ${card.assignee}`, italics: true, color: '666677' })] : []),
        ],
      }))
      if (card.description?.trim()) {
        children.push(new Paragraph({ text: card.description.trim(), indent: { left: 360 } }))
      }
      (card.comments || []).forEach((c) => {
        children.push(new Paragraph({
          children: [new TextRun({ text: `↳ ${c.author}: ${c.text}`, color: '777788', size: 18 })],
          indent: { left: 360 },
        }))
      })
    })
  })

  return children
}

export async function exportProjectDocx(board) {
  const doc = new Document({
    sections: [{ properties: {}, children: boardToDocxSections(board) }],
  })
  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, `${slugFilename(board.name)}.docx`)
}

export async function exportProjectsSummaryDocx(projects) {
  const children = [
    new Paragraph({ text: 'Project Summary', heading: HeadingLevel.TITLE }),
    new Paragraph({
      children: [new TextRun({
        text: `Exported ${formatDate(Date.now())}  ·  ${projects.length} project${projects.length !== 1 ? 's' : ''}`,
        color: '666677',
      })],
      spacing: { after: 240 },
    }),
  ]

  projects.forEach((p) => {
    children.push(new Paragraph({ text: p.name, heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }))
    children.push(new Paragraph({
      children: [new TextRun({
        text: `Owner: ${p.ownerUsername}  ·  Members: ${p.memberUsernames.join(', ')}  ·  Progress: ${p.progress?.percent ?? 0}% (${p.progress?.done ?? 0}/${p.progress?.total ?? 0} cards done)`,
        color: '5a5a69',
      })],
      alignment: AlignmentType.LEFT,
    }))
  })

  const doc = new Document({ sections: [{ properties: {}, children }] })
  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, 'all-projects-summary.docx')
}

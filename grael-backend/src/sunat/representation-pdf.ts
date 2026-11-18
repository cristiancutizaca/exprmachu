import PDFDocument = require('pdfkit')

type PdfSection = { title: string; lines: string[] }
type PdfRepresentation = { title: string; number: string; state: string; sections: PdfSection[] }

export function representationPdf(data: PdfRepresentation) {
  return new Promise<Buffer>((resolve, reject) => {
    const pdf = new PDFDocument({
      size: 'A4',
      margin: 44,
      bufferPages: true,
      info: { Title: `${data.title} ${data.number}`, Author: 'Expreso Machupicchu' },
    })
    const chunks: Buffer[] = []
    pdf.on('data', chunk => chunks.push(chunk))
    pdf.on('end', () => resolve(Buffer.concat(chunks)))
    pdf.on('error', reject)

    pdf.font('Helvetica-Bold').fontSize(20).fillColor('#192f52').text(data.title)
    pdf.fontSize(13).fillColor('#172138').text(data.number)
    pdf.moveDown(0.4).fontSize(10).fillColor('#644314').text(data.state)
    pdf.moveDown(0.6)
    for (const section of data.sections) {
      if (pdf.y > pdf.page.height - 110) pdf.addPage()
      pdf.moveDown(0.6).font('Helvetica-Bold').fontSize(11).fillColor('#192f52').text(section.title)
      pdf.font('Helvetica').fontSize(10).fillColor('#172138')
      for (const line of section.lines) pdf.text(line, { lineGap: 2 })
    }
    const pages = pdf.bufferedPageRange()
    for (let page = pages.start; page < pages.start + pages.count; page++) {
      pdf.switchToPage(page)
      pdf.font('Helvetica').fontSize(8).fillColor('#475569')
      pdf.text(`${data.number}  •  ${page + 1} / ${pages.count}`, 44, pdf.page.height - 36, { lineBreak: false })
    }
    pdf.end()
  })
}

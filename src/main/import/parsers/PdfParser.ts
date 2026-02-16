import fs from 'fs/promises'
import pdf from 'pdf-parse'

export class PdfParser {
  async parse(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath)
    const data = await pdf(buffer)

    let text = data.text

    // Clean up common PDF artifacts
    text = text
      .replace(/\f/g, '\n\n') // Form feeds to paragraph breaks
      .replace(/(\d+)\s*\n\n/g, '\n\n') // Remove standalone page numbers (heuristic)
      .replace(/\n{3,}/g, '\n\n') // Collapse excess newlines
      .replace(/([a-z])-\n([a-z])/g, '$1$2') // Re-join hyphenated line breaks
      .replace(/([a-z])\n([a-z])/g, '$1 $2') // Join broken lines within paragraphs
      .trim()

    return text
  }
}

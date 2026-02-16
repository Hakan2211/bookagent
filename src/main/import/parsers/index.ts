import path from 'path'
import { PdfParser } from './PdfParser'
import { DocxParser } from './DocxParser'
import { TextParser } from './TextParser'

export interface Parser {
  parse(filePath: string): Promise<string>
}

export class ParserFactory {
  static create(filePath: string): Parser {
    const ext = path.extname(filePath).toLowerCase()
    switch (ext) {
      case '.pdf':
        return new PdfParser()
      case '.docx':
        return new DocxParser()
      case '.txt':
      case '.md':
        return new TextParser()
      default:
        throw new Error(`Unsupported file type: ${ext}. Supported types: .pdf, .docx, .txt, .md`)
    }
  }

  static getSupportedExtensions(): string[] {
    return ['.pdf', '.docx', '.txt', '.md']
  }

  static getFileFilters(): { name: string; extensions: string[] }[] {
    return [
      { name: 'All Supported', extensions: ['pdf', 'docx', 'txt', 'md'] },
      { name: 'PDF Documents', extensions: ['pdf'] },
      { name: 'Word Documents', extensions: ['docx'] },
      { name: 'Text Files', extensions: ['txt', 'md'] }
    ]
  }
}

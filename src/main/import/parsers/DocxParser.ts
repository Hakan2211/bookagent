import mammoth from 'mammoth'

export class DocxParser {
  async parse(filePath: string): Promise<string> {
    const result = await mammoth.convertToMarkdown({ path: filePath })

    if (result.messages.length > 0) {
      console.warn('DOCX conversion warnings:', result.messages)
    }

    return result.value.trim()
  }
}

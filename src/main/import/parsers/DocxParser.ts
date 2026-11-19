import mammoth from 'mammoth'

// mammoth's typings omit convertToMarkdown, which it still ships.
const convertToMarkdown = (
  mammoth as unknown as {
    convertToMarkdown(input: { path: string }): Promise<{ value: string; messages: unknown[] }>
  }
).convertToMarkdown
export class DocxParser {
  async parse(filePath: string): Promise<string> {
    const result = await convertToMarkdown({ path: filePath })

    if (result.messages.length > 0) {
      console.warn('DOCX conversion warnings:', result.messages)
    }

    return result.value.trim()
  }
}

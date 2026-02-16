import fs from 'fs/promises'

export class TextParser {
  async parse(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8')
    return content.trim()
  }
}

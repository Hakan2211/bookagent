/**
 * Convert markdown to HTML for Tiptap consumption.
 * Handles: headings, bold, italic, paragraphs, blockquotes, hr, lists
 */
export function markdownToHtml(md: string): string {
  if (!md) return '<p></p>'

  let html = md
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>')
  html = html.replace(/^\*\s*\*\s*\*$/gm, '<hr>')

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote><p>$1</p></blockquote>')

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')

  // Paragraphs: split by double newlines
  const blocks = html.split(/\n\n+/)
  html = blocks
    .map((block) => {
      block = block.trim()
      if (!block) return ''
      if (
        block.startsWith('<h') ||
        block.startsWith('<hr') ||
        block.startsWith('<blockquote') ||
        block.startsWith('<ul') ||
        block.startsWith('<ol')
      ) {
        return block
      }
      // Replace single newlines with <br> within paragraphs
      block = block.replace(/\n/g, '<br>')
      return `<p>${block}</p>`
    })
    .filter(Boolean)
    .join('')

  return html || '<p></p>'
}

/**
 * Convert Tiptap HTML output back to markdown.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return ''

  let md = html

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')

  // Horizontal rules
  md = md.replace(/<hr\s*\/?>/gi, '---\n\n')

  // Blockquotes
  md = md.replace(/<blockquote[^>]*><p>(.*?)<\/p><\/blockquote>/gi, '> $1\n\n')
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')

  // Bold and italic
  md = md.replace(/<strong><em>(.*?)<\/em><\/strong>/gi, '***$1***')
  md = md.replace(/<em><strong>(.*?)<\/strong><\/em>/gi, '***$1***')
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n')

  // Paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')

  // Lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
  md = md.replace(/<\/?[uo]l[^>]*>/gi, '\n')

  // Strip remaining HTML tags
  md = md.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  md = md.replace(/&amp;/g, '&')
  md = md.replace(/&lt;/g, '<')
  md = md.replace(/&gt;/g, '>')
  md = md.replace(/&nbsp;/g, ' ')
  md = md.replace(/&quot;/g, '"')

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n')
  md = md.trim()

  return md
}

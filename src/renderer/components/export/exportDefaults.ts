import type { ExportConfig } from '@shared/types'

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  format: 'pdf',
  scope: 'book',
  pageSize: 'a4',
  fontFamily: 'serif',
  fontSize: 12,
  lineSpacing: 1.5,
  margins: { top: 25, bottom: 25, left: 30, right: 25 },
  includeTableOfContents: true,
  includeTitlePage: true,
  headerText: '',
  footerText: '',
  showPageNumbers: true
}

export interface ExportPreset {
  name: string
  description: string
  config: Partial<ExportConfig>
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    name: 'Standard Paperback',
    description: '6x9 trim, serif font, classic book layout',
    config: {
      pageSize: '6x9',
      fontFamily: 'serif',
      fontSize: 11,
      lineSpacing: 1.4,
      margins: { top: 20, bottom: 20, left: 22, right: 18 },
      includeTableOfContents: true,
      includeTitlePage: true,
      showPageNumbers: true
    }
  },
  {
    name: 'Manuscript',
    description: 'Letter size, double-spaced, mono font — submission-ready',
    config: {
      pageSize: 'letter',
      fontFamily: 'monospace',
      fontSize: 12,
      lineSpacing: 2.0,
      margins: { top: 25, bottom: 25, left: 30, right: 30 },
      includeTableOfContents: false,
      includeTitlePage: true,
      showPageNumbers: true
    }
  },
  {
    name: 'eReader',
    description: 'A5 size, clean serif layout for digital reading',
    config: {
      pageSize: 'a5',
      fontFamily: 'serif',
      fontSize: 11,
      lineSpacing: 1.5,
      margins: { top: 18, bottom: 18, left: 18, right: 18 },
      includeTableOfContents: true,
      includeTitlePage: true,
      showPageNumbers: true
    }
  },
  {
    name: 'Compact',
    description: 'A5 size, smaller text, maximized content area',
    config: {
      pageSize: 'a5',
      fontFamily: 'sans-serif',
      fontSize: 10,
      lineSpacing: 1.3,
      margins: { top: 15, bottom: 15, left: 15, right: 15 },
      includeTableOfContents: true,
      includeTitlePage: false,
      showPageNumbers: true
    }
  }
]

export const PAGE_SIZE_OPTIONS = [
  { value: 'a4', label: 'A4 (210 x 297mm)' },
  { value: 'letter', label: 'US Letter (8.5 x 11")' },
  { value: 'a5', label: 'A5 (148 x 210mm)' },
  { value: '6x9', label: 'Trade (6 x 9")' }
]

export const FONT_OPTIONS = [
  { value: 'serif', label: 'Serif (Georgia)' },
  { value: 'sans-serif', label: 'Sans-serif (Inter)' },
  { value: 'monospace', label: 'Monospace (Courier)' }
]

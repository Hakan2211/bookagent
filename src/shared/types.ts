// ─── Book Project Types ──────────────────────

export interface BookManifest {
  version: string
  title: string
  subtitle: string
  author: string
  created: string
  modified: string

  targets: {
    totalWords: number
    chapterWords: number
  }

  chapters: ChapterMeta[]

  notes: NoteMeta[]

  style: StyleConfig

  ai: AIConfig

  imports: ImportRecord[]

  /** Internal: monotonic counter to prevent chapter ID reuse after deletions */
  _nextChapterNum?: number
}

export interface ChapterMeta {
  id: string
  file: string
  title: string
  status: ChapterStatus
  wordCount: number
  summary: string
  sections?: SectionMeta[]
  /** Internal: monotonic counter to prevent section ID reuse after deletions */
  _nextSectionNum?: number
}

export interface SectionMeta {
  id: string
  file: string
  title: string
  status: ChapterStatus
  wordCount: number
  summary: string
}

export type ChapterStatus = 'outline' | 'draft' | 'revised' | 'final'

export interface NoteMeta {
  id: string
  file: string
  title: string
}

export interface StyleConfig {
  genre: string
  pov: 'first-person' | 'third-limited' | 'third-omniscient' | 'second-person' | ''
  tense: 'past' | 'present' | ''
  tone: string
  avoidWords: string[]
  customInstructions: string
}

export interface AIConfig {
  provider: AIProviderName
  model: string
  keyRef: string
}

export type AIProviderName = 'anthropic' | 'openai' | 'openrouter'

export interface ImportRecord {
  date: string
  sourceFile: string
  sourceType: string
  chaptersCreated: string[]
}

// ─── Book Metadata (for creation) ────────────

export interface BookMetadata {
  title: string
  author: string
  targetWords?: number
  chapterWords?: number
  aiProvider: AIProviderName
  aiModel: string
  sourceFile?: string
  detectedGenre?: string
  detectedPOV?: string
  detectedTense?: string
}

// ─── Summaries ───────────────────────────────

export interface SummariesFile {
  generatedAt: string
  chapters: Record<string, ChapterSummary>
}

export interface ChapterSummary {
  summary: string
  characters: string[]
  locations: string[]
  keyEvents: string[]
  wordCount: number
}

// ─── AI Provider Types ───────────────────────

export interface AIProvider {
  readonly name: AIProviderName
  complete(request: AIRequest): Promise<AIResponse>
  stream(request: AIRequest): AsyncIterable<AIStreamChunk>
  validateKey(apiKey: string): Promise<boolean>
  getModels(): ModelInfo[]
}

export interface AIRequest {
  systemPrompt: string
  messages: ChatMessageData[]
  tools?: ToolDefinition[]
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json'
  signal?: AbortSignal
}

export interface ChatMessageData {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
}

export interface AIResponse {
  content: string
  toolCalls?: ToolCall[]
  usage: {
    inputTokens: number
    outputTokens: number
  }
  model: string
  finishReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop'
}

export interface AIStreamChunk {
  type: 'text_delta' | 'tool_use' | 'done'
  text?: string
  toolCall?: ToolCall
}

export interface ModelInfo {
  id: string
  name: string
  contextWindow: number
  supportsTools: boolean
  supportsStreaming: boolean
}

// ─── Tool Types ──────────────────────────────

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  pendingAction?: PendingAction
}

export type PendingAction =
  | {
      type: 'edit'
      chapterId: string
      oldContent: string
      newContent: string
      diff: ChangeGroup[]
      description: string
    }
  | {
      type: 'create'
      title: string
      content: string
      afterChapterId?: string
    }
  | {
      type: 'split'
      chapterId: string
      splitAtParagraph: number
      secondChapterTitle: string
    }
  | {
      type: 'merge'
      firstChapterId: string
      secondChapterId: string
      mergedTitle: string
    }
  | {
      type: 'edit_section'
      chapterId: string
      sectionId: string
      oldContent: string
      newContent: string
      diff: ChangeGroup[]
      description: string
    }
  | {
      type: 'create_section'
      chapterId: string
      title: string
      content: string
      afterSectionId?: string
    }

// ─── Import Types ────────────────────────────

export interface ImportConfig {
  targetChapterWords: number
}

export interface ProposedSplit {
  rawText: string
  totalWords: number
  chapters: ProposedChapter[]
  bookSummary?: string
  detectedGenre?: string
  detectedPOV?: string
  detectedTense?: string
}

export interface ProposedChapter {
  index: number
  title: string
  summary: string
  text: string
  startCharIndex: number
  endCharIndex: number
  wordCount: number
  detectedMarker: string | null
}

export interface ConfirmedChapter {
  title: string
  text: string
  summary: string
}

// ─── Diff Types ──────────────────────────────

export interface TextChange {
  id: string
  type: 'insert' | 'delete' | 'equal'
  text: string
  originalOffset: number
  revisedOffset: number
}

export interface ChangeGroup {
  id: string
  changes: TextChange[]
  description?: string
}

// ─── Snapshot Types ──────────────────────────

export interface Snapshot {
  id: string
  timestamp: string
  reason: string
  changedFiles: string[]
}

// ─── Search Types ────────────────────────────

export interface SearchResult {
  chapterId: string
  chapterTitle: string
  lineNumber: number
  context: string
  matchStart: number
  matchEnd: number
}

// ─── Agent Types ─────────────────────────────

export type AgentEvent =
  | { type: 'stream'; text: string }
  | { type: 'tool_call'; toolCall: ToolCall }
  | { type: 'tool_result'; result: ToolResult }
  | { type: 'plan'; plan: string }
  | { type: 'done'; fullResponse: string }
  | { type: 'error'; error: string }

// ─── UI Types ────────────────────────────────

export interface RecentProject {
  path: string
  title: string
  author: string
  lastOpened: string
  lastChapterId?: string
  lastSectionId?: string
}

export interface AppSettings {
  anthropicModel: string
  openaiModel: string
  openrouterModel: string
  theme: 'dark' | 'light'
  sidebarWidth: number
  chatPanelWidth: number
  sidebarCollapsed: boolean
  chatPanelCollapsed: boolean
}

// ─── File Change Types ───────────────────────

export interface FileChange {
  type: 'modified' | 'added' | 'deleted'
  filePath: string
}

// ─── Context Assembly Types ──────────────────

export interface ContextBlock {
  type: 'outline' | 'chapter-full' | 'chapter-summary' | 'notes' | 'style'
  id?: string
  content: string
  tokenEstimate: number
  priority: number
}

// ─── Chat Display Types ─────────────────────

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  status: 'complete' | 'streaming' | 'error'
  plan?: string
  pendingActions?: PendingAction[]
}

// ─── Export Types ────────────────────────────

export type ExportFormat = 'pdf' | 'epub'
export type ExportScope = 'book' | 'chapter'
export type PageSize = 'a4' | 'letter' | 'a5' | '6x9'

export interface ExportConfig {
  format: ExportFormat
  scope: ExportScope
  chapterId?: string
  pageSize: PageSize
  fontFamily: 'serif' | 'sans-serif' | 'monospace'
  fontSize: number
  lineSpacing: number
  margins: { top: number; bottom: number; left: number; right: number }
  includeTableOfContents: boolean
  includeTitlePage: boolean
  headerText: string
  footerText: string
  showPageNumbers: boolean
}

export interface ExportProgress {
  stage: 'preparing' | 'rendering' | 'generating' | 'saving' | 'done' | 'error'
  percent: number
  message: string
}

export interface PreviewRequest {
  scope: ExportScope
  chapterId?: string
  config: ExportConfig
}

// ─── Error Types ─────────────────────────────

export class AIError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message)
    this.name = 'AIError'
  }
}

export const IPC = {
  // ── Project ─────────────────────────────────
  PROJECT_CREATE: 'project:create',
  PROJECT_OPEN: 'project:open',
  PROJECT_CLOSE: 'project:close',
  PROJECT_GET_RECENTS: 'project:get-recents',
  PROJECT_GET_STATE: 'project:get-state',
  PROJECT_SAVE_LAST_CHAPTER: 'project:save-last-chapter',
  PROJECT_GET_LAST_CHAPTER: 'project:get-last-chapter',

  // ── Chapters ────────────────────────────────
  CHAPTER_READ: 'chapter:read',
  CHAPTER_SAVE: 'chapter:save',
  CHAPTER_CREATE: 'chapter:create',
  CHAPTER_DELETE: 'chapter:delete',
  CHAPTER_RENAME: 'chapter:rename',
  CHAPTER_REORDER: 'chapter:reorder',
  CHAPTER_UPDATE_STATUS: 'chapter:update-status',

  // ── Sections ─────────────────────────────────
  SECTION_READ: 'section:read',
  SECTION_SAVE: 'section:save',
  SECTION_CREATE: 'section:create',
  SECTION_DELETE: 'section:delete',
  SECTION_RENAME: 'section:rename',
  SECTION_REORDER: 'section:reorder',
  SECTION_UPDATE_STATUS: 'section:update-status',
  CHAPTER_CONVERT_TO_SECTIONED: 'chapter:convert-to-sectioned',

  // ── Notes ───────────────────────────────────
  NOTE_READ: 'note:read',
  NOTE_SAVE: 'note:save',

  // ── Import ──────────────────────────────────
  IMPORT_START: 'import:start',
  IMPORT_PROGRESS: 'import:progress',
  IMPORT_SPLITS_READY: 'import:splits-ready',
  IMPORT_ADJUST: 'import:adjust',
  IMPORT_CONFIRM: 'import:confirm',

  // ── Agent ───────────────────────────────────
  AGENT_PROMPT: 'agent:prompt',
  AGENT_STREAM: 'agent:stream',
  AGENT_PLAN: 'agent:plan',
  AGENT_DIFF: 'agent:diff',
  AGENT_DONE: 'agent:done',
  AGENT_ERROR: 'agent:error',
  AGENT_ACCEPT_CHANGES: 'agent:accept-changes',
  AGENT_REJECT_CHANGES: 'agent:reject-changes',
  AGENT_CANCEL: 'agent:cancel',

  // ── Inline Edit ─────────────────────────────
  INLINE_EDIT_REQUEST: 'inline-edit:request',
  INLINE_EDIT_STREAM: 'inline-edit:stream',
  INLINE_EDIT_DONE: 'inline-edit:done',
  INLINE_EDIT_ERROR: 'inline-edit:error',
  INLINE_EDIT_CANCEL: 'inline-edit:cancel',

  // ── Settings ────────────────────────────────
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_SET_API_KEY: 'settings:set-api-key',
  SETTINGS_GET_API_KEY_STATUS: 'settings:get-api-key-status',
  SETTINGS_GET_MODELS: 'settings:get-models',
  SETTINGS_CHECK_API_STATUS: 'settings:check-api-status',

  // ── Project Settings ───────────────────────
  PROJECT_UPDATE_SETTINGS: 'project:update-settings',

  // ── History ─────────────────────────────────
  HISTORY_LIST: 'history:list',
  HISTORY_RESTORE: 'history:restore',

  // ── Search ──────────────────────────────────
  SEARCH_BOOK: 'search:book',

  // ── Dialog ──────────────────────────────────
  DIALOG_OPEN_FOLDER: 'dialog:open-folder',
  DIALOG_OPEN_FILE: 'dialog:open-file',
  DIALOG_SAVE_FOLDER: 'dialog:save-folder',
  DIALOG_CONFIRM: 'dialog:confirm',

  // ── Export ─────────────────────────────────
  EXPORT_PDF: 'export:pdf',
  EXPORT_EPUB: 'export:epub',
  EXPORT_PROGRESS: 'export:progress',
  EXPORT_PREVIEW_HTML: 'export:preview-html',
  DIALOG_SAVE_FILE: 'dialog:save-file',

  // ── Language ────────────────────────────────
  LANGUAGE_CHANGED: 'language:changed',

  // ── App ────────────────────────────────────
  APP_GET_DOCUMENTS_PATH: 'app:get-documents-path',
} as const

export type IPCChannel = (typeof IPC)[keyof typeof IPC]

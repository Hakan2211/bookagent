import type { ToolDefinition } from '@shared/types'

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: 'read_chapter',
    description:
      'Read the full text of a specific chapter. Use this when you need to see the complete content of a chapter before editing it or when you need context from a chapter that is not in your current context.',
    inputSchema: {
      type: 'object',
      properties: {
        chapterId: {
          type: 'string',
          description: 'The chapter ID, e.g., "ch-03"'
        }
      },
      required: ['chapterId']
    }
  },
  {
    name: 'edit_chapter',
    description:
      'Propose an edited version of a chapter. The edit will be shown to the user as a diff for review — they can accept or reject your changes. Always provide the COMPLETE new chapter text, not just the changed parts.',
    inputSchema: {
      type: 'object',
      properties: {
        chapterId: {
          type: 'string',
          description: 'The chapter ID to edit'
        },
        newContent: {
          type: 'string',
          description: 'The complete new chapter text (in markdown)'
        },
        changeDescription: {
          type: 'string',
          description: 'A brief description of what was changed and why (shown to user)'
        }
      },
      required: ['chapterId', 'newContent', 'changeDescription']
    }
  },
  {
    name: 'create_chapter',
    description: 'Create a new chapter and insert it at a specific position in the book.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The title for the new chapter'
        },
        content: {
          type: 'string',
          description: 'The chapter text (in markdown)'
        },
        afterChapterId: {
          type: 'string',
          description:
            'Insert after this chapter ID. Use "start" to insert at the beginning, or omit to append at end.'
        }
      },
      required: ['title', 'content']
    }
  },
  {
    name: 'split_chapter',
    description: 'Split one chapter into two chapters at a specified point.',
    inputSchema: {
      type: 'object',
      properties: {
        chapterId: { type: 'string', description: 'The chapter ID to split' },
        splitAtParagraph: {
          type: 'number',
          description:
            'Paragraph number (0-indexed) where the split should occur. The second chapter starts at this paragraph.'
        },
        secondChapterTitle: {
          type: 'string',
          description: 'Title for the new second chapter'
        }
      },
      required: ['chapterId', 'splitAtParagraph', 'secondChapterTitle']
    }
  },
  {
    name: 'merge_chapters',
    description:
      'Merge two adjacent chapters into one. The second chapter content is appended to the first.',
    inputSchema: {
      type: 'object',
      properties: {
        firstChapterId: { type: 'string', description: 'First chapter ID' },
        secondChapterId: { type: 'string', description: 'Second chapter ID' },
        mergedTitle: {
          type: 'string',
          description: 'Title for the merged chapter'
        }
      },
      required: ['firstChapterId', 'secondChapterId', 'mergedTitle']
    }
  },
  {
    name: 'read_section',
    description:
      'Read the full text of a specific section within a sectioned chapter. Chapters that have been divided into sections store each section as a separate file for granular editing.',
    inputSchema: {
      type: 'object',
      properties: {
        chapterId: {
          type: 'string',
          description: 'The chapter ID containing the section, e.g., "ch-03"'
        },
        sectionId: {
          type: 'string',
          description: 'The section ID, e.g., "sec-01"'
        }
      },
      required: ['chapterId', 'sectionId']
    }
  },
  {
    name: 'edit_section',
    description:
      'Propose an edited version of a section within a sectioned chapter. The edit will be shown to the user as a diff for review. Always provide the COMPLETE new section text.',
    inputSchema: {
      type: 'object',
      properties: {
        chapterId: {
          type: 'string',
          description: 'The chapter ID containing the section'
        },
        sectionId: {
          type: 'string',
          description: 'The section ID to edit'
        },
        newContent: {
          type: 'string',
          description: 'The complete new section text (in markdown)'
        },
        changeDescription: {
          type: 'string',
          description: 'A brief description of what was changed and why'
        }
      },
      required: ['chapterId', 'sectionId', 'newContent', 'changeDescription']
    }
  },
  {
    name: 'create_section',
    description:
      'Create a new section within a sectioned chapter. If the chapter is not yet sectioned, the user should first convert it using the sidebar.',
    inputSchema: {
      type: 'object',
      properties: {
        chapterId: {
          type: 'string',
          description: 'The chapter ID to add the section to'
        },
        title: {
          type: 'string',
          description: 'Title for the new section'
        },
        content: {
          type: 'string',
          description: 'The section text (in markdown)'
        },
        afterSectionId: {
          type: 'string',
          description:
            'Insert after this section ID. Omit to append at end of the chapter.'
        }
      },
      required: ['chapterId', 'title', 'content']
    }
  },
  {
    name: 'delete_section',
    description: 'Delete a section from a sectioned chapter.',
    inputSchema: {
      type: 'object',
      properties: {
        chapterId: {
          type: 'string',
          description: 'The chapter ID containing the section'
        },
        sectionId: {
          type: 'string',
          description: 'The section ID to delete'
        }
      },
      required: ['chapterId', 'sectionId']
    }
  },
  {
    name: 'update_outline',
    description: 'Regenerate the book outline based on the current state of all chapters.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'update_notes',
    description: 'Update one of the book note files (characters, world, or style guide).',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          enum: ['characters', 'world', 'style'],
          description: 'Which note file to update'
        },
        content: {
          type: 'string',
          description: 'New content for the note file (in markdown)'
        }
      },
      required: ['noteId', 'content']
    }
  },
  {
    name: 'search_book',
    description:
      'Search across all chapters for a specific term, phrase, or character name. Returns matching excerpts with chapter references.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search term or phrase'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_book_stats',
    description: 'Get word counts and status for all chapters.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
]

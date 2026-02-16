export function buildEditingPrompt(
  chapterTitle: string,
  chapterContent: string,
  userRequest: string
): string {
  return `The user wants you to edit the chapter "${chapterTitle}".

Here is the current chapter content:

<chapter>
${chapterContent}
</chapter>

User request: ${userRequest}

Instructions:
- Make targeted, precise edits to fulfill the request
- Preserve the author's voice and style
- Return the COMPLETE edited chapter text using the edit_chapter tool
- Briefly explain your changes in the changeDescription field`
}

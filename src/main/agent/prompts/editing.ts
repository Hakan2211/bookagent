export function buildEditingPrompt(
  chapterTitle: string,
  chapterContent: string,
  userRequest: string
): string {
  const wordCount = chapterContent.trim().split(/\s+/).length

  return `The user wants you to edit the chapter "${chapterTitle}" (currently ${wordCount.toLocaleString()} words).

Here is the current chapter content:

<chapter>
${chapterContent}
</chapter>

User request: ${userRequest}

Instructions:
- Make targeted, precise edits to fulfill the request
- Preserve the author's voice and style
- Return the COMPLETE edited chapter text using the edit_chapter tool
- Briefly explain your changes in the changeDescription field
- If your edit significantly expands the chapter (e.g., pushing it beyond ~8,000 words), consider whether splitting it at a natural scene break would improve readability — mention this to the user`
}

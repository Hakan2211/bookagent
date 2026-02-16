export function buildSummarizingPrompt(
  chapterTitle: string,
  chapterContent: string
): string {
  return `Analyze the following chapter and provide a structured summary.

Chapter: "${chapterTitle}"

<chapter>
${chapterContent}
</chapter>

Respond with VALID JSON ONLY (no markdown, no backticks):
{
  "summary": "2-3 sentence summary of the chapter's events and significance",
  "characters": ["list", "of", "character", "names", "who", "appear"],
  "locations": ["list", "of", "locations", "mentioned"],
  "keyEvents": ["brief description of each key event"]
}
`
}

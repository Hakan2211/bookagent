// pdf-parse ships no type declarations.
declare module 'pdf-parse' {
  function pdfParse(data: Buffer): Promise<{ text: string; numpages: number }>
  export default pdfParse
}


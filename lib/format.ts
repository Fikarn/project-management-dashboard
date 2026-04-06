/** Truncate text to a maximum length, adding an ellipsis if needed. */
export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "\u2026" : text;
}

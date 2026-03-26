export const clampBand = (value: number) => Math.max(4, Math.min(8.5, Math.round(value * 2) / 2));

export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export const countParagraphs = (text: string) => text.split(/\n\s*\n/).filter(Boolean).length;

export const countMatches = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;

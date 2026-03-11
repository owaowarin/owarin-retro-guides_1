/**
 * Relevance scoring for search suggestions
 *
 * Tier 3 (score 1) — title contains query anywhere
 * Tier 2 (score 2) — any word in title starts with query
 * Tier 1 (score 3) — title starts with query  ← highest priority
 *
 * Within same score → sort A→Z
 */
export function scoreMatch(title: string, query: string): number {
  const t = title.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  // Tier 1: title starts with query
  if (t.startsWith(q)) return 3;

  // Tier 2: any word in title starts with query
  const words = t.split(/\s+/);
  if (words.some((w) => w.startsWith(q))) return 2;

  // Tier 3: query appears anywhere in title
  if (t.includes(q)) return 1;

  return 0;
}

export interface ScoredItem {
  score: number;
  label: string;
  [key: string]: unknown;
}

/**
 * Sort suggestions by relevance score desc, then A→Z within same score
 */
export function sortByRelevance<T extends ScoredItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.label.localeCompare(b.label);
  });
}

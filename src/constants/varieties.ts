/**
 * Canonical grape variety names for autocomplete.
 * Derived from knowledgebase varietal profiles.
 */
export const CANONICAL_VARIETIES = [
  // Red varieties
  'Cabernet Franc',
  'Cabernet Sauvignon',
  'Grenache',
  'Malbec',
  'Merlot',
  'Mourvedre',
  'Petite Sirah',
  'Petit Verdot',
  'Pinot Noir',
  'Syrah',
  'Zinfandel',

  // White varieties
  'Chardonnay',
  'Gewurztraminer',
  'Marsanne',
  'Muscat Blanc',
  'Riesling',
  'Roussanne',
  'Sauvignon Blanc',
  'Viognier',

  // American/Native varieties
  'Carlos',
  'Catawba',
  'Concord',
  'Niagara',
  'Noble',
  'Scuppernong',
] as const;

export type CanonicalVariety = (typeof CANONICAL_VARIETIES)[number];

/**
 * Common abbreviations mapped to canonical names.
 * Used for matching user input to canonical varieties.
 */
export const VARIETY_ALIASES: Record<string, string> = {
  // Cabernet Franc
  'cab franc': 'Cabernet Franc',
  'cabfranc': 'Cabernet Franc',
  'cf': 'Cabernet Franc',

  // Cabernet Sauvignon
  'cab': 'Cabernet Sauvignon',
  'cab sav': 'Cabernet Sauvignon',
  'cabernet': 'Cabernet Sauvignon',
  'cs': 'Cabernet Sauvignon',

  // Sauvignon Blanc
  'sauv': 'Sauvignon Blanc',
  'sauv blanc': 'Sauvignon Blanc',
  'sb': 'Sauvignon Blanc',

  // Pinot Noir
  'pinot': 'Pinot Noir',
  'pn': 'Pinot Noir',

  // Chardonnay
  'chard': 'Chardonnay',

  // Gewurztraminer
  'gewurz': 'Gewurztraminer',

  // Syrah/Shiraz
  'shiraz': 'Syrah',

  // Zinfandel
  'zin': 'Zinfandel',
  'primitivo': 'Zinfandel',

  // Petite Sirah
  'petite syrah': 'Petite Sirah',
  'durif': 'Petite Sirah',

  // Mourvedre
  'monastrell': 'Mourvedre',
  'mataro': 'Mourvedre',

  // Muscat
  'muscat': 'Muscat Blanc',
  'moscato': 'Muscat Blanc',
};

/**
 * Match user input against canonical varieties.
 * Returns matches sorted by relevance.
 */
export const matchVariety = (input: string): string[] => {
  const normalized = input.toLowerCase().trim();

  if (!normalized) return [];

  // Check exact alias match first
  if (VARIETY_ALIASES[normalized]) {
    return [VARIETY_ALIASES[normalized]];
  }

  // Filter canonical varieties that contain the input
  const matches = CANONICAL_VARIETIES.filter((variety) =>
    variety.toLowerCase().includes(normalized)
  );

  // Also check if any alias contains the input
  const aliasMatches = Object.entries(VARIETY_ALIASES)
    .filter(([alias]) => alias.includes(normalized))
    .map(([, canonical]) => canonical);

  // Combine and dedupe, prioritizing exact starts
  const combined = [...new Set([...matches, ...aliasMatches])];

  return combined.sort((a, b) => {
    const aStarts = a.toLowerCase().startsWith(normalized);
    const bStarts = b.toLowerCase().startsWith(normalized);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.localeCompare(b);
  });
};

/**
 * Normalize a variety name to its canonical form if possible.
 * Returns the original input (uppercased) if no match found.
 */
export const normalizeVariety = (input: string): string => {
  const normalized = input.toLowerCase().trim();

  // Check exact alias match
  if (VARIETY_ALIASES[normalized]) {
    return VARIETY_ALIASES[normalized];
  }

  // Check exact canonical match (case-insensitive)
  const exactMatch = CANONICAL_VARIETIES.find(
    (v) => v.toLowerCase() === normalized
  );
  if (exactMatch) {
    return exactMatch;
  }

  // No match - return as uppercase (user's custom variety)
  return input.toUpperCase();
};

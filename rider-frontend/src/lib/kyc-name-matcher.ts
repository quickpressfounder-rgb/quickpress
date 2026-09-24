/**
 * KYC Name Consistency & Similarity Matcher
 * Ensures that Candidate Name across Aadhaar, Driving Licence (DL),
 * Bank Account, and Vehicle RC matches reliably with smart fuzzy/token analysis.
 */

export interface NameMatchResult {
  isMatch: boolean;
  score: number; // 0 to 100
  message: string;
}

const SALUTATIONS = new Set(["mr", "mrs", "ms", "shri", "smt", "dr", "kumar", "singh"]);

export function cleanKycName(raw: string): string[] {
  if (!raw) return [];
  return raw
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !SALUTATIONS.has(token));
}

export function compareKycNames(primaryName: string, secondaryName: string): NameMatchResult {
  const norm1 = primaryName.trim().toLowerCase();
  const norm2 = secondaryName.trim().toLowerCase();

  // Exact match
  if (norm1 && norm2 && norm1 === norm2) {
    return {
      isMatch: true,
      score: 100,
      message: "Exact name match confirmed ✓",
    };
  }

  const tokens1 = cleanKycName(primaryName);
  const tokens2 = cleanKycName(secondaryName);

  if (tokens1.length === 0 || tokens2.length === 0) {
    return {
      isMatch: true,
      score: 100,
      message: "Name verification accepted",
    };
  }

  // Count token overlaps
  let matches = 0;
  for (const t1 of tokens1) {
    if (tokens2.some((t2) => t2 === t1 || t2.startsWith(t1) || t1.startsWith(t2))) {
      matches++;
    }
  }

  const score = Math.round((matches / Math.max(tokens1.length, tokens2.length)) * 100);

  if (score >= 60) {
    return {
      isMatch: true,
      score,
      message: `Name match confirmed (${score}%) ✓`,
    };
  }

  return {
    isMatch: false,
    score,
    message: `Name mismatch warning: Document name (${secondaryName}) differs from your verified name (${primaryName}). Admin will require manual review.`,
  };
}

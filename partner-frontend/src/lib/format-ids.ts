/**
 * Identifier formatters for Partner / Store IDs.
 * Enforces standard code words: PRT-6DIGIT (e.g. PRT-619284)
 */

export function formatPartnerId(id?: string | null): string {
  if (!id) return "PRT-100001";
  const clean = String(id).trim();
  if (/^PRT-\d{6}$/i.test(clean)) return clean.toUpperCase();
  if (clean.toUpperCase().startsWith("PRT-")) return clean.toUpperCase();
  if (clean.toUpperCase().startsWith("PARTNER-")) return `PRT-${clean.slice(8).toUpperCase()}`;

  const digits = clean.replace(/\D/g, "");
  if (digits.length >= 6) {
    return `PRT-${digits.slice(0, 6)}`;
  }

  const alnum = clean.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (alnum.length >= 6) {
    return `PRT-${alnum.slice(0, 6)}`;
  }
  return `PRT-${alnum.padEnd(6, "0")}`;
}

export function formatCaptainId(id?: string | null): string {
  if (!id) return "CAP-100001";
  const clean = String(id).trim();
  if (/^CAP-\d{6}$/i.test(clean)) return clean.toUpperCase();
  if (clean.toUpperCase().startsWith("CAP-")) return clean.toUpperCase();
  if (clean.toUpperCase().startsWith("RDR-")) return `CAP-${clean.slice(4).toUpperCase()}`;
  if (clean.toUpperCase().startsWith("CP-")) return `CAP-${clean.slice(3).toUpperCase()}`;

  const digits = clean.replace(/\D/g, "");
  if (digits.length >= 6) {
    return `CAP-${digits.slice(0, 6)}`;
  }

  const alnum = clean.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (alnum.length >= 6) {
    return `CAP-${alnum.slice(0, 6)}`;
  }
  return `CAP-${alnum.padEnd(6, "0")}`;
}

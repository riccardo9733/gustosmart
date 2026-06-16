/**
 * Verifies if an email address belongs to a whitelisted email provider.
 *
 * @param email The email address to check
 * @returns true if the email domain is in the whitelist, false otherwise
 */
export function isWhitelistedEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;

  // Simple normalization and splitting
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return false;

  const domain = parts[1];

  // Whitelist of allowed email domains
  const allowedDomains = new Set([
    // Global providers
    "gmail.com",
    "yahoo.com",
    "yahoo.it",
    "outlook.com",
    "outlook.it",
    "hotmail.com",
    "hotmail.it",
    "icloud.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
    "protonmail.ch",
    "zoho.com",
    "mail.com",
    "gmx.com",
    "yandex.com",

    // Italian providers
    "libero.it",
    "virgilio.it",
    "tiscali.it",
    "fastwebnet.it",
    "alice.it",
    "tin.it",
    "poste.it",
    "postecert.it",
    "email.it",
  ]);

  // Check direct domain match
  if (allowedDomains.has(domain)) {
    return true;
  }

  // Check if any parent domain is in the whitelist (for corporate subdomains)
  const domainParts = domain.split(".");
  for (let i = 1; i < domainParts.length - 1; i++) {
    const parentDomain = domainParts.slice(i).join(".");
    if (allowedDomains.has(parentDomain)) {
      return true;
    }
  }

  return false;
}

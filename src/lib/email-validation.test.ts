import { describe, it, expect } from "vitest";
import { isWhitelistedEmail } from "./email-validation";

describe("isWhitelistedEmail", () => {
  it("allows whitelisted domains", () => {
    expect(isWhitelistedEmail("utente@gmail.com")).toBe(true);
    expect(isWhitelistedEmail("chef@libero.it")).toBe(true);
    expect(isWhitelistedEmail("someone@yahoo.it")).toBe(true);
    expect(isWhitelistedEmail("admin@outlook.com")).toBe(true);
    expect(isWhitelistedEmail("john.doe+alias@proton.me")).toBe(true);
  });

  it("allows subdomains of whitelisted domains", () => {
    expect(isWhitelistedEmail("user@sub.gmail.com")).toBe(true);
    expect(isWhitelistedEmail("test@nested.sub.outlook.com")).toBe(true);
  });

  it("blocks non-whitelisted domains", () => {
    expect(isWhitelistedEmail("test@mrdok.net")).toBe(false);
    expect(isWhitelistedEmail("user@mailinator.com")).toBe(false);
    expect(isWhitelistedEmail("hello@yopmail.com")).toBe(false);
    expect(isWhitelistedEmail("random@mycustomcompany.org")).toBe(false);
    expect(isWhitelistedEmail("gino.sorbillo@mrdok.net")).toBe(false);
  });

  it("handles invalid inputs gracefully", () => {
    expect(isWhitelistedEmail("")).toBe(false);
    expect(isWhitelistedEmail("not-an-email")).toBe(false);
    expect(isWhitelistedEmail("@missing-username.com")).toBe(false);
    expect(isWhitelistedEmail("username@")).toBe(false);
    // @ts-expect-error - testing invalid types
    expect(isWhitelistedEmail(null)).toBe(false);
    // @ts-expect-error - testing invalid types
    expect(isWhitelistedEmail(undefined)).toBe(false);
  });
});

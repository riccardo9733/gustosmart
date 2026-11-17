import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Regression guard for the blank-pages incident (Fase 12 repair).
//
// A whitespace-normalizing script once merged every indented line of the
// three page files below into single 4k–54k-char lines. The `//` comments
// caught on those mega-lines then swallowed the components' logic (data
// hooks, returns) as trailing comments. TypeScript stayed green because
// commented-out code is not checked and a valueless component return is a
// valid ReactNode, so the corruption shipped and the pages rendered blank
// in production despite a green build.
//
// This test fails on any such collapsed line before it can ship again.
const TARGETS = [
  "src/app/(protected)/page.tsx",
  "src/app/(protected)/recipes/[id]/page.tsx",
  "src/app/recipes/share/[id]/page.tsx",
];

// Collapsed lines measured 4_651–54_217 chars; healthy prettier-formatted
// sources stay well under 300. The threshold leaves ample margin while
// catching any future whole-file line collapse.
const MAX_LINE_LENGTH = 1500;

describe("source hygiene (no collapsed mega-lines)", () => {
  for (const rel of TARGETS) {
    it(`${rel} has no line longer than ${MAX_LINE_LENGTH} chars`, () => {
      const abs = path.join(process.cwd(), rel);
      const lines = fs.readFileSync(abs, "utf8").split("\n");
      const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
      expect(longest).toBeLessThanOrEqual(MAX_LINE_LENGTH);
    });
  }
});

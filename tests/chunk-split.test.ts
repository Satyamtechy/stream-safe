import { describe, expect, it } from "vitest";
import { createStreamSanitizer, presets } from "../src/index";

const dangerousInputs = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  '<a href="javascript:alert(1)">click</a>',
  '<iframe src="evil.com"></iframe>',
  "<div onclick=alert(1)>text</div>",
];

describe("chunk-split safety", () => {
  for (const input of dangerousInputs) {
    describe(`splitting: ${input.slice(0, 40)}`, () => {
      for (let i = 1; i < input.length; i++) {
        it(`split at position ${i}`, () => {
          const sanitizer = createStreamSanitizer(presets.llmChat);
          const part1 = input.slice(0, i);
          const part2 = input.slice(i);
          const result =
            sanitizer.write(part1) + sanitizer.write(part2) + sanitizer.flush();
          expect(result).not.toContain("<script");
          expect(result).not.toContain("onerror");
          expect(result).not.toContain("onclick");
          expect(result).not.toContain("javascript:");
          expect(result).not.toContain("<iframe");
        });
      }
    });
  }
});

import { describe, expect, it } from "vitest";
import { createStreamSanitizer, presets } from "../src/index";

const xssVectors = [
  { input: "<script>alert(1)</script>", expected: "" },
  { input: "<img src=x onerror=alert(1)>", expected: '<img src="x" />' },
  { input: "<svg onload=alert(1)>", expected: "" },
  { input: "<body onload=alert(1)>", expected: "" },
  { input: '<iframe src="javascript:alert(1)">', expected: "" },
  {
    input: '<a href="javascript:alert(1)">click</a>',
    expected: "<a>click</a>",
  },
  {
    input: '<a href="JAVASCRIPT:alert(1)">click</a>',
    expected: "<a>click</a>",
  },
  {
    input: '<a href="&#106;avascript:alert(1)">click</a>',
    expected: "<a>click</a>",
  },
  { input: '<div style="background:url(javascript:alert(1))">', expected: "" },
  { input: "<input onfocus=alert(1) autofocus>", expected: "" },
  { input: "<details open ontoggle=alert(1)>", expected: "" },
  { input: "<marquee onstart=alert(1)>", expected: "" },
  { input: "<video><source onerror=alert(1)>", expected: "" },
  {
    input:
      "<math><mtext></mtext><mglyph><svg><mtext><style><img src=x onerror=alert(1)></style></mtext></svg></mglyph></math>",
    expected: "",
  },
  { input: '<object data="javascript:alert(1)">', expected: "" },
  { input: '<embed src="javascript:alert(1)">', expected: "" },
  {
    input: '<form action="javascript:alert(1)"><input type=submit>',
    expected: "",
  },
  {
    input: '<button formaction="javascript:alert(1)">click</button>',
    expected: "",
  },
  {
    input: '<a href="data:text/html,<script>alert(1)</script>">x</a>',
    expected: "<a>x</a>",
  },
  {
    input: '<img src="x" longdesc="javascript:alert(1)">',
    expected: '<img src="x" />',
  },
  { input: "<div onclick=alert(1)>text</div>", expected: "text" },
  { input: "<p onmouseover=alert(1)>hover</p>", expected: "<p>hover</p>" },
  {
    input: '<img src=1 onerror="alert(1)" alt="test">',
    expected: '<img src="1" alt="test" />',
  },
  { input: '<script/src="evil.js">', expected: "" },
  { input: '<script type="text/javascript">alert(1)</script>', expected: "" },
  { input: '<img """><script>alert(1)</script>">', expected: "" },
  { input: "<noscript><img src=x onerror=alert(1)></noscript>", expected: "" },
  {
    input: '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    expected: "",
  },
  { input: '<link rel="stylesheet" href="javascript:alert(1)">', expected: "" },
  { input: '<base href="javascript:alert(1)">', expected: "" },
];

describe("XSS vectors", () => {
  xssVectors.forEach(({ input }, i) => {
    it(`blocks XSS vector #${i + 1}: ${input.slice(0, 50)}`, () => {
      const sanitizer = createStreamSanitizer(presets.llmChat);
      const result = sanitizer.write(input) + sanitizer.flush();
      expect(result).not.toContain("<script");
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("onload");
      expect(result).not.toContain("onmouseover");
      expect(result).not.toContain("onfocus");
      expect(result).not.toContain("ontoggle");
      expect(result).not.toContain("onstart");
      expect(result).not.toContain("formaction");
      expect(result).not.toContain("javascript:");
      expect(result).not.toContain("<iframe");
      expect(result).not.toContain("<object");
      expect(result).not.toContain("<embed");
      expect(result).not.toContain("<form");
      expect(result).not.toContain("<svg");
      expect(result).not.toContain("<math");
      expect(result).not.toContain("<style");
      expect(result).not.toContain("<noscript");
      expect(result).not.toContain("<meta");
      expect(result).not.toContain("<link");
      expect(result).not.toContain("<base");
    });
  });
});

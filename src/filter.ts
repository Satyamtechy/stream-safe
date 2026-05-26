import type { SanitizerOptions } from "./types";
import type { Attribute } from "./types";

const DANGEROUS_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "textarea",
  "noscript",
  "meta",
  "link",
  "base",
]);

const URI_ATTRIBUTES = new Set([
  "href",
  "src",
  "action",
  "formaction",
  "xlink:href",
  "data",
]);

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&#x27;": "'",
  "&#x2F;": "/",
  "&#47;": "/",
  "&#58;": ":",
  "&#x3A;": ":",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCharCode(Number.parseInt(dec, 10)),
    )
    .replace(
      /&[a-zA-Z]+;/g,
      (match) => ENTITY_MAP[match.toLowerCase()] ?? match,
    );
}

export class SecurityFilter {
  private options: Required<
    Pick<
      SanitizerOptions,
      | "allowedTags"
      | "allowedAttributes"
      | "allowedSchemes"
      | "maxAttributeLength"
    >
  >;
  private allowedTagSet: Set<string>;

  constructor(options: SanitizerOptions) {
    this.options = {
      allowedTags: options.allowedTags ?? [
        "p",
        "br",
        "b",
        "i",
        "em",
        "strong",
        "a",
        "ul",
        "ol",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "code",
        "pre",
        "blockquote",
        "span",
        "div",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "img",
        "hr",
        "sup",
        "sub",
        "dl",
        "dt",
        "dd",
        "figure",
        "figcaption",
      ],
      allowedAttributes: options.allowedAttributes ?? {
        "*": ["class", "id", "title", "lang", "dir"],
        a: ["href", "target", "rel"],
        img: ["src", "alt", "width", "height"],
        td: ["colspan", "rowspan"],
        th: ["colspan", "rowspan", "scope"],
        ol: ["start", "type"],
        code: ["class"],
      },
      allowedSchemes: options.allowedSchemes ?? ["http", "https", "mailto"],
      maxAttributeLength: options.maxAttributeLength ?? 1024,
    };
    this.allowedTagSet = new Set(
      this.options.allowedTags.map((t) => t.toLowerCase()),
    );
  }

  isTagAllowed(tagName: string): boolean {
    return this.allowedTagSet.has(tagName.toLowerCase());
  }

  isDangerousTag(tagName: string): boolean {
    return DANGEROUS_TAGS.has(tagName.toLowerCase());
  }

  filterAttributes(tagName: string, attributes: Attribute[]): Attribute[] {
    const tag = tagName.toLowerCase();
    const globalAllowed = this.options.allowedAttributes["*"] ?? [];
    const tagAllowed = this.options.allowedAttributes[tag] ?? [];
    const allowedSet = new Set([...globalAllowed, ...tagAllowed]);

    return attributes.filter((attr) => {
      const name = attr.name.toLowerCase();

      // Always strip event handlers
      if (name.startsWith("on")) return false;

      // Strip oversized attributes
      if (attr.value.length > this.options.maxAttributeLength) return false;

      // Must be in allowed list
      if (!allowedSet.has(name)) return false;

      // Validate URI attributes
      if (URI_ATTRIBUTES.has(name)) {
        if (!this.isSchemeAllowed(attr.value)) return false;
      }

      return true;
    });
  }

  private isSchemeAllowed(value: string): boolean {
    const decoded = decodeEntities(value)
      // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — strip control chars for XSS prevention
      .replace(/[\x00-\x20]+/g, "")
      .trim();

    // Relative URLs, anchors, empty
    if (
      !decoded ||
      decoded.startsWith("/") ||
      decoded.startsWith("#") ||
      decoded.startsWith("?") ||
      decoded.startsWith(".")
    ) {
      return true;
    }

    // Check for scheme
    const schemeMatch = decoded.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*)\s*:/);
    if (!schemeMatch) {
      // No scheme detected — treat as relative
      return true;
    }

    return this.options.allowedSchemes.includes(schemeMatch[1].toLowerCase());
  }
}

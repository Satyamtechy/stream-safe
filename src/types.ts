export interface SanitizerOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
  stripDisallowed?: boolean;
  maxDepth?: number;
  maxAttributeLength?: number;
  onSafe?: (html: string) => void;
  onDanger?: (tag: string, reason: string) => void;
}

export interface StreamSanitizer {
  write(chunk: string): string;
  flush(): string;
}

export interface Preset extends SanitizerOptions {}

export type Token =
  | { type: 'text'; value: string }
  | { type: 'openTag'; tagName: string; attributes: Attribute[]; selfClosing: boolean }
  | { type: 'closeTag'; tagName: string }
  | { type: 'comment'; value: string }
  | { type: 'dangerousContent'; tagName: string; value: string };

export interface Attribute {
  name: string;
  value: string;
}

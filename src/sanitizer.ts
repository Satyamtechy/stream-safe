import { IncrementalTokenizer } from './tokenizer';
import { SecurityFilter } from './filter';
import type { SanitizerOptions, StreamSanitizer } from './types';

const DEFAULTS: Required<SanitizerOptions> = {
  allowedTags: [],
  allowedAttributes: {},
  allowedSchemes: ['http', 'https', 'mailto'],
  stripDisallowed: true,
  maxDepth: 50,
  maxAttributeLength: 2048,
  onSafe: undefined as any,
  onDanger: undefined as any,
};

export function createStreamSanitizer(options: SanitizerOptions = {}): StreamSanitizer {
  const opts = { ...DEFAULTS, ...options };
  const tokenizer = new IncrementalTokenizer();
  const filter = new SecurityFilter(opts);
  let depth = 0;
  const tagStack: string[] = [];

  return {
    write(chunk: string): string {
      const tokens = tokenizer.write(chunk);
      let output = '';
      for (const token of tokens) {
        switch (token.type) {
          case 'text':
            output += token.value;
            break;
          case 'openTag':
            if (filter.isDangerousTag(token.tagName)) {
              // dangerous content is already eaten by tokenizer
              opts.onDanger?.(token.tagName, 'dangerous tag');
            } else if (filter.isTagAllowed(token.tagName)) {
              if (depth >= opts.maxDepth) {
                opts.onDanger?.(token.tagName, 'max depth exceeded');
                break;
              }
              const attrs = filter.filterAttributes(token.tagName, token.attributes);
              const attrStr = attrs.map(a => a.value ? ` ${a.name}="${escapeAttr(a.value)}"` : ` ${a.name}`).join('');
              if (token.selfClosing) {
                output += `<${token.tagName}${attrStr} />`;
              } else {
                output += `<${token.tagName}${attrStr}>`;
                tagStack.push(token.tagName);
                depth++;
              }
              opts.onSafe?.(token.tagName);
            } else {
              if (!opts.stripDisallowed) {
                output += escapeHtml(`<${token.tagName}>`);
              }
              opts.onDanger?.(token.tagName, 'tag not allowed');
            }
            break;
          case 'closeTag':
            if (filter.isTagAllowed(token.tagName)) {
              const idx = tagStack.lastIndexOf(token.tagName);
              if (idx !== -1) {
                // Close any tags between current and the match
                while (tagStack.length > idx) {
                  const tag = tagStack.pop()!;
                  output += `</${tag}>`;
                  depth--;
                }
              }
            } else if (!opts.stripDisallowed) {
              output += escapeHtml(`</${token.tagName}>`);
            }
            break;
          case 'dangerousContent':
            opts.onDanger?.(token.tagName, 'dangerous content stripped');
            break;
          case 'comment':
            // Strip comments by default
            break;
        }
      }
      return output;
    },
    flush(): string {
      const tokens = tokenizer.flush();
      let output = '';
      // Process any remaining tokens from flush
      for (const token of tokens) {
        if (token.type === 'text') output += token.value;
      }
      // Close any unclosed tags
      while (tagStack.length > 0) {
        output += `</${tagStack.pop()!}>`;
        depth--;
      }
      return output;
    }
  };
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

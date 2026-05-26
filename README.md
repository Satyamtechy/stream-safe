# stream-safe

> Streaming HTML sanitizer for LLM output. XSS-safe, chunk-by-chunk, zero dependencies, <3KB.

[![npm](https://img.shields.io/npm/v/stream-safe)](https://www.npmjs.com/package/stream-safe)
[![bundle size](https://img.shields.io/bundlephobia/minzip/stream-safe)](https://bundlephobia.com/package/stream-safe)
[![license](https://img.shields.io/npm/l/stream-safe)](./LICENSE)

## Why?

LLMs stream HTML token by token. Existing sanitizers (DOMPurify, sanitize-html) need the **complete** string. You either:
- Buffer everything (kills streaming UX)
- Render unsanitized (XSS risk)
- Write regex hacks (break on edge cases)

**stream-safe** sanitizes each chunk as it arrives using a stateful parser. No buffering, no XSS, no compromise.

## Install

```bash
npm install stream-safe
```

## Quick Start

```typescript
import { createStreamSanitizer, presets } from 'stream-safe';

const sanitizer = createStreamSanitizer(presets.llmChat);

// Push chunks as they arrive from your LLM
const safe1 = sanitizer.write('<p>Hello <strong>world</strong>');
const safe2 = sanitizer.write('<script>alert(1)</script> bye</p>');
const remaining = sanitizer.flush();

// safe1 = '<p>Hello <strong>world</strong>'
// safe2 = ' bye</p>'
// remaining = ''
```

## Usage with fetch streaming

```typescript
import { createSanitizeTransform, presets } from 'stream-safe';

const response = await fetch('/api/chat', { method: 'POST', body: prompt });

const safeStream = response.body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(createSanitizeTransform(presets.llmChat));

for await (const safeHtml of safeStream) {
  document.getElementById('chat').insertAdjacentHTML('beforeend', safeHtml);
}
```

## Usage with Vercel AI SDK

```typescript
import { useChat } from 'ai/react';
import { createStreamSanitizer, presets } from 'stream-safe';

const sanitizer = createStreamSanitizer(presets.llmChat);
// Use sanitizer.write() in your onChunk handler
```

## Usage with Node.js streams

```typescript
import { createNodeTransform } from 'stream-safe/node';
import { presets } from 'stream-safe';

llmStream.pipe(createNodeTransform(presets.llmChat)).pipe(res);
```

## Presets

| Preset | Description |
|--------|-------------|
| `presets.llmChat` | Safe for AI chat (p, strong, a, code, lists, tables, img) |
| `presets.richText` | CMS/editor content (adds div, section, video, audio) |
| `presets.textOnly` | Strip ALL HTML, return plain text |

## Custom options

```typescript
const sanitizer = createStreamSanitizer({
  allowedTags: ['p', 'b', 'i', 'a'],
  allowedAttributes: { 'a': ['href'] },
  allowedSchemes: ['https'],
  stripDisallowed: true,
  maxDepth: 30,
  maxAttributeLength: 1024,
  onDanger: (tag, reason) => console.warn(`Blocked <${tag}>: ${reason}`),
});
```

## Security

- Blocks `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<form>` and more
- Strips ALL `on*` event handlers (onclick, onerror, etc.)
- Validates URI schemes (blocks `javascript:`, `data:`, `vbscript:`)
- Handles chunked attacks (`<scr` + `ipt>` → blocked)
- No regex in hot path (immune to ReDoS)
- Tested against 100+ OWASP XSS vectors
- Every vector tested at every possible byte split

## API

### `createStreamSanitizer(options?): StreamSanitizer`

Returns `{ write(chunk: string): string, flush(): string }`

### `createSanitizeTransform(options?): TransformStream<string, string>`

Web Streams API TransformStream.

### `createNodeTransform(options?): Transform`

Node.js Transform stream (import from `'stream-safe/node'`).

## License

MIT

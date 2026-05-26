<div align="center">

# 🛡️ stream-safe

**Streaming HTML sanitizer for LLM output**

XSS-safe · chunk-by-chunk · zero dependencies · <3KB

[![npm](https://img.shields.io/npm/v/stream-safe?color=cb3837&label=npm)](https://www.npmjs.com/package/stream-safe)
[![bundle](https://img.shields.io/badge/gzip-2.87KB-blue)](https://bundlephobia.com/package/stream-safe)
[![tests](https://img.shields.io/badge/tests-206%20passed-brightgreen)](#)
[![license](https://img.shields.io/github/license/Satyamtechy/stream-safe)](./LICENSE)

</div>

---

## The Problem

LLMs stream HTML token by token. Existing sanitizers need the **complete** string:

| Approach | Problem |
|----------|---------|
| Buffer everything | Kills streaming UX |
| Render unsanitized | XSS vulnerability |
| Regex hacks | Break on edge cases |

**stream-safe** sanitizes each chunk as it arrives. No buffering. No XSS. No compromise.

---

## Install

```bash
npm install stream-safe
```

---

## Quick Start

```typescript
import { createStreamSanitizer, presets } from 'stream-safe';

const sanitizer = createStreamSanitizer(presets.llmChat);

const safe1 = sanitizer.write('<p>Hello <strong>world</strong>');
const safe2 = sanitizer.write('<script>alert(1)</script> bye</p>');
const remaining = sanitizer.flush();

// safe1 → '<p>Hello <strong>world</strong>'
// safe2 → ' bye</p>'
// remaining → ''
```

---

## Streaming with fetch

```typescript
import { createSanitizeTransform, presets } from 'stream-safe';

const response = await fetch('/api/chat', { method: 'POST', body: prompt });

const safeStream = response.body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(createSanitizeTransform(presets.llmChat));

for await (const chunk of safeStream) {
  document.getElementById('chat').insertAdjacentHTML('beforeend', chunk);
}
```

---

## Node.js Streams

```typescript
import { createNodeTransform } from 'stream-safe/node';
import { presets } from 'stream-safe';

llmStream.pipe(createNodeTransform(presets.llmChat)).pipe(res);
```

---

## Presets

| Preset | Use Case |
|--------|----------|
| `presets.llmChat` | AI chat — p, strong, a, code, lists, tables, img |
| `presets.richText` | CMS content — adds div, section, video, audio |
| `presets.textOnly` | Strip ALL HTML → plain text |

---

## Custom Config

```typescript
const sanitizer = createStreamSanitizer({
  allowedTags: ['p', 'b', 'i', 'a'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['https'],
  stripDisallowed: true,
  maxDepth: 30,
  maxAttributeLength: 1024,
});
```

---

## Security

| Threat | Mitigation |
|--------|-----------|
| `<script>alert(1)</script>` | Blocked & stripped entirely |
| `<img onerror=alert(1)>` | All `on*` handlers stripped |
| `javascript:` URIs | Scheme allowlist validation |
| Chunked attacks (`<scr` + `ipt>`) | Stateful buffer holds incomplete tags |
| ReDoS | No regex — char-by-char state machine |
| Depth bombs | Configurable max nesting limit |

---

## Performance

| Input | ops/sec |
|-------|---------|
| Small chunk (35B) | 265,923 |
| XSS payload (200B) | 107,456 |
| Medium chunk (250B) | 78,845 |
| Chunked XSS (split mid-tag) | 140,776 |
| 100 streaming chunks | 7,109 |

---

## API

### `createStreamSanitizer(options?)`

Returns `{ write(chunk: string): string, flush(): string }`

### `createSanitizeTransform(options?)`

Web Streams `TransformStream<string, string>`

### `createNodeTransform(options?)`

Node.js `Transform` stream (import from `'stream-safe/node'`)

---

## Works With

Vercel AI SDK · LangChain.js · OpenAI SDK · Anthropic SDK · Ollama · Any streaming LLM API

---

## License

[MIT](./LICENSE) © 2026 Satyamtechy

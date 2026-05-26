# stream-safe — Complete Implementation Plan

> Streaming HTML sanitizer for LLM output. XSS-safe, chunk-by-chunk, zero dependencies, <3KB.

**npm name:** `stream-safe` (confirmed available)  
**License:** MIT  
**Target:** v1.0.0 in 3 weeks

---

## Problem Statement

LLMs stream HTML token by token. Existing sanitizers (DOMPurify, sanitize-html) require the **complete** string. Developers must either:
- Buffer the entire response (kills streaming UX)
- Render unsanitized (XSS vulnerability)
- Write fragile regex guards (break on edge cases)

`stream-safe` solves this with a **stateful incremental HTML parser** that sanitizes each chunk as it arrives.

---

## API Surface

```typescript
// Core
import { createStreamSanitizer, presets } from 'stream-safe';

const sanitizer = createStreamSanitizer(presets.llmChat);
const safeHtml = sanitizer.write(chunk);  // push chunk → get safe HTML
const remaining = sanitizer.flush();       // end of stream → close tags

// Web Streams
import { createSanitizeTransform } from 'stream-safe';
response.body.pipeThrough(new TextDecoderStream()).pipeThrough(createSanitizeTransform(presets.llmChat));

// Node.js Streams
import { createNodeTransform } from 'stream-safe/node';
llmStream.pipe(createNodeTransform(presets.llmChat)).pipe(res);
```

### Options Interface

```typescript
interface SanitizerOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
  stripDisallowed?: boolean;   // true=remove, false=escape
  maxDepth?: number;           // default 50
  maxAttributeLength?: number; // default 2048
  onSafe?: (html: string) => void;
  onDanger?: (tag: string, reason: string) => void;
}
```

### Presets

| Preset | Tags Allowed | Use Case |
|--------|-------------|----------|
| `llmChat` | p, b, i, em, strong, a, code, pre, ul, ol, li, h1-h6, blockquote, br, table, thead, tbody, tr, td, th, img | AI chat interfaces |
| `richText` | All of llmChat + div, span, hr, figure, figcaption, details, summary | CMS/rich editors |
| `textOnly` | None (strips all tags) | Plain text extraction |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    stream-safe                           │
│                                                         │
│  ┌──────────┐   ┌──────────────┐   ┌───────────────┐  │
│  │  Input   │──▶│  Incremental │──▶│   Security    │  │
│  │  Buffer  │   │  Tokenizer   │   │   Filter      │  │
│  └──────────┘   └──────────────┘   └───────────────┘  │
│       ▲                                     │          │
│       │              ┌──────────────┐       │          │
│       │              │  Tag Stack   │       ▼          │
│       │              │  (open tags) │  ┌──────────┐   │
│       └──hold────────┤              │  │  Output  │   │
│        incomplete    └──────────────┘  │  Buffer  │   │
│                                         └──────────┘   │
└─────────────────────────────────────────────────────────┘
```

### State Machine (8 states)

| State | Description | Transition On |
|-------|-------------|---------------|
| `TEXT` | Plain text, emit immediately | `<` → TAG_OPEN |
| `TAG_OPEN` | Saw `<`, determining type | `/` → TAG_CLOSE, `!` → COMMENT, letter → TAG_NAME |
| `TAG_NAME` | Reading tag name | space → IN_ATTRIBUTE, `>` → evaluate tag, `/` → self-close |
| `TAG_CLOSE` | Reading `</tagname>` | `>` → match stack, emit or strip |
| `IN_ATTRIBUTE` | Reading attributes | `>` → evaluate tag, `"` or `'` → ATTR_VALUE |
| `ATTR_VALUE` | Inside quoted attribute value | matching quote → IN_ATTRIBUTE |
| `IN_COMMENT` | Inside `<!-- -->` | `-->` → TEXT |
| `IN_DANGEROUS` | Inside script/style/etc | matching close tag → TEXT |

### Security Checks (filter.ts)

1. **Tag allow-list** — tag name must be in `allowedTags`
2. **Attribute allow-list** — each attribute checked against `allowedAttributes[tag]` and `allowedAttributes['*']`
3. **Event handlers** — any `on*` attribute is ALWAYS stripped
4. **URI scheme** — `href`, `src`, `action` checked against `allowedSchemes`
5. **Dangerous tags** — `script`, `style`, `iframe`, `object`, `embed`, `form` enter strip-all mode
6. **Depth limit** — nested tags beyond `maxDepth` are stripped
7. **Attribute length** — values beyond `maxAttributeLength` are stripped

---

## Project Structure

```
stream-safe/
├── src/
│   ├── index.ts              # Public API re-exports
│   ├── types.ts              # Interfaces and types
│   ├── tokenizer.ts          # Stateful incremental HTML tokenizer
│   ├── filter.ts             # Security allow-list logic
│   ├── sanitizer.ts          # createStreamSanitizer factory
│   ├── presets.ts            # llmChat, richText, textOnly
│   ├── transform.ts          # Web Streams TransformStream
│   └── node.ts               # Node.js Transform stream
├── tests/
│   ├── tokenizer.test.ts     # State machine transitions
│   ├── filter.test.ts        # Allow/block decisions
│   ├── sanitizer.test.ts     # Integration tests
│   ├── xss.test.ts           # 100+ OWASP XSS vectors
│   ├── chunk-split.test.ts   # Vectors split at every byte
│   ├── presets.test.ts       # Preset behavior
│   ├── transform.test.ts     # Stream adapters
│   └── edge-cases.test.ts    # Empty, huge, malformed inputs
├── benchmarks/
│   └── bench.ts              # vs DOMPurify, sanitize-html
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── biome.json
├── .npmignore
├── .github/
│   ├── workflows/ci.yml
│   ├── workflows/release.yml
│   └── FUNDING.yml
├── .changeset/config.json
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
└── PLAN.md (this file)
```

---

## Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | 5.3+ | Source language, strict mode |
| tsup | 8.0+ | Bundle ESM + CJS + .d.ts |
| Vitest | 2.0+ | Tests |
| Biome | 1.5+ | Lint + format |
| @changesets/cli | 2.27+ | Versioning + changelogs |
| Node.js | 20 LTS | Dev runtime |
| GitHub Actions | — | CI/CD + npm publish |

---

## Compatibility

### Runtimes
- Node.js 18+
- Deno 1.0+
- Bun 1.0+
- Cloudflare Workers
- Vercel Edge Runtime
- Browser (Chrome 67+, Firefox 102+, Safari 14.1+, Edge 79+)

### Frameworks (all versions with streaming support)
- React 16.8+, Next.js 13+, Vue 3+, Nuxt 3+, Angular 14+, Svelte 4+, Solid 1+, Astro 2+

### AI SDKs
- Vercel AI SDK 3+, LangChain.js 0.1+, OpenAI SDK 4+, Anthropic SDK 0.9+, Google GenAI 0.1+, Ollama.js 0.5+

---

## Security Threat Model

| Threat | Mitigation |
|--------|-----------|
| `<script>alert(1)</script>` | script in blocked list, stripped entirely |
| `<img onerror=alert(1)>` | on* attributes always stripped |
| `<a href="javascript:...">` | URI scheme allow-list |
| `<div style="url(javascript:)">` | style attribute stripped by default |
| Entity bypass `&#x3C;script&#x3E;` | Decode entities before security check |
| Chunked bypass `<scr` + `ipt>` | Stateful buffer holds incomplete tags |
| mXSS (mutation XSS) | No innerHTML re-parsing |
| SVG/MathML bypass | Disabled by default |
| ReDoS | No regex — char-by-char state machine |
| Depth bomb | Max nesting depth limit |
| Giant attributes | Max attribute length limit |
| Prototype pollution | No object spread from untrusted input |

---

## Implementation Milestones

### Phase 1: Core (Week 1)
- [x] Project scaffold (package.json, tsconfig, build config)
- [x] `types.ts` — all interfaces
- [x] `tokenizer.ts` — state machine (8 states)
- [x] `filter.ts` — tag/attribute/scheme checks
- [x] `sanitizer.ts` — wire tokenizer + filter
- [x] `presets.ts` — 3 presets
- [x] Core tests (tokenizer, filter, sanitizer)
- [x] XSS test suite (100+ vectors)

### Phase 2: Integration (Week 2)
- [x] `transform.ts` — Web Streams adapter
- [x] `node.ts` — Node.js Transform stream
- [x] Chunk-split fuzz tests
- [x] Edge case tests
- [x] Entity handling (decode before check)

### Phase 3: Harden & Ship (Week 3)
- [x] Benchmarks vs DOMPurify and sanitize-html
- [x] Bundle size audit (<3KB gzip target) — 2.87KB gzipped ✓
- [x] README with examples (Vercel AI, LangChain, vanilla)
- [x] CONTRIBUTING.md, SECURITY.md
- [x] GitHub Actions CI/CD
- [x] Publish v0.1.0 to npm

### Phase 4: Adoption (Week 4+)
- [ ] Blog post (Dev.to, Twitter/X, Reddit)
- [ ] PR to Vercel AI SDK docs
- [ ] PR to LangChain.js docs
- [ ] Framework wrappers (React hook, Vue composable)

---

## Published Package Contents

```
node_modules/stream-safe/
├── dist/
│   ├── index.mjs      (~2KB)
│   ├── index.cjs      (~2KB)
│   ├── index.d.ts
│   ├── node.mjs       (~1KB)
│   ├── node.cjs       (~1KB)
│   └── node.d.ts
├── package.json
├── README.md
└── LICENSE
```

- **Install size:** <15KB
- **Runtime (gzipped):** <3KB
- **Dependencies:** 0
- **Peer dependencies:** 0

---

## Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| npm publish | v1.0.0 | Week 3 |
| GitHub stars | 100 | Month 1 |
| Weekly downloads | 1,000 | Month 2 |
| Referenced in AI SDK docs | 1+ | Month 3 |
| Weekly downloads | 100,000+ | Month 6 |
| Weekly downloads | 1,000,000+ | Year 1 (if adopted as transitive dep) |

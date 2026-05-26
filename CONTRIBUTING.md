# Contributing to stream-safe

Thank you for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/stream-safe.git
cd stream-safe
npm install
npm test
```

## Scripts

- `npm test` — Run tests
- `npm run build` — Build the package
- `npm run lint` — Lint the code
- `npm run format` — Format the code

## Adding XSS Vectors

If you find an XSS vector that bypasses stream-safe:

1. Add it to `tests/xss.test.ts`
2. Verify the test fails
3. Fix the tokenizer/filter
4. Verify the test passes
5. Add the vector to `tests/chunk-split.test.ts`
6. Submit a PR

## Code Style

- TypeScript strict mode
- No dependencies
- Format with Biome
- Keep bundle size under 3KB gzipped

## Pull Requests

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `npm test` and `npm run build`
5. Submit a PR with a clear description

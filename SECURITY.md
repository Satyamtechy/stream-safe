# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in stream-safe, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: security@example.com (replace with your actual email)

You will receive a response within 48 hours. We will work with you to understand and address the issue before any public disclosure.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Active  |
| 0.x     | ⚠️ Best effort |

## Security Measures

- All changes are tested against 100+ OWASP XSS vectors
- Every XSS vector is tested split at every byte position
- No use of regex in the parsing hot path (ReDoS immune)
- No DOM dependency (immune to mXSS via innerHTML)
- Fuzz testing on every release

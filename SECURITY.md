# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly using [GitHub's private vulnerability reporting](https://github.com/Fikarn/project-management-dashboard/security/advisories/new).

**Please do not open a public issue for security vulnerabilities.**

You can expect an initial response within 72 hours. Once confirmed, a fix will be prioritized and released as soon as possible.

## Scope

This application is designed for **local-only use** (no authentication, no public network exposure). Security concerns most relevant to this project include:

- Command injection via API inputs
- Path traversal in file operations
- Cross-site scripting (XSS) in the dashboard UI
- Denial of service affecting the DMX/lighting control path
- Unsafe OSC / DMX side effects triggered by malformed local requests
- Supply-chain or release-signing issues affecting packaged desktop builds

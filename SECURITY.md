# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.24.x  | :white_check_mark: |
| < 0.24  | :x:                |

## Reporting a Vulnerability

Please report security vulnerabilities to **Harald Weiss** via one of the following channels:

- **GitHub private vulnerability reporting** (when enabled): Use "Report a vulnerability" under this repository's "Security" tab. Otherwise, use the email address below.
- **Email**: opensource@wolfinisoftware.de

### What to include

- A clear description of the vulnerability
- Steps to reproduce (including any required environment setup)
- The affected component(s) and version(s)
- Potential impact
- Suggested fix or mitigation (if known)

### Response timeline

- **Acknowledgment**: Within 3 business days
- **Initial assessment**: Within 7 business days
- **Fix / patch**: Depends on severity; you will be kept informed of progress

## Security best practices for contributors

- All commits must be signed off (`git commit -s`) per the Developer Certificate of Origin (DCO).
- Do not commit secrets, API keys, or credentials. Use `.env.example` as a template and keep real values out of version control.
- The `.gitignore` already excludes `.DS_Store`, `*.log`, `node_modules/`, `dist/`, `release/`, and Playwright artifacts.
- Dependency updates are managed via Dependabot (see `.github/dependabot.yml`).
- NAS file server endpoints (`/api/health`, `/api/list`, `/api/file`, `/api/search`) are CORS-enabled — review any changes to these endpoints carefully.

## Disclosure policy

We follow coordinated disclosure. Please do not publicly disclose a vulnerability until we have had a reasonable window to investigate and release a fix. Credit will be given upon request.
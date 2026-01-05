# Wiki starter

Use this file as the seed for a GitHub wiki or an internal knowledge base. Each section links back to versioned docs in the repository so you can keep the wiki in sync.

## Quick links
- [Quickstart](./QUICKSTART.md)
- [How-to guides](./HOWTO.md)
- [Electron packaging details](../ELECTRON.md)
- [Contributing](../CONTRIBUTING.md)
- [Architecture and roadmap](../README.md#codebase-overview) and [Guardian best practices](../README.md#2026-guardian-architecture--best-practices-windows)
- [Visual analysis workflow](./HOWTO.md#upload-evidence-for-visual-analysis) and [module inspection](./HOWTO.md#inspect-modules-and-symbols)

## Suggested wiki structure
- **Home**: What Sentinel AI Task Manager does, feature highlights, and links to Quickstart and roadmap.
- **Getting started**: Copy from `docs/QUICKSTART.md`; include environment setup and common commands.
- **How-to recipes**: Import `docs/HOWTO.md` (analysis, visual inspection, module view) and add screenshots for your environment.
- **Architecture**: Summaries of the React/Vite app, Electron host, and native guardian module with links to source files (`App.tsx`, `electron/main.ts`, `native/guardian_agent.cpp`).
- **Operations**: CI workflows (`.github/workflows`), build artifacts, and release checklist (signing, installer distribution).
- **Troubleshooting**: Common node-gyp fixes, API key errors, and Electron packaging tips.
- **Security & privacy**: Guidance on handling API keys, Electron IPC hygiene, and Gemini prompt hardening.

## Keeping the wiki in sync
- When docs change in `main`, copy the relevant sections into the wiki or reference the file directly.
- Prefer linking to repository files so reviewers can track changes alongside code.
- Include screenshots from your environment (process table, charts, AI supervisor responses) to make the wiki more discoverable.

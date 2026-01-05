# Quickstart

Get Sentinel AI Task Manager running in minutes for web and desktop development.

## Prerequisites
- Node.js 20+ (includes npm)
- Python 3 and a C++ build toolchain for the native stub (already present on GitHub-hosted runners; on Windows use the “x64 Native Tools” Developer Command Prompt)
- A Gemini API key from https://aistudio.google.com/app/apikey

## Web (Vite) flow
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and set your API key:
   ```bash
   cp .env.local.example .env.local
   # then add GEMINI_API_KEY=your_key_here
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000 — you should see live mock processes, CPU/memory charts, and the AI supervisor panel. A `MISSING_API_KEY` badge appears if your key is not set.

## Desktop (Electron) flow
1. Start the Vite dev server (`npm run dev`) in one terminal.
2. Launch Electron in another terminal:
   ```bash
   npm run electron:dev
   ```
   The Electron window points to the dev server. The optional native guardian module is built automatically when you run `npm install`; rebuild manually with `npm run native:build` if needed.
3. Package the desktop app (Windows):
   ```bash
   npm run electron:build
   ```
   The installer is emitted to `release/`. This command runs `native:build` and `build` first.

## Production builds
- Web bundle: `npm run build` (outputs to `dist/`)
- Preview the production bundle locally: `npm run preview`

## Troubleshooting
- **node-gyp errors**: Ensure Python 3 and a C++ build toolchain are available. On Linux, install `build-essential`. On Windows, use the “x64 Native Tools” shell.
- **API key missing**: Set `GEMINI_API_KEY` or `API_KEY` in `.env.local`. The UI shows a `MISSING_API_KEY` badge until one is provided.
- **Electron cannot find guardian.node**: Re-run `npm run native:build` to regenerate `build/Release/guardian.node`, then retry the Electron command.

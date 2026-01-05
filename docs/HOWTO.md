# How-to guides

Task-focused steps for day-to-day use and demos.

## Add or rotate your Gemini API key
1. Copy `.env.local.example` to `.env.local` (if you have not already).
2. Open `.env.local` and set `GEMINI_API_KEY=<your key>` (or `API_KEY` if you prefer that name).
3. Restart the dev server or Electron app so the client picks up the new key. The `MISSING_API_KEY` badge disappears once the key is present.

## Trigger AI analysis on a process
1. Start the app (`npm run dev` or `npm run electron:dev`).
2. Click any process row to select it.
3. Open the **AI Supervisor** panel and choose **Analyze** (risk analysis), **Research** (open web), or **Visual inspection** (image review). Results stream into the panel and logs.

## Simulate a new process or file event
1. Click **Run task** in the UI to open the mock launcher.
2. Provide a name, command line, and risk level; click **Launch**.
3. The new process appears in the table/tree and feeds the charts and Gemini analysis inputs.
4. To simulate file activity, open **Browse files**, pick a mock file, and confirm.

## Package or refresh the native guardian stub
- Build (or rebuild) the stubbed guardian module:
  ```bash
  npm run native:build
  ```
- Clean native build artifacts:
  ```bash
  npm run native:clean
  ```
- The compiled module lives at `build/Release/guardian.node` and is picked up by Electron packaging.

## Package the desktop app for Windows
1. Ensure dependencies are installed and the native module builds (`npm install` then `npm run native:build` if needed).
2. Run:
   ```bash
   npm run electron:build
   ```
3. Grab the installer from `release/`. This command also runs the web production build.

## Reset to a clean state
- Stop dev servers, run `npm run native:clean`, and delete any temporary `.env.local` files you no longer need.
- Re-run `npm install` if dependencies change, then follow the Quickstart steps to start fresh.

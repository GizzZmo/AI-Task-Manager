<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/117ia8xhVCkmU99uO1d6RgKqWrlXUjDSY

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Codebase overview

- **Stack**: React + TypeScript via Vite, styled with utility classes. Charts use `recharts`; process analytics call the Gemini API via `@google/genai`.
- **Entry**: `index.tsx` renders `App.tsx`.
- **State + simulation** (`App.tsx`): seeds processes and logs from `constants.ts`, updates CPU/memory history every 2 seconds, and exposes handlers for selecting, terminating, and spawning mock processes (used by `RunTaskModal` and `FileBrowserModal`).
- **Components**:
  - `ProcessTable.tsx`: tabular view with terminate/select actions.
  - `ResourceChart.tsx`: live CPU/memory charts fed by `cpuHistory`/`memHistory`.
  - `ProcessTree.tsx`: parent/child visualization of running processes.
  - `AISupervisor.tsx`: Gemini-backed analysis, research, and visual inspection of selected processes.
  - `RunTaskModal.tsx` / `FileBrowserModal.tsx`: mock launcher and file picker feeding `handleSpawnProcess`.
- **Services**: `services/geminiService.ts` wraps Gemini calls for process analysis, open-web research, and screenshot review. It reads `process.env.API_KEY`; show a `MISSING_API_KEY` badge if unset.
- **Types**: `types.ts` centralizes `ProcessData`, `RiskLevel`, module metadata, and chart point shapes.

## Roadmap: Windows desktop application

1. **Choose shell + package**: Reuse this React UI in an Electron or Tauri host (Tauri for smaller runtime) with a secure preload/IPC layer; keep the existing Vite build for the renderer bundle.
2. **Replace mock telemetry**: Swap `INITIAL_PROCESSES` with live Windows data via PDH/WMI/ETW snapshots (CPU, memory, IO, handles, modules). Add a native module/service to stream updates into the renderer through IPC.
3. **Process control**: Implement trusted host calls for termination, suspend/resume, and spawning with argument validation and privilege checks; surface Win32 error codes in `systemLogs`.
4. **Security enrichment**: Add Authenticode signature checks, reputation lookups, module hashing, and event hooks for driver/service creation. Harden the AI prompt with richer feature vectors and configurable model endpoints.
5. **File system + visuals**: Replace the mock file browser with `showOpenFileDialog` and add screenshot capture of windows/monitors for visual analysis input.
6. **Offline/cache + settings**: Persist user prefs and analysis history locally (SQLite/IndexedDB) and support offline queuing of AI requests with retries when connectivity returns.
7. **Updates + distribution**: Wire an auto-updater, sign the app, and ship MSIX installers; document privacy/telemetry, and add CI to run lint/build plus basic native smoke tests on Windows.

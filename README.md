<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

Sentinel AI Task Manager is an AI-assisted process and resource monitor built with React, Vite, and Electron. It pairs live (or simulated) process telemetry with Gemini-powered analysis to surface risky behavior and remediation guidance.

**Feature highlights**
- Realtime process table, tree, and charts with selectable drill-downs
- Gemini-backed analysis, research, and visual inspection flows
- Mock process/file launcher for exercising the UI without live system hooks
- Native “guardian” module (stub on non-Windows) ready for deeper Windows telemetry

View your app in AI Studio: https://ai.studio/apps/drive/117ia8xhVCkmU99uO1d6RgKqWrlXUjDSY

## Quickstart (5 minutes)

1. `npm install`
2. `cp .env.local.example .env.local` and set `GEMINI_API_KEY` (or `API_KEY`)
3. `npm run dev` then open http://localhost:3000
4. Optional: in another terminal run `npm run electron:dev` to open the desktop shell
5. Need a packaged build? Run `npm run electron:build` (includes `native:build` + `build`)

See [docs/QUICKSTART.md](docs/QUICKSTART.md) for a fuller, step-by-step guide.

## Documentation & wiki

- Quickstart: [docs/QUICKSTART.md](docs/QUICKSTART.md)
- How-to recipes: [docs/HOWTO.md](docs/HOWTO.md)
- Electron packaging: [ELECTRON.md](ELECTRON.md)
- Contributing and workflows: [CONTRIBUTING.md](CONTRIBUTING.md)
- Wiki seed: [docs/WIKI.md](docs/WIKI.md) — copy these docs into a GitHub wiki or use them as a knowledge base

## Run Locally

**Prerequisites**
- Node.js 20+ (includes npm)
- Build tools for native modules (Python + C++ toolchain; on Windows use “x64 Native Tools” Developer Command Prompt)

1. Install dependencies:
   `npm install`
2. Create a `.env.local` file by copying the example:
   `cp .env.local.example .env.local`
3. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (get one from https://aistudio.google.com/app/apikey)
4. Build the lightweight native stub (ensures node-gyp works before Electron packaging):
   `npm run native:build`
5. Run the app:
   `npm run dev`

## Run as Desktop Application (Electron - In Progress)

The project now includes initial Electron scaffolding for Windows desktop packaging:

1. **Development mode**: Run the Vite dev server, then in a separate terminal:
   ```bash
   npm run electron:dev
   ```
   This launches the Electron window pointing to `http://localhost:3000`.
   - Optional native guardian module (Windows): `npm run native:build` builds `build/Release/guardian.node` for the IPC bridge.

2. **Build desktop app**: 
   ```bash
   npm run electron:build
   ```
   Produces a distributable Windows installer in `release/`.

**Status**: Basic Electron wrapper is functional. Next steps per roadmap:
- Replace mock process telemetry with live Windows APIs (PDH/WMI/ETW)
- Implement secure IPC for process control (terminate, suspend, spawn)
- Add native file dialogs and screenshot capture
- Integrate C++ guardian agent via child process or native module

## Environment variables

- `GEMINI_API_KEY` (required for Gemini-powered analysis)
- `API_KEY` (fallback name read by `services/geminiService.ts`)
- `.env.local` is gitignored; copy from `.env.local.example` and set the key you use

## Available npm scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production web build (Vite)
- `npm run native:build` — compile the guardian native module/stub via node-gyp
- `npm run native:clean` — remove native build artifacts
- `npm run electron:dev` — launch Electron in development against the dev server
- `npm run electron:build` — package the desktop app (runs `native:build` + `build`)

## How-to recipes (quick reference)

- **Run Gemini analysis**: Select a process row → open **AI Supervisor** → pick **Analyze**, **Research**, or **Visual inspection**. Configure `GEMINI_API_KEY` first.
- **Simulate a new process**: Click **Run task**, enter a name/command/risk, and launch. The entry flows into the table, tree, charts, and AI prompts.
- **Refresh the guardian stub or package desktop**: `npm run native:build` to rebuild the native module; `npm run electron:build` to produce an installer in `release/`.

See [docs/HOWTO.md](docs/HOWTO.md) for step-by-step guides and more recipes.

## CI/CD automation

GitHub Actions keep builds reproducible:

- `.github/workflows/ci.yml` (advanced build matrix) installs dependencies with cache, compiles the native guardian module, runs `npm run build`, and publishes build artifacts for Ubuntu and Windows runners.
- `.github/workflows/build-guardian.yml` (Windows guardian) produces the standalone `guardian.exe` and optional PDB symbols for deeper Windows security testing.

Artifacts from CI runs include `dist/` for the web bundle and `build/Release` for the guardian module, making it easy to pick up a clean build without running the toolchain locally.

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

1. ✅ **Choose shell + package**: Basic Electron integration implemented with secure preload/IPC layer. The React UI now runs in an Electron host while keeping the existing Vite build for the renderer bundle. Next: Consider Tauri for smaller runtime footprint.
2. **Replace mock telemetry**: Swap `INITIAL_PROCESSES` with live Windows data via PDH/WMI/ETW snapshots (CPU, memory, IO, handles, modules). Add a native module/service to stream updates into the renderer through IPC.
3. **Process control**: Implement trusted host calls for termination, suspend/resume, and spawning with argument validation and privilege checks; surface Win32 error codes in `systemLogs`.
4. **Security enrichment**: Add Authenticode signature checks, reputation lookups, module hashing, and event hooks for driver/service creation. Harden the AI prompt with richer feature vectors and configurable model endpoints.
5. **File system + visuals**: Replace the mock file browser with `showOpenFileDialog` and add screenshot capture of windows/monitors for visual analysis input.
6. **Offline/cache + settings**: Persist user prefs and analysis history locally (SQLite/IndexedDB) and support offline queuing of AI requests with retries when connectivity returns.
7. **Updates + distribution**: Wire an auto-updater, sign the app, and ship MSIX installers; document privacy/telemetry, and add CI to run lint/build plus basic native smoke tests on Windows.

## 2026 "Guardian" architecture & best practices (Windows)

**Paradigm shift**
- Move from post-mortem views to proactive detection: watch pre-spike signals (rapid thread churn + I/O bursts) and pre-emptively throttle/alert.
- Default to edge AI for privacy: keep models local via ONNX Runtime/WinML with DirectML so air-gapped and “high-security” modes never ship telemetry to the cloud.
- Prefer event-driven observability: favor ETW/eBPF for Windows over polling (PSAPI/PDH) to lower overhead and catch anomalies instantly.

**Layered architecture**
- **Data layer (“senses”)**: ETW/eBPF probes with legacy Toolhelp32 fallbacks; capture IRP latency, soft vs. hard faults, handle counts, and lineage for tree views.
- **Intelligence layer (“brain”)**: Isolation Forest (ONNX) execution runs on the NPU via the DML execution provider. Feature vectors should cover entropy, signer reputation, parent-child lineage, module hashes, and Virtual Address Descriptor (VAD) clues for process hollowing.
- **Interface layer (“nervous system”)**: WinUI 3/Tauri renderer with dirty-rect rendering and GPU budget <0.5%; keep the React/Vite bundle for the webview and pipe IPC events from the host.

**Actionable implementation hints**
- eBPF for Windows (still maturing): attach to Windows Filtering Platform (WFP) hooks (e.g., outbound connection classification) to flag Command and Control (C2) ranges before sockets are fully established, and fall back to ETW/WFP callouts where eBPF coverage is limited.
- Golden Image baselines: store per-profile embeddings (e.g., Video Editor vs. Banker) and use deviation scores instead of static CPU thresholds.
- RAII for stability: wrap Win32 handles in `UniqueHandle` with a `HandleDeleter` to prevent leaks when sampling processes or modules.

```cpp
struct HandleDeleter { void operator()(HANDLE h) { if (h && h != INVALID_HANDLE_VALUE) CloseHandle(h); } };
using UniqueHandle = std::unique_ptr<std::remove_pointer_t<HANDLE>, HandleDeleter>;
```
- Entropy + lineage: compute segment entropy and terminate suspicious trees (e.g., explorer → cmd → powershell with high-entropy pages).
- Offline-first: queue Gemini/AI requests and replay when connectivity returns; cache signatures, hashes, and prior analysis locally.

## Native Windows guardian (C++)

- A minimal Windows guardian loop now lives in `native/guardian_agent.cpp`. It samples live processes with RAII-wrapped handles, computes entropy, checks Authenticode signatures, walks loaded modules, and applies a risk heuristic (ready to swap for ONNX/WinML when available).
- Build from a Visual Studio x64 Developer Prompt:  
  `cl /std:c++20 /EHsc native\\guardian_agent.cpp /link /guard:cf /debug:full /out:guardian.exe /nologo wintrust.lib crypt32.lib psapi.lib`
- Run once for a single snapshot (`guardian.exe --once`) or without flags to stream detections. Wire its alerts into this React UI via IPC when hosting in Electron/Tauri per the roadmap above.

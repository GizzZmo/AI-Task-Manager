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
2. Create a `.env.local` file by copying the example:
   `cp .env.local.example .env.local`
3. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (get one from https://aistudio.google.com/app/apikey)
4. Run the app:
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

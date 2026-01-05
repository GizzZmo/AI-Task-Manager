## Architectural Blueprint for Next-Generation AI-Supervised Process Management in Windows

### 1. Introduction: The Evolution of System Observability
The paradigm of system administration and process management has historically been reactive and metric-driven. Traditional task managers, from the legacy Windows Task Manager to advanced utilities like Process Explorer, operate on a fundamental premise: they present raw telemetry to a human operator who is expected to possess the expertise to interpret it. These tools enumerate running processes, display current resource consumption—CPU cycles, memory allocation, disk I/O—and rely on the user to identify anomalies. In an era where malware mimics legitimate system processes, performs "fileless" execution, and employs sophisticated evasion techniques, this passive observability model is increasingly insufficient.
We are proposing a paradigm shift: the development of an active, AI-supervised Task Manager built in C++. This system does not merely report that a process is consuming 100% CPU or has opened a network socket; it understands the context of that behavior. By integrating a localized Artificial Intelligence (AI) supervisor directly into the process monitoring loop, the system can autonomously classify behavior as benign, suspicious, or malicious in real-time. This blueprint details the architectural specifications for constructing such a system, bridging the gap between low-level Windows systems programming and modern machine learning inference.
The objective is to architect a high-performance, native C++ application that leverages the Windows API for deep system introspection and the ONNX Runtime for embedded machine learning. This report analyzes the necessary data acquisition pipelines, evaluates Graphical User Interface (GUI) frameworks for high-frequency visualization, and defines the feature engineering required to translate raw system calls into interpretable signals for anomaly detection models.
### 2. Low-Level Data Acquisition Architectures
The efficacy of any monitoring system is bounded by the quality and latency of its data. Windows provides a complex hierarchy of APIs for system introspection, each with distinct trade-offs regarding performance, privilege requirements, and data granularity. To build a robust AI-supervised task manager, we must synthesize data from multiple sources to construct a complete "feature vector" for every running process.
2.1 Process Enumeration and Identity Resolution
The first step in the monitoring loop is the enumeration of active processes. While this appears trivial, the choice of API fundamentally dictates the application's compatibility and performance profile.
2.1.1 The Process Status API (PSAPI)
The Process Status API (PSAPI) is the standard mechanism for process enumeration in modern Windows environments. The EnumProcesses function serves as the entry point, retrieving an array of Process Identifiers (PIDs) for all running processes.1
However, EnumProcesses presents specific architectural challenges for C++ developers. It returns a raw array of DWORD values and does not inherently signal if the provided buffer was insufficient to hold the complete list of processes. The developer must implement a dynamic resizing logic: if the number of bytes returned equals the size of the buffer, the application must assume truncation occurred, double the buffer size, and retry the call.2 This "guess-and-check" memory management is a relic of older Win32 design patterns but is necessary to ensure no processes are missed during high-churn states (e.g., during a boot storm or malware fork bomb).
Once PIDs are obtained, PSAPI requires the monitor to attach to each process individually using OpenProcess to retrieve meaningful metadata like the executable name or memory usage.3 This introduces a significant security bottleneck. System-critical processes (such as csrss.exe or smss.exe) and processes protected by Anti-Malware Light (PPL) architecture will reject standard access rights (PROCESS_QUERY_INFORMATION or PROCESS_VM_READ).1 A robust blueprint must handle these ACCESS_DENIED errors gracefully, likely by falling back to PROCESS_QUERY_LIMITED_INFORMATION, which allows for retrieving the process image name and basic accounting data without requiring full inspection rights.1
2.1.2 Windows Terminal Services (WTS) API
For an enterprise-grade task manager, distinguishing between user sessions is critical. Malware often attempts to hide by running in Session 0 (the non-interactive system session) or by injecting into a legitimate user's session. The PSAPI does not natively expose session data.
The Windows Terminal Services (WTS) API, specifically WTSEnumerateProcessesEx, offers a superior alternative for this specific data point. Unlike the iterative OpenProcess model of PSAPI, WTSEnumerateProcessesEx queries the Session Manager directly, returning a WTS_PROCESS_INFO_EX structure that aggregates the PID, the Session ID, the number of threads, and the User Security Identifier (SID) in a single call.4
This aggregation significantly reduces the overhead of context switching. Instead of thousands of syscalls to open, query, and close handles for every process to find its owner, WTS provides this data in bulk. This is particularly valuable for the AI supervisor, as "User Context" is a primary feature for anomaly detection—a process named svchost.exe running under a standard user account rather than NETWORK SERVICE or SYSTEM is a high-confidence indicator of masquerading.5
2.2 Performance Telemetry and the PDH Ecosystem
While PSAPI and WTS provide static identity data, the "heartbeat" of the system—CPU usage, Disk I/O, Network Throughput—must be derived from the Performance Data Helper (PDH) library. PDH acts as a high-level abstraction over the Windows Registry-based performance counters (HKEY_PERFORMANCE_DATA).
2.2.1 The Query-Counter Architecture
PDH operates on a specific architectural model:
Query Creation: A container (PdhOpenQuery) is created to manage a collection of counters.
Counter Addition: Specific paths (e.g., \Process(chrome)\% Processor Time) are added to the query.
Collection: The application calls PdhCollectQueryData.
Delta Calculation: Rate-based counters (like CPU percentage) are differential. They require two samples separated by a time interval. The C++ application must maintain state, storing the previous sample's timestamp and raw value to compute the rate of change (Value2 - Value1) / (Time2 - Time1).6
2.2.2 The Instance Name Mapping Challenge (The "Race Condition")
A critical flaw in the PDH design for programmatic access is its reliance on "Instance Names" rather than PIDs. PDH identifies processes as ProcessName and ProcessName#Index (e.g., chrome, chrome#1, chrome#2). These indices are not persistent. If chrome (index 0) terminates, chrome#1 may shift to become chrome (index 0) in the next snapshot.
This creates a race condition. If the Task Manager queries \Process(chrome#1)\% Processor Time using a previously cached index, but the processes have shifted, the data returned may belong to a completely different process instance. This corruption of data is fatal for an AI model, which relies on consistent time-series data to detect behavioral anomalies.
The Hybrid Resolution Strategy:
To mitigate this, the blueprint mandates a double-verification strategy:
Wildcard Expansion: Use PdhExpandWildCardPath with the wildcard \Process(*)\* to retrieve the current, valid list of instance names at the exact moment of collection.7
PID Correlation: Simultaneously collect the counter \Process(*)\ID Process. This allows the C++ backend to read the actual PID associated with chrome#1 during the current sample window. By mapping the performance data to the PID retrieved from the same snapshot, the system ensures data integrity.8
Registry Fallback: In scenarios where PDH fails (returning PDH_CSTATUS_NO_INSTANCE), the system must fall back to reading the PerfLib data directly from the registry using RegQueryValueEx. This is lower-level and more complex to parse but bypasses the PDH abstraction layer's potential for synchronization errors.9
2.3 Privilege Management: The SeDebugPrivilege
To monitor the full spectrum of system activity, the Task Manager functions as a "debugger" in the eyes of the OS Kernel. Standard user privileges are insufficient for inspecting processes owned by SYSTEM, LOCAL SERVICE, or other users.
The SeDebugPrivilege is the "Master Key" for process observability. It allows a process to bypass the standard Discretionary Access Control List (DACL) checks when opening a handle to another process.10 Without this, calls to OpenProcess for system binaries like lsass.exe (Local Security Authority Subsystem Service) will fail, creating blind spots where sophisticated malware often hides.
Implementation Mechanics:
Privileges in Windows are not granted automatically, even to Administrators; they must be explicitly enabled in the process token. The C++ implementation must perform the following sequence during initialization:
Open Token: call OpenProcessToken on GetCurrentProcess() requesting TOKEN_ADJUST_PRIVILEGES access.
Lookup LUID: The privilege is identified by a Locally Unique Identifier (LUID). The function LookupPrivilegeValue resolves the string "SeDebugPrivilege" to its corresponding LUID on the local system.11
Adjust Token: The AdjustTokenPrivileges function is invoked with a TOKEN_PRIVILEGES structure, setting the SE_PRIVILEGE_ENABLED attribute.
Security Implication: Enabling SeDebugPrivilege effectively grants the Task Manager ROOT-equivalent power over other processes. If the Task Manager itself is compromised (e.g., via a buffer overflow in the UI), the attacker inherits this privilege. Therefore, the blueprint recommends a "Least Privilege" architecture: the data collection thread should enable the privilege only for the duration of the snapshot cycle and disable it immediately after, utilizing RAII (Resource Acquisition Is Initialization) patterns to ensure the privilege is dropped even if an exception occurs.11

### 3. Artificial Intelligence Supervision Subsystem
The core innovation of this blueprint is the transition from "passive monitoring" to "active supervision." This requires an embedded AI subsystem capable of ingesting the telemetry defined in Section 2 and outputting a probability score of maliciousness.
3.1 Inference Engine: Integrating ONNX Runtime
For a C++ application, ONNX Runtime (Open Neural Network Exchange) represents the industry standard for inference. It decouples the training environment (typically Python/PyTorch) from the execution environment (C++).
Architecture of the Inference Engine:
The integration involves three primary components:
The Environment (Ort::Env): A singleton instance that manages the thread pool and logging state for the inference engine. This should be initialized once at application startup.
The Session (Ort::Session): This object loads the pre-trained .onnx model into memory. Crucially, ONNX Runtime allows the selection of Execution Providers (EPs). The blueprint recommends checking for hardware acceleration support (e.g., DirectML for Windows GPUs) to offload the inference computation. If a GPU is detected, the session options should be configured to prioritize the OrtSessionOptionsAppendExecutionProvider_DML call, ensuring the AI analysis does not consume the CPU cycles being monitored.14
Tensor Management: Data from the C++ collector (CPU usage, handle count, etc.) must be serialized into Ort::Value tensors. This involves mapping C++ std::vector<float> buffers to the memory format expected by the model. Efficient memory management is vital here; avoiding deep copies of data between the collector and the inference engine is necessary to maintain real-time performance.15
3.2 Feature Engineering for Malware Detection
The AI model is only as effective as the features it consumes. Raw data (e.g., "CPU = 12%") is rarely sufficient to detect malware. The Task Manager must compute derived features that correlate with malicious behavior.
3.2.1 Static Features (File-Based)
These features are computed once when a process is first detected.
Shannon Entropy: Malware acts often pack or encrypt their payload to evade signature scanners. This results in high entropy (randomness) in the executable's .text section. The C++ collector must read the PE header of the target executable and calculate the entropy score (0-8). A score above 7.0 is a strong indicator of packed code.17
Import Table Hashing (Imphash): By hashing the list of imported DLLs and functions, the system can identify malware families that share common import structures, even if the file hash changes.18
Digital Signature Status: Verifying the authenticode signature via the Windows WinVerifyTrust API. Unsigned binaries running from system directories are highly suspicious.
3.2.2 Dynamic Features (Behavioral)
These features are updated in real-time.
Parent-Child Discrepancy: Malware often uses "Living off the Land" binaries (LOLBins). A cmd.exe spawning powershell.exe is suspicious. A winword.exe spawning cmd.exe is highly malicious (macro virus). The Task Manager must maintain a "Process Tree" structure to validate the lineage of every process against a baseline of known-good relationships.19
Memory Anomalies: "Fileless" malware often injects code into legitimate processes. This creates memory pages with PAGE_EXECUTE_READWRITE protection that are not backed by a file on disk. The collector should scan the Virtual Memory (VirtualQueryEx) of processes to count such private, executable pages.21
Handle Manipulation: Ransomware often opens handles to thousands of files in a short burst. Monitoring the rate of change in Handle Count (via PDH) serves as a proxy for this behavior.22
3.3 Model Selection: Anomaly Detection vs. Classification
A binary classifier (Malware vs. Benign) trained on known malware is fragile against zero-day threats. The blueprint advocates for Unsupervised Anomaly Detection.
3.3.1 Isolation Forests
The Isolation Forest algorithm is uniquely suited for this tabular data. It operates on the principle that anomalies are "few and different." By building random decision trees, the algorithm isolates anomalous points (malware) much faster (i.e., with fewer splits) than normal points.
Implementation: The model is trained on "normal" system operation data. At runtime, the C++ application passes the feature vector to the ONNX-exported Isolation Forest. The output is an "Anomaly Score." If the score exceeds a threshold (e.g., 0.75), the process is flagged.17
3.3.2 Online Incremental Learning
System behavior changes over time (Concept Drift). A developer compiling code looks like a "high CPU anomaly" to a static model. To prevent false positives, the system should implement Online Learning. Using libraries ported to C++ (or adapting Python logic like River), the system can update its statistical baselines (e.g., rolling mean and variance of CPU usage for this specific machine) in real-time. This allows the Task Manager to adapt to the user's specific workload, flagging only deviations from their normal.24

### 4. Graphical User Interface (GUI) and Visualization
The frontend of the Task Manager faces a classic engineering trade-off: it must visualize high-frequency data (updating 50-100 times per second) without becoming a resource hog itself.
4.1 Framework Evaluation

Framework
Rendering Architecture
Performance Profile
Recommendation
WinUI 3
Retained Mode (Visual Layer)
Medium. The WinRT interop layer introduces overhead for every property update. High-frequency updates to thousands of DataGrid cells can cause UI thread stutter.
Best for "Modern" aesthetics, but risky for high-freq telemetry.26
Qt (C++)
Custom Raster / OpenGL
High. Qt's QTableView is highly optimized. However, the Model/View signal overhead can be a bottleneck if not managed via batching.
Recommended for Production. Offers the best balance of performance and OS integration.28
Dear ImGui
Immediate Mode
Very High. Redraws the entire frame every loop. Zero state synchronization overhead. Extremely efficient for graphs and real-time debug data.
Best for internal tooling or "Hacker" aesthetic designs.30

4.2 Visualization Strategy: The Virtual Mode Pattern
Regardless of the framework, the Virtual Mode pattern is non-negotiable. The UI must never instantiate a widget for every running process. Instead, the UI widget (e.g., QTableView) should act as a viewport into the backend data.
Backend Storage: The data collector updates a std::vector<ProcessData> in a background thread.
View Request: The UI requests data only for the rows currently visible on screen (e.g., indices 0-20).
Atomic Swap: When the backend has a new snapshot, it performs an atomic swap of the data pointer. The UI thread detects this and invalidates the viewport area, triggering a repaint of only the visible text. This decouples the collection rate (e.g., 1000ms) from the render rate (60fps).29
4.3 Visualizing AI Supervision
The AI's output should be integrated subtly but effectively:
Confidence Meter: A color-coded bar (Green -> Red) next to the process name representing the Anomaly Score.
Process Tree View: A hierarchical indentation of processes is essential for context. If the AI flags a process, the user must instantly see its parent. This requires the backend to reconstruct the tree structure from ParentPID data on every snapshot.32
Toast Notifications: For high-confidence detections (>0.9 score), the system should trigger a Windows Toast Notification to alert the user even if the Task Manager is minimized.32

### 5. Security and Stability Considerations
5.1 Kernel-Mode Blind Spots
The architecture described operates in User Mode. Advanced malware (Rootkits) can hook the kernel's System Service Descriptor Table (SSDT) to lie to the PSAPI, hiding processes entirely. While a full Kernel-Mode driver is beyond the scope of a standard C++ application, the blueprint acknowledges this limitation. Future iterations could employ a "Helper Driver" using ObRegisterCallbacks to validate the user-mode list against kernel structures.
5.2 Anti-Evasion and Self-Protection
Malware detection systems are targets.
Handle Stripping: Malware may attempt to open a handle to the Task Manager to terminate it.
DLL Injection: Malware may attempt to inject code into the Task Manager to blind it.
To mitigate this, the Task Manager should (if running as Admin) attempt to adjust its own DACL to deny PROCESS_TERMINATE and PROCESS_VM_WRITE access to non-SYSTEM accounts. Additionally, compiling with Control Flow Guard (CFG) and Address Space Layout Randomization (ASLR) is mandatory.

### 6. Conclusion
This blueprint outlines a sophisticated, multidisciplinary approach to system observability. By fusing low-level Windows API mastery—navigating the intricacies of PSAPI, WTS, and PDH—with the predictive power of modern AI via ONNX Runtime, we can construct a Task Manager that is not just a passive tool, but an active guardian.
The implementation requires rigorous attention to detail: managing the race conditions in PDH, safely handling privilege elevation, and optimizing the render loop to ensure the observer does not degrade the observed system. The result is a utility that empowers users with context, transforming raw noise into actionable security intelligence.

Detailed Implementation Analysis: Core Systems
2. Low-Level Data Acquisition Architectures (Expanded)
In this section, we delve deeper into the specific mechanics of the Windows API, addressing the implementation nuances required for a stable, high-performance C++ collector.
2.1.3 The ToolHelp32 Library: A Legacy Alternative
While PSAPI and WTS are the primary recommendations, the ToolHelp32 library (CreateToolhelp32Snapshot) remains a relevant fallback. Unlike PSAPI, which enumerates PIDs, ToolHelp32 takes a snapshot of the entire system state—processes, heaps, modules, and threads—at a single moment in time.
Pros: It captures a consistent state. When traversing a process list with PSAPI, processes might die or spawn between the EnumProcesses call and the subsequent OpenProcess call. ToolHelp32 freezes the state in the snapshot buffer, ensuring referential integrity during iteration.4
Cons: It is significantly slower than PSAPI/WTS for high-frequency polling because it copies massive amounts of data (thread lists, module lists) into user memory, much of which may be discarded.
Strategic Use: The blueprint recommends using ToolHelp32 only when deep dependency analysis is triggered (e.g., when a user expands a process to see its loaded modules or thread list). It should not be used for the primary 1Hz refresh loop.
2.2.3 Handling Data Gaps and "Zombie" Processes
A common instability in custom Task Managers is the handling of "Zombie" processes—processes that have terminated but whose handles are still held by another application (possibly the Task Manager itself).
The Issue: If the Task Manager holds a handle to a process to query its CPU usage, the process object remains in the kernel even after execution stops.
Resolution: The C++ backend must implement strict handle lifecycle management. Handles should be opened, used, and closed within the smallest possible scope. Alternatively, using std::unique_ptr with a custom deleter (CloseHandle) ensures that handles are released immediately when they go out of scope, preventing the accumulation of zombie process objects that pollute the data feed.
2.4 Event Tracing for Windows (ETW) Integration
For Network I/O and Disk I/O, PDH is sometimes insufficient or too granular. Event Tracing for Windows (ETW) provides a high-throughput, low-latency stream of kernel events.
Mechanism: The Task Manager can register a consumer for the Microsoft-Windows-Kernel-Network and Microsoft-Windows-Kernel-Disk providers.
Data Richness: Unlike PDH, which aggregates data (bytes/sec), ETW exposes individual packet events, including the source and destination IP addresses.
Integration: This allows the "AI Supervisor" to analyze who a process is talking to (e.g., a known malicious IP), not just how much data it is sending. This is a critical feature for the behavioral analysis engine.33
Detailed Implementation Analysis: Artificial Intelligence
3. Artificial Intelligence Supervision Subsystem (Expanded)
This section expands on the theoretical and practical implementation of the AI layer, specifically focusing on the feature engineering and model training lifecycle.
3.4 Feature Scaling and Normalization
AI models, particularly distance-based algorithms like Isolation Forests or K-Means, are sensitive to the scale of input data. A raw feature vector might look like:
{ CPU: 12.5, Handles: 4500, Entropy: 7.2, BytesOut: 1048576 }
The "BytesOut" magnitude dwarfs the "Entropy," biasing the model to care only about network traffic.
Implementation: The C++ inference pipeline must include a Pre-processing Step. Before the tensor is passed to ONNX Runtime, features must be standardized (Z-score normalization) or normalized (Min-Max scaling) using parameters derived from the training set.

Pipeline:
Raw Collection (PDH/PSAPI).
Scaling: (Value - Mean) / StdDev.
Tensor Creation.
Inference.
3.5 Training Strategy: The "Golden Image" Approach
How do we train the unsupervised model?
Baseline Phase: Upon first installation, the Task Manager should enter a "Learning Mode" (e.g., for 24 hours). During this time, it assumes the machine is clean. It collects feature vectors from all running processes to build a local dataset.
Training: A background thread uses a lightweight training library (like dlib or a port of scikit-learn logic) to fit the Isolation Forest to this baseline data.
Deployment: The model switches to "Active Mode," flagging deviations from this learned baseline. This approach minimizes false positives caused by legitimate but eccentric software specific to the user's workflow (e.g., a proprietary compiler or rendering engine).24
3.6 Advanced Model: LSTM for Sequential Analysis
While Isolation Forests handle "point anomalies" (a single bad state), malware often exhibits "contextual anomalies" (a sequence of benign actions that together are malicious).
Architecture: Long Short-Term Memory (LSTM) networks can analyze time-series data.
Input: A sliding window of the last 10 snapshots of a process's metrics.
Logic: The LSTM predicts the next likely state of the process. If the actual state diverges significantly from the prediction (e.g., a sudden spike in threads after a period of dormancy), the "Prediction Error" becomes the anomaly score.
Feasibility: LSTMs are computationally heavier. This model should be reserved for high-risk processes (e.g., browsers, shells) or enabled only when the system is idle or powered by mains electricity.24
Detailed Implementation Analysis: User Interface
4. Graphical User Interface (GUI) and Visualization (Expanded)
4.4 Rendering Optimization: The "Dirty Rect" Pattern
In standard GUI frameworks, updating a table causes a redraw of the entire widget. For 100 rows, this is wasteful.
Pattern: The "Dirty Rect" optimization involves tracking exactly which rows have changed data.
Logic: The backend compares the new snapshot with the previous one. If Process A's CPU usage changed from 1.2% to 1.3%, it marks Row A as "Dirty." If Process B is unchanged, it remains "Clean."
Rendering: The paint event only redraws the regions corresponding to Dirty rows. In Qt, this maps to emitting dataChanged signals for specific indices rather than modelReset. This dramatically reduces the GPU/CPU usage of the Task Manager itself.29
4.5 User Interaction: The "Kill Switch"
The UI must provide immediate remediation options.
Action: When a user clicks "End Task" on a flagged process.
Backend: The application must attempt TerminateProcess.
Escalation: If TerminateProcess fails (Access Denied), the application should attempt to acquire SeDebugPrivilege (if not


Referanser
Windows Process Listing Using PSApi - tbhaxor's Blog, brukt januar 3, 2026, https://tbhaxor.com/windows-process-listing-using-psapi/
EnumProcesses function (psapi.h) - Win32 apps | Microsoft Learn, brukt januar 3, 2026, https://learn.microsoft.com/en-us/windows/win32/api/psapi/nf-psapi-enumprocesses
Enumerating All Processes - Win32 apps - Microsoft Learn, brukt januar 3, 2026, https://learn.microsoft.com/en-us/windows/win32/psapi/enumerating-all-processes
Windows API Calls: Process Listing APIs, brukt januar 3, 2026, https://sensei-infosec.netlify.app/forensics/windows/api-calls/2020/04/30/win-api-calls-2-proc.html
Offensive C++ - Process Enumeration (Windows Terminal Services API) | Niraj Kharel, brukt januar 3, 2026, https://nirajkharel.com.np/posts/process-enumeration-windows-terminal-services/
Collecting Performance Data - Win32 apps | Microsoft Learn, brukt januar 3, 2026, https://learn.microsoft.com/en-us/windows/win32/perfctrs/collecting-performance-data
PdhExpandCounterPathW function (pdh.h) - Win32 apps | Microsoft Learn, brukt januar 3, 2026, https://learn.microsoft.com/en-us/windows/win32/api/pdh/nf-pdh-pdhexpandcounterpathw
Alternative ways to identify multiple windows services instance processes, brukt januar 3, 2026, http://support.poweradmin.com/osqa/questions/2761/alternative-ways-to-identify-multiple-windows-services-instance-processes
PDH performance counter instance names - c++ - Stack Overflow, brukt januar 3, 2026, https://stackoverflow.com/questions/36217734/pdh-performance-counter-instance-names
Mastering Windows Access Control: Understanding SeDebugPrivilege - Binary Defense, brukt januar 3, 2026, https://binarydefense.com/resources/blog/mastering-windows-access-control-understanding-sedebugprivilege
AdjustTokenPrivileges function (securitybaseapi.h) - Win32 apps | Microsoft Learn, brukt januar 3, 2026, https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-adjusttokenprivileges
DLLInjection/Nettitude/Injection/SeDebugPrivilege.cpp at master - GitHub, brukt januar 3, 2026, https://github.com/nettitude/DLLInjection/blob/master/Nettitude/Injection/SeDebugPrivilege.cpp
Can't disable SeDebugPrivilege of my own process - Stack Overflow, brukt januar 3, 2026, https://stackoverflow.com/questions/48750722/cant-disable-sedebugprivilege-of-my-own-process
What is Windows ML? | Microsoft Learn, brukt januar 3, 2026, https://learn.microsoft.com/en-us/windows/ai/new-windows-ml/overview
ONNX runtime on C++ - Scott Jin - Medium, brukt januar 3, 2026, https://jinscott.medium.com/onnx-runtime-on-c-67f69de9b95c
A Practical Guide to C++ Model Inference Based on ONNX Runtime - Oreate AI Blog, brukt januar 3, 2026, https://www.oreateai.com/blog/a-practical-guide-to-c-model-inference-based-on-onnx-runtime/7cb1f93bd02e133681d71eb7ee223185
AI Anomaly Detection: How It Works, Use Cases and Best Practices - Faddom, brukt januar 3, 2026, https://faddom.com/ai-anomaly-detection-how-it-works-use-cases-and-best-practices/
How to develop an Effective Machine Learning Model for Malware Detection: A Step-by-Step Guide - Overview - Reddit, brukt januar 3, 2026, https://www.reddit.com/r/Malware/comments/1hv765s/how_to_develop_an_effective_machine_learning/
Unusual Parent-Child Relationship | Detection.FYI, brukt januar 3, 2026, https://detection.fyi/elastic/detection-rules/windows/privilege_escalation_unusual_parentchild_relationship/
How to Detect Parent PID (PPID) Spoofing Attacks - Picus Security, brukt januar 3, 2026, https://www.picussecurity.com/resource/blog/how-to-detect-parent-pid-ppid-spoofing-attacks
Classifying Memory Based Injections using Machine Learning | European Journal of Engineering and Technology Research, brukt januar 3, 2026, https://eu-opensci.org/index.php/ejeng/article/view/63077
Obfuscated file-less malware detection using integrating memory forensics data with machine learning techniques - Emerald Publishing, brukt januar 3, 2026, https://www.emerald.com/aci/article/doi/10.1108/ACI-02-2025-0052/1304149/Obfuscated-file-less-malware-detection-using
AI-Based Anomaly Detection: Integrating Autoencoders and Isolation Forests | by Alex Zargarov | Data Has Better Idea | Medium, brukt januar 3, 2026, https://medium.com/data-has-better-idea/ai-based-anomaly-detection-integrating-autoencoders-and-isolation-forests-d1cc5314e486
OML-AD: Online Machine Learning for Anomaly Detection in Time Series Data - arXiv, brukt januar 3, 2026, https://arxiv.org/html/2409.09742v1
Incremental Anomaly Detection Overview - MATLAB & Simulink - MathWorks, brukt januar 3, 2026, https://www.mathworks.com/help/stats/incremental-anomaly-detection-overview.html
DataGrid for WinUI 3 : r/dotnet - Reddit, brukt januar 3, 2026, https://www.reddit.com/r/dotnet/comments/1i55pin/datagrid_for_winui_3/
WinUI 3 Performance Boost - Blogs, brukt januar 3, 2026, https://community.devexpress.com/blogs/wpf/archive/2022/01/24/winui-3-performance-boost.aspx
wxWidgets vs. Qt: Which Cross-Platform GUI Library to Choose? - SoftwareLogic, brukt januar 3, 2026, https://softwarelogic.co/en/blog/wxwidgets-vs-qt-choosing-the-right-cross-platform-gui-library
Qt QTableView performance 60 fps - Stack Overflow, brukt januar 3, 2026, https://stackoverflow.com/questions/77367729/qt-qtableview-performance-60-fps
Dear ImGui: Bloat-free Graphical User interface for C++ with minimal dependencies - GitHub, brukt januar 3, 2026, https://github.com/ocornut/imgui
Thread: need faster QTableView performance - Qt Centre, brukt januar 3, 2026, https://www.qtcentre.org/threads/61662-need-faster-QTableView-performance
Windows Process Anomaly Detection with AI & ML | by Myth | Oct, 2025 - Medium, brukt januar 3, 2026, https://medium.com/@myth7672/windows-process-anomaly-detection-with-ai-ml-ed58163b8272
Day 11 — Monitoring with Performance Monitor: CPU, Memory, Disk & Network the Windows Way | by Shrikant Ganji | Medium, brukt januar 3, 2026, https://medium.com/@srikanth.unix07/day-11-monitoring-with-performance-monitor-cpu-memory-disk-network-the-windows-way-3676384348e9
Comparing Autoencoder and Isolation Forest in Network Anomaly Detection - ResearchGate, brukt januar 3, 2026, https://www.researchgate.net/publication/371407967_Comparing_Autoencoder_and_Isolation_Forest_in_Network_Anomaly_Detection
Efficiently updating a QTableView at high speed - Stack Overflow, brukt januar 3, 2026, https://stackoverflow.com/questions/3770084/efficiently-updating-a-qtableview-at-high-speed

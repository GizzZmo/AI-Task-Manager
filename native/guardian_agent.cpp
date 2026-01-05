#ifdef _WIN32
#define NOMINMAX
#include <Windows.h>
#include <TlHelp32.h>
#include <Psapi.h>
#include <wincrypt.h>
#include <wintrust.h>
#include <softpub.h>

#pragma comment(lib, "wintrust.lib")
#pragma comment(lib, "crypt32.lib")
#pragma comment(lib, "psapi.lib")

#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <mutex>
#include <memory>
#include <optional>
#include <string>
#include <thread>
#include <unordered_map>
#include <vector>
#include <atomic>
#include <cstdlib>

#if defined(BUILDING_NODE_EXTENSION)
#include <node_api.h>
#endif

static std::atomic<bool> g_stop{ false };

BOOL WINAPI ConsoleCtrlHandler(DWORD ctrlType)
{
    if (ctrlType == CTRL_C_EVENT || ctrlType == CTRL_BREAK_EVENT || ctrlType == CTRL_CLOSE_EVENT)
    {
        g_stop.store(true);
        return TRUE;
    }
    return FALSE;
}

// RAII wrapper recommended in README.md
struct HandleDeleter { void operator()(HANDLE h) const { if (h && h != INVALID_HANDLE_VALUE) CloseHandle(h); } };
using UniqueHandle = std::unique_ptr<std::remove_pointer_t<HANDLE>, HandleDeleter>;

namespace
{
    constexpr std::size_t kEntropySampleBytes = 256 * 1024; // sample first 256 KB to reduce I/O
    constexpr DWORD kMaxModules = 128;
    constexpr std::size_t kCacheLimit = 512;

    inline ULONGLONG ToUint64(const FILETIME& ft)
    {
        return (static_cast<ULONGLONG>(ft.dwHighDateTime) << 32) | ft.dwLowDateTime;
    }

    bool QueryImagePath(HANDLE process, std::wstring& outPath)
    {
        DWORD size = MAX_PATH;
        std::vector<wchar_t> buffer(size);

        while (true)
        {
            if (QueryFullProcessImageNameW(process, 0, buffer.data(), &size))
            {
                outPath.assign(buffer.data(), size);
                return true;
            }

            if (GetLastError() != ERROR_INSUFFICIENT_BUFFER)
            {
                return false;
            }

            buffer.resize(buffer.size() * 2);
            size = static_cast<DWORD>(buffer.size());
        }
    }

    double ComputeEntropy(const std::wstring& path)
    {
        static std::unordered_map<std::wstring, double> cache;
        static std::mutex cacheMutex;
        {
            std::scoped_lock lock(cacheMutex);
            auto it = cache.find(path);
            if (it != cache.end())
            {
                return it->second;
            }
        }

        std::array<std::size_t, 256> freq{};
        std::ifstream file(path, std::ios::binary);
        if (!file.is_open())
        {
            return 0.0;
        }

        std::size_t total = 0;
        char byte;
        while (file.get(byte) && total < kEntropySampleBytes)
        {
            freq[static_cast<unsigned char>(byte)]++;
            total++;
        }

        if (total == 0) return 0.0;

        double entropy = 0.0;
        for (auto count : freq)
        {
            if (count == 0) continue;
            const double p = static_cast<double>(count) / static_cast<double>(total);
            entropy -= p * std::log2(p);
        }

        {
            std::scoped_lock lock(cacheMutex);
            if (cache.size() >= kCacheLimit && !cache.empty()) cache.erase(cache.begin());
            cache[path] = entropy;
        }
        return entropy;
    }

    bool IsAuthenticodeSigned(const std::wstring& path)
    {
        static std::unordered_map<std::wstring, bool> cache;
        static std::mutex cacheMutex;
        {
            std::scoped_lock lock(cacheMutex);
            auto it = cache.find(path);
            if (it != cache.end())
            {
                return it->second;
            }
        }

        WINTRUST_FILE_INFO fileInfo{};
        fileInfo.cbStruct = sizeof(WINTRUST_FILE_INFO);
        fileInfo.pcwszFilePath = path.c_str();

        WINTRUST_DATA trustData{};
        trustData.cbStruct = sizeof(WINTRUST_DATA);
        trustData.dwUIChoice = WTD_UI_NONE;
        trustData.fdwRevocationChecks = WTD_REVOKE_NONE;
        trustData.dwUnionChoice = WTD_CHOICE_FILE;
        trustData.pFile = &fileInfo;
        trustData.dwStateAction = WTD_STATEACTION_VERIFY;
        trustData.dwProvFlags = WTD_REVOCATION_CHECK_NONE | WTD_CACHE_ONLY_URL_RETRIEVAL;

        GUID policyGUID = WINTRUST_ACTION_GENERIC_VERIFY_V2;
        const LONG status = WinVerifyTrust(nullptr, &policyGUID, &trustData);
        trustData.dwStateAction = WTD_STATEACTION_CLOSE;
        WinVerifyTrust(nullptr, &policyGUID, &trustData);
        const bool signedOk = status == ERROR_SUCCESS;
        {
            std::scoped_lock lock(cacheMutex);
            if (cache.size() >= kCacheLimit && !cache.empty()) cache.erase(cache.begin());
            cache[path] = signedOk;
        }
        return signedOk;
    }

    bool QueryMemoryUsage(HANDLE process, PROCESS_MEMORY_COUNTERS_EX& mem)
    {
        static_assert(sizeof(PROCESS_MEMORY_COUNTERS_EX) >= sizeof(PROCESS_MEMORY_COUNTERS));
        return GetProcessMemoryInfo(process, reinterpret_cast<PPROCESS_MEMORY_COUNTERS>(&mem), sizeof(mem));
    }
}

struct ModuleInfo
{
    std::wstring name;
    std::wstring path;
    bool isSigned{};
};

struct ProcessFeatures
{
    DWORD pid{};
    std::wstring name;
    std::wstring imagePath;
    double cpuPercent{};
    std::size_t workingSetBytes{};
    std::size_t privateBytes{};
    DWORD handleCount{};
    double entropy{};
    bool isSigned{};
    std::vector<ModuleInfo> modules;
};

class CpuUsageTracker
{
public:
    std::optional<double> Update(DWORD pid, HANDLE processHandle)
    {
        FILETIME creation{}, exit{}, kernel{}, user{};
        if (!GetProcessTimes(processHandle, &creation, &exit, &kernel, &user))
        {
            return std::nullopt;
        }

        FILETIME idle{}, kernelTotal{}, userTotal{};
        if (!GetSystemTimes(&idle, &kernelTotal, &userTotal))
        {
            return std::nullopt;
        }

        const ULONGLONG procTime = ToUint64(kernel) + ToUint64(user);
        const ULONGLONG systemTime = (ToUint64(kernelTotal) + ToUint64(userTotal)) - ToUint64(idle);

        auto& prev = _history[pid];
        if (prev.procTime == 0 || prev.systemTime == 0)
        {
            prev = { procTime, systemTime };
            return std::nullopt; // first sample
        }

        const double procDelta = static_cast<double>(procTime - prev.procTime);
        const double sysDelta = static_cast<double>(systemTime - prev.systemTime);
        prev = { procTime, systemTime };

        if (sysDelta <= 0.0) return std::nullopt;
        const double cpu = (procDelta / sysDelta) * 100.0;
        return std::clamp(cpu, 0.0, 100.0);
    }

private:
    struct CpuSnapshot { ULONGLONG procTime{}; ULONGLONG systemTime{}; };
    std::unordered_map<DWORD, CpuSnapshot> _history;
};

class ProcessSampler
{
public:
    ProcessSampler() = default;

    std::vector<ProcessFeatures> SampleProcesses()
    {
        std::vector<ProcessFeatures> result;

        UniqueHandle snapshot(CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0));
        if (!snapshot || snapshot.get() == INVALID_HANDLE_VALUE)
        {
            return result;
        }

        PROCESSENTRY32W entry{};
        entry.dwSize = sizeof(PROCESSENTRY32W);
        if (!Process32FirstW(snapshot.get(), &entry))
        {
            return result;
        }

        do
        {
            UniqueHandle process(OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ, FALSE, entry.th32ProcessID));
            if (!process)
            {
                process.reset(OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, entry.th32ProcessID));
            }
            if (!process) continue;

            ProcessFeatures feat{};
            feat.pid = entry.th32ProcessID;
            feat.name = entry.szExeFile;

            if (QueryImagePath(process.get(), feat.imagePath))
            {
                feat.entropy = ComputeEntropy(feat.imagePath);
                feat.isSigned = IsAuthenticodeSigned(feat.imagePath);
            }

            PROCESS_MEMORY_COUNTERS_EX mem{};
            if (QueryMemoryUsage(process.get(), mem))
            {
                feat.workingSetBytes = mem.WorkingSetSize;
                feat.privateBytes = mem.PrivateUsage;
            }

            GetProcessHandleCount(process.get(), &feat.handleCount);

            if (auto cpu = _cpuTracker.Update(feat.pid, process.get()))
            {
                feat.cpuPercent = *cpu;
            }

            EnumerateModules(process.get(), feat);
            result.emplace_back(std::move(feat));
        } while (Process32NextW(snapshot.get(), &entry));

        return result;
    }

private:
    void EnumerateModules(HANDLE process, ProcessFeatures& feat)
    {
        HMODULE modules[kMaxModules]{};
        DWORD bytesNeeded = 0;
        if (!EnumProcessModulesEx(process, modules, sizeof(modules), &bytesNeeded, LIST_MODULES_ALL))
        {
            return;
        }

        const DWORD moduleCount = std::min<DWORD>(kMaxModules, bytesNeeded / sizeof(HMODULE));
        for (DWORD i = 0; i < moduleCount; ++i)
        {
            wchar_t modulePath[MAX_PATH]{};
            if (GetModuleFileNameExW(process, modules[i], modulePath, MAX_PATH) == 0)
            {
                continue;
            }
            ModuleInfo mod{};
            mod.path = modulePath;
            const wchar_t* name = wcsrchr(modulePath, L'\\');
            mod.name = name ? name + 1 : modulePath;
            mod.isSigned = IsAuthenticodeSigned(mod.path);
            feat.modules.emplace_back(std::move(mod));
        }
    }

    CpuUsageTracker _cpuTracker;
};

enum class RiskLevel { Normal, Suspicious, Malicious };

struct RiskReport
{
    RiskLevel level{ RiskLevel::Normal };
    float score{};
    std::wstring reason;
};

class RiskScorer
{
public:
    RiskReport Evaluate(const ProcessFeatures& p) const
    {
        float score = 0.0f;
        std::vector<std::wstring> reasons;

        if (!p.isSigned)
        {
            score += 0.25f;
            reasons.emplace_back(L"unsigned binary");
        }
        if (p.entropy > kEntropyThreshold)
        {
            score += 0.25f;
            reasons.emplace_back(L"high entropy image");
        }
        if (p.cpuPercent > kCpuThreshold)
        {
            score += 0.15f;
            reasons.emplace_back(L"sustained CPU usage");
        }
        if (p.handleCount > kHandleThreshold)
        {
            score += 0.1f;
            reasons.emplace_back(L"excessive handles");
        }
        if (HasUnsignedModules(p))
        {
            score += 0.15f;
            reasons.emplace_back(L"unsigned module loaded");
        }

        const RiskLevel level = (score >= kMaliciousCutoff) ? RiskLevel::Malicious
                               : (score >= kSuspiciousCutoff) ? RiskLevel::Suspicious
                               : RiskLevel::Normal;

        RiskReport report{};
        report.level = level;
        report.score = std::min(score, 1.0f);
        report.reason = ComposeReasons(reasons);
        return report;
    }

private:
    static constexpr float kEntropyThreshold = 7.2f;
    static constexpr float kCpuThreshold = 60.0f;
    static constexpr DWORD kHandleThreshold = 1000;
    static constexpr float kMaliciousCutoff = 0.7f;
    static constexpr float kSuspiciousCutoff = 0.45f;

    std::wstring ComposeReasons(const std::vector<std::wstring>& reasons) const
    {
        if (reasons.empty()) return L"baseline";
        std::wstring joined;
        for (std::size_t i = 0; i < reasons.size(); ++i)
        {
            if (i > 0) joined += L"; ";
            joined += reasons[i];
        }
        return joined;
    }

    bool HasUnsignedModules(const ProcessFeatures& p) const
    {
        for (const auto& m : p.modules)
        {
            if (!m.isSigned) return true;
        }
        return false;
    }
};

class GuardianEngine
{
public:
    explicit GuardianEngine(std::chrono::milliseconds pollInterval = std::chrono::milliseconds(1000))
        : _pollInterval(pollInterval) {}

    void Start()
    {
        _running = true;
        _worker = std::jthread([this] { RunLoop(); });
    }

    void Stop()
    {
        _running = false;
        if (_worker.joinable())
        {
            _worker.join();
        }
    }

    ~GuardianEngine() { Stop(); }

    std::vector<RiskReport> SampleOnce()
    {
        auto processes = _sampler.SampleProcesses();
        std::vector<RiskReport> reports;
        for (const auto& p : processes)
        {
            reports.emplace_back(_scorer.Evaluate(p));
        }
        return reports;
    }

private:
    void RunLoop()
    {
        while (_running)
        {
            auto processes = _sampler.SampleProcesses();
            for (const auto& p : processes)
            {
                const auto report = _scorer.Evaluate(p);
                if (report.level != RiskLevel::Normal)
                {
                    LogAlert(p, report);
                }
            }
            std::this_thread::sleep_for(_pollInterval);
        }
    }

    void LogAlert(const ProcessFeatures& p, const RiskReport& r)
    {
        std::wcout << L"[GUARDIAN] PID " << p.pid << L" (" << p.name << L") flagged: score="
                   << r.score << L" reason=" << r.reason << std::endl;
    }

    std::atomic<bool> _running{ false };
    std::jthread _worker;
    ProcessSampler _sampler;
    RiskScorer _scorer;
    std::chrono::milliseconds _pollInterval;
};

#if defined(BUILDING_NODE_EXTENSION)
namespace
{
    std::string WideToUtf8(const std::wstring& wide)
    {
        if (wide.empty()) return {};
        const int sizeNeeded = WideCharToMultiByte(CP_UTF8, 0, wide.c_str(),
            static_cast<int>(wide.size()), nullptr, 0, nullptr, nullptr);
        if (sizeNeeded <= 0) return {};
        std::string result(static_cast<std::size_t>(sizeNeeded), '\0');
        WideCharToMultiByte(CP_UTF8, 0, wide.c_str(), static_cast<int>(wide.size()),
            result.data(), sizeNeeded, nullptr, nullptr);
        return result;
    }

    const char* RiskLevelToString(RiskLevel level)
    {
        switch (level)
        {
        case RiskLevel::Malicious: return "Malicious";
        case RiskLevel::Suspicious: return "Suspicious";
        default: return "Normal";
        }
    }

    void SetString(napi_env env, napi_value obj, const char* key, const std::string& value)
    {
        napi_value str;
        napi_create_string_utf8(env, value.c_str(), value.size(), &str);
        napi_set_named_property(env, obj, key, str);
    }

    void SetNumber(napi_env env, napi_value obj, const char* key, double value)
    {
        napi_value num;
        napi_create_double(env, value, &num);
        napi_set_named_property(env, obj, key, num);
    }

    void SetBigInt(napi_env env, napi_value obj, const char* key, uint64_t value)
    {
        napi_value big;
        napi_create_bigint_uint64(env, value, &big);
        napi_set_named_property(env, obj, key, big);
    }

    void SetBool(napi_env env, napi_value obj, const char* key, bool value)
    {
        napi_value booleanValue;
        napi_get_boolean(env, value, &booleanValue);
        napi_set_named_property(env, obj, key, booleanValue);
    }

    napi_value GuardianSampleOnce(napi_env env, napi_callback_info /*info*/)
    {
#ifdef _WIN32
        ProcessSampler sampler;
        RiskScorer scorer;
        const auto processes = sampler.SampleProcesses();

        napi_value arr;
        napi_create_array_with_length(env, processes.size(), &arr);

        for (std::size_t i = 0; i < processes.size(); ++i)
        {
            const auto& p = processes[i];
            const auto report = scorer.Evaluate(p);

            napi_value obj;
            napi_create_object(env, &obj);

            SetNumber(env, obj, "pid", static_cast<double>(p.pid));
            SetString(env, obj, "name", WideToUtf8(p.name));
            SetString(env, obj, "imagePath", WideToUtf8(p.imagePath));
            SetNumber(env, obj, "cpuPercent", p.cpuPercent);
            SetBigInt(env, obj, "workingSetBytes", static_cast<uint64_t>(p.workingSetBytes));
            SetBigInt(env, obj, "privateBytes", static_cast<uint64_t>(p.privateBytes));
            SetNumber(env, obj, "handleCount", static_cast<double>(p.handleCount));
            SetNumber(env, obj, "entropy", p.entropy);
            SetBool(env, obj, "isSigned", p.isSigned);
            SetString(env, obj, "riskLevel", RiskLevelToString(report.level));
            SetNumber(env, obj, "riskScore", report.score);
            SetString(env, obj, "reason", WideToUtf8(report.reason));

            napi_set_element(env, arr, static_cast<uint32_t>(i), obj);
        }
        return arr;
#else
        napi_throw_error(env, nullptr, "Guardian native module is only supported on Windows.");
        return nullptr;
#endif
    }

    napi_value Init(napi_env env, napi_value exports)
    {
        napi_value fn;
        napi_create_function(env, "sampleOnce", NAPI_AUTO_LENGTH, GuardianSampleOnce, nullptr, &fn);
        napi_set_named_property(env, exports, "sampleOnce", fn);
        return exports;
    }
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
#endif

#if !defined(BUILDING_NODE_EXTENSION)
int wmain(int argc, wchar_t* argv[])
{
    bool once = false;
    for (int i = 1; i < argc; ++i)
    {
        if (wcscmp(argv[i], L"--once") == 0) once = true;
    }

    std::chrono::milliseconds pollInterval{ 1000 };
    if (const wchar_t* env = _wgetenv(L"GUARDIAN_POLL_MS"))
    {
        try
        {
            pollInterval = std::chrono::milliseconds(std::stoul(env));
        }
        catch (...)
        {
            std::wcerr << L"[GUARDIAN] Invalid GUARDIAN_POLL_MS value: " << env << L". Using 1000ms." << std::endl;
            pollInterval = std::chrono::milliseconds(1000);
        }
    }

    GuardianEngine engine(pollInterval);
    if (once)
    {
        const auto reports = engine.SampleOnce();
        std::wcout << L"Collected " << reports.size() << L" process reports." << std::endl;
        return 0;
    }

    std::wcout << L"Starting Guardian event loop. Press Ctrl+C to exit." << std::endl;
    SetConsoleCtrlHandler(ConsoleCtrlHandler, TRUE);
    engine.Start();
    while (!g_stop.load())
    {
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
    engine.Stop();
    return 0;
}
#endif

#else
int main()
{
    std::cerr << "guardian_agent.cpp is intended for Windows builds." << std::endl;
    return 0;
}
#endif

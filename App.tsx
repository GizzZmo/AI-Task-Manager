import React, { useState, useEffect, useCallback } from 'react';
import { INITIAL_PROCESSES, MOCK_LOGS } from './constants';
import { ProcessData, ChartPoint, RiskLevel } from './types';
import { ProcessTable } from './components/ProcessTable';
import { ResourceChart } from './components/ResourceChart';
import { AISupervisor } from './components/AISupervisor';
import { ProcessTree } from './components/ProcessTree';
import { FileBrowserModal } from './components/FileBrowserModal';
import { RunTaskModal } from './components/RunTaskModal';

const App: React.FC = () => {
  // State
  const [processes, setProcesses] = useState<ProcessData[]>(INITIAL_PROCESSES);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [cpuHistory, setCpuHistory] = useState<ChartPoint[]>([]);
  const [memHistory, setMemHistory] = useState<ChartPoint[]>([]);
  const [systemLogs, setSystemLogs] = useState<string[]>(MOCK_LOGS);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  
  // Run Task State
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [isFileBrowserOpen, setIsFileBrowserOpen] = useState(false);
  const [runInput, setRunInput] = useState('');

  // Check API Key
  useEffect(() => {
    if (!process.env.API_KEY) {
      setApiKeyMissing(true);
    }
  }, []);

  // Simulation Loop (Simulating PDH updates)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString();

      // 1. Update Processes (Random fluctuation)
      setProcesses(prev => {
        const updated = prev.map(p => {
          // Simulate simple fluctuation
          let newCpu = Math.max(0, p.cpu + (Math.random() - 0.5) * 5);
          if (p.name === 'updater_svc.exe') newCpu = Math.max(50, Math.min(100, newCpu + 2)); // Malware stays high
          
          return {
            ...p,
            cpu: Number(newCpu.toFixed(1)),
            memory: Math.floor(Math.max(1, p.memory + (Math.random() - 0.5) * 10)),
            networkIo: Math.max(0, Number((p.networkIo + (Math.random() - 0.5) * 50).toFixed(1))),
          };
        });
        
        // Calculate total system metrics
        const totalCpu = Math.min(100, updated.reduce((acc, curr) => acc + curr.cpu, 0));
        const totalMem = updated.reduce((acc, curr) => acc + curr.memory, 0);

        // Update Charts
        setCpuHistory(h => [...h.slice(-20), { time: now, value: Number(totalCpu.toFixed(1)) }]);
        setMemHistory(h => [...h.slice(-20), { time: now, value: totalMem }]);

        return updated;
      });

    }, 2000); // 2-second polling for "PDH"

    return () => clearInterval(interval);
  }, []);

  const handleProcessSelect = useCallback((pid: number) => {
    setSelectedPid(pid);
  }, []);

  const handleTerminate = useCallback((pid: number) => {
    // Simulate security check for critical processes
    if (pid === 4 || pid === 0) {
        setSystemLogs(prev => [...prev, `[KERNEL] ERROR: Access Denied. Cannot terminate System process PID ${pid}.`]);
        return;
    }

    setProcesses(prev => prev.filter(p => p.pid !== pid));
    setSystemLogs(prev => [...prev, `[USER] TerminateProcess(PID=${pid}) invoked.`, `[KERNEL] Process PID ${pid} terminated successfully.`]);
    
    if (selectedPid === pid) {
        setSelectedPid(null);
    }
  }, [selectedPid]);

  const handleSpawnProcess = (name: string, path: string) => {
    const newPid = Math.floor(Math.random() * 10000) + 10000;
    
    // Heuristic for the demo
    const isSuspicious = name.includes('unknown') || name.includes('cheat') || name.includes('free');
    const isSigned = !isSuspicious;

    const newProcess: ProcessData = {
        pid: newPid,
        name: name,
        user: 'User',
        session: 1,
        cpu: 0.1, // Starts low
        memory: Math.floor(Math.random() * 50) + 10,
        diskIo: 5.0, // Loading from disk
        networkIo: 0,
        entropy: isSuspicious ? 7.2 : 5.0, // High entropy for suspicious files
        isSigned: isSigned,
        handleCount: 150,
        parentPid: 4000, // Simulated Explorer PID
        path: path,
        riskLevel: RiskLevel.UNKNOWN, // Let Gemini Analyze it
        tags: ['user-spawned', 'new'],
        modules: [] // Mock empty modules
    };

    setProcesses(prev => [newProcess, ...prev]);
    setSystemLogs(prev => [...prev, `[USER] RunTask: Spawned ${name} (PID ${newPid}).`]);
    setSelectedPid(newPid);
  };
  
  const handleRunTask = () => {
    if (!runInput.trim()) return;
    
    // Extract Name
    // If it looks like a path, take the filename, else use raw input
    const name = runInput.includes('\\') ? runInput.split('\\').pop()! : runInput;
    
    handleSpawnProcess(name, runInput);
    setIsRunDialogOpen(false);
    setRunInput('');
  };

  const selectedProcess = processes.find(p => p.pid === selectedPid) || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center px-6 justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            S
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Sentinel AI</h1>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">System Supervisor // Active</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
           {apiKeyMissing && (
             <span className="text-red-400 bg-red-900/20 px-2 py-1 rounded border border-red-900">
               MISSING_API_KEY
             </span>
           )}
           <button 
                onClick={() => {
                    setRunInput('');
                    setIsRunDialogOpen(true);
                }}
                className="bg-slate-800 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 text-slate-300 px-3 py-1.5 rounded font-mono border border-slate-700 transition-all flex items-center gap-2 group"
            >
                <span className="group-hover:scale-110 transition-transform">▶</span> 
                Run Task
           </button>
           <span className="flex items-center gap-2 pl-4 border-l border-slate-800">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
             CONNECTED
           </span>
           <span>v1.0.4-beta</span>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 p-4 grid grid-cols-12 gap-4 h-[calc(100vh-3.5rem)] overflow-hidden">
        
        {/* Left Column: Process List & Charts (8 cols) */}
        <div className="col-span-8 flex flex-col gap-4 h-full overflow-hidden">
            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-4 h-48 shrink-0">
                <ResourceChart 
                  data={cpuHistory} 
                  color="#6366f1" 
                  dataKey="cpu" 
                  title="Total CPU Usage (%)" 
                />
                <ResourceChart 
                  data={memHistory} 
                  color="#10b981" 
                  dataKey="memory" 
                  title="Total Memory Commit (MB)" 
                />
            </div>
            
            {/* Process Table */}
            <div className="flex-1 min-h-0">
                <ProcessTable 
                  processes={processes} 
                  selectedPid={selectedPid}
                  onSelect={(p) => handleProcessSelect(p.pid)}
                  onTerminate={handleTerminate}
                />
            </div>
        </div>

        {/* Right Column: AI Analysis & Details (4 cols) */}
        <div className="col-span-4 flex flex-col gap-4 h-full overflow-hidden">
            
            {/* AI Console */}
            <div className="flex-1 min-h-[350px]">
                <AISupervisor selectedProcess={selectedProcess} />
            </div>

            {/* Tree Visualization */}
            <div className="h-[300px] shrink-0">
                <ProcessTree 
                    processes={processes} 
                    onSelectProcess={handleProcessSelect}
                    selectedPid={selectedPid}
                />
            </div>

             {/* System Log Mini Panel */}
             <div className="h-32 bg-black border border-slate-800 rounded p-2 font-mono text-[10px] overflow-hidden text-slate-500">
                <div className="mb-1 text-slate-400 uppercase font-bold border-b border-slate-800 pb-1">System Events</div>
                {systemLogs.map((log, i) => (
                    <div key={i} className="truncate hover:text-slate-300">{log}</div>
                ))}
             </div>
        </div>

      </main>

      {/* Modals */}
      <RunTaskModal 
        isOpen={isRunDialogOpen}
        onClose={() => setIsRunDialogOpen(false)}
        onRun={handleRunTask}
        onBrowse={() => setIsFileBrowserOpen(true)}
        inputValue={runInput}
        setInputValue={setRunInput}
      />
      
      <FileBrowserModal 
        isOpen={isFileBrowserOpen} 
        onClose={() => setIsFileBrowserOpen(false)} 
        onSelect={(path) => {
            setRunInput(path);
            setIsFileBrowserOpen(false);
        }} 
      />
    </div>
  );
};

export default App;
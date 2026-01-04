import React, { useState, useEffect, useRef } from 'react';
import { ProcessData, AnalysisResponse, RiskLevel, ResearchResponse } from '../types';
import { analyzeProcessWithGemini, researchProcess, analyzeSystemScreenshot } from '../services/geminiService';

interface AISupervisorProps {
  selectedProcess: ProcessData | null;
}

type Mode = 'ANALYSIS' | 'MODULES' | 'VISUAL';

export const AISupervisor: React.FC<AISupervisorProps> = ({ selectedProcess }) => {
  const [mode, setMode] = useState<Mode>('ANALYSIS');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [research, setResearch] = useState<ResearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [moduleFilter, setModuleFilter] = useState('');
  
  // Symbol Server State
  const [symbolsLoaded, setSymbolsLoaded] = useState(false);
  
  // Visual Analysis State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawBase64, setRawBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [visualResult, setVisualResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset analysis/research when process changes, but keep visual state active if user is in that mode
    if (mode !== 'VISUAL') {
        setAnalysis(null);
        setResearch(null);
        setLogs([]);
        setMode('ANALYSIS');
        setModuleFilter('');
        setSymbolsLoaded(false);
        setResearchLoading(false);
    }
  }, [selectedProcess]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runAnalysis = async () => {
    if (!selectedProcess) return;
    setMode('ANALYSIS');
    setLoading(true);
    addLog(`Initiating feature vector extraction for PID ${selectedProcess.pid}...`);
    
    await new Promise(r => setTimeout(r, 600));
    addLog(`Calculating Shannon Entropy: ${selectedProcess.entropy.toFixed(2)}`);
    addLog(`Transmitting vector to Neural Engine (Gemini 2.5)...`);

    const result = await analyzeProcessWithGemini(selectedProcess);
    setAnalysis(result);
    setLoading(false);
    addLog(`Inference Complete. Score: ${result.riskScore.toFixed(4)}`);
  };

  const runResearch = async () => {
    if (!selectedProcess) return;
    setResearchLoading(true);
    addLog(`Connecting to Global Intelligence Network...`);
    addLog(`Querying Google Search Grounding for "${selectedProcess.name}"...`);

    const result = await researchProcess(selectedProcess.name);
    setResearch(result);
    setResearchLoading(false);
    addLog(`Intelligence gathered from ${result.sources.length} sources.`);
  };

  const loadSymbols = async () => {
    setLoading(true);
    addLog("Configuring symbol path: srv*c:\\symbols*https://msdl.microsoft.com/download/symbols");
    await new Promise(r => setTimeout(r, 800));
    addLog("Connecting to Microsoft Symbol Server...");
    await new Promise(r => setTimeout(r, 1000));
    setSymbolsLoaded(true);
    setLoading(false);
    addLog("Symbols loaded for known system modules.");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewUrl(result);
        const base64Clean = result.split(',')[1];
        setRawBase64(base64Clean);
        setVisualResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runVisualAnalysis = async () => {
    if (!rawBase64) return;
    setLoading(true);
    addLog("Uploading visual evidence to Gemini 3 Pro...");
    
    const result = await analyzeSystemScreenshot(rawBase64, imageMimeType);
    setVisualResult(result);
    setLoading(false);
    addLog("Visual Analysis Complete.");
  };

  const filteredModules = selectedProcess?.modules?.filter(m => 
    m.name.toLowerCase().includes(moduleFilter.toLowerCase()) || 
    m.path.toLowerCase().includes(moduleFilter.toLowerCase())
  ) || [];

  const renderContent = () => {
    if (mode === 'VISUAL') {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col gap-4">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="image/*" 
                    className="hidden" 
                />
                
                {!previewUrl ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 hover:border-slate-500 transition-all group p-8"
                    >
                        <div className="text-4xl mb-2 text-slate-600 group-hover:text-slate-400">📷</div>
                        <div className="text-sm font-mono text-slate-500 uppercase tracking-widest group-hover:text-slate-300">Upload Evidence</div>
                        <div className="text-xs text-slate-600 mt-2">Screenshots, Logs, Terminals</div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 h-full">
                        <div className="relative h-40 shrink-0 bg-black rounded border border-slate-800 overflow-hidden group">
                             <img src={previewUrl} alt="Evidence" className="w-full h-full object-contain opacity-80" />
                             <button 
                                onClick={() => { setPreviewUrl(null); setRawBase64(null); setVisualResult(null); }}
                                className="absolute top-2 right-2 bg-red-900/80 text-white p-1 rounded hover:bg-red-700 text-xs"
                             >
                                CLEAR
                             </button>
                        </div>
                        
                        {!visualResult && (
                            <button
                                onClick={runVisualAnalysis}
                                disabled={loading}
                                className="w-full py-2 bg-pink-700 hover:bg-pink-600 text-white font-mono text-xs uppercase tracking-widest rounded border border-pink-500 shadow-[0_0_10px_rgba(190,24,93,0.3)] transition-all disabled:opacity-50"
                            >
                                {loading ? "Analyzing Pixels..." : "Run Optical Analysis"}
                            </button>
                        )}

                        {visualResult && (
                            <div className="flex-1 bg-slate-950 p-3 rounded border border-slate-800 overflow-y-auto custom-scrollbar">
                                <div className="text-xs text-pink-400 uppercase font-bold mb-2 tracking-widest">Analysis Report</div>
                                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{visualResult}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (!selectedProcess) {
        return (
          <div className="h-full flex items-center justify-center text-slate-600 font-mono text-sm border border-slate-700 rounded-lg border-dashed p-8">
            SELECT_PROCESS_FOR_SUPERVISION
          </div>
        );
    }

    if (mode === 'MODULES') {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                <div className="mb-3 flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Filter modules..." 
                        value={moduleFilter}
                        onChange={(e) => setModuleFilter(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 placeholder-slate-600"
                    />
                    <button
                        onClick={loadSymbols}
                        disabled={loading || symbolsLoaded}
                        className={`px-3 py-1.5 rounded border text-[10px] uppercase font-mono tracking-wider transition-all
                            ${symbolsLoaded 
                                ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400 cursor-default' 
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        {symbolsLoaded ? 'Symbols Loaded' : 'Load Symbols'}
                    </button>
                    <a 
                        href="https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/using-a-symbol-server"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-2 rounded border border-slate-800 bg-slate-900 text-slate-500 hover:text-blue-400 hover:border-blue-500/50 transition-colors"
                        title="Documentation: Using a Symbol Server"
                    >
                        <span className="text-sm font-bold">?</span>
                    </a>
                </div>
                
                <div className="flex-1 overflow-auto custom-scrollbar border border-slate-800 rounded bg-slate-950/50">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 sticky top-0 text-[10px] uppercase font-bold text-slate-500">
                            <tr>
                                <th className="p-2 border-b border-slate-800">Module Name</th>
                                <th className="p-2 border-b border-slate-800 text-right">Base Addr</th>
                                <th className="p-2 border-b border-slate-800 text-center">Signed</th>
                                <th className="p-2 border-b border-slate-800 text-center">Symbols</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs font-mono">
                            {filteredModules.map((mod, idx) => (
                                <tr key={idx} className="hover:bg-slate-900 border-b border-slate-800/50 last:border-0">
                                    <td className="p-2">
                                        <div className={`${!mod.isSigned ? 'text-red-400 font-bold' : 'text-slate-300'}`}>{mod.name}</div>
                                        <div className="text-[10px] text-slate-600 truncate max-w-[150px]" title={mod.path}>{mod.path}</div>
                                    </td>
                                    <td className="p-2 text-right text-slate-500 text-[10px]">{mod.baseAddress}</td>
                                    <td className="p-2 text-center">
                                        {mod.isSigned ? (
                                            <span className="text-emerald-500">✓</span>
                                        ) : (
                                            <span className="text-red-500 font-bold">✕</span>
                                        )}
                                    </td>
                                    <td className="p-2 text-center text-[10px]">
                                        {symbolsLoaded ? (
                                            mod.isSigned ? (
                                                <span className="text-slate-400">loaded</span>
                                            ) : (
                                                <span className="text-red-500/50 italic">no_pdb</span>
                                            )
                                        ) : (
                                            <span className="text-slate-700">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredModules.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-slate-600 italic">No modules found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 text-right">
                    Total Modules: {selectedProcess.modules?.length || 0}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
        {/* RESULTS: TELEMETRY */}
        {!loading && mode === 'ANALYSIS' && analysis && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-2">
                <h3 className="uppercase tracking-widest text-xs text-slate-500">Classification</h3>
                <span className={`text-lg font-bold ${analysis.classification === RiskLevel.MALICIOUS ? 'text-red-500' : analysis.classification === RiskLevel.SUSPICIOUS ? 'text-yellow-500' : 'text-emerald-500'}`}>{analysis.classification}</span>
            </div>
            
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-4">
                <div 
                    className={`h-full transition-all duration-1000 ${analysis.classification === RiskLevel.MALICIOUS ? 'bg-red-500' : analysis.classification === RiskLevel.SUSPICIOUS ? 'bg-yellow-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${analysis.riskScore * 100}%` }}
                ></div>
            </div>

            <div className="space-y-3">
                <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                    <div className="text-xs text-slate-400 uppercase mb-1">Inference Reasoning</div>
                    <p className="text-slate-300 leading-relaxed">{analysis.reasoning}</p>
                </div>
            </div>
          </div>
        )}

        {/* RESEARCH INTEGRATION */}
        {mode === 'ANALYSIS' && analysis && !loading && (
             <div className="pt-2 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                 {!research ? (
                    <button 
                       onClick={runResearch}
                       disabled={researchLoading}
                       className="w-full py-3 bg-blue-950/30 hover:bg-blue-900/40 text-blue-400 border border-blue-500/20 border-dashed rounded font-mono text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       {researchLoading ? (
                           <span className="animate-pulse">Gathering Intelligence...</span>
                       ) : (
                           <>
                               <span className="group-hover:scale-110 transition-transform">🌐</span>
                               <span className="group-hover:text-blue-300">Research Process</span>
                           </>
                       )}
                    </button>
                 ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-3 bg-blue-900/10 rounded border border-blue-500/30 mb-2">
                           <div className="flex justify-between items-center mb-2">
                                <div className="text-xs text-blue-400 uppercase font-bold tracking-widest">Global Intelligence</div>
                                <div className="text-[10px] text-blue-500/50">GOOGLE SEARCH GROUNDING</div>
                           </div>
                           <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-xs">{research.content}</p>
                        </div>

                        {research.sources.length > 0 && (
                            <div className="flex flex-col gap-1">
                               {research.sources.map((source, idx) => (
                                   <a 
                                       key={idx} 
                                       href={source.uri} 
                                       target="_blank" 
                                       rel="noopener noreferrer"
                                       className="flex items-center justify-between p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors group"
                                   >
                                       <span className="text-[10px] text-blue-400 truncate w-3/4">{source.title}</span>
                                       <span className="text-[10px] text-slate-500 group-hover:text-slate-300">OPEN ↗</span>
                                   </a>
                               ))}
                            </div>
                        )}
                    </div>
                 )}
             </div>
        )}
        </div>
    );
  };

  // Border color based on analysis state
  let borderColor = 'border-slate-700';
  if (mode === 'ANALYSIS' && analysis) {
    if (analysis.classification === RiskLevel.MALICIOUS) borderColor = 'border-red-500';
    else if (analysis.classification === RiskLevel.SUSPICIOUS) borderColor = 'border-yellow-500';
    else borderColor = 'border-emerald-500';
  } else if (mode === 'MODULES') {
    borderColor = 'border-purple-500';
  } else if (mode === 'VISUAL') {
    borderColor = 'border-pink-600';
  }

  return (
    <div className={`flex flex-col h-full bg-slate-900 border ${borderColor} rounded-lg overflow-hidden transition-colors duration-500`}>
      {/* Header */}
      <div className="bg-slate-950 p-3 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-blue-500 animate-pulse' : 'bg-slate-500'}`}></div>
            <span className="font-mono text-sm font-bold text-slate-200">TASK_WIZARD_CTX</span>
        </div>
        <div className="flex gap-1.5">
            <button
            onClick={runAnalysis}
            disabled={loading || !selectedProcess}
            className={`text-[10px] px-2.5 py-1.5 rounded font-mono uppercase tracking-wider transition-all border ${mode === 'ANALYSIS' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-50'}`}
            >
            Telemetry
            </button>
            <button
            onClick={() => setMode('MODULES')}
            disabled={loading || !selectedProcess}
            className={`text-[10px] px-2.5 py-1.5 rounded font-mono uppercase tracking-wider transition-all border ${mode === 'MODULES' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-50'}`}
            >
            Modules
            </button>
            <button
            onClick={() => setMode('VISUAL')}
            disabled={loading}
            className={`text-[10px] px-2.5 py-1.5 rounded font-mono uppercase tracking-wider transition-all border ${mode === 'VISUAL' ? 'bg-pink-700 border-pink-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
            Visual
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 overflow-y-auto font-mono text-sm space-y-4">
        
        {/* Target Info (Only if not visual mode) */}
        {mode !== 'VISUAL' && selectedProcess && (
            <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
            <div>TARGET: <span className="text-slate-200">{selectedProcess.name}</span></div>
            <div>PID: <span className="text-slate-200">{selectedProcess.pid}</span></div>
            </div>
        )}

        {/* Logs (Hidden in Modules mode or Visual Mode to save space, but show in Visual if running) */}
        {mode !== 'MODULES' && (
            <div className="bg-black/50 p-3 rounded text-xs font-mono h-24 overflow-y-auto border border-slate-800 custom-scrollbar">
                {logs.length === 0 && <span className="text-slate-600 opacity-50">Waiting for command...</span>}
                {logs.map((log, i) => (
                    <div key={i} className="text-emerald-400/80 mb-1">{log}</div>
                ))}
                {(loading || researchLoading) && <div className="animate-pulse text-indigo-400">PROCESSING...</div>}
            </div>
        )}

        {renderContent()}

      </div>
    </div>
  );
};
import React from 'react';
import { ProcessData, RiskLevel } from '../types';

interface ProcessTableProps {
  processes: ProcessData[];
  onSelect: (process: ProcessData) => void;
  selectedPid: number | null;
  onTerminate: (pid: number) => void;
}

export const ProcessTable: React.FC<ProcessTableProps> = ({ processes, onSelect, selectedPid, onTerminate }) => {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Active Processes ({processes.length})</span>
        <div className="flex gap-2 text-[10px] text-slate-500 font-mono">
            <span>PSAPI: OK</span>
            <span>WTS: OK</span>
            <span>PDH: ACTIVE</span>
        </div>
      </div>
      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-950 sticky top-0 z-10 text-xs uppercase font-mono text-slate-500">
            <tr>
              <th className="p-3 border-b border-slate-800 w-16">PID</th>
              <th className="p-3 border-b border-slate-800 w-20">PPID</th>
              <th className="p-3 border-b border-slate-800">Image Name</th>
              <th className="p-3 border-b border-slate-800 w-24">User</th>
              <th className="p-3 border-b border-slate-800 text-right w-20">CPU %</th>
              <th className="p-3 border-b border-slate-800 text-right w-24">Mem (MB)</th>
              <th className="p-3 border-b border-slate-800 text-right w-24">Net (KB/s)</th>
              <th className="p-3 border-b border-slate-800 text-right w-20">Handles</th>
              <th className="p-3 border-b border-slate-800 text-right w-20">Entropy</th>
              <th className="p-3 border-b border-slate-800 text-center w-16">Sign</th>
              <th className="p-3 border-b border-slate-800 text-center w-20">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm font-mono divide-y divide-slate-800/50">
            {processes.map((proc) => {
              const isSelected = proc.pid === selectedPid;
              const parentProcess = processes.find(p => p.pid === proc.parentPid);
              const parentName = parentProcess ? parentProcess.name : (proc.parentPid === 0 ? "System Root" : "Unknown");

              return (
                <tr 
                  key={proc.pid}
                  onClick={() => onSelect(proc)}
                  className={`
                    cursor-pointer transition-colors duration-150
                    ${isSelected ? 'bg-indigo-900/30 text-indigo-100' : 'hover:bg-slate-800 text-slate-300'}
                  `}
                >
                  <td className="p-3 font-bold text-slate-500">{proc.pid}</td>
                  <td className="p-3 text-slate-500">
                    <span 
                        title={`Parent: ${parentName}`} 
                        className="border-b border-dotted border-slate-600 hover:text-slate-300 hover:border-slate-400 cursor-help transition-colors"
                    >
                        {proc.parentPid}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                        {proc.riskLevel === RiskLevel.MALICIOUS && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>}
                        {proc.riskLevel === RiskLevel.SUSPICIOUS && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>}
                        {proc.name}
                    </div>
                  </td>
                  <td className="p-3 text-slate-400 text-xs">{proc.user}</td>
                  <td className={`p-3 text-right font-bold ${proc.cpu > 50 ? 'text-red-400' : 'text-slate-300'}`}>
                    {proc.cpu.toFixed(1)}
                  </td>
                  <td className="p-3 text-right text-slate-400">
                    {proc.memory.toLocaleString()}
                  </td>
                  <td className={`p-3 text-right ${proc.networkIo > 1000 ? 'text-yellow-400' : 'text-slate-400'}`}>
                    {proc.networkIo.toFixed(1)}
                  </td>
                  <td className="p-3 text-right text-slate-400">
                    {proc.handleCount.toLocaleString()}
                  </td>
                  <td className={`p-3 text-right ${proc.entropy > 7 ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                    {proc.entropy.toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    {proc.isSigned ? (
                        <span className="text-emerald-500">✓</span>
                    ) : (
                        <span className="text-red-500">✕</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTerminate(proc.pid);
                        }}
                        className="text-[10px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-2 py-1 rounded transition-all uppercase tracking-wider"
                    >
                        KILL
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
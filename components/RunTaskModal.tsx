import React from 'react';

interface RunTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: () => void;
  onBrowse: () => void;
  inputValue: string;
  setInputValue: (val: string) => void;
}

export const RunTaskModal: React.FC<RunTaskModalProps> = ({
  isOpen, onClose, onRun, onBrowse, inputValue, setInputValue
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[480px] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <span className="font-bold text-slate-200 text-sm font-mono">Create new task</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>
        <div className="p-4 flex gap-4">
           <div className="w-12 h-12 bg-indigo-600/20 rounded border border-indigo-500/30 flex items-center justify-center text-2xl shrink-0">
             🚀
           </div>
           <div className="flex-1 space-y-4">
             <p className="text-xs text-slate-300 leading-relaxed font-mono">
               Type the name of a program, folder, document, or Internet resource, and Sentinel AI will open it for you.
             </p>
             <div className="flex items-center gap-3">
               <label className="text-sm font-bold text-slate-400 font-mono">Open:</label>
               <input
                 type="text"
                 value={inputValue}
                 onChange={(e) => setInputValue(e.target.value)}
                 className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                 autoFocus
                 onKeyDown={(e) => e.key === 'Enter' && onRun()}
               />
             </div>
             <div className="flex items-center gap-2">
                <input type="checkbox" id="admin" className="rounded bg-slate-950 border-slate-700 accent-indigo-500" />
                <label htmlFor="admin" className="text-[10px] text-slate-500 select-none font-mono uppercase tracking-wide">Create this task with administrative privileges.</label>
             </div>
           </div>
        </div>
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
            <button onClick={onRun} disabled={!inputValue.trim()} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono uppercase tracking-wider rounded shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:shadow-none">OK</button>
            <button onClick={onClose} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono uppercase tracking-wider rounded border border-slate-700 transition-colors">Cancel</button>
            <button onClick={onBrowse} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono uppercase tracking-wider rounded border border-slate-700 transition-colors">Browse...</button>
        </div>
      </div>
    </div>
  );
};
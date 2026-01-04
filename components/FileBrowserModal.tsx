import React, { useState, useEffect } from 'react';

interface FileSystemItem {
  name: string;
  type: 'folder' | 'file';
  children?: FileSystemItem[];
}

const MOCK_FS: FileSystemItem = {
  name: 'C:',
  type: 'folder',
  children: [
    {
      name: 'Windows',
      type: 'folder',
      children: [
        {
          name: 'System32',
          type: 'folder',
          children: [
            { name: 'notepad.exe', type: 'file' },
            { name: 'calc.exe', type: 'file' },
            { name: 'taskmgr.exe', type: 'file' },
            { name: 'cmd.exe', type: 'file' },
            { name: 'regedit.exe', type: 'file' },
          ],
        },
      ],
    },
    {
      name: 'Program Files',
      type: 'folder',
      children: [
        {
          name: 'Sentinel AI',
          type: 'folder',
          children: [{ name: 'Sentinel.exe', type: 'file' }],
        },
        {
          name: 'Google',
          type: 'folder',
          children: [
             { name: 'Chrome', type: 'folder', children: [{ name: 'chrome.exe', type: 'file' }]}
          ]
        },
        {
          name: 'Internet Explorer',
          type: 'folder',
          children: [{ name: 'iexplore.exe', type: 'file' }],
        },
      ],
    },
    {
      name: 'Users',
      type: 'folder',
      children: [
        {
          name: 'Admin',
          type: 'folder',
          children: [
            {
              name: 'Downloads',
              type: 'folder',
              children: [
                { name: 'steam_setup.exe', type: 'file' },
                { name: 'unknown_cheat_tool.exe', type: 'file' },
                { name: 'free_ram_downloader.exe', type: 'file' },
              ],
            },
            {
                name: 'Documents',
                type: 'folder',
                children: [
                    { name: 'report.docx', type: 'file' }, 
                    { name: 'invoice.pdf', type: 'file' } // Not executables, but for flavor
                ]
            }
          ],
        },
      ],
    },
  ],
};

interface FileBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (fullPath: string) => void;
}

export const FileBrowserModal: React.FC<FileBrowserModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [currentPath, setCurrentPath] = useState<string[]>(['C:']);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentPath(['C:']);
      setSelectedFile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Resolve current folder children
  const getCurrentFolder = () => {
    let current: FileSystemItem | undefined = MOCK_FS;
    // Root check
    if (currentPath[0] !== 'C:') return null;
    
    for (let i = 1; i < currentPath.length; i++) {
        current = current?.children?.find(c => c.name === currentPath[i]);
    }
    return current;
  };

  const currentFolder = getCurrentFolder();
  const items = currentFolder?.children || [];

  const handleNavigate = (folderName: string) => {
    setCurrentPath([...currentPath, folderName]);
    setSelectedFile(null);
  };

  const handleUp = () => {
    if (currentPath.length > 1) {
      setCurrentPath(currentPath.slice(0, -1));
      setSelectedFile(null);
    }
  };

  const handleSelect = () => {
      if (selectedFile) {
          const fullPath = [...currentPath, selectedFile].join('\\');
          onSelect(fullPath);
      }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-950 p-3 border-b border-slate-800 flex justify-between items-center">
          <span className="font-mono text-sm font-bold text-slate-200">
            Browse
          </span>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Address Bar */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex gap-2">
            <button 
                onClick={handleUp}
                disabled={currentPath.length === 1}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
                ↑
            </button>
            <div className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1 text-sm font-mono text-slate-300 flex items-center">
                {currentPath.join('\\')}\\
            </div>
        </div>

        {/* File List */}
        <div className="flex-1 h-64 overflow-y-auto p-2 bg-slate-900 custom-scrollbar">
            <div className="grid grid-cols-1 gap-1">
                {items.length === 0 && (
                    <div className="text-slate-600 text-sm font-mono p-4 text-center">Empty Directory</div>
                )}
                {items.map((item, idx) => (
                    <div 
                        key={idx}
                        onClick={() => item.type === 'folder' ? handleNavigate(item.name) : setSelectedFile(item.name)}
                        onDoubleClick={() => item.type === 'folder' ? handleNavigate(item.name) : handleSelect()}
                        className={`
                            flex items-center gap-3 p-2 rounded cursor-pointer font-mono text-sm group
                            ${item.name === selectedFile ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-100' : 'hover:bg-slate-800 border border-transparent text-slate-300'}
                        `}
                    >
                        <span className="text-lg opacity-80 group-hover:scale-110 transition-transform">
                            {item.type === 'folder' ? '📁' : (item.name.endsWith('.exe') ? '🚀' : '📄')}
                        </span>
                        <span>{item.name}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono uppercase text-slate-400 hover:text-slate-200 transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSelect}
                disabled={!selectedFile}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono uppercase rounded shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                Open
            </button>
        </div>
      </div>
    </div>
  );
};
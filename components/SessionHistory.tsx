import React from 'react';
import { Session } from '../types';
import { HistoryIcon, TrashIcon, ReplayIcon, DownloadIcon } from './icons';

interface SessionHistoryProps {
  sessions: Session[];
  onLoadSession: (session: Session) => void;
  onClearHistory: () => void;
  activeSessionId: string | null;
}

const SessionHistory: React.FC<SessionHistoryProps> = ({ sessions, onLoadSession, onClearHistory, activeSessionId }) => {
  
  const handleExport = (session: Session) => {
    const jsonString = JSON.stringify(session, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = session.goal.toLowerCase().replace(/\s+/g, '_').substring(0, 20) || 'session';
    link.href = url;
    link.download = `${fileName}_log.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-base-200/70 border border-base-300 rounded-lg flex flex-col h-full">
      <div className="p-4 border-b border-base-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-brand-secondary" />
            <h2 className="text-lg font-semibold text-white">Session History</h2>
        </div>
        {sessions.length > 0 && (
            <button 
                onClick={onClearHistory}
                className="p-1.5 text-content-200 hover:text-red-400 hover:bg-red-500/20 rounded-full transition-colors"
                aria-label="Clear all history"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        )}
      </div>
      <div className="p-4 space-y-3 overflow-y-auto">
        {sessions.length === 0 ? (
            <p className="text-sm text-content-200 text-center py-8">No sessions yet. Your runs will be saved here.</p>
        ) : (
            sessions.map(session => (
                <div 
                    key={session.id} 
                    className={`p-3 rounded-md transition-all ${activeSessionId === session.id ? 'bg-brand-primary/30 ring-1 ring-brand-secondary' : 'bg-base-200'}`}
                >
                    <p className={`font-semibold truncate ${activeSessionId === session.id ? 'text-white' : 'text-content-100'}`}>
                        {session.goal}
                    </p>
                    <p className="text-xs text-content-200 mt-1">
                        {new Date(session.timestamp).toLocaleString()}
                        {session.error && <span className="ml-2 text-red-400 font-semibold">Failed</span>}
                        {session.artifact && <span className="ml-2 text-green-400 font-semibold">Completed</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <button 
                            onClick={() => onLoadSession(session)}
                            className="flex-1 text-sm px-2 py-1 bg-base-300 hover:bg-brand-secondary text-content-100 hover:text-white rounded-md transition-colors flex items-center justify-center gap-1.5"
                        >
                            <ReplayIcon className="w-4 h-4"/>
                            View
                        </button>
                        <button 
                            onClick={() => handleExport(session)}
                            className="flex-1 text-sm px-2 py-1 bg-base-300 hover:bg-brand-secondary text-content-100 hover:text-white rounded-md transition-colors flex items-center justify-center gap-1.5"
                        >
                             <DownloadIcon className="w-4 h-4"/>
                            Export
                        </button>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default SessionHistory;
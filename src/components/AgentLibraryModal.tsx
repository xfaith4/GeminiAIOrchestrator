import React, { useEffect, useState } from 'react';
import { BeakerIcon, XMarkIcon } from './icons';
import { AGENT_DETAILS } from '../../constants';
import { Agent } from '../types';

interface AgentLibraryModalProps {
  onClose: () => void;
}

const AgentLibraryModal: React.FC<AgentLibraryModalProps> = ({ onClose }) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent>('Supervisor');
  const agentList = Object.keys(AGENT_DETAILS) as Agent[];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-base-200 border border-base-300 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 flex items-center justify-between border-b border-base-300 flex-shrink-0">
          <div className="flex items-center gap-3">
            <BeakerIcon className="w-7 h-7 text-brand-secondary" />
            <h2 className="text-xl font-bold text-white">Agent & Tool Library</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-content-200 hover:bg-base-300 hover:text-white transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>
        
        <main className="flex-grow flex min-h-0">
            <nav className="w-1/3 border-r border-base-300 overflow-y-auto p-4 space-y-2">
                {agentList.map(agentName => (
                    <button key={agentName} onClick={() => setSelectedAgent(agentName)}
                        className={`w-full text-left p-3 rounded-md text-sm transition-colors ${selectedAgent === agentName ? 'bg-brand-primary/50 text-white font-semibold' : 'hover:bg-base-300'}`}
                    >
                        {agentName}
                    </button>
                ))}
            </nav>
            <section className="w-2/3 overflow-y-auto p-6 text-content-100 space-y-6">
                <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{selectedAgent}</h3>
                    <p className="text-content-200">{AGENT_DETAILS[selectedAgent].description}</p>
                </div>
                <div>
                    <h4 className="text-lg font-semibold text-brand-secondary mb-2">Tools</h4>
                    {AGENT_DETAILS[selectedAgent].tools.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                            {AGENT_DETAILS[selectedAgent].tools.map(tool => <li key={tool} className="font-mono text-sm">{tool}</li>)}
                        </ul>
                    ) : (
                        <p className="text-sm text-content-200 italic">This agent uses its internal reasoning capabilities and does not require external tools.</p>
                    )}
                </div>
                 <div>
                    <h4 className="text-lg font-semibold text-brand-secondary mb-2">System Prompt</h4>
                    <pre className="whitespace-pre-wrap bg-base-300/50 p-4 rounded-md font-mono text-xs text-content-200 leading-relaxed">
                        {AGENT_DETAILS[selectedAgent].prompt || 'N/A'}
                    </pre>
                 </div>
            </section>
        </main>
      </div>
    </div>
  );
};

export default AgentLibraryModal;

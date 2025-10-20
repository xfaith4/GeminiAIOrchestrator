import React, { useEffect } from 'react';
import { InformationCircleIcon, XMarkIcon } from './icons';

interface ReadmeModalProps {
  onClose: () => void;
}

const ReadmeModal: React.FC<ReadmeModalProps> = ({ onClose }) => {
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
        className="bg-base-200 border border-base-300 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 flex items-center justify-between border-b border-base-300">
          <div className="flex items-center gap-3">
            <InformationCircleIcon className="w-7 h-7 text-brand-secondary" />
            <h2 className="text-xl font-bold text-white">Read Me: Agentic Workflow Orchestrator</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-content-200 hover:bg-base-300 hover:text-white transition-colors"
            aria-label="Close Read Me"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>
        
        <main className="p-6 overflow-y-auto text-content-100 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-brand-secondary mb-2">Capabilities</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong className="text-white">Goal-Oriented Planning:</strong> You provide a high-level goal, and a Supervisor agent breaks it down into a logical, step-by-step plan.
              </li>
              <li>
                <strong className="text-white">Specialized Agents & Tool Use:</strong> The plan is executed by a team of specialized agents. Some agents think (e.g., Report Writer), while others act by using tools (e.g., the `GitHub Tool User` can read from public repositories).
              </li>
              <li>
                <strong className="text-white">Stateful Memory (Scratchpad):</strong> Agents share a common "scratchpad" where the results of each step are stored, providing context for subsequent steps.
              </li>
              <li>
                <strong className="text-white">Quality Assurance & Self-Correction:</strong> A Reviewer agent inspects the output of each step. If the quality is low, it provides feedback, and the original agent attempts the task again, learning from its mistake.
              </li>
              <li>
                <strong className="text-white">Transparent Process:</strong> The entire workflow, including the plan, agent activities, and the scratchpad, is visualized in real-time, offering a clear view into the AI's "thinking" process.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">Limitations</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong className="text-white">Sequential Execution:</strong> This orchestrator processes one step at a time. It does not support parallel task execution.
              </li>
              <li>
                <strong className="text-white">GitHub Tool Constraints:</strong> The code review tool only works on public repositories and analyzes a maximum of 5 files to manage complexity and API limits. It cannot clone repositories or run code.
              </li>
              <li>
                <strong className="text-white">Stateless Sessions:</strong> Each goal execution is independent. The agents have no long-term memory of past goals or interactions.
              </li>
               <li>
                <strong className="text-white">Demonstration Tool:</strong> This application is for demonstration purposes. Do not input sensitive or confidential information.
              </li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReadmeModal;
import React, { forwardRef } from 'react';
import { LogEntry } from '../types';
import { LogIcon, UserIcon, OrchestratorIcon, SupervisorIcon, ReviewerIcon, AgentIcon, ExclamationTriangleIcon, GitHubIcon } from './icons';

interface ActivityLogProps {
  logEntries: LogEntry[];
}

const getAgentIcon = (entry: LogEntry) => {
    if (entry.type === 'warning' || entry.type === 'error') {
        return <ExclamationTriangleIcon className="w-5 h-5" />;
    }
    switch(entry.agent) {
        case 'User': return <UserIcon className="w-5 h-5" />;
        case 'Orchestrator': return <OrchestratorIcon className="w-5 h-5" />;
        case 'Supervisor': return <SupervisorIcon className="w-5 h-5" />;
        case 'Reviewer': return <ReviewerIcon className="w-5 h-5" />;
        case 'GitHub Tool User': return <GitHubIcon className="w-5 h-5" />;
        default: return <AgentIcon className="w-5 h-5" />;
    }
}

const getIconBgColor = (type: LogEntry['type']) => {
    switch (type) {
        case 'warning': return 'bg-yellow-500/30 text-yellow-300';
        case 'error': return 'bg-red-500/30 text-red-300';
        default: return 'bg-base-300 text-content-200';
    }
}


const ActivityLog = forwardRef<HTMLDivElement, ActivityLogProps>(({ logEntries }, ref) => {
  return (
    <div className="bg-base-200/70 border border-base-300 rounded-lg flex flex-col h-full">
      <div className="p-4 border-b border-base-300 flex items-center gap-2">
        <LogIcon className="w-6 h-6 text-brand-secondary" />
        <h2 className="text-lg font-semibold text-white">Activity Log</h2>
      </div>
      <div ref={ref} className="p-4 space-y-4 overflow-y-auto font-mono text-xs">
        {logEntries.map((entry, index) => (
          <div key={index} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`p-1.5 rounded-full ${getIconBgColor(entry.type)}`}>
                {getAgentIcon(entry)}
              </div>
              {index < logEntries.length -1 && <div className="w-px h-full bg-base-300"></div>}
            </div>
            <div className="flex-1 pb-4">
              <p className="font-semibold text-content-100 mb-1">
                {entry.agent}
                <span className="text-content-200 font-normal ml-2">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
              </p>
              <p className={`whitespace-pre-wrap leading-relaxed ${entry.type === 'warning' ? 'text-yellow-300' : 'text-content-200'}`}>
                {entry.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default ActivityLog;
import React, { useState } from 'react';
import { TestResult, LogEntry } from '../types';
import { BeakerIcon, CheckCircleIcon, ExclamationTriangleIcon, OrchestratorIcon, SupervisorIcon, ReviewerIcon, AgentIcon, GitHubIcon, UserIcon } from './icons';

interface OrchestratorTestRunnerProps {
    onRunTest: () => Promise<TestResult>;
    results: TestResult | null;
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

const OrchestratorTestRunner: React.FC<OrchestratorTestRunnerProps> = ({ onRunTest, results }) => {
    const [isTesting, setIsTesting] = useState(false);

    const handleRun = async () => {
        setIsTesting(true);
        await onRunTest();
        setIsTesting(false);
    };

    return (
        <div className="bg-base-200/70 border border-base-300 rounded-lg flex flex-col">
            <div className="p-4 border-b border-base-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BeakerIcon className="w-6 h-6 text-brand-secondary" />
                    <h2 className="text-lg font-semibold text-white">Orchestrator Test Runner</h2>
                </div>
                <button
                    onClick={handleRun}
                    disabled={isTesting}
                    className="px-3 py-1.5 text-sm bg-brand-secondary hover:bg-brand-primary text-white rounded-md transition-colors disabled:bg-base-300 disabled:cursor-not-allowed"
                >
                    {isTesting ? 'Running...' : 'Run GitHub Test Suite'}
                </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-96">
                {!results && !isTesting && (
                    <p className="text-sm text-content-200 text-center py-4">Click the button to run an automated test of the GitHub code review workflow using mock data.</p>
                )}
                {isTesting && (
                     <p className="text-sm text-content-200 text-center py-4">Test in progress...</p>
                )}
                {results && (
                    <div>
                        <div className={`mb-4 p-2 rounded-md flex items-center gap-2 text-md font-semibold ${results.passed ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {results.passed ? <CheckCircleIcon className="w-6 h-6"/> : <ExclamationTriangleIcon className="w-6 h-6"/>}
                            Test Suite {results.passed ? 'Passed' : 'Failed'}
                        </div>
                         <div className="space-y-4 font-mono text-xs">
                            {results.logs.map((entry, index) => (
                                <div key={index} className="flex gap-3">
                                    <div className={`p-1.5 rounded-full ${getIconBgColor(entry.type)}`}>
                                        {getAgentIcon(entry)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-content-100 mb-1">{entry.agent}</p>
                                        <p className={`whitespace-pre-wrap leading-relaxed ${entry.type === 'error' ? 'text-red-300' : 'text-content-200'}`}>
                                            {entry.message}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrchestratorTestRunner;

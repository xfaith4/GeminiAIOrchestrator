import React from 'react';
import { PlanStep, PlanState } from '../types';
import { PlanIcon, CheckCircleIcon, AgentIcon } from './icons';
import Loader from './Loader';

interface PlanDisplayProps {
  plan: PlanStep[];
  currentStepIndex: number;
  planState: PlanState;
  onApprovePlan: () => void;
}

const PlanDisplay: React.FC<PlanDisplayProps> = ({ plan, currentStepIndex, planState, onApprovePlan }) => {
  return (
    <div className="bg-base-200/70 border border-base-300 rounded-lg flex flex-col h-full">
      <div className="p-4 border-b border-base-300 flex items-center gap-2">
        <PlanIcon className="w-6 h-6 text-brand-secondary" />
        <h2 className="text-lg font-semibold text-white">Execution Plan</h2>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto flex-grow">
        {planState === 'generating' && <Loader message="Supervisor is generating plan..."/>}
        
        {plan.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div key={step.step} className={`p-3 rounded-md transition-all ${isCurrent ? 'bg-brand-primary/30 ring-1 ring-brand-secondary' : isCompleted ? 'bg-green-500/10' : 'bg-base-200'}`}>
              <div className="flex items-start gap-3">
                {isCompleted ? (
                  <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <div className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${isCurrent ? 'bg-brand-secondary text-white' : 'bg-base-300 text-content-100'}`}>
                    {step.step}
                  </div>
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${isCurrent ? 'text-white' : 'text-content-100'}`}>{step.task}</p>
                  <div className="text-xs text-content-200 flex items-center gap-4 mt-1.5">
                    <span className="flex items-center gap-1.5">
                      <AgentIcon className="w-4 h-4" />
                      {step.agent}
                    </span>
                    {step.dependencies && step.dependencies.length > 0 && step.dependencies[0] !== 0 && (
                       <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          Depends on: {step.dependencies.join(', ')}
                       </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
       {planState === 'awaitingApproval' && (
            <div className="p-4 border-t border-base-300">
                <button 
                    onClick={onApprovePlan}
                    className="w-full px-4 py-3 bg-brand-secondary hover:bg-brand-primary text-white font-bold rounded-md transition-colors flex items-center justify-center gap-2"
                >
                    <CheckCircleIcon className="w-6 h-6" />
                    Approve & Run Plan
                </button>
            </div>
        )}
    </div>
  );
};

export default PlanDisplay;

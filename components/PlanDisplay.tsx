import React from 'react';
import { PlanStep } from '../types';
import { PlanIcon, CheckCircleIcon, AgentIcon } from './icons';

interface PlanDisplayProps {
  plan: PlanStep[];
  currentStepIndex: number;
}

const PlanDisplay: React.FC<PlanDisplayProps> = ({ plan, currentStepIndex }) => {
  return (
    <div className="bg-base-200/70 border border-base-300 rounded-lg flex flex-col h-full">
      <div className="p-4 border-b border-base-300 flex items-center gap-2">
        <PlanIcon className="w-6 h-6 text-brand-secondary" />
        <h2 className="text-lg font-semibold text-white">Execution Plan</h2>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto">
        {plan.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div key={step.step} className={`p-3 rounded-md transition-all ${isCurrent ? 'bg-brand-primary/30 ring-1 ring-brand-secondary' : isCompleted ? 'bg-green-500/10' : 'bg-base-200'}`}>
              <div className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
                ) : (
                  <div className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${isCurrent ? 'bg-brand-secondary text-white' : 'bg-base-300 text-content-100'}`}>
                    {step.step}
                  </div>
                )}
                <div>
                  <p className={`font-semibold ${isCurrent ? 'text-white' : 'text-content-100'}`}>{step.task}</p>
                  <p className="text-xs text-content-200 flex items-center gap-1.5 mt-1">
                    <AgentIcon className="w-4 h-4" />
                    {step.agent}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlanDisplay;

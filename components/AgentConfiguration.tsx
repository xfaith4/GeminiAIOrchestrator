import React from 'react';
import { WorkerAgent } from '../types';
import { AVAILABLE_MODELS } from '../constants';
import { BotIcon } from './icons';

interface AgentConfigurationProps {
  agents: WorkerAgent[];
  setAgents: React.Dispatch<React.SetStateAction<WorkerAgent[]>>;
  scorerModel: string;
  setScorerModel: React.Dispatch<React.SetStateAction<string>>;
}

const AgentConfiguration: React.FC<AgentConfigurationProps> = ({ agents, setAgents, scorerModel, setScorerModel }) => {
  const handleAgentChange = (index: number, field: keyof WorkerAgent, value: string) => {
    const newAgents = [...agents];
    newAgents[index] = { ...newAgents[index], [field]: value };
    setAgents(newAgents);
  };

  const commonSelectClasses = "w-full bg-base-200/50 border border-base-300 rounded-md p-2 text-sm text-content-100 focus:ring-1 focus:ring-brand-secondary focus:border-transparent transition-shadow";
  const commonLabelClasses = "block text-xs font-medium text-content-200 mb-1";

  return (
    <div className="space-y-4">
      {agents.map((agent, index) => (
        <div key={index} className="bg-base-100/50 p-4 rounded-lg border border-base-300 transition-shadow hover:shadow-lg hover:border-brand-secondary/50">
          <div className="flex items-center gap-3 mb-3">
            <BotIcon className="w-6 h-6 text-brand-secondary flex-shrink-0" />
            <input
              type="text"
              value={agent.name}
              onChange={(e) => handleAgentChange(index, 'name', e.target.value)}
              className="bg-transparent font-semibold text-white w-full border-none focus:ring-0 p-0 text-lg"
              aria-label={`Agent ${index + 1} name`}
            />
          </div>
          <div className="space-y-3">
            <div>
                <label htmlFor={`system-instruction-${index}`} className={commonLabelClasses}>System Instruction</label>
                <textarea
                    id={`system-instruction-${index}`}
                    value={agent.systemInstruction}
                    onChange={(e) => handleAgentChange(index, 'systemInstruction', e.target.value)}
                    rows={3}
                    className={`${commonSelectClasses} resize-y`}
                    aria-label={`Agent ${index + 1} system instruction`}
                />
            </div>
            <div>
                <label htmlFor={`model-${index}`} className={commonLabelClasses}>Model</label>
                <select
                    id={`model-${index}`}
                    value={agent.model}
                    onChange={(e) => handleAgentChange(index, 'model', e.target.value)}
                    className={commonSelectClasses}
                    aria-label={`Agent ${index + 1} model`}
                >
                    {AVAILABLE_MODELS.map(model => (
                        <option key={model} value={model}>{model}</option>
                    ))}
                </select>
            </div>
          </div>
        </div>
      ))}
      
      {/* Scorer Agent Description */}
      <div className="bg-base-100/50 p-4 rounded-lg border border-base-300">
        <div className="flex items-center gap-3 mb-3">
            <BotIcon className="w-6 h-6 text-content-200 flex-shrink-0" />
            <h4 className="font-semibold text-white text-lg">Scorer Agent</h4>
        </div>
        <div className="pl-9 space-y-3">
            <p className="text-sm text-content-200">
            This agent evaluates the responses from the worker agents based on the original prompt, assigning a score and providing reasoning. It ensures the final answer is of high quality.
            </p>
             <div>
                <label htmlFor="scorer-model" className={commonLabelClasses}>Model</label>
                <select
                    id="scorer-model"
                    value={scorerModel}
                    onChange={(e) => setScorerModel(e.target.value)}
                    className={commonSelectClasses}
                    aria-label="Scorer agent model"
                >
                    {AVAILABLE_MODELS.map(model => (
                        <option key={model} value={model}>{model}</option>
                    ))}
                </select>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AgentConfiguration;

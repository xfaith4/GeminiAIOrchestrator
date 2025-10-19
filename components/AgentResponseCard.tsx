
import React from 'react';
import { AgentResponse } from '../types';
import { BotIcon, StarIcon } from './icons';

interface AgentResponseCardProps {
  response: AgentResponse;
  isChosen: boolean;
}

const AgentResponseCard: React.FC<AgentResponseCardProps> = ({ response, isChosen }) => {
  const scoreColor = response.score 
    ? response.score >= 8 ? 'text-green-400' 
    : response.score >= 5 ? 'text-yellow-400' 
    : 'text-red-400' 
    : 'text-content-200';

  const borderColor = isChosen 
    ? 'border-brand-secondary ring-2 ring-brand-secondary' 
    : 'border-base-300';
  
  return (
    <div className={`bg-base-200 p-4 rounded-lg border transition-all duration-300 ${borderColor}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <BotIcon className="w-5 h-5 text-content-200" />
          <h3 className="font-semibold text-white">{response.agentName}</h3>
        </div>
        {response.score !== null && (
          <div className={`flex items-center gap-1 font-bold text-lg ${scoreColor}`}>
            <StarIcon className="w-5 h-5" />
            <span>{response.score}/10</span>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <p className="text-sm text-content-100 whitespace-pre-wrap">{response.response || "Agent is thinking..."}</p>
        {response.reasoning && (
           <div className="text-xs italic text-content-200 bg-base-100/50 p-2 rounded">
             <strong>Scorer's Reasoning:</strong> {response.reasoning}
           </div>
        )}
      </div>
    </div>
  );
};

export default AgentResponseCard;

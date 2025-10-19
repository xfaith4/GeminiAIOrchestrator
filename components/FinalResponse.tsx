
import React from 'react';
import { AgentResponse } from '../types';
import { CheckCircleIcon } from './icons';

interface FinalResponseProps {
  response: AgentResponse;
}

const FinalResponse: React.FC<FinalResponseProps> = ({ response }) => {
  return (
    <div className="bg-gradient-to-br from-blue-900/50 to-base-200 p-6 rounded-lg border border-brand-secondary shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircleIcon className="w-8 h-8 text-green-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Final Answer</h2>
          <p className="text-content-200">Selected from <span className="font-semibold text-white">{response.agentName}</span> with a score of {response.score}/10</p>
        </div>
      </div>
      <p className="text-lg text-content-100 whitespace-pre-wrap leading-relaxed">
        {response.response}
      </p>
    </div>
  );
};

export default FinalResponse;

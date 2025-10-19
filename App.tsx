
import React, { useState, useCallback } from 'react';
import { AgentResponse } from './types';
import { WORKER_AGENTS } from './constants';
import { getWorkerResponses, getScorerResponse } from './services/geminiService';
import PromptInput from './components/PromptInput';
import AgentResponseCard from './components/AgentResponseCard';
import FinalResponse from './components/FinalResponse';
import Loader from './components/Loader';
import { BotIcon, SparklesIcon } from './components/icons';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [agentResponses, setAgentResponses] = useState<AgentResponse[]>([]);
  const [finalResponse, setFinalResponse] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (userPrompt: string) => {
    if (!userPrompt || isLoading) return;

    setIsLoading(true);
    setError(null);
    setAgentResponses([]);
    setFinalResponse(null);

    try {
      // Step 1: Get responses from all worker agents in parallel
      const workerResponsesText = await getWorkerResponses(userPrompt);
      const initialAgentResponses: AgentResponse[] = workerResponsesText.map((res, index) => ({
        agentName: WORKER_AGENTS[index].name,
        response: res,
        score: null,
        reasoning: null,
      }));
      setAgentResponses(initialAgentResponses);

      // Step 2: Get scores from the scorer agent
      const scores = await getScorerResponse(userPrompt, workerResponsesText);
      
      const scoredResponses = initialAgentResponses.map((res, index) => ({
        ...res,
        score: scores[index]?.score ?? 0,
        reasoning: scores[index]?.reasoning ?? 'No reasoning provided.',
      }));
      setAgentResponses(scoredResponses);

      // Step 3: Determine the best response
      const bestResponse = scoredResponses
        .filter(res => res.score && res.score >= 8)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

      setFinalResponse(bestResponse || null);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  return (
    <div className="min-h-screen bg-base-100 text-content-100 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <SparklesIcon className="w-8 h-8 text-brand-secondary" />
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              AI Agent Orchestrator
            </h1>
          </div>
          <p className="text-content-200">
            Four agents respond. One agent scores. The best answer (8/10+) is chosen.
          </p>
        </header>

        <main>
          <PromptInput
            prompt={prompt}
            setPrompt={setPrompt}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />

          {isLoading && <Loader />}
          
          {error && (
            <div className="mt-8 text-center bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {agentResponses.length > 0 && !isLoading && (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold mb-4 text-white flex items-center gap-2">
                <BotIcon className="w-6 h-6" />
                Agent Responses
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentResponses.map((res, index) => (
                  <AgentResponseCard 
                    key={index} 
                    response={res} 
                    isChosen={finalResponse?.agentName === res.agentName} 
                  />
                ))}
              </div>
            </div>
          )}
          
          {finalResponse && !isLoading && (
            <div className="mt-12">
              <FinalResponse response={finalResponse} />
            </div>
          )}

          {!finalResponse && agentResponses.length > 0 && !isLoading && (
             <div className="mt-12 text-center bg-base-200 p-8 rounded-lg border border-base-300">
                <h2 className="text-2xl font-bold text-white mb-2">No Suitable Response</h2>
                <p className="text-content-200">None of the agents produced a response that scored 8/10 or higher. Please try rephrasing your prompt.</p>
              </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;

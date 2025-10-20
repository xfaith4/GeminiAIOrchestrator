import React, { useState, useCallback } from 'react';
import { AgentResponse, WorkerAgent } from './types';
import { INITIAL_WORKER_AGENTS, PITCH_QUOTES, AGENT_TEMPLATES } from './constants';
import { getWorkerResponses, getScorerResponse } from './services/geminiService';
import PromptInput from './components/PromptInput';
import AgentResponseCard from './components/AgentResponseCard';
import FinalResponse from './components/FinalResponse';
import Loader from './components/Loader';
import AgentConfiguration from './components/AgentConfiguration';
import PitchCarousel from './components/PitchCarousel';
import AgentTemplates from './components/AgentTemplates';
import { BotIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon, CompanyLogoIcon } from './components/icons';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [agentResponses, setAgentResponses] = useState<AgentResponse[]>([]);
  const [finalResponse, setFinalResponse] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workerAgents, setWorkerAgents] = useState<WorkerAgent[]>(INITIAL_WORKER_AGENTS);
  const [scorerModel, setScorerModel] = useState<string>('gemini-2.5-pro');
  const [showConfig, setShowConfig] = useState<boolean>(false);

  const handleSelectTemplate = (agents: WorkerAgent[]) => {
    setWorkerAgents(agents);
  };

  const handleSubmit = useCallback(async (userPrompt: string) => {
    if (!userPrompt || isLoading) return;

    setIsLoading(true);
    setError(null);
    setAgentResponses([]);
    setFinalResponse(null);

    try {
      // Step 1: Get responses from all worker agents in parallel
      const workerResponsesText = await getWorkerResponses(userPrompt, workerAgents);
      const initialAgentResponses: AgentResponse[] = workerResponsesText.map((res, index) => ({
        agentName: workerAgents[index].name,
        response: res,
        score: null,
        reasoning: null,
      }));
      setAgentResponses(initialAgentResponses);

      // Step 2: Get scores from the scorer agent
      const scores = await getScorerResponse(userPrompt, workerResponsesText, scorerModel);
      
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
  }, [isLoading, workerAgents, scorerModel]);

  return (
    <div className="min-h-screen bg-base-100 text-content-100 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto flex flex-col flex-grow">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <CompanyLogoIcon className="w-10 h-10" />
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Agentic AI Orchestrator
            </h1>
            <SparklesIcon className="w-8 h-8 text-brand-secondary" />
          </div>
          <p className="text-content-200">
            Four agents respond. One agent scores. The best answer (8/10+) is chosen.
          </p>
          <PitchCarousel quotes={PITCH_QUOTES} />
        </header>

        <main className="flex-grow">
          <div className="mb-8">
              <div className="bg-base-200/70 border border-base-300 rounded-lg">
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="w-full flex justify-between items-center text-left text-lg font-semibold text-white p-4 hover:bg-base-300/50 rounded-t-lg transition-colors"
                    aria-expanded={showConfig}
                    aria-controls="agent-config"
                >
                    <span>Meet The Agents (Editable)</span>
                    {showConfig ? <ChevronUpIcon className="w-6 h-6" /> : <ChevronDownIcon className="w-6 h-6" />}
                </button>
                {showConfig && (
                    <div id="agent-config" className="p-4 border-t border-base-300">
                        <p className="text-content-200 mb-4 text-sm">
                            These AI agents work together on your request. You can load a pre-configured team or customize them individually.
                        </p>
                        <AgentTemplates templates={AGENT_TEMPLATES} onSelectTemplate={handleSelectTemplate} />
                        <AgentConfiguration 
                          agents={workerAgents} 
                          setAgents={setWorkerAgents} 
                          scorerModel={scorerModel}
                          setScorerModel={setScorerModel}
                        />
                    </div>
                )}
              </div>
          </div>

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
                <p className="text-content-200">None of the agents produced a response that scored 8/10 or higher. Please try rephrasing your prompt or adjusting the agents.</p>
              </div>
          )}
        </main>
        
        <footer className="text-center mt-12 py-4">
          <p className="text-xs text-content-200">
            Demonstration Purposes Only. Do Not Input Sensitive or Confidential Company Information.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PlanStep, LogEntry, UploadedFile } from './types';
import { createPlan, executeStep, reviewStep, synthesizeFinalArtifact } from './services/geminiService';
import * as githubService from './services/githubService';
import GoalInput from './components/GoalInput';
import Loader from './components/Loader';
import { CompanyLogoIcon, SparklesIcon, InformationCircleIcon } from './components/icons';
import PlanDisplay from './components/PlanDisplay';
import ActivityLog from './components/ActivityLog';
import ScratchpadDisplay from './components/ScratchpadDisplay';
import ReadmeModal from './components/ReadmeModal';

const MAX_RETRIES_PER_STEP = 2;

const App: React.FC = () => {
  const [goal, setGoal] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [plan, setPlan] = useState<PlanStep[]>([]);
  const [activityLog, setActivityLog] = useState<LogEntry[]>([]);
  const [scratchpad, setScratchpad] = useState<string>('');
  const [finalArtifact, setFinalArtifact] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isReadmeOpen, setIsReadmeOpen] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);


  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [activityLog]);

  const addLogEntry = (agent: string, message: string, type: LogEntry['type'] = 'info') => {
    setActivityLog(prev => [...prev, { agent, message, timestamp: new Date(), type }]);
  };
  
  const resetState = () => {
    setError(null);
    setPlan([]);
    setActivityLog([]);
    setScratchpad('');
    setFinalArtifact(null);
    setCurrentStepIndex(-1);
    setUploadedFile(null);
  };

  const executeGitHubTool = async (task: string, context: string): Promise<{ output: string }> => {
    const urlMatch = context.match(/https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+/);
    if (!urlMatch) {
      throw new Error("Could not find a valid GitHub repository URL in the context.");
    }
    const repoUrl = urlMatch[0];

    if (task.includes('Fetch the file tree')) {
      addLogEntry("GitHub Tool User", `Fetching file tree for ${repoUrl}...`);
      const tree = await githubService.getRepoTree(repoUrl);
      const filePaths = tree.map(file => file.path).join('\n');
      return { output: `File tree for ${repoUrl}:\n${filePaths}` };
    }

    if (task.includes('Fetch the content')) {
      // Extract file paths from the scratchpad (assuming the previous step listed them)
      const lastStepOutput = context.split('---').pop() || '';
      const filesToFetch = lastStepOutput.split('\n').map(f => f.trim()).filter(f => f.length > 0 && !f.startsWith('File tree for'));
      
      if (filesToFetch.length === 0) {
        throw new Error("No file paths were provided by the previous step to fetch.");
      }
      
      addLogEntry("GitHub Tool User", `Fetching content for ${filesToFetch.length} file(s): ${filesToFetch.join(', ')}`);
      const contents = await githubService.getFilesContent(repoUrl, filesToFetch);
      
      const combinedContent = contents.map(c => `--- FILE: ${c.path} ---\n${c.content}`).join('\n\n');
      return { output: combinedContent };
    }

    throw new Error(`Unknown GitHub tool task: ${task}`);
  };

  const executePlan = async (fullContext: string, plan: PlanStep[]) => {
    let currentScratchpadContent = `${fullContext}\n\n---\n`;
    setScratchpad(currentScratchpadContent);

    for (let i = 0; i < plan.length; i++) {
      setCurrentStepIndex(i);
      const step = plan[i];
      
      let approved = false;
      let retries = 0;
      let lastReviewReasoning = '';
      let stepOutput = '';

      if (step.agent === 'GitHub Tool User') {
        try {
            addLogEntry("Orchestrator", `Executing tool for step ${i + 1}: "${step.task}"`);
            const result = await executeGitHubTool(step.task, currentScratchpadContent);
            stepOutput = result.output;
            addLogEntry(step.agent, `Tool output:\n${stepOutput}`);
            approved = true; // Tool use is self-validating; it works or throws an error.
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during tool execution.';
            setError(errorMessage);
            addLogEntry("Orchestrator", `Error during tool execution for step ${i+1}: ${errorMessage}`, 'error');
            setIsLoading(false);
            return;
        }
      } else {
        while(retries <= MAX_RETRIES_PER_STEP && !approved) {
            const attemptMessage = retries > 0 ? `(Attempt ${retries + 1}/${MAX_RETRIES_PER_STEP + 1})` : '';
            addLogEntry("Orchestrator", `Executing step ${i + 1}: "${step.task}" with ${step.agent} agent. ${attemptMessage}`);
            
            try {
            const result = await executeStep(step, currentScratchpadContent, lastReviewReasoning);
            stepOutput = result.output;
            addLogEntry(step.agent, `Task output:\n${stepOutput}`);

            addLogEntry("Orchestrator", `Requesting review for step ${i + 1}.`);
            const review = await reviewStep(step, stepOutput, currentScratchpadContent);
            addLogEntry("Reviewer", `Decision: ${review.decision}. Reason: ${review.reasoning}`);

            if (review.decision.toUpperCase() === 'APPROVE') {
                approved = true;
            } else {
                retries++;
                lastReviewReasoning = review.reasoning;
                if (retries <= MAX_RETRIES_PER_STEP) {
                addLogEntry("Orchestrator", `Step requires revision. Feedback: "${lastReviewReasoning}". Retrying...`, 'warning');
                }
            }
            } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during step execution.';
            setError(errorMessage);
            addLogEntry("Orchestrator", `Error during step ${i+1}: ${errorMessage}`, 'error');
            setIsLoading(false);
            return;
            }
        }
      }

      if (!approved) {
        const errorMessage = `Execution halted. Step ${i + 1} failed after ${MAX_RETRIES_PER_STEP + 1} attempts.`;
        setError(errorMessage);
        addLogEntry("Orchestrator", errorMessage, 'error');
        setIsLoading(false);
        return;
      }

      currentScratchpadContent += `\n[Step ${i+1}: ${step.task} by ${step.agent} - APPROVED]\nResult:\n${stepOutput}\n---`;
      setScratchpad(currentScratchpadContent);
    }

    setCurrentStepIndex(plan.length);
    addLogEntry("Orchestrator", "All steps completed. Synthesizing final artifact.");
    try {
      const finalResult = await synthesizeFinalArtifact(currentScratchpadContent);
      setFinalArtifact(finalResult);
      addLogEntry("Synthesizer", "Final artifact generated successfully.");
    } catch(e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during synthesis.';
      setError(errorMessage);
      addLogEntry("Orchestrator", `Error during synthesis: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = useCallback(async (userGoal: string) => {
    if (!userGoal || isLoading) return;

    setGoal(userGoal);
    setIsLoading(true);
    resetState();

    let fullContext = `Goal: "${userGoal}"`;
    if (uploadedFile) {
      fullContext += `\n\n--- UPLOADED FILE CONTENT (${uploadedFile.name}) ---\n${uploadedFile.content}\n--- END FILE CONTENT ---`;
    }
    
    addLogEntry("User", fullContext);
    
    try {
      addLogEntry("Orchestrator", "Asking Supervisor to create a plan...");
      const newPlan = await createPlan(fullContext);
      setPlan(newPlan);
      addLogEntry("Supervisor", `Plan created with ${newPlan.length} steps.`);
      
      await executePlan(fullContext, newPlan);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      addLogEntry("Orchestrator", `Error: ${errorMessage}`, 'error');
      setIsLoading(false);
    }
  }, [isLoading, uploadedFile]);

  return (
    <>
      <div className="min-h-screen bg-base-100 text-content-100 font-sans flex flex-col p-4 sm:p-6">
        <div className="w-full max-w-7xl mx-auto flex flex-col flex-grow">
          <header className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-2 relative">
              <CompanyLogoIcon className="w-9 h-9" />
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Agentic Workflow Orchestrator
              </h1>
              <SparklesIcon className="w-8 h-8 text-brand-secondary" />
               <button 
                onClick={() => setIsReadmeOpen(true)}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-content-200 hover:text-white transition-colors"
                aria-label="Show Read Me"
              >
                <InformationCircleIcon className="w-7 h-7" />
              </button>
            </div>
            <p className="text-content-200 text-sm">
              An AI Supervisor creates a plan, agents execute it, and a reviewer ensures quality with self-correction.
            </p>
          </header>

          <main className="flex-grow flex flex-col">
            <GoalInput
              goal={goal}
              setGoal={setGoal}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              uploadedFile={uploadedFile}
              setUploadedFile={setUploadedFile}
            />
            
            {error && (
              <div className="mt-4 text-center bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
                <p className="font-bold">Execution Failed</p>
                <p>{error}</p>
              </div>
            )}

            {isLoading && !plan.length && <Loader message="Supervisor is creating a plan..." />}
            
            {plan.length > 0 && (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0">
                {/* Left Panel: Plan */}
                <div className="flex flex-col">
                  <PlanDisplay plan={plan} currentStepIndex={currentStepIndex} />
                </div>

                {/* Middle Panel: Activity Log */}
                <div className="flex flex-col">
                   <ActivityLog logEntries={activityLog} ref={logContainerRef} />
                </div>

                {/* Right Panel: Scratchpad & Final Artifact */}
                <div className="flex flex-col">
                  <ScratchpadDisplay
                    scratchpad={scratchpad}
                    finalArtifact={finalArtifact}
                    isLoading={isLoading && currentStepIndex >= plan.length}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      {isReadmeOpen && <ReadmeModal onClose={() => setIsReadmeOpen(false)} />}
    </>
  );
};

export default App;
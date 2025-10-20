import React, { useState, useEffect, useRef } from 'react';
import GoalInput from './components/GoalInput';
import PlanDisplay from './components/PlanDisplay';
import ActivityLog from './components/ActivityLog';
import ArtifactWorkspace from './components/ScratchpadDisplay';
import SessionHistory from './components/SessionHistory';
import ReadmeModal from './components/ReadmeModal';
import AgentLibraryModal from './components/AgentLibraryModal';
import OrchestratorTestRunner from './components/OrchestratorTestRunner';
import { InformationCircleIcon, OrchestratorIcon, BeakerIcon } from './components/icons';
import { Agent, LogEntry, PlanStep, Session, UploadedFile, OrchestrationParams, TestResult, Artifact, PlanState } from './types';
import * as geminiService from './services/geminiService';
import * as githubService from './services/githubService';
import * as mockGithubService from './services/__mocks__/githubService.mock';

const MAX_RETRIES = 2;

const runOrchestrationLogic = async ({
  goal,
  uploadedFile,
  plan,
  services,
  onLog,
  onScratchpadUpdate,
  onStepUpdate,
  onFinalArtifact,
}: OrchestrationParams & { plan: PlanStep[] }): Promise<{ finalScratchpad: string; finalArtifacts: Artifact[] }> => {
  
  let currentScratchpad = onScratchpadUpdate(''); // Initialize and get the initial value
  
  let context = `User Goal: ${goal}`;
  if (uploadedFile) {
    context += `\n\n--- FILE CONTENT (${uploadedFile.name}) ---\n${uploadedFile.content}`;
  }
  onLog('User', context);
  currentScratchpad = `INITIAL CONTEXT:\n${context}\n\n`;
  onScratchpadUpdate(currentScratchpad);

  // Plan is now created outside this function, so we log its reception.
  onLog('Supervisor', `Executing a ${plan.length}-step plan.`);

  for (let i = 0; i < plan.length; i++) {
    onStepUpdate(i);
    const step = plan[i];
    onLog('Orchestrator', `Executing Step ${step.step}: ${step.task} (Agent: ${step.agent})`);

    let stepOutput = '';
    let approved = false;
    let retryReasoning = '';
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            onLog('Orchestrator', `Retrying step (Attempt ${attempt})...`, 'warning');
        }
        
        try {
          switch(step.tool) {
            case 'github:getRepoTree': {
              if (!step.toolInput?.repoUrl) throw new Error("Missing repoUrl for getRepoTree tool.");
              onLog(step.agent, `Fetching file tree from ${step.toolInput.repoUrl}`);
              const tree = await services.github.getRepoTree({ repoUrl: step.toolInput.repoUrl });
              stepOutput = `File tree fetched successfully. Total files: ${tree.length}.\n${JSON.stringify(tree.map(f=>f.path), null, 2)}`;
              approved = true;
              break;
            }
            case 'gemini:selectFiles': {
              const result = await services.gemini.executeStepAsJson<{files: string[]}>(step, currentScratchpad, retryReasoning);
              stepOutput = JSON.stringify(result, null, 2);
              approved = true;
              break;
            }
            case 'github:getFilesContent': {
              if (!step.toolInput?.repoUrl) throw new Error("Missing repoUrl for getFilesContent tool.");

              const lastStepContent = currentScratchpad.split('--- STEP').pop() ?? '';
              const lastOutput = lastStepContent.split('OUTPUT ---')[1]?.split('--- END STEP')[0]?.trim();
              if (!lastOutput) throw new Error("Could not find output from previous step in scratchpad.");
              
              const { files: filePaths } = JSON.parse(lastOutput);
              if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) throw new Error("No file paths were provided by the previous step to fetch.");

              onLog(step.agent, `Fetching content for ${filePaths.length} file(s)`);
              const contents = await services.github.getFilesContent({ repoUrl: step.toolInput.repoUrl, paths: filePaths });
              stepOutput = `Fetched file contents:\n${contents.map(c => `--- FILE: ${c.path} ---\n${c.content}`).join('\n\n')}`;
              approved = true;
              break;
            }
            default: {
               const result = await services.gemini.executeStep(step, currentScratchpad, retryReasoning);
               stepOutput = result.output;
               onLog(step.agent, `Output:\n${stepOutput}`);

               onLog('Orchestrator', `Requesting review of step ${step.step} output...`);
               const review = await services.gemini.reviewStep(step, stepOutput, currentScratchpad);
               onLog('Reviewer', `Decision: ${review.decision}. Reasoning: ${review.reasoning}`);

               if (review.decision === 'APPROVE') {
                  approved = true;
               } else {
                  retryReasoning = review.reasoning;
                  if (attempt < MAX_RETRIES) {
                      onLog('Orchestrator', `Step needs revision. Reason: ${review.reasoning}`, 'warning');
                  }
               }
            }
          }
        } catch(e: any) {
            onLog(step.agent, `Execution failed: ${e.message}`, 'error');
            retryReasoning = `The step failed with an error: ${e.message}. You must fix this.`;
        }

        if (approved) {
          onLog(step.agent, `Output:\n${stepOutput}`);
          break;
        }
    }

    if (!approved) {
      throw new Error(`Step ${step.step} failed after ${MAX_RETRIES} retries.`);
    }
    currentScratchpad = `${currentScratchpad}\n--- STEP ${step.step} (Agent: ${step.agent}) OUTPUT ---\n${stepOutput}\n--- END STEP ${step.step} ---\n\n`;
    onScratchpadUpdate(currentScratchpad);
  }
  
  onStepUpdate(-1);
  onLog('Orchestrator', "All steps completed. Synthesizing final artifact workspace...");
  const artifacts = await services.gemini.synthesizeFinalArtifact(currentScratchpad);
  onFinalArtifact(artifacts);
  onLog('Synthesizer', `Final workspace created with ${artifacts.length} file(s).`);
  return { finalScratchpad: currentScratchpad, finalArtifacts: artifacts };
};

function App() {
  const [goal, setGoal] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [plan, setPlan] = useState<PlanStep[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [scratchpad, setScratchpad] = useState('');
  const [finalArtifacts, setFinalArtifacts] = useState<Artifact[] | null>(null);
  const [planState, setPlanState] = useState<PlanState>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isReadmeVisible, setIsReadmeVisible] = useState(false);
  const [isAgentLibraryVisible, setIsAgentLibraryVisible] = useState(false);
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem('agentic-sessions');
      if (savedSessions) setSessions(JSON.parse(savedSessions));
    } catch (error) { console.error("Failed to load sessions", error); }

    if (!localStorage.getItem('agentic-readme-shown')) {
        setIsReadmeVisible(true);
        localStorage.setItem('agentic-readme-shown', 'true');
    }
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logEntries]);

  const resetState = (isNewRun = false) => {
    if (isNewRun) setActiveSessionId(null);
    setGoal('');
    setUploadedFile(null);
    setPlan([]);
    setLogEntries([]);
    setScratchpad('');
    setFinalArtifacts(null);
    setPlanState('idle');
    setCurrentStepIndex(-1);
  };

  const saveSession = (data: Omit<Session, 'id' | 'timestamp'>) => {
    const id = activeSessionId || Date.now().toString();
    const newSession: Session = { id, timestamp: Date.now(), ...data };
    
    setSessions(prev => {
        const otherSessions = prev.filter(s => s.id !== id);
        const newSessions = [newSession, ...otherSessions];
        try {
            localStorage.setItem('agentic-sessions', JSON.stringify(newSessions));
        } catch (error) { console.error("Failed to save sessions", error); }
        return newSessions;
    });
    setActiveSessionId(id);
  };

  const handleNewRun = () => resetState(true);
  
  const handleLoadSession = (session: Session) => {
    resetState();
    setActiveSessionId(session.id);
    setGoal(session.goal);
    setUploadedFile(session.uploadedFile);
    setPlan(session.plan);
    setLogEntries(session.logEntries.map(l => ({ ...l, timestamp: new Date(l.timestamp) })));
    setScratchpad(session.scratchpad);
    setFinalArtifacts(session.artifacts);
    setPlanState('finished');
    setCurrentStepIndex(session.error || session.artifacts ? -1 : (session.plan?.length || 0) -1);
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure?")) {
      setSessions([]);
      localStorage.removeItem('agentic-sessions');
      handleNewRun();
    }
  };

  const handleStartPlanGeneration = async (userGoal: string) => {
    resetState();
    const newSessionId = Date.now().toString();
    setActiveSessionId(newSessionId);
    setPlanState('generating');
    setGoal(userGoal);
    
    let currentLogs: LogEntry[] = [];
    const addLogEntry = (agent: Agent, message: string, type: 'info' | 'warning' | 'error' = 'info') => {
      const newEntry = { timestamp: new Date(), agent, message, type };
      currentLogs = [...currentLogs, newEntry];
      setLogEntries(currentLogs);
    };

    try {
        let context = `User Goal: ${userGoal}`;
        if (uploadedFile) {
            context += `\n\n--- FILE CONTENT (${uploadedFile.name}) ---\n${uploadedFile.content}`;
        }
        addLogEntry('User', context);
        addLogEntry('Orchestrator', "Requesting plan from Supervisor...");
        const createdPlan = await geminiService.createPlan(context);
        setPlan(createdPlan);
        addLogEntry('Supervisor', `Created a ${createdPlan.length}-step plan. Awaiting user approval.`);
        setPlanState('awaitingApproval');
    } catch (error: any) {
        addLogEntry('Orchestrator', `Failed to generate a plan: ${error.message}`, 'error');
        setPlanState('idle');
        saveSession({ goal: userGoal, uploadedFile, plan:[], logEntries: currentLogs, scratchpad:'', artifacts: null, error: error.message });
    }
  };

  const handleExecutePlan = async () => {
    setPlanState('executing');
    
    let currentLogs: LogEntry[] = [...logEntries];
    const addLogEntry = (agent: Agent, message: string, type: 'info' | 'warning' | 'error' = 'info') => {
      const newEntry = { timestamp: new Date(), agent, message, type };
      currentLogs = [...currentLogs, newEntry];
      setLogEntries(currentLogs);
    };

    let currentScratchpad = scratchpad;
    const updateScratchpad = (newContent: string) => {
      currentScratchpad = newContent;
      setScratchpad(newContent);
      return newContent;
    }

    try {
      const { finalScratchpad, finalArtifacts } = await runOrchestrationLogic({
        goal,
        uploadedFile,
        plan,
        services: { gemini: geminiService, github: githubService },
        onLog: addLogEntry,
        onPlanUpdate: setPlan,
        onScratchpadUpdate: updateScratchpad,
        onStepUpdate: setCurrentStepIndex,
        onFinalArtifact: setFinalArtifacts,
      });
      setPlanState('finished');
      saveSession({ goal, uploadedFile, plan, logEntries: currentLogs, scratchpad: finalScratchpad, artifacts: finalArtifacts, error: null });
    } catch (error: any) {
      addLogEntry('Orchestrator', `An unexpected error occurred: ${error.message}`, 'error');
      setPlanState('finished');
      saveSession({ goal, uploadedFile, plan, logEntries: currentLogs, scratchpad: currentScratchpad, artifacts: null, error: error.message });
    }
  };


  const handleRunTestSuite = async (): Promise<TestResult> => {
    const testGoal = 'Perform a code review on the repository at https://github.com/test-owner/test-repo';
    const testLogs: LogEntry[] = [];
    let testError: string | null = null;
    try {
        const testPlan = await geminiService.createPlan(testGoal);
        await runOrchestrationLogic({
            goal: testGoal,
            uploadedFile: null,
            plan: testPlan,
            services: { gemini: geminiService, github: mockGithubService },
            onLog: (agent, message, type) => testLogs.push({ timestamp: new Date(), agent, message, type }),
            onPlanUpdate: () => {},
            onScratchpadUpdate: () => '',
            onStepUpdate: () => {},
            onFinalArtifact: () => {},
        });
    } catch (e: any) {
        testError = e.message;
        testLogs.push({ timestamp: new Date(), agent: 'Orchestrator', message: `Test failed: ${e.message}`, type: 'error' });
    }
    const result = { logs: testLogs, error: testError, passed: !testError };
    setTestResults(result);
    return result;
  };

  const isLoading = planState === 'generating' || planState === 'executing';

  return (
    <div className="bg-base-100 min-h-screen text-content-100 font-sans">
      <header className="p-4 flex justify-between items-center border-b border-base-300">
        <div className="flex items-center gap-3">
            <OrchestratorIcon className="w-8 h-8 text-brand-primary"/>
            <h1 className="text-2xl font-bold text-white">Agentic Workflow Orchestrator</h1>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setIsAgentLibraryVisible(true)} className="p-2 rounded-full text-content-200 hover:bg-base-300 hover:text-white transition-colors" aria-label="Show Agent Library">
                <BeakerIcon className="w-6 h-6"/>
            </button>
            <button onClick={() => setIsReadmeVisible(true)} className="p-2 rounded-full text-content-200 hover:bg-base-300 hover:text-white transition-colors" aria-label="Show Read Me">
                <InformationCircleIcon className="w-6 h-6"/>
            </button>
            <button onClick={handleNewRun} className="px-4 py-2 text-sm bg-brand-secondary hover:bg-brand-primary text-white rounded-md transition-colors">
                New Run
            </button>
        </div>
      </header>
      
      <main className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-screen-2xl mx-auto">
        <div className="lg:col-span-2 flex flex-col gap-4">
            <GoalInput 
                goal={goal} setGoal={setGoal} onSubmit={handleStartPlanGeneration} isLoading={isLoading}
                uploadedFile={uploadedFile} setUploadedFile={setUploadedFile}
                isSessionLoaded={!!activeSessionId && !isLoading}
                planState={planState}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow" style={{minHeight: '60vh'}}>
                <PlanDisplay 
                    plan={plan} 
                    currentStepIndex={currentStepIndex} 
                    planState={planState}
                    onApprovePlan={handleExecutePlan}
                />
                <ActivityLog ref={logContainerRef} logEntries={logEntries} />
            </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="h-[40vh] min-h-[300px]">
              <SessionHistory sessions={sessions} onLoadSession={handleLoadSession} onClearHistory={handleClearHistory} activeSessionId={activeSessionId} />
            </div>
            <div className="h-[50vh] min-h-[400px]">
              <ArtifactWorkspace scratchpad={scratchpad} finalArtifacts={finalArtifacts} isLoading={planState === 'executing' && plan.length > 0 && currentStepIndex === -1} goal={goal} />
            </div>
             <OrchestratorTestRunner onRunTest={handleRunTestSuite} results={testResults} />
        </div>
      </main>

      {isReadmeVisible && <ReadmeModal onClose={() => setIsReadmeVisible(false)} />}
      {isAgentLibraryVisible && <AgentLibraryModal onClose={() => setIsAgentLibraryVisible(false)} />}
    </div>
  );
}

export default App;
// ### BEGIN FILE: src/App.tsx
import { useState, useEffect, useRef } from 'react';
import GoalInput from './components/GoalInput';
import PlanDisplay from './components/PlanDisplay';
import ActivityLog from './components/ActivityLog';
import ArtifactWorkspace from './components/ScratchpadDisplay';
import SessionHistory from './components/SessionHistory';
import ReadmeModal from './components/ReadmeModal';
import AgentLibraryModal from './components/AgentLibraryModal';
import OrchestratorTestRunner from './components/OrchestratorTestRunner';
import { InformationCircleIcon, OrchestratorIcon, BeakerIcon, SunIcon, MoonIcon } from './components/icons';
import { appendRun } from './storage/costLedger';


import {
  Agent,
  LogEntry,
  PlanStep,
  Session,
  UploadedFile,
  OrchestrationParams,
  TestResult,
  Artifact,
  PlanState,
} from './types';

import * as geminiService from './geminiService';
import * as githubService from './githubService';

// For test runner mock
import * as mockGithubService from './services/githubService.mock';
import { selectFiles } from './services/selectServices';

// --- Normalizers (conform external results to our local types) ---

// Narrow unknown to our Agent union
const AGENTS: Agent[] = [
  'Supervisor',
  'Web Researcher',
  'Data Analyst',
  'Report Writer',
  'Code Generator',
  'GitHub Tool User',
  'Reviewer',
  'Synthesizer',
  'Orchestrator',
  'User',
];

function toAgent(v: any): Agent {
  const s = String(v ?? '').trim();
  const found = AGENTS.find(a => a.toLowerCase() === s.toLowerCase());
  return found ?? 'Supervisor';
}

// Map filename → our Artifact["language"] union
type Lang = Artifact['language'];
function guessLanguageByFilename(name: string): Lang {
  const ext = (name.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'md':  return 'markdown';
    case 'json':return 'json';
    case 'js':
    case 'jsx': return 'javascript';
    case 'py':  return 'python';
    case 'sql':
    case 'sqlite':
    case 'db': return 'sql';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
    case 'bmp':
    case 'ico': return 'image';
    case 'mp4':
    case 'webm':
    case 'avi':
    case 'mov':
    case 'mkv':
    case 'flv': return 'video';
    default:    return 'text';
  }
}

const toTypesPlanStep = (s: any, idx: number): PlanStep => ({
  step: typeof s?.step === 'number' ? s.step : idx + 1,
  task: String(s?.task ?? s),
  agent: toAgent(s?.agent),
  tool: s?.tool,
  toolInput: s?.toolInput,
  dependencies: Array.isArray(s?.dependencies) ? s.dependencies : [],
});

const toTypesArtifact = (f: any): Artifact => ({
  name: String(f?.name ?? f?.filename ?? 'artifact.txt'),
  content: String(f?.content ?? ''),
  language: (f?.language as Lang) ?? guessLanguageByFilename(f?.name ?? f?.filename ?? ''),
});

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
  onCost,
}: OrchestrationParams & { plan: PlanStep[] }): Promise<{ finalScratchpad: string; finalArtifacts: Artifact[] }> => {
  let currentScratchpad = onScratchpadUpdate('');

  let context = `User Goal: ${goal}`;
  if (uploadedFile) {
    context += `\n\n--- FILE CONTENT (${uploadedFile.name}) ---\n${uploadedFile.content}`;
  }
  onLog('User', context);

  currentScratchpad = `INITIAL CONTEXT:\n${context}\n\n`;
  onScratchpadUpdate(currentScratchpad);

  onLog('Supervisor', `Executing a ${plan.length}-step plan.`);

  for (let i = 0; i < plan.length; i++) {
    onStepUpdate(i);
    const step = plan[i];
    onLog('Orchestrator', `Executing Step ${step.step}: ${step.task} (Agent: ${step.agent})`);

    let stepOutput = '';
    let approved = false;
    let retryReasoning = '';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) onLog('Orchestrator', `Retrying step (Attempt ${attempt})...`, 'warning');

      try {
        switch (step.tool) {
          case 'github:getRepoTree': {
            if (!step.toolInput?.repoUrl) throw new Error('Missing repoUrl for getRepoTree tool.');
            onLog(step.agent, `Fetching file tree from ${step.toolInput.repoUrl}`);
            const tree = await services.github.getRepoTree({ repoUrl: step.toolInput.repoUrl });
            stepOutput = JSON.stringify(
              { message: `File tree fetched successfully. Total files: ${tree.length}.`, tree },
              null,
              2,
            );
            approved = true;
            break;
          }
          case 'gemini:selectFiles': {
            const lastStepContent = currentScratchpad.split('--- STEP').pop() ?? '';
            const lastOutput = lastStepContent.split('OUTPUT ---')[1]?.split('--- END STEP')[0]?.trim();
            if (!lastOutput) throw new Error('Could not find output from previous step in scratchpad.');
            const parsed = JSON.parse(lastOutput);
            const tree = parsed.tree ?? parsed;
            if (!tree || !Array.isArray(tree) || tree.length === 0) throw new Error('No file tree was provided by the previous step.');

            const result = await services.select.selectFiles(tree, currentScratchpad, step);
            stepOutput = JSON.stringify(result, null, 2);
            approved = true;
            break;
          }
          case 'github:getFilesContent': {
            if (!step.toolInput?.repoUrl) throw new Error('Missing repoUrl for getFilesContent tool.');
            const lastStepContent = currentScratchpad.split('--- STEP').pop() ?? '';
            const lastOutput = lastStepContent.split('OUTPUT ---')[1]?.split('--- END STEP')[0]?.trim();
            if (!lastOutput) throw new Error('Could not find output from previous step in scratchpad.');
            const { files: filePaths } = JSON.parse(lastOutput);
            if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0)
              throw new Error('No file paths were provided by the previous step to fetch.');
            onLog(step.agent, `Fetching content for ${filePaths.length} file(s)`);
            const contents = await services.github.getFilesContent({
              repoUrl: step.toolInput.repoUrl,
              paths: filePaths,
            });
            stepOutput = `Fetched file contents:\n${contents
              .map((c: { path: string; content: string }) => `--- FILE: ${c.path} ---\n${c.content}`)
              .join('\n\n')}`;
            approved = true;
            break;
          }
          default: {
            const result = await services.gemini.executeStep(step, currentScratchpad, retryReasoning);
            stepOutput = result.output;
            if (result.cost && onCost) onCost(result.cost.totalUSD, String(step.step));

            onLog(step.agent, `Output:\n${stepOutput}`);

            onLog('Orchestrator', `Requesting review of step ${step.step} output...`);
            const review = await services.gemini.reviewStep(step, stepOutput, currentScratchpad);
            if (review.cost && onCost) onCost(review.cost.totalUSD, `review-${step.step}`);
            onLog('Reviewer', `Decision: ${review.decision}. Reasoning: ${review.reasoning}`);

            if (review.decision === 'APPROVE') {
              approved = true;
            } else {
              retryReasoning = review.reasoning;
              if (attempt < MAX_RETRIES) onLog('Orchestrator', `Step needs revision. Reason: ${review.reasoning}`, 'warning');
            }
          }
        }
      } catch (e: any) {
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
  onLog('Orchestrator', 'All steps completed. Synthesizing final artifact workspace...');
const synth = await services.gemini.synthesizeFinalArtifactWithMeta(currentScratchpad);
const artifacts = synth.artifacts.map((f: any) => toTypesArtifact(f));
if (synth.cost && onCost) onCost(synth.cost.totalUSD, "synthesize");
onFinalArtifact(artifacts);
onLog('Synthesizer', `Final workspace created with ${artifacts.length} file(s).`);
return { finalScratchpad: currentScratchpad, finalArtifacts: artifacts };

};

function App() {
  const [goal, setGoal] = useState('');
  const [sessionCostUSD, setSessionCostUSD] = useState(0);
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem('agentic-sessions');
      if (savedSessions) setSessions(JSON.parse(savedSessions));
    } catch (error) {
      console.error('Failed to load sessions', error);
    }

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
    setSessionCostUSD(0);
  };

  const saveSession = (data: Omit<Session, 'id' | 'timestamp'>) => {
    const id = activeSessionId || Date.now().toString();
    const newSession: Session = { id, timestamp: Date.now(), ...data };

    setSessions((prev) => {
      const otherSessions = prev.filter((s) => s.id !== id);
      const newSessions = [newSession, ...otherSessions];
      try {
        localStorage.setItem('agentic-sessions', JSON.stringify(newSessions));
      } catch (error) {
        console.error('Failed to save sessions', error);
      }
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
    setLogEntries(session.logEntries.map((l) => ({ ...l, timestamp: new Date(l.timestamp) })));
    setScratchpad(session.scratchpad);
    setFinalArtifacts(session.artifacts);
    setPlanState('finished');
    setCurrentStepIndex(session.error || session.artifacts ? -1 : (session.plan?.length || 0) - 1);
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure?')) {
      setSessions([]);
      localStorage.removeItem('agentic-sessions');
      handleNewRun();
    }
  };

  const handleThemeToggle = () => setIsDarkMode(!isDarkMode);

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
      addLogEntry('Orchestrator', 'Requesting plan from Supervisor...');
    const planResp = await geminiService.createPlanWithMeta(context);
const createdPlan = planResp.plan.map((s: any, i: number) => toTypesPlanStep(s, i));
if (planResp.cost && newSessionId) {
  const cost = planResp.cost.totalUSD;
  appendRun(newSessionId, { totalUSD: cost, stepId: "plan" });
  setSessionCostUSD(prev => prev + cost);
}

      setPlan(createdPlan);
      addLogEntry('Supervisor', `Created a ${createdPlan.length}-step plan. Awaiting user approval.`);
      setPlanState('awaitingApproval');
    } catch (error: any) {
      addLogEntry('Orchestrator', `Failed to generate a plan: ${error.message}`, 'error');
      setPlanState('idle');
      saveSession({
        goal: userGoal,
        uploadedFile,
        plan: [],
        logEntries: currentLogs,
        scratchpad: '',
        artifacts: null,
        error: error.message,
      });
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
    };

    try {
     const { finalScratchpad, finalArtifacts } = await runOrchestrationLogic({
  goal,
  uploadedFile,
  plan,
  services: { gemini: geminiService, github: githubService, select: { selectFiles } },
  onLog: addLogEntry,
  onScratchpadUpdate: updateScratchpad,
  onStepUpdate: setCurrentStepIndex,
  onFinalArtifact: setFinalArtifacts,
  onCost: (cost, stepId) => {
    if (activeSessionId) appendRun(activeSessionId, { totalUSD: cost, stepId });
    setSessionCostUSD(prev => prev + cost);
  },
});

      setPlanState('finished');
      saveSession({
        goal,
        uploadedFile,
        plan,
        logEntries: currentLogs,
        scratchpad: finalScratchpad,
        artifacts: finalArtifacts,
        error: null,
      });
    } catch (error: any) {
      addLogEntry('Orchestrator', `An unexpected error occurred: ${error.message}`, 'error');
      setPlanState('finished');
      saveSession({
        goal,
        uploadedFile,
        plan,
        logEntries: currentLogs,
        scratchpad: currentScratchpad,
        artifacts: null,
        error: error.message,
      });
    }
  };

  const handleRunTestSuite = async (): Promise<TestResult> => {
    const testGoal = 'Perform a code review on the repository at https://github.com/test-owner/test-repo';
    const testLogs: LogEntry[] = [];
    let testError: string | null = null;
    try {
      const context = `User Goal: ${testGoal}`;
      const planResp = await geminiService.createPlanWithMeta(context);
      const createdPlan = planResp.plan.map((s: any, i: number) => toTypesPlanStep(s, i));
      if (planResp.cost) {
        const cost = planResp.cost.totalUSD;
        // Note: Not adding to session cost for tests
      }

      await runOrchestrationLogic({
        goal: testGoal,
        uploadedFile: null,
        plan: createdPlan,
        services: { gemini: geminiService, github: mockGithubService, select: { selectFiles } },
        onLog: (agent, message, type = 'info') => testLogs.push({ timestamp: new Date(), agent, message, type }),
        onScratchpadUpdate: () => '',
        onStepUpdate: () => {},
        onFinalArtifact: () => {},
        onCost: () => {}, // No-op for tests
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
          <OrchestratorIcon className="w-8 h-8 text-brand-primary" />
          <h1 className="text-2xl font-bold text-white">Agentic Workflow Orchestrator</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleThemeToggle}
            className="p-2 rounded-full text-content-200 hover:bg-base-300 hover:text-white transition-colors"
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          >
            {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
          </button>
          <button
            type="button"
            onClick={() => setIsAgentLibraryVisible(true)}
            className="p-2 rounded-full text-content-200 hover:bg-base-300 hover:text-white transition-colors"
            aria-label="Show Agent Library"
          >
            <BeakerIcon className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => setIsReadmeVisible(true)}
            className="p-2 rounded-full text-content-200 hover:bg-base-300 hover:text-white transition-colors"
            aria-label="Show Read Me"
          >
            <InformationCircleIcon className="w-6 h-6" />
          </button>
          {/* ### New Run button hardened: type=button, aria, click always fires, above overlays */}
          <button
            type="button"
            onClick={handleNewRun}
            aria-label="Start a new run"
            className="relative z-10 px-4 py-2 text-sm bg-brand-secondary hover:bg-brand-primary text-white rounded-md transition-colors"
          >
            New Run
          </button>
          <span className="ml-2 px-3 py-1 rounded-md bg-base-300 text-xs tabular-nums">
  Est. cost: ${sessionCostUSD.toFixed(4)}
</span>

        </div>
      </header>

      <main className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-screen-2xl mx-auto">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <GoalInput
            goal={goal}
            setGoal={setGoal}
            onSubmit={handleStartPlanGeneration}
            isLoading={isLoading}
            uploadedFile={uploadedFile}
            setUploadedFile={setUploadedFile}
            isSessionLoaded={!!activeSessionId && !isLoading}
            planState={planState}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow" style={{ minHeight: '60vh' }}>
            <PlanDisplay
              plan={plan}
              currentStepIndex={currentStepIndex}
              planState={planState}
              onApprovePlan={handleExecutePlan}
            />
            <div className="rounded-md border border-base-300 overflow-auto" ref={logContainerRef}>
              <ActivityLog logEntries={logEntries} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="h-[40vh] min-h-[300px]">
            <SessionHistory
              sessions={sessions}
              onLoadSession={handleLoadSession}
              onClearHistory={handleClearHistory}
              activeSessionId={activeSessionId}
            />
          </div>
          <div className="h-[50vh] min-h-[400px]">
            <ArtifactWorkspace
              scratchpad={scratchpad}
              finalArtifacts={finalArtifacts}
              isLoading={planState === 'executing' && plan.length > 0 && currentStepIndex === -1}
            />
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
// ### END FILE: src/App.tsx

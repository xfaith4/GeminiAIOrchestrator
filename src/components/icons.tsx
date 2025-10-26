import React from 'react';
import {
  Info,
  FlaskConical,
  Bot,
  User,
  UserCheck,
  Search,
  ScrollText,
  AlertTriangle,
  Github,
  X as XIcon,
  Send as SendIconLucide,
  Paperclip,
  CheckCircle,
  ListChecks,
  NotebookPen,
  Download as DownloadLucide,
  History as HistoryLucide,
  Trash2,
  RotateCcw,
  Sun,
  Moon,
} from 'lucide-react';

/* ---------------- Core header icons ---------------- */
export const InformationCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <Info {...props} />;
export const BeakerIcon = (props: React.SVGProps<SVGSVGElement>) => <FlaskConical {...props} />;

/* Simple custom logo for the app */
export const OrchestratorIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <circle cx="12" cy="12" r="8" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="2.4" strokeWidth="1.6" />
    <path d="M4 12h4M16 12h4M12 4v4M12 16v4" strokeWidth="1.6" />
  </svg>
);

/* ---------------- Icons used across components ---------------- */
/* ActivityLog */
export const LogIcon = (props: React.SVGProps<SVGSVGElement>) => <ScrollText {...props} />;
export const UserIcon = (props: React.SVGProps<SVGSVGElement>) => <User {...props} />;
export const SupervisorIcon = (props: React.SVGProps<SVGSVGElement>) => <UserCheck {...props} />;
export const ReviewerIcon = (props: React.SVGProps<SVGSVGElement>) => <Search {...props} />;
export const AgentIcon = (props: React.SVGProps<SVGSVGElement>) => <Bot {...props} />;
export const ExclamationTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <AlertTriangle {...props} />
);
export const GitHubIcon = (props: React.SVGProps<SVGSVGElement>) => <Github {...props} />;

/* Modals / buttons */
export const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => <XIcon {...props} />;
export const SendIcon = (props: React.SVGProps<SVGSVGElement>) => <SendIconLucide {...props} />;
export const PaperClipIcon = (props: React.SVGProps<SVGSVGElement>) => <Paperclip {...props} />;

/* Plan / status */
export const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <CheckCircle {...props} />;
export const PlanIcon = (props: React.SVGProps<SVGSVGElement>) => <ListChecks {...props} />;

/* Scratchpad / files */
export const ScratchpadIcon = (props: React.SVGProps<SVGSVGElement>) => <NotebookPen {...props} />;
export const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => <DownloadLucide {...props} />;

/* Session history */
export const HistoryIcon = (props: React.SVGProps<SVGSVGElement>) => <HistoryLucide {...props} />;
export const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <Trash2 {...props} />;
export const ReplayIcon = (props: React.SVGProps<SVGSVGElement>) => <RotateCcw {...props} />;

/* Theme toggle */
export const SunIcon = (props: React.SVGProps<SVGSVGElement>) => <Sun {...props} />;
export const MoonIcon = (props: React.SVGProps<SVGSVGElement>) => <Moon {...props} />;

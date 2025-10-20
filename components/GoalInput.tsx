import React, { useRef, useState } from 'react';
import { SendIcon, PaperClipIcon, XMarkIcon } from './icons';
import { UploadedFile, PlanState } from '../types';

interface GoalInputProps {
  goal: string;
  setGoal: (goal: string) => void;
  onSubmit: (goal: string) => void;
  isLoading: boolean;
  uploadedFile: UploadedFile | null;
  setUploadedFile: (file: UploadedFile | null) => void;
  isSessionLoaded: boolean;
  planState: PlanState;
}

const GoalInput: React.FC<GoalInputProps> = ({ goal, setGoal, onSubmit, isLoading, uploadedFile, setUploadedFile, isSessionLoaded, planState }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(goal);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setUploadedFile(null);

    try {
        let content = '';
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        const textExtensions = ['csv', 'json', 'ps1', 'psm1', 'psd1', 'py', 'js', 'ts', 'md', 'txt'];
        
        if (extension === 'docx') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await window.mammoth.extractRawText({ arrayBuffer });
            content = result.value;
        } else if (extension === 'xlsx') {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            content = window.XLSX.utils.sheet_to_csv(worksheet);
        } else if (textExtensions.includes(extension)) {
            content = await file.text();
        } else {
            alert('Unsupported file type.');
            return;
        }
        
        setUploadedFile({ name: file.name, content });

    } catch (error) {
        console.error("Error parsing file:", error);
        alert("There was an error parsing your file.");
    } finally {
        setIsParsing(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; 
        }
    }
  };
  
  const isDisabled = isLoading || isSessionLoaded || planState !== 'idle';

  const getPlaceholderText = () => {
    if (isSessionLoaded) return "Viewing a past session. Start a new run to enter a goal.";
    switch (planState) {
        case 'generating': return "Supervisor is generating a plan...";
        case 'awaitingApproval': return "Plan generated. Please review and approve below.";
        case 'executing': return "Agents are executing the plan...";
        case 'finished': return "Process finished. Start a new run to enter a new goal.";
        default: return "Enter your high-level goal here... e.g., 'Review the code at https://github.com/owner/repo and suggest improvements.'";
    }
  };

  return (
    <div>
        <form onSubmit={handleFormSubmit} className="relative">
        <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={getPlaceholderText()}
            className="w-full bg-base-200 border border-base-300 rounded-lg p-4 pr-28 text-content-100 placeholder-content-200 focus:ring-2 focus:ring-brand-secondary focus:border-transparent transition-shadow resize-none"
            rows={3}
            disabled={isDisabled}
        />
        <div className="absolute top-1/2 right-4 -translate-y-1/2 flex items-center gap-2">
            <button
            type="button"
            onClick={handleFileClick}
            disabled={isDisabled || isParsing}
            className="p-2 rounded-full text-content-200 hover:bg-base-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Attach file"
            >
            <PaperClipIcon className="w-6 h-6" />
            </button>
            <button
            type="submit"
            disabled={isDisabled || !goal.trim()}
            className="p-2 rounded-full bg-brand-secondary text-white hover:bg-brand-primary disabled:bg-base-300 disabled:cursor-not-allowed transition-colors"
            aria-label="Submit goal"
            >
            <SendIcon className="w-6 h-6" />
            </button>
        </div>
        <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".docx,.xlsx,.csv,.json,.ps1,.psm1,.psd1,.py,.js,.ts,.md,.txt"
            disabled={isDisabled || isParsing}
        />
        </form>
        {(isParsing || uploadedFile) && (
            <div className="mt-2">
                {isParsing ? (
                    <div className="text-sm text-content-200">Parsing file...</div>
                ) : uploadedFile && (
                    <div className="flex items-center gap-2 bg-base-200 p-2 rounded-md text-sm">
                        <PaperClipIcon className="w-4 h-4 text-content-200 flex-shrink-0" />
                        <span className="text-content-100 truncate">{uploadedFile.name}</span>
                        <button 
                            onClick={() => setUploadedFile(null)}
                            disabled={isDisabled}
                            className="ml-auto p-1 rounded-full text-content-200 hover:bg-base-300 hover:text-white disabled:opacity-50"
                            aria-label="Remove file"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default GoalInput;

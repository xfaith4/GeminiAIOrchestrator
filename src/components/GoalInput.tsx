// ### BEGIN FILE: src/components/GoalInput.tsx
import React, { useRef, useState } from 'react';
import { PaperClipIcon, XMarkIcon } from './icons';
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

const GoalInput: React.FC<GoalInputProps> = ({
  goal,
  setGoal,
  onSubmit,
  isLoading,
  uploadedFile,
  setUploadedFile,
  isSessionLoaded,
  planState,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDisabled && goal.trim()) onSubmit(goal);
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
      const textExtensions = ['csv', 'json', 'ps1', 'psm1', 'psd1', 'py', 'js', 'ts', 'md', 'txt', 'sql'];
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
      const videoExtensions = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv'];

      if (extension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await (window as any).mammoth.extractRawText({ arrayBuffer });
        content = result.value;
      } else if (extension === 'xlsx') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = (window as any).XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        content = (window as any).XLSX.utils.sheet_to_csv(worksheet);
      } else if (imageExtensions.includes(extension) || videoExtensions.includes(extension)) {
        // Handle images and videos as base64 data URLs
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else if (textExtensions.includes(extension)) {
        content = await file.text();
      } else {
        alert('Unsupported file type.');
        return;
      }

      setUploadedFile({ name: file.name, content });
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('There was an error parsing your file.');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isDisabled = isLoading || isSessionLoaded || planState !== 'idle';

  const getPlaceholderText = () => {
    if (isSessionLoaded) return 'Viewing a past session. Start a new run to enter a goal.';
    switch (planState) {
      case 'generating':
        return 'Supervisor is generating a plan...';
      case 'awaitingApproval':
        return 'Plan generated. Please review and approve below.';
      case 'executing':
        return 'Agents are executing the plan...';
      case 'finished':
        return 'Process finished. Start a new run to enter a new goal.';
      default:
        return "Enter your high-level goal here... e.g., 'Review the code at https://github.com/owner/repo and suggest improvements.'";
    }
  };

  return (
    <div>
      <form className="relative z-0" onSubmit={handleFormSubmit}>
        <label htmlFor="goal" className="sr-only">
          High-level goal
        </label>

        <textarea
          id="goal"
          name="goal"
          placeholder={getPlaceholderText()}
          rows={3}
          className="w-full bg-base-200 border border-base-300 rounded-lg p-4 pr-28 text-content-100 placeholder-content-200 focus:ring-2 focus:ring-brand-secondary focus:border-transparent transition-shadow resize-none"
          autoComplete="off"
          aria-label="High-level goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={isDisabled}
        />

        {/* Attachments trigger (kept below the button z-index so it won't eat clicks) */}
        <div className="absolute top-2 right-4 z-0 flex items-center gap-2">
          <label htmlFor="attachments" className="inline-flex items-center gap-2 cursor-pointer">
            <span className="sr-only">Attach files</span>
            <input
              id="attachments"
              name="attachments"
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept=".docx,.xlsx,.csv,.json,.ps1,.psm1,.psd1,.py,.js,.ts,.md,.txt,.sql,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.ico,.mp4,.webm,.avi,.mov,.mkv,.flv"
              aria-label="Attachments"
              onChange={handleFileChange}
              disabled={isDisabled}
            />
            <button
              type="button"
              onClick={handleFileClick}
              className="p-2 rounded-md text-content-200 hover:bg-base-300 hover:text-white transition-colors"
              aria-label="Add attachments"
              disabled={isDisabled}
            >
              <PaperClipIcon className="w-5 h-5" />
            </button>
          </label>
        </div>

        {/* Optional submit if you want Enter/Click behavior from here */}
        { <div className="mt-3">
          <button
            type="submit"
            disabled={isDisabled || !goal.trim()}
            className="px-3 py-2 text-sm rounded-md bg-brand-secondary text-white hover:bg-brand-primary transition-colors disabled:opacity-60"
          >
            Run
          </button>
        </div> }
      </form>

      {(isParsing || uploadedFile) && (
        <div className="mt-2">
          {isParsing ? (
            <div className="text-sm text-content-200">Parsing file...</div>
          ) : (
            uploadedFile && (
              <div className="flex items-center gap-2 bg-base-200 p-2 rounded-md text-sm">
                <PaperClipIcon className="w-4 h-4 text-content-200 flex-shrink-0" />
                <span className="text-content-100 truncate">{uploadedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  disabled={isDisabled}
                  className="ml-auto p-1 rounded-full text-content-200 hover:bg-base-300 hover:text-white disabled:opacity-50"
                  aria-label="Remove file"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default GoalInput;
// ### END FILE: src/components/GoalInput.tsx

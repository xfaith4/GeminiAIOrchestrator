
import React from 'react';
import { SendIcon } from './icons';

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

const PromptInput: React.FC<PromptInputProps> = ({ prompt, setPrompt, onSubmit, isLoading }) => {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(prompt);
  };

  return (
    <form onSubmit={handleFormSubmit} className="relative">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt here..."
        className="w-full bg-base-200 border border-base-300 rounded-lg p-4 pr-16 text-content-100 placeholder-content-200 focus:ring-2 focus:ring-brand-secondary focus:border-transparent transition-shadow resize-none"
        rows={3}
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !prompt.trim()}
        className="absolute top-1/2 right-4 -translate-y-1/2 p-2 rounded-full bg-brand-secondary text-white hover:bg-brand-primary disabled:bg-base-300 disabled:cursor-not-allowed transition-colors"
        aria-label="Submit prompt"
      >
        <SendIcon className="w-6 h-6" />
      </button>
    </form>
  );
};

export default PromptInput;

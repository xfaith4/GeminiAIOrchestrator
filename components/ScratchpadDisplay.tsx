import React, { useMemo } from 'react';
import { ScratchpadIcon, ArtifactIcon, CheckCircleIcon, DownloadIcon } from './icons';
import Loader from './Loader';

interface ScratchpadDisplayProps {
  scratchpad: string;
  finalArtifact: string | null;
  isLoading: boolean;
  goal: string;
}

const ScratchpadDisplay: React.FC<ScratchpadDisplayProps> = ({ scratchpad, finalArtifact, isLoading, goal }) => {
  const renderedArtifact = useMemo(() => {
    if (!finalArtifact) return '';
    try {
      return window.marked.parse(finalArtifact);
    } catch (e) {
      console.error("Failed to parse markdown:", e);
      return `<p>${finalArtifact.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
    }
  }, [finalArtifact]);

  const handleDownload = () => {
    if (!finalArtifact) return;
    const blob = new Blob([finalArtifact], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = goal.toLowerCase().replace(/\s+/g, '_').substring(0, 30) || 'artifact';
    link.href = url;
    link.download = `${fileName}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="bg-base-200/70 border border-base-300 rounded-lg flex flex-col h-full">
      <div className="p-4 border-b border-base-300 flex items-center gap-2">
        <ScratchpadIcon className="w-6 h-6 text-brand-secondary" />
        <h2 className="text-lg font-semibold text-white">Scratchpad & Artifact</h2>
      </div>
      <div className="p-4 overflow-y-auto">
        {finalArtifact ? (
          <div>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 text-green-300">
                    <CheckCircleIcon className="w-6 h-6" />
                    <h3 className="text-md font-semibold font-sans">Process Completed</h3>
                </div>
                <button 
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-brand-secondary hover:bg-brand-primary text-white rounded-md transition-colors"
                    aria-label="Download artifact"
                >
                    <DownloadIcon className="w-4 h-4"/>
                    Download Artifact
                </button>
            </div>
            <style>
                {`
                .prose { color: #d1d5db; }
                .prose h1, .prose h2, .prose h3, .prose h4 { color: #fff; border-bottom-color: #374151; }
                .prose strong { color: #fff; }
                .prose a { color: #60a5fa; }
                .prose blockquote { border-left-color: #4b5563; color: #9ca3af; }
                .prose code { color: #f9a8d4; background-color: #374151; padding: 0.2em 0.4em; border-radius: 3px; }
                .prose pre { background-color: #1f2937; padding: 1em; border-radius: 0.5em; }
                .prose ul > li::marker { color: #60a5fa; }
                `}
            </style>
            <div 
                className="prose prose-sm max-w-none p-4 bg-base-300/50 rounded-md whitespace-pre-wrap font-sans text-content-100"
                dangerouslySetInnerHTML={{ __html: renderedArtifact }}
            />
          </div>
        ) : (
          <div>
            <p className="whitespace-pre-wrap font-mono text-xs text-content-200 leading-relaxed">{scratchpad}</p>
            {isLoading && <Loader message="Synthesizing final artifact..." />}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScratchpadDisplay;
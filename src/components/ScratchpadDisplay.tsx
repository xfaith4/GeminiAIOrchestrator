import React, { useEffect, useMemo, useState } from 'react';
import { ScratchpadIcon, CheckCircleIcon, DownloadIcon, LogViewerIcon } from './icons';
import { Artifact } from '../types';
import Loader from './Loader';

// This makes TypeScript aware of the external library
declare global {
  interface Window {
    Prism: any;
  }
}

interface ArtifactWorkspaceProps {
  scratchpad: string;
  finalArtifacts: Artifact[] | null;
  isLoading: boolean;
  onViewLogs?: () => void;
}

const getFileIcon = (lang: string) => {
    switch(lang) {
        case 'markdown': return '📝';
        case 'python': return '🐍';
        case 'javascript': return '📜';
        case 'json': return '{}';
        case 'sql': return '🗄️';
        case 'image': return '🖼️';
        case 'video': return '🎬';
        default: return '📄';
    }
}

const ArtifactWorkspace: React.FC<ArtifactWorkspaceProps> = ({ scratchpad, finalArtifacts, isLoading, onViewLogs }) => {
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

  // FIX: Added useEffect to handle side effects, such as updating the selected artifact when finalArtifacts change.
  useEffect(() => {
    if (finalArtifacts && finalArtifacts.length > 0) {
      setSelectedArtifact(finalArtifacts[0]);
    } else {
      setSelectedArtifact(null);
    }
  }, [finalArtifacts]);

  const renderedContent = useMemo(() => {
    if (!selectedArtifact) return '';
    const { content, language } = selectedArtifact;

    // Images and videos are handled separately in JSX, return content as-is
    if (language === 'image' || language === 'video') {
        return content;
    }

    if (language === 'markdown') {
        try {
            return window.marked.parse(content);
        } catch (e) {
            console.error("Failed to parse markdown:", e);
            return `<p>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
        }
    }
    
    // Use Prism for syntax highlighting for other languages
    if (window.Prism && window.Prism.languages[language]) {
        return window.Prism.highlight(content, window.Prism.languages[language], language);
    }

    // Fallback for plain text
    return content.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  }, [selectedArtifact]);

  const handleDownload = (artifact: Artifact) => {
    let blob: Blob;
    
    // Handle binary content (images/videos stored as base64)
    if (artifact.language === 'image' || artifact.language === 'video') {
      // If content is a data URL, fetch it and create blob
      if (artifact.content.startsWith('data:')) {
        fetch(artifact.content)
          .then(res => res.blob())
          .then(fetchedBlob => {
            const url = URL.createObjectURL(fetchedBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = artifact.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          });
        return;
      }
    }
    
    // Handle text content
    blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = artifact.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="bg-base-200/70 border border-base-300 rounded-lg flex flex-col h-full">
      <div className="p-4 border-b border-base-300 flex items-center gap-2">
        <ScratchpadIcon className="w-6 h-6 text-brand-secondary" />
        <h2 className="text-lg font-semibold text-white">Workspace</h2>
      </div>
      <div className="p-4 overflow-y-auto flex-grow">
        {finalArtifacts ? (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 text-green-300">
                    <CheckCircleIcon className="w-6 h-6" />
                    <h3 className="text-md font-semibold font-sans">Process Completed</h3>
                </div>
                {onViewLogs && (
                    <button
                        onClick={onViewLogs}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-brand-primary hover:bg-brand-secondary text-white rounded-md transition-colors"
                    >
                        <LogViewerIcon className="w-4 h-4" />
                        View Logs
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-3 gap-4 flex-grow min-h-0">
                {/* File List */}
                <div className="col-span-1 border border-base-300 rounded-md p-2 space-y-2 overflow-y-auto">
                    {finalArtifacts.map(artifact => (
                        <button key={artifact.name} onClick={() => setSelectedArtifact(artifact)}
                            className={`w-full text-left p-2 rounded-md text-sm flex items-center gap-2 ${selectedArtifact?.name === artifact.name ? 'bg-brand-primary/50 text-white' : 'bg-base-300 hover:bg-base-200'}`}
                        >
                           <span className="text-lg">{getFileIcon(artifact.language)}</span>
                           <span className="truncate">{artifact.name}</span>
                        </button>
                    ))}
                </div>

                {/* Content Preview */}
                <div className="col-span-2 border border-base-300 rounded-md flex flex-col min-h-0">
                    {selectedArtifact && (
                       <div className="p-2 border-b border-base-300 flex justify-between items-center bg-base-300/30">
                           <p className="text-sm font-semibold truncate">{selectedArtifact.name}</p>
                           <button 
                                onClick={() => handleDownload(selectedArtifact)}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs bg-brand-secondary hover:bg-brand-primary text-white rounded-md transition-colors"
                            >
                                <DownloadIcon className="w-3 h-3"/>
                                Download
                            </button>
                       </div>
                    )}
                    <div className="p-4 overflow-y-auto flex-grow">
                        <style>
                            {`
                            .prose { color: #d1d5db; } .prose h1, .prose h2, .prose h3, .prose h4 { color: #fff; border-bottom-color: #374151; } .prose strong { color: #fff; } .prose a { color: #60a5fa; } .prose blockquote { border-left-color: #4b5563; color: #9ca3af; } .prose code:not(pre code) { color: #f9a8d4; background-color: #374151; padding: 0.2em 0.4em; border-radius: 3px; } .prose ul > li::marker { color: #60a5fa; }
                            pre[class*="language-"] { background-color: #1f2937 !important; margin: 0; }
                            .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #9ca3af; }
                            .token.punctuation { color: #d1d5db; }
                            .token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol, .token.deleted { color: #f08080; }
                            .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin, .token.inserted { color: #98c379; }
                            .token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string { color: #56b6c2; }
                            .token.atrule, .token.attr-value, .token.keyword { color: #c678dd; }
                            .token.function, .token.class-name { color: #61afef; }
                            .token.regex, .token.important, .token.variable { color: #e5c07b; }
                            `}
                        </style>
                         {selectedArtifact?.language === 'image' ? (
                             <div className="flex items-center justify-center">
                                 <img 
                                     src={renderedContent} 
                                     alt={selectedArtifact.name}
                                     className="max-w-full max-h-[600px] object-contain rounded-md"
                                 />
                             </div>
                         ) : selectedArtifact?.language === 'video' ? (
                             <div className="flex items-center justify-center">
                                 <video 
                                     src={renderedContent}
                                     controls
                                     className="max-w-full max-h-[600px] rounded-md"
                                 >
                                     Your browser does not support the video tag.
                                 </video>
                             </div>
                         ) : selectedArtifact?.language === 'markdown' ? (
                             <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderedContent }}/>
                         ) : (
                             <pre className={`language-${selectedArtifact?.language}`}><code dangerouslySetInnerHTML={{ __html: renderedContent }}/></pre>
                         )}
                    </div>
                </div>
            </div>

          </div>
        ) : (
          <div>
            <p className="whitespace-pre-wrap font-mono text-xs text-content-200 leading-relaxed">{scratchpad}</p>
            {isLoading && <Loader message="Synthesizing final workspace..." />}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtifactWorkspace;
import React from 'react';
import { ScratchpadIcon, ArtifactIcon } from './icons';
import Loader from './Loader';

interface ScratchpadDisplayProps {
  scratchpad: string;
  finalArtifact: string | null;
  isLoading: boolean;
}

const ScratchpadDisplay: React.FC<ScratchpadDisplayProps> = ({ scratchpad, finalArtifact, isLoading }) => {
  return (
    <div className="bg-base-200/70 border border-base-300 rounded-lg flex flex-col h-full">
      <div className="p-4 border-b border-base-300 flex items-center gap-2">
        <ScratchpadIcon className="w-6 h-6 text-brand-secondary" />
        <h2 className="text-lg font-semibold text-white">Scratchpad & Artifact</h2>
      </div>
      <div className="p-4 overflow-y-auto font-mono text-xs text-content-200 leading-relaxed">
        {finalArtifact ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
                <ArtifactIcon className="w-6 h-6 text-green-400" />
                <h3 className="text-md font-semibold text-white font-sans">Final Artifact</h3>
            </div>
            <div className="p-4 bg-base-300/50 rounded-md whitespace-pre-wrap font-sans text-sm text-content-100">
                {finalArtifact}
            </div>
          </div>
        ) : (
          <div>
            <p className="whitespace-pre-wrap">{scratchpad}</p>
            {isLoading && <Loader message="Synthesizing final artifact..." />}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScratchpadDisplay;

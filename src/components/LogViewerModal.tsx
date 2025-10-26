import React, { useState } from 'react';
import { LogViewerIcon } from './icons';
import { Session } from '../types';

interface LogViewerModalProps {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
}

const LogViewerModal: React.FC<LogViewerModalProps> = ({ session, isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !session) return null;

  const handleOpenLogViewer = () => {
    setIsLoading(true);

    // Prepare session data for the log viewer
    const sessionData = {
      id: session.id,
      goal: session.goal,
      timestamp: session.timestamp,
      plan: session.plan,
      logEntries: session.logEntries,
      scratchpad: session.scratchpad,
      artifacts: session.artifacts,
      error: session.error,
      cost: session.cost,
      uploadedFile: session.uploadedFile,
    };

    // Encode the data for URL parameter
    const dataParam = encodeURIComponent(JSON.stringify(sessionData));

    // Open log viewer in a new window
    const logViewerUrl = `/log-viewer.html?data=${dataParam}`;
    window.open(logViewerUrl, 'logViewer', 'width=1200,height=800,scrollbars=yes,resizable=yes');

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-200 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <LogViewerIcon className="w-8 h-8 text-brand-primary" />
            <h2 className="text-xl font-bold text-white">View Session Logs</h2>
          </div>

          <div className="mb-6">
            <p className="text-content-200 mb-2">
              Open a detailed view of your orchestration session including:
            </p>
            <ul className="text-sm text-content-200 space-y-1 ml-4">
              <li>• Execution logs with timestamps</li>
              <li>• Plan steps and agent assignments</li>
              <li>• Final artifacts and their content</li>
              <li>• Complete scratchpad trace</li>
              <li>• Session metadata and costs</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-content-200 hover:text-white hover:bg-base-300 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleOpenLogViewer}
              disabled={isLoading}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Opening...
                </>
              ) : (
                <>
                  <LogViewerIcon className="w-4 h-4" />
                  Open Log Viewer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogViewerModal;

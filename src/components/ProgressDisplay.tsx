// src/components/ProgressDisplay.tsx

import React from 'react';
import { Progress } from "@/components/ui/progress";

interface ProgressDisplayProps {
  progress: number;
  currentChunk: number;
  totalChunks: number;
  currentlyProcessingFiles: string[];
  latestProcessedFile: string | null;
  isProcessing: boolean;
}

const ProgressDisplay: React.FC<ProgressDisplayProps> = ({
  progress,
  currentChunk,
  totalChunks,
  currentlyProcessingFiles,
  latestProcessedFile,
  isProcessing
}) => {
  if (!isProcessing) return null;

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">
          {currentlyProcessingFiles.length > 0
            ? `Processing: ${currentlyProcessingFiles.join(', ')}`
            : 'Preparing to process files...'}
        </span>
        <span className="text-sm font-medium">{progress.toFixed(2)}%</span>
      </div>
      <Progress value={progress} className="w-full" />
      {currentChunk > 0 && (
        <div className="text-sm">
          Processing chunk {currentChunk} of {totalChunks}
        </div>
      )}
      {latestProcessedFile && (
        <div className="text-sm text-green-600">
          Latest processed file: {latestProcessedFile}
        </div>
      )}
    </div>
  );
};

export default ProgressDisplay;
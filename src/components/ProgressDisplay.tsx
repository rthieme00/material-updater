// src/components/ProgressDisplay.tsx

import React from 'react';
import { Progress } from "@/components/ui/progress";

interface ProgressDisplayProps {
  currentOperation: string | null;
  progress: number;
  currentChunk: number;
  totalChunks: number;
}

const ProgressDisplay: React.FC<ProgressDisplayProps> = ({
  currentOperation,
  progress,
  currentChunk,
  totalChunks
}) => {
  if (!currentOperation) return null;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">
          {currentOperation}
        </span>
        <span className="text-sm font-medium">{progress.toFixed(2)}%</span>
      </div>
      <Progress value={progress} className="w-full" />
      {currentChunk > 0 && (
        <div className="mt-2 text-sm">
          Processing chunk {currentChunk} of {totalChunks}
        </div>
      )}
    </div>
  );
};

export default ProgressDisplay;
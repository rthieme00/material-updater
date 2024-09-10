// src/workers/gltfWorker.ts

import { processVariantChunk } from '@/lib/MaterialUpdater';

self.onmessage = async (event) => {
  const { chunk, targetData, materialData, applyMoodRotationFlag, targetFileName } = event.data;

  try {
    const result = await processVariantChunk(
      chunk,
      targetData,
      materialData,
      applyMoodRotationFlag,
      targetFileName,
      (step) => {
        self.postMessage({ type: 'progress', step });
      }
    );
    self.postMessage({ type: 'result', result });
} catch (error) {
    self.postMessage({ type: 'error', error: (error as Error).message });
  }
};
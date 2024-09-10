// src/workers/gltfWorker.ts

import { updateMaterials, exportIndividualVariants } from '../lib/MaterialUpdater';
import { GltfData, MaterialData } from '../types/material';

self.onmessage = async (e: MessageEvent) => {
  const { 
    referenceData, 
    targetData, 
    model, 
    applyVariantsFlag, 
    applyMoodRotationFlag, 
    materialData, 
    processingMode, 
    fileName 
  } = e.data;

  try {
    let result;
    if (processingMode === 'update') {
      result = await updateMaterials(
        referenceData,
        targetData,
        model,
        applyVariantsFlag,
        applyMoodRotationFlag,
        materialData,
        (progress) => self.postMessage({ type: 'progress', progress })
      );
    } else if (processingMode === 'export') {
      result = await exportIndividualVariants(
        targetData,
        fileName,
        model,
        applyMoodRotationFlag,
        materialData,
        (progress) => self.postMessage({ type: 'progress', progress })
      );
    }
    self.postMessage({ type: 'complete', result });
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message });
  }
};
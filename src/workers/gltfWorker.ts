// src/workers/gltfWorker.ts

import { updateMaterials, exportIndividualVariants } from '../gltf/MaterialUpdater';
import { GltfData, MaterialData } from '../gltf/gltfTypes';

self.onmessage = async (e: MessageEvent) => {
  const { 
    referenceData, 
    targetData, 
    model, 
    applyVariants, 
    applyMoodRotation, 
    materialData, 
    processingMode, 
    fileName,
    refFileName,
    targetFileName
  } = e.data;

  try {
    let result;
    if (processingMode === 'update') {
      result = await updateMaterials(
        referenceData,
        targetData,
        model,
        applyVariants,
        applyMoodRotation,
        materialData,
        refFileName,
        targetFileName,
        (progress) => self.postMessage({ type: 'progress', progress })
      );
    } else if (processingMode === 'export') {
      result = await exportIndividualVariants(
        targetData,
        fileName,
        model,
        applyMoodRotation,
        materialData,
        (progress) => self.postMessage({ type: 'progress', progress })
      );
    }
    self.postMessage({ type: 'complete', result });
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};
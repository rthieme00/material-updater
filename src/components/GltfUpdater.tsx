// src/components/GltfUpdater.tsx

import React, { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateMaterials, exportIndividualVariants } from '@/lib/MaterialUpdater';
import ProgressDisplay from './ProgressDisplay';
import WarningDialog from './WarningDialog';
import ErrorDialog from './ErrorDialog';
import { MaterialData, GltfData } from '@/types/material';

declare global {
  interface Window {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
  }
}

const CHUNK_SIZE = 5;

interface GltfUpdaterProps {
  materialData: MaterialData;
  referenceFile: File | null;
  setReferenceFile: (file: File, path: string) => void;
  clearReferenceFile: () => void;
  referenceFileName: string | null;
  referenceFilePath: string | null;
  isReferenceFileStored: boolean;
  setFeedback: (feedback: string) => void;
  setReferenceMaterials: (materials: string[]) => void;
  setReferenceMeshes: (meshes: string[]) => void;
  openReferenceMaterialsModal: () => void;
  openReferenceMeshesModal: () => void;
  updateMaterialData: (updatedData: MaterialData) => void;
}

export default function GltfUpdater({
  materialData,
  referenceFile,
  setReferenceFile,
  clearReferenceFile,
  referenceFileName,
  referenceFilePath,
  isReferenceFileStored,
  setFeedback,
  setReferenceMaterials,
  setReferenceMeshes,
  openReferenceMaterialsModal,
  openReferenceMeshesModal,
  updateMaterialData
}: GltfUpdaterProps) {
  const [targetFiles, setTargetFiles] = useState<File[]>([]);
  const [applyVariants, setApplyVariants] = useState(true);
  const [applyMoodRotation, setApplyMoodRotation] = useState(true);
  const [selectedModel, setSelectedModel] = useState('Regular');
  const [processingMode, setProcessingMode] = useState<'update' | 'export'>('update');
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const referenceFileInputRef = useRef<HTMLInputElement>(null);
  const targetFilesInputRef = useRef<HTMLInputElement>(null);
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  const handleReferenceFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setReferenceFile(file, event.target.value);
      setFeedback(`Reference file selected: ${file.name}`);
      
      try {
        const content = await file.text();
        const data = JSON.parse(content) as GltfData;
        
        if (!data.materials || !data.meshes) {
          throw new Error("Invalid GLTF file: missing materials or meshes");
        }
  
        setReferenceMaterials(data.materials.map(m => m.name));
        setReferenceMeshes(data.meshes.map(m => m.name));
      } catch (error) {
        console.error("Error processing reference file:", error);
        setErrorMessage(`Error processing reference file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsErrorDialogOpen(true);
      }
    }
  };

  const handleTargetFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setTargetFiles(prev => [...prev, ...newFiles]);
      setFeedback(`${newFiles.length} target file(s) added`);
    }
  };

  const handleClearFiles = () => {
    setTargetFiles([]);
    setFeedback('All files cleared');
    if (targetFilesInputRef.current) targetFilesInputRef.current.value = '';
  };

  const saveFile = async (fileName: string, content: ArrayBuffer) => {
    if (!directoryHandleRef.current) {
      throw new Error("Directory not selected");
    }
    const fileHandle = await directoryHandleRef.current.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  };

  const processChunk = async (
    chunk: File[],
    referenceData: GltfData,
    chunkIndex: number,
    totalChunks: number,
    totalFiles: number
  ) => {
    for (let i = 0; i < chunk.length; i++) {
      const file = chunk[i];
      const fileIndex = chunkIndex * CHUNK_SIZE + i;
      setCurrentOperation(`Processing ${file.name} (${fileIndex + 1}/${totalFiles})`);
      
      try {
        const content = await file.text();
        const jsonData = JSON.parse(content) as GltfData;
        
        if (processingMode === 'update') {
          const result = await updateMaterials(
            referenceData,
            jsonData,
            selectedModel,
            applyVariants,
            applyMoodRotation,
            materialData,
            (fileProgress) => {
              const overallProgress = (fileIndex + fileProgress) / totalFiles * 100;
              setProgress(overallProgress);
            }
          );
          
          await saveFile(file.name, result);
        } else if (processingMode === 'export') {
          const { exportedVariants } = await exportIndividualVariants(
            jsonData,
            file.name,
            selectedModel,
            applyMoodRotation,
            materialData,
            (fileProgress) => {
              const overallProgress = (fileIndex + fileProgress) / totalFiles * 100;
              setProgress(overallProgress);
            }
          );
          
          for (const variant of exportedVariants) {
            await saveFile(variant.fileName, variant.content);
          }
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        setErrorMessage(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsErrorDialogOpen(true);
      }
    }
  };

  const handleUpdate = async () => {
    if (!referenceFile || targetFiles.length === 0 || !materialData) {
      setErrorMessage('Please select reference and target files, and ensure material data is loaded.');
      setIsErrorDialogOpen(true);
      return;
    }

    try {
      const referenceContent = await referenceFile.text();
      const referenceData = JSON.parse(referenceContent) as GltfData;

      const handle = await window.showDirectoryPicker();
      directoryHandleRef.current = handle;

      setFeedback('Processing files...');
      setProgress(0);
      setCurrentOperation('Preparing to process files');
      setIsProcessing(true);

      const chunks = [];
      for (let i = 0; i < targetFiles.length; i += CHUNK_SIZE) {
        chunks.push(targetFiles.slice(i, i + CHUNK_SIZE));
      }
      setTotalChunks(chunks.length);

      for (let i = 0; i < chunks.length; i++) {
        setCurrentChunk(i + 1);
        await processChunk(chunks[i], referenceData, i, chunks.length, targetFiles.length);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setCurrentOperation('Processing complete');
      setFeedback(`All files ${processingMode === 'update' ? 'updated' : 'exported'} and saved to selected directory.`);
    } catch (error) {
      console.error('Error processing materials:', error);
      setErrorMessage(`Error processing materials: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsErrorDialogOpen(true);
    } finally {
      setProgress(100);
      setCurrentOperation(null);
      setIsProcessing(false);
      directoryHandleRef.current = null;
    }
  };

  const handleReselectFile = () => {
    if (referenceFileInputRef.current) {
      referenceFileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="referenceFile">Reference File:</Label>
        <div className="flex items-center space-x-2">
          <Input 
            id="referenceFile" 
            type="file" 
            accept=".gltf,.glb" 
            onChange={handleReferenceFileSelect} 
            ref={referenceFileInputRef} 
            className="mt-1" 
          />
          {isReferenceFileStored && !referenceFile && (
            <Button 
              onClick={handleReselectFile}
              variant="outline"
            >
              Reselect File
            </Button>
          )}
        </div>
        {(referenceFileName || isReferenceFileStored) && (
          <div className="mt-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm">
                  {referenceFile ? `Selected: ${referenceFile.name}` : `Stored: ${referenceFileName}`}
                </p>
                {!referenceFile && isReferenceFileStored && (
                  <p className="text-xs text-gray-500 mt-1">File needs to be reselected after page refresh</p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button onClick={openReferenceMaterialsModal} variant="outline" size="sm">
                  View Materials
                </Button>
                <Button onClick={openReferenceMeshesModal} variant="outline" size="sm">
                  View Meshes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="targetFiles">Target Files:</Label>
        <Input 
          id="targetFiles" 
          type="file" 
          accept=".gltf,.glb" 
          multiple 
          onChange={handleTargetFilesSelect} 
          ref={targetFilesInputRef} 
          className="mt-1" 
        />
        {targetFiles.length > 0 && (
          <div className="mt-2">
            <p className="font-semibold">Selected files:</p>
            <ul className="list-disc pl-5 text-sm">
              {targetFiles.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="applyVariants" 
            checked={applyVariants} 
            onCheckedChange={(checked) => setApplyVariants(checked as boolean)}
          />
          <Label htmlFor="applyVariants">Apply Variants</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="applyMoodRotation" 
            checked={applyMoodRotation} 
            onCheckedChange={(checked) => setApplyMoodRotation(checked as boolean)}
          />
          <Label htmlFor="applyMoodRotation">Apply Mood Rotation</Label>
        </div>
      </div>

      {materialData && materialData.models && (
        <div>
          <Label htmlFor="modelSelect">Select Model:</Label>
          <Select onValueChange={setSelectedModel} value={selectedModel}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(materialData.models).map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex space-x-4">
        <Select value={processingMode} onValueChange={(value: 'update' | 'export') => setProcessingMode(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select processing mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="update">Update GLTF Files</SelectItem>
            <SelectItem value="export">Export Individual Variants</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleClearFiles} variant="outline" className="w-full">
        Clear Target Files
      </Button>

      <ProgressDisplay
        currentOperation={currentOperation}
        progress={progress}
        currentChunk={currentChunk}
        totalChunks={totalChunks}
      />

      <Button 
        onClick={handleUpdate} 
        disabled={(!referenceFile && !isReferenceFileStored) || targetFiles.length === 0 || !materialData || isProcessing} 
        className="w-full"
      >
        {isProcessing ? 'Processing...' : processingMode === 'update' ? 'Update GLTF Files' : 'Export Individual Variants'}
      </Button>

      <WarningDialog 
        isOpen={isWarningDialogOpen}
        onClose={() => setIsWarningDialogOpen(false)}
        message={warningMessage}
      />

      <ErrorDialog
        isOpen={isErrorDialogOpen}
        onClose={() => setIsErrorDialogOpen(false)}
        message={errorMessage}
      />
    </div>
  );
}
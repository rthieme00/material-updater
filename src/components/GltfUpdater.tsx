// src/components/GltfUpdater.tsx

import React, { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateMaterials, exportIndividualVariants } from '@/gltf/MaterialUpdater';
import ProgressDisplay from './ProgressDisplay/ProgressDisplay';
import WarningDialog from './Dialogs/WarningDialog';
import ErrorDialog from './Dialogs/ErrorDialog';
import { MaterialData, GltfData } from '@/gltf/gltfTypes';
import { saveFileWithFallback } from '@/utils/fileHandling';
import PermissionDialog from './Dialogs/PermissionDialog';

declare global {
  interface Window {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
  }
}

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
  const [outputDirectory, setOutputDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [outputDirectoryName, setOutputDirectoryName] = useState<string | null>(null);
  const [concurrentProcesses, setConcurrentProcesses] = useState(1);
  const [currentlyProcessingFiles, setCurrentlyProcessingFiles] = useState<string[]>([]);
  const [latestProcessedFile, setLatestProcessedFile] = useState<string | null>(null);

  const referenceFileInputRef = useRef<HTMLInputElement>(null);
  const targetFilesInputRef = useRef<HTMLInputElement>(null);
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [hasFileSystemPermission, setHasFileSystemPermission] = useState(false);

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

  const handleOutputDirectorySelect = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setOutputDirectory(handle);
      setOutputDirectoryName(handle.name);
      setIsPermissionDialogOpen(true);
      setFeedback('Output directory selected successfully.');
    } catch (error) {
      console.error('Error selecting output directory:', error);
      setErrorMessage('Failed to select output directory. Please try again.');
      setIsErrorDialogOpen(true);
    }
  };

  const requestFileSystemPermission = async () => {
    if (outputDirectory) {
      try {
        // Request permission
        const permission = await outputDirectory.requestPermission({ mode: 'readwrite' });
        if (permission === 'granted') {
          setHasFileSystemPermission(true);
          setFeedback('File system permission granted.');
        } else {
          setHasFileSystemPermission(false);
          setFeedback('File system permission denied. Files will be downloaded directly.');
        }
      } catch (error) {
        console.error('Error requesting file system permission:', error);
        setHasFileSystemPermission(false);
        setFeedback('Error requesting file system permission. Files will be downloaded directly.');
      }
    }
    setIsPermissionDialogOpen(false);
  };

  const saveFile = async (fileName: string, content: ArrayBuffer) => {
    if (!directoryHandleRef.current) {
      throw new Error("Directory not selected");
    }
    try {
      const fileHandle = await directoryHandleRef.current.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'SecurityError') {
        setErrorMessage('Permission to write files was denied. Please try again and grant permission when prompted.');
        setIsErrorDialogOpen(true);
        throw error;
      }
      throw error;
    }
  };

  const processFiles = useCallback(async () => {
    if (!referenceFile || targetFiles.length === 0 || !materialData) {
      setErrorMessage('Please select reference file, target files, ensure material data is loaded, and select an output directory.');
      setIsErrorDialogOpen(true);
      return;
    }

    try {
      const referenceContent = await referenceFile.text();
      const referenceData = JSON.parse(referenceContent) as GltfData;

      setFeedback('Processing files...');
      setProgress(0);
      setIsProcessing(true);
      setLatestProcessedFile(null);

      directoryHandleRef.current = outputDirectory;

      const workerPool = new Array(concurrentProcesses).fill(null).map(() => 
        new Worker(new URL('../workers/gltfWorker.ts', import.meta.url))
      );

      let completedFiles = 0;
      const totalFiles = targetFiles.length;

      const processFile = async (file: File, workerIndex: number) => {
        setCurrentlyProcessingFiles(prev => [...prev, file.name]);
        const worker = workerPool[workerIndex];
        const content = await file.text();
        const jsonData = JSON.parse(content) as GltfData;

        return new Promise((resolve, reject) => {
          worker.onmessage = async (e: MessageEvent) => {
            if (e.data.type === 'progress') {
              const fileProgress = e.data.progress;
              const overallProgress = (completedFiles + fileProgress) / totalFiles * 100;
              setProgress(overallProgress);
            } else if (e.data.type === 'complete') {
              completedFiles++;
              try {
                if (processingMode === 'update') {
                  await saveFileWithFallback(file.name, e.data.result, hasFileSystemPermission ? directoryHandleRef.current : null);
                  setLatestProcessedFile(file.name);
                } else if (processingMode === 'export') {
                  for (const variant of e.data.result.exportedVariants) {
                    await saveFileWithFallback(variant.fileName, variant.content, hasFileSystemPermission ? directoryHandleRef.current : null);
                    setLatestProcessedFile(variant.fileName);
                  }
                }
                setCurrentlyProcessingFiles(prev => prev.filter(f => f !== file.name));
                resolve(null);
              } catch (error) {
                console.error('Error saving file:', error);
                setErrorMessage(`Error saving file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setIsErrorDialogOpen(true);
                reject(error);
              }
            } else if (e.data.type === 'error') {
              setCurrentlyProcessingFiles(prev => prev.filter(f => f !== file.name));
              reject(new Error(e.data.error));
            }
          };

          worker.postMessage({
            referenceData,
            targetData: jsonData,
            model: selectedModel,
            applyVariants,
            applyMoodRotation,
            materialData,
            processingMode,
            fileName: file.name,
            refFileName: referenceFileName,
            targetFileName: file.name
          }, []);
        });
      };

      const chunks = [];
      for (let i = 0; i < targetFiles.length; i += concurrentProcesses) {
        chunks.push(targetFiles.slice(i, i + concurrentProcesses));
      }
      setTotalChunks(chunks.length);

      for (let i = 0; i < chunks.length; i++) {
        setCurrentChunk(i + 1);
        await Promise.all(chunks[i].map((file, index) => processFile(file, index)));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      workerPool.forEach(worker => worker.terminate());

      setFeedback(`All files ${processingMode === 'update' ? 'updated' : 'exported'} and ${hasFileSystemPermission ? 'saved to selected directory' : 'downloaded'}.`);
    } catch (error) {
      console.error('Error processing materials:', error);
      setErrorMessage(`Error processing materials: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsErrorDialogOpen(true);
    } finally {
      setProgress(100);
      setIsProcessing(false);
      setCurrentlyProcessingFiles([]);
      setLatestProcessedFile(null);
      directoryHandleRef.current = null;
    }
  }, [referenceFile, targetFiles, materialData, processingMode, selectedModel, applyVariants, applyMoodRotation, outputDirectory, concurrentProcesses, hasFileSystemPermission]);

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
        progress={progress}
        currentChunk={currentChunk}
        totalChunks={totalChunks}
        currentlyProcessingFiles={currentlyProcessingFiles}
        latestProcessedFile={latestProcessedFile}
        isProcessing={isProcessing}
      />

      {targetFiles.length > 1 && (
        <div>
          <div>
            <Label htmlFor="outputDirectory">Output Directory:</Label>
            <div className="flex items-center space-x-2">
              <Input 
                id="outputDirectory" 
                type="text" 
                readOnly 
                value={outputDirectoryName || ''} 
                placeholder="Select output directory"
                className="mt-1 flex-grow" 
              />
              <Button 
                onClick={handleOutputDirectorySelect}
                variant="outline"
              >
                Select Directory
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="concurrentProcesses">Concurrent Processes:</Label>
            <Select value={concurrentProcesses.toString()} onValueChange={(value) => setConcurrentProcesses(Number(value))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select number of concurrent processes" />
              </SelectTrigger>
              {processingMode === 'update' ? (
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="16">16</SelectItem>
                  <SelectItem value="32">32</SelectItem>
                  <SelectItem value="64">64</SelectItem>
                  <SelectItem value="128">128</SelectItem>
                  <SelectItem value="256">256</SelectItem>
                </SelectContent>
              ) : (
                <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="8">8</SelectItem>
                <SelectItem value="12">12</SelectItem>
              </SelectContent>
              )}
            </Select>
          </div>
        </div>
      )}

      <Button 
        onClick={processFiles} 
        disabled={(!referenceFile && !isReferenceFileStored) || targetFiles.length === 0 || !materialData || isProcessing || (targetFiles.length > 1 && !outputDirectory)} 
        className="w-full"
      >
        {isProcessing ? 'Processing...' : processingMode === 'update' ? 'Update GLTF Files' : 'Export Individual Variants'}
      </Button>

      <PermissionDialog
        isOpen={isPermissionDialogOpen}
        onClose={() => setIsPermissionDialogOpen(false)}
        onConfirm={requestFileSystemPermission}
      />

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
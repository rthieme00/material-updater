// src/components/GltfUpdater.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { updateMaterials, compareMaterials, exportIndividualVariants, processFileChunk } from '@/lib/MaterialUpdater';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import StreamSaver from 'streamsaver';

declare global {
  interface Window {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
  }
}

interface GltfUpdaterProps {
  materialData: any;
  setFeedback: (feedback: string) => void;
  setReferenceMaterials: (materials: string[]) => void;
  setReferenceMeshes: (meshes: string[]) => void;
  openReferenceMaterialsModal: () => void;
  openReferenceMeshesModal: () => void;
  updateMaterialData: (updatedData: any) => void;
}

interface WarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  differences: string[];
  onAddMissingMaterials: () => void;
}

interface ErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

const CACHE_VERSION = 1;
const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB chunk size
const PROGRESS_UPDATE_INTERVAL = 100; // ms
const MAX_PARALLEL_PROCESSES = 4; // Adjust based on system capabilities

function WarningDialog({ isOpen, onClose, differences, onAddMissingMaterials }: WarningDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Material Differences Detected</DialogTitle>
          <DialogDescription>
            The following differences were found between the reference file and the JSON data:
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ul className="list-disc pl-4">
            {differences.map((diff, index) => (
              <li key={index}>{diff}</li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Ignore</Button>
          <Button onClick={onAddMissingMaterials}>Add Missing Materials</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ErrorDialog({ isOpen, onClose, message }: ErrorDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Error</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>{message}</p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function GltfUpdater({ 
  materialData, 
  setFeedback,
  setReferenceMaterials,
  setReferenceMeshes,
  openReferenceMaterialsModal,
  openReferenceMeshesModal,
  updateMaterialData
}: GltfUpdaterProps) {
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceData, setReferenceData] = useState<any | null>(null);
  const [targetFiles, setTargetFiles] = useState<File[]>([]);
  const [applyVariants, setApplyVariants] = useState(true);
  const [applyMoodRotation, setApplyMoodRotation] = useState(true);
  const [selectedModel, setSelectedModel] = useState('Regular');
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [differences, setDifferences] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [exportIndividualVariantsFlag, setExportIndividualVariantsFlag] = useState(false);

  const referenceFileInputRef = useRef<HTMLInputElement>(null);
  const targetFilesInputRef = useRef<HTMLInputElement>(null);

  const getCacheKey = useCallback((file: File | undefined, variant: string) => {
    if (!file) return null;
    return `${CACHE_VERSION}-${file.name}-${file.lastModified}-${variant}`;
  }, []);

  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);
  const [currentFiles, setCurrentFiles] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMode, setProcessingMode] = useState<'update' | 'export'>('update');
  const progressRef = useRef(0);
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  // Load saved data from localStorage on component mount
  useEffect(() => {
    const savedMaterialData = localStorage.getItem('materialData');
    if (savedMaterialData) {
      updateMaterialData(JSON.parse(savedMaterialData));
    }
  }, []);

  // Save materialData to localStorage whenever it changes
  useEffect(() => {
    if (materialData) {
      localStorage.setItem('materialData', JSON.stringify(materialData));
    }
  }, [materialData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setProgress(prev => {
        const target = progressRef.current;
        const step = (target - prev) * 0.2; // Increased for faster updates
        return Math.min(prev + step, 100);
      });
    }, PROGRESS_UPDATE_INTERVAL);

    return () => clearInterval(intervalId);
  }, []);

  const processFile = async (file: File, referenceData: any, updateFileProgress: (progress: number) => void): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target?.result as string);
          const updatedData = await updateMaterials(
            referenceData,
            jsonData,
            selectedModel,
            applyVariants,
            applyMoodRotation,
            materialData,
            updateFileProgress
          );
          resolve(updatedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
      reader.readAsText(file);
    });
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

  const handleReferenceFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setReferenceFile(file);
      setFeedback(`Reference file selected: ${file.name}`);
      
      if (!materialData) {
        setErrorMessage('Please upload a Materials.json file before selecting a reference file.');
        setIsErrorDialogOpen(true);
        return;
      }
  
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        
        if (!data.materials || !data.meshes) {
          throw new Error("Invalid GLTF file: missing materials or meshes");
        }
  
        setReferenceData(data);
        const materials = data.materials.map((m: any) => m.name);
        const meshes = data.meshes.map((m: any) => m.name);
        setReferenceMaterials(materials);
        setReferenceMeshes(meshes);
  
        const diffs = compareMaterials(data, materialData);
        if (diffs.length > 0) {
          setDifferences(diffs);
          setIsWarningDialogOpen(true);
        }
      } catch (error) {
        console.error("Error processing reference file:", error);
        setErrorMessage(`Error processing reference file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsErrorDialogOpen(true);
      }
    }
  };

  const handleAddMissingMaterials = useCallback(() => {
    if (!referenceData || !materialData) {
      setErrorMessage('Reference data or material data is missing');
      setIsErrorDialogOpen(true);
      return;
    }
  
    const updatedMaterialData = { ...materialData };
    const referenceMaterials = referenceData.materials || [];
    const jsonMaterials = updatedMaterialData.materials || [];
  
    referenceMaterials.forEach((refMaterial: any) => {
      if (!jsonMaterials.some((jsonMaterial: any) => jsonMaterial.name === refMaterial.name)) {
        jsonMaterials.push({ name: refMaterial.name, tags: [] });
      }
    });
  
    updatedMaterialData.materials = jsonMaterials;
  
    updateMaterialData(updatedMaterialData);
  
    setFeedback('Missing materials added to JSON');
    setIsWarningDialogOpen(false);
  }, [referenceData, materialData, updateMaterialData, setFeedback]);

  const handleTargetFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setTargetFiles(prev => [...prev, ...newFiles]);
      setFeedback(`${newFiles.length} target file(s) added`);
    }
  };

  const handleClearFiles = () => {
    setReferenceFile(null);
    setTargetFiles([]);
    setFeedback('All files cleared');

    // Reset the file input elements
    if (referenceFileInputRef.current) {
      referenceFileInputRef.current.value = '';
    }
    if (targetFilesInputRef.current) {
      targetFilesInputRef.current.value = '';
    }
  };

  const handleUpdate = async () => {
    if (!referenceFile || targetFiles.length === 0) {
      setErrorMessage('Please select reference and target files');
      setIsErrorDialogOpen(true);
      return;
    }

    if (!materialData) {
      setErrorMessage('Materials.json is not loaded. Please upload a valid Materials.json file.');
      setIsErrorDialogOpen(true);
      return;
    }

    try {
      // Read reference file
      const referenceData = JSON.parse(await referenceFile.text());

      // Prompt for directory selection
      const directoryHandle = await window.showDirectoryPicker();

      setFeedback('Processing files...');
      progressRef.current = 0;
      setCurrentOperation('Updating GLTF files');
      setCurrentFiles([]);
      setIsProcessing(true);

      const totalFiles = targetFiles.length;
      let completedFiles = 0;

      const updateProgress = (fileProgress: number) => {
        progressRef.current = ((completedFiles + fileProgress) / totalFiles) * 100;
      };

      // Process files in parallel batches
      for (let i = 0; i < totalFiles; i += MAX_PARALLEL_PROCESSES) {
        const batch = targetFiles.slice(i, i + MAX_PARALLEL_PROCESSES);
        setCurrentFiles(batch.map(file => file.name));

        const batchPromises = batch.map(async (file) => {
          const updatedContent = await processFile(file, referenceData, (fileProgress) => {
            updateProgress((i + fileProgress) / MAX_PARALLEL_PROCESSES);
          });
          const fileHandle = await directoryHandle.getFileHandle(file.name, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(updatedContent);
          await writable.close();
        });

        await Promise.all(batchPromises);

        completedFiles += batch.length;
      }

      setCurrentOperation('Processing complete');
      setFeedback('All files updated and saved to selected directory.');
    } catch (error) {
      console.error('Error processing materials:', error);
      setErrorMessage(`Error processing materials: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsErrorDialogOpen(true);
    } finally {
      progressRef.current = 100;
      setCurrentOperation(null);
      setCurrentFiles([]);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="referenceFile">Reference File:</Label>
        <Input id="referenceFile" type="file" accept=".gltf,.glb" onChange={handleReferenceFileSelect} ref={referenceFileInputRef} className="mt-1" />
        {referenceFile && (
          <div className="mt-2 flex justify-between items-center">
            <p className="text-sm">Selected: {referenceFile.name}</p>
            <div className="space-x-2">
              <Button onClick={openReferenceMaterialsModal} variant="outline" size="sm">
                View Materials
              </Button>
              <Button onClick={openReferenceMeshesModal} variant="outline" size="sm">
                View Meshes
              </Button>
            </div>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="targetFiles">Target Files:</Label>
        <Input id="targetFiles" type="file" accept=".gltf,.glb" multiple onChange={handleTargetFilesSelect} ref={targetFilesInputRef} className="mt-1" />
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
        Clear All Files
      </Button>
      {currentOperation && (
        <div className="w-full">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              {currentOperation}
            </span>
            <span className="text-sm font-medium">{progress.toFixed(2)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
          {currentFiles.length > 0 && (
            <div className="mt-2 text-sm">
              Processing: {currentFiles.join(', ')}
            </div>
          )}
        </div>
      )}

      <Button 
        onClick={handleUpdate} 
        disabled={!referenceFile || targetFiles.length === 0 || !materialData || isProcessing} 
        className="w-full"
      >
        {isProcessing ? 'Processing...' : processingMode === 'update' ? 'Update GLTF Files' : 'Export Individual Variants'}
      </Button>
      <WarningDialog 
        isOpen={isWarningDialogOpen}
        onClose={() => setIsWarningDialogOpen(false)}
        differences={differences}
        onAddMissingMaterials={handleAddMissingMaterials}
      />
      <ErrorDialog
        isOpen={isErrorDialogOpen}
        onClose={() => setIsErrorDialogOpen(false)}
        message={errorMessage}
      />
    </div>
  );
}

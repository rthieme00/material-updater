// src/components/GltfUpdater.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { updateMaterials, compareMaterials } from '@/lib/MaterialUpdater';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GltfUpdaterProps {
  materialData: any;
  setFeedback: (feedback: string) => void;
  setReferenceMaterials: (materials: string[]) => void;
  setReferenceMeshes: (meshes: string[]) => void;
  openReferenceMaterialsModal: () => void;
  openReferenceMeshesModal: () => void;
  updateMaterialData: (updatedData: any) => void; // Add this line
}

function WarningDialog({ isOpen, onClose, differences, onAddMissingMaterials }) {
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

function ErrorDialog({ isOpen, onClose, message }) {
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
  updateMaterialData // Add this line
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
        setErrorMessage(`Error processing reference file: ${error}`);
        setIsErrorDialogOpen(true);
      }
    }
  };

  const handleAddMissingMaterials = () => {
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
  
    // Update the materialData in the parent component
    // Use the new prop to update the material data
    updateMaterialData(updatedMaterialData);
  
    setFeedback('Missing materials added to JSON');
    setIsWarningDialogOpen(false);
  };

  const handleTargetFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setTargetFiles(prev => [...prev, ...newFiles]);
      setFeedback(`${newFiles.length} target file(s) added`);
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
      setFeedback('Updating files...');
      const updatedFiles = await updateMaterials(
        referenceFile,
        targetFiles,
        selectedModel,
        applyVariants,
        applyMoodRotation,
        materialData
      );

      if (updatedFiles.length === 0) {
        setErrorMessage('No files were updated. Please check your input and try again.');
        setIsErrorDialogOpen(true);
        return;
      }

      if (updatedFiles.length === 1) {
        // Download single file
        const blob = new Blob([updatedFiles[0]], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `updated_${targetFiles[0].name}`;
        a.click();
        URL.revokeObjectURL(url);
        setFeedback(`Updated file downloaded: updated_${targetFiles[0].name}`);
      } else if (updatedFiles.length > 1) {
        // Create zip file and download
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        updatedFiles.forEach((fileContent, index) => {
          zip.file(`updated_${targetFiles[index].name}`, fileContent);
        });
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'updated_gltf_files.zip';
        a.click();
        URL.revokeObjectURL(url);
        setFeedback('Updated files downloaded as zip');
      }
    } catch (error) {
      console.error('Error updating materials:', error);
      setErrorMessage(`Error updating materials: ${error}`);
      setIsErrorDialogOpen(true);
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="referenceFile">Reference File:</Label>
        <Input id="referenceFile" type="file" accept=".gltf,.glb" onChange={handleReferenceFileSelect} className="mt-1" />
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
        <Input id="targetFiles" type="file" accept=".gltf,.glb" multiple onChange={handleTargetFilesSelect} className="mt-1" />
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
      <Button onClick={handleUpdate} disabled={!referenceFile || targetFiles.length === 0 || !materialData} className="w-full">
        Update GLTF Files
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
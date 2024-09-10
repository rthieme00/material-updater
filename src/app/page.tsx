// src/app/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FileUpload from '@/components/FileUpload';
import MaterialMeshEditor from '@/components/MaterialMeshEditor/MaterialMeshEditor';
import GltfUpdater from '@/components/GltfUpdater';
import ReferenceMaterialsModal from '@/components/ReferenceMaterialsModal';
import ReferenceMeshesModal from '@/components/ReferenceMeshesModal';
import { MaterialData } from '@/types/material';
import { usePersistentFile } from '@/hooks/usePersistentFile';

export default function Home() {
  const [materialData, setMaterialData] = useState<MaterialData | null>(null);
  const [materialFileName, setMaterialFileName] = useState<string | null>(null);
  const [referenceFileState, setReferenceFile, clearReferenceFile] = usePersistentFile('referenceFile');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isReferenceMaterialsModalOpen, setIsReferenceMaterialsModalOpen] = useState(false);
  const [isReferenceMeshesModalOpen, setIsReferenceMeshesModalOpen] = useState(false);
  const [referenceMaterials, setReferenceMaterials] = useState<string[]>([]);
  const [referenceMeshes, setReferenceMeshes] = useState<string[]>([]);

  useEffect(() => {
    // Load material data from localStorage
    const storedMaterialData = localStorage.getItem('materialData');
    if (storedMaterialData) {
      try {
        const parsedData = JSON.parse(storedMaterialData) as MaterialData;
        setMaterialData(parsedData);
        setMaterialFileName(localStorage.getItem('materialFileName') || null);
        if (parsedData.materials && Array.isArray(parsedData.materials)) {
          setReferenceMaterials(parsedData.materials.map(m => m.name));
        }
      } catch (error) {
        console.error('Error parsing stored material data:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Save material data to localStorage whenever it changes
    if (materialData) {
      localStorage.setItem('materialData', JSON.stringify(materialData));
      localStorage.setItem('materialFileName', materialFileName || '');
    }
  }, [materialData, materialFileName]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content) as MaterialData;
        setMaterialData(parsedData);
        setMaterialFileName(file.name);
        setFeedback(`Successfully loaded ${file.name}`);

        if (parsedData.materials && Array.isArray(parsedData.materials)) {
          const materialNames = parsedData.materials.map(m => m.name);
          setReferenceMaterials(materialNames);
        }
      } catch (error) {
        setFeedback(`Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.onerror = (e) => {
      setFeedback(`Error reading file: ${e.target?.error || 'Unknown error'}`);
    };
    reader.readAsText(file);
  };

  const handleSave = (updatedData: MaterialData) => {
    setMaterialData(updatedData);
    const blob = new Blob([JSON.stringify(updatedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'updated_materials.json';
    a.click();
    URL.revokeObjectURL(url);
    setFeedback('Materials.json saved successfully');

    if (updatedData.materials && Array.isArray(updatedData.materials)) {
      const materialNames = updatedData.materials.map(m => m.name);
      setReferenceMaterials(materialNames);
    }
  };

  const handleUpdate = (updatedData: MaterialData) => {
    setMaterialData(updatedData);
    setFeedback('Material data updated');
  };

  const handleClear = () => {
    setMaterialData(null);
    setMaterialFileName(null);
    setFeedback('All data cleared');
    localStorage.removeItem('materialData');
    localStorage.removeItem('materialFileName');
  };

  const updateMaterialData = (updatedData: MaterialData) => {
    setMaterialData(updatedData);
    setFeedback('Material data updated');
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {feedback && (
        <Alert variant="default">
          <AlertDescription>{feedback}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Update GLTF Files</CardTitle>
            </CardHeader>
            <CardContent>
              {materialData && (
                <GltfUpdater 
                  materialData={materialData} 
                  referenceFile={referenceFileState.file}
                  setReferenceFile={setReferenceFile}
                  referenceFileName={referenceFileState.fileName}
                  referenceFilePath={referenceFileState.filePath}
                  isReferenceFileStored={referenceFileState.isStored}
                  clearReferenceFile={clearReferenceFile}
                  setFeedback={setFeedback}
                  setReferenceMaterials={setReferenceMaterials}
                  setReferenceMeshes={setReferenceMeshes}
                  openReferenceMaterialsModal={() => setIsReferenceMaterialsModalOpen(true)}
                  openReferenceMeshesModal={() => setIsReferenceMeshesModalOpen(true)}
                  updateMaterialData={updateMaterialData}
                />
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {!materialData ? (
            <Card>
              <CardHeader>
                <CardTitle>Upload Materials.json</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload onFileSelect={handleFileUpload} accept=".json" />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Edit Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <MaterialMeshEditor data={materialData} onSave={handleSave} />
                <Button onClick={handleClear} variant="outline" className="mt-4 w-full">
                  Clear All Data
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <ReferenceMaterialsModal 
        isOpen={isReferenceMaterialsModalOpen}
        onClose={() => setIsReferenceMaterialsModalOpen(false)}
        materials={referenceMaterials}
        onApply={(updatedMaterials) => {
          if (materialData) {
            const updatedData = {
              ...materialData,
              materials: updatedMaterials
            };
            setMaterialData(updatedData);
            setReferenceMaterials(updatedMaterials.map(m => m.name));
          }
          setIsReferenceMaterialsModalOpen(false);
        }}
      />
      <ReferenceMeshesModal 
        isOpen={isReferenceMeshesModalOpen}
        onClose={() => setIsReferenceMeshesModalOpen(false)}
        meshes={referenceMeshes}
        onApply={(updatedMeshes, updatedMeshAssignments) => {
          if (materialData) {
            const updatedData = {
              ...materialData,
              meshAssignments: {
                ...materialData.meshAssignments,
                ...updatedMeshAssignments
              }
            };
            setMaterialData(updatedData);
            setReferenceMeshes(updatedMeshes.map(m => m.name));
          }
          setIsReferenceMeshesModalOpen(false);
        }}
      />
    </div>
  );
}
// src/app/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FileUpload from '@/components/FileUpload/FileUpload';
import MaterialMeshEditor from '@/components/MaterialMeshEditor/MaterialMeshEditor';
import GltfUpdater from '@/components/GltfUpdater';
import ReferenceMaterialsModal from '@/components/Modals/ReferenceMaterialsModal';
import ReferenceMeshesModal from '@/components/Modals/ReferenceMeshesModal';
import { MaterialData } from '@/gltf/gltfTypes';
import { usePersistentFile } from '@/hooks/usePersistentFile';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [materialData, setMaterialData] = useState<MaterialData | null>(null);
  const [materialFileName, setMaterialFileName] = useState<string | null>(null);
  const [referenceFileState, setReferenceFile, clearReferenceFile] = usePersistentFile('referenceFile');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isReferenceMaterialsModalOpen, setIsReferenceMaterialsModalOpen] = useState(false);
  const [isReferenceMeshesModalOpen, setIsReferenceMeshesModalOpen] = useState(false);
  const [referenceMaterials, setReferenceMaterials] = useState<string[]>([]);
  const [referenceMeshes, setReferenceMeshes] = useState<string[]>([]);

  // Load material data from localStorage
  useEffect(() => {
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

  // Create a callback for handling material data updates
  const handleMaterialDataUpdate = useCallback((updatedData: MaterialData) => {
    setMaterialData(updatedData);
    localStorage.setItem('materialData', JSON.stringify(updatedData));
    if (materialFileName) {
      localStorage.setItem('materialFileName', materialFileName);
    }
    setFeedback('Material data updated');
  }, [materialFileName]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content) as MaterialData;
        setMaterialData(parsedData);
        setMaterialFileName(file.name);
        localStorage.setItem('materialData', content);
        localStorage.setItem('materialFileName', file.name);
        setFeedback(`Successfully loaded ${file.name}`);

        if (parsedData.materials && Array.isArray(parsedData.materials)) {
          setReferenceMaterials(parsedData.materials.map(m => m.name));
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

  const handleSave = useCallback((updatedData: MaterialData) => {
    handleMaterialDataUpdate(updatedData);
    
    // Create and trigger download of the JSON file
    const blob = new Blob([JSON.stringify(updatedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = materialFileName || 'updated_materials.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [materialFileName, handleMaterialDataUpdate]);


  const handleClear = () => {
    setMaterialData(null);
    setMaterialFileName(null);
    setFeedback('All data cleared');
    localStorage.removeItem('materialData');
    localStorage.removeItem('materialFileName');
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
                  updateMaterialData={handleMaterialDataUpdate}
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
                <MaterialMeshEditor 
                  data={materialData} 
                  onSave={handleSave}
                  onUpdate={handleMaterialDataUpdate} // Add this new prop
                />
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
        currentMaterials={materialData?.materials || []}
        referenceMaterials={referenceMaterials}
        onApply={(updatedMaterials) => {
          if (materialData) {
            const updatedData = {
              ...materialData,
              materials: updatedMaterials
            };
            handleMaterialDataUpdate(updatedData);
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
            handleMaterialDataUpdate(updatedData);
          }
          setIsReferenceMeshesModalOpen(false);
        }}
      />
    </div>
  );
}
// src/app/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import FileUpload from '@/components/FileUpload/FileUpload';
import MaterialMeshEditor from '@/components/MaterialMeshEditor/MaterialMeshEditor';
import GltfUpdater from '@/components/GltfUpdater';
import ReferenceMaterialsModal from '@/components/Modals/ReferenceMaterialsModal';
import ReferenceMeshesModal from '@/components/Modals/ReferenceMeshesModal';
import { MaterialData } from '@/gltf/gltfTypes';
import { usePersistentFile } from '@/hooks/usePersistentFile';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileJson } from 'lucide-react';
import { CustomScrollArea } from '@/components/ui/custom-scroll-area';

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

  const handleMaterialDataUpdate = useCallback((updatedData: MaterialData) => {
    setMaterialData(updatedData);
    localStorage.setItem('materialData', JSON.stringify(updatedData));
    if (materialFileName) {
      localStorage.setItem('materialFileName', materialFileName);
    }
    setFeedback('Material data updated');
  }, [materialFileName]);

  const handleFileUpload = (fileOrFiles: File | File[]) => {
    // Handle single file
    const file = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
    
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

  const handleClear = () => {
    setMaterialData(null);
    setMaterialFileName(null);
    setFeedback('All data cleared');
    localStorage.removeItem('materialData');
    localStorage.removeItem('materialFileName');
  };

  const handleSave = useCallback((updatedData: MaterialData) => {
    handleMaterialDataUpdate(updatedData);
    
    const blob = new Blob([JSON.stringify(updatedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = materialFileName || 'updated_materials.json';
    a.click();
    URL.revokeObjectURL(url);
    setFeedback('Material data saved successfully');
  }, [materialFileName, handleMaterialDataUpdate]);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="grid grid-cols-3 w-full gap-4 p-4">
        {/* Left Panel - Fixed width, scrollable content */}
        <CustomScrollArea className="h-full px-4">
          <div className="col-span-1 h-screen -mt-4 -ml-4 p-4 border-r bg-background">
            {feedback && (
              <Alert variant="default" className="mb-4">
                <AlertDescription>{feedback}</AlertDescription>
              </Alert>
            )}
            
            <Card className="shadow-sm">
              <CardHeader className="py-3">
                <CardTitle className="text-lg">Update GLTF Files</CardTitle>
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
        </CustomScrollArea>

        {/* Right Panel */}
        <div className="col-span-2 h-screen -mt-4 -mr-4 p-4 overflow-hidden">
          {!materialData ? (
            <Card className="shadow-sm">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Upload Materials.json</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleClear}
                      variant="outline"
                      size="sm"
                      className="w-24"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <FileUpload 
                  onFileSelect={handleFileUpload} 
                  accept=".json" 
                />
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col">
              <Card className="flex-1 shadow-sm overflow-hidden">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Edit Materials</CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleClear} 
                        variant="outline" 
                        size="sm"
                      >
                        Clear All
                      </Button>
                      <Button 
                        onClick={() => handleSave(materialData)}
                        variant="default"
                        size="sm"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[calc(100vh-12rem)] overflow-y-auto">
                    <MaterialMeshEditor 
                      data={materialData} 
                      onSave={handleSave}
                      onUpdate={handleMaterialDataUpdate}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Keep existing modals */}
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
          currentMeshes={materialData?.meshAssignments ? Object.keys(materialData.meshAssignments).map(meshName => ({
            name: meshName,
            tags: [] // Add tags if you have them stored
          })) : []}
          currentAssignments={materialData?.meshAssignments || {}}
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
    </div>
  );
}
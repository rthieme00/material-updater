// src/app/page.tsx

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FileUpload from '@/components/FileUpload';
import MaterialMeshEditor from '@/components/MaterialMeshEditor/MaterialMeshEditor';
import GltfUpdater from '@/components/GltfUpdater';
import ReferenceMaterialsModal from '@/components/ReferenceMaterialsModal';
import ReferenceMeshesModal from '@/components/ReferenceMeshesModal';

export default function Home() {
  const [materialData, setMaterialData] = useState<any>(null);
  const [materialFileName, setMaterialFileName] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isReferenceMaterialsModalOpen, setIsReferenceMaterialsModalOpen] = useState(false);
  const [isReferenceMeshesModalOpen, setIsReferenceMeshesModalOpen] = useState(false);
  const [referenceMaterials, setReferenceMaterials] = useState<string[]>([]);
  const [referenceMeshes, setReferenceMeshes] = useState<string[]>([]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsedData = JSON.parse(content);
      setMaterialData(parsedData);
      setMaterialFileName(file.name);
      setFeedback(`Successfully loaded ${file.name}`);

      // Update reference materials if present in the uploaded file
      if (parsedData.materials && Array.isArray(parsedData.materials)) {
        const materialNames = parsedData.materials.map((m: any) => m.name);
        setReferenceMaterials(materialNames);
      }
    };
    reader.onerror = (e) => {
      setFeedback(`Error reading file: ${e.target?.error}`);
    };
    reader.readAsText(file);
  };

  const handleSave = (updatedData: any) => {
    setMaterialData(updatedData);
    const blob = new Blob([JSON.stringify(updatedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'updated_materials.json';
    a.click();
    URL.revokeObjectURL(url);
    setFeedback('Materials.json saved successfully');

    // Update reference materials after saving
    if (updatedData.materials && Array.isArray(updatedData.materials)) {
      const materialNames = updatedData.materials.map((m: any) => m.name);
      setReferenceMaterials(materialNames);
    }
  };

  const handleUpdate = (updatedData: any) => {
    setMaterialData(updatedData);
    setFeedback('Material data updated');
  };

  const handleClear = () => {
    setMaterialData(null);
    setMaterialFileName(null);
    setReferenceMaterials([]);
    setReferenceMeshes([]);
    setFeedback('Materials.json cleared');
  };

    // Add this new function
    const updateMaterialData = (updatedData: any) => {
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
              <GltfUpdater 
                materialData={materialData} 
                setFeedback={setFeedback}
                setReferenceMaterials={setReferenceMaterials}
                setReferenceMeshes={setReferenceMeshes}
                openReferenceMaterialsModal={() => setIsReferenceMaterialsModalOpen(true)}
                openReferenceMeshesModal={() => setIsReferenceMeshesModalOpen(true)}
                updateMaterialData={updateMaterialData} // Add this line
              />
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
                <MaterialMeshEditor data={materialData} onSave={handleSave} onUpdate={handleUpdate} />
                <Button onClick={handleClear} variant="outline" className="mt-4 w-full">
                  Clear Materials
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
          setMaterialData(prevData => ({
            ...prevData,
            materials: updatedMaterials
          }));
          setReferenceMaterials(updatedMaterials.map((m: any) => m.name));
          setIsReferenceMaterialsModalOpen(false);
        }}
      />
      <ReferenceMeshesModal 
        isOpen={isReferenceMeshesModalOpen}
        onClose={() => setIsReferenceMeshesModalOpen(false)}
        meshes={referenceMeshes}
        onApply={(updatedMeshes, updatedMeshAssignments) => {
          setMaterialData(prevData => ({
            ...prevData,
            meshes: updatedMeshes,
            meshAssignments: {
              ...prevData.meshAssignments,
              ...updatedMeshAssignments
            }
          }));
          setReferenceMeshes(updatedMeshes.map((m: any) => m.name));
          setIsReferenceMeshesModalOpen(false);
        }}
      />
    </div>
  );
}
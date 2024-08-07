'use client';

import { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import MaterialList from '../components/MaterialList';
import UpdateButton from '../components/UpdateButton';
import VariantCheckbox from '../components/VariantCheckbox';
import MaterialMeshEditor from '../components/MaterialMeshEditor';

export default function Home() {
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [targetFiles, setTargetFiles] = useState<File[]>([]);
  const [applyVariants, setApplyVariants] = useState(true);
  const [applyMoodRotation, setApplyMoodRotation] = useState(true);
  const [materialJson, setMaterialJson] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/get-material-json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setMaterialJson(data);
        setIsLoading(false);
        setError(null);
      })
      .catch(error => {
        console.error('Error loading Materials.json:', error);
        setIsLoading(false);
        setError(`Failed to load Materials.json. ${error.message}`);
      });
  }, []);

  const handleUpdate = async () => {
    if (!referenceFile || targetFiles.length === 0) {
      alert('Please select reference and target files');
      return;
    }

    const formData = new FormData();
    formData.append('referenceFile', referenceFile);
    targetFiles.forEach((file) => formData.append('targetFiles', file));
    formData.append('applyVariants', applyVariants.toString());
    formData.append('applyMoodRotation', applyMoodRotation.toString());

    try {
      const response = await fetch('/api/update-materials', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
      } else {
        alert('Error updating materials');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating materials');
    }
  };

  const handleSaveMaterialJson = async (updatedData: any) => {
    try {
      const response = await fetch('/api/update-material-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        alert('Materials.json updated successfully');
        setMaterialJson(updatedData);
      } else {
        throw new Error('Failed to update Materials.json');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating Materials.json');
    }
  };

  return (
    <div className="w-full  mx-auto p-4 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Material Updater</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">File Management</h2>
          <FileUpload
            label="Reference File"
            onFileSelect={(file) => setReferenceFile(file as File | null)}
            activeFileName={referenceFile?.name || ""}
          />
          <FileUpload
            label="Target Files"
            multiple
            onFileSelect={(files) => setTargetFiles(files as File[] || [])}
            activeFileName={targetFiles.length > 0 ? `${targetFiles.length} files selected` : ""}
          />
          <MaterialList materials={targetFiles} />
          <div className="mt-4">
            <VariantCheckbox
              label="Apply Variants"
              checked={applyVariants}
              onChange={setApplyVariants}
            />
            <VariantCheckbox
              label="Apply Mood Rotation"
              checked={applyMoodRotation}
              onChange={setApplyMoodRotation}
            />
          </div>
          <div className="mt-6">
            <UpdateButton onClick={handleUpdate} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Edit Materials.json</h2>
          {isLoading ? (
            <p className="text-gray-600">Loading Materials.json...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : materialJson ? (
            <MaterialMeshEditor data={materialJson} onSave={handleSaveMaterialJson} />
          ) : (
            <p className="text-gray-600">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
}